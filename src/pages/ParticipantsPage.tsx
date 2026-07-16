import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Edit, Palette } from 'lucide-react'
import { db } from '../db'
import type { Participant, ParticipantLevel } from '../types'
import { generateId, getDefaultColor } from '../utils/tournament'

export function ParticipantsPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [representative, setRepresentative] = useState('')
  const [color, setColor] = useState(getDefaultColor(0))
  const [level, setLevel] = useState<ParticipantLevel>('amateur')
  const [ranking, setRanking] = useState('')
  const [isSeeded, setIsSeeded] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tournamentId) return
    loadParticipants()
    return db.subscribeToTournament(tournamentId, loadParticipants)
  }, [tournamentId])

  const loadParticipants = () => {
    if (!tournamentId) return
    db.participants.where('tournamentId').equals(tournamentId).toArray().then(setParticipants)
  }

  const resetForm = () => {
    setName('')
    setContact('')
    setRepresentative('')
    setColor(getDefaultColor(participants.length))
    setLevel('amateur')
    setRanking('')
    setIsSeeded(false)
    setEditingId(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tournamentId) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('El nombre es obligatorio.')
      return
    }
    const exists = participants.some((p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.id !== editingId)
    if (exists) {
      setError('Ya existe un participante con ese nombre.')
      return
    }

    const parsedRanking = Number(ranking)
    const participantRanking = Number.isInteger(parsedRanking) && parsedRanking > 0 ? parsedRanking : undefined

    if (editingId) {
      await db.participants.update(editingId, { name: trimmed, contact, representative, color, level, ranking: participantRanking, isSeeded })
    } else {
      await db.participants.put({
        id: generateId(),
        tournamentId,
        name: trimmed,
        contact,
        representative,
        color,
        level,
        ranking: participantRanking,
        isSeeded,
        createdAt: new Date().toISOString(),
      })
    }
    resetForm()
    loadParticipants()
  }

  const handleEdit = (p: Participant) => {
    setEditingId(p.id)
    setName(p.name)
    setContact(p.contact || '')
    setRepresentative(p.representative || '')
    setColor(p.color)
    setLevel(p.level || 'amateur')
    setRanking(p.ranking ? String(p.ranking) : '')
    setIsSeeded(Boolean(p.isSeeded))
    setError('')
  }

  const handleDelete = async (p: Participant) => {
    if (!tournamentId) return
    const hasMatches = await db.matches
      .where('tournamentId')
      .equals(tournamentId)
      .and((m) => m.homeParticipantId === p.id || m.awayParticipantId === p.id)
      .count()
    if (hasMatches > 0) {
      alert('No se puede eliminar un participante que ya tiene partidos asignados.')
      return
    }
    if (!confirm(`¿Eliminar a ${p.name}?`)) return
    await db.participants.delete(p.id)
    loadParticipants()
  }

  return (
    <div className="space-y-4">
      <Link to={`/tournaments/${tournamentId}`} className="btn-secondary gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver al torneo
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Participantes</h1>

      <form onSubmit={handleSubmit} className="card space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre/equipo *"
            className="input"
          />
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Contacto"
            className="input"
          />
          <input
            type="text"
            value={representative}
            onChange={(e) => setRepresentative(e.target.value)}
            placeholder="Representante"
            className="input"
          />
          <select value={level} onChange={(e) => setLevel(e.target.value as ParticipantLevel)} className="input">
            <option value="amateur">Amateur</option>
            <option value="intermediate">Intermedio</option>
            <option value="advanced">Avanzado</option>
          </select>
          <input
            type="number"
            min="1"
            value={ranking}
            onChange={(e) => setRanking(e.target.value)}
            placeholder="Ranking"
            className="input"
          />
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-gray-500" />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-gray-300"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input type="checkbox" checked={isSeeded} onChange={(e) => setIsSeeded(e.target.checked)} />
            Sembrado
          </label>
        </div>
        <div className="flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancelar
            </button>
          )}
          <button type="submit" className="btn-primary gap-1">
            <Plus className="h-4 w-4" />
            {editingId ? 'Actualizar' : 'Agregar'}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <div key={p.id} className="card flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full border border-gray-200" style={{ backgroundColor: p.color }} />
              <div>
                <p className="font-semibold text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-500">
                  {p.level === 'advanced' ? 'Avanzado' : p.level === 'intermediate' ? 'Intermedio' : 'Amateur'}{p.ranking ? ` · Ranking ${p.ranking}` : ''}{p.isSeeded ? ' · Sembrado' : ''}
                </p>
                {p.contact && <p className="text-xs text-gray-500">{p.contact}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(p)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" aria-label="Editar">
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={() => handleDelete(p)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Eliminar">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
