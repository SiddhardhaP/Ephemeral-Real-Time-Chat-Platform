from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.user_schema import ConnectPendingResponse, ConnectRequestCreate, ConnectRequestItem, UserRead
from app.services.connection_manager import connection_manager
from app.services.redis_service import redis_service
from app.services.user_service import user_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix='/users', tags=['users'])


@router.get('', response_model=list[UserRead])
async def list_users(
    _: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserRead]:
    users = await user_service.list_users(db)
    online_ids = await redis_service.get_online_user_ids()
    return [
        UserRead(
            id=user.id,
            username=user.username,
            created_at=user.created_at,
            is_online=user.id in online_ids,
        )
        for user in users
    ]


@router.get('/connect/pending', response_model=ConnectPendingResponse)
async def get_pending_connect_requests(current_user: User = Depends(get_current_user)) -> ConnectPendingResponse:
    pending_sender_ids = await redis_service.get_pending_chat_request_ids(current_user.id)
    return ConnectPendingResponse(
        requests=[ConnectRequestItem(sender_id=sender_id) for sender_id in pending_sender_ids]
    )


@router.post('/connect/request', status_code=201)
async def send_connect_request(
    payload: ConnectRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Cannot connect to yourself')

    receiver = await user_service.get_user_by_id(db, payload.receiver_id)
    if receiver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Receiver not found')

    await redis_service.create_chat_request(current_user.id, payload.receiver_id)
    await connection_manager.send_personal_message(
        payload.receiver_id,
        {
            'event': 'connection_request',
            'data': {
                'from_user_id': current_user.id,
                'from_username': current_user.username,
            },
        },
    )
    return {'status': 'request_sent'}


@router.post('/connect/accept/{sender_id}')
async def accept_connect_request(
    sender_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    sender = await user_service.get_user_by_id(db, sender_id)
    if sender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Sender not found')

    accepted = await redis_service.accept_chat_request(sender_id, current_user.id)
    if not accepted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Connection request not found or expired')

    await connection_manager.send_personal_message(
        sender_id,
        {
            'event': 'connection_accepted',
            'data': {
                'user_id': current_user.id,
            },
        },
    )
    await connection_manager.send_personal_message(
        current_user.id,
        {
            'event': 'connection_accepted',
            'data': {
                'user_id': sender_id,
            },
        },
    )
    return {'status': 'accepted'}


@router.post('/connect/reject/{sender_id}')
async def reject_connect_request(
    sender_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    sender = await user_service.get_user_by_id(db, sender_id)
    if sender is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Sender not found')

    rejected = await redis_service.reject_chat_request(sender_id, current_user.id)
    if not rejected:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Connection request not found or expired')

    await connection_manager.send_personal_message(
        sender_id,
        {
            'event': 'connection_rejected',
            'data': {
                'user_id': current_user.id,
            },
        },
    )
    return {'status': 'rejected'}
