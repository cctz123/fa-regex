'use client'

import { useEffect, useMemo, useState } from 'react'
import { describeRegexEnglish, formatRegexAstTree, parseRegex } from '@/lib/regex'
import type { RegexAst } from '@/types/regex'

export default function RegexDialog({
  open,
  initialValue,
  onClose,
  onDraftChange,
  onValidRegex,
}: {
  open: boolean
  initialValue: string
  onClose: () => void
  onDraftChange?: (next: string) => void
  onValidRegex?: (input: string, ast: RegexAst) => Promise<void> | void
}) {
  const [draft, setDraft] = useState(initialValue)
  const [processedInput, setProcessedInput] = useState<string | null>(null)
  const [processedAst, setProcessedAst] = useState<RegexAst | null>(null)
  const [english, setEnglish] = useState<string | null>(null)
  const [tree, setTree] = useState<string | null>(null)
  const [error, setError] = useState<{ message: string; index: number } | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(initialValue)
    setProcessedInput(null)
    setProcessedAst(null)
    setEnglish(null)
    setTree(null)
    setError(null)
  }, [open, initialValue])

  const supported = useMemo(
    () => [
      'Literals: a',
      'Concatenation: ab',
      'Union: a|b',
      'Kleene star: a*',
      'Parentheses: (a|b), (a|b)*',
      'Epsilon: ε',
    ],
    []
  )

  if (!open) return null

  const analyze = () => {
    const parsed = parseRegex(draft)
    setProcessedInput(draft)
    if (!parsed.ok) {
      setProcessedAst(null)
      setEnglish(null)
      setTree(null)
      setError(parsed.error)
      return
    }
    setError(null)
    setProcessedAst(parsed.ast)
    setEnglish(describeRegexEnglish(parsed.ast))
    setTree(formatRegexAstTree(parsed.ast))
  }

  const process = () => {
    if (!onValidRegex) return
    if (!processedInput || !processedAst) return
    setIsCreating(true)
    Promise.resolve(onValidRegex(processedInput, processedAst))
      .then(() => onClose())
      .catch((e) => {
        console.error(e)
        setError({ message: 'Failed to create NFA diagram.', index: 0 })
      })
      .finally(() => setIsCreating(false))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-800">Regular expression</div>
          </div>
          <button
            className="text-sm px-2 py-1 rounded-md text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <details className="text-xs text-slate-500 mb-3">
            <summary className="cursor-pointer select-none font-semibold text-slate-600">
              Supported regular expressions
            </summary>
            <ul className="list-disc ml-5 mt-2 space-y-0.5">
              {supported.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </details>

          <label className="text-xs font-semibold text-slate-600">Regex</label>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              autoFocus
              className="flex-1 min-w-0 text-sm border border-slate-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                onDraftChange?.(e.target.value)
              }}
              placeholder="(a|b)*abb"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) analyze()
                if (e.key === 'Escape') onClose()
              }}
            />
            <button
              onClick={analyze}
              disabled={isCreating}
              className="shrink-0 text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-indigo-700 transition-colors"
              title="Analyze (Ctrl-Enter / Cmd-Enter)"
            >
              Analyze
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Tip: Press Ctrl-Enter / Cmd-Enter to analyze.
          </div>

          {processedInput !== null && (
            <div className="mt-4">
              {error ? (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <div className="font-semibold">Syntax error</div>
                  <div>
                    {error.message}
                    {Number.isFinite(error.index) ? ` (at position ${error.index})` : ''}
                  </div>
                </div>
              ) : (
                <>
                  {english && (
                    <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {english}
                    </div>
                  )}
                  {tree && (
                    <pre className="mt-2 text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto">
{tree}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isCreating}
            className="text-sm border border-slate-300 rounded-lg px-4 py-2 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          {onValidRegex && processedAst && !error && (
            <button
              onClick={process}
              disabled={isCreating}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-indigo-700 transition-colors"
            >
              {isCreating ? 'Processing…' : 'Process'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

