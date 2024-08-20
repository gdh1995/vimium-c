/// <reference path="../typings/base/index.d.ts" />
/// <reference path="../typings/lib/index.d.ts" />
/// <reference path="../typings/build/index.d.ts" />
/// <reference path="./base.d.ts" />

((): void => {
//#region types

interface FakeValue { c: 42, v: undefined }
type ComplexLiteral = /* regexp */ { c: 4, v: [source: string, flags: string] }
    | /* template */ { c: 0 | 1 | 2 | 3, v: string } | /* runtime value */ { c: 5, v: unknown }
interface BreakValue { c: BOOL, v: string | 0 }
type VarLiterals = "var1" | "bar" | "..." | "__proto__" | "new.target" | "debugger"
type VarNames = "Var1" | "globalThis" | "this" | "arguments" | "undefined"
type VarDict = { [index: number]: number } & { [name in VarNames]: unknown }
type Set2<K> = Pick<Set<K>, "has" | "add">
interface StackFrame { readonly v: VarDict, readonly c: readonly VarNames[], n: string | null, r: BOOL|Set2<VarNames> }
interface Isolate extends VarDict {}
interface Ref { readonly y: { [index: number]: number }, readonly i: number /** | ... */ }
interface Function2 { (this: unknown, ...args: unknown[]): unknown; __fn?: OpValues[O.fn] }

const enum T { block = 1, blockEnd = 2, semiColon = 4, prefix = 8, action = 16, group = 32, dict = 64, array = 128,
  groupEnd = 256, comma = 512, question = 1024, colon = 2048, fn = 4096, assign = 8192, or = 16384, and = 32768,
  bitOr = 65536, bitXor = 131072, bitAnd = 262144, compare1 = 524288, compare2 = 1048576,
  bitMove = 2097152, math1 = 4194304, math2 = 8388608, math3 = 16777216, unary = 33554432,
  rightUnary = 67108864, callOrAccess = 134217728, dot = 268435456, ref = 536870912, literal = 1073741824,
  END
}
interface TokenValues {
  [T.block]: "{", [T.blockEnd]: "}", [T.semiColon]: ";" | "\n", [T.prefix]: BlockPrefixes, [T.action]: LineActions,
  [T.group]: "(", [T.dict]: "{", [T.array]: "[", [T.groupEnd]: ")" | "}" | "]",
  [T.comma]: ",", [T.question]: "?", [T.fn]: "fn" | `fn ${string}` | "=>" | "(){",
  [T.assign]: "=" | "+=" | "-=" | "*=" | "/=" | "%=" | "<<=" | ">>=" | ">>>=" | "&=" | "&&=" | "^=" | "|=" | "||="
      | "**=" | "??=" | "of" | "in"
  [T.colon]: ":", [T.or]: "||" | "??", [T.and]: "&&", [T.bitOr]: "|", [T.bitXor]: "^", [T.bitAnd]: "&"
  [T.compare1]: "==" | "!=" | "===" | "!==", [T.compare2]: "<" | "<=" | ">" | ">=" | "in" | "instanceof"
  [T.bitMove]: "<<" | ">>" | ">>>", [T.math1]: "+" | "-", [T.math2]: "*" | "/" | "%", [T.math3]: "**"
  [T.unary]: "+" | "-" | "!" | "~" | "typeof" | "void" | "delete" | "++" | "--" | "`", [T.rightUnary]: "++" | "--"
  [T.callOrAccess]: "new" | "?." | "__call__", [T.dot]: "." | "?."
  [T.ref]: VarLiterals, [T.literal]: { v: string | number | boolean | null | undefined | ComplexLiteral | FakeValue }
}
interface BaseToken<K extends keyof TokenValues> { readonly t: K; readonly v: TokenValues[K];
    /** @deprecated */ readonly n?: unknown }
type SomeTokens<K extends keyof TokenValues> = K extends keyof TokenValues ? BaseToken<K> : never
type Token = SomeTokens<keyof TokenValues>
type ControlTokens = T.prefix | T.action | T.comma | T.question | T.colon | T.fn | T.assign | T.callOrAccess | T.dot
type BinaryTokens = T.or | T.and | T.bitOr | T.bitXor | T.bitAnd | T.compare1 | T.compare2 | T.bitMove
    | T.math1 | T.math2 | T.math3
type UnaryTokens = T.unary | T.rightUnary
type BeginGroupTokens = T.group | T.block | T.array | T.dict

type BlockPrefixes = "labelled" | "if" | "else if" | "else" | "do" | "while" | "for" | "try" | "catch" | "finally"
type VarActions = "var" | "let" | "const"
type LineActions = "return" | "break" | "continue" | "throw" | VarActions
interface BaseStatement<T extends "" | BlockPrefixes | LineActions | "arg"> {
  a: T
  c: T extends "if" | "else if" | "while" ? Op : T extends "catch" ? RefOp | null
      : T extends "for"
      ? FinalOp<O.comma, [FinalOp<O.stat, SomeStatements<VarActions | "">>, ...([Op, Op] | [])]> | RefAssignOp : null
  v: T extends "try" | "catch" | "finally" ? BaseOp<O.block>
      : T extends "var" | "let" | "arg" ? FinalOp<O.comma, (RefAssignOp | RefOp)[]>
      : T extends "const" ? FinalOp<O.comma, RefAssignOp[]> : Op
  l: string[] | null, __proto__?: null
}
type SomeStatements<T extends "" | BlockPrefixes | LineActions | "arg"> = T extends string ? BaseStatement<T> : never
type Statement = SomeStatements<"" | BlockPrefixes | LineActions>

type NullableVarList = readonly VarNames[] | 0
const enum O { block, statGroup, stat, comma, pair, fn, assign, ifElse, binary, unary, call, access, composed, token }
interface OpValues {
  [O.block]: { /** consts */ c: NullableVarList, /** lets */ l: NullableVarList, x: Statement[] }
  [O.statGroup]: Statement[]; [O.stat]: Statement; [O.comma]: Op[]
  [O.pair]: { k: RefOp | BaseOp<O.comma>, v: Op, p: string }
  [O.fn]: { t: TokenValues[T.fn], a: (RefOp|RefAssignOp)[], b: Op, v: NullableVarList, n: VarLiterals | null,
      p: BaseOp<O.pair> | null, r: VarNames[] | null },
  [O.composed]: { b: "[" | "{", v: Op[] },
  [O.assign]: { y: Op, x: Op, a: TokenValues[T.assign] }; [O.ifElse]: { c: Op, l: Op, r: Op }
  [O.binary]: { l: Op, r: Op, o: TokenValues[BinaryTokens] }; [O.unary]: { x: Op, o: SomeTokens<T.unary | T.rightUnary>}
  [O.call]: { n: boolean, o: boolean, f: Op, a: Op[] }
  [O.access]: { y: Op, i: Op, d: "." | "?." | "[" | "?.[" }
  [O.token]: TokenValues[T.ref | T.literal]
}
type ReadonlyOpVal<T> = T extends any[] ? T : T extends object ? { readonly [P in keyof T]: T[P] } : T
interface BaseOp<K extends keyof OpValues> { readonly o: K; /** @deprecated */ readonly n?: unknown
    readonly v: ReadonlyOpVal<OpValues[K]> }
type SomeOps<K extends keyof OpValues> = K extends keyof OpValues ? BaseOp<K> : never
type Op = SomeOps<keyof OpValues>
interface RefOp extends BaseOp<O.token> { readonly v: Extract<OpValues[O.token], string> }
interface LiteralOp extends BaseOp<O.token> { readonly v: Exclude<OpValues[O.token], string> }
interface RefAssignOp extends BaseOp<O.assign> { v: OpValues[O.assign] & { y: RefOp } }
interface TemplateOp extends BaseOp<O.unary> { readonly v: { x: BaseOp<O.composed>, o: BaseToken<T.unary> } }
interface FinalOp<O extends keyof OpValues, V extends OpValues[O]> extends BaseOp<O> { readonly v: ReadonlyOpVal<V> }

//#endregion types

//#region configurations

const NDEBUG = Build.NDEBUG
const HasReflect: boolean = !(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinEnsured$Reflect$$apply$And$$construct
    || typeof VApi === "object" && !!(VApi && VApi.z)
        && VApi.z.v! > BrowserVer.MinEnsured$Reflect$$apply$And$$construct - 1
    || typeof Reflect !== "undefined" && !!Reflect && !!Reflect.apply && !!Reflect.construct
const DefaultIsolate = (typeof globalThis !== "undefined" ? globalThis : window) as unknown as Isolate
const DefaultFunction = (DefaultIsolate as Dict<unknown>)["Function"] as FunctionConstructor
let NativeFunctionCtor: FunctionConstructor | false | null = !Build.NDEBUG && typeof VimiumInjector === "undefined"
    ? null : JSON.stringify((typeof browser === "object" && browser as never || chrome
      ).runtime.getManifest().content_security_policy).includes("'unsafe-eval'") ? null : false
let isolate_: Isolate = DefaultIsolate, locals_: StackFrame[] = [], stackDepth_ = 0
let g_exc: { g: Isolate, l: StackFrame[], d: number } | null = null
let _collect: { (op: SomeOps<O.block | O.stat | O.fn>, enter: BOOL): void; (o: RefOp, v: VarNames): void } | null = null

//#endregion configurations

//#region constant values of syntax

const kTokenNames = Build.NDEBUG ? [] as never
    : ("block, blockEnd, semiColon, prefix, action, group, dict, array, groupEnd, comma, question, colon, fn, assign"
    + ", or, and, bitOr, bitXor, bitAnd, compare1, compare2, bitMove, math1, math2, math3"
    + ", unary, rightUnary, callOrAccess, dot, ref, literal").split(", ")
const kOpNames = Build.NDEBUG ? [] as never
  : "block, statGroup, stat, comma, pair, fn, assign, ifElse, binary, unary, call, access, composed, token".split(", ")

const kTokenEnums: SafeDict<keyof TokenValues> = ((): SafeDict<keyof TokenValues> => {
  const arr: string[] = [
    "{", "}", ";", "if else try catch finally do while for", "return break continue throw var let const",
    "(", "", "[", ") ]", ",", "?", ":", "=>", "of = += -= *= /= %= <<= >>= >>>= &= &&= ^= |= ||= **= ??=",
    "|| ??", "&&", "|", "^", "&", "== != === !==", "< <= > >= in instanceof", "<< >> >>>", "", "* / %", "**",
    "! ~ typeof void delete", "", "new", ". ?."
  ], dict = Object.create<keyof TokenValues>(null)
  let ind = 0, val = 1, token: string
  if (!(Build.NDEBUG || 1 << arr.length === T.ref)) { alert(`Assert error: wrong fields in kTokenEnums`) }
  for (; ind < arr.length; ind++, val <<= 1) {
    for (token of arr[ind] ? arr[ind].split(" ") : []) { dict[token] = val }
  }
  return dict
})()
const kLiterals: ReadonlySafeDict<boolean | null> = { __proto__: null as never, true: true, false: false, null: null }
const kUnsupportedTokens: SafeEnum = { __proto__: null as never, switch: 1, yield: 1, await: 1, async: 1 }
const kVarAction = "var,let,const", kProto = "__proto__"

//#endregion constant values of syntax

//#region helper functions

const kFakeValue: FakeValue = { c: 42, v: undefined }
const kBreakBlock: BreakValue = { c: 0, v: 0 }
const kUnknown = "(...)"
// `document.all == null` returns `true`
const isLooselyNull = (obj: unknown): obj is null | undefined => obj === null || obj === undefined
const safer_d = <T> (obj: T): T extends Array<any> ? unknown : T =>
    (typeof obj === "object" && obj && !Array.isArray(obj)
      ? ("__proto__" in obj && ((obj as any).__proto__ = null), obj) : obj) as any
const resetRe_ = (): true => (<RegExpOne> /a?/).test("") as true
const objEntries = !(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinEnsuredES$Object$$values$and$$entries ? Object.entries! as never
    : Object.entries as unknown as undefined || (<T extends string> (object: object): [T, unknown][] => {
  const entries: ReturnType<ObjectConstructor["entries"]> = []
  for (const name of Object.keys(object)) { entries.push([name, (object as Dict<unknown>)[name]]) }
  return entries as [T, unknown][]
})
const throwSyntax = (error: string): never => { throw new SyntaxError(error) }
const ValueProperty = (value: unknown, writable: boolean, enumerable: boolean, config: boolean): PropertyDescriptor =>
    ({ value, writable, enumerable, configurable: config })
const globalVarAccessor = {
  get globalThis (): unknown { return "globalThis" in isolate_ ? isolate_["globalThis"] as Isolate : isolate_ },
  set globalThis (value: unknown) {
    Object.defineProperty(isolate_, "globalThis", ValueProperty(value, true, false, true)) },
  get __proto__ (): unknown {
    return VarName(kProto) in isolate_ ? isolate_[VarName(kProto)] as Isolate
        : isolate_[kProto as unknown as VarNames] },
  set __proto__ (value: unknown) {
    Object.defineProperty(isolate_, kProto, ValueProperty(value, true, true, false)) },
  get eval (): unknown { return innerEval_ },
  set eval (_value: unknown) { /* empty */ }
} as unknown as Ref["y"]
const VarName = (name: VarLiterals): VarNames => (name !== kProto ? name : name + ".") as VarNames
const Set_add = function <T> (this: T[] & Set<T>, i: T) { this.indexOf(i) >= 0 || this.push(i); return this }
const Set_has = function <T> (this: T[] & Set<T>, i: T) { return this.indexOf(i) >= 0 }
const kHasSet = !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Array$$From
    && Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || !!Array.from
const Set2 = kHasSet ? <T> (): Set2<T> => new Set!<T>() : (<T> (): Set2<T> => {
  const a = [] as T[] as T[] & Set<T>
  a.add = Set_add, a.has = Set_has
  return a
}) as never

//#endregion helper functions

//#region tokenize

const Token = <T extends keyof TokenValues> (token: T, value: TokenValues[T]): SomeTokens<T> => {
  return (NDEBUG ? { t: token, v: value } : { n: kTokenNames[Math.log2(token)],
    v: safer_d(value satisfies string | { v: unknown }), t: token, __proto__: null }) as SomeTokens<T>
}

const splitTokens = (expression_: string): Token[] => {
  const escapedStrRe = <RegExpG & RegExpSearchable<1>> /\\(x..|u\{.*?\}|u.{4}|[0-7]{3}|[^])/g
  const onHex = (_: string, hex: string, codePoint: number): string =>
        hex.length < 2 ? (codePoint = "\n0bfnrtv".indexOf(hex),
          codePoint < 0 ? hex : !codePoint ? "" : ' \0\b\f\n\r\t\v'[codePoint])
        : (codePoint = hex < "8" ? parseInt(hex, 8) : parseInt(hex[1] === "{" ? hex.slice(2, -1) : hex.slice(1), 16),
           codePoint < 0x10000)
        ? String.fromCharCode(codePoint)
        : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$String$$fromCodePoint
        ? String.fromCharCode(0xD800 + ((codePoint >> 10) - 64 & 0x3FF), 0xDC00 + (codePoint & 0x3FF))
        : String.fromCodePoint!(codePoint)
  const peek = (s: string): boolean => expression_.substr(pos_, s.length) === s
  const expect = (re: RegExp): boolean => {
    const reMatch = (<RegExpOne> re).exec(expression_.slice(pos_))
    return reMatch ? (last_ = reMatch[0], pos_ += last_.length, true) : false
  }
  const tokens_: Token[] = [], curlyBraces: BOOL[] = [0]
  let pos_ = 0, last_ = "", before = T.semiColon, allowRegexp = true, spaceExec: RegExpExecArray | null
  while (pos_ < expression_.length) {
    if (expect(/^\s+/)) { // not update `before` here
      before & (T.blockEnd | T.action | T.groupEnd | T.rightUnary | T.ref | T.literal)
          && last_.includes("\n") && tokens_.push(Token(T.semiColon, "\n"))
      continue
    }
    if (expect(/^\/\/[^\n]*|^\/\*[^]*?\*\//)) { continue }
    if (allowRegexp && expect(/^\/(?:[^\\\/[\n]|\[(?:[^\\\]\n]|\\[^\n])*\]|\\[^\n])*\/[a-z]{0,16}(?![\w$])/)) {
      const ind = last_.lastIndexOf("/")
      tokens_.push(Token(T.literal!, { v: { c: 4, v: [last_.slice(1, ind), last_.slice(ind + 1)] } }))
    } else if (peek("...")) {
      tokens_.push(Token(T.ref, "..."), Token(T.comma, ",")); pos_ += 3
    } else if (expect(curlyBraces[curlyBraces.length - 1] ? /^[\}`]/ : /^`/)) {
      if (!expect(/^(?:[^`\\$]|\\[^]|\$(?!\{))*(?:`|\$\{)/) && !Build.NDEBUG) {
        throwSyntax("Unexpected template string")
      }
      const isBegin = expression_[pos_ - last_.length - 1] === "`", isEnd = last_.endsWith("`")
      isBegin ? tokens_.push(Token(T.unary, "`"), Token(T.array, "["))
          : (tokens_.push(Token(T.groupEnd, ")"), Token(T.comma, ",")), curlyBraces.pop())
      tokens_.push(Token(T.literal, { v: { c: ((isBegin ? 1 : 0) + (isEnd ? 2 : 0)) as 0 | 1 | 2 | 3,
        v: last_.slice(0, isEnd ? -1 : -2).replace(escapedStrRe, onHex),
      } }), Token(T.comma, ","))
      !isEnd ? (tokens_.push(Token(T.group, "(")), curlyBraces.push(1)) : tokens_.push(Token(T.groupEnd, "]"))
    } else if (expect(
        /^(=>|[!=]=?=?|[+\-*\/%^]=|&&?=?|\|\|?=?|>>?>?=?|<<?=?|\*\*=?|\?\?=?|\??\.(?!\d)|[,?:*\/%^~\{\}\[\]()])/)) {
      last_ === "{" ? curlyBraces.push(0) : last_ === "}" ? curlyBraces.pop() : 0
      tokens_.push(Token(kTokenEnums[last_] as T.or, last_ as "||"))
    } else if (expect(/^\+\+?|^--?/)) {
      tokens_.push(Token(last_.length === 2 ? before & (T.groupEnd | T.ref)
            && tokens_[tokens_.length - 1].v !== "\n" ? T.rightUnary : T.unary
          : before & (T.blockEnd | T.groupEnd | T.rightUnary | T.ref | T.literal) ? T.math1
          : T.unary, last_ as "++" | "+" | "--" | "-"))
    } else if (expect(/^;\s*/)) {
      tokens_.push(Token(T.semiColon, ";"))
    } else if (expect(/^[1-9][\d_]*n|^0n/)) {
      tokens_.push(Token(T.literal, { v: (DefaultIsolate as any).BigInt(last_.slice(0, -1)) }))
    } else if (expect(/^0(?:[boBO]\d[\d_]*|[xX][\dA-Fa-f][\dA-F_a-f]*|[0-7]+)/)) {
      last_ = last_[1] < "8" ? "0o" + last_ : last_.toLowerCase()
      tokens_.push(Token(T.literal, { v: parseInt(last_.slice(2).replace(<RegExpG> /_/g, "")
          , last_[1] === "x" ? 16 : last_[1] === "o" ? 8 : 2) }))
    } else if (expect(/^(?:(?:0|[1-9][\d_]*)(?:\.\d[\d_]*|\.|)|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?/)) {
      tokens_.push(Token(T.literal, { v: parseFloat(last_.replace(<RegExpG> /_/g, "")) }))
    } else if (expect(peek("'") ? /^'([^'\\\n]|\\[^])*'/ : /^"([^"\\\n]|\\[^])*"/)) {
      last_ = last_[0] === '"' ? last_ : `"${last_.slice(1, -1)}"`
      tokens_.push(Token(T.literal, { v: last_.slice(1, -1).replace(escapedStrRe, onHex) }))
    } else if (expect(/^(?:[$A-Z_a-z\x80-\uffff]|\\u(?:\{.*?\}|.{4}))(?:[\w$\x80-\uffff]|\\u(?:\{.*?\}|.{4}))*/)) {
      if (spaceExec = (<RegExpOne> /\s/).exec(last_)) {
        pos_ -= last_.length - spaceExec.index; last_ = last_.slice(0, spaceExec.index)
      }
      last_.includes("\\") && (last_ = last_.replace(<RegExpG & RegExpSearchable<1>> /\\(u\{.*?\}|u.{4})/g, onHex))
      before === T.dot || last_ in kLiterals
      ? tokens_.push(Token(T.literal, { v: before === T.dot ? last_ : kLiterals[last_] }))
      : last_ in kUnsupportedTokens ? throwSyntax("Unsupported identifier: " + last_)
      : before === T.prefix && last_ === "if" && tokens_[tokens_.length - 1].v === "else"
      ? (tokens_[tokens_.length - 1].v as TokenValues[T.prefix]) = "else if"
      : tokens_.push(last_ === "function" ? Token(T.fn, "fn") : Token(kTokenEnums[last_]! || T.ref, last_ as never))
    } else {
      const arr = expression_.slice(0, pos_).split("\n")
      throwSyntax(`Unexpected identifier in ${arr.length}:${arr[arr.length - 1].length + 1
          } {{ ${ expression_.slice(Math.max(0, pos_ - 6), pos_).trimLeft()
          }\u2503${expression_.substr(pos_, 6).trimRight()} }}`)
    }
    const token = tokens_[tokens_.length - 1]
    before = token.t
    allowRegexp = before >= T.dot ? false : before >= T.comma ? token.v !== "++" && token.v !== "--"
        : !"])".includes(token.v as string)
  }
  return tokens_
}

//#endregion tokenize

//#region parse syntax tree

const Op = <O extends keyof OpValues, V extends OpValues[O]> (op: O, value: V): FinalOp<O, V> => {
  return (NDEBUG ? { o: op, v: value } : { n: op === O.composed ? (value as OpValues[O.composed]).b === "{"
        ? "dict" : "array" : kOpNames[op], v: safer_d(value), o: op, __proto__: null
      }) as FinalOp<O, V>
}

const Stat = <T extends "" | BlockPrefixes | LineActions | "arg"> (
    stat: T, clause: SomeStatements<T>["c"], value: SomeStatements<T>["v"]): SomeStatements<T> => {
  return (NDEBUG ? { a: stat as "if", c: clause!, v: value, l: null } : { a: stat as "if", c: clause!,
      v: value, l: null, __proto__: null }) satisfies SomeStatements<"if"> as SomeStatements<T>
}

const prepareBlockBodyToRun = (pureVars: VarNames[], block: OpValues[O.block]): void => {
  const lets: VarNames[] = [], consts: VarNames[] = []
  for (const statement of block.x) {
    const action = statement.a, lift = action === "var", isLet = action === "let"
    if (lift || isLet || action === "const") {
      for (const varOp of (statement satisfies SomeStatements<VarActions>).v.v) {
        (lift ? pureVars : isLet ? lets : consts).push(ToVarName(varOp))
      }
    } else if (statement.v.o === O.fn && statement.v.v.t === "fn") {
      lets.push(VarName(statement.v.v.n!))
    } else {
      statement.v.o === O.block ? prepareBlockBodyToRun(pureVars, statement.v.v)
      : statement.v.o === O.statGroup && prepareBlockBodyToRun(pureVars, { c: 0, l: 0, x: statement.v.v })
      if (action === "for") {
        const stat2 = statement.c.o === O.comma ? statement.c.v[0] : statement.c
        for (const varOp of stat2.o === O.stat && stat2.v.a === "var" ? stat2.v.v.v : []) {
          pureVars.push(ToVarName(varOp))
        }
      }
    }
  }
  block.l = lets.length > 0 ? lets : 0
  block.c = consts.length > 0 ? consts : 0
}

const parseTree = (tokens_: readonly Token[], inNewFunc: boolean | null | undefined): Op => {
  type CtxTokens = ControlTokens | BinaryTokens | UnaryTokens | BeginGroupTokens
  const ctx_: SomeTokens<CtxTokens>[] = [ Token(T.block, "{") ]
  const values_: Op[] = [Op(O.block, { c: 0, l: 0, x: null as never })]
  const extractMemberPrefix = (): "get" | "set" | "" => {
    const mayPrefix = values_[values_.length - 1] as BaseOp<O.comma> | RefOp, isToken = mayPrefix.o === O.token
    return isToken && (ctx_[ctx_.length - 1].t === T.dict || values_[values_.length - 2].o !== O.composed)
        ? (values_.length--, mayPrefix.v as "get" | "set") : ""
  }
  const consumeUntil = (except: number): void => { while (!(ctx_[ctx_.length - 1].t & except)) { consume() } }
  const tryInsertPrefix = (toInsert: BlockPrefixes, offset: number): SomeOps<O.statGroup | O.stat> | null | false => {
    const id = ",else,else if,catch,finally,while,".indexOf("," + toInsert + ",")
    if (id < 0) { return false }
    const head = id < 13 ? "if" : id < 27 ? "try" : "do"
    const unexpected = id < 13 ? "else" : toInsert === "catch" ? "catch,finally" : toInsert
    let matched: SomeOps<O.statGroup | O.stat> | null | false = false
    for (let it: Op | null = values_[values_.length - offset], parent: BaseOp<O.stat> | null = null
          ; it && it.o <= O.stat && it.o >= O.statGroup; ) {
      if (it.o === O.stat) {
        if (it.v.a === head) { matched = parent }
        parent = it, it = it.v.v
      } else if (it.o === O.statGroup) {
        if (it.v[0].a === head && !unexpected.includes(it.v[it.v.length - 1].a)) { matched = it }
        parent = Op(O.stat, it.v[it.v.length - 1]), it = parent.v.v
      }
    }
    return matched
  }
  const consume = (): void => {
    const val = values_.pop()!
    const top = ctx_.pop()!
    switch (top.t) {
    case T.block: /* T.block: */ {
      values_.push(val)
      let i = values_.length
      while (values_[--i].o !== O.block || (values_[i] as BaseOp<O.block>).v.x) { /* empty */ }
      (values_[i].v as OpValues[O.block]).x = values_.splice(i + 1, values_.length - (i + 1))
          .map<Statement>(i => i.o === O.stat ? i.v : Stat("", null, i))
      } break
    case T.prefix: /* T.prefix: */ {
      const clause = values_[values_.length - 1].o !== O.block ? values_.pop()! : null
      if (clause && top.v === "catch" && clause.o !== O.token) { throwSyntax("Unsupported destructuring") }
      values_.length--
      const matched = ctx_[ctx_.length - 1].t & ~(T.prefix | T.group) ? tryInsertPrefix(top.v, 1) : false
      let stat: Statement = matched !== false && top.v === "while"
          ? Stat(top.v, val, Op(O.comma, [])) : Stat(top.v as "if" | "labelled", clause!, val)
      if (matched) {
        matched.o !== O.stat ? matched.v.push(stat)
        : (matched.v.v as BaseOp<O.statGroup>) = Op(O.statGroup, [(matched.v.v as BaseOp<O.stat>).v, stat])
      } else {
        if (stat.a !== "labelled") { /* empty */ }
        else if (val.o !== O.stat) { stat.l = [(clause as RefOp).v], stat.c = null }
        else { stat = val.v; (stat.l || ((stat.l as string[] | null) = [])).push((clause as RefOp).v) }
        values_.push(Op(O.stat, stat))
      }
      } break
    case T.action: /* T.action: */
      values_.push(Op(O.stat, Stat(top.v as "throw", null, val.o !== O.comma && kVarAction.includes(top.v)
          ? Op(O.comma, [val]) : val)))
      break
    case T.group: case T.array: case T.dict: /* T.group | T.array | T.dict: */ {
      const newTop = ctx_[ctx_.length - 1]
      if (newTop.t === T.callOrAccess && (top.t === T.group || newTop.v !== "new")) {
        ctx_.length--
        top.t === T.group ? values_.push(Op(O.call, {
            n: newTop.v === "new" || (ctx_[ctx_.length - 1].t === T.callOrAccess && (ctx_.length--, true)),
            o: newTop.v === "?.", f: values_.pop()! as BaseOp<O.access>, a: val.o === O.comma ? val.v : [val] }))
        : values_.push(Op(O.access, { y: values_.pop()!, i: val, d: newTop.v === "?." ? "?.[" : "[" }))
      } else if (top.t !== T.group) {
        let arr = val.o === O.comma ? val.v : [val]
        top.t === T.dict ? (values_[values_.length - 1].v as Writable<OpValues[O.composed]>).v = arr
        : values_.push(Op(O.composed, { b: top.v, v: arr }))
      } else if (newTop.t === T.prefix && newTop.v === "for") {
        if (values_[values_.length - 1].o === O.stat) {
          const cond = values_.pop() as FinalOp<O.stat, BaseStatement<"">>
          values_[values_.length - 1] = Op(O.comma, [ (values_[values_.length - 1] as BaseOp<O.stat>), cond.v.v, val ])
        } else {
          values_.push(val.o === O.stat ? Op(O.comma, [ val ]) : val)
        }
      } else {
        values_.push(val)
      }
      } break
    case T.comma: /* T.comma: */ {
      const prevVal = values_[values_.length - 1]
      prevVal.o === O.comma ? prevVal.v.push(val) : values_.push(Op(O.comma, [values_.pop()!, val]))
      } break
    case T.question: if (!Build.NDEBUG) { throwSyntax(`Unexpected "?"`) } break
    case T.colon: /* T.colon: */
      if (!Build.NDEBUG && ctx_[ctx_.length - 1].t & ~((T.comma << 1) - 1 | T.question | T.colon)) {
        throwSyntax(`Unexpected op token #${ctx_[ctx_.length - 1].t} before ":"`)
      }
      if (ctx_[ctx_.length - 1].t & (T.dict | T.comma)) {
        let keyOp = values_.pop()! as SomeOps<O.token | O.composed>
        !Build.NDEBUG && (keyOp.o !== O.token && keyOp.o !== O.composed)
            && throwSyntax('Unexpected ":" in an object literal')
        const prefix = extractMemberPrefix();
        values_.push(Op(O.pair, {k: keyOp.o === O.token ? keyOp as RefOp : Op(O.comma, keyOp.v.v), v: val, p: prefix}))
        val.o === O.fn && val.v.t === "(){"
            && ((val.v as Writable<typeof val.v>).p = values_[values_.length - 1] as BaseOp<O.pair>)
      } else {
        ctx_.length--
        const thenVal = values_.pop()!
        values_.push(Op(O.ifElse, { c: values_.pop()!, l: thenVal, r: val }))
      }
      break
    case T.fn: /* T.fn: */ {
      const rawArgs = values_.pop()!
      const args = (rawArgs.o === O.comma ? rawArgs.v : [rawArgs]).map((i): RefOp | RefAssignOp =>
          i.o === O.token || i.o === O.assign && i.v.y.o === O.token ? i as RefOp | RefAssignOp
          : throwSyntax(`Unsupported destructuring parameters`))
      const isFn = top.v.startsWith("fn "), type = isFn && ctx_[ctx_.length - 1].t === T.block ? "fn" : top.v
      const name = isFn ? top.v.slice(3) as VarLiterals : null
      values_.push(Op(O.fn, { a: args, t: type, n: name, v: 0, b: val, p: null, r: null }))
      } break
    case T.assign: /* T.assign: */ {
      const y = values_.pop()!
      if (y.o === O.composed) { throwSyntax("Unsupported destructuring assignment") }
      values_.push(Op(O.assign, { a: top.v, y, x: val }))
      } break
    case T.unary: case T.rightUnary: /* T.unary: T.rightUnary: */ values_.push(Op(O.unary, { o: top, x: val })); break
    case T.callOrAccess: /* T.callOrAccess: */
      if (!Build.NDEBUG && top.v !== "new") { throwSyntax(`Unexpected token: '${top.v}'`) }
      values_.push(val.o === O.call ? ((val.v as Writable<typeof val.v>).n = true, val)
      : Op(O.call, { n: true, o: false, f: val, a: [] }))
      break
    case T.dot: /* T.dot: */ values_.push(Op(O.access, { y: values_.pop()!, i: val, d: top.v })); break
    default:
      values_.push(Op(O.binary, { o: (top satisfies SomeTokens<BinaryTokens>).v, l: values_.pop()!, r: val }))
      break
    }
  }
  for (let pos_ = 0, before = T.block, cur: Token, type: T, topIsDict = false;
      pos_ < tokens_.length; before = type, pos_++) {
    cur = tokens_[pos_], type = cur.t
    if (topIsDict && type & (T.prefix | T.action | T.fn | T.literal)
        && !(before === T.comma && tokens_[pos_ - 2].t === T.ref && tokens_[pos_ - 2].v === "...")) {
      (cur.v as VarLiterals) = (cur.t === T.literal ? cur.v.v + ""
          : (cur as SomeTokens<T.prefix | T.action | T.fn>).v satisfies string) as "var1"
      type = (cur.t as T) = T.ref, Build.NDEBUG || ((cur.n as string) = "ref")
    }
    const typeCur = cur.t
    switch (typeCur) {
    case T.block: case T.dict: /* T.block | T.dict: */
      topIsDict = !(before & (T.block | T.blockEnd | T.semiColon | T.prefix | T.groupEnd | T.fn | T.ref | T.literal))
      values_.push(topIsDict ? Op(O.composed, { b: "{", v: null as never }) : Op(O.block, { c:0, l:0, x:<never> null }))
      type = (cur.t as T) = topIsDict ? T.dict : T.block,
      Build.NDEBUG || ((cur.n as string) = topIsDict ? "dict" : "block")
      ctx_.push(Token(type, "{"))
      break
    case T.blockEnd: case T.groupEnd: /* T.blockEnd | T.groupEnd: */
      before & (T.group | T.array | T.dict | (type === T.groupEnd ? T.semiColon : 0))
          ? values_.push(Op(O.comma, [])) : before === T.comma ? ctx_.length--
          : before === T.ref && (values_[values_.length - 1] as RefOp).v === "debugger"
          ? (values_[values_.length - 1] as Writable<BaseOp<O.token>>).v = { v: "debugger" } : 0
      consumeUntil(cur.v === ")" ? T.group : cur.v === "]" ? T.array : T.block | T.dict)
      if (type === T.blockEnd && ctx_[ctx_.length - 1].t === T.dict) {
        type = (cur.t as T) = T.groupEnd, Build.NDEBUG || ((cur.n as string) = "groupEnd")
      }
      consume()
      topIsDict = ctx_[ctx_.length - (ctx_[ctx_.length - 1].t === T.comma ? 2 : 1)].t === T.dict
      type === T.blockEnd && values_[values_.length - 1].o === O.block && consumeUntil(~(T.prefix | T.action | T.fn))
      break
    case T.semiColon: /* T.semiColon: */ {
      const semiColon = cur.v === ";"
      // here doesn't check `T.group | T.array`
      const mayBreak: boolean = !semiColon && pos_ + 1 < tokens_.length && (before === T.action
            || !!(tokens_[pos_ + 1].t & (T.ref | T.literal | T.fn | T.prefix | T.action | T.unary | T.block))
            || values_[values_.length - 1].o === O.fn && ((values_[values_.length - 1] as BaseOp<O.fn>).v.t === "=>"
                    ? tokens_[pos_ + 1].t !== T.comma : !!(ctx_[ctx_.length - 1].t & (T.block | T.prefix)))
                && (tokens_[pos_ + 1].t === T.math1 && ((tokens_[pos_ + 1].t as T) = T.unary,
                      Build.NDEBUG || ((tokens_[pos_ + 1].n as string) = "unary")),
                    true))
      semiColon ? consumeUntil(T.group | T.block) : mayBreak ? consumeUntil(T.comma - 1 | T.question) : 0
      const prev = mayBreak ? ctx_[ctx_.length - 1] : null
      if (semiColon || prev && (prev.t === T.block ? true
          : prev.t === T.action ? before !== T.action || !kVarAction.includes(prev.v) // "throw\n" is a syntax error
          : prev.t === T.prefix && ("do,else".includes(prev.v) || values_[values_.length - 2].o !== O.block
            || prev.v === "while" && tryInsertPrefix(prev.v, 3) !== false))) {
        semiColon || consumeUntil(T.group | T.block)
        const val = values_[values_.length - 1]
        if (val.o === O.token && val.v === "debugger") { (val as Writable<typeof val>).v = { v: val.v } }
        1 << val.o & (ctx_[ctx_.length - 1].t === T.group ? 1 << O.stat : 1 << O.block | 1 << O.statGroup | 1 << O.stat)
        || values_.push(Op(O.stat, Stat("", null, before & (T.block | T.semiColon | T.group)
            || before === T.blockEnd && (val.o !== O.fn || val.v.t < "f") ? Op(O.comma, []) : values_.pop()!)))
      } else { // skip "\n"
        type = before, Build.NDEBUG || ((cur.n as string) = "not-SemiColon")
      }
      } break
    case T.prefix: /* T.prefix: */
      consumeUntil(T.prefix | T.group | T.block)
      values_.push(Op(O.block, { c: 0, l: 0, x: null as never })) // to recognize soft-semi easier
      ctx_.push(cur)
      break
    case T.action: /* T.action: */
      (pos_ > tokens_.length - 2 || tokens_[pos_ + 1].t & (T.blockEnd | T.semiColon))
          && "return,break,continue".includes(cur.v) && values_.push(Op(O.comma, []))
      consumeUntil(T.prefix | T.group | T.block); ctx_.push(cur)
      break
    case T.group: case T.array: /* T.group | T.array: */
      if (topIsDict) { type === T.group && ctx_.push(Token(T.colon, ":"), Token(T.fn, "(){")); topIsDict = false }
      else { 
        const top = ctx_[ctx_.length - 1]
        top.t & (T.dot | T.fn) && before !== T.fn && consume()
        if (before & (T.groupEnd | T.ref | T.literal)
            || before === T.blockEnd && (1 << values_[values_.length - 1].o) & (1 << O.composed | 1 << O.fn)) {
          ctx_.push(Token(T.callOrAccess, "__call__"))
        }
      }
      ctx_.push(cur)
      break
    case T.comma: /* T.comma: */
      if (before & (T.comma | T.array)) { values_.push(Op(O.token, { v: kFakeValue })) }
      else if (before === T.groupEnd && values_[values_.length - 1].o === O.comma
          && ctx_[ctx_.length - 1].t & (T.group | T.array)) {
        values_[values_.length - 1] = Op(O.comma, [values_[values_.length - 1]])
      }
      while (ctx_[ctx_.length - 1].t >= T.comma) { consume() }
      ctx_[ctx_.length - 1].t === T.dict && (topIsDict = true)
      ctx_.push(cur)
      break
    case T.colon: /* T.colon: */
      if (before === T.ref) {
        const top = ctx_[ctx_.length - 1]
        if (top.t === T.block || top.t === T.prefix && (top.v === "labelled"
            || values_[values_.length - 2].o !== O.block)) {
          values_.push(Op(O.block, { c: 0, l: 0, x: null as never }), values_.pop()!)
          ctx_.push(Token(T.prefix, "labelled"))
        }
      }
      consumeUntil(topIsDict ? (T.comma << 1) - 1 | T.question : T.comma - 1 | T.question)
      ctx_[ctx_.length - 1].t !== T.prefix ? (ctx_.push(cur), topIsDict = false)
      : (type = T.groupEnd, Build.NDEBUG || ((cur.n as string) = "groupEnd")) // `if a > 1:`
      break
    case T.fn: /* T.fn: */
      if (cur.v === "fn" && tokens_[pos_ + 1].t === T.ref) {
        ctx_.push(Token(T.fn, `fn ${(tokens_[++pos_] as BaseToken<T.ref>).v}`))
      } else {
        if (tokens_[pos_ + 1].v === "*") { throwSyntax("Unsupported generator") }
        ctx_.push(cur)
      }
      break
    case T.ref: case T.literal: /* T.ref: T.literal: */
      values_.push(Op(O.token, cur.v))
      break
    default:
      if (cur.t === T.callOrAccess && cur.v === "new" && tokens_[pos_ + 1].t === T.dot) {
        values_.push(Op(O.token, `new.${(tokens_[pos_ += 2] as BaseToken<T.literal>).v.v as "target"}`))
      } else {
        if (cur.t === T.math1 && before === T.blockEnd
            && !(1 << values_[values_.length - 1].o & (1 << O.composed | 1 << O.fn))) {
          type = (cur.t as T) = T.unary, Build.NDEBUG || ((cur.n as string) = "unary")
        } else if (cur.t === T.compare2 && cur.v === "in") {
          const t1 = ctx_[ctx_.length - (ctx_[ctx_.length - 1].t === T.group ? 2 : 1)]
          if (t1.t === T.action && kVarAction.includes(t1.v) || t1.t === T.prefix && t1.v === "for"
              && values_[values_.length - 2].o === O.block) {
            type = (cur.t as T) = T.assign, Build.NDEBUG || ((cur.n as string) = "assign")
          }
        } else if (cur.t === T.dot && tokens_[pos_ + 1].t & (T.group | T.array)) {
          type = (cur.t as T) = T.callOrAccess, Build.NDEBUG || ((cur.n as string) = "callOrAccess")
        }
        const kOpL2R = T.comma | T.or | T.and | T.bitOr | T.bitXor | T.bitAnd | T.compare1 | T.compare2 | T.bitMove
            | T.math1 | T.math2 | T.math3 | T.dot
        consumeUntil((type & (T.question | T.colon | T.fn | T.assign) ? T.assign << 1
            : type & kOpL2R ? type : type << 1) - 1)
        ctx_.push(cur)
      }
      break
    }
  }
  while (ctx_.length > 1) { consume() }
  return values_.length === 2 && values_[1].o !== O.stat && !inNewFunc ? values_[1] : (consume(), values_[0])
}

const analyseEscaped = (func: BaseOp<O.fn>): void => {
  const visited: { readonly d: NullableVarList, readonly r: Set2<VarNames> }[] = []
  _collect = (op, enter): void => {
    if (op.o === O.token) {
      let val = enter as VarNames, i = visited.length - 1, decl: NullableVarList
      if (visited[i].r.has(val) || (val as VarNames | VarLiterals) === "...") { return }
      for (; (decl = visited[i].d) !== 0 && decl.indexOf(val) < 0; i--) { /* empty */ }
      visited[decl ? visited.length - 1 : i].r.add(val)
    } else if (op.o !== O.fn) {
      if (0) { op.o satisfies O.block | O.stat } // lgtm [js/unreachable-statement]
      const varNames = op.o === O.block ? op.v.c ? op.v.l ? op.v.c.concat(op.v.l) : op.v.c : op.v.l!
          : op.v.a === "catch" ? [VarName(op.v.c!.v)]
          : (((op.v.c as Extract<BaseStatement<"for">["c"], BaseOp<O.comma>>
              ).v[0].v as SomeStatements<VarActions>).v.v satisfies (RefOp | RefAssignOp)[] as (RefOp | RefAssignOp)[]
            ).map(ToVarName)
      enter ? visited.push({ d: varNames, r: Set2() }) : visited.pop()
    } else if (enter) {
      const fn: OpValues[O.fn] = op.v
      if (fn.b.o === O.block && !fn.v) { prepareBlockBodyToRun(fn.v = [], fn.b.v) }
      visited.push({ d: 0, r: Set2() })
      const args = fn.a.map(ToVarName)
      fn.t.length > 3 && args.push(VarName(fn.n!))
      args.length && visited.push({ d: args, r: Set2() })
    } else {
      const frame = visited.pop()!, set = (frame.d ? visited.pop()! : frame).r
      const op2: RefOp = Op(O.token, "a" as unknown as VarLiterals),
      ref = Build.MV3 || !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
          ? [...set satisfies Set2<VarNames> as unknown as VarNames[]]
          : kHasSet ? Array.from(set as unknown as VarNames[]) : (set as unknown as VarNames[]).slice()
      ; (op.v.r satisfies OpValues[O.fn]["r"]) = ref
      for (const i of ref) {
        _collect!(op2, i)
      }
    }
  }
  ToString(func, 0)
  _collect = null
}

//#endregion parse syntax tree

//#region evaluate

const enum R { plain = 0, evenNotFound = 1, eveNotInited = 2, noConst = 4, allowOptional = 8, }

const throwReference = (name: string | number, isLocal: boolean): never => {
  throw new ReferenceError(isLocal ? `Cannot access '${name}' before initialization` : `${name} is not defined`)
}
const throwType = (error: string): never => { throw new TypeError(error) }
const newException = (noHandler?: 1): NonNullable<typeof g_exc> =>
    g_exc = { g: isolate_, l: locals_.slice(0), d: noHandler ? stackDepth_ : -stackDepth_ }

const ToVarName = (op: RefOp | RefAssignOp): VarNames => VarName(op.o === O.token ? op.v : op.v.y.v)
const StackFrame = (block: OpValues[O.block], args?: readonly [VarLiterals, unknown][] | null
    , pureVars?: NullableVarList, scopeName?: string): StackFrame => {
  const varDict = Object.create(null)
  let varName: string
  for (varName of pureVars || []) { varDict[varName] = void 0 }
  for (varName of block.c || []) { varDict[varName] = kFakeValue }
  for (varName of block.l || []) { varDict[varName] = kFakeValue }
  for (const i of args || []) { varDict[VarName(i[0])] = i[1] }
  const frame: StackFrame = { v: varDict, c: block.c || [], n: scopeName !== void 0 ? scopeName : null, r: 1 }
  locals_.push(frame)
  return frame
}

const exitFrame = (): void => {
  const frame: StackFrame = locals_.pop()!, { r: inClosure, v: ref } = frame
  frame.r = 0
  if (inClosure === 1) {
    (frame.v as StackFrame["v"]) = Object.create(null), (frame.c as StackFrame["c"]) = []
  } else {
    for (var key in ref) {
      (inClosure as Exclude<typeof inClosure, 0>).has(key as (keyof typeof ref) & string) || delete ref[key]
    }
  }
}

const _resolveVarRef = (name: VarLiterals, getter: R): Ref => {
  const varName = VarName(name)
  for (let i = locals_.length; 0 < i--; ) { const vars = locals_[i].v; if (varName in vars) {
    if (!(getter & R.eveNotInited) && vars[varName] === kFakeValue) { throwReference(name, true) }
    if (getter & R.noConst && locals_[i].c.indexOf(varName) >= 0) { throwType(`invalid assignment to const '${name}'`) }
    return { y: vars, i: varName as unknown as number }
  } }
  if ((varName === "globalThis" || name === kProto || name as unknown === "eval") && isolate_ === DefaultIsolate) {
    return { y: globalVarAccessor, i: name as string | number as number }
  }
  return varName === "this" ? { y: [isolate_ as unknown as number], i: 0 }
      : varName === "undefined" ? { y: [void 0 as unknown as number], i: 0 }
      : (getter & R.evenNotFound) || varName in isolate_ ? { y: isolate_, i: varName as unknown as number }
      : throwReference(name, false)
}

const Ref = (op: Op, type: R): Ref => {
  if (op.o === O.token) {
    return typeof op.v === "string" ? (/*#__NOINLINE__*/ _resolveVarRef)(op.v, type)
        : { y: [(op.v.v && typeof op.v.v === "object" ? evalComplexLiteral(op.v.v) : op.v.v) as number], i: 0 }
  }
  if (op.o === O.access || op.o === O.call) {
    const y = op.o === O.call ? evalCall(op) : opEvals[op.v.y.o](op.v.y)
    if (isLooselyNull(y)) {
      for (let par: Op | null = op; par; par = par.o === O.access ? par.v.y : par.o === O.call ? par.v.f : null) {
        if (par.o === O.access ? par.v.d[0] === "?" : par.o === O.call && par.v.o) {
          return type === R.allowOptional ? { y: kFakeValue as never, i: "v" satisfies keyof FakeValue as never }
              : { y: [undefined as unknown as number], i: 0 }
        }
      }
      op.o === O.call || throwType(`Cannot read properties of undefined (reading ${
          AccessToString(opEvals[op.v.i.o](op.v.i) as string, 1)})`)
    }
    return op.o === O.call ? { y: [y as number], i: 0 } : { y: y as Ref["y"], i: opEvals[op.v.i.o](op.v.i) as number }
  }
  return { y: [opEvals[op.o](op) as number], i: 0 }
}

const evalTry = (stats: readonly Statement[], i: number): [unknown, number] => {
  const statement = stats[i] as BaseStatement<"try">, next = stats[i + 1] as BaseStatement<"catch" | "finally">
  const indFinal = next.a === "finally" ? i + 1 : i + 2 < stats.length && stats[i + 2].a === "finally" ? i + 2 : 0
  const oldLocalsPos = locals_.length
  let done: BOOL = 0, res: unknown = kFakeValue, res2: unknown
  try { 
    if (next.a !== "catch") { res = evalBlockBody(statement.v.v); done = 1 }
    else try { res = evalBlockBody(statement.v.v); done = 1 }
    catch (ex) {
      g_exc || newException()
      while (locals_.length > oldLocalsPos) { exitFrame() }
      next.c && StackFrame(next.v.v, [[next.c.v, ex]])
      i++; res = evalBlockBody(next.c ? { c: 0, l: 0, x: next.v.v.x } : next.v.v)
      next.c && exitFrame(); g_exc = null; done = 1
    }
  } finally { if (indFinal) {
    const oldLocals = locals_, oldExc = done ? null : g_exc || newException()
    done || (locals_ = locals_.slice(0, oldLocalsPos), oldExc && (oldExc.d = -Math.abs(oldExc.d)))
    i = indFinal; res2 = evalBlockBody((stats[i] as BaseStatement<"finally">).v.v)
    if (res2 !== kBreakBlock && res === kBreakBlock) { (res as BreakValue).c = (res as BreakValue).v = 0 }
    res = res2 !== kFakeValue ? res2 : res // even override break
    done || (locals_ = oldLocals, oldExc && (oldExc.d = Math.abs(oldExc.d)))
  } }
  return [res, i]
}

const SubBlock = (statement: Op): OpValues[O.block] => {
  return statement.o === O.block ? statement.v : statement.o === O.statGroup ? { c: 0, l: 0, x: statement.v }
      : { c: 0, l: 0, x: [(statement as BaseOp<O.stat>).v] }
}

const consumeContinue = (res: FakeValue | BreakValue | undefined, self: BaseStatement<"do" | "for" | "while">
      ): FakeValue | BreakValue | undefined =>
    res === kBreakBlock && res.c && (!res.v || self.l && self.l.indexOf(res.v, 0) >= 0)
        ? (res.c = res.v = 0, kFakeValue) : res

const evalFor = (statement: BaseStatement<"for">): unknown => {
  const initOp = statement.c.o === O.comma ? statement.c.v[0] : null
  const varStat = initOp && initOp.v.a ? initOp.v as SomeStatements<VarActions> : null
  const newScope = !!varStat && varStat.a !== "var"
  const forkScope = (): VarDict => {
    const old = locals_[locals_.length - 1], newVars: VarDict = Object.create(null), { v: oldVars, c, n, r } = old
    for (let key in oldVars) { newVars[key as VarNames] = oldVars[key as VarNames] }
    exitFrame()
    locals_.push({ v: newVars, c, n, r })
    return newVars
  }
  let res: unknown = kFakeValue, ref: Writable<Ref>
  if (newScope) { // should enter its own scope before computing source
    const isConst = varStat.a === "const"
    const names = (varStat.v.v satisfies (RefOp | RefAssignOp)[] as (RefOp | RefAssignOp)[]).map(ToVarName)
    StackFrame({ c: isConst ? names : 0, l: isConst ? 0 : names, x: [] })
  }
  if (statement.c.o === O.comma && statement.c.v.length > 1) {
    varStat ? evalLet(varStat, []) : opEvals[initOp!.v.v.o](initOp!.v.v)
    for (; opEvals[statement.c.v[1]!.o](statement.c.v[1]!)
          ; newScope && forkScope(), opEvals[statement.c.v[2]!.o](statement.c.v[2]!)) {
      statement.v.o <= O.stat ? res = evalBlockBody(SubBlock(statement.v)) : opEvals[statement.v.o](statement.v)
      if ((res = consumeContinue(res as BreakValue, statement)) !== kFakeValue) { break }
    }
  } else {
    const assignment = ((varStat ? varStat.v.v[0] : statement.c) as RefAssignOp).v
    const source = opEvals[assignment.x.o](assignment.x) as number[] | null | undefined
    ref = Ref(assignment.y, newScope ? R.eveNotInited : R.plain)
    if (assignment.a === "in") {
      for (let item in source as { [k: number]: unknown }) {
        ref.y[ref.i] = item as string | number as number
        statement.v.o <= O.stat ? res = evalBlockBody(SubBlock(statement.v)) : opEvals[statement.v.o](statement.v)
        if ((res = consumeContinue(res as BreakValue, statement)) !== kFakeValue) { break }
        newScope && (ref.y = forkScope())
      }
    } else {
      type IterMethod = (this: number[]) => Iterator<number>;
      const It = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && typeof Symbol !== "function" ? null : Symbol.iterator
      let iterator: Iterator<number>, cur: IteratorResult<number> | undefined, ind = 0
      if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && !It) {
        if (isLooselyNull(source) || !source || source.length == null) {
              throwType(DebugCallee(assignment.x, null, "") + " is not iterable") }
      } else {
        const it = isLooselyNull(source) ? source : source[It!]
        if (typeof it !== "function") { throwType(DebugCallee(assignment.x, null, "") + " is not iterable") }
        iterator = (evalCall.call as (this: IterMethod, self: number[]) => Iterator<number>).bind(it!, source!)()
      }
      while ((res = consumeContinue(res as BreakValue, statement)) === kFakeValue
          && (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
              && !It ? ind < source!.length : (cur = iterator!.next()) && !cur.done)) {
        ref.y[ref.i] = cur ? cur.value : source![ind]
        statement.v.o <= O.stat ? res = evalBlockBody(SubBlock(statement.v)) : opEvals[statement.v.o](statement.v)
        newScope && (ref.y = forkScope())
        ind++
      }
    }
  }
  newScope && exitFrame()
  return res
}

const evalLet = (statement: BaseStatement<"const" | "let" | "var" | "arg">, args: unknown[]) => {
  const frame = locals_[locals_.length - 1], act = statement.a, declarations = statement.v.v
  const isArg = act === "arg", appendUndefined = isArg || act === "let"
  let op: SomeStatements<VarActions>["v"]["v"][number], varName: VarNames, ind = -1
  for (op of declarations) {
    ind++
    varName = VarName((op.o === O.assign ? op.v.y : op.v !== "..." ? op : (declarations[ind + 1] as RefOp)).v)
    if (isArg && op.o === O.token && op.v === "...") { frame.v[varName] = args.slice(ind); break }
    if (ind < args.length && args[ind] !== void 0) { frame.v[varName] = args[ind] }
    else if (op.o !== O.assign) { appendUndefined && (frame.v[varName] = void 0) }
    else if (op.v.x.o === O.fn) { frame.v[varName] = FunctionFromOp(op.v.x.v, isolate_, locals_, op.v.y.v) }
    else { frame.v[varName] = opEvals[op.v.x.o](op.v.x) }
  }
}

const evalBlockBody = (block: OpValues[O.block]): unknown => {
  const statements: readonly Statement[] = block.x
  let res: unknown = kFakeValue, i = 0, statement: Statement
  !block.l && !block.c || StackFrame(block)
  for (; i < statements.length; i++) {
    statement = statements[i]
    statement.v.o === O.fn && statement.v.v.t === "fn"
    && (locals_[locals_.length - 1].v[VarName(statement.v.v.n!)] = FunctionFromOp(statement.v.v, isolate_, locals_, ""))
  }
  for (i = 0; i < statements.length && res === kFakeValue; i++) {
    statement = statements[i]
    switch (statement.a) {
    case "do": case "while":
      for (let isDo = statement.a === "do", cond = (isDo ? statements[++i] : statement).c!
            ; (res = consumeContinue(res as BreakValue, statement)) === kFakeValue
              && (isDo || opEvals[cond.o](cond)); isDo = false) {
        statement.v.o <= O.stat ? (res = evalBlockBody(SubBlock(statement.v))) : opEvals[statement.v.o](statement.v)
      }
      // no break;
    case "for":
      if (statement.a === "for") { res = /*#__NOINLINE__*/ evalFor(statement) }
      res = res === kBreakBlock && !(res as BreakValue).v ? kFakeValue : res
      break
    case "try":
      res = /*#__NOINLINE__*/ evalTry(statements, i)
      i = (res as ReturnType<typeof evalTry>)[1]; res = (res as ReturnType<typeof evalTry>)[0]
      break
    case "break": case "continue":
      kBreakBlock.c = statement.a === "break" ? 0 : 1
      kBreakBlock.v = statement.v.o === O.token ? (statement.v as RefOp).v : 0
      return kBreakBlock
    case "const": case "let": case "var": evalLet(statement, []); break
    case "return": case "throw":
      res = opEvals[statement.v.o](statement.v)
      res = res !== kFakeValue ? res : void 0
      if (statement.a !== "throw") { return res } else { throw res }
    default:
      if (0) { // lgtm [js/unreachable-statement]
        statement.a satisfies "catch" | "finally" | "" | "else" | "if" | "else if" | "labelled" }
      if (!Build.NDEBUG && (statement.a === "catch" || statement.a === "finally")) { throwType("Error in try/catch") }
      if (statement.a !== "if" && statement.a !== "else if" || opEvals[statement.c.o](statement.c)) {
        statement.v.o <= O.stat ? (res = evalBlockBody(SubBlock(statement.v)))
            : statement.v.o !== O.fn ? opEvals[statement.v.o](statement.v) : 0
        while (i + 1 < statements.length && statements[i + 1].a.startsWith("else")) { i++ }
      }
      break
    }
    res = res === kBreakBlock && (res as BreakValue).v && statement.l
        && statement.l.indexOf((res as BreakValue).v as string) >= 0 ? ((res as BreakValue).v = 0, kFakeValue) : res
  }
  !block.l && !block.c || exitFrame()
  return res
}

const evalNever = (op: BaseOp<O.block | O.statGroup | O.stat | O.pair>): void => {
  throwSyntax("Can not eval Op::" + (op.o === O.block ? "Block" : op.o === O.statGroup ? "statGroup"
      : op.o === O.stat ? "stat" : "Pair") + " directly")
}, baseEvalCommaList = (opList: OpValues[O.comma]): unknown[] => {
  let arr: unknown[] = []
  for (let i = 0; i < opList.length; i++) {
    const item = opList[i]
    if (item.o === O.token && item.v === "...") {
      ++i
      const subArray = opEvals[opList[i].o](opList[i])
      arr = arr.concat(Array.isArray(subArray) ? subArray : /** throwable */ [].slice.call(subArray))
    } else if (item.o === O.token && typeof item.v === "object" && item.v.v === kFakeValue) {
      arr.length += 1
    } else {
      arr.push(opEvals[opList[i].o](opList[i]))
    }
  }
  return arr
}, evalComma = (op: BaseOp<O.comma>): unknown => {
  const arr = baseEvalCommaList(op.v)
  return arr.length > 0 ? arr[arr.length - 1] : void 0
}, evalFn = (op: BaseOp<O.fn>): unknown => {
  return FunctionFromOp(op.v, isolate_, locals_, "")
}, evalAssign = (op: BaseOp<O.assign>): unknown => {
  const action = op.v.a, target = op.v.y as RefOp | BaseOp<O.access>, direct = action === "="
  const { y, i } = Ref(target, direct ? R.eveNotInited | R.evenNotFound : R.plain)
  let x: number = direct ? 0 : y[i]
  if (action === "??=" ? !isLooselyNull(x) : action === "||=" ? x : action === "&&=" ? !x : false) { return x }
  const source = op.v.x.o !== O.fn ? opEvals[op.v.x.o](op.v.x) as number : FunctionFromOp(op.v.x.v
      , isolate_, locals_, target.o === O.token ? target.v : "") as never
  switch (action) {
  case  "+=": x  += source; break; case  "-=": x  -= source; break; case   "*=": x   *= source; break
  case  "/=": x  /= source; break; case  "%=": x  %= source; break; case  "**=": x  **= source; break
  case "<<=": x <<= source; break; case ">>=": x >>= source; break; case ">>>=": x >>>= source; break
  case  "&=": x  &= source; break; case  "^=": x  ^= source; break; case   "|=": x   |= source; break
  default   : x   = source;
    if (0) { action satisfies "=" | "??=" | "&&=" | "||=" | "of" | "in" } break // lgtm [js/unreachable-statement]
  }
  if (direct && target.o === O.token) { Ref(target, R.noConst) }
  return y[i] = x
}, evalIfElse = (op: BaseOp<O.ifElse>): unknown => {
  return opEvals[op.v.c.o](op.v.c) ? opEvals[op.v.l.o](op.v.l) : opEvals[op.v.r.o](op.v.r)
}, evalBinary = (op: BaseOp<O.binary>): unknown => {
  const x = opEvals[op.v.l.o](op.v.l) as number, action = op.v.o
  if (action === "&&" ? !x : action === "||" ? x : action === "??" ? !isLooselyNull(x) : false) { return x }
  const y = opEvals[op.v.r.o](op.v.r) as number
  switch (action) {
  case "|":  return x  | y; case "^":  return x  ^ y; case "&":   return x   & y
  case "<<": return x << y; case ">>": return x >> y; case ">>>": return x >>> y
  case "==": return x == y; case "!=": return x != y; case "===": return x === y; case "!==": return x !== y
  case "<":  return x  < y; case "<=": return x <= y; case ">":   return x   > y; case ">=":  return x  >= y
  case "+":  return x  + y; case "-":  return x  - y; case "*":   return x   * y; case "/":   return x   / y
  case "%":  return x  % y; case "**": return x ** y;
  case "in": return x in (y as unknown as Dict<unknown>)
  case "instanceof": return (x as unknown) instanceof (y as unknown as { (): unknown })
  default: if (0) { action satisfies "&&" | "||" | "??" } return y // lgtm [js/unreachable-statement]
  }
}, evalUnary = (op: BaseOp<O.unary>): unknown => {
  const action = op.v.o.v, target = op.v.x, { y, i } = Ref(target, action === "typeof" ? R.evenNotFound : R.plain)
  switch (action) {
  case      "+": return       +y[i]; case  "-": return -y[i]; case "!": return !y[i]; case "~": return ~y[i]
  case "++": return op.v.o.t === T.rightUnary ? y[i]++ : ++y[i]
  case "--": return op.v.o.t === T.rightUnary ? y[i]-- : --y[i]
  case "typeof": return typeof y[i]; case "delete": return target.o === O.token || delete y[i]
  case "`": {
    const arr: ReturnType<typeof evalAccessKey>[] = []
    for (const i of (target as TemplateOp["v"]["x"]).v.v) { arr.push(evalAccessKey(opEvals[i.o](i))) } // easy to debug
    return arr.join("")
  }
  case   "void":
    /*#__NOINLINE__*/ evalAccess(Op(O.access, { y: Op(O.token, {v: {c: 5, v: y}}), i: Op(O.token, { v: i }), d: "." }))
    // no break;
  default: if (0) { action satisfies "void" } return // lgtm [js/unreachable-statement]
  }
}, evalCall = (op: BaseOp<O.call>): unknown => {
  const { y, i } = Ref(op.v.f, R.allowOptional), i2 = evalAccessKey(i)
  let func = y[i2 as number] as unknown as { new (...args: unknown[]): object; (...args: unknown[]): unknown }
  if (isLooselyNull(func) && (y as unknown === kFakeValue || op.v.o)) { return }
  const noThis = op.v.n || op.v.f.o !== O.access, args = baseEvalCommaList(op.v.a)
  if (typeof func !== "function") {
    if (isLooselyNull(func) || func != null) { // here is to detect `document.all`
      throwType(DebugCallee(op.v.f, func, i2) + " is not a function")
    }
  } else if (op.v.n && (func as Function2).__fn && (func as Function2).__fn!.t < "f") {
    throwType(DebugCallee(op.v.f, func.name, i2) + "is not a constructor")
  }
  if (func === DefaultFunction) { func = /*#__NOINLINE__*/ innerFunction_ as unknown as typeof func }
  return (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
      && Build.MinCVer >= BrowserVer.MinEnsuredES6SpreadOperator) && noThis
      ? !op.v.n ? func(...args) : new func(...args)
      : !op.v.n ? HasReflect ? Reflect!.apply(func, noThis ? void 0 : y, args)
        : evalCall.apply.bind<(this: (this: 1, arg: 2) => 3, thisArg: 1, x: [2]) => 3>(
              func as (this: 1, arg: 2) => 3)((noThis ? void 0 : y) as unknown as 1, args as [2]) satisfies 3
      : HasReflect ? Reflect!.construct(func, args)
      : args.length === 0 ? new func : args.length === 1 ? new func(args[0])
      : (args.unshift(void 0),
        new (evalCall.bind.apply<new (args: unknown[]) => object, unknown[], new () => object>(func, args)))
}, evalAccess = (op: BaseOp<O.access>): unknown => {
  const { y, i } = Ref(op, R.plain)
  return y[i]
}, evalComposed = (op: BaseOp<O.composed>): unknown => {
  if (op.v.b === "[") { return baseEvalCommaList(op.v.v) }
  const Cls = isolate_ !== DefaultIsolate && (isolate_ as unknown as Window).Object || Object
  let arr = op.v.v as SomeOps<O.token | O.pair>[]
  if (arr.every(item => item.o === O.pair ? !item.v.p && item.v.k.o === O.token
            && !(item.v.v.o === O.fn && item.v.v.v.t === "(){" && item.v.k.v === kProto)
          : item.v !== "..." && item.v !== kProto)) {
    const obj = new Cls() as Dict<unknown>
    for (const item of arr) {
      const key = ((item.o === O.token ? item : item.v.k) as RefOp).v
      const value = item.o === O.token ? evalTokenValue(item) : item.v.v.o !== O.fn
          ? opEvals[item.v.v.o](item.v.v) : FunctionFromOp(item.v.v.v, isolate_, locals_, key)
      obj[key] = value
    }
    return obj
  }
  const props: { [s: string | number | symbol]: PropertyDescriptor & Partial<SafeObject> } = Object.create(null)
  let newProto: object | null = Cls.prototype
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i], isToken = item.o === O.token
    if (isToken && item.v === "...") {
      i++
      const src = opEvals[arr[i].o](arr[i])
      if (typeof src === "object" && src !== null) {
        const HasSymbol = !(Build.BTypes & BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        const GetSymbols = HasSymbol ? 0 as never : Object.getOwnPropertySymbols
        const symbols = HasSymbol ? Object.getOwnPropertySymbols!(src) : GetSymbols ? GetSymbols(src) : []
        for (const item of objEntries(src as object)) { props[item[0]] = ValueProperty(item[1], true, true, true) }
        for (const symbol of symbols) {
          const prop = Object.getOwnPropertyDescriptor(src, symbol)
          if (prop && prop.enumerable) {
            props[symbol] = ValueProperty(prop.writable !== void 0 ? prop.value : (src as any)[symbol]
                , true, true, true)
          }
        }
      }
      continue
    }
    const key = isToken ? (item as RefOp).v
        : item.v.k.o === O.token ? item.v.k.v : evalAccessKey(opEvals[item.v.k.o](item.v.k))
    const value = isToken ? evalTokenValue(item) : item.v.v.o !== O.fn ? opEvals[item.v.v.o](item.v.v)
        : FunctionFromOp(item.v.v.v, isolate_, locals_, (item.v.p && item.v.p + " ") + AccessToString(key))
    const prefix = isToken ? "" : item.v.p as "get" | "set"
    const desc: PropertyDescriptor = props[key]
    if (prefix) {
      desc && !("value" in desc) ? desc[prefix] = value as () => unknown
      : props[key] = { configurable: true, enumerable: true, [prefix]: value as () => unknown }
    } else if (key !== kProto || isToken || item.v.k.o !== O.token || item.v.v.o === O.fn && item.v.v.v.t === "(){") {
      desc && !("value" in desc) ? desc.value = value : (props[key] = ValueProperty(value, true, true, true))
    } else {
      newProto = value as object | null // a second key of the "__proto__" literal is a syntax error on Chrome 96
    }
  }
  return Cls.create(newProto, props)
}, evalTokenValue = (op: BaseOp<O.token>): unknown => {
  const { y, i } = Ref(op, R.plain)
  return y[i]
}, evalComplexLiteral = (literal: ComplexLiteral | FakeValue): string | RegExp | FakeValue | number | void => {
  if (literal === kFakeValue) { return kFakeValue }
  else if (literal.c === 4) { return new RegExp(literal.v[0], literal.v[1] as "") }
  else { return (literal as Exclude<typeof literal, FakeValue | { c: 4 }>).v as number }
}, evalAccessKey = (key: unknown): number | string | symbol => {
  if (typeof key === "object" && key !== null) {
    const ref = {[key as never]: 1}, names = Object.getOwnPropertyNames(ref)
    return names.length ? names[0] : (!(Build.BTypes & BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          || Object.getOwnPropertySymbols)
        && (Object.getOwnPropertySymbols!(ref) as never as string[])[0] || throwType("Can not parse a valid member key")
  }
  return typeof key === "number" || typeof key === "symbol" ? key : key + ""
}

const opEvals = [
  evalNever, evalNever, evalNever, evalComma, evalNever, evalFn, evalAssign, evalIfElse, evalBinary, evalUnary,
  evalCall, evalAccess, evalComposed, evalTokenValue
] satisfies { [op in keyof OpValues]: (op: BaseOp<op>) => unknown } as { [op in keyof OpValues]: (op: Op) => unknown }

const FunctionFromOp = (fn: OpValues[O.fn], globals: Isolate, closures: StackFrame[], name: string
    , topMost?: boolean): () => unknown => {
  let callable = function (this: unknown): unknown {
    const oldIsolate = isolate_, oldLocals = locals_
    const realArgs = [].slice.call(arguments) as unknown[]
    let frame: StackFrame | undefined, done = false
    const isNew = fn.t === "=>" ? this !== kFakeValue : Build.BTypes & BrowserType.Chrome
        && Build.MinCVer < BrowserVer.MinEnsuredES6NewTarget ? this instanceof callable : new.target
    if (isNew && fn.t < "f") { throwType((stdName || "anonymous") + "is not a constructor") }
    isolate_ = globals, locals_ = closures.slice(), g_exc = g_exc && g_exc.d < 0 ? g_exc : null
    const oldLocalsPos = locals_.length
    fn.t.length > 3 && StackFrame({ c: [VarName(fn.n!)], l: 0, x: [] }, [[fn.n!, callable]])
    if (fn.b.o === O.block && !fn.v) { prepareBlockBodyToRun(fn.v = [], fn.b.v) }
    ++stackDepth_
    try {
      let args: readonly [VarLiterals, unknown][] = fn.t !== "=>"
          ? [["this" as never, this], ["arguments" as never, realArgs], ["new.target", isNew ? callable : void 0]] : []
      if (fn.a.length > 0) {
        frame = StackFrame({ c: 0, l: fn.a.map(ToVarName), x: [] }, args, 0, stdName)
        evalLet(Stat("arg", null, Op(O.comma, fn.a)), realArgs)
        args = args.concat(objEntries<VarLiterals>(frame.v))
        exitFrame()
      }
      frame = StackFrame(fn.b.o === O.block ? fn.b.v : { c: 0, l: 0, x: [] }, args, fn.v, stdName)
      const result = fn.b.o === O.block ? evalBlockBody({ c: 0, l: 0, x: fn.b.v.x }) : opEvals[fn.b.o](fn.b)
      done = true
      return result !== kFakeValue && result !== kBreakBlock ? result : void 0
    } finally {
      done ? g_exc && g_exc.d > 0 && (g_exc = null) : g_exc && g_exc.d >= stackDepth_ || newException(1)
      stackDepth_--
      !Build.NDEBUG && done && (frame && locals_[locals_.length - 1] !== frame)
          && console.log("Vimium C found a bug of stack error when calling `" + (stdName || "anonymous") + "(...)`")
      while (locals_.length > oldLocalsPos) { exitFrame() }
      isolate_ = oldIsolate, locals_ = oldLocals
    }
  }
  callable = fn.t === "=>" ? callable.bind(kFakeValue) : callable
  const stdName = fn.n || name
  Object.defineProperties(callable, {
    __fn: ValueProperty(fn, false, false, false),
    toString: ValueProperty(FuncToString, true, false, true),
    length: ValueProperty(fn.a.length, false, false, true),
    name: ValueProperty(stdName, false, false, true)
  })
  closures = closures.slice()
  if (!topMost) {
    fn.r || analyseEscaped(Op(O.fn, fn))
    const kUseSet = !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment
    const arr = kUseSet ? new Set!<VarNames>(fn.r!) : fn.r!.slice()
    for (let i = locals_.length; 0 <= --i && (kUseSet ? (<Set<VarNames>> arr).size : (<VarNames[]> arr).length) > 0; ) {
      let inClosure = locals_[i].r
      if (inClosure === 0) { break }
      const vars = locals_[i].v
      if (kUseSet) {
        for (const r of arr as Set<VarNames> as unknown as VarNames[]) {
          r in vars && ((arr as Set<VarNames>).delete(r)
              , (inClosure = inClosure !== 1 ? inClosure : (locals_[i].r = Set2())).add(r))
        }
      } else {
        for (let i = (arr as VarNames[]).length; 0 <= --i; ) {
          const r = (arr as VarNames[])[i]
          r in vars && ((arr as VarNames[]).splice(i, 1)
              , (inClosure = inClosure !== 1 ? inClosure : (locals_[i].r = Set2())).add(r))
        }
      }
    }
  }
  return callable
}

//#endregion evaluate

//#region stringify

const indent = (s: string): string => s.replace(<RegExpG> /^/gm, "  ")

const BinaryStrToT = (tokenStr: TokenValues[BinaryTokens]): keyof TokenValues =>
    "+-".includes(tokenStr) ? T.math1 : kTokenEnums[tokenStr]!

const doesNeedWrap = (val: Op, op: Op): boolean => val.o >= O.call
    ? val.o === O.composed && val.v.b === "{" && (op.o === O.access ? val === op.v.y : op.o <= O.stat)
    : val.o < op.o ? val.o !== O.block : val.o === op.o && (val.o === O.comma
        || val.o === O.binary && BinaryStrToT(val.v.o)! < BinaryStrToT((op as BaseOp<O.binary>).v.o))

const ToWrapped = (op: Op, allowed: number, val: Op): string => {
  const s = ToString(val, allowed)
  return s ? doesNeedWrap(val, op) && !(s.startsWith("(") && s.endsWith(")")) ? `(${s})` : s : kUnknown
}

const ToString = (op: Op, allowed: number): string => {
  if (allowed && !((1 << op.o) & allowed) && op.o !== O.token) { return "" }
  let arr: string[]
  switch (op.o) {
  case O.block: case O.statGroup: /* O.block | O.statGroup: */
    const doesCollect1 = !!_collect && op.o === O.block && !!(op.v.c || op.v.l)
    arr = []
    doesCollect1 && _collect!(op, 1)
    for (const stat of op.o === O.block ? op.v.x : op.v) {
      let str = ToString(Op(O.stat, stat), allowed && (allowed | 1 << O.block | 1 << O.statGroup | 1 << O.stat))
      arr.push(str)
    }
    doesCollect1 && _collect!(op, 0)
    return arr.length > 0 ? op.o === O.statGroup ? arr.join("\n") : "{\n" + indent(arr.join("\n")) + "\n}" : "{ }"
  case O.stat: /* O.stat: */ {
    const { a: prefix, c: clause, l: label } = op.v, child = op.v.v
    const doesCollect2 = !!_collect && (prefix === "catch" ? !!clause
        : prefix === "for" && (clause.o === O.comma && clause.v[0].v.a && clause.v[0].v.a !== "var"))
    doesCollect2 && _collect!(op, 1)
    const c = !clause ? "" : prefix !== "for" || clause.o !== O.comma ? ToString(clause, allowed)
        : clause.v.length === 1 ? ToString(clause.v[0], allowed)
        : (clause.v[0].v.v.o === O.comma && (clause.v[0].v.v as BaseOp<O.comma>).v.length === 0 ? " ;"
            : ToString(clause.v[0], allowed) || (kUnknown + ";")) + " "
          + (ToString(clause.v[1], allowed) || kUnknown).trim() + "; "
          + (ToString(clause.v[2], allowed) || kUnknown).trim()
    let x = child ? ToString(child, allowed) : ""
    doesCollect2 && _collect!(op, 0)
    return (label ? label.slice(1).map(i => i + ":\n").join("") + label[0] + ": " : "")
        + prefix + (clause ? c ? ` (${c})` : " " + kUnknown : "")
        + (!child ? "" : !x ? child.o !== O.block ? " " + kUnknown + ";" : " { ... }"
          : (x = x.trimLeft(), prefix && (prefix === "else if" || kTokenEnums[prefix] === T.prefix)
              && child.o !== O.block && (x.length > 40 || x.includes("\n"))
              ? "\n" + indent(x) : prefix && x ? " " + x : x)
            + (child.o !== O.block && (child.o !== O.fn || child.v.t < "f") && !x.endsWith(";")
                    && (child.o !== O.comma || child.v.length !== 1 || child.v[0].o !== O.assign
                        || !"in of".includes(child.v[0].v.a)) ? ";" : ""))
    }
  case O.comma: /* O.comma: */
    if (op.v.length === 0) { return " " }
    arr = op.v.map(ToWrapped.bind(null, op, allowed))
    for (let i = 0, j = 0, spreading = false; i < arr.length; i++) {
      const s: string = spreading && op.v[i].o < O.unary && !arr[i].startsWith("(") ? `(${arr[i]})` : arr[i].trim()
      spreading = s === "..."
      arr[i] = s + (i >= arr.length - 1 ? "" : spreading ? " "
          : (j = s.charAt(s.length - 2) === "\n" ? 1 : j + 1, j % 5 == 0) ? ",\n  " : ", ")
    }
    return arr.join("")
  case O.pair: /* O.pair: */
    return (op.v.p && op.v.p + " ") + (op.v.k.o === O.token
            ? (<RegExpOne> /^([$a-zA-Z_][\w$]*|\d+(\.\d+)?(e[-+]\d+))$/).test(op.v.k.v)
              ? op.v.k.v : JSON.stringify(op.v.k.v)
            : `[${ToWrapped(Op(op.v.k.v.length > 1 ? O.comma : /* fake */ O.stat as never, []), allowed, op.v.k)}]`)
          + (op.v.v.o !== O.fn || op.v.v.v.t !== "(){" ? ": " + (ToString(op.v.v, allowed) || kUnknown)
              : " " + ToString(Op(O.fn, op.v.v.v), allowed && (allowed | (1 << O.fn))))
  case O.fn: /* O.fn: */ {
    if (op.v.p && op.v.p.v.v === op) { return ToString(op.v.p, allowed && (allowed | (1 << O.pair) | (1 << O.token))) }
    _collect && _collect(op, 1)
    const argsList = !op.v.a.length ? ""
        : ToString(Op(O.comma, op.v.a), allowed && (allowed | (1 << O.comma | 1 << O.token | 1 << O.assign)))
    const body = ToWrapped(op, allowed && op.v.b.o === O.block ? (allowed | 1 << O.block) : allowed, op.v.b)
    _collect && _collect(op, 0)
    return (op.v.t > "f" ? "function " + op.v.n + "(" : "(")
        + (argsList.includes("\n") ? argsList + "\n" : argsList)
        + (op.v.t !== "=>" ? ") " + body : op.v.b.o !== O.block && body.includes("\n") ? ") =>\n" + indent(body)
            : ") => " + body)
  }
  case O.assign: /* O.assign: */ return `${ToString(op.v.y, allowed) || kUnknown} ${op.v.a} ${
      op.v.x.o === O.fn ? ToString(op.v.x, allowed) : ToWrapped(op, allowed, op.v.x)}`
  case O.ifElse: /* O.ifElse: */ return ToWrapped(op, allowed, op.v.c)
        + " ? " + ToWrapped(Op(O.fn, null as never), allowed, op.v.l)
        + " : " + ToWrapped(Op(O.fn, null as never), allowed, op.v.r)
  case O.binary: /* O.binary: */ return `${ToWrapped(op, allowed, op.v.l)} ${op.v.o} ${ToWrapped(op, allowed, op.v.r)}`
  case O.unary: /* O.unary: */
    return op.v.o.t === T.rightUnary ? (ToString(op.v.x, allowed) || kUnknown) + op.v.o.v
        : op.v.o.v === "`" ? (op as TemplateOp).v.x.v.v.map(i => {
          const literal = i.o === O.token && typeof i.v === "object"
              && typeof i.v.v === "object" && i.v.v && i.v.v !== kFakeValue && i.v.v.c < 4
              ? i.v.v as Extract<ComplexLiteral, { c: 0 | 1 | 2 | 3 }> : null
          return literal ? (literal.c & 1 ? "`" : "}") + JSON.stringify(literal.v).slice(1, -1)
                .replace(<RegExpG & RegExpSearchable<0>> /`|\\[\\"tn]/g, s => s === "`" ? "\\`" : s[1] === '"' ? '"'
                  : s[1] < "a" ? s : s[1] === "t" ? "\t" : "\n") + (literal.c & 2 ? "`" : "${")
              : ToString(i, allowed && (allowed | (1 << O.binary) | (1 << O.unary) | (1 << O.access) | (1 << O.token)))
        }).join("")
        : op.v.o.v + (op.v.o.v >= "a" && op.v.o.v < "zz" ? " " : "") + (ToString(op.v.x, allowed) || kUnknown)
  case O.call: /* O.call: */ {
    const args = op.v.a.length > 0 ? ToString(Op(O.comma, op.v.a), allowed) || kUnknown : ""
    return (op.v.n ? "new " : "") + ToWrapped(op, allowed, op.v.f) + (op.v.o ? "?." : "") + `(${args})`
  }
  case O.access: /* O.access: */
    return (ToWrapped(op, allowed, op.v.y) || kUnknown) + (op.v.d.endsWith(".")
        ? op.v.d + (op.v.i as LiteralOp).v.v
        : op.v.d + (ToString(op.v.i, allowed) || kUnknown) + "]")
  case O.composed: /* O.composed: */
    return op.v.v.length == 0 ? op.v.b === "{" ? "{}" : "[]"
        : op.v.b + " " + ToString(Op(O.comma, op.v.v),
            allowed && (allowed | (1 << O.pair) | (1 << O.comma) | (1 << O.token)))
          + (op.v.b === "{" ? " }" : " ]")
  case O.token: /* O.token: */ {
    const isRef = typeof op.v === "string", val = isRef ? op.v : op.v.v
    isRef && _collect && _collect(op as RefOp, VarName((op as RefOp).v))
    return isRef ? val as RefOp["v"] : typeof val === "string" ? JSON.stringify(val) : val === kFakeValue ? " "
        : typeof val === "bigint" ? val + "n" : !val || typeof val !== "object" ? val + ""
        : val.c === 4 ? `/${val.v[0]}/${val.v[1]}` : val.v + ""
  }
  default: if (0) { op satisfies never } return "(unknown)" // lgtm [js/unreachable-statement]
  }
}

const AccessToString = (access: string | number | boolean | null | undefined | object | symbol, toRead?: 1): string => {
  typeof access === "object" && access !== null && (access = evalAccessKey(access))
  return typeof access === "symbol" ? `[${String(access).slice(7, -1)}]`
      : !toRead || typeof access !== "string" ? "" + access
      : access.length <= 16 ? JSON.stringify(access) : JSON.stringify(access.slice(0, 16)) + "..."
}

const FuncToString = function (this: (...args: unknown[]) => unknown): string {
  let func: Function2 = this, s: string
  return typeof func !== "function" || !func.__fn ? DefaultFunction.prototype.toString.apply(func, arguments)
      : (s = ToString(Op(O.fn, func.__fn), 0), /*#__NOINLINE__*/ resetRe_(), s)
}

const DebugCallee = (funcOp: Op, funcInst: ((...args: unknown[]) => unknown) | string | null | undefined
    , access: string | number | symbol): string => {
  const allowed = (1 << O.call) | (1 << O.access) | (1 << O.token)
  if (funcOp.o !== O.access) {
    return ToString(funcOp, allowed) || !isLooselyNull(funcInst) && funcInst + "" || "(anonymous)"
  }
  const y = ToString(funcOp.v.y, allowed) || kUnknown, dot = funcOp.v.d
  const i = dot.endsWith(".") ? (funcOp.v.i as LiteralOp).v.v
      : ToString(funcOp.v.i, allowed) || AccessToString(access, 1)
  return y + (dot.endsWith(".") ? dot + i : dot + i + "]")
}

//#endregion stringify

//#region exported

const parseArgsAndEnv = (arr: IArguments | string[], globals: Isolate | null, closures: VarDict | VarDict[] | null): {
  globals: Isolate | null, closures: VarDict | VarDict[] | null, body: string, args: string[]
} => {
  let i = 0
  while (i < arr.length && typeof arr[i] === "string") { i++ }
  if (i < arr.length) {
    arr[i] && typeof arr[i] === "object" && (globals = arr[i])
    i < arr.length - 1 && arr[i + 1] && typeof arr[i + 1] === "object" && (closures = arr[i + 1])
  }
  return { globals, closures, body: i > 0 ? arr[i - 1] : "", args: [].slice.call(arr, 0, i - 1) }
}

const baseFunctionCtor = ({ body, globals, closures, args }: ReturnType<typeof parseArgsAndEnv>
    , inNewFunc?: boolean | null | undefined, fromOuter?: boolean): () => unknown => {
  const tokens = splitTokens(body.replace(<RegExpG> /\r\n?/g, "\n"))
  let tree = parseTree(tokens, inNewFunc)
  const statsNum = tree.o === O.block ? tree.v.x.length : 1
  if (!Build.NDEBUG && (statsNum > 0)) {
    const serialized = ToString(tree, 0), multipleLines = statsNum > 1 || serialized.includes("\n")
    console.log("Vimium C: parsed a function:" + (!multipleLines && serialized.length > 50 ? "\n " : "")
        , statsNum > 1 ? serialized.slice(1, -1).trimRight()
          : multipleLines ? "\n" + indent(serialized) : serialized)
  }
  /*#__NOINLINE__*/ resetRe_()
  if (statsNum === 0 && !inNewFunc) { return (): void => {} }
  let outerFrames: StackFrame[]
  if (!closures) {
    outerFrames = locals_
  } else {
    outerFrames = (Array.isArray(closures) ? closures as any[] : [closures])
      .filter((dict): dict is VarDict => dict && typeof dict === "object" && !Array.isArray(dict))
      .map((varDict): StackFrame => ({ v: varDict, c: [], n: null, r: 0 }))
    if (tree.o > O.stat) { tree = Op(O.block, { c: 0, l: 0, x: [Stat("return", null, tree)] }) }
  }
  if (!inNewFunc && tree.o === O.block) {
    let par = tree, last: Statement
    while (last = par.v.x[par.v.x.length - 1], !last.a && last.v.o === O.block) { par = last.v as BaseOp<O.block> }
    if (!last.a && last.v.o !== O.fn) { (last.a as LineActions) = "return" }
  }
  inNewFunc = inNewFunc !== false && (tree.o === O.block || inNewFunc)
  return FunctionFromOp({ a: args.map(i => Op(O.token, i as VarLiterals)) as RefOp[],
    t: inNewFunc ? "fn" : "=>", n: inNewFunc ? "anonymous" as string as VarLiterals : null, v: 0, b: tree,
    p: null, r: null
  }, globals || isolate_, outerFrames, "anonymous", fromOuter)
}

const innerFunction_ = function Function(_functionBody: string): () => unknown {
  return baseFunctionCtor(parseArgsAndEnv(arguments, null, []), true)
}

const innerEval_ = function (_functionBody: string): unknown {
  const func = baseFunctionCtor(parseArgsAndEnv(arguments, null, null), false)
  return func()
}

const outerEval_ = <VApiTy["v"] & { [method: string]: unknown }> function (_functionBody: string): unknown {
  const func = baseFunctionCtor(parseArgsAndEnv(arguments, DefaultIsolate, []), null, true)
  return func()
}

const doubleEval_ = function (_functionBody: string | object): unknown {
  const info = typeof _functionBody === "object" && _functionBody ? _functionBody as ReturnType<typeof parseArgsAndEnv>
      : parseArgsAndEnv(arguments, null, null), hasEnv = !!(info.globals || info.closures)
  let func: (() => unknown) | null | undefined
  if (!Build.MV3 && NativeFunctionCtor === null && !hasEnv) {
    const ctor = baseFunctionCtor(parseArgsAndEnv(["Function"], DefaultIsolate, []))() as FunctionConstructor
    NativeFunctionCtor = false
    try { ctor("1"); NativeFunctionCtor = ctor } catch { /* empty */ }
  }
  if (!Build.MV3 && NativeFunctionCtor && !hasEnv) {
    const arr2 = info.args.slice() as unknown[]
    arr2.unshift(DefaultIsolate)
    arr2.push('"use strict";\n' + info.body)
    try {
      if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment) {
        func = new NativeFunctionCtor(... <string[]> arr2) as () => unknown
      } else {
        func = new (NativeFunctionCtor.bind.apply<new (...args: string[]) => Function
            , string[], new () => () => unknown>(NativeFunctionCtor, arr2 as string[]))
      }
    } catch {}
    if (func) { return func() }
  }
  info.globals ||= info.globals || DefaultIsolate
  info.closures = info.closures || []
  func = baseFunctionCtor(info, null, true)
  return func()
}

const exposeStack = (stackArray: StackFrame[]
      ): { dict: VarDict, consts: readonly string[], name: string, done: boolean }[] =>
    stackArray.slice().reverse().map(frame => ({ dict: frame.v, consts: frame.c, name: frame.n || "", done: !frame.r }))

/**
 * (...args: [...args: string[], functionBody: string
 *     , globals: Isolate | null | undefined, locals: VarDict | VarDict[] | null | undefined]): Result
 */
typeof VApi === "object" && VApi ? VApi!.v = outerEval_
    : (DefaultIsolate as Partial<VApiTy["v"]>).vimiumEval = outerEval_
outerEval_.vimiumEval = outerEval_
outerEval_.doubleEval = doubleEval_
outerEval_["noNative"] = (): void => { (!Build.MV3 || !Build.NDEBUG) && (NativeFunctionCtor = false) }
outerEval_["getStack"] = (exc?: boolean): unknown => (exc && !g_exc ? null : {
  stack: exposeStack(exc ? g_exc!.l : locals_),
  depth: exc ? g_exc!.d : stackDepth_, globals: exc ? g_exc!.g : isolate_,
})
outerEval_.tryEval = function (_functionBody: string): ReturnType<VApiTy["v"]["tryEval"]> {
  const info = parseArgsAndEnv(arguments, null, null), hasEnv = !!(info.globals || info.closures)
  try {
    const result = doubleEval_(info)
    return { ok: (!Build.MV3 || !Build.NDEBUG) && NativeFunctionCtor && !hasEnv ? 1 : 2, result }
  } catch (error) {
    const native = (!Build.MV3 || !Build.NDEBUG) && NativeFunctionCtor && !hasEnv
    Build.NDEBUG || console.log("Vimium C: catch an eval error:", error)
    return { ok: 0, result: error, stack: native ? null : exposeStack(g_exc ? g_exc!.l : []),
      type: native ? "native": "eval", globals: native ? null : g_exc ? g_exc!.g : isolate_
    } as ReturnType<VApiTy["v"]["tryEval"]>
  }
}
; (outerEval_.tryEval as any).outerEval = outerEval_

if (!(Build.NDEBUG || T.END < 0x80000000 && T.END > 0 )) { alert(`Assert error: wrong kTokenNames`) }
if (!(Build.NDEBUG || kOpNames.length === O.token + 1)) { alert(`Assert error: wrong fields in kOpNames`) }

//#endregion exported

})()
