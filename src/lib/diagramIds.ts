import type { DiagramId } from '@/types/diagrams'

export const EXAMPLE_PREFIX = 'example_'

export function isExampleDiagramId(id: string): boolean {
  return id.startsWith(EXAMPLE_PREFIX)
}

export function exampleIndexFromId(id: DiagramId): number | null {
  if (!isExampleDiagramId(id)) return null
  const suffix = id.slice(EXAMPLE_PREFIX.length)
  const n = Number(suffix)
  return Number.isInteger(n) && n >= 0 ? n : null
}

