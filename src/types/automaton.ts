import type { Node, Edge } from '@xyflow/react'

export interface StateNodeData extends Record<string, unknown> {
  label: string
  isStart: boolean
  isAccepting: boolean
  isActive: boolean
}

export interface TransitionEdgeData extends Record<string, unknown> {
  symbols: string[]
  isActive: boolean
}

export type StateNode = Node<StateNodeData, 'state'>
export type TransitionEdge = Edge<TransitionEdgeData, 'transition'>

export interface Automaton {
  states: { id: string; label: string; isAccepting: boolean }[]
  startStateId: string | null
  transitions: { id: string; from: string; to: string; symbols: string[] }[]
}

export interface SimulationState {
  input: string
  index: number
  currentStateIds: Set<string>
  activeTransitionIds: Set<string>
  status: 'ready' | 'running' | 'accepted' | 'rejected' | 'stuck'
}

export interface ExampleAutomaton {
  name: string
  description: string
  alphabet: string
  type: 'DFA' | 'NFA'
  sampleInputs: { input: string; accepted: boolean }[]
  nodes: StateNode[]
  edges: TransitionEdge[]
}
