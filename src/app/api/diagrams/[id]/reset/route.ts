import { NextResponse } from 'next/server'
import { resetExampleDiagram } from '@/lib/diagramStore'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const doc = await resetExampleDiagram(id)
  if (!doc) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(doc)
}

