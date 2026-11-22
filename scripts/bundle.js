/**
 * Scope-hoisting ES module bundler for the release build (#41). Node
 * built-ins only.
 *
 * Every module is parsed (a small permissive ECMAScript parser below), its
 * scopes are resolved, and the static module graph is concatenated into one
 * module scope in ES module evaluation order (post-order, depth first, cycles
 * cut where the specification cuts them). Top-level bindings keep their name
 * unless it collides with another module's binding, a global the bundle
 * reads, or a local that would capture it; then that binding, and only the
 * references that resolve to it, are renamed. Imports become direct
 * references to the exporting binding, so live bindings, hoisted function
 * declarations and temporal dead zones behave as they do between modules.
 * Namespace imports become frozen objects with getters.
 *
 * Modules reachable only through `import('literal')` go into separate chunk
 * files (one per set of dynamic entry points that reach them); a chunk
 * imports what it uses from the bundle and from the chunks it depends on.
 */

const ID_START = /[$_\p{ID_Start}]/u;
const ID_CONTINUE = /[$_\u200c\u200d\p{ID_Continue}]/u;
const NUMBER = /(?:0[xX][\da-fA-F_]+|0[oO][0-7_]+|0[bB][01_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?)n?/y;
const PUNCTUATORS = [
  '>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
  '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=',
  '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>',
];
const ASSIGNMENT_OPERATORS = new Set([
  '=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=',
  '&&=', '||=', '??=',
]);
const BINARY_PRECEDENCE = {
  '??': 1, '||': 2, '&&': 3, '|': 4, '^': 5, '&': 6,
  '==': 7, '!=': 7, '===': 7, '!==': 7,
  '<': 8, '>': 8, '<=': 8, '>=': 8, instanceof: 8, in: 8,
  '<<': 9, '>>': 9, '>>>': 9, '+': 10, '-': 10, '*': 11, '/': 11, '%': 11, '**': 12,
};
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
  'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import',
  'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'enum',
]);
// Names the generated code itself reads; no binding may take them.
const GENERATED_GLOBALS = ['Object', 'Symbol', 'Promise', 'URL', 'undefined', 'NaN', 'Infinity', 'globalThis', 'arguments', 'eval'];

const isLineTerminator = (c) => c === '\n' || c === '\r' || c === '\u2028' || c === '\u2029';
const isDigit = (c) => c >= '0' && c <= '9';

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

class Lexer {
  constructor(source) {
    this.source = source;
    this.pos = 0;
    if (source.startsWith('#!')) {
      while (this.pos < source.length && !isLineTerminator(source[this.pos])) this.pos++;
    }
    this.names = new Set();
  }

  // Skip whitespace and comments; report whether a line break was crossed.
  skip() {
    const s = this.source;
    let newline = false;
    while (this.pos < s.length) {
      const c = s[this.pos];
      if (isLineTerminator(c)) {
        newline = true;
        this.pos++;
      } else if (c === ' ' || c === '\t' || c === '\v' || c === '\f' || c === '\u00a0' || c === '\ufeff' || (c > '\u007f' && /\s/.test(c))) {
        this.pos++;
      } else if (c === '/' && s[this.pos + 1] === '/') {
        while (this.pos < s.length && !isLineTerminator(s[this.pos])) this.pos++;
      } else if (c === '/' && s[this.pos + 1] === '*') {
        const end = s.indexOf('*/', this.pos + 2);
        if (end === -1) throw new Error('Unterminated comment');
        for (let i = this.pos; i < end; i++) if (isLineTerminator(s[i])) { newline = true; break; }
        this.pos = end + 2;
      } else {
        break;
      }
    }
    return newline;
  }

  readWord() {
    const s = this.source;
    let value = '';
    while (this.pos < s.length) {
      if (s[this.pos] === '\\' && s[this.pos + 1] === 'u') {
        let code;
        if (s[this.pos + 2] === '{') {
          const close = s.indexOf('}', this.pos);
          code = parseInt(s.slice(this.pos + 3, close), 16);
          this.pos = close + 1;
        } else {
          code = parseInt(s.slice(this.pos + 2, this.pos + 6), 16);
          this.pos += 6;
        }
        value += String.fromCodePoint(code);
        continue;
      }
      const character = String.fromCodePoint(s.codePointAt(this.pos));
      if (!ID_CONTINUE.test(character)) break;
      value += character;
      this.pos += character.length;
    }
    return value;
  }

  next() {
    const nl = this.skip();
    const s = this.source;
    const start = this.pos;
    if (start >= s.length) return { type: 'eof', value: '', start, end: start, nl };
    const c = s[start];
    const character = String.fromCodePoint(s.codePointAt(start));
    if (c === '\\' || ID_START.test(character)) {
      const value = this.readWord();
      this.names.add(value);
      return { type: 'name', value, start, end: this.pos, nl };
    }
    if (c === '#') {
      this.pos++;
      return { type: 'private', value: this.readWord(), start, end: this.pos, nl };
    }
    if (isDigit(c) || (c === '.' && isDigit(s[start + 1]))) {
      NUMBER.lastIndex = start;
      const match = NUMBER.exec(s);
      this.pos = start + match[0].length;
      return { type: 'num', value: match[0], start, end: this.pos, nl };
    }
    if (c === '"' || c === '\'') {
      let i = start + 1;
      while (i < s.length && s[i] !== c) {
        if (s[i] === '\\') i++;
        i++;
      }
      this.pos = i + 1;
      return { type: 'string', value: decodeString(s.slice(start + 1, i)), start, end: this.pos, nl };
    }
    if (c === '`') return this.readTemplate(start, start + 1, nl);
    for (const punctuator of PUNCTUATORS) {
      if (s.startsWith(punctuator, start)) {
        if (punctuator === '?.' && isDigit(s[start + 2])) continue;
        this.pos = start + punctuator.length;
        return { type: 'punct', value: punctuator, start, end: this.pos, nl };
      }
    }
    this.pos = start + 1;
    return { type: 'punct', value: c, start, end: this.pos, nl };
  }

  // A template part from `from` (after "`" or the "}" closing "${…}") up to
  // the closing "`" (tail) or the next "${".
  readTemplate(start, from, nl) {
    const s = this.source;
    let i = from;
    while (i < s.length) {
      if (s[i] === '\\') { i += 2; continue; }
      if (s[i] === '`') { this.pos = i + 1; return { type: 'template', tail: true, start, end: this.pos, nl }; }
      if (s[i] === '$' && s[i + 1] === '{') { this.pos = i + 2; return { type: 'template', tail: false, start, end: this.pos, nl }; }
      i++;
    }
    throw new Error('Unterminated template literal');
  }

  readRegex(start, nl) {
    const s = this.source;
    let i = start + 1;
    let inClass = false;
    while (i < s.length) {
      const c = s[i];
      if (c === '\\') { i += 2; continue; }
      if (isLineTerminator(c)) throw new Error('Unterminated regular expression');
      if (inClass) {
        if (c === ']') inClass = false;
      } else if (c === '[') {
        inClass = true;
      } else if (c === '/') {
        break;
      }
      i++;
    }
    i++;
    while (i < s.length && ID_CONTINUE.test(s[i])) i++;
    this.pos = i;
    return { type: 'regex', value: s.slice(start, i), start, end: i, nl };
  }
}

function decodeString(raw) {
  if (!raw.includes('\\')) return raw;
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== '\\') { out += raw[i]; continue; }
    const c = raw[++i];
    if (c === 'n') out += '\n';
    else if (c === 't') out += '\t';
    else if (c === 'r') out += '\r';
    else if (c === 'b') out += '\b';
    else if (c === 'f') out += '\f';
    else if (c === 'v') out += '\v';
    else if (c === '0' && !isDigit(raw[i + 1])) out += '\0';
    else if (c === 'x') { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 3), 16)); i += 2; }
    else if (c === 'u' && raw[i + 1] === '{') { const close = raw.indexOf('}', i); out += String.fromCodePoint(parseInt(raw.slice(i + 2, close), 16)); i = close; }
    else if (c === 'u') { out += String.fromCharCode(parseInt(raw.slice(i + 1, i + 5), 16)); i += 4; }
    else if (c === '\r') { if (raw[i + 1] === '\n') i++; }
    else if (isLineTerminator(c)) { /* line continuation */ }
    else out += c;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Parser: a permissive recursive-descent parser for module code. It keeps
// just enough of an ESTree-like tree to resolve scopes and edit the source.
// Property names, member names and labels are `Name` nodes, never
// `Identifier`, so every Identifier is a binding or a reference.
// ---------------------------------------------------------------------------

class Parser {
  constructor(source) {
    this.source = source;
    this.lexer = new Lexer(source);
    this.prevEnd = 0;
    this.tok = this.lexer.next();
    this.functionDepth = 0;
    this.inGenerator = false;
    this.topLevelAwait = false;
  }

  raise(message, pos = this.tok.start) {
    const before = this.source.slice(0, pos);
    const line = before.split('\n').length;
    const column = pos - before.lastIndexOf('\n');
    throw new Error(`${message} (${line}:${column})`);
  }

