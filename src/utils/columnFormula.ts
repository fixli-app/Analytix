import type { SheetColumn, SheetRow } from '../store/workbook'

type ExpressionNode =
  | { kind: 'number'; value: number }
  | { kind: 'column'; id: string }
  | { kind: 'unary'; operator: '+' | '-'; operand: ExpressionNode }
  | {
      kind: 'binary'
      operator: '+' | '-' | '*' | '/' | '^' | '=' | '<>' | '<' | '<=' | '>' | '>='
      left: ExpressionNode
      right: ExpressionNode
    }
  | { kind: 'function'; name: string; arguments: ExpressionNode[] }

type Token = {
  kind: 'number' | 'identifier' | 'operator' | 'leftParen' | 'rightParen' | 'comma'
  value: string
  position: number
}

const unaryFunctions: Record<string, (value: number) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  cos: Math.cos,
  exp: Math.exp,
  floor: Math.floor,
  ln: Math.log,
  log: Math.log,
  log10: Math.log10,
  round: Math.round,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
}

const variadicFunctions = new Set(['avg', 'max', 'mean', 'min', 'sum'])
const logicalFunctions = new Set(['and', 'if', 'not', 'or'])

export interface CalculatedColumn {
  name: string
  values: (number | null)[]
}

export function calculateColumnFormula(
  formula: string,
  name: string,
  columns: readonly SheetColumn[],
  rows: readonly SheetRow[],
): CalculatedColumn {
  if (!name.trim()) throw new Error('Ange ett namn för den nya kolumnen.')
  const parser = new FormulaParser(formula, columns)
  const expression = parser.parse()
  const values = rows.map((row, index) => {
    try {
      const value = evaluate(expression, row)
      if (value === null) return null
      if (!Number.isFinite(value)) {
        throw new Error('Formeln gav ett icke-ändligt värde.')
      }
      return value
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Formeln kunde inte beräknas.'
      throw new Error(`${message.replace(/\.$/, '')} (rad ${index + 1}).`)
    }
  })

  return { name: name.trim(), values }
}

class FormulaParser {
  private readonly tokens: Token[]
  private index = 0
  private readonly numericColumns: Set<string>

  constructor(formula: string, columns: readonly SheetColumn[]) {
    this.tokens = tokenize(formula)
    this.numericColumns = new Set(
      columns.filter((column) => column.type === 'numeric').map((column) => column.id),
    )
  }

  parse(): ExpressionNode {
    if (this.tokens.length === 0) throw new Error('Formeln får inte vara tom.')
    const expression = this.parseExpression()
    if (this.index < this.tokens.length) {
      this.fail(`Oväntat tecken "${this.peek()!.value}"`)
    }
    return expression
  }

  private parseExpression(): ExpressionNode {
    let node = this.parseAdditive()
    while (this.matchComparison()) {
      const operator = this.previous().value as '=' | '<>' | '<' | '<=' | '>' | '>='
      node = { kind: 'binary', operator, left: node, right: this.parseAdditive() }
    }
    return node
  }

  private parseAdditive(): ExpressionNode {
    let node = this.parseTerm()
    while (this.matchOperator('+') || this.matchOperator('-')) {
      const operator = this.previous().value as '+' | '-'
      node = { kind: 'binary', operator, left: node, right: this.parseTerm() }
    }
    return node
  }

  private parseTerm(): ExpressionNode {
    let node = this.parseUnary()
    while (this.matchOperator('*') || this.matchOperator('/')) {
      const operator = this.previous().value as '*' | '/'
      node = { kind: 'binary', operator, left: node, right: this.parseUnary() }
    }
    return node
  }

  private parseUnary(): ExpressionNode {
    if (this.matchOperator('+') || this.matchOperator('-')) {
      return {
        kind: 'unary',
        operator: this.previous().value as '+' | '-',
        operand: this.parseUnary(),
      }
    }
    return this.parsePower()
  }

