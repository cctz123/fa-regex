import { promises as fs } from 'fs'
import path from 'path'
import type { DiagramDocument, DiagramId, DiagramMeta } from '@/types/diagrams'
import type { StateNode, TransitionEdge } from '@/types/automaton'
import { EXAMPLES } from '@/data/examples'
import { exampleIndexFromId, isExampleDiagramId } from '@/lib/diagramIds'

const SCHEMA_VERSION = 1 as const
const SEEDED_FLAG_PATH = '.seeded-examples'

function diagramsDir(): string {
  return path.join(process.cwd(), 'data', 'diagrams')
}

function indexPath(): string {
  return path.join(diagramsDir(), 'index.json')
}

function diagramPath(id: DiagramId): string {
  return path.join(diagramsDir(), `${id}.json`)
}

function seededFlagPath(): string {
  return path.join(diagramsDir(), SEEDED_FLAG_PATH)
}

async function ensureDir() {
  await fs.mkdir(diagramsDir(), { recursive: true })
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw) as T
}

async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath)
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${Date.now()}.tmp`)
  const json = JSON.stringify(data, null, 2)
  await fs.writeFile(tmpPath, json, 'utf8')
  await fs.rename(tmpPath, filePath)
}

async function readIndex(): Promise<DiagramMeta[]> {
  await ensureDir()
  try {
    const idx = await readJsonFile<{ diagrams: DiagramMeta[] }>(indexPath())
    return Array.isArray(idx.diagrams) ? idx.diagrams : []
  } catch (e: any) {
    if (e?.code === 'ENOENT') return []
    throw e
  }
}

async function writeIndex(diagrams: DiagramMeta[]): Promise<void> {
  await ensureDir()
  await atomicWriteJson(indexPath(), { diagrams })
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(): DiagramId {
  // good enough for single-user local use; avoids extra deps
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function seedExamplesIfNeeded(): Promise<void> {
  await ensureDir()

  // Only seed once per working copy. We use a flag file to avoid re-seeding
  // even if the user deletes diagrams later.
  try {
    await fs.stat(seededFlagPath())
    return
  } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e
  }

  const index = await readIndex()
  const existingIds = new Set(index.map((d) => d.id))

  const createdAt = nowIso()
  const newMetas: DiagramMeta[] = []

  for (let i = 0; i < EXAMPLES.length; i++) {
    const ex = EXAMPLES[i]
    const id = `example_${i}` as DiagramId
    if (existingIds.has(id)) continue

    const doc: DiagramDocument = {
      schemaVersion: SCHEMA_VERSION,
      id,
      description: ex.name,
      createdAt,
      updatedAt: createdAt,
      nodes: ex.nodes.map((n) => ({ ...n, data: { ...n.data, isActive: false } })),
      edges: ex.edges.map((e) => ({
        ...e,
        data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: false },
      })),
    }
    await atomicWriteJson(diagramPath(id), doc)
    newMetas.push({
      id,
      description: doc.description,
      createdAt,
      updatedAt: createdAt,
    })
  }

  if (newMetas.length > 0) {
    await writeIndex([...newMetas, ...index])
  }

  await fs.writeFile(seededFlagPath(), 'ok\n', 'utf8')
}

export async function listDiagrams(): Promise<DiagramMeta[]> {
  await seedExamplesIfNeeded()
  const diagrams = await readIndex()
  return diagrams.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export async function createDiagram(description?: string): Promise<DiagramDocument> {
  await ensureDir()
  const id = newId()
  const createdAt = nowIso()
  const doc: DiagramDocument = {
    schemaVersion: SCHEMA_VERSION,
    id,
    description: (description && description.trim()) ? description.trim() : 'Untitled diagram',
    createdAt,
    updatedAt: createdAt,
    nodes: [],
    edges: [],
  }
  await atomicWriteJson(diagramPath(id), doc)

  const index = await readIndex()
  await writeIndex([{ id, description: doc.description, createdAt, updatedAt: createdAt }, ...index])
  return doc
}

export async function getDiagram(id: DiagramId): Promise<DiagramDocument | null> {
  await ensureDir()
  try {
    const doc = await readJsonFile<DiagramDocument>(diagramPath(id))
    return doc
  } catch (e: any) {
    if (e?.code === 'ENOENT') return null
    throw e
  }
}

export async function updateDiagram(
  id: DiagramId,
  patch: {
    description?: string
    nodes?: StateNode[]
    edges?: TransitionEdge[]
  }
): Promise<DiagramDocument | null> {
  const existing = await getDiagram(id)
  if (!existing) return null

  const updatedAt = nowIso()
  const next: DiagramDocument = {
    ...existing,
    schemaVersion: SCHEMA_VERSION,
    description: patch.description ?? existing.description,
    updatedAt,
    nodes: patch.nodes ?? existing.nodes,
    edges: patch.edges ?? existing.edges,
  }
  await atomicWriteJson(diagramPath(id), next)

  const index = await readIndex()
  const nextIndex: DiagramMeta[] = index.map((m) =>
    m.id !== id
      ? m
      : {
          ...m,
          description: next.description,
          updatedAt,
        }
  )
  await writeIndex(nextIndex)

  return next
}

export async function resetExampleDiagram(id: DiagramId): Promise<DiagramDocument | null> {
  const idx = exampleIndexFromId(id)
  if (idx === null) return null
  const ex = EXAMPLES[idx]
  if (!ex) return null

  const existing = await getDiagram(id)
  if (!existing) return null

  const updatedAt = nowIso()
  const next: DiagramDocument = {
    schemaVersion: SCHEMA_VERSION,
    id,
    description: ex.name,
    createdAt: existing.createdAt,
    updatedAt,
    nodes: ex.nodes.map((n) => ({ ...n, data: { ...n.data, isActive: false } })),
    edges: ex.edges.map((e) => ({
      ...e,
      data: { ...(e.data ?? { symbols: [], isActive: false }), isActive: false },
    })),
  }

  await atomicWriteJson(diagramPath(id), next)

  const index = await readIndex()
  const nextIndex: DiagramMeta[] = index.map((m) =>
    m.id !== id
      ? m
      : {
          ...m,
          description: next.description,
          updatedAt,
        }
  )
  await writeIndex(nextIndex)

  return next
}

export async function deleteDiagram(id: DiagramId): Promise<boolean> {
  if (isExampleDiagramId(id)) return false
  await ensureDir()
  try {
    await fs.unlink(diagramPath(id))
  } catch (e: any) {
    if (e?.code !== 'ENOENT') throw e
  }

  const index = await readIndex()
  const filtered = index.filter((m) => m.id !== id)
  await writeIndex(filtered)
  return true
}

