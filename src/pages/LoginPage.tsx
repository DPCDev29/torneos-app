import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase/client'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    const result = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (result.error) {
      setError(result.error.message)
      return
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Torneos</h1>
          <p className="text-sm text-gray-600">Inicia sesión para acceder a los torneos compartidos.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Correo electrónico" className="input" required />
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" className="input" minLength={6} required />
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Procesando...' : 'Ingresar'}
        </button>
        <Link to="/register" className="block text-center text-sm font-medium text-blue-700 hover:text-blue-800">Crear una cuenta</Link>
      </form>
    </main>
  )
}
