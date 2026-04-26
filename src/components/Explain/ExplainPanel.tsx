'use client'

export default function ExplainPanel({
  title,
  text,
  details,
}: {
  title: string
  text: string
  details?: { label: string; value: string; monospace?: boolean }[]
}) {
  return (
    <div className="px-4 pt-3">
      <div className="border-t border-slate-100 pt-3">
        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
        <div className="mt-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {text}
        </div>

        {details?.length ? (
          <div className="mt-2 space-y-2">
            {details.map((d, idx) => (
              <div key={idx}>
                <div className="text-xs font-semibold text-slate-500 mb-1">{d.label}</div>
                {d.monospace ? (
                  <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-auto">
{d.value}
                  </pre>
                ) : (
                  <div className="text-sm text-slate-700">{d.value}</div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

