import { NextResponse } from 'next/server'
import { createDiagram, listDiagrams } from '@/lib/diagramStore'

export async function GET() {
  const diagrams = await listDiagrams()
  return NextResponse.json({ diagrams })
}

export async function POST(req: Request) {
  let description: string | undefined
  try {
    const body = (await req.json()) as any
    if (body && typeof body.description === 'string') description = body.description
  } catch {
    // allow empty body
  }

  const created = await createDiagram(description)
  return NextResponse.json(created, { status: 201 })
}

