import type { Automaton } from '@/types/automaton'

export function alphabetFromAutomaton(a: Automaton): string[] {
  const syms = a.transitions.flatMap((t) => t.symbols)
  return [...new Set(syms.filter((s) => s !== 'ε'))].sort()
}

export function isDeterministicDfa(a: Automaton): boolean {
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

