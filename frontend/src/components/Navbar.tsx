import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavbarProps {
  title?: string
}

export default function Navbar({ title = 'Ephemeral Chat' }: NavbarProps): JSX.Element {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = (): void => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-panel/90 px-6 py-4 backdrop-blur-md">
      <h1 className="text-xl font-semibold tracking-tight text-slate-800">{title}</h1>
      <button
        onClick={onLogout}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        Logout
      </button>
    </header>
  )
}
