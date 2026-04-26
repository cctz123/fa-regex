import type { ExampleAutomaton } from '@/types/automaton'

export const EXAMPLES: ExampleAutomaton[] = [
  {
    name: 'Strings ending in 01',
    description: 'Accepts binary strings that end with "01". (DFA over {0,1})',
    alphabet: '{0, 1}',
    type: 'DFA',
    sampleInputs: [
      { input: '01', accepted: true },
      { input: '101', accepted: true },
      { input: '1001', accepted: true },
      { input: '10', accepted: false },
      { input: '1', accepted: false },
      { input: '00', accepted: false },
    ],
    nodes: [
      {
        id: 'q0', type: 'state', position: { x: 80, y: 180 },
        data: { label: 'q0', isStart: true, isAccepting: false, isActive: false },
      },
      {
        id: 'q1', type: 'state', position: { x: 280, y: 180 },
        data: { label: 'q1', isStart: false, isAccepting: false, isActive: false },
      },
      {
        id: 'q2', type: 'state', position: { x: 480, y: 180 },
        data: { label: 'q2', isStart: false, isAccepting: true, isActive: false },
      },
    ],
    edges: [
      {
        id: 'e-q0-q0-1', source: 'q0', target: 'q0', type: 'transition',
        data: { symbols: ['1'], isActive: false },
      },
      {
        id: 'e-q0-q1-0', source: 'q0', target: 'q1', type: 'transition',
        data: { symbols: ['0'], isActive: false },
      },
      {
        id: 'e-q1-q1-0', source: 'q1', target: 'q1', type: 'transition',
        data: { symbols: ['0'], isActive: false },
      },
      {
        id: 'e-q1-q2-1', source: 'q1', target: 'q2', type: 'transition',
        data: { symbols: ['1'], isActive: false },
      },
      {
        id: 'e-q2-q1-0', source: 'q2', target: 'q1', type: 'transition',
        data: { symbols: ['0'], isActive: false },
      },
      {
        id: 'e-q2-q0-1', source: 'q2', target: 'q0', type: 'transition',
        data: { symbols: ['1'], isActive: false },
      },
    ],
  },
  {
    name: 'Even number of 1s',
    description: 'Accepts binary strings with an even count of 1s (0 counts as even). (DFA over {0,1})',
    alphabet: '{0, 1}',
    type: 'DFA',
    sampleInputs: [
      { input: '', accepted: true },
      { input: '0', accepted: true },
      { input: '11', accepted: true },
      { input: '1001', accepted: true },
      { input: '1', accepted: false },
      { input: '111', accepted: false },
    ],
    nodes: [
      {
        id: 'q0', type: 'state', position: { x: 100, y: 180 },
        data: { label: 'q0', isStart: true, isAccepting: true, isActive: false },
      },
      {
        id: 'q1', type: 'state', position: { x: 380, y: 180 },
        data: { label: 'q1', isStart: false, isAccepting: false, isActive: false },
      },
    ],
    edges: [
      {
        id: 'e-q0-q0-0', source: 'q0', target: 'q0', type: 'transition',
        data: { symbols: ['0'], isActive: false },
      },
      {
        id: 'e-q0-q1-1', source: 'q0', target: 'q1', type: 'transition',
        data: { symbols: ['1'], isActive: false },
      },
      {
        id: 'e-q1-q1-0', source: 'q1', target: 'q1', type: 'transition',
        data: { symbols: ['0'], isActive: false },
      },
      {
        id: 'e-q1-q0-1', source: 'q1', target: 'q0', type: 'transition',
        data: { symbols: ['1'], isActive: false },
      },
    ],
  },
  {
    name: 'Contains substring "ab"',
    description: 'Accepts strings over {a,b} that contain "ab" as a substring. (DFA)',
    alphabet: '{a, b}',
    type: 'DFA',
    sampleInputs: [
      { input: 'ab', accepted: true },
      { input: 'aab', accepted: true },
      { input: 'bab', accepted: true },
      { input: 'abbb', accepted: true },
      { input: 'a', accepted: false },
      { input: 'ba', accepted: false },
      { input: 'b', accepted: false },
    ],
    nodes: [
      {
        id: 'q0', type: 'state', position: { x: 80, y: 180 },
        data: { label: 'q0', isStart: true, isAccepting: false, isActive: false },
      },
      {
        id: 'q1', type: 'state', position: { x: 280, y: 180 },
        data: { label: 'q1', isStart: false, isAccepting: false, isActive: false },
      },
      {
        id: 'q2', type: 'state', position: { x: 480, y: 180 },
        data: { label: 'q2', isStart: false, isAccepting: true, isActive: false },
      },
    ],
    edges: [
      {
        id: 'e-q0-q0-b', source: 'q0', target: 'q0', type: 'transition',
        data: { symbols: ['b'], isActive: false },
      },
      {
        id: 'e-q0-q1-a', source: 'q0', target: 'q1', type: 'transition',
        data: { symbols: ['a'], isActive: false },
      },
      {
        id: 'e-q1-q1-a', source: 'q1', target: 'q1', type: 'transition',
        data: { symbols: ['a'], isActive: false },
      },
      {
        id: 'e-q1-q2-b', source: 'q1', target: 'q2', type: 'transition',
        data: { symbols: ['b'], isActive: false },
      },
      {
        id: 'e-q2-q2-ab', source: 'q2', target: 'q2', type: 'transition',
        data: { symbols: ['a', 'b'], isActive: false },
      },
    ],
  },
  {
    name: 'NFA: strings ending in "a" or "b"',
    description: 'An ε-NFA that accepts strings over {a,b,c} ending in "a" or "b" — demonstrates nondeterminism.',
    alphabet: '{a, b, c}',
    type: 'NFA',
    sampleInputs: [
      { input: 'a', accepted: true },
      { input: 'b', accepted: true },
      { input: 'ca', accepted: true },
      { input: 'abc', accepted: false },
      { input: 'c', accepted: false },
    ],
    nodes: [
      {
        id: 'q0', type: 'state', position: { x: 80, y: 200 },
        data: { label: 'q0', isStart: true, isAccepting: false, isActive: false },
      },
      {
        id: 'q1', type: 'state', position: { x: 340, y: 100 },
        data: { label: 'q1', isStart: false, isAccepting: true, isActive: false },
      },
      {
        id: 'q2', type: 'state', position: { x: 340, y: 300 },
        data: { label: 'q2', isStart: false, isAccepting: true, isActive: false },
      },
    ],
    edges: [
      {
        id: 'e-q0-q0-abc', source: 'q0', target: 'q0', type: 'transition',
        data: { symbols: ['a', 'b', 'c'], isActive: false },
      },
      {
        id: 'e-q0-q1-a', source: 'q0', target: 'q1', type: 'transition',
        data: { symbols: ['a'], isActive: false },
      },
      {
        id: 'e-q0-q2-b', source: 'q0', target: 'q2', type: 'transition',
        data: { symbols: ['b'], isActive: false },
      },
    ],
  },
]
