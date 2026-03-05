import type { User } from '../types/user'

interface UserCardProps {
  user: User
  canConnect: boolean
  isRequested: boolean
  onConnect: (userId: number) => void
}

export default function UserCard({ user, canConnect, isRequested, onConnect }: UserCardProps): JSX.Element {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{user.username}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            user.is_online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {user.is_online ? 'Online' : 'Offline'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onConnect(user.id)}
        disabled={!canConnect}
        className="mt-4 inline-flex rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition hover:bg-brandDark disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isRequested ? 'Request Sent' : 'Connect'}
      </button>
    </article>
  )
}
