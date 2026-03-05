from app.db.base import Base
from app.models.user import User

metadata = Base.metadata

__all__ = ['Base', 'User', 'metadata']