  private parsePower(): ExpressionNode {
    const left = this.parsePrimary()
    if (this.matchOperator('^')) {
      return { kind: 'binary', operator: '^', left, right: this.parseUnary() }
    }
    return left
  }

  private parsePrimary(): ExpressionNode {
    const token = this.advance()
    if (!token) throw new Error('Formeln avslutas oväntat.')
    if (token.kind === 'number') return { kind: 'number', value: Number(token.value) }
    if (token.kind === 'leftParen') {
      const expression = this.parseExpression()
      if (!this.match('rightParen')) this.fail('Saknar avslutande parentes')
      return expression
    }
    if (token.kind === 'identifier') {
      const identifier = token.value.toLowerCase()
      if (identifier === 'pi') return { kind: 'number', value: Math.PI }
      if (identifier === 'e') return { kind: 'number', value: Math.E }
      if (identifier === 'true') return { kind: 'number', value: 1 }
      if (identifier === 'false') return { kind: 'number', value: 0 }
      if (this.match('leftParen')) {
        if (
          !unaryFunctions[identifier] &&
          !variadicFunctions.has(identifier) &&
          !logicalFunctions.has(identifier) &&
          identifier !== 'round'
        ) {
          this.fail(`Okänd funktion "${token.value}"`, token)
        }
        const args: ExpressionNode[] = []
        if (this.peek()?.kind !== 'rightParen') {
          args.push(this.parseExpression())
          while (this.match('comma')) args.push(this.parseExpression())
        }
        if (!this.match('rightParen')) this.fail('Saknar avslutande parentes')
        this.validateFunctionArguments(identifier, args.length, token)
        return { kind: 'function', name: identifier, arguments: args }
      }
      if (!this.numericColumns.has(token.value)) {
        this.fail(`"${token.value}" är inte en numerisk kolumn`, token)
      }
      return { kind: 'column', id: token.value }
    }
    this.fail(`Oväntat tecken "${token.value}"`, token)
  }

  private matchOperator(operator: string): boolean {
    if (this.peek()?.kind !== 'operator' || this.peek()?.value !== operator) return false
    this.index += 1
    return true
  }

  private matchComparison(): boolean {
    const operator = this.peek()?.value
    if (!operator || !['=', '<>', '<', '<=', '>', '>='].includes(operator)) return false
    this.index += 1
    return true
  }

  private validateFunctionArguments(name: string, count: number, token: Token) {
    const valid =
      (unaryFunctions[name] && count === 1) ||
      (name === 'round' && (count === 1 || count === 2)) ||
      (variadicFunctions.has(name) && count >= 1) ||
      (name === 'not' && count === 1) ||
      ((name === 'and' || name === 'or') && count >= 2) ||
      (name === 'if' && count === 3)
    if (!valid) this.fail(`Fel antal argument till "${name}"`, token)
  }

  private match(kind: Token['kind']): boolean {
    if (this.peek()?.kind !== kind) return false
    this.index += 1
    return true
  }

  private peek() {
    return this.tokens[this.index]
  }

  private advance() {
    const token = this.peek()
    if (token) this.index += 1
    return token
  }

  private previous() {
    return this.tokens[this.index - 1]
  }

  private fail(message: string, token = this.peek()): never {
    throw new Error(`${message} vid position ${token?.position ?? 'slutet'}.`)
  }
}

