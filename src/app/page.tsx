'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
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
import Toast from '@/components/Toast'

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

type Snapshot = { nodes: StateNode[]; edges: TransitionEdge[] }

export default function Home() {
  const [nodes, setNodes] = useState<StateNode[]>([])
  const [edges, setEdges] = useState<TransitionEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [simState, setSimState] = useState<SimulationState | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // ── Undo history ──────────────────────────────────────────────────────────
  const historyRef = useRef<Snapshot[]>([])
  const [historyLength, setHistoryLength] = useState(0)

  // Capture current nodes+edges onto the history stack before a mutation.
  // Uses functional setState to read the latest values without needing them
  // in the dependency array (avoids stale-closure bugs).
  const pushHistory = useCallback(() => {
    setNodes((currentNodes) => {
      setEdges((currentEdges) => {
        historyRef.current = [
          ...historyRef.current.slice(-49),
          { nodes: currentNodes, edges: currentEdges },
        ]
        setHistoryLength(historyRef.current.length)
        return currentEdges
      })
      return currentNodes
    })
  }, [])

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return
    const prev = historyRef.current[historyRef.current.length - 1]
    historyRef.current = historyRef.current.slice(0, -1)
    setHistoryLength(historyRef.current.length)
    setNodes(prev.nodes)
    setEdges(prev.edges)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [])

  // Ctrl-Z / Cmd-Z keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo])

  // ── Derived state ──────────────────────────────────────────────────────────
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
        data: {
          ...(e.data ?? { symbols: [], isActive: false }),
          isActive: simState?.activeTransitionIds.has(e.id) ?? false,
        },
      }))
    )
  }, [simState])

  // ── React Flow change handlers ─────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange<StateNode>[]) => {
      // Push history before RF-native deletions (Delete key on canvas)
      if (changes.some((c) => c.type === 'remove')) pushHistory()
      setNodes((nds) => applyNodeChanges(changes, nds) as StateNode[])
    },
    [pushHistory]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange<TransitionEdge>[]) => {
      if (changes.some((c) => c.type === 'remove')) pushHistory()
      setEdges((eds) => applyEdgeChanges(changes, eds) as TransitionEdge[])
    },
    [pushHistory]
  )

  // ── Structural mutations (each saves history first) ────────────────────────
  const onConnect = useCallback(
    (connection: Connection) => {
      // Reject duplicate connections (same source → same target)
      const duplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      )
      if (duplicate) {
        const srcLabel = nodes.find((n) => n.id === connection.source)?.data.label ?? connection.source
        const tgtLabel = nodes.find((n) => n.id === connection.target)?.data.label ?? connection.target
        setToastMessage(`A transition from ${srcLabel} to ${tgtLabel} already exists.`)
        return
      }
      pushHistory()
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
    [pushHistory, edges, nodes]
  )

  const addState = useCallback(() => {
    pushHistory()
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
  }, [nodes.length, pushHistory])

  const onUpdateNode = useCallback(
    (id: string, patch: Partial<StateNode['data']>) => {
      pushHistory()
      setNodes((nds) => {
        let updated = nds.map((n) =>
          n.id !== id ? n : { ...n, data: { ...n.data, ...patch } }
        )
        if (patch.isStart === true) {
          updated = updated.map((n) =>
            n.id !== id ? { ...n, data: { ...n.data, isStart: false } } : n
          )
        }
        return updated
      })
      setSimState(null)
    },
    [pushHistory]
  )

  const onUpdateEdge = useCallback(
    (id: string, symbols: string[]) => {
      pushHistory()
      setEdges((eds) =>
        eds.map((e) =>
          e.id === id
            ? { ...e, data: { ...(e.data ?? { symbols: [], isActive: false }), symbols } }
            : e
        )
      )
      setSimState(null)
    },
    [pushHistory]
  )

  const onDeleteNode = useCallback(
    (id: string) => {
      pushHistory()
      setNodes((nds) => nds.filter((n) => n.id !== id))
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
      setSelectedNodeId(null)
      setSimState(null)
    },
    [pushHistory]
  )

  const onDeleteEdge = useCallback(
    (id: string) => {
      pushHistory()
      setEdges((eds) => eds.filter((e) => e.id !== id))
      setSelectedEdgeId(null)
      setSimState(null)
    },
    [pushHistory]
  )

  const onAddSelfLoop = useCallback(
    (nodeId: string) => {
      pushHistory()
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
    },
    [pushHistory]
  )

  const onLoadExample = useCallback(
    (example: ExampleAutomaton) => {
      pushHistory()
      nodeCounter = example.nodes.length
      setNodes(example.nodes.map((n) => ({ ...n, data: { ...n.data, isActive: false } })))
      setEdges(
        example.edges.map((e) => ({
          ...e,
          data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: false },
        }))
      )
      setSelectedNodeId(null)
      setSelectedEdgeId(null)
      setSimState(null)
    },
    [pushHistory]
  )

  const onNewAutomaton = useCallback(() => {
    pushHistory()
    nodeCounter = 0
    setNodes([])
    setEdges([])
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [pushHistory])

  // Selection handlers (no history needed)
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

  // Load first example on mount (no history entry — nothing to undo to)
  useEffect(() => {
    onLoadExample(EXAMPLES[0])
    historyRef.current = []
    setHistoryLength(0)
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
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
            <button
              onClick={undo}
              disabled={historyLength === 0}
              title="Undo (Ctrl-Z)"
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              ↩ Undo
            </button>
            <span className="text-xs text-slate-400 ml-1">
              Drag from a state's border to connect transitions. Click to select.
            </span>
          </div>
          <div className="relative flex-1 min-h-0">
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
            {toastMessage && (
              <Toast
                message={toastMessage}
                onDone={() => setToastMessage(null)}
              />
            )}
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-72 flex flex-col bg-white border-l border-slate-200 overflow-y-auto shrink-0">
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

          {!selectedNode && !selectedEdge && (
            <div className="px-4 pb-3 text-xs text-slate-400">
              <div className="border-t border-slate-100 pt-3">
                <p className="font-semibold text-slate-500 mb-1">Keyboard shortcuts</p>
                <p>Ctrl-Z — undo</p>
                <p>Delete — remove selected item</p>
                <p>Drag state border — draw transition</p>
              </div>
            </div>
          )}

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
