import type { Automaton } from '@/types/automaton'

export type ExplainMode = 'off' | 'optionA' | 'optionB'

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)]
}

function alphabetFromAutomaton(a: Automaton): string[] {
  const syms = a.transitions.flatMap((t) => t.symbols)
  return uniq(syms.filter((s) => s !== 'ε')).sort()
}

function acceptingStates(a: Automaton): string[] {
  return a.states.filter((s) => s.isAccepting).map((s) => s.label || s.id)
}

function startLabel(a: Automaton): string {
  const st = a.states.find((s) => s.id === a.startStateId)
  return st?.label || a.startStateId || '(none)'
}

function isDeterministicDfa(a: Automaton): boolean {
  if (!a.startStateId) return false
  if (a.transitions.some((t) => t.symbols.includes('ε'))) return false
  const seen = new Set<string>()
  for (const t of a.transitions) {
    for (const s of t.symbols) {
      const k = `${t.from}::${s}`
      if (seen.has(k)) return false
      seen.add(k)
    }
  }
  return true
}

function buildDelta(a: Automaton): Map<string, Map<string, string>> {
  const delta = new Map<string, Map<string, string>>()
  for (const st of a.states) delta.set(st.id, new Map())
  for (const t of a.transitions) {
    for (const s of t.symbols) {
      if (!delta.has(t.from)) delta.set(t.from, new Map())
      delta.get(t.from)!.set(s, t.to)
    }
  }
  return delta
}

// Canonicalize by BFS from start, assigning indices 0..n-1
function canonicalize(a: Automaton): {
  ok: boolean
  alpha: string[]
  trans: number[][]
  accepting: boolean[]
} | null {
  if (!isDeterministicDfa(a)) return null
  const alpha = alphabetFromAutomaton(a)
  const delta = buildDelta(a)

  const start = a.startStateId!
  const queue: string[] = [start]
  const idx = new Map<string, number>([[start, 0]])
  const accepting: boolean[] = []
  const trans: number[][] = []

  while (queue.length) {
    const cur = queue.shift()!
    const curIdx = idx.get(cur)!
    accepting[curIdx] = !!a.states.find((s) => s.id === cur)?.isAccepting

    const row: number[] = []
    for (const sym of alpha) {
      const to = delta.get(cur)?.get(sym)
      if (!to) return null
      if (!idx.has(to)) {
        idx.set(to, idx.size)
        queue.push(to)
      }
      row.push(idx.get(to)!)
    }
    trans[curIdx] = row
  }

  return { ok: true, alpha, trans, accepting }
}

// Option B: recognize a few common textbook DFAs; else return null.
export function explainOptionB(a: Automaton): string | null {
  const c = canonicalize(a)
  if (!c) return null

  const alpha = c.alpha.join(',')
  const n = c.accepting.length

  // Pattern: strings ending in 01 over {0,1}
  // Canonical BFS ordering will usually match the classic DFA:
  // state0(start) --0--> state1, --1--> state0
  // state1 --0--> state1, --1--> state2
  // state2(accept) --0--> state1, --1--> state0
  if (
    n === 3 &&
    alpha === '0,1' &&
    c.accepting[0] === false &&
    c.accepting[1] === false &&
    c.accepting[2] === true
  ) {
    const [t0, t1, t2] = c.trans
    if (
      t0?.[0] === 1 && t0?.[1] === 0 &&
      t1?.[0] === 1 && t1?.[1] === 2 &&
      t2?.[0] === 1 && t2?.[1] === 0
    ) {
      return 'This DFA accepts binary strings that end with “01”.'
    }
  }

  // Pattern: even number of 1s over {0,1}
  // 2 states: start is accepting; 0 loops; 1 toggles.
  if (n === 2 && alpha === '0,1' && c.accepting[0] === true && c.accepting[1] === false) {
    const [t0, t1] = c.trans
    if (t0?.[0] === 0 && t0?.[1] === 1 && t1?.[0] === 1 && t1?.[1] === 0) {
      return 'This DFA accepts binary strings with an even number of “1” characters (including zero).'
    }
  }

  // Pattern: contains substring "ab" over {a,b}
  // Classic 3-state DFA: q0 --a--> q1, --b--> q0; q1 --a--> q1, --b--> q2; q2 accept sink.
  if (
    n === 3 &&
    alpha === 'a,b' &&
    c.accepting[0] === false &&
    c.accepting[1] === false &&
    c.accepting[2] === true
  ) {
    const [t0, t1, t2] = c.trans
    // alpha order a,b
    if (
      t0?.[0] === 1 && t0?.[1] === 0 &&
      t1?.[0] === 1 && t1?.[1] === 2 &&
      t2?.[0] === 2 && t2?.[1] === 2
    ) {
      return 'This DFA accepts strings over {a,b} that contain “ab” as a substring.'
    }
  }

  return null
}

// Option A: always-available “structural” explanation.
export function explainOptionA(a: Automaton): string {
  const alpha = alphabetFromAutomaton(a)
  const acc = acceptingStates(a)
  const start = startLabel(a)

  const alphabetPart = alpha.length ? `over alphabet {${alpha.join(', ')}}` : 'with no alphabet symbols'
  const acceptingPart = acc.length ? `Accepting states: ${acc.join(', ')}.` : 'No accepting states.'
  const detPart = isDeterministicDfa(a) ? 'This is a DFA.' : 'This is not a DFA (nondeterminism or ε-transitions present).'

  return `${detPart} It starts at ${start} and is ${alphabetPart}. ${acceptingPart}`
}

export function explainDfa(a: Automaton, mode: ExplainMode): { title: string; text: string } | null {
  if (mode === 'off') return null
  if (mode === 'optionA') return { title: 'Explain (Option A)', text: explainOptionA(a) }
  const b = explainOptionB(a)
  if (b) return { title: 'Explain (Option B)', text: b }
  return { title: 'Explain (Option B)', text: `${explainOptionA(a)} (No specific pattern recognized.)` }
}

