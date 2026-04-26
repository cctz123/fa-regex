'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { StateNode } from '@/types/automaton'

function StateNodeComponent({ data, selected }: NodeProps<StateNode>) {
  const { label, isStart, isAccepting, isActive } = data

  const outerRing = isActive
    ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
    : selected
    ? 'border-indigo-500 bg-indigo-50'
    : 'border-slate-400 bg-white hover:border-slate-500'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      {/* Start-state arrow */}
      {isStart && (
        <div
          className="absolute flex items-center pointer-events-none"
          style={{ right: '100%', paddingRight: 4 }}
        >
          <svg width="36" height="20" viewBox="0 0 36 20">
            <defs>
              <marker id="startArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill="#475569" />
              </marker>
            </defs>
            <line x1="2" y1="10" x2="30" y2="10" stroke="#475569" strokeWidth="2" markerEnd="url(#startArrow)" />
          </svg>
        </div>
      )}

      {/* Outer circle (accepting = double ring) */}
      <div
        className={`absolute inset-0 rounded-full border-2 ${outerRing} flex items-center justify-center transition-colors`}
      >
        {isAccepting && (
          <div className="absolute inset-1 rounded-full border-2 border-inherit opacity-80" />
        )}
        <span
          className={`font-semibold text-sm select-none z-10 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}
        >
          {label}
        </span>
      </div>

      {/* Handles — invisible, placed at cardinal positions */}
      <Handle type="source" position={Position.Top} id="top" className="opacity-0 w-2 h-2" />
      <Handle type="source" position={Position.Right} id="right" className="opacity-0 w-2 h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0 w-2 h-2" />
      <Handle type="source" position={Position.Left} id="left" className="opacity-0 w-2 h-2" />
      <Handle type="target" position={Position.Top} id="top-t" className="opacity-0 w-2 h-2" />
      <Handle type="target" position={Position.Right} id="right-t" className="opacity-0 w-2 h-2" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" className="opacity-0 w-2 h-2" />
      <Handle type="target" position={Position.Left} id="left-t" className="opacity-0 w-2 h-2" />
    </div>
  )
}

export default memo(StateNodeComponent)