  next() {
    this.prevEnd = this.tok.end;
    this.tok = this.lexer.next();
  }

  peek() {
    const pos = this.lexer.pos;
    const token = this.lexer.next();
    this.lexer.pos = pos;
    return token;
  }

  isP(value) { return this.tok.type === 'punct' && this.tok.value === value; }
  isN(value) { return this.tok.type === 'name' && this.tok.value === value; }
  eat(value) { if (this.isP(value)) { this.next(); return true; } return false; }
  eatN(value) { if (this.isN(value)) { this.next(); return true; } return false; }
  expect(value) { if (!this.eat(value)) this.raise(`Expected "${value}" but found "${this.tok.value || this.tok.type}"`); }
  expectN(value) { if (!this.eatN(value)) this.raise(`Expected "${value}"`); }

  semicolon() {
    if (this.eat(';')) return;
    if (this.isP('}') || this.tok.type === 'eof' || this.tok.nl) return;
    this.raise(`Expected ";" but found "${this.tok.value || this.tok.type}"`);
  }

  finish(node, start) {
    node.start = start;
    node.end = this.prevEnd;
    return node;
  }

  identifier() {
    if (this.tok.type !== 'name') this.raise(`Expected an identifier but found "${this.tok.value || this.tok.type}"`);
    const node = { type: 'Identifier', name: this.tok.value, start: this.tok.start, end: this.tok.end };
    this.next();
    return node;
  }

  name() {
    if (this.tok.type !== 'name' && this.tok.type !== 'private') this.raise('Expected a name');
    const node = { type: 'Name', name: this.tok.value, start: this.tok.start, end: this.tok.end };
    this.next();
    return node;
  }

  parseProgram() {
    const body = [];
    while (this.tok.type !== 'eof') body.push(this.parseStatement(true));
    return { type: 'Program', body, start: 0, end: this.source.length };
  }

  // ----- Statements --------------------------------------------------------

  parseStatement(topLevel = false) {
    const start = this.tok.start;
    if (this.tok.type === 'punct') {
      if (this.tok.value === '{') return this.parseBlock();
      if (this.tok.value === ';') { this.next(); return this.finish({ type: 'EmptyStatement' }, start); }
    }
    if (this.tok.type === 'name') {
      const peek = () => this.peek();
      switch (this.tok.value) {
        case 'var':
        case 'const':
          return this.parseVariableStatement();
        case 'let': {
          const next = peek();
          if (next.type === 'name' || (next.type === 'punct' && (next.value === '[' || next.value === '{'))) {
            return this.parseVariableStatement();
          }
          break;
        }
        case 'function':
          return this.parseFunction(true, false, start);
        case 'async': {
          const next = peek();
          if (next.type === 'name' && next.value === 'function' && !next.nl) {
            this.next();
            return this.parseFunction(true, true, start);
          }
          break;
        }
        case 'class':
          return this.parseClass(true);
        case 'if': {
          this.next();
          this.expect('(');
          const test = this.parseExpression();
          this.expect(')');
          const consequent = this.parseStatement();
          const alternate = this.eatN('else') ? this.parseStatement() : null;
          return this.finish({ type: 'IfStatement', test, consequent, alternate }, start);
        }
        case 'for':
          return this.parseFor();
        case 'while': {
          this.next();
          this.expect('(');
          const test = this.parseExpression();
          this.expect(')');
          const body = this.parseStatement();
          return this.finish({ type: 'WhileStatement', test, body }, start);
        }
        case 'do': {
          this.next();
          const body = this.parseStatement();
          this.expectN('while');
          this.expect('(');
          const test = this.parseExpression();
          this.expect(')');
          this.eat(';');
          return this.finish({ type: 'DoWhileStatement', test, body }, start);
        }
        case 'return':
        case 'throw': {
          const type = this.tok.value === 'return' ? 'ReturnStatement' : 'ThrowStatement';
          this.next();
          let argument = null;
          if (!this.tok.nl && !this.isP(';') && !this.isP('}') && this.tok.type !== 'eof') argument = this.parseExpression();
          this.semicolon();
          return this.finish({ type, argument }, start);
        }
        case 'break':
        case 'continue': {
          const type = this.tok.value === 'break' ? 'BreakStatement' : 'ContinueStatement';
          this.next();
          const label = this.tok.type === 'name' && !this.tok.nl ? this.name() : null;
          this.semicolon();
          return this.finish({ type, label }, start);
        }
        case 'try': {
          this.next();
          const block = this.parseBlock();
          let handler = null;
          if (this.isN('catch')) {
            const catchStart = this.tok.start;
            this.next();
            let param = null;
            if (this.eat('(')) {
              param = this.parseBindingTarget();
              this.expect(')');
            }
            const body = this.parseBlock();
            handler = this.finish({ type: 'CatchClause', param, body }, catchStart);
          }
          const finalizer = this.eatN('finally') ? this.parseBlock() : null;
          return this.finish({ type: 'TryStatement', block, handler, finalizer }, start);
        }
        case 'switch': {
          this.next();
          this.expect('(');
          const discriminant = this.parseExpression();
          this.expect(')');
          this.expect('{');
          const cases = [];
          while (!this.eat('}')) {
            const caseStart = this.tok.start;
            let test = null;
            if (this.eatN('case')) test = this.parseExpression();
            else this.expectN('default');
            this.expect(':');
            const consequent = [];
            while (!this.isP('}') && !this.isN('case') && !this.isN('default')) consequent.push(this.parseStatement());
            cases.push(this.finish({ type: 'SwitchCase', test, consequent }, caseStart));
          }
          return this.finish({ type: 'SwitchStatement', discriminant, cases }, start);
        }
        case 'debugger':
          this.next();
          this.semicolon();
          return this.finish({ type: 'DebuggerStatement' }, start);
        case 'with':
          this.raise('"with" is not allowed in module code');
          break;
        case 'import': {
          const next = peek();
          if (!(next.type === 'punct' && (next.value === '(' || next.value === '.'))) {
            if (!topLevel) this.raise('import declarations must be at the top level');
            return this.parseImport();
          }
          break;
        }
        case 'export':
          if (!topLevel) this.raise('export declarations must be at the top level');
          return this.parseExport();
        default: {
          if (!RESERVED.has(this.tok.value)) {
            const next = peek();
            if (next.type === 'punct' && next.value === ':') {
              const label = this.name();
              this.next();
              const body = this.parseStatement();
              return this.finish({ type: 'LabeledStatement', label, body }, start);
            }
          }
        }
      }
    }
    const expression = this.parseExpression();
    this.semicolon();
    return this.finish({ type: 'ExpressionStatement', expression }, start);
  }

  parseBlock() {
    const start = this.tok.start;
    this.expect('{');
    const body = [];
    while (!this.eat('}')) body.push(this.parseStatement());
    return this.finish({ type: 'BlockStatement', body }, start);
  }

  parseVariableStatement() {
    const start = this.tok.start;
    const node = this.parseVariableDeclarations(false);
    this.semicolon();
    return this.finish(node, start);
  }

  parseVariableDeclarations(noIn) {
    const start = this.tok.start;
    const kind = this.tok.value;
    this.next();
    const declarations = [];
    do {
      const declaratorStart = this.tok.start;
      const id = this.parseBindingTarget();
      const init = this.eat('=') ? this.parseMaybeAssign(noIn) : null;
      declarations.push(this.finish({ type: 'VariableDeclarator', id, init }, declaratorStart));
    } while (this.eat(','));
    return this.finish({ type: 'VariableDeclaration', kind, declarations }, start);
  }

  parseBindingTarget() {
    if (this.isP('[')) return this.parseArray();
    if (this.isP('{')) return this.parseObject();
    return this.identifier();
  }

  parseFor() {
    const start = this.tok.start;
    this.next();
    const isAwait = this.eatN('await');
    if (isAwait && this.functionDepth === 0) this.topLevelAwait = true;
    this.expect('(');
    let init = null;
    if (!this.isP(';')) {
      const next = this.isN('let') ? this.peek() : null;
      if (this.isN('var') || this.isN('const') || (next && (next.type === 'name' || next.value === '[' || next.value === '{'))) {
        init = this.parseVariableDeclarations(true);
      } else {
        init = this.parseExpression(true);
      }
      if (this.isN('of') || this.isN('in')) {
        const type = this.tok.value === 'of' ? 'ForOfStatement' : 'ForInStatement';
        this.next();
        const right = type === 'ForOfStatement' ? this.parseMaybeAssign() : this.parseExpression();
        this.expect(')');
        const body = this.parseStatement();
        return this.finish({ type, left: init, right, body, await: isAwait }, start);
      }
    }
    this.expect(';');
    const test = this.isP(';') ? null : this.parseExpression();
    this.expect(';');
    const update = this.isP(')') ? null : this.parseExpression();
    this.expect(')');
    const body = this.parseStatement();
    return this.finish({ type: 'ForStatement', init, test, update, body }, start);
  }