function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  let position = 0
  while (position < formula.length) {
    const character = formula[position]
    if (/\s/.test(character)) {
      position += 1
      continue
    }

    const start = position
    if (/[0-9.]/.test(character)) {
      position += 1
      while (position < formula.length && /[0-9.]/.test(formula[position])) position += 1
      const value = formula.slice(start, position)
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) {
        throw new Error(`Ogiltigt tal "${value}" vid position ${start}.`)
      }
      tokens.push({ kind: 'number', value, position: start })
      continue
    }

    if (/[A-Za-z_]/.test(character)) {
      position += 1
      while (position < formula.length && /[A-Za-z0-9_]/.test(formula[position])) position += 1
      tokens.push({ kind: 'identifier', value: formula.slice(start, position), position: start })
      continue
    }

    if ('+-*/^'.includes(character)) {
      tokens.push({ kind: 'operator', value: character, position })
      position += 1
      continue
    }
    if ('<>=!'.includes(character)) {
      const next = formula[position + 1]
      const pair = `${character}${next ?? ''}`
      if (['<=', '>=', '<>', '!='].includes(pair)) {
        tokens.push({ kind: 'operator', value: pair === '!=' ? '<>' : pair, position })
        position += 2
        continue
      }
      if (character !== '!') {
        tokens.push({ kind: 'operator', value: character, position })
        position += 1
        continue
      }
    }
    if (character === '(' || character === ')') {
      tokens.push({
        kind: character === '(' ? 'leftParen' : 'rightParen',
        value: character,
        position,
      })
      position += 1
      continue
    }
    if (character === ',') {
      tokens.push({ kind: 'comma', value: character, position })
      position += 1
      continue
    }
    throw new Error(`Otillåtet tecken "${character}" vid position ${position}.`)
  }
  return tokens
}

function evaluate(node: ExpressionNode, row: SheetRow): number | null {
  if (node.kind === 'number') return node.value
  if (node.kind === 'column') {
    const raw = row[node.id]?.trim()
    if (!raw) return null
    const value = Number(raw.replace(',', '.'))
    if (!Number.isFinite(value)) throw new Error(`Kolumn ${node.id} innehåller ett ogiltigt tal`)
    return value
  }

  if (node.kind === 'unary') {
    const operand = evaluate(node.operand, row)
    if (operand === null) return null
    return node.operator === '-' ? -operand : operand
  }

  if (node.kind === 'function') {
    if (node.name === 'if') {
      const condition = evaluate(node.arguments[0], row)
      if (condition === null) return null
      return evaluate(node.arguments[condition !== 0 ? 1 : 2], row)
    }
    if (node.name === 'not') {
      const value = evaluate(node.arguments[0], row)
      return value === null ? null : value === 0 ? 1 : 0
    }
    if (node.name === 'and' || node.name === 'or') {
      let missing = false
      for (const argument of node.arguments) {
        const value = evaluate(argument, row)
        if (value === null) {
          missing = true
        } else if (node.name === 'and' && value === 0) {
          return 0
        } else if (node.name === 'or' && value !== 0) {
          return 1
        }
      }
      if (missing) return null
      return node.name === 'and' ? 1 : 0
    }

    const values = node.arguments.map((argument) => evaluate(argument, row))
    if (values.some((value) => value === null)) return null
    const numbers = values as number[]
    if (node.name === 'round' && numbers.length === 2) {
      const scale = 10 ** numbers[1]
      return Math.round(numbers[0] * scale) / scale
    }
    if (node.name === 'min') return Math.min(...numbers)
    if (node.name === 'max') return Math.max(...numbers)
    if (node.name === 'sum') return numbers.reduce((sum, value) => sum + value, 0)
    if (node.name === 'mean' || node.name === 'avg') {
      return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
    }
    return unaryFunctions[node.name](numbers[0])
  }

  const left = evaluate(node.left, row)
  const right = evaluate(node.right, row)
  if (left === null || right === null) return null
  switch (node.operator) {
    case '+':
      return left + right
    case '-':
      return left - right
    case '*':
      return left * right
    case '/':
      return left / right
    case '^':
      return left ** right
    case '=':
      return left === right ? 1 : 0
    case '<>':
      return left !== right ? 1 : 0
    case '<':
      return left < right ? 1 : 0
    case '<=':
      return left <= right ? 1 : 0
    case '>':
      return left > right ? 1 : 0
    case '>=':
      return left >= right ? 1 : 0
  }
}
