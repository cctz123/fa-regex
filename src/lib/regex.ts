import type { RegexAst, RegexParseError } from '@/types/regex'

type ParseResult =
  | { ok: true; ast: RegexAst }
  | { ok: false; error: RegexParseError }

function isLiteralChar(ch: string): boolean {
  // First pass: keep it small but allow simple single-letter tokens.
  // (We can tighten to {a,b} later if desired.)
  return /^[a-zA-Z0-9]$/.test(ch)
}

class Parser {
  private i = 0
  constructor(private readonly s: string) {}

  parse(): RegexAst {
    this.skipWs()
    if (this.eof()) this.fail('Empty expression')
    const ast = this.parseUnion()
    this.skipWs()
    if (!this.eof()) this.fail(`Unexpected '${this.peek()}'`)
    return ast
  }

  private parseUnion(): RegexAst {
    let left = this.parseConcat()
    this.skipWs()
    const options: RegexAst[] = [left]
    while (this.peek() === '|') {
      this.i++
      this.skipWs()
      if (this.eof()) this.fail("Expected expression after '|'")
      options.push(this.parseConcat())
      this.skipWs()
    }
    return options.length === 1 ? left : { type: 'union', options }
  }

  private parseConcat(): RegexAst {
    this.skipWs()
    const parts: RegexAst[] = []
    while (!this.eof()) {
      const ch = this.peek()
      if (ch === ')' || ch === '|') break
      parts.push(this.parseRepeat())
      this.skipWs()
    }
    if (parts.length === 0) this.fail('Expected expression')
    return parts.length === 1 ? parts[0] : { type: 'concat', parts }
  }

  private parseRepeat(): RegexAst {
    let base = this.parseAtom()
    this.skipWs()
    while (this.peek() === '*') {
      this.i++
      base = { type: 'star', expr: base }
      this.skipWs()
    }
    return base
  }

  private parseAtom(): RegexAst {
    this.skipWs()
    const ch = this.peek()
    if (!ch) this.fail('Unexpected end of input')

    if (ch === '(') {
      this.i++
      this.skipWs()
      if (this.peek() === ')') this.fail('Empty parentheses "()" are not allowed')
      const inner = this.parseUnion()
      this.skipWs()
      if (this.peek() !== ')') this.fail("Expected ')'")
      this.i++
      return inner
    }

    if (ch === 'ε') {
      this.i++
      return { type: 'epsilon' }
    }

    if (isLiteralChar(ch)) {
      this.i++
      return { type: 'literal', value: ch }
    }

    if (ch === '*') this.fail("Nothing to repeat before '*'")
    if (ch === ')') this.fail("Unmatched ')'")
    if (ch === '|') this.fail("Missing expression before '|'")

    this.fail(`Unexpected '${ch}'`)
  }

  private skipWs() {
    while (!this.eof() && /\s/.test(this.s[this.i]!)) this.i++
  }
  private peek(): string | undefined {
    return this.s[this.i]
  }
  private eof(): boolean {
    return this.i >= this.s.length
  }
  private fail(message: string): never {
    const err = new Error(message) as any
    err.index = this.i
    throw err
  }
}

export function parseRegex(input: string): ParseResult {
  try {
    const p = new Parser(input)
    const ast = p.parse()
    return { ok: true, ast }
  } catch (e: any) {
    const index = typeof e?.index === 'number' ? e.index : 0
    const message = typeof e?.message === 'string' ? e.message : 'Invalid regex'
    return { ok: false, error: { message, index } }
  }
}

function flattenConcat(ast: RegexAst): RegexAst[] {
  if (ast.type !== 'concat') return [ast]
  return ast.parts.flatMap(flattenConcat)
}

function flattenUnion(ast: RegexAst): RegexAst[] {
  if (ast.type !== 'union') return [ast]
  return ast.options.flatMap(flattenUnion)
}

function describeAtom(ast: RegexAst): string {
  switch (ast.type) {
    case 'epsilon':
      return 'epsilon (empty string)'
    case 'literal':
      return ast.value
    case 'union': {
      const opts = flattenUnion(ast).map(describeAtom)
      return opts.length === 2 ? `${opts[0]} or ${opts[1]}` : `(${opts.join(' or ')})`
    }
    case 'concat': {
      const parts = flattenConcat(ast).map(describeAtom)
      return parts.join(', then ')
    }
    case 'star': {
      const inner = describeAtom(ast.expr)
      return `zero or more ${inner}`
    }
  }
}

export function describeRegexEnglish(ast: RegexAst): string {
  // Prefer “followed by … then …” rhythm for concatenations.
  if (ast.type === 'concat') {
    const parts = flattenConcat(ast)
    const phrases = parts.map((p) => {
      if (p.type === 'literal') return p.value
      if (p.type === 'epsilon') return 'epsilon (empty string)'
      if (p.type === 'star') return `zero or more ${describeAtom(p.expr)}`
      return describeAtom(p)
    })
    if (phrases.length === 1) return `This means: ${phrases[0]}.`
    if (phrases.length === 2) return `This means: ${phrases[0]}, followed by ${phrases[1]}.`
    return `This means: ${phrases[0]}, followed by ${phrases[1]}, then ${phrases.slice(2).join(', then ')}.`
  }

  // Non-concat top-level
  return `This means: ${describeAtom(ast)}.`
}

export function formatRegexAstTree(ast: RegexAst): string {
  const lines: string[] = []
  const walk = (n: RegexAst, indent: string) => {
    switch (n.type) {
      case 'epsilon':
        lines.push(`${indent}Epsilon`)
        return
      case 'literal':
        lines.push(`${indent}Literal(${n.value})`)
        return
      case 'star':
        lines.push(`${indent}Star`)
        walk(n.expr, indent + '  ')
        return
      case 'concat':
        lines.push(`${indent}Concat`)
        for (const p of n.parts) walk(p, indent + '  ')
        return
      case 'union':
        lines.push(`${indent}Union`)
        for (const o of n.options) walk(o, indent + '  ')
        return
    }
  }
  walk(ast, '')
  return lines.join('\n')
}