  parseFunctionBody(isAsync, isGenerator) {
    const saved = [this.inGenerator, this.functionDepth];
    this.inGenerator = isGenerator;
    this.functionDepth++;
    const start = this.tok.start;
    this.expect('{');
    const body = [];
    while (!this.eat('}')) body.push(this.parseStatement());
    [this.inGenerator, this.functionDepth] = saved;
    void isAsync;
    return this.finish({ type: 'FunctionBody', body }, start);
  }

  parseParams() {
    this.expect('(');
    const params = [];
    while (!this.eat(')')) {
      const start = this.tok.start;
      if (this.eat('...')) {
        params.push(this.finish({ type: 'RestElement', argument: this.parseBindingTarget() }, start));
      } else {
        const left = this.parseBindingTarget();
        if (this.eat('=')) params.push(this.finish({ type: 'AssignmentPattern', left, right: this.parseMaybeAssign() }, start));
        else params.push(left);
      }
      if (!this.isP(')')) this.expect(',');
    }
    return params;
  }

  // `start` is where `async` or `function` begins.
  parseFunction(isStatement, isAsync, start) {
    this.expectN('function');
    const generator = this.eat('*');
    let id = null;
    if (this.tok.type === 'name' && !this.isP('(')) id = this.identifier();
    const paramsStart = this.tok.start;
    const params = this.withFunctionContext(() => this.parseParams());
    const body = this.parseFunctionBody(isAsync, generator);
    return this.finish({
      type: isStatement ? 'FunctionDeclaration' : 'FunctionExpression',
      id, params, body, async: isAsync, generator, paramsStart,
    }, start);
  }

  withFunctionContext(fn) {
    this.functionDepth++;
    try { return fn(); } finally { this.functionDepth--; }
  }

  parseMethod(isAsync, isGenerator, start) {
    const params = this.withFunctionContext(() => this.parseParams());
    const body = this.parseFunctionBody(isAsync, isGenerator);
    return this.finish({ type: 'FunctionExpression', id: null, params, body, async: isAsync, generator: isGenerator, method: true }, start);
  }

  parseClass(isStatement) {
    const start = this.tok.start;
    this.expectN('class');
    let id = null;
    if (this.tok.type === 'name' && !this.isN('extends')) id = this.identifier();
    let superClass = null;
    if (this.eatN('extends')) superClass = this.parseExprSubscripts();
    this.expect('{');
    const body = [];
    const memberEnd = (t) => t.type === 'punct' && (t.value === '(' || t.value === '=' || t.value === ';' || t.value === '}');
    while (!this.eat('}')) {
      if (this.eat(';')) continue;
      const memberStart = this.tok.start;
      let isStatic = false;
      if (this.isN('static') && !memberEnd(this.peek())) {
        this.next();
        if (this.isP('{')) {
          const block = this.parseFunctionBody(false, false);
          body.push(this.finish({ type: 'StaticBlock', body: block.body }, memberStart));
          continue;
        }
        isStatic = true;
      }
      let isAsync = false;
      let isGenerator = false;
      let kind = 'method';
      if (this.isN('async') && !memberEnd(this.peek()) && !this.peek().nl) { this.next(); isAsync = true; }
      if (this.eat('*')) isGenerator = true;
      if ((this.isN('get') || this.isN('set')) && !memberEnd(this.peek())) { kind = this.tok.value; this.next(); }
      const { key, computed } = this.parsePropertyKey();
      if (this.isP('(')) {
        const value = this.parseMethod(isAsync, isGenerator, this.tok.start);
        body.push(this.finish({ type: 'MethodDefinition', key, computed, value, kind, static: isStatic }, memberStart));
      } else {
        let value = null;
        if (this.eat('=')) value = this.withFunctionContext(() => this.parseMaybeAssign());
        this.semicolon();
        body.push(this.finish({ type: 'PropertyDefinition', key, computed, value, static: isStatic }, memberStart));
      }
    }
    return this.finish({ type: isStatement ? 'ClassDeclaration' : 'ClassExpression', id, superClass, body }, start);
  }

  parsePropertyKey() {
    if (this.eat('[')) {
      const key = this.parseMaybeAssign();
      this.expect(']');
      return { key, computed: true };
    }
    if (this.tok.type === 'string' || this.tok.type === 'num') {
      const key = { type: 'Literal', value: this.tok.value, start: this.tok.start, end: this.tok.end };
      this.next();
      return { key, computed: false };
    }
    return { key: this.name(), computed: false };
  }

  parseModuleName() {
    if (this.tok.type === 'string') {
      const value = this.tok.value;
      this.next();
      return value;
    }
    return this.name().name;
  }

  parseSource() {
    if (this.tok.type !== 'string') this.raise('Expected a module specifier');
    const source = { type: 'Literal', value: this.tok.value, start: this.tok.start, end: this.tok.end };
    this.next();
    // Import attributes: `with { type: 'json' }`.
    if ((this.isN('with') || (this.isN('assert') && !this.tok.nl)) && this.peek().value === '{') {
      this.next();
      this.parseObject();
    }
    return source;
  }

  parseImport() {
    const start = this.tok.start;
    this.next();
    const specifiers = [];
    if (this.tok.type !== 'string') {
      if (this.tok.type === 'name') {
        specifiers.push({ kind: 'default', imported: 'default', local: this.identifier() });
        this.eat(',');
      }
      if (this.eat('*')) {
        this.expectN('as');
        specifiers.push({ kind: 'namespace', imported: '*', local: this.identifier() });
      } else if (this.eat('{')) {
        while (!this.eat('}')) {
          const importedToken = this.tok;
          const imported = this.parseModuleName();
          let local;
          if (this.eatN('as')) {
            local = this.identifier();
          } else {
            local = { type: 'Identifier', name: imported, start: importedToken.start, end: importedToken.end };
          }
          specifiers.push({ kind: 'named', imported, local });
          if (!this.isP('}')) this.expect(',');
        }
      }
      this.expectN('from');
    }
    const source = this.parseSource();
    this.semicolon();
    return this.finish({ type: 'ImportDeclaration', specifiers, source }, start);
  }

  parseExport() {
    const start = this.tok.start;
    this.next();
    if (this.eat('*')) {
      const exported = this.eatN('as') ? this.parseModuleName() : null;
      this.expectN('from');
      const source = this.parseSource();
      this.semicolon();
      return this.finish({ type: 'ExportAllDeclaration', exported, source }, start);
    }
    if (this.eatN('default')) {
      const declarationStart = this.tok.start;
      let declaration;
      let kind = 'expression';
      if (this.isN('function')) {
        declaration = this.parseFunction(true, false, declarationStart);
        kind = 'function';
      } else if (this.isN('async') && this.peek().value === 'function' && !this.peek().nl) {
        this.next();
        declaration = this.parseFunction(true, true, declarationStart);
        kind = 'function';
      } else if (this.isN('class')) {
        declaration = this.parseClass(true);
        kind = 'class';
      } else {
        declaration = this.parseMaybeAssign();
        this.semicolon();
      }
      return this.finish({ type: 'ExportDefaultDeclaration', declaration, kind }, start);
    }
    if (this.eat('{')) {
      const specifiers = [];
      while (!this.eat('}')) {
        const local = this.parseModuleName();
        const exported = this.eatN('as') ? this.parseModuleName() : local;
        specifiers.push({ local, exported });
        if (!this.isP('}')) this.expect(',');
      }
      const source = this.eatN('from') ? this.parseSource() : null;
      this.semicolon();
      return this.finish({ type: 'ExportNamedDeclaration', specifiers, source, declaration: null }, start);
    }
    const declaration = this.parseStatement();
    if (!/^(?:VariableDeclaration|FunctionDeclaration|ClassDeclaration)$/.test(declaration.type)) {
      this.raise('Unsupported export declaration', start);
    }
    return this.finish({ type: 'ExportNamedDeclaration', specifiers: [], source: null, declaration }, start);
  }

  // ----- Expressions -------------------------------------------------------

  parseExpression(noIn = false) {
    const start = this.tok.start;
    const expression = this.parseMaybeAssign(noIn);
    if (!this.isP(',')) return expression;
    const expressions = [expression];
    while (this.eat(',')) expressions.push(this.parseMaybeAssign(noIn));
    return this.finish({ type: 'SequenceExpression', expressions }, start);
  }

  parseMaybeAssign(noIn = false) {
    const start = this.tok.start;
    if (this.inGenerator && this.isN('yield')) {
      this.next();
      let delegate = false;
      let argument = null;
      if (!this.tok.nl) {
        delegate = this.eat('*');
        const t = this.tok;
        const ends = t.type === 'eof' || (t.type === 'punct' && [')', ']', '}', ',', ';', ':'].includes(t.value));
        if (delegate || !ends) argument = this.parseMaybeAssign(noIn);
      }
      return this.finish({ type: 'YieldExpression', argument, delegate }, start);
    }
    const left = this.parseMaybeConditional(noIn);
    if (this.tok.type === 'punct' && ASSIGNMENT_OPERATORS.has(this.tok.value)) {
      const operator = this.tok.value;
      this.next();
      const right = this.parseMaybeAssign(noIn);
      return this.finish({ type: 'AssignmentExpression', operator, left, right }, start);
    }
    return left;
  }

