'use client'

export default function ExplainPanel({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <div className="px-4 pt-3">
      <div className="border-t border-slate-100 pt-3">
        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{title}</h3>
        <div className="mt-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {text}
        </div>
      </div>
    </div>
  )
}

