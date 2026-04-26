'use client'

import React, { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import StateNode from './StateNode'
import TransitionEdge from './TransitionEdge'
import type { StateNode as StateNodeType, TransitionEdge as TransitionEdgeType } from '@/types/automaton'

const nodeTypes = { state: StateNode }
const edgeTypes = { transition: TransitionEdge }

interface AutomatonCanvasProps {
  nodes: StateNodeType[]
  edges: TransitionEdgeType[]
  onNodesChange: (changes: NodeChange<StateNodeType>[]) => void
  onEdgesChange: (changes: EdgeChange<TransitionEdgeType>[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (nodeId: string) => void
  onEdgeClick: (edgeId: string) => void
  onPaneClick: () => void
}

export default function AutomatonCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
}: AutomatonCanvasProps) {
  const defaultEdgeOptions = useMemo(
    () => ({ type: 'transition', data: { symbols: ['a'], isActive: false } }),
    []
  )

  return (
    <div className="flex-1 h-full bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_: React.MouseEvent, node: Node) => onNodeClick(node.id)}
        onEdgeClick={(_: React.MouseEvent, edge: Edge) => onEdgeClick(edge.id)}
        onPaneClick={onPaneClick}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        deleteKeyCode="Delete"
        className="bg-slate-50"
      >
        <Background gap={20} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const d = (n as StateNodeType).data
            if (d.isActive) return '#3b82f6'
            if (d.isAccepting) return '#10b981'
            return '#94a3b8'
          }}
          maskColor="rgba(241,245,249,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