  parseMaybeConditional(noIn) {
    const start = this.tok.start;
    const test = this.parseExprOp(this.parseMaybeUnary(), -1, noIn);
    if (!this.eat('?')) return test;
    const consequent = this.parseMaybeAssign();
    this.expect(':');
    const alternate = this.parseMaybeAssign(noIn);
    return this.finish({ type: 'ConditionalExpression', test, consequent, alternate }, start);
  }

  binaryOperator(noIn) {
    const t = this.tok;
    if (t.type === 'punct' && Object.hasOwn(BINARY_PRECEDENCE, t.value)) return t.value;
    if (t.type === 'name' && (t.value === 'instanceof' || (t.value === 'in' && !noIn))) return t.value;
    return null;
  }

  parseExprOp(left, minPrecedence, noIn) {
    const operator = this.binaryOperator(noIn);
    if (operator === null) return left;
    const precedence = BINARY_PRECEDENCE[operator];
    if (precedence <= minPrecedence) return left;
    this.next();
    const right = this.parseExprOp(this.parseMaybeUnary(), operator === '**' ? precedence - 1 : precedence, noIn);
    const node = { type: 'BinaryExpression', operator, left, right, start: left.start, end: this.prevEnd };
    return this.parseExprOp(node, minPrecedence, noIn);
  }

  parseMaybeUnary() {
    const start = this.tok.start;
    const t = this.tok;
    if ((t.type === 'punct' && ['!', '~', '+', '-', '++', '--'].includes(t.value))
      || (t.type === 'name' && ['typeof', 'void', 'delete', 'await'].includes(t.value))) {
      if (t.value === 'await' && this.functionDepth === 0) this.topLevelAwait = true;
      this.next();
      const argument = this.parseMaybeUnary();
      return this.finish({ type: 'UnaryExpression', operator: t.value, argument }, start);
    }
    let expression = this.parseExprSubscripts();
    while (this.tok.type === 'punct' && (this.tok.value === '++' || this.tok.value === '--') && !this.tok.nl) {
      this.next();
      expression = this.finish({ type: 'UpdateExpression', argument: expression }, start);
    }
    return expression;
  }

  parseExprSubscripts() {
    const start = this.tok.start;
    return this.parseSubscripts(this.parseExprAtom(), start, false);
  }

  parseSubscripts(base, start, noCalls) {
    for (;;) {
      if (this.eat('.')) {
        base = this.finish({ type: 'MemberExpression', object: base, property: this.name(), computed: false }, start);
      } else if (this.isP('?.')) {
        this.next();
        if (this.isP('(')) {
          base = this.finish({ type: 'CallExpression', callee: base, arguments: this.parseArguments(), optional: true }, start);
        } else if (this.eat('[')) {
          const property = this.parseExpression();
          this.expect(']');
          base = this.finish({ type: 'MemberExpression', object: base, property, computed: true }, start);
        } else {
          base = this.finish({ type: 'MemberExpression', object: base, property: this.name(), computed: false }, start);
        }
      } else if (this.eat('[')) {
        const property = this.parseExpression();
        this.expect(']');
        base = this.finish({ type: 'MemberExpression', object: base, property, computed: true }, start);
      } else if (!noCalls && this.isP('(')) {
        base = this.finish({ type: 'CallExpression', callee: base, arguments: this.parseArguments() }, start);
      } else if (this.tok.type === 'template') {
        base = this.finish({ type: 'TaggedTemplateExpression', tag: base, quasi: this.parseTemplate() }, start);
      } else {
        return base;
      }
    }
  }

  parseArguments() {
    this.expect('(');
    const args = [];
    while (!this.eat(')')) {
      const start = this.tok.start;
      if (this.eat('...')) args.push(this.finish({ type: 'SpreadElement', argument: this.parseMaybeAssign() }, start));
      else args.push(this.parseMaybeAssign());
      if (!this.isP(')')) this.expect(',');
    }
    return args;
  }

  parseTemplate() {
    const start = this.tok.start;
    const expressions = [];
    while (!this.tok.tail) {
      this.next();
      expressions.push(this.parseExpression());
      if (!this.isP('}')) this.raise('Expected "}" in template literal');
      this.tok = this.lexer.readTemplate(this.tok.start, this.tok.start + 1, false);
    }
    this.next();
    return this.finish({ type: 'TemplateLiteral', expressions }, start);
  }

  parseParenList() {
    this.expect('(');
    const items = [];
    while (!this.eat(')')) {
      const start = this.tok.start;
      if (this.eat('...')) items.push(this.finish({ type: 'SpreadElement', argument: this.parseMaybeAssign() }, start));
      else items.push(this.parseMaybeAssign());
      if (!this.isP(')')) this.expect(',');
    }
    return items;
  }

  parseArrow(isAsync, params, start) {
    this.expect('=>');
    const saved = [this.inGenerator, this.functionDepth];
    this.inGenerator = false;
    this.functionDepth++;
    let body;
    if (this.isP('{')) {
      body = this.parseFunctionBody(isAsync, false);
    } else {
      body = this.parseMaybeAssign();
    }
    [this.inGenerator, this.functionDepth] = saved;
    return this.finish({ type: 'ArrowFunctionExpression', params, body, async: isAsync }, start);
  }

  arrowFollows() {
    return this.isP('=>') && !this.tok.nl;
  }

  parseExprAtom() {
    const start = this.tok.start;
    const t = this.tok;
    if (t.type === 'punct') {
      if (t.value === '(') {
        const items = this.parseParenList();
        if (this.arrowFollows()) return this.parseArrow(false, items, start);
        if (items.length === 1) return this.finish({ type: 'ParenthesizedExpression', expression: items[0] }, start);
        return this.finish({ type: 'SequenceExpression', expressions: items }, start);
      }
      if (t.value === '[') return this.parseArray();
      if (t.value === '{') return this.parseObject();
      if (t.value === '/' || t.value === '/=') {
        this.tok = this.lexer.readRegex(t.start, t.nl);
        this.next();
        return this.finish({ type: 'Literal', regex: true }, start);
      }
      this.raise(`Unexpected "${t.value}"`);
    }
    if (t.type === 'template') return this.parseTemplate();
    if (t.type === 'string' || t.type === 'num') {
      this.next();
      return this.finish({ type: 'Literal', value: t.value, string: t.type === 'string' }, start);
    }
    if (t.type === 'private') {
      this.next();
      return this.finish({ type: 'PrivateName', name: t.value }, start);
    }
    if (t.type !== 'name') this.raise(`Unexpected ${t.type}`);
    switch (t.value) {
      case 'function':
        return this.parseFunction(false, false, start);
      case 'class':
        return this.parseClass(false);
      case 'new': {
        this.next();
        if (this.eat('.')) {
          this.name();
          return this.finish({ type: 'MetaProperty', meta: 'new' }, start);
        }
        const calleeStart = this.tok.start;
        const callee = this.parseSubscripts(this.parseExprAtom(), calleeStart, true);
        const args = this.isP('(') ? this.parseArguments() : [];
        return this.finish({ type: 'NewExpression', callee, arguments: args }, start);
      }
      case 'this':
      case 'super':
        this.next();
        return this.finish({ type: t.value === 'this' ? 'ThisExpression' : 'Super' }, start);
      case 'null':
      case 'true':
      case 'false':
        this.next();
        return this.finish({ type: 'Literal', value: t.value }, start);
      case 'import': {
        this.next();
        if (this.eat('.')) {
          this.name();
          return this.finish({ type: 'MetaProperty', meta: 'import' }, start);
        }
        this.expect('(');
        const source = this.parseMaybeAssign();
        const options = this.eat(',') && !this.isP(')') ? this.parseMaybeAssign() : null;
        this.eat(',');
        this.expect(')');
        return this.finish({ type: 'ImportExpression', source, options }, start);
      }
      case 'async': {
        const next = this.peek();
        if (next.type === 'name' && next.value === 'function' && !next.nl) {
          this.next();
          return this.parseFunction(false, true, start);
        }
        if (next.type === 'name' && !next.nl) {
          this.next();
          const param = this.identifier();
          if (!this.arrowFollows()) this.raise('Expected "=>"');
          return this.parseArrow(true, [param], start);
        }
        if (next.type === 'punct' && next.value === '(' && !next.nl) {
          const callee = this.identifier();
          const items = this.parseParenList();
          if (this.arrowFollows()) return this.parseArrow(true, items, start);
          return this.finish({ type: 'CallExpression', callee, arguments: items }, start);
        }
        break;
      }
      default:
        break;
    }
    const id = this.identifier();
    if (this.arrowFollows()) return this.parseArrow(false, [id], start);
    return id;
  }

