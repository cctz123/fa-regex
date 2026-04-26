'use client'

import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  onDone: () => void
  duration?: number
}

export default function Toast({ message, onDone, duration = 2500 }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation on next tick
    const enterTimer = setTimeout(() => setVisible(true), 10)
    // Start exit animation before calling onDone
    const exitTimer = setTimeout(() => setVisible(false), duration - 300)
    const doneTimer = setTimeout(onDone, duration)
    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [duration, onDone])

  return (
    <div
      className="pointer-events-none absolute top-4 left-1/2 z-50"
      style={{ transform: 'translateX(-50%)' }}
    >
      <div
        className="flex items-center gap-2 bg-slate-800 text-white text-sm rounded-xl px-4 py-2.5 shadow-lg transition-all duration-300"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        <span className="text-amber-400 text-base">⚠</span>
        {message}
      </div>
    </div>
  )
}
