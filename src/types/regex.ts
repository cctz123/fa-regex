export type RegexAst =
  | { type: 'epsilon' }
  | { type: 'literal'; value: string }
  | { type: 'concat'; parts: RegexAst[] }
  | { type: 'union'; options: RegexAst[] }
  | { type: 'star'; expr: RegexAst }

export interface RegexParseError {
  message: string
  index: number
}

