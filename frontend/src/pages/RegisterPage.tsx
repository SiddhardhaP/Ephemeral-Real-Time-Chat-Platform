import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage(): JSX.Element {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register({ username, email, password })
      navigate('/login')
    } catch {
      setError('Registration failed. Username or email may already exist.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slatebg bg-glow px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-800">Create Account</h2>
        <p className="mt-1 text-sm text-slate-500">Start secure ephemeral conversations.</p>

        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white transition hover:bg-brandDark disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Register'}
        </button>

        <p className="mt-5 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:text-brandDark">
            Login
          </Link>
        </p>
      </form>
    </main>
  )
}
