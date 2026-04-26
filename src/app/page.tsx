'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'

import AutomatonCanvas from '@/components/Canvas/AutomatonCanvas'
import InspectorPanel from '@/components/Inspector/InspectorPanel'
import SimulatorPanel from '@/components/Simulator/SimulatorPanel'
import TopBar from '@/components/TopBar'

import type {
  StateNode,
  TransitionEdge,
  SimulationState,
  ExampleAutomaton,
} from '@/types/automaton'
import { deriveAutomaton } from '@/lib/simulation'
import { EXAMPLES } from '@/data/examples'

let nodeCounter = 0
function nextNodeId() {
  return `q${nodeCounter++}`
}

function makeNode(id: string, position: { x: number; y: number }, isFirst: boolean): StateNode {
  return {
    id,
    type: 'state',
    position,
    data: { label: id, isStart: isFirst, isAccepting: false, isActive: false },
  }
}

export default function Home() {
  const [nodes, setNodes] = useState<StateNode[]>([])
  const [edges, setEdges] = useState<TransitionEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [simState, setSimState] = useState<SimulationState | null>(null)

  const automaton = useMemo(() => deriveAutomaton(nodes, edges), [nodes, edges])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  )
  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId]
  )

  // Sync simulation highlights into node/edge data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, isActive: simState?.currentStateIds.has(n.id) ?? false },
      }))
    )
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: simState?.activeTransitionIds.has(e.id) ?? false },
      }))
    )
  }, [simState])

  const onNodesChange = useCallback(
    (changes: NodeChange<StateNode>[]) =>
      setNodes((nds) => applyNodeChanges(changes, nds) as StateNode[]),
    []
  )
  const onEdgesChange = useCallback(
    (changes: EdgeChange<TransitionEdge>[]) =>
      setEdges((eds) => applyEdgeChanges(changes, eds) as TransitionEdge[]),
    []
  )

  const onConnect = useCallback(
    (connection: Connection) => {
      const id = `e-${connection.source}-${connection.target}-${Date.now()}`
      const newEdge: TransitionEdge = {
        id,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: 'transition',
        data: { symbols: ['a'], isActive: false },
      }
      setEdges((eds) => [...eds, newEdge])
      setSelectedEdgeId(id)
      setSelectedNodeId(null)
      setSimState(null)
    },
    []
  )

  const addState = useCallback(() => {
    const id = nextNodeId()
    const isFirst = nodes.length === 0
    const pos = {
      x: 80 + (nodes.length % 5) * 160,
      y: 180 + Math.floor(nodes.length / 5) * 160,
    }
    const node = makeNode(id, pos, isFirst)
    setNodes((nds) => [...nds, node])
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [nodes.length])

  const onNodeClick = useCallback((id: string) => {
    setSelectedNodeId(id)
    setSelectedEdgeId(null)
  }, [])

  const onEdgeClick = useCallback((id: string) => {
    setSelectedEdgeId(id)
    setSelectedNodeId(null)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
  }, [])

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<StateNode['data']>) => {
      setNodes((nds) => {
        let updated = nds.map((n) => {
          if (n.id !== id) return n
          return { ...n, data: { ...n.data, ...patch } }
        })
        // Enforce single start state
        if (patch.isStart === true) {
          updated = updated.map((n) =>
            n.id !== id ? { ...n, data: { ...n.data, isStart: false } } : n
          )
        }
        return updated
      })
      setSimState(null)
    },
    []
  )

  const onUpdateEdge = useCallback((id: string, symbols: string[]) => {
    setEdges((eds) =>
      eds.map((e) =>
        e.id === id ? { ...e, data: { ...(e.data ?? { symbols: [], isActive: false }), symbols } } : e
      )
    )
    setSimState(null)
  }, [])

  const onDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setSelectedNodeId(null)
    setSimState(null)
  }, [])

  const onDeleteEdge = useCallback((id: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== id))
    setSelectedEdgeId(null)
    setSimState(null)
  }, [])

  const onAddSelfLoop = useCallback((nodeId: string) => {
    const id = `e-${nodeId}-${nodeId}-${Date.now()}`
    const newEdge: TransitionEdge = {
      id,
      source: nodeId,
      target: nodeId,
      type: 'transition',
      data: { symbols: ['a'], isActive: false },
    }
    setEdges((eds) => [...eds, newEdge])
    setSelectedEdgeId(id)
    setSelectedNodeId(null)
    setSimState(null)
  }, [])

  const onLoadExample = useCallback((example: ExampleAutomaton) => {
    nodeCounter = example.nodes.length
    setNodes(example.nodes.map((n) => ({ ...n, data: { ...n.data, isActive: false } })))
    setEdges(example.edges.map((e) => ({ ...e, data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: false } })))
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [])

  const onNewAutomaton = useCallback(() => {
    nodeCounter = 0
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [])

  // Load first example on mount
  useEffect(() => {
    onLoadExample(EXAMPLES[0])
  }, [])

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <TopBar onLoadExample={onLoadExample} onNewAutomaton={onNewAutomaton} />

      <div className="flex flex-1 min-h-0">
        {/* Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-slate-200">
            <button
              onClick={addState}
              className="text-sm bg-indigo-600 text-white rounded-lg px-4 py-1.5 font-semibold hover:bg-indigo-700 transition-colors"
            >
              + Add State
            </button>
            <span className="text-xs text-slate-400">
              Drag from a state's border to connect transitions. Click to select.
            </span>
          </div>
          <AutomatonCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
          />
        </div>

        {/* Right panel */}
        <aside className="w-72 flex flex-col bg-white border-l border-slate-200 overflow-y-auto shrink-0">
          {/* Inspector section */}
          <div className="flex-none">
            <InspectorPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onUpdateNode={onUpdateNode}
              onUpdateEdge={onUpdateEdge}
              onDeleteNode={onDeleteNode}
              onDeleteEdge={onDeleteEdge}
              onAddSelfLoop={onAddSelfLoop}
            />
          </div>

          {/* Example info strip */}
          {!selectedNode && !selectedEdge && (
            <div className="px-4 pb-3 text-xs text-slate-400">
              <div className="border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-500 mb-1">Keyboard shortcuts</p>
                <p>Delete key — remove selected item</p>
                <p>Drag state border — draw transition</p>
              </div>
            </div>
          )}

          {/* Simulator */}
          <SimulatorPanel
            automaton={automaton}
            simState={simState}
            onSimStateChange={setSimState}
          />
        </aside>
      </div>
    </div>
  )
}
