import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import UserCard from '../components/UserCard'
import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'
import { api } from '../services/api'
import type { User } from '../types/user'

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const {
    onlineMap,
    pendingRequestIds,
    requestedUserIds,
    lastAcceptedPeerId,
    clearAcceptedPeer,
    sendConnectionRequest,
    acceptConnectionRequest,
    rejectConnectionRequest,
    wsError,
  } = useChat()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.get<User[]>('/users')
        setUsers(response.data)
      } catch {
        setError('Failed to fetch users')
      } finally {
        setLoading(false)
      }
    }

    void loadUsers()
  }, [])

  useEffect(() => {
    if (lastAcceptedPeerId) {
      navigate(`/chat/${lastAcceptedPeerId}`)
      clearAcceptedPeer()
    }
  }, [clearAcceptedPeer, lastAcceptedPeerId, navigate])

  const visibleUsers = useMemo(
    () =>
      users
        .filter((user) => user.id !== userId)
        .map((user) => ({
          ...user,
          is_online: onlineMap[user.id] ?? user.is_online,
        })),
    [onlineMap, userId, users],
  )

  const usersById = useMemo(() => new Map(visibleUsers.map((user) => [user.id, user])), [visibleUsers])

  const pendingRequests = useMemo(
    () => pendingRequestIds.map((senderId) => usersById.get(senderId)).filter((user): user is User => Boolean(user)),
    [pendingRequestIds, usersById],
  )

  const handleConnectRequest = async (targetUserId: number): Promise<void> => {
    setActionError(null)
    try {
      await sendConnectionRequest(targetUserId)
    } catch {
      setActionError('Failed to send connection request.')
    }
  }

  const handleAcceptRequest = async (senderId: number): Promise<void> => {
    setActionError(null)
    try {
      await acceptConnectionRequest(senderId)
    } catch {
      setActionError('Failed to accept connection request.')
    }
  }

  const handleRejectRequest = async (senderId: number): Promise<void> => {
    setActionError(null)
    try {
      await rejectConnectionRequest(senderId)
    } catch {
      setActionError('Failed to reject connection request.')
    }
  }

  return (
    <main className="min-h-screen bg-slatebg bg-glow">
      <Navbar title="Dashboard" />
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Available users</h2>
          {wsError && <p className="text-xs text-amber-700">{wsError}</p>}
        </div>
        {actionError && <p className="mb-4 text-sm text-red-600">{actionError}</p>}

        {pendingRequests.length > 0 && (
          <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-800">Incoming connection requests</h3>
            <div className="mt-3 space-y-2">
              {pendingRequests.map((requestUser) => (
                <div key={requestUser.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                  <p className="text-sm text-slate-700">
                    {requestUser.username} wants to connect.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleRejectRequest(requestUser.id)}
                      className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAcceptRequest(requestUser.id)}
                      className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brandDark"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading && <p className="text-sm text-slate-500">Loading users...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                canConnect={!requestedUserIds.includes(user.id)}
                isRequested={requestedUserIds.includes(user.id)}
                onConnect={(targetUserId) => void handleConnectRequest(targetUserId)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
