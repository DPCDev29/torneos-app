import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Trophy, Menu, X } from 'lucide-react'

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/', label: 'Torneos' },
  ]

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-blue-700">
            <Trophy className="h-6 w-6" />
            <span>Torneos</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium ${pathname === l.to ? 'text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-gray-100 bg-white px-4 py-2 md:hidden">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block py-3 text-sm font-medium text-gray-700"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
