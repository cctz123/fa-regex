'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react'
import type { TransitionEdge } from '@/types/automaton'

function TransitionEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<TransitionEdge>) {
  const symbols = data?.symbols ?? []
  const isActive = data?.isActive ?? false
  const label = symbols.join(', ') || '?'

  const strokeColor = isActive ? '#3b82f6' : selected ? '#6366f1' : '#64748b'
  const strokeWidth = isActive || selected ? 2.5 : 1.5

  const markerEnd = `url(#fa-arrow-${isActive ? 'active' : selected ? 'selected' : 'default'})`

  if (source === target) {
    // Self-loop: draw a circular arc above the node
    const cx = sourceX
    const cy = sourceY
    const loopRadius = 38
    const d = `M ${cx - 12} ${cy - 28}
      C ${cx - loopRadius - 10} ${cy - loopRadius - 40},
        ${cx + loopRadius + 10} ${cy - loopRadius - 40},
        ${cx + 12} ${cy - 28}`
    const labelX = cx
    const labelY = cy - loopRadius - 52

    return (
      <>
        <path
          id={id}
          d={d}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          markerEnd={markerEnd}
        />
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute pointer-events-auto"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: isActive ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${strokeColor}`,
              borderRadius: 6,
              padding: '1px 7px',
              fontSize: 13,
              fontWeight: 600,
              color: strokeColor,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: strokeColor, strokeWidth }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: isActive ? '#eff6ff' : '#f8fafc',
            border: `1.5px solid ${strokeColor}`,
            borderRadius: 6,
            padding: '1px 7px',
            fontSize: 13,
            fontWeight: 600,
            color: strokeColor,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(TransitionEdgeComponent)