  parseArray() {
    const start = this.tok.start;
    this.expect('[');
    const elements = [];
    while (!this.eat(']')) {
      if (this.eat(',')) { elements.push(null); continue; }
      const elementStart = this.tok.start;
      if (this.eat('...')) elements.push(this.finish({ type: 'SpreadElement', argument: this.parseMaybeAssign() }, elementStart));
      else elements.push(this.parseMaybeAssign());
      if (!this.isP(']')) this.expect(',');
    }
    return this.finish({ type: 'ArrayExpression', elements }, start);
  }

  parseObject() {
    const start = this.tok.start;
    this.expect('{');
    const properties = [];
    const propertyEnd = (t) => t.type === 'punct' && [',', ':', '(', '}', '='].includes(t.value);
    while (!this.eat('}')) {
      const propertyStart = this.tok.start;
      if (this.eat('...')) {
        properties.push(this.finish({ type: 'SpreadElement', argument: this.parseMaybeAssign() }, propertyStart));
      } else {
        let isAsync = false;
        let isGenerator = false;
        let kind = 'init';
        if (this.isN('async') && !propertyEnd(this.peek()) && !this.peek().nl) { this.next(); isAsync = true; }
        if (this.eat('*')) isGenerator = true;
        if ((this.isN('get') || this.isN('set')) && !propertyEnd(this.peek())) { kind = this.tok.value; this.next(); }
        const keyToken = this.tok;
        const { key, computed } = this.parsePropertyKey();
        if (this.isP('(')) {
          const value = this.parseMethod(isAsync, isGenerator, this.tok.start);
          properties.push(this.finish({ type: 'Property', key, computed, value, kind, method: true, shorthand: false }, propertyStart));
        } else if (this.eat(':')) {
          properties.push(this.finish({ type: 'Property', key, computed, value: this.parseMaybeAssign(), kind, shorthand: false }, propertyStart));
        } else {
          if (keyToken.type !== 'name') this.raise('Unexpected shorthand property', keyToken.start);
          let value = { type: 'Identifier', name: keyToken.value, start: keyToken.start, end: keyToken.end };
          if (this.eat('=')) {
            value = this.finish({ type: 'AssignmentExpression', operator: '=', left: value, right: this.parseMaybeAssign() }, keyToken.start);
          }
          properties.push(this.finish({ type: 'Property', key, computed: false, value, kind, shorthand: true }, propertyStart));
        }
      }
      if (!this.isP('}')) this.expect(',');
    }
    return this.finish({ type: 'ObjectExpression', properties }, start);
  }
}

export function parseModule(source) {
  const parser = new Parser(source);
  const ast = parser.parseProgram();
  return { ast, names: parser.lexer.names, topLevelAwait: parser.topLevelAwait };
}

// ---------------------------------------------------------------------------
// Scope analysis
// ---------------------------------------------------------------------------

class Scope {
  constructor(parent, kind, isVarScope = false) {
    this.parent = parent;
    this.kind = kind;
    this.isVarScope = isVarScope;
    this.vars = new Map();
  }

  declare(name, kind, node) {
    if (!this.vars.has(name)) this.vars.set(name, { name, kind, node, scope: this });
    return this.vars.get(name);
  }

  varScope() {
    let scope = this;
    while (!scope.isVarScope) scope = scope.parent;
    return scope;
  }

  lookup(name) {
    for (let scope = this; scope; scope = scope.parent) {
      if (scope.vars.has(name)) return scope.vars.get(name);
    }
    return null;
  }
}

const NAMED_EVALUATION_OPERATORS = new Set(['=', '&&=', '||=', '??=']);
const SKIPPED_KEYS = new Set(['type', 'start', 'end', 'shorthand', 'operator', 'kind', 'name', 'value']);

/**
 * Resolve every Identifier of a parsed module. Returns the module scope,
 * every Identifier occurrence with its scope and binding (null for globals)
 * and the source sites the linker rewrites.
 */
export function analyzeModule(ast) {
  const moduleScope = new Scope(null, 'module', true);
  const refs = [];
  const namedEvaluations = [];
  const metaURLs = [];
  const urlConstructions = [];
  const dynamicImports = [];
  let otherImportMeta = false;

  const isImportMetaURL = (node) => node?.type === 'MemberExpression' && !node.computed
    && node.object.type === 'MetaProperty' && node.object.meta === 'import' && node.property.name === 'url';

  const markShorthand = (value) => {
    if (value.type === 'Identifier') value.shorthand = true;
    else if ((value.type === 'AssignmentExpression' || value.type === 'AssignmentPattern') && value.left.type === 'Identifier') value.left.shorthand = true;
  };

  const declarePattern = (pattern, target, kind, expressionScope) => {
    if (!pattern) return;
    switch (pattern.type) {
      case 'Identifier':
        target.declare(pattern.name, kind, pattern);
        refs.push({ node: pattern, scope: target });
        return;
      case 'ObjectExpression':
        for (const property of pattern.properties) {
          if (property.type === 'Property') {
            if (property.computed) visit(property.key, expressionScope);
            if (property.shorthand) markShorthand(property.value);
            declarePattern(property.value, target, kind, expressionScope);
          } else {
            declarePattern(property.argument, target, kind, expressionScope);
          }
        }
        return;
      case 'ArrayExpression':
        for (const element of pattern.elements) declarePattern(element, target, kind, expressionScope);
        return;
      case 'AssignmentExpression':
      case 'AssignmentPattern':
        if (pattern.left.type === 'Identifier') namedEvaluations.push({ id: pattern.left, value: pattern.right });
        declarePattern(pattern.left, target, kind, expressionScope);
        visit(pattern.right, expressionScope);
        return;
      case 'RestElement':
      case 'SpreadElement':
        declarePattern(pattern.argument, target, kind, expressionScope);
        return;
      case 'ParenthesizedExpression':
        declarePattern(pattern.expression, target, kind, expressionScope);
        return;
      default:
        visit(pattern, expressionScope);
    }
  };

  const visitFunction = (node, scope) => {
    const functionScope = new Scope(scope, 'function', true);
    if (node.type === 'FunctionExpression' && node.id) {
      functionScope.declare(node.id.name, 'function-name', node);
      refs.push({ node: node.id, scope: functionScope });
    }
    for (const param of node.params) declarePattern(param, functionScope, 'param', functionScope);
    if (node.body.type === 'FunctionBody') {
      const bodyScope = new Scope(functionScope, 'body', true);
      for (const statement of node.body.body) visit(statement, bodyScope);
    } else {
      visit(node.body, functionScope);
    }
  };

  const visitClass = (node, scope, isDeclaration) => {
    const classScope = new Scope(scope, 'class');
    if (node.id) {
      classScope.declare(node.id.name, 'class-name', node);
      if (!isDeclaration) refs.push({ node: node.id, scope: classScope });
    }
    visit(node.superClass, classScope);
    for (const member of node.body) {
      if (member.type === 'StaticBlock') {
        const blockScope = new Scope(classScope, 'static', true);
        for (const statement of member.body) visit(statement, blockScope);
        continue;
      }
      if (member.computed) visit(member.key, classScope);
      if (member.type === 'MethodDefinition') visitFunction(member.value, classScope);
      else if (member.value) visit(member.value, new Scope(classScope, 'field', true));
    }
  };

  const visit = (node, scope) => {
    if (!node) return;
    switch (node.type) {
      case 'Program':
        for (const statement of node.body) visit(statement, scope);
        return;
      case 'Identifier':
        refs.push({ node, scope });
        return;
      case 'Name':
      case 'Literal':
      case 'PrivateName':
      case 'ThisExpression':
      case 'Super':
      case 'BreakStatement':
      case 'ContinueStatement':
      case 'ExportAllDeclaration':
      case 'EmptyStatement':
      case 'DebuggerStatement':
        return;
      case 'MetaProperty':
        if (node.meta === 'import') otherImportMeta = true;
        return;
      case 'VariableDeclaration': {
        const target = node.kind === 'var' ? scope.varScope() : scope;
        for (const declarator of node.declarations) {
          if (declarator.id.type === 'Identifier' && declarator.init) namedEvaluations.push({ id: declarator.id, value: declarator.init });
          declarePattern(declarator.id, target, node.kind, scope);
          visit(declarator.init, scope);
        }
        return;
      }
      case 'FunctionDeclaration':
        if (node.id) {
          scope.declare(node.id.name, 'function', node);
          refs.push({ node: node.id, scope });
        }
        visitFunction(node, scope);
        return;
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        visitFunction(node, scope);
        return;
      case 'ClassDeclaration':
        if (node.id) {
          scope.declare(node.id.name, 'class', node);
          refs.push({ node: node.id, scope });
        }
        visitClass(node, scope, true);
        return;
      case 'ClassExpression':
        visitClass(node, scope, false);
        return;
      case 'BlockStatement': {
        const inner = new Scope(scope, 'block');
        for (const statement of node.body) visit(statement, inner);
        return;
      }
      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement': {
        const inner = new Scope(scope, 'block');
        for (const key of ['init', 'left', 'test', 'update', 'right', 'body']) visit(node[key], inner);
        return;
      }
      case 'CatchClause': {
        const inner = new Scope(scope, 'catch');
        if (node.param) declarePattern(node.param, inner, 'let', inner);
        visit(node.body, inner);
        return;
      }
      case 'SwitchStatement': {
        visit(node.discriminant, scope);
        const inner = new Scope(scope, 'block');
        for (const switchCase of node.cases) {
          visit(switchCase.test, inner);
          for (const statement of switchCase.consequent) visit(statement, inner);
        }
        return;
      }
      case 'LabeledStatement':
        visit(node.body, scope);
        return;
      case 'MemberExpression':
        if (isImportMetaURL(node)) {
          metaURLs.push(node);
          return;
        }
        visit(node.object, scope);
        if (node.computed) visit(node.property, scope);
        return;
      case 'Property':
        if (node.computed) visit(node.key, scope);
        if (node.shorthand) markShorthand(node.value);
        visit(node.value, scope);
        return;
      case 'AssignmentExpression':
        if (node.left.type === 'Identifier' && NAMED_EVALUATION_OPERATORS.has(node.operator)) {
          namedEvaluations.push({ id: node.left, value: node.right });
        }
        visit(node.left, scope);
        visit(node.right, scope);
        return;
      case 'NewExpression':
        if (node.callee.type === 'Identifier' && node.callee.name === 'URL' && node.arguments.length === 2
          && node.arguments[0].type === 'Literal' && node.arguments[0].string && isImportMetaURL(node.arguments[1])) {
          urlConstructions.push({ callee: node.callee, literal: node.arguments[0], meta: node.arguments[1] });
        }
        break;
      case 'ImportExpression':
        dynamicImports.push(node);
        break;
      case 'ImportDeclaration':
        for (const specifier of node.specifiers) scope.declare(specifier.local.name, 'import', specifier);
        return;
      case 'ExportNamedDeclaration':
        visit(node.declaration, scope);
        return;
      case 'ExportDefaultDeclaration':
        visit(node.declaration, scope);
        return;
      default:
        break;
    }
    for (const key of Object.keys(node)) {
      if (SKIPPED_KEYS.has(key)) continue;
      const value = node[key];
      if (Array.isArray(value)) {
        for (const child of value) if (child && typeof child.type === 'string') visit(child, scope);
      } else if (value && typeof value.type === 'string') {
        visit(value, scope);
      }
    }
  };

  visit(ast, moduleScope);
  for (const ref of refs) ref.binding = ref.scope.lookup(ref.node.name);
  return { moduleScope, refs, namedEvaluations, metaURLs, urlConstructions, dynamicImports, otherImportMeta };
}

