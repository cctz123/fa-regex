'use client'

import { useState } from 'react'
import type { Automaton, SimulationState } from '@/types/automaton'
import { initSimulation, stepSimulation, runSimulation, validateAutomaton } from '@/lib/simulation'

interface SimulatorPanelProps {
  automaton: Automaton
  simState: SimulationState | null
  onSimStateChange: (s: SimulationState | null) => void
}

export default function SimulatorPanel({ automaton, simState, onSimStateChange }: SimulatorPanelProps) {
  const [inputString, setInputString] = useState('')

  const errors = validateAutomaton(automaton)

  const handleReset = () => {
    onSimStateChange(null)
    setInputString('')
  }

  const handleStart = () => {
    if (errors.length) return
    onSimStateChange(initSimulation(automaton, inputString))
  }

  const handleStep = () => {
    if (!simState) {
      handleStart()
      return
    }
    if (simState.status !== 'running') return
    onSimStateChange(stepSimulation(simState, automaton))
  }

  const handleRun = () => {
    if (errors.length) return
    const result = runSimulation(automaton, inputString)
    onSimStateChange(result)
  }

  const isRunning = simState?.status === 'running'
  const isDone = simState && simState.status !== 'running'

  const statusBadge = () => {
    if (!simState) return null
    const { status } = simState
    const cfg: Record<string, { bg: string; text: string; label: string }> = {
      accepted: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✓ Accepted' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: '✗ Rejected' },
      stuck: { bg: 'bg-amber-100', text: 'text-amber-700', label: '⚠ Stuck (no transition)' },
      running: { bg: 'bg-blue-100', text: 'text-blue-700', label: '▶ Running…' },
      ready: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Ready' },
    }
    const c = cfg[status] ?? cfg.ready
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    )
  }

  const renderTape = () => {
    if (!simState) return null
    const { input, index } = simState
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {input.length === 0 ? (
          <span className="text-slate-400 text-xs italic">ε (empty string)</span>
        ) : (
          input.split('').map((ch, i) => (
            <span
              key={i}
              className={`inline-block w-7 h-7 flex items-center justify-center rounded text-sm font-mono font-semibold border ${
                i < index
                  ? 'bg-slate-200 text-slate-400 border-slate-200'
                  : i === index
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              {ch}
            </span>
          ))
        )}
        {index >= input.length && input.length > 0 && (
          <span className="text-xs text-slate-400 ml-1">end</span>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4 border-t border-slate-200">
      <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Simulator</h3>

      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          {errors.map((e) => (
            <p key={e} className="text-xs text-amber-700">⚠ {e}</p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-500">Input string</label>
        <input
          value={inputString}
          onChange={(e) => {
            setInputString(e.target.value)
            onSimStateChange(null)
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleStep()}
          placeholder="e.g. 0101"
          disabled={!!simState}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStep}
          disabled={!!errors.length || (!!simState && !isRunning)}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {!simState ? 'Start' : 'Step →'}
        </button>
        <button
          onClick={handleRun}
          disabled={!!errors.length || !!simState}
          className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Run all
        </button>
        <button
          onClick={handleReset}
          className="px-3 bg-slate-100 text-slate-600 rounded-lg py-2 text-sm font-semibold hover:bg-slate-200 transition-colors"
        >
          Reset
        </button>
      </div>

      {simState && (
        <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-3 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Step {simState.index} / {simState.input.length}
            </span>
            {statusBadge()}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Input tape</span>
            {renderTape()}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-500">Active states</span>
            <div className="flex flex-wrap gap-1">
              {[...simState.currentStateIds].map((id) => (
                <span
                  key={id}
                  className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full"
                >
                  {id}
                </span>
              ))}
              {simState.currentStateIds.size === 0 && (
                <span className="text-xs text-slate-400 italic">none</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
