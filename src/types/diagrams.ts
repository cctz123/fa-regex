import type { StateNode, TransitionEdge } from '@/types/automaton'

export type DiagramId = string

export interface DiagramMeta {
  id: DiagramId
  description: string
  createdAt: string
  updatedAt: string
}

export interface DiagramDocument extends DiagramMeta {
  schemaVersion: 1
  nodes: StateNode[]
  edges: TransitionEdge[]
}