// ---------------------------------------------------------------------------
// Linking
// ---------------------------------------------------------------------------

const AMBIGUOUS = { ambiguous: true };

function patternNames(pattern, names = []) {
  if (!pattern) return names;
  switch (pattern.type) {
    case 'Identifier': names.push(pattern.name); break;
    case 'ObjectExpression': for (const p of pattern.properties) patternNames(p.type === 'Property' ? p.value : p.argument, names); break;
    case 'ArrayExpression': for (const e of pattern.elements) patternNames(e, names); break;
    case 'AssignmentExpression':
    case 'AssignmentPattern': patternNames(pattern.left, names); break;
    case 'RestElement':
    case 'SpreadElement': patternNames(pattern.argument, names); break;
    case 'ParenthesizedExpression': patternNames(pattern.expression, names); break;
    default: break;
  }
  return names;
}

function isAnonymousFunctionDefinition(node) {
  if (!node) return false;
  if (node.type === 'ParenthesizedExpression') return isAnonymousFunctionDefinition(node.expression);
  return node.type === 'ArrowFunctionExpression'
    || ((node.type === 'FunctionExpression' || node.type === 'ClassExpression') && !node.id);
}

function identifierBase(file) {
  const base = file.split('/').pop().replace(/\.[^.]*$/, '').replace(/[^\w$]/g, '_');
  return /^\d/.test(base) ? `_${base}` : base || 'module';
}

function posixDirname(file) {
  const index = file.lastIndexOf('/');
  return index === -1 ? '' : file.slice(0, index);
}

