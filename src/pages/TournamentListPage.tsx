import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Calendar, MapPin } from 'lucide-react'
import { db } from '../db'
import type { Tournament } from '../types'

export function TournamentListPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    db.tournaments.orderBy('createdAt').reverse().toArray().then(setTournaments)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis torneos</h1>
        <Link to="/tournaments/new" className="btn-primary gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo torneo</span>
          <span className="sm:hidden">Nuevo</span>
        </Link>
      </div>

      {tournaments.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="text-gray-600">Aún no tienes torneos creados.</p>
          <Link to="/tournaments/new" className="btn-primary mt-4 inline-flex">
            Crear mi primer torneo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/tournaments/${t.id}`}
              className="card hover:border-blue-300 hover:shadow-md transition-shadow"
            >
              <h2 className="text-lg font-semibold text-gray-900">{t.name}</h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(t.startDate).toLocaleDateString('es-ES')}
                    {t.endDate && ` - ${new Date(t.endDate).toLocaleDateString('es-ES')}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate">{t.venue}</span>
                </div>
              </div>
              <div className="mt-3 inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                {t.format === 'groups-knockout'
                  ? 'Grupos + Eliminatoria'
                  : t.format === 'league'
                    ? 'Liga'
                    : t.format === 'double-elimination'
                      ? 'Doble eliminatoria'
                      : 'Solo eliminatoria'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
