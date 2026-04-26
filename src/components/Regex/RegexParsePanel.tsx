'use client'

import type { RegexAst } from '@/types/regex'

export default function RegexParsePanel({
  input,
  english,
  tree,
  error,
}: {
  input: string | null
  english: string | null
  tree: string | null
  error: { message: string; index: number } | null
  ast?: RegexAst | null
}) {
  if (!input && !error) return null

  return (
    <div className="px-4 pt-3">
      <div className="border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Regex</h3>
        </div>

        {input && (
          <div className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Input:</span>{' '}
            <span className="font-mono text-slate-700">{input}</span>
          </div>
        )}

        {error ? (
          <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <div className="font-semibold">Syntax error</div>
            <div>
              {error.message}
              {Number.isFinite(error.index) ? ` (at position ${error.index})` : ''}
            </div>
          </div>
        ) : (
          <>
            {english && (
              <div className="mt-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
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
    </div>
  )
}

