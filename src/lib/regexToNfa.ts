import type { RegexAst } from '@/types/regex'
import type { StateNode, TransitionEdge } from '@/types/automaton'

type NfaTransition = { from: number; to: number; symbol: string }
type Fragment = { start: number; end: number }

export function regexAstToNfaDiagram(ast: RegexAst): { nodes: StateNode[]; edges: TransitionEdge[] } {
  let nextState = 0
  const transitions: NfaTransition[] = []

  const newState = () => nextState++
  const add = (from: number, to: number, symbol: string) => {
    transitions.push({ from, to, symbol })
  }

  const build = (n: RegexAst): Fragment => {
    switch (n.type) {
      case 'epsilon': {
        const s = newState()
        const e = newState()
        add(s, e, 'ε')
        return { start: s, end: e }
      }
      case 'literal': {
        const s = newState()
        const e = newState()
        add(s, e, n.value)
        return { start: s, end: e }
      }
      case 'concat': {
        if (n.parts.length === 0) {
          const s = newState()
          const e = newState()
          add(s, e, 'ε')
          return { start: s, end: e }
        }
        let cur = build(n.parts[0]!)
        for (const part of n.parts.slice(1)) {
          const nxt = build(part)
          add(cur.end, nxt.start, 'ε')
          cur = { start: cur.start, end: nxt.end }
        }
        return cur
      }
      case 'union': {
        const s = newState()
        const e = newState()
        for (const opt of n.options) {
          const f = build(opt)
          add(s, f.start, 'ε')
          add(f.end, e, 'ε')
        }
        return { start: s, end: e }
      }
      case 'star': {
        const s = newState()
        const e = newState()
        const sub = build(n.expr)
        add(s, e, 'ε') // zero repetitions
        add(s, sub.start, 'ε')
        add(sub.end, sub.start, 'ε')
        add(sub.end, e, 'ε')
        return { start: s, end: e }
      }
    }
  }

  const frag = build(ast)

  // Layout: simple grid by state index
  const nodes: StateNode[] = []
  const cols = 6
  for (let i = 0; i < nextState; i++) {
    const id = `q${i}`
    nodes.push({
      id,
      type: 'state',
      position: {
        x: 80 + (i % cols) * 180,
        y: 140 + Math.floor(i / cols) * 180,
      },
      data: {
        label: id,
        isStart: i === frag.start,
        isAccepting: i === frag.end,
        isActive: false,
      },
    })
  }

  let edgeCounter = 0
  const edges: TransitionEdge[] = transitions.map((t) => {
    const id = `e-q${t.from}-q${t.to}-${t.symbol}-${edgeCounter++}`
    return {
      id,
      source: `q${t.from}`,
      target: `q${t.to}`,
      type: 'transition',
      data: { symbols: [t.symbol], isActive: false },
    }
  })

  return { nodes, edges }
}

