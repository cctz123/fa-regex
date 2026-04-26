import { NextResponse } from 'next/server'
import { deleteDiagram, getDiagram, updateDiagram } from '@/lib/diagramStore'
import { isExampleDiagramId } from '@/lib/diagramIds'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doc = await getDiagram(id)
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(doc)
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = (await req.json()) as unknown

  // keep validation lightweight (single-user local); reject non-objects
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // Examples are resettable and editable, but not renameable.
  if (isExampleDiagramId(id) && 'description' in (body as any)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const updated = await updateDiagram(id, body as any)
  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (isExampleDiagramId(id)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const ok = await deleteDiagram(id)
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  return NextResponse.json({ ok: true })
}

