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
import RegexParsePanel from '@/components/Regex/RegexParsePanel'
import ExplainPanel from '@/components/Explain/ExplainPanel'

import type {
  StateNode,
  TransitionEdge,
  SimulationState,
} from '@/types/automaton'
import { deriveAutomaton } from '@/lib/simulation'
import type { DiagramId, DiagramMeta, DiagramDocument } from '@/types/diagrams'
import { isExampleDiagramId } from '@/lib/diagramIds'
import { describeRegexEnglish, formatRegexAstTree, parseRegex } from '@/lib/regex'
import type { RegexAst } from '@/types/regex'
import { explainDfa, type ExplainMode } from '@/lib/explainDfa'

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

  // ── Regex parsing (first-pass: parse + explain + tree) ─────────────────────
  const [regexInput, setRegexInput] = useState<string | null>(null)
  const [regexAst, setRegexAst] = useState<RegexAst | null>(null)
  const [regexEnglish, setRegexEnglish] = useState<string | null>(null)
  const [regexTree, setRegexTree] = useState<string | null>(null)
  const [regexError, setRegexError] = useState<{ message: string; index: number } | null>(null)

  const [explainMode, setExplainMode] = useState<ExplainMode>('off')

  // ── Diagram persistence (filesystem via API routes) ────────────────────────
  const [diagrams, setDiagrams] = useState<DiagramMeta[]>([])
  const [diagramId, setDiagramId] = useState<DiagramId | null>(null)
  const [diagramDescription, setDiagramDescription] = useState<string>('')
  const hydratingRef = useRef(false)
  const saveTimerRef = useRef<number | null>(null)

  // ── Undo history ──────────────────────────────────────────────────────────
  const historyRef = useRef<Snapshot[]>([])
  const [historyLength, setHistoryLength] = useState(0)

  const resetEphemeralState = useCallback(() => {
    historyRef.current = []
    setHistoryLength(0)
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setSimState(null)
  }, [])

  const applyLoadedDiagram = useCallback(
    (doc: DiagramDocument) => {
      hydratingRef.current = true
      try {
        nodeCounter = doc.nodes.length
        setNodes(doc.nodes.map((n) => ({ ...n, data: { ...n.data, isActive: false } })))
        setEdges(
          doc.edges.map((e) => ({
            ...e,
            data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: false },
          }))
        )
        setDiagramId(doc.id)
        setDiagramDescription(doc.description ?? '')
        resetEphemeralState()
      } finally {
        // allow effects to run after state commit
        setTimeout(() => {
          hydratingRef.current = false
        }, 0)
      }
    },
    [resetEphemeralState]
  )

  const refreshDiagramList = useCallback(async () => {
    const res = await fetch('/api/diagrams', { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to list diagrams')
    const json = (await res.json()) as { diagrams: DiagramMeta[] }
    setDiagrams(json.diagrams ?? [])
    return json.diagrams ?? []
  }, [])

  const loadDiagram = useCallback(
    async (id: DiagramId) => {
      const res = await fetch(`/api/diagrams/${encodeURIComponent(id)}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load diagram')
      const doc = (await res.json()) as DiagramDocument
      applyLoadedDiagram(doc)
      localStorage.setItem('fa.lastDiagramId', doc.id)
    },
    [applyLoadedDiagram]
  )

  const createDiagram = useCallback(async (description?: string) => {
    const res = await fetch('/api/diagrams', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ description }),
    })
    if (!res.ok) throw new Error('Failed to create diagram')
    const doc = (await res.json()) as DiagramDocument
    await refreshDiagramList()
    applyLoadedDiagram(doc)
    localStorage.setItem('fa.lastDiagramId', doc.id)
  }, [applyLoadedDiagram, refreshDiagramList])

  const deleteCurrentDiagram = useCallback(async () => {
    if (!diagramId) return
    if (isExampleDiagramId(diagramId)) {
      setToastMessage('Example diagrams cannot be deleted.')
      return
    }
    const ok = window.confirm('Delete this diagram? This cannot be undone.')
    if (!ok) return
    await fetch(`/api/diagrams/${encodeURIComponent(diagramId)}`, { method: 'DELETE' })
    const nextList = await refreshDiagramList()
    const next = nextList[0]?.id ?? null
    if (next) await loadDiagram(next)
    else await createDiagram('Untitled diagram')
  }, [createDiagram, diagramId, loadDiagram, refreshDiagramList])

  // Bootstrap: list diagrams, then load last-opened or create one.
  useEffect(() => {
    ;(async () => {
      try {
        const list = await refreshDiagramList()
        const last = localStorage.getItem('fa.lastDiagramId')
        const pick = (last && list.some((d) => d.id === last) ? last : list[0]?.id) ?? null
        if (pick) await loadDiagram(pick)
        else await createDiagram('Untitled diagram')
      } catch (e) {
        console.error(e)
        setToastMessage('Failed to load diagrams from disk.')
      }
    })()
  }, [])

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
  const explanation = useMemo(() => explainDfa(automaton, explainMode), [automaton, explainMode])

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

  const onSelectDiagram = useCallback(
    async (id: DiagramId) => {
      try {
        await loadDiagram(id)
      } catch (e) {
        console.error(e)
        setToastMessage('Failed to load diagram.')
      }
    },
    [loadDiagram]
  )

  const onCreateDiagram = useCallback(async () => {
    try {
      const initial = 'Untitled diagram'
      const desc = window.prompt('New diagram description:', initial)
      if (desc === null) return
      const trimmed = desc.trim()
      await createDiagram(trimmed || initial)
    } catch (e) {
      console.error(e)
      setToastMessage('Failed to create diagram.')
    }
  }, [createDiagram])

  const onRenameDiagram = useCallback(async () => {
    if (!diagramId) return
    if (isExampleDiagramId(diagramId)) {
      setToastMessage('Example diagrams cannot be renamed.')
      return
    }
    const initial = diagramDescription || 'Untitled diagram'
    const next = window.prompt('Rename diagram:', initial)
    if (next === null) return
    const trimmed = next.trim()
    const finalDesc = trimmed || initial

    try {
      // update immediately, not via debounce
      setDiagramDescription(finalDesc)
      await fetch(`/api/diagrams/${encodeURIComponent(diagramId)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: finalDesc }),
      })
      await refreshDiagramList()
    } catch (e) {
      console.error(e)
      setToastMessage('Failed to rename diagram.')
    }
  }, [diagramDescription, diagramId, refreshDiagramList])

  const onDeleteDiagram = useCallback(async () => {
    try {
      await deleteCurrentDiagram()
    } catch (e) {
      console.error(e)
      setToastMessage('Failed to delete diagram.')
    }
  }, [deleteCurrentDiagram])

  const onResetExample = useCallback(async () => {
    if (!diagramId) return
    if (!isExampleDiagramId(diagramId)) return
    const ok = window.confirm('Reset this example back to its original state?')
    if (!ok) return

    try {
      const res = await fetch(`/api/diagrams/${encodeURIComponent(diagramId)}/reset`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('reset failed')
      const doc = (await res.json()) as DiagramDocument
      applyLoadedDiagram(doc)
      await refreshDiagramList()
      setToastMessage('Example reset.')
    } catch (e) {
      console.error(e)
      setToastMessage('Failed to reset example.')
    }
  }, [applyLoadedDiagram, diagramId, refreshDiagramList])

  const onRegex = useCallback(() => {
    const initial = regexInput ?? '(a|b)*abb'
    const next = window.prompt('Enter a regular expression:', initial)
    if (next === null) return

    setRegexInput(next)
    const parsed = parseRegex(next)
    if (!parsed.ok) {
      setRegexAst(null)
      setRegexEnglish(null)
      setRegexTree(null)
      setRegexError(parsed.error)
      return
    }

    setRegexError(null)
    setRegexAst(parsed.ast)
    setRegexEnglish(describeRegexEnglish(parsed.ast))
    setRegexTree(formatRegexAstTree(parsed.ast))
  }, [regexInput])

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

  // Autosave current diagram (debounced)
  useEffect(() => {
    if (!diagramId) return
    if (hydratingRef.current) return

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch(`/api/diagrams/${encodeURIComponent(diagramId)}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            description: diagramDescription,
            nodes,
            edges,
          }),
        })
        await refreshDiagramList()
      } catch (e) {
        console.error(e)
        setToastMessage('Autosave failed.')
      }
    }, 800)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [diagramId, diagramDescription, edges, nodes, refreshDiagramList])

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <TopBar
        onNewAutomaton={onNewAutomaton}
        diagrams={diagrams}
        selectedDiagramId={diagramId}
        onSelectDiagram={onSelectDiagram}
        onCreateDiagram={onCreateDiagram}
        onRenameDiagram={onRenameDiagram}
        onResetExample={onResetExample}
        onDeleteDiagram={onDeleteDiagram}
        onRegex={onRegex}
        explainMode={explainMode}
        onExplainModeChange={setExplainMode}
      />

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

          <RegexParsePanel input={regexInput} english={regexEnglish} tree={regexTree} error={regexError} />
          {explanation && (
            <ExplainPanel title={explanation.title} text={explanation.text} details={explanation.details} />
          )}

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
