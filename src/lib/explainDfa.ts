import type { Automaton } from '@/types/automaton'
import type { RegexAst } from '@/types/regex'
import { describeRegexEnglish, formatRegexAstTree } from '@/lib/regex'

export type ExplainMode = 'off' | 'optionA' | 'optionB' | 'optionC'

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

function eps(): RegexAst {
  return { type: 'epsilon' }
}
function lit(v: string): RegexAst {
  return { type: 'literal', value: v }
}
function isEpsilonAst(x: RegexAst): boolean {
  return x.type === 'epsilon'
}
function unionAst(a: RegexAst, b: RegexAst): RegexAst {
  if (a.type === 'union') return { type: 'union', options: [...a.options, b] }
  if (b.type === 'union') return { type: 'union', options: [a, ...b.options] }
  return { type: 'union', options: [a, b] }
}
function concatAst(a: RegexAst, b: RegexAst): RegexAst {
  if (isEpsilonAst(a)) return b
  if (isEpsilonAst(b)) return a
  if (a.type === 'concat') return { type: 'concat', parts: [...a.parts, b] }
  if (b.type === 'concat') return { type: 'concat', parts: [a, ...b.parts] }
  return { type: 'concat', parts: [a, b] }
}
function starAst(a: RegexAst): RegexAst {
  // (ε)* = ε
  if (isEpsilonAst(a)) return eps()
  if (a.type === 'star') return a
  return { type: 'star', expr: a }
}

function regexAstToString(ast: RegexAst): string {
  const prec = (n: RegexAst): number => {
    switch (n.type) {
      case 'union':
        return 1
      case 'concat':
        return 2
      case 'star':
        return 3
      default:
        return 4
    }
  }
  const show = (n: RegexAst, parentPrec: number): string => {
    let s: string
    switch (n.type) {
      case 'epsilon':
        s = 'ε'
        break
      case 'literal':
        s = n.value
        break
      case 'star': {
        const inner = show(n.expr, prec(n))
        s = `${inner}*`
        break
      }
      case 'concat': {
        s = n.parts.map((p) => show(p, prec(n))).join('')
        break
      }
      case 'union': {
        s = n.options.map((o) => show(o, prec(n))).join('|')
        break
      }
    }
    return prec(n) < parentPrec ? `(${s})` : s
  }
  return show(ast, 0)
}

// Option C: Convert DFA to regex via state elimination (GNFA-style).
function dfaToRegexAst(a: Automaton): RegexAst | null {
  if (!a.startStateId) return null

  const states = a.states.map((s) => s.id)
  const start = '__start'
  const accept = '__accept'
  const all = [start, ...states, accept]

  const R = new Map<string, RegexAst>()
  const key = (i: string, j: string) => `${i}→${j}`
  const get = (i: string, j: string): RegexAst | null => R.get(key(i, j)) ?? null
  const set = (i: string, j: string, r: RegexAst) => R.set(key(i, j), r)

  // Initialize all to null (no transition)
  for (const i of all) for (const j of all) R.delete(key(i, j))

  // Copy transitions (union if multiple)
  for (const t of a.transitions) {
    for (const sym of t.symbols) {
      const r = sym === 'ε' ? eps() : lit(sym)
      const prev = get(t.from, t.to)
      set(t.from, t.to, prev ? unionAst(prev, r) : r)
    }
  }

  // New start ε→ original start
  set(start, a.startStateId, eps())

  // Accepting states ε→ new accept
  for (const s of a.states) {
    if (s.isAccepting) {
      const prev = get(s.id, accept)
      set(s.id, accept, prev ? unionAst(prev, eps()) : eps())
    }
  }

  // Eliminate each original state (not start/accept)
  const eliminable = [...states]
  for (const k of eliminable) {
    const Rkk = get(k, k)
    const RkkStar = Rkk ? starAst(Rkk) : eps()

    for (const i of all) {
      if (i === k) continue
      const Rik = get(i, k)
      if (!Rik) continue

      for (const j of all) {
        if (j === k) continue
        const Rkj = get(k, j)
        if (!Rkj) continue

        const through = concatAst(concatAst(Rik, RkkStar), Rkj)
        const prev = get(i, j)
        set(i, j, prev ? unionAst(prev, through) : through)
      }
    }

    // Remove edges touching k (optional cleanup)
    for (const i of all) {
      R.delete(key(i, k))
      R.delete(key(k, i))
    }
  }

  return get(start, accept)
}

export function explainDfa(
  a: Automaton,
  mode: ExplainMode
): { title: string; text: string; details?: { label: string; value: string; monospace?: boolean }[] } | null {
  if (mode === 'off') return null
  if (mode === 'optionA') return { title: 'Explain (Option A)', text: explainOptionA(a) }

  if (mode === 'optionB') {
    const b = explainOptionB(a)
    if (b) return { title: 'Explain (Option B)', text: b }
    return { title: 'Explain (Option B)', text: `${explainOptionA(a)} (No specific pattern recognized.)` }
  }

  // Option C
  const ast = dfaToRegexAst(a)
  if (!ast) {
    return { title: 'Explain (Option C)', text: 'Cannot derive a regex (missing start or accepting state).' }
  }
  const regex = regexAstToString(ast)
  const english = describeRegexEnglish(ast)
  const tree = formatRegexAstTree(ast)

  return {
    title: 'Explain (Option C)',
    text: english,
    details: [
      { label: 'Equivalent regex', value: regex, monospace: true },
      { label: 'Regex AST', value: tree, monospace: true },
    ],
  }
}

