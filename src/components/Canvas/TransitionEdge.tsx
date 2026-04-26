'use client'

import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  useInternalNode,
  type EdgeProps,
} from '@xyflow/react'
import type { TransitionEdge } from '@/types/automaton'

const NODE_RADIUS = 32 // half of the 64 × 64 state node

/** Returns the point on a circle's perimeter that faces toward another center. */
function perimeterPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  r: number
): { x: number; y: number } {
  const angle = Math.atan2(to.y - from.y, to.x - from.x)
  return { x: from.x + r * Math.cos(angle), y: from.y + r * Math.sin(angle) }
}

/** Cubic bezier with a slight perpendicular bow so overlapping edges are still distinct. */
function floatingBezier(
  sx: number, sy: number,
  tx: number, ty: number,
  curvature = 0.25
): [path: string, labelX: number, labelY: number] {
  const dx = tx - sx
  const dy = ty - sy
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  // Perpendicular unit vector (left of the direction of travel)
  const px = -dy / len
  const py = dx / len
  const bow = Math.min(len * curvature, 60)

  const cp1x = sx + dx / 3 + px * bow
  const cp1y = sy + dy / 3 + py * bow
  const cp2x = sx + (2 * dx) / 3 + px * bow
  const cp2y = sy + (2 * dy) / 3 + py * bow

  const labelX = (sx + tx) / 2 + px * bow * 0.75
  const labelY = (sy + ty) / 2 + py * bow * 0.75

  return [
    `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tx} ${ty}`,
    labelX,
    labelY,
  ]
}

function TransitionEdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  data,
  selected,
}: EdgeProps<TransitionEdge>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  const symbols = data?.symbols ?? []
  const isActive = data?.isActive ?? false
  const label = symbols.join(', ') || '?'

  const strokeColor = isActive ? '#3b82f6' : selected ? '#6366f1' : '#64748b'
  const strokeWidth = isActive || selected ? 2.5 : 1.5
  const markerEnd = `url(#fa-arrow-${isActive ? 'active' : selected ? 'selected' : 'default'})`

  const labelStyle: React.CSSProperties = {
    background: isActive ? '#eff6ff' : '#f8fafc',
    border: `1.5px solid ${strokeColor}`,
    borderRadius: 6,
    padding: '1px 7px',
    fontSize: 13,
    fontWeight: 600,
    color: strokeColor,
    whiteSpace: 'nowrap',
  }

  // ── Self-loop ──────────────────────────────────────────────────────────────
  if (source === target) {
    // Anchor to the actual node center so the loop stays attached when nodes move
    const sw = sourceNode?.measured?.width ?? 64
    const sh = sourceNode?.measured?.height ?? 64
    const cx = sourceNode
      ? sourceNode.internals.positionAbsolute.x + sw / 2
      : sourceX
    const cy = sourceNode
      ? sourceNode.internals.positionAbsolute.y + sh / 2
      : sourceY

    // Loop starts/ends at the top of the circle, arcs up above it
    const topY = cy - NODE_RADIUS
    const loopRadius = 34
    const d = `M ${cx - 10} ${topY}
      C ${cx - loopRadius - 8} ${topY - loopRadius - 20},
        ${cx + loopRadius + 8} ${topY - loopRadius - 20},
        ${cx + 10} ${topY}`
    const labelX = cx
    const labelY = topY - loopRadius - 28

    return (
      <>
        <path id={id} d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} markerEnd={markerEnd} />
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute pointer-events-auto"
            style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, ...labelStyle }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      </>
    )
  }

  // ── Floating edge between two distinct states ──────────────────────────────
  // Fall back to React Flow's handle positions if nodes aren't measured yet
  let sx = sourceX
  let sy = sourceY
  let tx = sourceX // will be overwritten
  let ty = sourceY

  if (sourceNode && targetNode) {
    const sw = sourceNode.measured?.width ?? 64
    const sh = sourceNode.measured?.height ?? 64
    const tw = targetNode.measured?.width ?? 64
    const th = targetNode.measured?.height ?? 64

    const sCenter = {
      x: sourceNode.internals.positionAbsolute.x + sw / 2,
      y: sourceNode.internals.positionAbsolute.y + sh / 2,
    }
    const tCenter = {
      x: targetNode.internals.positionAbsolute.x + tw / 2,
      y: targetNode.internals.positionAbsolute.y + th / 2,
    }

    const src = perimeterPoint(sCenter, tCenter, NODE_RADIUS)
    const tgt = perimeterPoint(tCenter, sCenter, NODE_RADIUS)
    sx = src.x; sy = src.y
    tx = tgt.x; ty = tgt.y
  }

  const [edgePath, labelX, labelY] = floatingBezier(sx, sy, tx, ty)

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ stroke: strokeColor, strokeWidth }} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute pointer-events-auto"
          style={{ transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`, ...labelStyle }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

export default memo(TransitionEdgeComponent)