function posixNormalize(file) {
  const out = [];
  for (const part of file.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..' && out.length && out[out.length - 1] !== '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function applyEdits(source, edits) {
  const sorted = edits
    .map((edit, index) => ({ ...edit, index }))
    .sort((a, b) => a.start - b.start || (a.end - a.start) - (b.end - b.start) || a.index - b.index);
  let out = '';
  let cursor = 0;
  for (const edit of sorted) {
    if (edit.start < cursor) throw new Error(`Internal bundler error: overlapping edits at ${edit.start}`);
    out += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return out + source.slice(cursor);
}

/**
 * Bundle the static module graph of `entries`.
 *
 * @param {object} options
 * @param {string[]} options.entries      absolute module files, in page order
 * @param {(file: string) => Promise<string>} options.load
 * @param {(specifier: string, importer: string) => Promise<string|null>} options.resolve
 *        absolute file, or null for a reference outside the build
 * @param {(file: string) => string} options.relative
 *        the module's path relative to the output root (POSIX)
 * @param {string} [options.bundleName]   file name of the bundle in the output root
 * @param {boolean} [options.renameAll]   rename every top-level binding (testing)
 * @returns {Promise<{files: {name: string, code: string, modules: string[], chunk: boolean}[],
 *   modules: string[], warnings: string[], renamed: number}>}
 */
export async function bundleModules({ entries, load, resolve, relative, bundleName = 'bundle.js', renameAll = false }) {
  const modules = new Map();
  const warnings = [];

  async function loadModule(file) {
    if (modules.has(file)) return modules.get(file);
    const record = { file, rel: relative(file) };
    modules.set(file, record);
    record.source = await load(file);
    let parsed;
    try {
      parsed = parseModule(record.source);
    } catch (error) {
      throw new Error(`Cannot bundle ${record.rel}: ${error.message}`);
    }
    if (parsed.topLevelAwait) throw new Error(`Cannot bundle ${record.rel}: top-level await is not supported by --bundle`);
    record.ast = parsed.ast;
    record.names = parsed.names;
    Object.assign(record, analyzeModule(parsed.ast));
    record.importBindings = new Map();
    record.localExports = new Map();
    record.indirectExports = new Map();
    record.starExports = [];
    record.staticDeps = [];
    record.dynamicTargets = new Map();

    const target = async (sourceNode) => {
      const resolved = await resolve(sourceNode.value, file);
      if (!resolved) throw new Error(`Cannot bundle ${record.rel}: "${sourceNode.value}" is outside the build`);
      if (!record.staticDeps.includes(resolved)) record.staticDeps.push(resolved);
      return resolved;
    };

    for (const statement of record.ast.body) {
      if (statement.type === 'ImportDeclaration') {
        const dependency = await target(statement.source);
        for (const specifier of statement.specifiers) {
          record.importBindings.set(specifier.local.name, { file: dependency, imported: specifier.imported });
        }
      } else if (statement.type === 'ExportAllDeclaration') {
        const dependency = await target(statement.source);
        if (statement.exported === null) record.starExports.push(dependency);
        else record.indirectExports.set(statement.exported, { file: dependency, imported: '*' });
      } else if (statement.type === 'ExportNamedDeclaration') {
        if (statement.declaration) {
          const declaration = statement.declaration;
          const names = declaration.type === 'VariableDeclaration'
            ? declaration.declarations.flatMap((d) => patternNames(d.id))
            : [declaration.id.name];
          for (const name of names) record.localExports.set(name, name);
        } else if (statement.source) {
          const dependency = await target(statement.source);
          for (const { local, exported } of statement.specifiers) record.indirectExports.set(exported, { file: dependency, imported: local });
        } else {
          for (const { local, exported } of statement.specifiers) record.localExports.set(exported, local);
        }
      } else if (statement.type === 'ExportDefaultDeclaration') {
        const declaration = statement.declaration;
        const named = statement.kind !== 'expression' && declaration.id;
        record.localExports.set('default', named ? declaration.id.name : '*default*');
        if (!named) record.syntheticDefault = true;
      }
    }

    for (const node of record.dynamicImports) {
      if (node.source.type === 'Literal' && node.source.string) {
        const resolved = await resolve(node.source.value, file);
        if (resolved) record.dynamicTargets.set(node, resolved);
        else warnings.push(`${record.rel}: import("${node.source.value}") is outside the build and stays a runtime import`);
      } else {
        warnings.push(`${record.rel}: import() with a computed specifier resolves against the bundle's URL`);
      }
    }
    if (record.otherImportMeta) warnings.push(`${record.rel}: import.meta other than import.meta.url refers to the bundle`);
    for (const ref of record.refs) {
      if (!ref.binding && ref.node.name === 'eval') throw new Error(`Cannot bundle ${record.rel}: eval() may read module-scoped names`);
    }

    for (const dependency of record.staticDeps) await loadModule(dependency);
    for (const dependency of record.dynamicTargets.values()) await loadModule(dependency);
    return record;
  }

  for (const entry of entries) await loadModule(entry);

  // Evaluation order: depth-first post-order over static imports.
  const order = (roots, skip) => {
    const visited = new Set();
    const result = [];
    const visit = (file) => {
      if (visited.has(file) || skip.has(file)) return;
      visited.add(file);
      for (const dependency of modules.get(file).staticDeps) visit(dependency);
      result.push(file);
    };
    for (const root of roots) visit(root);
    return result;
  };
  const mainOrder = order(entries, new Set());
  const mainSet = new Set(mainOrder);

  // Dynamic entry points outside the static graph, in discovery order.
  const dynamicEntries = [];
  const discover = (files) => {
    for (const file of files) {
      for (const targetFile of modules.get(file).dynamicTargets.values()) {
        if (!mainSet.has(targetFile) && !dynamicEntries.includes(targetFile)) dynamicEntries.push(targetFile);
      }
    }
  };
  discover(mainOrder);
  for (let i = 0; i < dynamicEntries.length; i++) discover(order([dynamicEntries[i]], mainSet));
  const dynamicOrder = order(dynamicEntries, mainSet);

  // Group dynamic modules by the set of dynamic entries that reach them.
  const reach = new Map(dynamicOrder.map((file) => [file, []]));
  dynamicEntries.forEach((entry, index) => {
    for (const file of order([entry], mainSet)) reach.get(file).push(index);
  });
  const mainFile = { name: bundleName, modules: mainOrder, chunk: false, needs: new Map(), exports: new Set(), dependencies: [] };
  const outputFiles = [mainFile];
  const fileOf = new Map(mainOrder.map((file) => [file, mainFile]));
  const chunksByKey = new Map();
  const usedNames = new Set([bundleName]);
  for (const file of dynamicOrder) {
    const key = reach.get(file).join(',');
    if (!chunksByKey.has(key)) {
      const base = identifierBase(modules.get(dynamicEntries[reach.get(file)[0]]).rel);
      let name = `chunk-${base}.js`;
      for (let n = 2; usedNames.has(name); n++) name = `chunk-${base}-${n}.js`;
      usedNames.add(name);
      const chunk = { name, modules: [], chunk: true, needs: new Map(), exports: new Set(), dependencies: [] };
      chunksByKey.set(key, chunk);
      outputFiles.push(chunk);
    }
    chunksByKey.get(key).modules.push(file);
    fileOf.set(file, chunksByKey.get(key));
  }
  for (const output of outputFiles) {
    if (!output.chunk) continue;
    for (const file of output.modules) {
      for (const dependency of modules.get(file).staticDeps) {
        const owner = fileOf.get(dependency);
        if (owner !== output && owner.chunk && !output.dependencies.includes(owner)) output.dependencies.push(owner);
      }
    }
    output.dependencies.sort((a, b) => outputFiles.indexOf(a) - outputFiles.indexOf(b));
  }

  // ----- Export resolution (ECMA-262 ResolveExport) -------------------------

  const resolveExport = (file, name, resolveSet = []) => {
    if (resolveSet.some(([f, n]) => f === file && n === name)) return null;
    resolveSet.push([file, name]);
    const record = modules.get(file);
    if (record.localExports.has(name)) {
      const local = record.localExports.get(name);
      const imported = record.importBindings.get(local);
      if (imported) {
        return imported.imported === '*' ? { namespace: imported.file } : resolveExport(imported.file, imported.imported, resolveSet);
      }
      return { file, local };
    }
    if (record.indirectExports.has(name)) {
      const indirect = record.indirectExports.get(name);
      return indirect.imported === '*' ? { namespace: indirect.file } : resolveExport(indirect.file, indirect.imported, resolveSet);
    }
    if (name === 'default') return null;
    let starResolution = null;
    for (const star of record.starExports) {
      const resolution = resolveExport(star, name, resolveSet);
      if (resolution === AMBIGUOUS) return AMBIGUOUS;
      if (!resolution) continue;
      if (!starResolution) starResolution = resolution;
      else if (starResolution.file !== resolution.file || starResolution.local !== resolution.local
        || starResolution.namespace !== resolution.namespace) return AMBIGUOUS;
    }
    return starResolution;
  };

  const exportedNames = (file, seen = new Set()) => {
    if (seen.has(file)) return [];
    seen.add(file);
    const record = modules.get(file);
    const names = [...record.localExports.keys(), ...record.indirectExports.keys()];
    for (const star of record.starExports) {
      for (const name of exportedNames(star, seen)) if (name !== 'default' && !names.includes(name)) names.push(name);
    }
    return names;
  };

  const resolveImportBinding = (record, local) => {
    const { file, imported } = record.importBindings.get(local);
    if (imported === '*') return { namespace: file };
    const resolution = resolveExport(file, imported);
    if (!resolution || resolution === AMBIGUOUS) {
      throw new Error(`Cannot bundle ${record.rel}: ${modules.get(file).rel} does not provide ${resolution ? 'an unambiguous' : 'an'} export named "${imported}"`);
    }
    return resolution;
  };

  // Namespace objects needed: namespace imports, `export * as`, dynamic
  // imports, and namespaces reachable through those namespaces' exports.
  const namespaceFiles = [];
  const needNamespace = (file) => {
    if (namespaceFiles.includes(file)) return;
    namespaceFiles.push(file);
    for (const name of exportedNames(file)) {
      const resolution = resolveExport(file, name);
      if (resolution && resolution !== AMBIGUOUS && resolution.namespace) needNamespace(resolution.namespace);
    }
  };
  const allOrder = [...mainOrder, ...dynamicOrder];
  for (const file of allOrder) {
    const record = modules.get(file);
    for (const local of record.importBindings.keys()) {
      const resolution = resolveImportBinding(record, local);
      if (resolution.namespace) needNamespace(resolution.namespace);
    }
    for (const targetFile of record.dynamicTargets.values()) needNamespace(targetFile);
  }
  if (entries.length === 1) {
    for (const name of exportedNames(entries[0])) {
      const resolution = resolveExport(entries[0], name);
      if (resolution && resolution !== AMBIGUOUS && resolution.namespace) needNamespace(resolution.namespace);
    }
  }

  // ----- Naming -------------------------------------------------------------

  const allNames = new Set(GENERATED_GLOBALS);
  const freeNames = new Set(GENERATED_GLOBALS);
  for (const file of allOrder) {
    const record = modules.get(file);
    for (const name of record.names) allNames.add(name);
    for (const ref of record.refs) if (!ref.binding) freeNames.add(ref.node.name);
  }
  const taken = new Set();
  const available = (name) => !taken.has(name) && !freeNames.has(name);
  const fresh = (base) => {
    for (let i = 1; ; i++) {
      const candidate = `${base}$${i}`;
      if (!taken.has(candidate) && !allNames.has(candidate)) {
        taken.add(candidate);
        return candidate;
      }
    }
  };
  const claim = (name, forceFresh) => {
    if (!forceFresh && available(name)) {
      taken.add(name);
      return name;
    }
    return fresh(name);
  };
  const claimSynthetic = (base) => (available(base) && !allNames.has(base) ? claim(base) : fresh(base));

  const finals = new Map();   // key(file, local) or key(file, '*ns*') -> name
  const owners = new Map();   // final name -> output file
  const key = (file, local) => `${file}\u0001${local}`;
  const splitKey = (finalKey) => {
    const index = finalKey.lastIndexOf('\u0001');
    return [finalKey.slice(0, index), finalKey.slice(index + 1)];
  };
  for (const file of allOrder) {
    const record = modules.get(file);
    for (const [name, binding] of record.moduleScope.vars) {
      if (binding.kind === 'import') continue;
      finals.set(key(file, name), claim(name, renameAll));
    }
    if (record.syntheticDefault) finals.set(key(file, '*default*'), claimSynthetic(`${identifierBase(record.rel)}_default`));
  }
  for (const file of namespaceFiles) finals.set(key(file, '*ns*'), claimSynthetic(`${identifierBase(modules.get(file).rel)}_namespace`));

  const resolutionKey = (resolution) => (resolution.namespace ? key(resolution.namespace, '*ns*') : key(resolution.file, resolution.local));

  // A rewritten import reference must not be captured by a local of the same
  // name between it and the module scope; rename the target if it would be.
  const captured = (scope, name, moduleScope) => {
    for (let s = scope; s && s !== moduleScope; s = s.parent) if (s.vars.has(name)) return true;
    return false;
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const file of allOrder) {
      const record = modules.get(file);
      for (const ref of record.refs) {
        if (!ref.binding || ref.binding.scope !== record.moduleScope || ref.binding.kind !== 'import') continue;
        const targetKey = resolutionKey(resolveImportBinding(record, ref.node.name));
        const name = finals.get(targetKey);
        if (captured(ref.scope, name, record.moduleScope)) {
          finals.set(targetKey, fresh(name.replace(/\$\d+$/, '')));
          changed = true;
        }
      }
    }
  }
  for (const [finalKey, name] of finals) owners.set(name, fileOf.get(splitKey(finalKey)[0]));
  let renamed = 0;
  for (const [finalKey, name] of finals) {
    const local = splitKey(finalKey)[1];
    if (!local.startsWith('*') && local !== name) renamed++;
  }

  // ----- Code generation ----------------------------------------------------

  const useName = (output, name) => {
    const owner = owners.get(name);
    if (owner && owner !== output) {
      output.needs.set(name, owner);
      owner.exports.add(name);
    }
    return name;
  };

  const namespaceCode = (output, file) => {
    const getters = exportedNames(file)
      .map((name) => [name, resolveExport(file, name)])
      .filter(([, resolution]) => resolution && resolution !== AMBIGUOUS)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([name, resolution]) => `get ${JSON.stringify(name)}() { return ${useName(output, finals.get(resolutionKey(resolution)))}; }`);
    return `const ${finals.get(key(file, '*ns*'))} = Object.freeze(Object.defineProperty({ __proto__: null${getters.map((g) => `, ${g}`).join('')} }, Symbol.toStringTag, { value: 'Module' }));`;
  };

  const generateModule = (output, record, prelude) => {
    const edits = [];
    const add = (start, end, text) => edits.push({ start, end, text });
    const skip = new Set();
    const finalOf = (name) => finals.get(key(record.file, name));
    if (record.source.startsWith('#!')) add(0, record.source.search(/[\n\r\u2028\u2029]|$/), '');

    const classDeclaration = (declaration) => {
      const name = finalOf(declaration.id.name);
      if (name === declaration.id.name) return;
      // Keep the class's own name (constructor.name) and inner binding.
      add(declaration.start, declaration.start, `let ${name} = `);
      add(declaration.end, declaration.end, ';');
      skip.add(declaration.id);
    };
    const functionDeclaration = (declaration) => {
      const name = finalOf(declaration.id.name);
      if (name !== declaration.id.name) prelude.push(`Object.defineProperty(${name}, 'name', { value: ${JSON.stringify(declaration.id.name)} });`);
    };
    const declaration = (node) => {
      if (node.type === 'ClassDeclaration') classDeclaration(node);
      else if (node.type === 'FunctionDeclaration') functionDeclaration(node);
    };

    for (const statement of record.ast.body) {
      switch (statement.type) {
        case 'ImportDeclaration':
        case 'ExportAllDeclaration':
          add(statement.start, statement.end, ';');
          break;
        case 'ExportNamedDeclaration':
          if (statement.declaration) {
            add(statement.start, statement.declaration.start, '');
            declaration(statement.declaration);
          } else {
            add(statement.start, statement.end, ';');
          }
          break;
        case 'ExportDefaultDeclaration': {
          const node = statement.declaration;
          const defaultName = record.syntheticDefault ? finalOf('*default*') : null;
          if (statement.kind === 'function' && node.id) {
            add(statement.start, node.start, '');
            functionDeclaration(node);
          } else if (statement.kind === 'function') {
            add(statement.start, node.start, '');
            add(node.paramsStart, node.paramsStart, ` ${defaultName}`);
            prelude.push(`Object.defineProperty(${defaultName}, 'name', { value: 'default' });`);
          } else if (statement.kind === 'class' && node.id) {
            add(statement.start, node.start, '');
            classDeclaration(node);
          } else if (statement.kind === 'class' || isAnonymousFunctionDefinition(node)) {
            add(statement.start, node.start, `const ${defaultName} = ({ default: (`);
            add(node.end, node.end, `) }).default${statement.end === node.end ? ';' : ''}`);
          } else {
            add(statement.start, node.start, `const ${defaultName} = `);
            if (statement.end === node.end) add(node.end, node.end, ';');
          }
          break;
        }
        default:
          declaration(statement);
      }
    }

    const referenceName = (ref) => {
      if (!ref.binding || ref.binding.scope !== record.moduleScope) return null;
      if (ref.binding.kind === 'import') {
        return useName(output, finals.get(resolutionKey(resolveImportBinding(record, ref.node.name))));
      }
      return finalOf(ref.node.name);
    };
    const renamedRefs = new Map();
    for (const ref of record.refs) {
      if (skip.has(ref.node)) continue;
      const name = referenceName(ref);
      if (name === null || name === ref.node.name) continue;
      renamedRefs.set(ref.node, name);
      const text = record.source.slice(ref.node.start, ref.node.end);
      add(ref.node.start, ref.node.end, ref.node.shorthand ? `${text}: ${name}` : name);
    }
    // Anonymous functions and classes take their name from the binding.
    for (const { id, value } of record.namedEvaluations) {
      if (!renamedRefs.has(id) || !isAnonymousFunctionDefinition(value)) continue;
      add(value.start, value.start, `({ ${id.name}: (`);
      add(value.end, value.end, `) }).${id.name}`);
    }

    // import.meta.url and new URL('asset', import.meta.url) keep pointing
    // at the module's original location, relative to the output root.
    const metaSkip = new Set();
    for (const { callee, literal, meta } of record.urlConstructions) {
      const calleeRef = record.refs.find((ref) => ref.node === callee);
      if (calleeRef?.binding) continue;
      const value = literal.value;
      if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/') || value.startsWith('#')) continue;
      const suffixIndex = value.search(/[?#]/);
      const pathname = suffixIndex === -1 ? value : value.slice(0, suffixIndex);
      const suffix = suffixIndex === -1 ? '' : value.slice(suffixIndex);
      add(literal.start, literal.end, JSON.stringify(`./${posixNormalize(`${posixDirname(record.rel)}/${pathname}`)}${suffix}`));
      metaSkip.add(meta);
    }
    for (const node of record.metaURLs) {
      if (metaSkip.has(node)) continue;
      add(node.start, node.end, `new URL(${JSON.stringify(`./${record.rel}`)}, import.meta.url).href`);
    }

    for (const [node, targetFile] of record.dynamicTargets) {
      const namespace = finals.get(key(targetFile, '*ns*'));
      const owner = fileOf.get(targetFile);
      if (owner === output || !owner.chunk) {
        add(node.start, node.end, `Promise.resolve(${useName(output, namespace)})`);
      } else {
        owner.exports.add(namespace);
        add(node.start, node.end, `import(${JSON.stringify(`./${owner.name}`)}).then((m) => m._$${namespace})`);
      }
    }

    return applyEdits(record.source, edits);
  };

  for (const output of outputFiles) {
    const prelude = [];
    const bodies = output.modules.map((file) => {
      const record = modules.get(file);
      return `// ${record.rel}\n${generateModule(output, record, prelude)}\n;`;
    });
    const namespaces = namespaceFiles.filter((file) => fileOf.get(file) === output).map((file) => namespaceCode(output, file));
    output.parts = { prelude, bodies, namespaces };
  }

  // Exports: the entry's own exports (one entry only) and what other files use.
  for (const output of outputFiles) {
    const lines = [];
    if (output === mainFile && entries.length === 1) {
      const specifiers = [];
      for (const name of exportedNames(entries[0])) {
        const resolution = resolveExport(entries[0], name);
        if (!resolution || resolution === AMBIGUOUS) continue;
        if (name.startsWith('_$')) throw new Error(`Cannot bundle: the entry export "${name}" uses the bundler's reserved prefix`);
        const local = finals.get(resolutionKey(resolution));
        specifiers.push(local === name ? local : `${local} as ${/^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(name) ? name : JSON.stringify(name)}`);
      }
      if (specifiers.length) lines.push(`export { ${specifiers.join(', ')} };`);
    }
    const internal = [...output.exports].sort();
    if (internal.length) lines.push(`export { ${internal.map((name) => `${name} as _$${name}`).join(', ')} };`);
    output.parts.exports = lines;
  }

  const files = outputFiles.map((output) => {
    const imports = [];
    const sources = [...new Set([...output.dependencies, ...output.needs.values()])]
      .sort((a, b) => outputFiles.indexOf(a) - outputFiles.indexOf(b));
    for (const owner of sources) {
      const names = [...output.needs].filter(([, o]) => o === owner).map(([name]) => name).sort();
      // One statement per line, so later passes can find each specifier.
      if (names.length) imports.push(`import { ${names.map((name) => `_$${name} as ${name}`).join(', ')} } from ${JSON.stringify(`./${owner.name}`)};`);
      else imports.push(`import ${JSON.stringify(`./${owner.name}`)};`);
    }
    const { prelude, bodies, namespaces, exports } = output.parts;
    const code = [...imports, ...namespaces, ...prelude, ...bodies, ...exports].join('\n') + '\n';
    return { name: output.name, code, modules: output.modules.map((file) => modules.get(file).rel), chunk: output.chunk };
  });

  return { files, modules: allOrder.map((file) => modules.get(file).rel), warnings, renamed };
}
