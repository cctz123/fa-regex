import type { Automaton } from '@/types/automaton'
import type { StateNode, TransitionEdge } from '@/types/automaton'
import { epsilonClosure } from '@/lib/simulation'
import { alphabetFromAutomaton } from '@/lib/automatonUtils'

function setKey(s: Set<string>): string {
  return [...s].sort().join(',')
}

export function nfaToDfaDiagram(nfa: Automaton): { nodes: StateNode[]; edges: TransitionEdge[] } {
  if (!nfa.startStateId) {
    return { nodes: [], edges: [] }
  }

  const alphabet = alphabetFromAutomaton(nfa)

  const startSet = epsilonClosure(new Set([nfa.startStateId]), nfa)
  const queue: Set<string>[] = [startSet]
  const seen = new Map<string, number>([[setKey(startSet), 0]])
  const dfaSets: Set<string>[] = [startSet]

  const acceptingNfa = new Set(nfa.states.filter((s) => s.isAccepting).map((s) => s.id))

  const trans: { from: number; sym: string; to: number }[] = []

  while (queue.length) {
    const cur = queue.shift()!
    const curKey = setKey(cur)
    const curIdx = seen.get(curKey)!

    for (const sym of alphabet) {
      const nextStates = new Set<string>()
      for (const t of nfa.transitions) {
        if (cur.has(t.from) && t.symbols.includes(sym)) {
          nextStates.add(t.to)
        }
      }
      const nextClosure = epsilonClosure(nextStates, nfa)
      const nk = setKey(nextClosure)
      if (!seen.has(nk)) {
        const idx = dfaSets.length
        seen.set(nk, idx)
        dfaSets.push(nextClosure)
        queue.push(nextClosure)
      }
      trans.push({ from: curIdx, sym, to: seen.get(nk)! })
    }
  }

  // Layout
  const cols = 5
  const nodes: StateNode[] = dfaSets.map((set, i) => {
    const id = `q${i}`
    const isAccepting = [...set].some((s) => acceptingNfa.has(s))
    return {
      id,
      type: 'state',
      position: {
        x: 80 + (i % cols) * 200,
        y: 160 + Math.floor(i / cols) * 180,
      },
      data: {
        label: id,
        isStart: i === 0,
        isAccepting,
        isActive: false,
      },
    }
  })

  // Combine edges with same (from,to) into multi-symbol edge (your UI supports symbol arrays)
  const edgeMap = new Map<string, { from: number; to: number; symbols: string[] }>()
  for (const t of trans) {
    const k = `${t.from}->${t.to}`
    const existing = edgeMap.get(k)
    if (existing) existing.symbols.push(t.sym)
    else edgeMap.set(k, { from: t.from, to: t.to, symbols: [t.sym] })
  }

  let e = 0
  const edges: TransitionEdge[] = [...edgeMap.values()].map((x) => ({
    id: `e-${x.from}-${x.to}-${e++}`,
    source: `q${x.from}`,
    target: `q${x.to}`,
    type: 'transition',
    data: { symbols: x.symbols, isActive: false },
  }))

  return { nodes, edges }
}

