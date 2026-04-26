import type { Automaton, SimulationState } from '@/types/automaton'
import type { StateNode, TransitionEdge } from '@/types/automaton'

export function deriveAutomaton(
  nodes: StateNode[],
  edges: TransitionEdge[]
): Automaton {
  const startNode = nodes.find((n) => n.data.isStart)
  return {
    states: nodes.map((n) => ({
      id: n.id,
      label: n.data.label,
      isAccepting: n.data.isAccepting,
    })),
    startStateId: startNode?.id ?? null,
    transitions: edges.map((e) => ({
      id: e.id,
      from: e.source,
      to: e.target,
      symbols: e.data?.symbols ?? [],
    })),
  }
}

export function epsilonClosure(
  stateIds: Set<string>,
  automaton: Automaton
): Set<string> {
  const closure = new Set<string>(stateIds)
  const stack = [...stateIds]
  while (stack.length > 0) {
    const current = stack.pop()!
    for (const t of automaton.transitions) {
      if (t.from === current && t.symbols.includes('ε') && !closure.has(t.to)) {
        closure.add(t.to)
        stack.push(t.to)
      }
    }
  }
  return closure
}

function move(
  stateIds: Set<string>,
  symbol: string,
  automaton: Automaton
): { nextStates: Set<string>; usedTransitionIds: Set<string> } {
  const nextStates = new Set<string>()
  const usedTransitionIds = new Set<string>()
  for (const t of automaton.transitions) {
    if (stateIds.has(t.from) && t.symbols.includes(symbol)) {
      nextStates.add(t.to)
      usedTransitionIds.add(t.id)
    }
  }
  return { nextStates, usedTransitionIds }
}

export function initSimulation(automaton: Automaton, input: string): SimulationState {
  if (!automaton.startStateId) {
    return {
      input,
      index: 0,
      currentStateIds: new Set(),
      activeTransitionIds: new Set(),
      status: 'stuck',
    }
  }
  const initial = epsilonClosure(new Set([automaton.startStateId]), automaton)
  const hasAccepting = [...initial].some((id) =>
    automaton.states.find((s) => s.id === id)?.isAccepting
  )
  const status = input.length === 0 ? (hasAccepting ? 'accepted' : 'rejected') : 'running'
  return {
    input,
    index: 0,
    currentStateIds: initial,
    activeTransitionIds: new Set(),
    status,
  }
}

export function stepSimulation(
  sim: SimulationState,
  automaton: Automaton
): SimulationState {
  if (sim.status !== 'running') return sim

  const c = sim.input[sim.index]
  const closure = epsilonClosure(sim.currentStateIds, automaton)
  const { nextStates, usedTransitionIds } = move(closure, c, automaton)
  const nextClosure = epsilonClosure(nextStates, automaton)
  const nextIndex = sim.index + 1

  if (nextClosure.size === 0) {
    return { ...sim, currentStateIds: new Set(), activeTransitionIds: new Set(), status: 'stuck' }
  }

  if (nextIndex >= sim.input.length) {
    const accepted = [...nextClosure].some((id) =>
      automaton.states.find((s) => s.id === id)?.isAccepting
    )
    return {
      ...sim,
      index: nextIndex,
      currentStateIds: nextClosure,
      activeTransitionIds: usedTransitionIds,
      status: accepted ? 'accepted' : 'rejected',
    }
  }

  return {
    ...sim,
    index: nextIndex,
    currentStateIds: nextClosure,
    activeTransitionIds: usedTransitionIds,
    status: 'running',
  }
}

export function runSimulation(automaton: Automaton, input: string): SimulationState {
  let state = initSimulation(automaton, input)
  while (state.status === 'running') {
    state = stepSimulation(state, automaton)
  }
  return state
}

export function validateAutomaton(automaton: Automaton): string[] {
  const errors: string[] = []
  if (!automaton.startStateId) errors.push('No start state selected.')
  if (automaton.states.length === 0) errors.push('No states defined.')
  const hasAccepting = automaton.states.some((s) => s.isAccepting)
  if (!hasAccepting) errors.push('No accepting state defined.')
  return errors
}
