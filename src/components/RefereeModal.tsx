import { useState } from 'react'
import { X } from 'lucide-react'
import type { Match, MatchSet, Participant } from '../types'
import { isSetFinished } from '../utils/tournament'

interface Props {
  match: Match
  participants: Participant[]
  setsToWin: number
  onClose: () => void
  onSave: (match: Match, sets: MatchSet[]) => void
}

export function RefereeModal({ match, participants, setsToWin, onClose, onSave }: Props) {
  const [sets, setSets] = useState<MatchSet[]>(() => {
    if (match.sets && match.sets.length > 0) return match.sets.map((s) => ({ ...s }))
    return [{ home: 0, away: 0 }]
  })

  const homeName = participants.find((p) => p.id === match.homeParticipantId)?.name || 'Local'
  const awayName = participants.find((p) => p.id === match.awayParticipantId)?.name || 'Visitante'
  const homeColor = participants.find((p) => p.id === match.homeParticipantId)?.color
  const awayColor = participants.find((p) => p.id === match.awayParticipantId)?.color

  const homeSetsWon = sets.reduce((acc, s) => acc + (isSetFinished(s) && s.home > s.away ? 1 : 0), 0)
  const awaySetsWon = sets.reduce((acc, s) => acc + (isSetFinished(s) && s.away > s.home ? 1 : 0), 0)
  const matchFinished = homeSetsWon >= setsToWin || awaySetsWon >= setsToWin
  const matchWinnerName = matchFinished ? (homeSetsWon >= setsToWin ? homeName : awayName) : null

  const currentSetIndex = (() => {
    if (matchFinished) return sets.length - 1
    const idx = sets.findIndex((s) => !isSetFinished(s))
    return idx >= 0 ? idx : sets.length - 1
  })()

  const currentSet = sets[currentSetIndex]

  const updateCurrentSet = (updater: (s: MatchSet) => MatchSet) => {
    setSets((prev) => {
      const next = [...prev]
      next[currentSetIndex] = updater({ ...next[currentSetIndex] })
      return next
    })
  }

  const changePoint = (side: 'home' | 'away', delta: number) => {
    if (matchFinished) return
    updateCurrentSet((s) => {
      const next = { ...s }
      next[side] = Math.max(0, next[side] + delta)
      return next
    })
  }

  const requestBreak = (side: 'home' | 'away') => {
    if (matchFinished) return
    if (isSetFinished(currentSet)) return
    const key = side === 'home' ? 'usedBreakHome' : 'usedBreakAway'
    if (currentSet[key]) return
    updateCurrentSet((s) => ({ ...s, [key]: true }))
  }

  const finishSet = () => {
    if (!isSetFinished(currentSet)) return
    if (matchFinished) return
    const homeWon = homeSetsWon >= setsToWin
    const awayWon = awaySetsWon >= setsToWin
    if (!homeWon && !awayWon) {
      setSets((prev) => [...prev, { home: 0, away: 0 }])
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Modo Árbitro</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-gray-700">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: homeColor }} />
          <span>{homeName}</span>
          <span className="text-gray-400">vs</span>
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: awayColor }} />
          <span>{awayName}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-center">
            <div className="text-5xl font-bold text-gray-900">{currentSet.home}</div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => changePoint('home', -1)}
                disabled={matchFinished}
                className="btn-secondary h-10 w-10 rounded-lg text-lg disabled:opacity-50"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => changePoint('home', 1)}
                disabled={matchFinished}
                className="btn-primary h-14 w-14 rounded-lg text-2xl disabled:opacity-50"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => requestBreak('home')}
              disabled={currentSet.usedBreakHome || isSetFinished(currentSet) || matchFinished}
              className="btn-secondary w-full text-xs disabled:opacity-50"
            >
              {currentSet.usedBreakHome ? 'Descanso usado' : 'Pedir descanso'}
            </button>
          </div>

          <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-center">
            <div className="text-5xl font-bold text-gray-900">{currentSet.away}</div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => changePoint('away', -1)}
                disabled={matchFinished}
                className="btn-secondary h-10 w-10 rounded-lg text-lg disabled:opacity-50"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => changePoint('away', 1)}
                disabled={matchFinished}
                className="btn-primary h-14 w-14 rounded-lg text-2xl disabled:opacity-50"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => requestBreak('away')}
              disabled={currentSet.usedBreakAway || isSetFinished(currentSet) || matchFinished}
              className="btn-secondary w-full text-xs disabled:opacity-50"
            >
              {currentSet.usedBreakAway ? 'Descanso usado' : 'Pedir descanso'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <div className="text-sm font-medium text-gray-700">Sets ganados</div>
          <div className="text-xl font-bold text-gray-900">
            {homeSetsWon} - {awaySetsWon}
          </div>
        </div>

        {isSetFinished(currentSet) && !matchFinished && (
          <button type="button" onClick={finishSet} className="btn-primary mt-3 w-full">
            Finalizar set y continuar
          </button>
        )}

        {matchWinnerName && (
          <div className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-center text-sm font-semibold text-yellow-800">
            Ganador: {matchWinnerName}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={() => { onSave(match, sets); onClose() }} className="btn-primary">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
