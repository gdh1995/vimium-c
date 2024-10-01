/// <reference path="../typings/base/index.d.ts" />
/// <reference path="../typings/lib/index.d.ts" />
/// <reference path="../typings/build/index.d.ts" />
/// <reference path="./base.d.ts" />

((): void => {
//#region types

const enum L {
  plain = 0, regexp = 1, bigint = 2, array_hole = 3, t_middle = 4, t_begin = 5, t_end = 6, t_both = 7
}
type kTemplateLikeL = L.t_middle | L.t_begin | L.t_end | L.t_both
interface BaseLiteral<T extends L> {
  readonly q: T
  readonly x: T extends L.plain ? string | number | boolean | null : T extends L.regexp ? string | RegExp
              : T extends L.bigint ? string | bigint : T extends L.array_hole ? null : string
  readonly y: T extends L.regexp ? string : T extends kTemplateLikeL ? string | null : 0 | null
}
type SomeLiterals<T extends L> = T extends L ? BaseLiteral<T> : never
interface BaseLiteralOp<T extends L> extends CoreOp<O.literal>, BaseLiteral<T> {}
type SomeLiteralOps<T extends L> = T extends L ? BaseLiteralOp<T> : never
type LiteralOp = SomeLiteralOps<L>

interface BaseStatValue<T extends [any, any]> { readonly c: T[0], readonly v: T[1] }
interface EmptyValue extends BaseStatValue<[9, undefined]> {}
interface BreakValue extends BaseStatValue<[is_continue: BOOL, label: VarName | 0]> {}
interface ReturnValue extends BaseStatValue<[2, unknown]> {}
interface TryValue extends BaseStatValue<[next_stat_index: number, block_value: StatValue]> {}
type StatValue = EmptyValue | ReturnValue | BreakValue
type VarLiterals = "var1" | "bar" | "..." | "__proto__" | "new.target" | "debugger"
type VarName = "Var1" | "globalThis" | "this" | "arguments" | "undefined" | "new.target" | "..."
type VarDict = { [name in VarName]: unknown }
type VarList = readonly VarName[]
type NullableVarList = VarList | null
interface AnalysedVars {
  readonly t: [escaped_const: number, escaped_var: number, escaped_let: number,
      local_let: number, local_var: number, local_const: number]
  readonly v: VarList
}
type VarBindings = unknown[]
interface Map2<K extends string, V> { readonly m?: SafeDict<V>; // has (k: K): boolean
    get (k: K): V | undefined; set (k: K, v: V): unknown }
interface StackFrame {readonly o:VarBindings, readonly q:AnalysedVars["t"], readonly x:VarList, readonly y:string|null}
interface Isolate extends VarDict {}
interface Ref { readonly y: { [index: number]: number }, readonly i: number /** | ... */ }
interface RefWithOptional { readonly y: { [index: number]: number | undefined }, readonly i: number /** | ... */ }
interface Function2 { (this: unknown, ...args: unknown[]): unknown; readonly __fn?: BaseOp<O.fn> }

const enum T { block = 1, blockEnd = 2, semiColon = 4, prefix = 8, action = 16, group = 32, dict = 64, array = 128,
  groupEnd = 256, comma = 512, question = 1024, colon = 2048, fn = 4096, assign = 8192, or = 16384, and = 32768,
  bitOr = 65536, bitXor = 131072, bitAnd = 262144, compare1 = 524288, compare2 = 1048576,
  bitMove = 2097152, math1 = 4194304, math2 = 8388608, math3 = 16777216, unary = 33554432,
  rightUnary = 67108864, callOrAccess = 134217728, dot = 268435456, literal = 536870912, ref = 1073741824,
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
  [T.callOrAccess]: "new" | "?." | "(", [T.dot]: "." | "?."
  [T.literal]: BaseLiteralOp<L.plain>["x"] | SomeLiterals<Exclude<L, L.plain>>, [T.ref]: VarLiterals
}
interface BaseToken<K extends keyof TokenValues> { readonly t: K; readonly v: TokenValues[K];
    /** @deprecated */ readonly n?: unknown }
type SomeTokens<K extends keyof TokenValues> = K extends keyof TokenValues ? BaseToken<K> : never
type Token = SomeTokens<keyof TokenValues>
type OverriddenToken = Token & { w?: Token }
type ControlTokens = T.prefix | T.action | T.comma | T.question | T.colon | T.fn | T.assign | T.callOrAccess | T.dot
type BinaryTokens = T.or | T.and | T.bitOr | T.bitXor | T.bitAnd | T.compare1 | T.compare2 | T.bitMove
    | T.math1 | T.math2 | T.math3
type UnaryTokens = T.unary | T.rightUnary
type BeginGroupTokens = T.group | T.block | T.array | T.dict

type BlockPrefixes = "labelled" | "if" | "else if" | "else" | "do" | "while" | "for" | "try" | "catch" | "finally"
    | "switch" | "case" | "default"
type VarActions = "var" | "let" | "const"
type LineActions = "return" | "break" | "continue" | "throw" | VarActions
type AllStatPrefix = "" | BlockPrefixes | LineActions
interface BaseStatementOp<T extends AllStatPrefix | "arg"> extends CoreOp<O.stat> {
  readonly q: T
  readonly x: T extends "if" | "else if" | "while" | "switch" | "case" ? ExprLikeOps
      : T extends "catch" ? RefOp | DestructuringComposedOp | null
      : T extends "for" ? CoreOp<O.block> & {
          readonly q: readonly [SomeStatementOps<VarActions> | ExprLikeOps, ExprLikeOps, ExprLikeOps]
              | readonly [SomeStatementOps<VarActions> | RefAssignOp]
          readonly x: OpValues[O.block]["x"]
          readonly y: OpValues[O.block]["y"]
        }
      : T extends "labelled" ? string : null
  readonly y: T extends "try" | "catch" | "finally" ? BaseOp<O.block>
      : T extends "var" | "let" | "arg" ? ConcreteQ<O.comma, { q: readonly DeclareOp[] }>
      : T extends "const" ? ConcreteQ<O.comma, { q: readonly RefAssignOp[] }>
      : T extends "switch" ? ConcreteQ<O.block, { q: readonly SomeStatementOps<"case" | "default">[] }>
      : T extends "" ? ExprLikeOps | SomeOps<O.block | O.stats> : EvaluatableOps
}
const enum V { econst = 0, elet = 1, evar = 2, localv = 3, locall = 4, localc = 5, unused = 6, all = 5 }

const enum O { block, stats, stat, comma, pair, fn, assign, ifElse, binary, unary, call, access, composed,
    literal, ref, fnDesc }
interface OpValues {
  [O.block]:    { readonly /** stats */ q: readonly EvaluatableOps[], readonly /** $hasFn */ x: null | BOOL,
                  readonly /** $analysed */ y: AnalysedVars | null }
  [O.stats]:    { readonly /** stats */ q: readonly StatementOp[], readonly x: null, readonly y: null }
  [O.stat]:     StatementOp
  [O.comma]:    { readonly /** ops */ q: readonly (EvaluatableOps | PairOp)[], readonly x: 0|null, readonly y: 0|null }
  [O.pair]:     { readonly /** key */ q: string | SomeLiteralOps<L.plain | L.bigint> | BaseOp<O.comma>,
                  readonly /** value */ x: ExprLikeOps, readonly /** prefix */ y: null | "get" | "set" }
  [O.fn]:       { readonly /** args */ q: readonly DeclareOp[] | null,
                  readonly /** body */ x: ExprLikeOps | StorableBlockOp & {
                    readonly /** $builtins */ y: [ $this: number, $arguments:number, $newTarget: number ] | null }
                  readonly y: CoreOp<O.fnDesc> & OpValues[O.fnDesc] },
  [O.composed]: { readonly q: readonly (ExprLikeOps | PairOp)[], readonly x: "[" | "{",
                  readonly /**$simple*/ y: null | BOOL | AnalysedVars },
  [O.assign]:   { readonly /** binary op token */ q: TokenValues[T.assign],
                  readonly /** source (right value) */ x: ExprLikeOps, readonly /** target (left-v) */ y: ExprLikeOps }
  [O.ifElse]:   { readonly /** condition */ q: ExprLikeOps,
                  readonly /** then */ x: ExprLikeOps, readonly /** else */ y: ExprLikeOps }
  [O.binary]:   { readonly q: TokenValues[BinaryTokens], readonly x: ExprLikeOps, readonly y: ExprLikeOps }
  [O.unary]:    { readonly q: TokenValues[UnaryTokens], readonly x: ExprLikeOps, readonly /** is right */ y: BOOL }
  [O.call]:     { readonly /** arguments */ q: readonly ExprLikeOps[]
                  readonly /** function */ x: ExprLikeOps, readonly /** method */ y: "new" | "?.(" | "()" }
  [O.access]:   { readonly q: "." | "?." | "[" | "?.[", readonly /** target */ x: ExprLikeOps,
                  readonly /** member */ y: string | number | boolean | ExprLikeOps }
  [O.literal]:  LiteralOp
  [O.ref]:      { readonly q: VarName, readonly x: number | null, readonly y: number | null }
  [O.fnDesc]:   ( { readonly q: "fn _", readonly x: RefOp } | { readonly q: "fn", readonly x: RefOp | null }
                  | { readonly q: "(){", readonly x: VarName | PairOp } | { readonly q: "=>", readonly x: null })
                & { readonly /** $analysed */ y: AnalysedVars }
}
type KStatLikeO = O.block | O.stats | O.stat
type kExprO = Exclude<keyof OpValues, KStatLikeO | O.pair | O.fnDesc>
interface CoreOp<O2 extends O> { readonly o: O2, /** @deprecated */ readonly n?: unknown }
interface BaseOp<O2 extends keyof OpValues> extends CoreOp<O2>, Pick<OpValues[O2], "q" | "x" | "y"> {}
type SomeOps<K extends keyof OpValues> = K extends O.stat ? StatementOp : K extends O.literal ? LiteralOp
    : K extends keyof OpValues ? BaseOp<K> : never
type ExprLikeOps = SomeOps<kExprO>
type StatLikeOps = SomeOps<KStatLikeO>
type EvaluatableOps = ExprLikeOps | StatLikeOps
type PairOp = BaseOp<O.pair>
type RefOp = BaseOp<O.ref>
type ArrayHoleOp = BaseLiteralOp<L.array_hole>
interface DestructurePairOp extends BaseOp<O.pair> { readonly x: DeclareOp; readonly y: null }
interface RefAssignOp extends BaseOp<O.assign> { readonly y: RefOp | DestructuringComposedOp }
interface PlainRefAssignOp extends RefAssignOp { readonly y: RefOp }
interface BaseDestructuringComposedOp<T extends "[" | "{"> extends BaseOp<O.composed> {
  readonly q: readonly (T extends "[" ? DeclareOp | ArrayHoleOp : RefOp | PlainRefAssignOp | DestructurePairOp)[]
  readonly x: T
  readonly y: AnalysedVars
}
type DestructuringComposedOp = BaseDestructuringComposedOp<"["> | BaseDestructuringComposedOp<"{">
type DeclareOp = RefOp | RefAssignOp
interface TemplateOp extends BaseOp<O.unary> { readonly q: "`", readonly x: ConcreteX<O.composed, { x: "[" }> }
type StorableBlockOp = Omit<BaseOp<O.block>, "y">
type StorableEvaluatableOps = ExprLikeOps | PairOp | SomeOps<O.stats | O.stat> | StorableBlockOp
interface ConcreteQ<O extends keyof OpValues, V extends { q: OpValues[O]["q"] }> extends
    Omit<BaseOp<O>, "q">, Pick<Readonly<V>, "q"> {}
interface ConcreteX<O extends keyof OpValues, V extends { x: OpValues[O]["x"] }> extends
    Omit<BaseOp<O>, "x">, Pick<Readonly<V>, "x"> {}
interface ConcreteY<O extends keyof OpValues, V extends { y: OpValues[O]["y"] }> extends
    Omit<BaseOp<O>, "y">, Pick<Readonly<V>, "y"> {}
interface ConcreteFnOp<Fn extends OpValues[O.fnDesc]["q"]> extends Omit<BaseOp<O.fn>, "y"> {
  readonly y: Extract<OpValues[O.fnDesc], { readonly q: Fn }>
}
type SomeStatementOps<K extends AllStatPrefix | "arg"> = K extends string ? BaseStatementOp<K> : never
type StatementOp = SomeStatementOps<AllStatPrefix>
interface WritableOp<O extends Exclude<keyof OpValues, O.stat>> extends
    CoreOp<O>, Pick<Writable<OpValues[O]>, "q" | "x" | "y"> {}
interface WritableStatementOp<K extends AllStatPrefix | "arg"> extends
    Omit<BaseStatementOp<K>, "x" | "y">, Writable<Pick<BaseStatementOp<K>, "x" | "y">> {}
interface WritableLiteralOp<K extends L> extends
    Omit<BaseLiteralOp<K>, "x" | "y">, Writable<Pick<BaseLiteral<K>, "x" | "y">> {}
type WritableOpFields<T extends object> = {
  readonly [P in keyof T]: T[P] extends readonly (infer A)[] ? A[] : Writable<T[P]>
}
interface WritableOp2<O extends keyof OpValues> extends
    CoreOp<O>, WritableOpFields<Pick<OpValues[O], "q" | "x" | "y">> {}

; (0 as never as Extract<SomeOps<Exclude<keyof OpValues, O.fnDesc | O.block>>["x"], readonly any[]>) satisfies never
; (0 as never as Extract<SomeOps<Exclude<keyof OpValues, O.fnDesc | O.block>>["y"], readonly any[]>) satisfies never

//#endregion types

//#region configurations

const NDEBUG = Build.NDEBUG
const HasReflect: boolean = !!Build.MV3 || !(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinEnsured$Reflect$$apply$And$$construct
    || typeof VApi === "object" && (VApi?.z?.v ?? 0) > BrowserVer.MinEnsured$Reflect$$apply$And$$construct - 1
    || typeof Reflect !== "undefined" && !!Reflect?.apply && !!Reflect.construct
const DefaultIsolate = (Build.MV3 || typeof globalThis !== "undefined" ? globalThis : window) as unknown as Isolate
const DefaultObject = Object
const DefaultFunction = (DefaultIsolate as Dict<unknown>)["Function"] as FunctionConstructor
let NativeFunctionCtor: FunctionConstructor | false | null =
    Build.MV3 || !Build.NDEBUG && typeof VimiumInjector === "undefined" ? null
    : JSON.stringify((typeof browser === "object" && browser as never || chrome
      ).runtime.getManifest().content_security_policy).includes("'unsafe-eval'") ? null : false
let isolate_: Isolate = DefaultIsolate, locals_: StackFrame[] = [], stackDepth_ = 0
let g_exc: { g: Isolate, l: StackFrame[], d: number } | null = null

//#endregion configurations

//#region constant values of syntax

const kTokenNames = Build.NDEBUG ? [] as never
    : ("block, blockEnd, semiColon, prefix, action, group, dict, array, groupEnd, comma, question, colon, fn, assign"
    + ", or, and, bitOr, bitXor, bitAnd, compare1, compare2, bitMove, math1, math2, math3"
    + ", unary, rightUnary, callOrAccess, dot, literal, ref").split(", ")
const kOpNames = Build.NDEBUG ? [] as never
  : "block,stats,stat,comma,pair,fn,assign,ifElse,binary,unary,call,access,composed,literal,ref,fnDesc".split(",")

const kLiterals: ReadonlySafeDict<boolean | null> = { __proto__: null as never, true: true, false: false, null: null }
const kUnsupportedTokens: SafeEnum = { __proto__: null as never, yield: 1, await: 1, async: 1 }
const kLabelled = "labelled", kProto = "__proto__", kDots = "..."

//#endregion constant values of syntax

//#region helper functions

const Op = ((o: O, q: unknown, x: unknown, y: unknown): BaseOp<O>=>{
  return (NDEBUG ? { o, q, x, y } : { n: o === O.composed ? x as OpValues[O.composed]["x"] === "{"
        ? "dict" : "array" : kOpNames[o], q, x, y, o }) as BaseOp<O>
}) as {
  <O extends Exclude<keyof OpValues, O.stat | O.literal>> (
      op: O, q: OpValues[O]["q"], x: OpValues[O]["x"], y: OpValues[O]["y"]): BaseOp<O>
  <T extends AllStatPrefix | "arg">(op: O.stat, q: T, x: BaseStatementOp<T>["x"], y: BaseStatementOp<T>["y"]
      ): SomeStatementOps<T>
  <T extends L>(op: O.literal, q: T, x: BaseLiteral<T>["x"], y: BaseLiteral<T>["y"]): SomeLiteralOps<T>
}
const kEmptyValue: EmptyValue = { c: 9, v: void 0 }
const kOptionalValue = [void 0 as unknown as number] as const
const kBreakBlock: Writable<BreakValue> = { c: 0, v: 0 }
const kUnknown = "(...)"
// `document.all == null` returns `true`
const isLooselyNull = (obj: unknown): obj is null | undefined => obj === null || obj === void 0
const isArray = Array.isArray as { <T> (x: readonly T[] | CoreOp<keyof OpValues>): x is readonly T[]
    ; (x: unknown): x is unknown[] }
const isVarAction = <K extends AllStatPrefix> (s: K): s is K & VarActions => "let,const,var".includes(s)
const resetRe_ = (): true => (<RegExpOne> /a?/).test("") as true
const objCreate = DefaultObject.create as { (proto: null): VarDict; <T> (o: null): SafeDict<T> }
const objEntries = !(Build.BTypes & BrowserType.Chrome)
    || Build.MinCVer >= BrowserVer.MinEnsuredES$Object$$values$and$$entries ? DefaultObject.entries! as never
    : DefaultObject.entries as unknown as undefined || (<T extends string> (object: object): [T, unknown][] => {
  const entries: ReturnType<ObjectConstructor["entries"]> = []
  for (const name of DefaultObject.keys(object)) { entries.push([name, (object as Dict<unknown>)[name]]) }
  return entries as [T, unknown][]
})
const throwSyntax = (error: string): never => { throw new SyntaxError(error) }
const ValueProperty = (value: unknown, writable: boolean, enumerable: boolean, config: boolean): PropertyDescriptor =>
    ({ value, writable, enumerable, configurable: config })
const globalVarAccessor = {
  get globalThis (): unknown { return "globalThis" in isolate_ ? isolate_["globalThis"] as Isolate : isolate_ },
  set globalThis (value: unknown) {
    DefaultObject.defineProperty(isolate_, "globalThis", ValueProperty(value, true, false, true)) },
  get __proto__ (): unknown { return kProto in isolate_ ? isolate_[kProto] as Isolate : (isolate_ as any)[kProto] },
  set __proto__ (value: unknown) {
    DefaultObject.defineProperty(isolate_, kProto, ValueProperty(value, true, true, false)) },
  get eval (): unknown { return innerEval_ },
} as unknown as Ref["y"]
const replaceAll = (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$string$$replaceAll
    || Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.Min$string$$replaceAll
    || Build.BTypes & BrowserType.Edge) && !(<any>"").replaceAll
    ? (s: string, source: string, dest: string): string => s.split(source).join(dest)
    : (s: string, source: string, dest: string) => (s as any).replaceAll(source, dest)

const kIterator = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
    && typeof Symbol !== "function" ? null : Symbol.iterator
const kHasMap = !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Array$$From
    && Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || !!Array.from && typeof Map === "function"
const Map2: { new <K extends string, V> (): Map2<K, V> } = kHasMap ? Map!
    : function <K extends string, V> (this: Map2<K, V> ) { (<Writable<Map2<K,V>>>this).m = objCreate<V>(null) } as never
if (!kHasMap) {
  // Map2.prototype.has = function <K extends string, V> (this: Map2<K, V>, i: K): boolean { return i in this.m! }
  Map2.prototype.get = function <K extends string, V> (this: Map2<K, V>, i: K): V | undefined { return this.m![i] }
  Map2.prototype.set = function <K extends string, V> (this: Map2<K, V>, k: K, v: V) { this.m![k] = v }
}

//#endregion helper functions

//#region tokenize

const Token = <T extends keyof TokenValues> (token: T, value: TokenValues[T]): SomeTokens<T> => {
  return (Build.NDEBUG ? { t: token, v: value }
      : { n: kTokenNames[Math.log2(token)], v: value, t: token }) as SomeTokens<T>
}
let gTokens: ReadonlySafeDict<Token>; {
  const arr: string[] = [
    "{", "}", ";", "if else try catch finally do while for switch case default",
    "return break continue throw var let const",
    "(", "", "[", ") ]", ",", "?", ":", "=>", "of = += -= *= /= %= <<= >>= >>>= &= &&= ^= |= ||= **= ??=",
    "|| ??", "&&", "|", "^", "&", "== != === !==", "< <= > >= in instanceof", "<< >> >>>", "", "* / %", "**",
    "! ~ typeof void delete", "", "new", ". ?."
  ], dict = objCreate<Token>(null)
  let ind = 0, val = 1, token: string
  if (!(Build.NDEBUG || 1 << (arr.length - 1) === T.dot)) { alert(`Assert error: wrong fields in Token Enums`) }
  for (; ind < arr.length; ind++, val <<= 1) {
    for (token of arr[ind] ? arr[ind].split(" ") : []) { dict[token] = Token(val, token) }
  }
  dict["function"] = Token(T.fn, "fn")
  dict["debugger"] = Token(T.literal, "debugger")
  gTokens = dict
}

const splitTokens = (ori_expression: string): Token[] => {
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
  const expect = (re: RegExp): boolean => {
    const reMatch = (<RegExpOne> re).exec(expression_)
    return reMatch ? (last_ = reMatch[0], expression_ = expression_.slice(last_.length), true) : false
  }
  const tokens_: Token[] = [], curlyBraces: BOOL[] = [0]
  let expression_ = ori_expression, char: kCharCode = 0, last_ = ""
  let before = T.semiColon, allowRegexp = true, spaceExec: RegExpExecArray | null
  while (expression_) {
    char = expression_.charCodeAt(0)
    if (char <= 32 ? (1 << char & (1 << kCharCode.tab | 1 << 10 | 1 << 11 | 1 << 12 | 1 << 13 | 1 << kCharCode.space))
        : char < kCharCode.nbsp ? char === kCharCode.slash && "/*".includes(expression_[1])
        : char < 0x2000 ? char === kCharCode.nbsp || char === 0x1680
        : char <= 0x205f ? (<RegExpOne> /^\s/).test(expression_) : char === 0x3000 || char === 0xfeff) {
      // not update `before` here
      expect(char !== kCharCode.slash ? /^\s+/ : /^\/\/[^\n]*|^\/\*[^]*?\*\//)
      before & (T.blockEnd | T.action | T.groupEnd | T.rightUnary | T.literal | T.ref) && char !== kCharCode.slash
          && (<RegExpOne> /[\n\u2028\u2029]/).test(last_) && tokens_.push(Token(T.semiColon, "\n"))
      continue
    }
    if (char === kCharCode.slash && allowRegexp
        && expect(/^\/(?:[^\\\/[\n]|\[(?:[^\\\]\n]|\\[^\n])*\]|\\[^\n])*\/[a-z]{0,16}(?![\w$])/)) {
      char = last_.lastIndexOf("/")
      tokens_.push(Token(T.literal, { q: L.regexp, x: last_.slice(1, char), y: last_.slice(char + 1) }))
    } else if (char === kCharCode.dot && expression_.startsWith(kDots)) {
      tokens_.push(Token(T.ref, kDots), Token(T.comma, ",")); expression_ = expression_.slice(3)
    } else if (char === kCharCode.backtick || char === kCharCode.curlyBraceEnd && curlyBraces[curlyBraces.length - 1]) {
      if (!expect(/^[`}](?:[^`\\$]|\\[^]|\$(?!\{))*(?:`|\$\{)/)) {
        Build.NDEBUG || throwSyntax("Unexpected template string")
      }
      char = 4 + (char === kCharCode.backtick ? 1 : 0) + (last_.endsWith("`") ? 2 : 0)
      char & 1 ? tokens_.push(Token(T.unary, "`"), Token(T.array, "["))
          : (tokens_.push(Token(T.groupEnd, ")"), Token(T.comma, ",")), curlyBraces.pop())
      tokens_.push(Token(T.literal, { q: char as number as kTemplateLikeL satisfies 4 | 5 | 6 | 7
          , x: last_.slice(1, char & 2 ? -1 : -2).replace(escapedStrRe, onHex)
          , y: replaceAll(last_, "\n", "\r") }), Token(T.comma, ","))
      !(char & 2) ? (tokens_.push(Token(T.group, "(")), curlyBraces.push(1)) : tokens_.push(Token(T.groupEnd, "]"))
    } else if ((char === kCharCode.plus || char === kCharCode.dash) && expression_[1] !== "=") {
      char = expression_.charCodeAt(1) === char ? 2 : 1
      tokens_.push(Token(char === 2 ? before & (T.groupEnd | T.ref)
            && tokens_[tokens_.length - 1].v !== "\n" ? T.rightUnary : T.unary
          : before & (T.blockEnd | T.groupEnd | T.rightUnary | T.ref | T.literal) ? T.math1
          : T.unary, expression_.slice(0, char) as "++" | "+" | "--" | "-"))
      expression_ = expression_.slice(char)
    } else if (char === kCharCode.N0 && expression_.length > 1 && expression_[1] !== "."
        && expect(/^0(?:[box][\d_a-f]*|[0-7_]+)/i)) {
      last_ = last_[1] < "8" ? "0o" + last_ : last_.toLowerCase()
      tokens_.push(Token(T.literal, parseInt(replaceAll(last_.slice(2), "_", "")
          , (last_.charCodeAt(1) | kCharCode.CASE_DELTA) === kCharCode.x ? 16
          : (last_.charCodeAt(1) | kCharCode.CASE_DELTA) === kCharCode.o ? 8 : 2)))
    } else if ((char > kCharCode.N0 - 1 ? char < kCharCode.N9 + 1 : char === kCharCode.dot
          && expression_[1] < kChar.minNotNum && expression_[1] > kChar.maxNotNum)
        && expect(/^(?:(?:0|[1-9][\d_]*)(?:\.\d[\d_]*|\.|)|\.\d[\d_]*)(?:[eE][+-]?\d[\d_]*)?/)) {
      tokens_.push(Token(T.literal, expression_[0] === "n"
          ? (expression_ = expression_.slice(1), { q: L.bigint, x: last_, y: 0 })
          : parseFloat(replaceAll(last_, "_", ""))))
    } else if (char === kCharCode.quote1 ? expect(/^'([^'\\\n]|\\[^])*'/)
        : char === kCharCode.quote2 && expect(/^"([^"\\\n]|\\[^])*"/)) {
      tokens_.push(Token(T.literal, last_.slice(1, -1).replace(escapedStrRe, onHex)))
    } else if ((char > 58 ? (char | 96) > 122 && char < 127 : char === 58 || char < 48) && expect(
        /^(=>|[!=]=?=?|[+\-*\/%^]=|&&?=?|\|\|?=?|>>?>?=?|<<?=?|\*\*=?|\?\?=?|\??\.(?![\d.])|[,?:;*\/%^~\{\}\[\]()])/)) {
      char === kCharCode.curlyBraceStart ? curlyBraces.push(0) : char === kCharCode.curlyBraceEnd && curlyBraces.pop()
      tokens_.push(gTokens[last_]!)
    } else if (expect(/^(?:[$A-Z_a-z\x80-\uffff]|\\u(?:\{.*?\}|.{4}))(?:[\w$\x80-\uffff]|\\u(?:\{.*?\}|.{4}))*/)) {
      if (spaceExec = (<RegExpOne> /\s/).exec(last_)) {
        expression_ = ori_expression.slice(-(expression_.length + last_.length - spaceExec.index))
        last_ = last_.slice(0, spaceExec.index)
      }
      last_.includes("\\") && (last_ = last_.replace(<RegExpG & RegExpSearchable<1>> /\\(u\{.*?\}|u.{4})/g, onHex))
      before === T.dot || last_ in kLiterals
      ? tokens_.push(Token(T.literal, before === T.dot ? last_ : kLiterals[last_]!))
      : last_ in kUnsupportedTokens ? throwSyntax("Unsupported identifier: " + last_)
      : before === T.prefix && last_ === "if" && tokens_[tokens_.length - 1].v === "else"
      ? tokens_[tokens_.length - 1] = Token(T.prefix, "else if")
      : tokens_.push(gTokens[last_] ?? Token(T.ref, last_ as VarLiterals))
    } else {
      char = ori_expression.length - expression_.length
      spaceExec = ori_expression.slice(0, char).split("\n") as RegExpExecArray
      throwSyntax(`Unexpected identifier in ${spaceExec.length}:${spaceExec[spaceExec.length - 1].length + 1
          } {{ ${ ori_expression.slice(Math.max(0, char - 6), char).trimLeft()
          }\u2503${expression_.slice(0, 6).trimRight()} }}`)
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

const parseTree = (tokens_: readonly Token[], inNewFunc: boolean | null | undefined): OpValues[O.fn]["x"] => {
  type CtxTokens = ControlTokens | BinaryTokens | UnaryTokens | BeginGroupTokens
  const ctx_: SomeTokens<CtxTokens>[] = [ Token(T.block, "{") ]
  const values_: (EvaluatableOps | PairOp)[] = [Op(O.block, null as never, null, null)]
  const consumeUntil = (except: number): void => { while (!(ctx_[ctx_.length - 1].t & except)) { consume() } }
  const tryInsertPrefix = (toInsert: BlockPrefixes, offset: number
      ): BaseOp<O.stats> | ConcreteY<O.stat, { y: SomeOps<O.stat> }> | null | false => {
    const id = ",else,else if,catch,finally,while,".indexOf("," + toInsert + ",")
    if (id < 0) { return false }
    const head = id < 13 ? "if" : id < 27 ? "try" : "do"
    const unexpected = id < 13 ? "else" : toInsert === "catch" ? "catch,finally" : toInsert
    let matched: BaseOp<O.stats> | ConcreteY<O.stat, { y: SomeOps<O.stat> }> | null | false = false
    let it = values_[values_.length - offset] as EvaluatableOps, parent: StatementOp | null = null
    for (; it.o === O.stat || it.o === O.stats; it = parent.y) {
      if (it.o === O.stat) {
        if (it.q === head) { matched = parent as ConcreteY<O.stat, { y: SomeOps<O.stat> }> }
        parent = it
      } else {
        if (it.q[0].q satisfies AllStatPrefix === head && !unexpected.includes(it.q[it.q.length - 1].q)) { matched=it }
        parent = it.q[it.q.length - 1]
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
      while (values_[--i].o !== O.block || (values_[i] as BaseOp<O.block>).q) { /* empty */ }
      (values_[i] as WritableOp<O.block>).q = values_.splice(i + 1, values_.length - (i + 1))
          .map<EvaluatableOps>(j => j.o === O.stat && !j.q ? j.y : j as Exclude<typeof j, PairOp>)
      } break
    case T.prefix: /* T.prefix: */ {
      const clause = values_[values_.length - 1].o !== O.block ? values_.pop()! : null
      values_.length--
      const matched = ctx_[ctx_.length - 1].t & ~(T.prefix | T.group) ? tryInsertPrefix(top.v, 1) : false
      let stat = matched !== false && top.v === "while" ? Op(O.stat, top.v, val as ExprLikeOps, Op(O.comma, [], 0, 0))
          : Op(O.stat, top.v as "if" | "labelled" | "for", top.v === kLabelled ? (clause as RefOp).q
              : top.v === "for" ? Op(O.block, clause!.o === O.comma ? (clause as BaseOp<O.comma>).q as StatementOp[]
                  : [clause! as ExprLikeOps | SomeStatementOps<VarActions> as SomeStatementOps<VarActions>], null, null
                ) as BaseStatementOp<"for">["x"] : clause! as ExprLikeOps, val as EvaluatableOps)
      if (matched) {
        matched.o === O.stats ? (matched as WritableOp2<O.stats>).q.push(stat)
        : (matched satisfies BaseOp<O.stat> as WritableStatementOp<AllStatPrefix>).y =
            Op(O.stats, [matched.y, stat], null, null)
      } else {
        values_.push(stat.q === kLabelled && val.o === O.stat && val.q === kLabelled
            ? ((val as WritableStatementOp<"labelled">).x = (clause as RefOp).q + " " + val.x, val) : stat)
      }
      } break
    case T.action: /* T.action: */
      values_.push(Op(O.stat, top.v as "var" | "return", null, (val.o > O.comma && isVarAction(top.v)
          ? Op(O.comma, [val as RefOp], 0, 0) : val) as BaseStatementOp<"var">["y"] | BaseOp<O.block>))
      break
    case T.group: case T.array: case T.dict: /* T.group | T.array | T.dict: */ {
      const newTop = ctx_[ctx_.length - 1]
      if (newTop.t === T.callOrAccess && (top.t === T.group || newTop.v !== "new")) {
        ctx_.length--
        top.t === T.group ? values_.push(Op(O.call, val.o === O.comma ? val.q as ExprLikeOps[] : [val as ExprLikeOps]
            , values_.pop() as ExprLikeOps, newTop.v === "new"
            || (ctx_[ctx_.length - 1].t === T.callOrAccess && (ctx_.length--, true))
            ? "new" : newTop.v === "?." ? "?.(" : "()"))
        : (values_[values_.length - 1] = Op(O.access, newTop.v === "?." ? "?.[" : "["
            , values_[values_.length - 1] as ExprLikeOps, val.o === O.literal && val.q === L.plain
              ? val.x satisfies string | number | boolean | null ?? val : val as ExprLikeOps))
      } else if (top.t !== T.group) {
        let arr = val.o === O.comma ? val.q : [val as ExprLikeOps]
        if (top.t === T.array) {
          values_.push(Op(O.composed, arr as ExprLikeOps[], "[", null))
        } else {
          (values_[values_.length - 1] as WritableOp<O.composed>).q = arr as (ExprLikeOps | PairOp)[]
        }
      } else if (newTop.t === T.prefix && newTop.v === "for" && values_[values_.length - 1].o === O.stat) {
        const cond = values_.pop() as BaseStatementOp<"">
        const init = values_[values_.length - 1] as SomeStatementOps<VarActions | "">
        values_[values_.length - 1] = Op(O.comma, [(init.q ? init : init.y), cond.y, val] as ExprLikeOps[], 0, 0)
      } else {
        values_.push(val)
      }
      } break
    case T.comma: /* T.comma: */ {
      const prevVal = values_[values_.length - 1]
      prevVal.o === O.comma ? (prevVal as WritableOp2<O.comma>).q.push(val)
          : (values_[values_.length - 1] = Op(O.comma, [values_[values_.length - 1], val], 0, 0))
      } break
    case T.question: if (!Build.NDEBUG) { throwSyntax(`Unexpected "?"`) } break
    case T.colon: /* T.colon: */
      if (!Build.NDEBUG && ctx_[ctx_.length - 1].t & ~((T.comma << 1) - 1 | T.question | T.colon)) {
        throwSyntax(`Unexpected op token #${ctx_[ctx_.length - 1].t} before ":"`)
      }
      if (ctx_[ctx_.length - 1].t & (T.dict | T.comma)) {
        const keyOp = values_[values_.length - 1] as SomeOps<O.ref | O.literal | O.composed>
        !Build.NDEBUG && !((1 << keyOp.o) & (1 << O.ref | 1 << O.literal | 1 << O.composed))
            && throwSyntax('Unexpected ":" in an object literal')
        const mayPrefix = values_[values_.length - 2] as BaseOp<O.comma> | RefOp, isToken = mayPrefix.o === O.ref
        const prefix = isToken && (ctx_[ctx_.length - 1].t === T.dict || values_[values_.length - 3].o !== O.composed)
            ? (values_.length--, mayPrefix.q as "get" | "set") : null
        const key = keyOp.o === O.ref ? keyOp.q : keyOp.o === O.literal
            ? (!Build.NDEBUG && keyOp.q !== L.plain && keyOp.q !== L.bigint
                && throwSyntax(`Unexpected dict key: ${keyOp.q}, ${keyOp.x}`),<SomeLiteralOps<L.plain | L.bigint>>keyOp)
            : Op(O.comma, keyOp.q, 0, 0)
        values_[values_.length - 1] = Op(O.pair, key, val as ExprLikeOps, prefix)
        val.o === O.fn && val.y.q === "(){" && ((val as WritableOp2<O.fn>).y.x
            = keyOp.o === O.ref && !prefix ? <typeof keyOp.q>key :Op(O.pair,key,Op(O.literal,L.plain,null,null),prefix))
      } else {
        ctx_.length--
        const thenVal = values_.pop()!
        values_[values_.length - 1] = Op(O.ifElse, values_[values_.length - 1] as ExprLikeOps
            , thenVal as ExprLikeOps, val as ExprLikeOps)
      }
      break
    case T.fn: /* T.fn: */ {
      const rawArgs = values_.pop()!
      const args = (rawArgs.o === O.comma ? rawArgs.q : [rawArgs]) as readonly DeclareOp[]
      const isFn = top.v.length > 3, type = isFn ? ctx_[ctx_.length - 1].t & (T.block | T.prefix) ? "fn" : "fn _"
          : top.v as Exclude<typeof top.v, `fn ${string}`>
      values_.push(Op(O.fn, args.length ? args : null, val as ExprLikeOps | StorableBlockOp & { y: null }, Op(O.fnDesc
          , type, isFn ? Op(O.ref, top.v.slice(3) as VarName, 0, 0) : null, null as never) as OpValues[O.fn]["y"]))
      } break
    case T.assign: /* T.assign: */ {
      values_[values_.length - 1] = Op(O.assign, top.v, val as ExprLikeOps, values_[values_.length - 1] as ExprLikeOps)
      } break
    case T.unary: case T.rightUnary: /* T.unary: T.rightUnary: */
      values_.push(Op(O.unary, top.v, val as ExprLikeOps, top.t > T.unary ? 1 : 0))
      break
    case T.callOrAccess: /* T.callOrAccess: */
      values_.push(val.o === O.call ? ((val as WritableOp<O.call>).y = "new", val)
          : Op(O.call, [], val as ExprLikeOps, "new"))
      break
    case T.dot: /* T.dot: */
      Build.NDEBUG || val.o===O.literal && val.q===L.plain && typeof val.x === "string"
          || throwSyntax(`Fail: ${JSON.stringify(val.x)}`)
      values_[values_.length - 1] = Op(O.access, top.v, values_[values_.length - 1] as ExprLikeOps, val.x as string)
      break
    default:
      values_[values_.length - 1] = Op(O.binary, (top satisfies SomeTokens<BinaryTokens>).v
          , values_[values_.length - 1] as ExprLikeOps, val as ExprLikeOps)
      break
    }
  }
  {
  let pos_ = 0, before = T.block, cur: Token, type: T, topIsDict = false
  for (; pos_ < tokens_.length; before = type, pos_++) {
    cur = tokens_[pos_], type = cur.t
    if (type & (T.prefix | T.action | T.fn) && topIsDict
        && !(before === T.comma && tokens_[pos_ - 2].t === T.ref && tokens_[pos_ - 2].v === kDots)) {
      cur = Token(type = T.ref, (cur as SomeTokens<T.prefix | T.action | T.fn>).v as string as VarLiterals)
    }
    switch (cur.t) {
    case T.block: case T.dict: /* T.block | T.dict: */
      topIsDict = !(before & (T.block | T.blockEnd | T.semiColon | T.prefix | T.groupEnd | T.fn | T.ref | T.literal))
      values_.push(topIsDict ? Op(O.composed, null as never, "{", null) : Op(O.block, null as never, null, null))
      type = topIsDict ? T.dict : T.block,
      Build.NDEBUG || ((tokens_[pos_] as OverriddenToken).w = { n: topIsDict ? "dict" : "block", v: "{", t: type })
      ctx_.push(Token(type, "{"))
      continue
    case T.blockEnd: case T.groupEnd: /* T.blockEnd | T.groupEnd: */
      before & (T.group | T.array | T.dict | (type === T.groupEnd ? T.semiColon : 0))
          ? values_.push(Op(O.comma, [], 0, 0)) : before === T.comma ? ctx_.length-- : 0
      consumeUntil(cur.v === ")" ? T.group : cur.v === "]" ? T.array : T.block | T.dict)
      if (type === T.blockEnd && ctx_[ctx_.length - 1].t === T.dict) {
        type = T.groupEnd, Build.NDEBUG || ((tokens_[pos_] as OverriddenToken).w = { n: "groupEnd", v: "}", t: type })
      }
      consume()
      topIsDict = ctx_[ctx_.length - (ctx_[ctx_.length - 1].t === T.comma ? 2 : 1)].t === T.dict
      type === T.blockEnd && values_[values_.length - 1].o === O.block && consumeUntil(~(T.prefix | T.action | T.fn))
      continue
    case T.semiColon: /* T.semiColon: */ {
      const semiColon = cur.v === ";"
      // here doesn't check `T.group | T.array`
      const mayBreak: boolean = !semiColon && pos_ + 1 < tokens_.length && (before === T.action
            || !!(tokens_[pos_ + 1].t & (T.ref | T.literal | T.fn | T.prefix | T.action | T.unary | T.block))
            || values_[values_.length - 1].o === O.fn && ((values_[values_.length - 1] as BaseOp<O.fn>).y.q === "=>"
                    ? tokens_[pos_ + 1].t !== T.comma : !!(ctx_[ctx_.length - 1].t & (T.block | T.prefix)))
                && (tokens_[pos_ + 1].t === T.math1
                    && ((tokens_ as Token[])[pos_ + 1] = Token(T.unary, tokens_[pos_ + 1].v as TokenValues[T.math1])),
                    true))
      semiColon ? consumeUntil(T.group | T.block) : mayBreak ? consumeUntil(T.comma - 1 | T.question) : 0
      const prev = mayBreak ? ctx_[ctx_.length - 1] : null
      if (semiColon || prev && (prev.t === T.block ? true
          : prev.t === T.action ? before !== T.action || !isVarAction(prev.v) // "throw\n" is a syntax error
          : prev.t === T.prefix && (prev.v === "do" || prev.v === "else" || values_[values_.length - 2].o !== O.block
            || prev.v === "while" && tryInsertPrefix(prev.v, 3) !== false))) {
        semiColon || consumeUntil(T.group | T.block)
        const val = values_[values_.length - 1]
        ; (ctx_[ctx_.length - 1].t === T.group ? val.o === O.stat : val.o < O.stat + 1)
        || values_.push(Op(O.stat, "", null, before & (T.block | T.semiColon | T.group)
            || before === T.blockEnd && (val.o !== O.fn || val.y.q < "f") ? Op(O.comma, [], 0, 0)
            : values_.pop() as ExprLikeOps | SomeOps<O.block | O.stats>))
      } else { // skip "\n"
        type = before, Build.NDEBUG || ((cur as Writable<BaseToken<T.semiColon>>).n = "not-SemiColon")
      }
      } continue
    case T.prefix: /* T.prefix: */
      consumeUntil(T.prefix | T.group | T.block)
      values_.push(Op(O.block, null as never, null, null)) // to recognize soft-semi easier
      ctx_.push(cur)
      continue
    case T.action: /* T.action: */
      (pos_ > tokens_.length - 2 || tokens_[pos_ + 1].t & (T.blockEnd | T.semiColon))
          && "return,break,continue".includes(cur.v) && values_.push(Op(O.comma, [], 0, 0))
      consumeUntil(T.prefix | T.group | T.block); ctx_.push(cur)
      continue
    case T.group: case T.array: /* T.group | T.array: */
      if (topIsDict) { type === T.group && ctx_.push(Token(T.colon, ":"), Token(T.fn, "(){")); topIsDict = false }
      else {
        ctx_[ctx_.length - 1].t & (T.dot | T.fn) && before !== T.fn && consume()
        if (before & (T.groupEnd | T.ref | T.literal)
            || before === T.blockEnd && (1 << values_[values_.length - 1].o) & (1 << O.composed | 1 << O.fn)) {
          ctx_.push(Token(T.callOrAccess, "("))
        }
      }
      ctx_.push(cur)
      continue
    case T.comma: /* T.comma: */
      if (before & (T.comma | T.array)) { values_.push(Op(O.literal, L.array_hole, null, 0)) }
      else if (before === T.groupEnd && values_[values_.length - 1].o === O.comma
          && ctx_[ctx_.length - 1].t & (T.group | T.array)) {
        values_[values_.length - 1] = Op(O.comma, [values_[values_.length - 1]], 0, 0)
      }
      while (ctx_[ctx_.length - 1].t >= T.comma) { consume() }
      ctx_[ctx_.length - 1].t === T.dict && (topIsDict = true)
      ctx_.push(cur)
      continue
    case T.colon: /* T.colon: */
      if (before === T.ref) {
        const top = ctx_[ctx_.length - 1]
        if (top.t === T.block || top.t === T.prefix && (top.v === kLabelled
            || values_[values_.length - 2].o !== O.block)) {
          values_.splice(values_.length - 1, 0, Op(O.block, null as never, null, null))
          ctx_.push(Token(T.prefix, kLabelled))
        }
      }
      consumeUntil(topIsDict ? (T.comma << 1) - 1 | T.question : T.comma - 1 | T.question)
      if (ctx_[ctx_.length - 1].t !== T.prefix) {
        ctx_.push(cur), topIsDict = false
      } else {
        type = T.groupEnd, Build.NDEBUG || ((cur as OverriddenToken).w = Token(T.groupEnd, ")"))
        const prefix = ctx_[ctx_.length - 1].v
        if (prefix === "case" || prefix === "default") {
          values_.push(Op(O.literal, L.plain, null, null))
          consume()
        }
      }
      continue
    case T.fn: /* T.fn: */
      if (cur.v === "fn" && tokens_[pos_ + 1].t === T.ref) {
        ctx_.push(Token(T.fn, `fn ${(tokens_[++pos_] as BaseToken<T.ref>).v}`))
      } else {
        if (tokens_[pos_ + 1].v === "*") { throwSyntax("Unsupported generator") }
        ctx_.push(cur)
      }
      continue
    case T.literal: /* T.literal: */ {
        const val = cur.v
        values_.push(typeof val === "object" && val ? Op(O.literal,val.q,val.x,val.y) : Op(O.literal,L.plain,val,null))
      } continue
    case T.ref: /* T.ref: */
      values_.push(Op(O.ref, cur.v as VarName, 0, 0))
      continue
    case T.callOrAccess: /* T.callOrAccess: */
      if (!Build.NDEBUG && cur.v !== "new") { throwSyntax(`Unexpected token: '${cur.v}'`) }
      if (tokens_[pos_ + 1].t === T.dot) {
        values_.push(Op(O.ref, "new.target", 0, 0))
        pos_ += 2
        type = T.ref
        continue
      }
      break
    case T.math1: /* T.math1 */
      if (before === T.blockEnd
            && !(1 << values_[values_.length - 1].o & (1 << O.composed | 1 << O.fn))) {
          cur = Token(type = T.unary, cur.v as TokenValues[T.math1])
          Build.NDEBUG || ((tokens_[pos_] as OverriddenToken).w = cur)
      }
      break
    case T.compare2: /* T.compare2 */
      if (cur.v === "in") {
          const t1 = ctx_[ctx_.length - (ctx_[ctx_.length - 1].t === T.group ? 2 : 1)]
          if (t1.t === T.action ? isVarAction(t1.v) : t1.t === T.prefix && t1.v === "for"
              && values_[values_.length - 2].o === O.block) {
            cur = Token(type = T.assign, "in"), Build.NDEBUG || ((tokens_[pos_] as OverriddenToken).w = cur)
          }
      }
      break
    case T.dot: /* T.dot */
      if (tokens_[pos_ + 1].t & (T.group | T.array)) {
          cur = Token(type = T.callOrAccess, "?."), Build.NDEBUG || ((tokens_[pos_] as OverriddenToken).w = cur)
      }
      break
    default:
      if (0) { cur.t satisfies T.question | T.assign | T.or | T.and | T.bitOr | T.bitXor | T.bitAnd | T.compare1
          | T.bitMove | T.math2 | T.math3 | T.unary | T.rightUnary }
    }
    {
        const kOpL2R = T.comma | T.bitOr | T.bitXor | T.bitAnd | T.compare1 | T.compare2 | T.bitMove
            | T.math1 | T.math2 | T.math3 | T.dot
        consumeUntil((type & (T.question | T.colon | T.fn | T.assign) ? T.assign << 1
            : type & kOpL2R ? type : type << 1) - 1)
        ctx_.push(cur)
    }
  }
  }
  while (ctx_.length > 1) { consume() }
  return values_.length === 2 && values_[1].o > O.stat && !inNewFunc ? values_[1] as ExprLikeOps
      : (consume(), values_[0]) as StorableBlockOp & { y: null }
}

const getEscapeAnalyser = (): (func: BaseOp<O.fn>) => void => {
  interface WritableTempBlockOp extends Pick<BaseOp<O.block>, "o" | "q"> {
      /** consts */ x: VarName[] | null, /** lets */ y: VarName[] | null }
  const ToVarNames = (out: VarName[], ops: readonly (DeclareOp | DestructurePairOp | ArrayHoleOp)[]): VarName[] => {
    for (let op of ops) {
      op = op.o === O.pair ? op.x : op
      if (op.o === O.ref) {
        out.push(op.q)
      } else if (op.o === O.literal) { /* empty */ }
      else if (op.y.o === O.ref) {
        out.push(op.y.q)
      } else {
        ToVarNames(out, op.y.q)
      }
    }
    return out
  }
  const preScanFnBody = (pureVars: VarName[], block: WritableTempBlockOp | BaseOp<O.stats>): void => {
    const lets: VarName[] = [], consts: VarName[] = [], todos: EvaluatableOps[] = block.q.slice()
    let anyFn = 0, statement: EvaluatableOps | undefined
    while (statement = todos.shift()) {
      if (statement.o !== O.stat) {
        if (statement.o === O.fn && statement.y.q === "fn" && statement.y.x) {
          lets.push(statement.y.x.q), anyFn ||= consts.unshift(kDots)
        }
        continue
      }
      const { q: action, y: value } = statement
      if (isVarAction(action)) {
        ToVarNames(action > "v" ? pureVars :action < "l"?consts:lets, (value as SomeStatementOps<typeof action>["y"]).q)
      } else if (value.o === O.fn) { // for those labelled
        value.y.q === "fn" && value.y.x && (lets.push(value.y.x.q), anyFn ||= consts.unshift(kDots))
      } else {
        if (action === "for" && statement.x.q[0].o === O.stat) {
          const act2 = statement.x.q[0].q
          ToVarNames(act2 === "let" ? (statement.x as WritableTempBlockOp).y = [] : act2 === "var"
              ? pureVars : (statement.x as WritableTempBlockOp).x = [], statement.x.q[0].y.q)
        }
        value.o === O.stat ? todos.push(value)
            : value.o < O.stat && preScanFnBody(pureVars, value as WritableTempBlockOp | BaseOp<O.stats>)
      }
    }
    ; (block as Writable<typeof block>).x = consts.length > 0 ? consts : null
    ; (block as Writable<typeof block>).y = lets.length > 0 ? lets : null
  }
  interface Mapped { /** func */ o: number, /** current */ q: RefOp[], /** previous */ x: RefOp[][], y: VarDecl[] }
  interface VarDecl { /** flags */ o: V, /** func */ q: number, /** mapped */ x: Mapped, /** name */ y: VarName }
  type Scope = VarDecl[]
  const varMap = new Map2<VarName, Mapped | undefined>(), _scopes: Scope[] = []
  let _cur_fn = 1
  const VarDecl = (flag: V.locall | V.localv | V.localc, name: VarName): VarDecl => {
    const mapped = varMap.get(name), decl: VarDecl = { o: flag, q: _cur_fn, x: mapped!, y: name }
    mapped !== void 0 ? (mapped.o = _cur_fn, mapped.x.push(mapped.q), mapped.q = [], mapped.y.push(decl))
        : varMap.set(name, decl.x = { o: _cur_fn, q: [], x: [], y: [decl] })
    return decl
  }
  const Scope = (consts: NullableVarList, lets: NullableVarList): Scope => {
    const scope: Scope = []
    if (consts) for (const i of consts[0] === kDots ? consts.slice(1) : consts) { scope.push(VarDecl(V.localc, i)) }
    if (lets) for (const i of lets) { scope.push(VarDecl(V.locall, i)) }
    _scopes.push(scope)
    return scope
  }
  const exitScope = (op: Omit<BaseOp<O.block>, "q"> | RefOp | BaseOp<O.fnDesc> | DestructuringComposedOp): void => {
    const declarations = _scopes.pop()!, level = _scopes.length, referred = op.o === O.ref ? declarations[0].x.q : null
    declarations.sort((a, b): number => a.o - b.o)
    let i = 0, numbers: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0]
    for (const { o: flags, x: mapped } of declarations) {
      for (const op of mapped.q) {
        ; (op as WritableOp<O.ref>).x = level, (op as WritableOp<O.ref>).y = i
      }
      mapped.x.length>0 ? (mapped.q=mapped.x.pop()!, mapped.o=mapped.y.pop()!.q) : varMap.set(declarations[i].y, void 0)
      numbers[flags]++
      i++
    }
    let [n1, n2, n3, n4, n5, n6] = numbers
    n2 += n1, n3 += n2, n4 += n3, n5 += n4, n6 += n5
    if (op.o === O.ref) {
      (op satisfies RefOp as WritableOp<O.ref>).x = n1, (op as WritableOp<O.ref>).y = referred!.length ? 0 : -1
    } else {
      declarations.length = n6
      ; (op satisfies Omit<BaseOp<O.block>, "q">|BaseOp<O.fnDesc>|DestructuringComposedOp as Writable<typeof op>).y = {
          t: [n1, n2, n3, n4, n5, n6], v: declarations.map(i => i.y) }
    }
  }
  const kFnBuiltinVars: VarList = ["this", "arguments", "new.target"]
  const visit = (op: EvaluatableOps | PairOp): void => {
    switch (op.o) {
    case O.block: /* O.block: */
      if (op.x ?? op.y) {
        Scope((op as WritableTempBlockOp).x, (op as WritableTempBlockOp).y)
        op.q.forEach(visit)
        ; (op as WritableOp<O.block>).x = (op as WritableTempBlockOp).x?.[0] === kDots ? 1 : 0
        exitScope(op satisfies BaseOp<O.block>)
      } else {
        op.q.forEach(visit)
      }
      return
    case O.stat: /* O.stat: */
      if (op.q === "for") {
        const block = op.x as WritableTempBlockOp, scoped = block.x ?? block.y
        scoped && Scope(block.x, block.y)
        block.q.forEach(visit)
        visit(op.y)
        if (scoped) {
          ; (block as WritableOp<O.block>).x = 0
          exitScope(block as typeof op.x satisfies BaseStatementOp<"for">["x"])
        }
        return
      } else if (op.q === "catch" && op.x) {
        Scope(null, ToVarNames([], op.x.o === O.ref ? [op.x] : op.x.q))
        visit(op.x)
        visit(op.y)
        exitScope(op.x satisfies RefOp | DestructuringComposedOp)
        return
      }
      break
    case O.fn: /* O.fn: */
      op.y.q.length > 3 ? Scope(null, [(op as ConcreteFnOp<"fn _">).y.x.q]) : op.y.q === "fn" && op.y.x && visit(op.y.x)
      _cur_fn++
      if (op.x.o === O.block) {
        let pureVars: VarName[] = [], block = op.x as WritableTempBlockOp
        preScanFnBody(pureVars, block)
        if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment) {
          pureVars = [...new Set!(pureVars) as any as Array<VarName>]
        } else if (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Array$$From
            && Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || kHasMap) {
          pureVars = Array.from(new Set!(pureVars) as any as ArrayLike<VarName>)
        } else {
          const map = new Map2<VarName, unknown>()
          pureVars.forEach(map.set.bind(map))
          pureVars = Object.keys(map.m!) as VarName[]
        }
        const lets: VarName[] = block.y ?? []
        op.q && ToVarNames(lets, op.q)
        pureVars = lets.length ? pureVars.filter(i => (Build.MV3 ? !lets.includes(i) : lets.indexOf(i) < 0)) : pureVars
        const scope = Scope(block.x, lets), builtins = op.y.q !== "=>" ? kFnBuiltinVars : null
        for (const i of builtins ? pureVars.concat(builtins) : pureVars) { scope.push(VarDecl(V.localv, i)) }
        const [b0, b1, b2] = builtins ? scope.slice(-3) : [null, null, null] as never
        op.q?.forEach(visit)
        block.q.forEach(visit)
        if (builtins) {
          b0.x.q.length || (b0.o = V.unused), b1.x.q.length || (b1.o = V.unused), b2.x.q.length || (b2.o = V.unused)
        }
        exitScope(op.y satisfies BaseOp<O.fnDesc>)
        ; (block as typeof op.x as WritableOp<O.block>).x = (block as WritableTempBlockOp).x?.[0] === kDots ? 1 : 0
        ; (block as typeof op.x as Writable<typeof op.x>).y = !builtins || (b0.o + b1.o + b2.o === V.unused * 3) ? null
            : [ scope.indexOf(b0), scope.indexOf(b1), scope.indexOf(b2) ]
      } else {
        Scope(null, op.q ? ToVarNames([], op.q) : [])
        op.q?.forEach(visit)
        visit(op.x)
        exitScope(op.y satisfies BaseOp<O.fnDesc>)
      }
      _cur_fn--
      op.y.q.length > 3 && exitScope((op as ConcreteFnOp<"fn _">).y.x satisfies RefOp)
      return
    case O.composed:
      op.q.forEach(visit)
      return
    case O.literal:
      return
    case O.ref: {
      const val = op.q satisfies VarName, mapped = (val as VarName | VarLiterals) !== kDots ? varMap.get(val) : void 0
      if (mapped !== void 0) {
        mapped.q.push(op)
        const decl = mapped.o !== _cur_fn && mapped.o !== 0 ? mapped.y[mapped.y.length - 1] : void 0
        decl !== void 0 && (mapped.o = decl.q = 0, decl.o = V.localc - decl.o)
      } else {
        (op as WritableOp<O.ref>).x = -1
      }
      return
    }
    }
    const { q, x, y } = op
    typeof q !== "object" || !q ? 0 : isArray(q) ? q.forEach(visit) : visit(q)
    typeof x !== "object" || !x ? 0 : visit(x)
    typeof y !== "object" || !y ? 0 : visit(y)
  }
  return visit
}

//#endregion parse syntax tree

//#region evaluate

const enum R { plain = 0, evenNotFound = 1, eveNotInited = 2, noConst = 4, evenNeitherInitedNorFound=6, allowOptional=8}

const throwReference = (name: string | number, isLocal: boolean): never => {
  throw new ReferenceError(isLocal ? `Cannot access '${name}' before initialization` : `${name} is not defined`)
}
const throwType = (error: string): never => { throw new TypeError(error) }
const newException = (noHandler?: 1): NonNullable<typeof g_exc> =>
    g_exc = { g: isolate_, l: locals_.slice(0), d: noHandler ? stackDepth_ : -stackDepth_ }

const StackFrameFromComposedOp = (newVar: RefOp | DestructuringComposedOp, val: unknown
    , parentOp: RefAssignOp | null): void => {
  if (newVar.o === O.ref) {
    const elet = newVar.x!
    StackFrame({ t: [0, elet, elet, elet, 1, 1], v: [newVar.q] }, [newVar.y, val])
  } else {
    StackFrame(newVar.y)
    evalDestructuring(newVar, val, parentOp)
  }
}

const StackFrame = (analysed: AnalysedVars, defined?: readonly unknown[] | null, scopeName?: string): StackFrame|void=>{
  const varDict: VarBindings = []
  let i = 0, end = analysed.t[V.all], el = analysed.t[V.elet], lv = analysed.t[V.localv]
  for (; i < end; i++) {
    varDict.push(i < el || i > lv ? kEmptyValue : void 0)
  }
  for (i = 0, end = defined?.length ?? 0; i < end; i += 2) {
     defined![i] as number >= 0 && (varDict[defined![i] as number] = defined![i + 1])
  }
  const frame: StackFrame = { o: varDict, q: analysed.t, x: analysed.v, y: scopeName ?? null }
  locals_.push(frame)
  if (!Build.NDEBUG) { return frame }
}

const exitFrame = (delta: number): void => {
  for (let i = 0; i < delta; i++) {
    const frame: StackFrame = locals_.pop()!
    frame.o.length = frame.q[V.evar]
  }
}

const _resolveVarRef = (op: RefOp, getter: R): Ref => {
  let level = op.x!
  if (level >= 0) {
    const frame = locals_[level], pos = op.y!, cur = frame.o[pos]
    if (cur === kEmptyValue && !(getter & R.eveNotInited)) { throwReference(op.q, true) }
    return { y: frame.o satisfies unknown[] as number[], i: pos }
  }
  const varName = op.q
  if (level === -1) {
    level = (op as WritableOp<O.ref>).x = varName === "undefined" ? -3
        : varName === "globalThis" ? isolate_ === DefaultIsolate ? -2 : -4
        : (varName as string === kProto || varName as string === "eval") ? isolate_ === DefaultIsolate ? -2 : -5
        : -5
  }
  return level === -2 ? { y: globalVarAccessor, i: varName as string | number as number }
      : level !== -5 ? { y: [(level === -3 ? void 0 : isolate_) as unknown as number], i: 0 }
      : varName in isolate_ || (getter & R.evenNotFound) ? { y: isolate_, i: varName as unknown as number }
      : throwReference(varName, false)
}

const Ref = <T extends R>(op: ExprLikeOps, type: T): T extends R.allowOptional ? RefWithOptional : Ref => {
  switch (op.o) {
  case O.call:
    const ret = innerEvalCall(op, type)
    return { y: ret === kOptionalValue ? ret : [ret], i: 0 } as (ReturnType<typeof Ref<T>>)
  case O.access:
    const ref = Ref(op.x, R.allowOptional), y = ref.y[ref.i]
    if (isLooselyNull(y)) {
      if (ref.y as unknown === kOptionalValue || op.q[0] === "?") { return { y: kOptionalValue as never, i: 0 } }
      throwType(`Cannot read properties of ${y} (reading ${
          AccessToString((typeof op.y === "object" ? opEvals[op.y.o](op.y) : op.y) as string, 1)})`)
    }
    return { y: y as unknown as Ref["y"], i: (typeof op.y === "object" ? opEvals[op.y.o](op.y) : op.y) as number}
  case O.ref: return (/*#__NOINLINE__*/ _resolveVarRef)(op, type)
  default: return { y: [opEvals[op.o](op) as number], i: 0 }
  }
}

const evalTry = (stats: readonly EvaluatableOps[], i: number): TryValue => {
  const statement = stats[i] as BaseStatementOp<"try">, next = stats[i + 1] as SomeStatementOps<"catch" | "finally">
  const indFinal = next.q === "finally" ? i + 1
      : i + 2 < stats.length && stats[i + 2].o === O.stat && stats[i + 2].q === "finally" ? i + 2 : 0
  const oldLocalsPos = locals_.length
  let done: BOOL = 0, res: StatValue = kEmptyValue, res2: StatValue
  try {
    if (next.q !== "catch") { res = evalBlockBody(statement.y); done = 1 }
    else try { res = evalBlockBody(statement.y); done = 1 }
    catch (ex) {
      g_exc || newException()
      exitFrame(locals_.length - oldLocalsPos)
      next.x && StackFrameFromComposedOp(next.x, ex, null)
      res = evalBlockBody(next.y)
      next.x && exitFrame(1); g_exc = null; done = 1
    }
  } finally { if (indFinal) {
    const oldLocals = locals_, oldExc = done ? null : g_exc || newException()
    done || (locals_ = locals_.slice(0, oldLocalsPos), oldExc && (oldExc.d = -Math.abs(oldExc.d)))
    res2 = evalBlockBody((stats[indFinal] as BaseStatementOp<"finally">).y)
    if (res2 !== kEmptyValue) {
      res === kBreakBlock && res !== res2 && ((res as Writable<typeof res>).c = (res as Writable<typeof res>).v = 0)
      res = res2 // even override break
    }
    done || (locals_ = oldLocals, oldExc && (oldExc.d = Math.abs(oldExc.d)))
  } }
  return { c: indFinal || i + 1, v: res }
}

const SubBlock = (op: SomeOps<KStatLikeO>): SomeOps<O.block | O.stats> => {
  return op.o === O.stat ? Op(O.block, [op], null, null) : op
}

const consumeContinue = (res: StatValue, labels: NullableVarList): StatValue =>
    res === kBreakBlock && res.c && (!res.v || (Build.MV3 ? labels?.includes(res.v) : labels&&labels.indexOf(res.v)>=0))
    ? ((res satisfies BreakValue as Writable<typeof res>).c = (res as Writable<typeof res>).v = 0, kEmptyValue) : res

const evalFor = (statement: BaseStatementOp<"for">, labels: NullableVarList): StatValue => {
  const body = statement.y, initOp = statement.x.q[0]
  const analysedScope = statement.x.y
  const forkScope = (): VarBindings => {
    const old = locals_[locals_.length - 1], newVars = old.o.slice()
    exitFrame(1)
    locals_.push({ o: newVars, q: old.q, x: old.x, y: old.y })
    return newVars
  }
  let res: StatValue = kEmptyValue, ref: Writable<Ref> | null
  analysedScope && StackFrame(analysedScope)
  if (statement.x.q.length === 3) {
    initOp.o === O.stat ? evalLet(initOp.q, initOp.y.q, null) : opEvals[initOp.o](initOp)
    for (; opEvals[statement.x.q[1].o](statement.x.q[1])
          ; analysedScope && forkScope(), opEvals[statement.x.q[2].o](statement.x.q[2])) {
      body.o <= O.stat ? res = evalBlockBody(SubBlock(body as StatLikeOps)) : opEvals[body.o](body)
      if ((res = consumeContinue(res, labels)) !== kEmptyValue) { break }
    }
  } else {
    const assignment = (initOp.o === O.stat ? initOp.y.q[0] : initOp) as RefAssignOp
    const source = opEvals[assignment.x.o](assignment.x) as number[] | string | null | undefined
    ref = assignment.y.o === O.composed ? null : _resolveVarRef(assignment.y, analysedScope ? R.eveNotInited : R.plain)
    if (assignment.q === "in") {
      for (let item in source as { [k: number]: unknown }) {
        ref ? (ref.y[ref.i] = item as string | number as number)
            : evalDestructuring(assignment.y as DestructuringComposedOp, item, assignment)
        body.o <= O.stat ? res = evalBlockBody(SubBlock(body as StatLikeOps)) : opEvals[body.o](body)
        if ((res = consumeContinue(res, labels)) !== kEmptyValue) { break }
        analysedScope && (ref ? (ref.y = forkScope() satisfies unknown[] as number[]) : forkScope())
      }
    } else {
      let iterator = evalIter(source, assignment.x), cur: IteratorResult<number> | undefined, ind = 0
      while ((res = consumeContinue(res, labels)) === kEmptyValue
          && (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
              && !kIterator ? ind < source!.length : (cur = iterator!.next(), !cur.done))) {
        const item = Build.BTypes & BrowserType.Chrome && Build.MinCVer<BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
              && !kIterator ? source![ind] : cur!.value
        ref ? (ref.y[ref.i] = item as string | number as number)
            : evalDestructuring(assignment.y as DestructuringComposedOp, item, assignment)
        body.o <= O.stat ? res = evalBlockBody(SubBlock(body as StatLikeOps)) : opEvals[body.o](body)
        analysedScope && (ref ? (ref.y = forkScope() satisfies unknown[] as number[]) : forkScope())
        ind++
      }
    }
  }
  analysedScope && exitFrame(1)
  return res
}

const evalIter = (source: number[] | string | null | undefined, sourceOp: ExprLikeOps): Iterator<number> | void => {
  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
      && !kIterator) {
    if (!source ? source !== "" : source.length == null) {
          throwType(DebugCallee(sourceOp, null, "") + " is not iterable") }
  } else {
    const it = isLooselyNull(source) ? source : source[kIterator!]
    if (typeof it !== "function") { throwType(DebugCallee(sourceOp, null, "") + " is not iterable") }
    return (HasReflect ? Reflect!.apply(it!, source!, []) : evalCall.call.call(it!, source!))as Iterator<number>
  }
}

const evalLet = (action: VarActions | "arg", declarations: readonly DeclareOp[], args: unknown[] | null): void => {
  const appendUndefined = action === "arg" || action === "let"
  let bindings = action === "var" ? null : locals_[locals_.length - 1].o, op: DeclareOp, ind = -1
  for (op of declarations) {
    ind++
    if (args !== null && op.o === O.ref && op.q === kDots) {
      bindings![(declarations[ind + 1] as RefOp).y!] = args.slice(ind)
      break
    }
    if (args !== null && ind < args.length && args[ind] !== void 0) {
      op.o === O.assign ? op.y.o === O.composed ? evalDestructuring(op.y, args[ind], null)
          : (bindings![op.y.y!] = args[ind]) : (bindings![(op satisfies RefOp).y!] = args[ind])
    }
    else if (op.o === O.ref) { appendUndefined && (bindings![op.y!] = void 0) }
    else if (op.y.o === O.composed) {
      evalDestructuring(op.y, opEvals[op.x.o](op.x), op)
    } else {
      (bindings ??= locals_[op.y.x!].o)[op.y.y!] = op.x.o === O.fn
          ? FunctionFromOp(op.x, isolate_, locals_, op.y.q) : opEvals[op.x.o](op.x)
    }
  }
}

const evalDestructuring = (destructOp: DestructuringComposedOp, composed_value: any, parentOp: RefAssignOp|null):void=>{
  if (destructOp.x === "[") {
    let index = 0, iterator = evalIter(composed_value, parentOp ? parentOp.x : )
    for (const op of destructOp.q) {
      if (op.o === O.ref && op.q === kDots) {
        const { y, i } = _resolveVarRef(destructOp.q[index + 1] as RefOp, R.eveNotInited)
        y[i] = [].slice.call(composed_value, index) as unknown as number
        break
      }
      if (op.o === O.literal) {
        if (0) { op.q satisfies L.array_hole }
        
        continue
      }
      const keyOp = op.o === O.ref ? op.q : op.o === O.assign ? op.y.o === O.ref ? op.y.q : index : op.q
      const key: string | number | symbol = evalAccessKey(typeof keyOp === "object" ? opEvals[keyOp.o](keyOp) : keyOp)
      const target: DeclareOp = op.o === O.pair ? op.x : op
      let value = composed_value[key]
      const useDefault = value === void 0 && target.o === O.assign
      if (useDefault) {
        value = opEvals[target.x.o](target.x)
      }
      const ref = target.o === O.ref ? _resolveVarRef(target, R.eveNotInited)
          : target.y.o === O.ref ? _resolveVarRef(target.y, R.eveNotInited)
          : null
      if (ref !== null) {
        ref.y[ref.i] = value
      } else {
        evalDestructuring((target as Exclude<typeof target, RefOp> & { y: BaseOp<O.composed> }).y, value
            , useDefault ? target : Op(O.assign, "=", Op(O.access, "["
                  , parentOp ? parentOp.x : Op(O.ref, `(${kDots})` as VarName, 0, 0)
                  , typeof keyOp === "object" ? keyOp : Op(O.literal, L.plain, keyOp, null))
                , target.y as DestructuringComposedOp) as RefAssignOp)
      }
      index++
    }

  } else {
    const visited = new Map2<string, 1>()
    for (const op of destructOp.q) {
      if (op.o === O.ref && op.q === kDots) {
        // @todo
        break
      }
      const keyOp: string | ExprLikeOps = op.o === O.ref ? op.q : op.o === O.assign ? op.y.q : op.q
      const key: string | number | symbol = evalAccessKey(typeof keyOp === "object" ? opEvals[keyOp.o](keyOp) : keyOp)
      const target: DeclareOp = op.o === O.pair ? op.x : op
      let value = composed_value[key]
      const useDefault = value === void 0 && target.o === O.assign
      if (useDefault) {
        value = opEvals[target.x.o](target.x)
      }
      const ref = target.o === O.ref ? _resolveVarRef(target, R.eveNotInited)
          : target.y.o === O.ref ? _resolveVarRef(target.y, R.eveNotInited)
          : null
      if (ref !== null) {
        ref.y[ref.i] = value
      } else {
        evalDestructuring((target as Exclude<typeof target, RefOp> & { y: BaseOp<O.composed> }).y, value
            , useDefault ? target : Op(O.assign, "=", Op(O.access, "["
                  , parentOp ? parentOp.x : Op(O.ref, `(${kDots})` as VarName, 0, 0)
                  , typeof keyOp === "object" ? keyOp : Op(O.literal, L.plain, keyOp, null))
                , target.y as DestructuringComposedOp) as RefAssignOp)
      }
      visited.set(key as string, 1)
    }
  }
}

const evalBlockBody = (block: SomeOps<O.block | O.stats>, labels?: VarList | 0): StatValue => {
  const statements: readonly EvaluatableOps[] = block.q
  let res: StatValue|TryValue = kEmptyValue, i = 0, statement:EvaluatableOps, prefix:AllStatPrefix, val:StatementOp["y"]
  block.y && StackFrame(block.y as Exclude<typeof block.y, readonly [number, number, number]>)
  for (statement of block.x ? statements : []) {
    const val2 = statement.o === O.stat ? statement.y : statement
    val2.o === O.fn && val2.y.q === "fn" && val2.y.x && (locals_[locals_.length - 1].o[val2.y.x.y!]
        = FunctionFromOp(val2, isolate_, locals_, ""))
  }
  i = 0
  if (labels === 0) {
    let src: unknown = kBreakBlock.v, defaultClause = 0
    kBreakBlock.v = 0
    for (statement of statements) {
      if (statement.o !== O.stat) { /* empty */ }
      else if (statement.q === "case") {
        const val = opEvals[statement.x.o](statement.x)
        if (val === src) { break }
      } else {
        defaultClause || statement.q === "default" && (defaultClause = i + 1)
      }
      i++
    }
    i = i < statements.length ? i + 1 : defaultClause || i
  }
  for (; i < statements.length && res === kEmptyValue; i++) {
    statement = statements[i]
    prefix = statement.o === O.stat ? statement.q : ""
    val = statement.o === O.stat ? statement.y : statement
    switch (prefix) {
    case "do": case "while":
      for (let isDo = prefix === "do", cond = ((isDo ? statements[++i] : statement) as BaseStatementOp<"while">).x
            ; (res = consumeContinue(res, !i && labels || null)) === kEmptyValue
              && (isDo || opEvals[cond.o](cond)); isDo = false) {
        val.o <= O.stat ? (res = evalBlockBody(SubBlock(val as StatLikeOps))) : opEvals[val.o](val)
      }
      // no break;
    case "for":
      if (prefix==="for") { res = /*#__NOINLINE__*/ evalFor(statement as BaseStatementOp<"for">, !i && labels || null) }
      res = res === kBreakBlock && !res.v ? kEmptyValue : res
      break
    case "try":
      res = /*#__NOINLINE__*/ evalTry(statements, i)
      i = res.c; res = res.v
      break
    case "break": case "continue":
      kBreakBlock.c = prefix === "break" ? 0 : 1
      kBreakBlock.v = val.o === O.ref ? val.q : 0
      return kBreakBlock
    case "const": case "let": case "var": evalLet(prefix, (<SomeStatementOps<typeof prefix>>statement).y.q, null); break
    case "return": case "throw":
      res = { c: 2, v: opEvals[val.o](val) }
      if (prefix !== "throw") { return res } else { throw res.v }
    case "labelled":
      labels = (statement as BaseStatementOp<"labelled">).x!.split(" ") as VarList
      val.o <= O.stat ? (res = evalBlockBody(SubBlock(val as StatLikeOps), labels))
          : val.o !== O.fn && opEvals[val.o](val)
      res === kBreakBlock && res.v && (Build.MV3 ? labels.includes(res.v) : labels.indexOf(res.v) >= 0)
          && ((res satisfies BreakValue as Writable<BreakValue>).v = 0, res = kEmptyValue)
      break
    case "switch":
      kBreakBlock.v = opEvals[(statement as BaseStatementOp<"switch">).x.o]((statement as BaseStatementOp<"switch">).x
          ) satisfies unknown as VarName
      res = evalBlockBody(val as BaseStatementOp<"switch">["y"], 0)
      res = res === kBreakBlock && !res.v ? kEmptyValue : res
      break
    default:
      if (0) { prefix satisfies "" | "catch" | "finally" | "else" | "if" | "else if" | "case" | "default" }
      if (!Build.NDEBUG && (prefix === "catch" || prefix === "finally")) { throwType("Error in try/catch") }
      if (prefix !== "if" && prefix !== "else if"
          || opEvals[(statement as SomeStatementOps<"if" | "else if">).x.o]((statement as SomeStatementOps<"if">).x)) {
        val.o <= O.stat ? (res = evalBlockBody(SubBlock(val as StatLikeOps))) : val.o !== O.fn && opEvals[val.o](val)
        while (i + 1 < statements.length && statements[i + 1].o === O.stat
            && (statements[i + 1] as StatementOp).q.startsWith("else")) { i++ }
      }
      break
    }
  }
  block.y && exitFrame(1)
  return res
}

const evalNever = (op: BaseOp<KStatLikeO | O.pair | O.fnDesc>): void => {
  throwSyntax("Can not eval Op::" + (op.o === O.block ? "Block" : op.o === O.stats ? "stats"
      : op.o === O.stat ? "stat" : "Pair") + " directly")
}, baseEvalCommaList = (opList: BaseOp<O.comma>["q"]): unknown[] => {
  let arr: unknown[] = []
  for (let i = 0; i < opList.length; i++) {
    const item = opList[i]
    if (item.o === O.ref && item.q === kDots) {
      ++i
      const subArray = opEvals[opList[i].o](opList[i])
      arr = arr.concat(isArray(subArray) ? subArray : /** throwable */ [].slice.call(subArray))
    } else if (item.o === O.literal && item.q === L.array_hole) {
      arr.length += 1
    } else {
      arr.push(opEvals[opList[i].o](opList[i]))
    }
  }
  return arr
}, evalComma = (op: BaseOp<O.comma>): unknown => {
  const arr = baseEvalCommaList(op.q)
  return arr.length > 0 ? arr[arr.length - 1] : void 0
}, evalFn = (op: BaseOp<O.fn>): unknown => {
  return FunctionFromOp(op, isolate_, locals_, "")
}, evalAssign = (op: BaseOp<O.assign>): unknown => {
  const action = op.q, target = op.y as RefOp | DestructuringComposedOp | BaseOp<O.access>, direct = action === "="
  const { y, i } = target.o !== O.composed ? Ref(target, direct ? R.evenNeitherInitedNorFound : R.plain) : { y:[0],i:0 }
  let x: number = direct ? 0 : y[i]
  if (action === "??=" ? !isLooselyNull(x) : action === "||=" ? x : action === "&&=" ? !x : false) { return x }
  const source = op.x.o !== O.fn ? opEvals[op.x.o](op.x) as number : FunctionFromOp(op.x
      , isolate_, locals_, target.o === O.ref ? target.q : "") as never
  switch (action) {
  case  "+=": x  += source; break; case  "-=": x  -= source; break; case   "*=": x   *= source; break
  case  "/=": x  /= source; break; case  "%=": x  %= source; break; case  "**=": x  **= source; break
  case "<<=": x <<= source; break; case ">>=": x >>= source; break; case ">>>=": x >>>= source; break
  case  "&=": x  &= source; break; case  "^=": x  ^= source; break; case   "|=": x   |= source; break
  default   : x   = source;
    if (0) { action satisfies "=" | "??=" | "&&=" | "||=" | "of" | "in" } break // lgtm [js/unreachable-statement]
  }
  if (target.o === O.composed) { evalDestructuring(target, source, op as RefAssignOp) }
  else if (target.o === O.ref && target.x! >= 0) {
    const analysed = locals_[target.x!].q
    if (target.y! < analysed[V.econst] || target.y! >= analysed[V.locall]) {
      throwType(`Assignment to constant variable '${target.q}'.`)
    }
  }
  return y[i] = x
}, evalIfElse = (op: BaseOp<O.ifElse>): unknown => {
  return opEvals[op.q.o](op.q) ? opEvals[op.x.o](op.x) : opEvals[op.y.o](op.y)
}, evalBinary = (op: BaseOp<O.binary>): unknown => {
  const x = opEvals[op.x.o](op.x) as number, action = op.q
  if (action === "&&" ? !x : action === "||" ? x : action === "??" ? !isLooselyNull(x) : false) { return x }
  const y = opEvals[op.y.o](op.y) as number
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
  const action = op.q, target = op.x, { y, i } = Ref(target, action === "typeof" ? R.evenNotFound : R.plain)
  switch (action) {
  case      "+": return       +y[i]; case  "-": return -y[i]; case "!": return !y[i]; case "~": return ~y[i]
  case "++": return op.y ? y[i]++ : ++y[i]
  case "--": return op.y ? y[i]-- : --y[i]
  case "typeof": return typeof y[i]; case "delete": return target.o === O.ref || delete y[i]
  case "`": {
    const arr: ReturnType<typeof evalAccessKey>[] = []
    for (const i of (target as TemplateOp["x"]).q) { arr.push(evalAccessKey(opEvals[i.o](i))) } // easy to debug
    return arr.join("")
  }
  case "void":
    /*#__NOINLINE__*/ evalAccess(Op(O.access, ".", Op(O.literal, L.plain, y as never, 0)
        , Op(O.literal, L.plain, i as never, 0)))
    // no break;
  default: if (0) { action satisfies "void" } return // lgtm [js/unreachable-statement]
  }
}, innerEvalCall = (op: BaseOp<O.call>, getter: R): unknown => {
  const left = op.x, { y, i } = Ref(left, R.allowOptional), i2 = evalAccessKey(i)
  let func = y[i2 as number] as unknown as { new (...args: unknown[]): object; (...args: unknown[]): unknown }
  if (isLooselyNull(func) && (y as unknown === kOptionalValue || op.y === "?.(")) {
    return getter & R.allowOptional ? kOptionalValue : void 0
  }
  const isNew = op.y === "new", noThis = isNew || left.o !== O.access, args = baseEvalCommaList(op.q)
  if (typeof func !== "function") {
    if (isLooselyNull(func) || func != null) { // here is to detect `document.all`
      throwType(DebugCallee(left, func, i2) + " is not a function")
    }
  } else if (isNew && (func as Function2).__fn && (func as Function2).__fn!.y.q < "f") {
    throwType(DebugCallee(left, func.name, i2) + "is not a constructor")
  }
  if (func === DefaultFunction) { func = /*#__NOINLINE__*/ innerFunction_ as unknown as typeof func }
  if (left.o === O.access && typeof left.y === "string" && args.length) {
    const maybeRe = typeof y === "string" ? op.q[0] : left.x
    const flags = maybeRe.o === O.literal && maybeRe.q === L.regexp && typeof maybeRe.x === "string"
        ? typeof y !== "string" ? "" : (args[0] as RegExp).source : null
    if (flags !== null && !flags.includes("g") && !flags.includes("y")) { // `/a/.test` | `"".replace(/.*/, ...)`
      (maybeRe as WritableLiteralOp<L.regexp>).x = (typeof y === "string" ? args[0] : y) as RegExp
    }
  }
  return (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinTestedES6Environment) && noThis
      ? !isNew ? func(...args) : new func(...args)
      : !isNew ? HasReflect ? Reflect!.apply(func, noThis ? void 0 : y, args)
        : evalCall.apply.bind<(this: (this: 1, arg: 2) => 3, thisArg: 1, x: [2]) => 3>(
              func as (this: 1, arg: 2) => 3)((noThis ? void 0 : y) as unknown as 1, args as [2]) satisfies 3
      : HasReflect ? Reflect!.construct(func, args)
      : args.length === 0 ? new func : args.length === 1 ? new func(args[0])
      : (args.unshift(void 0),
        new (evalCall.bind.apply<new (args: unknown[]) => object, unknown[], new () => object>(func, args)))
}, evalCall = (op: BaseOp<O.call>): unknown => innerEvalCall(op, R.plain)
, evalAccess = (op: SomeOps<O.access>): unknown => {
  const { y, i } = Ref(op, R.plain)
  return y[i]
}, evalComposed = (op: BaseOp<O.composed>): unknown => {
  if (op.x === "[") { return baseEvalCommaList(op.q as ExprLikeOps[]) }
  const Cls = isolate_ !== DefaultIsolate && (isolate_ as unknown as Window).Object || null
  const arr = op.q as SomeOps<O.ref | O.pair>[]
  ; (op as WritableOp<O.composed>).y ??= <BOOL> (+(arr as SomeOps<O.ref | O.pair>[]).every(
        item => item.o === O.ref ? item.q !== kDots : !item.y && (typeof item.q === "string" || item.q.o === O.literal)
            && (item.x.o !== O.fn || item.x.y.q !== "(){" || (typeof item.q === "string"?item.q:item.q.x) === kProto)))
  if (op.y) {
    const obj = (Cls ? new Cls() : {}) as Dict<unknown>
    for (const item of arr) {
      const rawKey = item.q as BaseOp<O.ref>["q"] | Exclude<PairOp["q"], BaseOp<O.comma>>
      const key: string = typeof rawKey === "object" ? (rawKey satisfies SomeLiteralOps<L.plain|L.bigint>).x+"" : rawKey
      const value = item.o === O.ref ? evalRef(item) : item.x.o !== O.fn
          ? opEvals[item.x.o](item.x) : FunctionFromOp(item.x, isolate_, locals_, key)
      obj[key] = value
    }
    return obj
  }
  const props: { [s: string | number | symbol]: PropertyDescriptor & Partial<SafeObject> } = objCreate(null) as any
  let newProto: object | null = (Cls ?? DefaultObject).prototype
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i], isRef = item.o === O.ref
    if (isRef && item.q === kDots) {
      i++
      const src = opEvals[arr[i].o](arr[i])
      if (typeof src === "object" && src !== null) {
        const HasSymbol = !(Build.BTypes & BrowserType.Chrome)
            || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        const GetSymbols = HasSymbol ? 0 as never : DefaultObject.getOwnPropertySymbols
        const symbols = HasSymbol ? DefaultObject.getOwnPropertySymbols!(src) : GetSymbols ? GetSymbols(src) : []
        for (const item of objEntries(src as object)) { props[item[0]] = ValueProperty(item[1], true, true, true) }
        for (const symbol of symbols) {
          const prop = DefaultObject.getOwnPropertyDescriptor(src, symbol)
          if (prop?.enumerable) {
            props[symbol] = ValueProperty(prop.writable !== void 0 ? prop.value : (src as any)[symbol]
                , true, true, true)
          }
        }
      }
      continue
    }
    const key: string | number | symbol = typeof item.q === "string" ? item.q
        : item.q.o === O.literal ? item.q.x + "" : evalAccessKey(opEvals[item.q.o](item.q))
    const prefix: OpValues[O.pair]["y"] = isRef ? null : item.y
    const value = isRef ? evalRef(item) : item.x.o !== O.fn ? opEvals[item.x.o](item.x)
        : FunctionFromOp(item.x, isolate_, locals_, (prefix ? prefix + " " : "") + AccessToString(key))
    const desc: PropertyDescriptor = props[key]
    if (prefix) {
      desc && !("value" in desc) ? desc[prefix] = value as () => unknown
      : props[key] = { configurable: true, enumerable: true, [prefix]: value as () => unknown }
    } else if (key !== kProto || isRef || typeof item.q === "object" && item.q.o !== O.literal
        || item.x.o === O.fn && item.x.y.q === "(){") {
      desc && !("value" in desc) ? desc.value = value : (props[key] = ValueProperty(value, true, true, true))
    } else {
      newProto = value as object | null // a second key of the "__proto__" literal is a syntax error on Chrome 96
    }
  }
  return DefaultObject.create(newProto, props)
}, evalLiteral = (op: LiteralOp): unknown => {
  switch (op.q) {
  case L.plain: return op.x
  case L.regexp: return typeof op.x === "object" ? op.x : new RegExp(op.x, op.y as "")
  case L.bigint:
    return typeof op.x === "bigint" ? op.x : (op as WritableLiteralOp<L.bigint>).x = (<any> DefaultIsolate).BigInt(op.x)
  default: if (0) { op.q satisfies L.array_hole | kTemplateLikeL } return op.x // lgtm [js/unreachable-statement]
  }
}, evalRef = (op: BaseOp<O.ref>): unknown => {
  const { y, i } = _resolveVarRef(op, R.plain)
  return y[i]
}, evalAccessKey = (key: unknown): number | string | symbol => {
  if (typeof key === "object" && key !== null) {
    const ref = {[key as never]: 1}, names = DefaultObject.getOwnPropertyNames(ref)
    return names.length ? names[0] : (!(Build.BTypes & BrowserType.Chrome)
          || Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol || DefaultObject.getOwnPropertySymbols)
        && (DefaultObject.getOwnPropertySymbols!(ref) as never as string[])[0]
        || throwType("Can not parse a valid member key")
  }
  return typeof key === "number" || typeof key === "symbol" ? key : key + ""
}

const opEvals = [
  evalNever, evalNever, evalNever, evalComma, evalNever, evalFn, evalAssign, evalIfElse, evalBinary, evalUnary,
  evalCall, evalAccess, evalComposed, evalLiteral, evalRef, evalNever
] satisfies { [op in keyof OpValues]: (op: SomeOps<op>) => unknown } as {
  [op in keyof OpValues]: <T extends keyof OpValues> (op: BaseOp<T>) => unknown
}

const FunctionFromOp = (fn: BaseOp<O.fn>, globals: Isolate, closures: StackFrame[], name: string): () => unknown => {
  const callable = function (this: unknown): unknown {
    const oldIsolate = isolate_, oldLocals = locals_
    const type = fn.y.q, block = fn.x.o === O.block ? fn.x : null, builtins = block?.y
    let frame: StackFrame | void, done = false
    const newTarget = !(builtins && builtins[2] >= 0 || type < "f") ? void 0
        : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6NewTarget
        ? this instanceof callable ? callable : void 0 : new.target
    if (newTarget && type < "f") { throwType((stdName || "anonymous") + " is not a constructor") }
    isolate_ = globals, locals_ = closures.slice(), g_exc = g_exc && g_exc.d < 0 ? g_exc : null
    const oldLocalsPos = locals_.length
    const stdArgs = fn.q || builtins && builtins[1] >= 0 ? arguments : void 0
    type.length > 3 && StackFrameFromComposedOp((fn as ConcreteFnOp<"fn _">).y.x, callable, null)
    frame = StackFrame(fn.y.y, builtins && [builtins[0], builtins[0] >= 0 ? this : void 0
        , builtins[1], stdArgs, builtins[2], newTarget], stdName)
    ++stackDepth_
    try {
      fn.q && evalLet("arg", fn.q, [].slice.call(stdArgs!))
      const result = block ? evalBlockBody(Op(O.block, block.q, block.x, null))
          : opEvals[fn.x.o](fn.x as Exclude<typeof fn.x, { readonly o: O.block}>) as number
      done = true
      return block ? (result as ReturnType<typeof evalBlockBody>).c === 2 ? (result as StatValue).v : void 0 : result
    } finally {
      done ? g_exc && g_exc.d > 0 && (g_exc = null) : g_exc && g_exc.d >= stackDepth_ || newException(1)
      stackDepth_--
      !Build.NDEBUG && done && (locals_[locals_.length - 1] !== frame)
          && console.log("Vimium C found a bug of stack error when calling `" + (stdName || "anonymous") + "(...)`")
      exitFrame(locals_.length - oldLocalsPos)
      isolate_ = oldIsolate, locals_ = oldLocals
    }
  }
  const stdName: string = fn.y.q > "f" && (fn as ConcreteFnOp<"fn _" | "fn">).y.x?.q || name
  DefaultObject.defineProperties(callable, {
    __fn: ValueProperty(fn, false, false, false),
    toString: ValueProperty(FuncToString, true, false, true),
    length: ValueProperty(fn.q?.length ?? 0, false, false, true),
    name: ValueProperty(stdName, false, false, true)
  })
  closures = closures.slice()
  return callable
}

//#endregion evaluate

//#region stringify

const BinaryStrToT = (tokenStr: TokenValues[BinaryTokens]): keyof TokenValues =>
    tokenStr === "+" || tokenStr === "-" ? T.math1 : gTokens[tokenStr]!.t

const doesNeedWrap = (val: StorableEvaluatableOps, op: ExprLikeOps): boolean => val.o >= O.call
    ? val.o === O.composed && val.x === "{" && (op.o === O.access ? val === op.x : op.o <= O.stat)
    : val.o < op.o ? val.o !== O.block : val.o === op.o && (val.o === O.comma
        || val.o === O.binary && BinaryStrToT(val.q)! < BinaryStrToT((op as BaseOp<O.binary>).q))

const ToWrapped = (op: ExprLikeOps, allowed: number, val: StorableEvaluatableOps): string => {
  const s = ToString(val, allowed)
  return s ? doesNeedWrap(val, op) && !(s[0] === "(" && s.endsWith(")")) ? `(${s})` : s : kUnknown
}

const FnToStr = (op: BaseOp<O.fn>, allowed: number): string => {
  const argsList = !op.q ? "" : ToString(Op(O.comma, op.q,0,0), allowed && (allowed | (1 << O.comma | 1 << O.assign)))
  const body = ToWrapped(op, allowed && op.x.o === O.block ? (allowed | 1 << O.block) : allowed, op.x)
  return (op.y.q < "f" ? "(" : "function " + ((op as ConcreteFnOp<"fn _" | "fn">).y.x?.q ?? "") + "(")
      + (argsList.includes("\n") ? argsList + "\n" : argsList)
      + (op.y.q !== "=>" ? ") " + body
          : op.x.o !== O.block && body.includes("\n") ? ") =>\n  " + replaceAll(body, "\n", "\n  ") : ") => " + body)
}

const ToString = (op: StorableEvaluatableOps, allowed: number): string => {
  let arr: string[]
  if (allowed !== 0 && !((1 << op.o) & allowed) && op.o < O.literal) { return "" }
  switch (op.o) {
  case O.block: case O.stats: /* O.block | O.stats: */
    arr = [], allowed &&= (allowed | 1 << O.block | 1 << O.stats | 1 << O.stat)
    for (const stat of op.q) {
      let x = ToString(stat, allowed).trimLeft()
      x = !x ? stat.o !== O.block ? kUnknown + ";" : "{ ... }"
          : stat.o !== O.stat && stat.o !== O.block && (stat.o !== O.fn || stat.y.q < "f") && !x.endsWith(";")
          ? x + ";" : x
      arr.push(x)
    }
    return arr.length > 0 ? op.o === O.stats ? arr.join("\n")
        : "{\n  " + replaceAll(replaceAll(arr.join("\n"), "\n", "\n  "), "\n  \b", "\n") + "\n}" : "{ }"
  case O.stat: /* O.stat: */ {
    const { q: prefix, x: clause, y: child } = op, hasNoCond = !prefix || isVarAction(prefix) || prefix === kLabelled
    const c = !clause || hasNoCond ? ""
        : prefix !== "for"
        ? ToString(clause as Exclude<typeof clause, BaseStatementOp<"labelled" | VarActions>["x"]>, allowed)
        : clause.q.length === 1 ? ToString(clause.q[0], allowed)
        : (clause.q[0].o === O.comma && clause.q[0].q.length === 0 ? " ;"
            : ToString(clause.q[0], allowed) || (kUnknown + ";")) + " "
          + (ToString(clause.q[1]!, allowed) || kUnknown).trim() + "; "
          + (ToString(clause.q[2]!, allowed) || kUnknown).trim()
    let x = ToString(child, allowed)
    return prefix === "case" ? `\b${prefix} ${c || kUnknown}:` : prefix === "default" ? "\b" + prefix + ":"
        : (hasNoCond ? prefix === kLabelled ? replaceAll(clause, " ", ":\n") + ":" : prefix
            : prefix + (clause ? c ? ` (${c})` : " " + kUnknown : ""))
        + (!x ? child.o !== O.block ? " " + kUnknown + ";" : " { ... }"
          : (x = x.trimLeft(), !prefix ? x : (prefix==="else if" || prefix===kLabelled || gTokens[prefix]!.t===T.prefix)
              && child.o !== O.block && (x.length > 40 || x.includes("\n"))
              ? "\n  " + replaceAll(x, "\n", "\n  ") : x && " " + x)
            + (child.o !== O.block && (child.o !== O.fn || child.y.q < "f") && !x.endsWith(";")
                    && (child.o !== O.comma || child.q.length !== 1 || child.q[0].o !== O.assign
                        || !"in of".includes(child.q[0].q)) && prefix !== kLabelled ? ";" : ""))
    }
  case O.comma: /* O.comma: */
    if (op.q.length === 0) { return " " }
    arr = op.q.map(ToWrapped.bind(null, op, allowed))
    for (let i = 0, j = 0, spreading = false; i < arr.length; i++) {
      const s: string = spreading && op.q[i].o < O.unary && !arr[i].startsWith("(") ? `(${arr[i]})` : arr[i].trim()
      spreading = s === kDots
      arr[i] = s + (i >= arr.length - 1 ? "" : spreading ? " "
          : (j = s.charAt(s.length - 2) === "\n" ? 1 : j + 1, j % 5 == 0) ? ",\n  " : ", ")
    }
    return arr.join("")
  case O.pair: /* O.pair: */
    return (op.y ? op.y + " " : "") + (typeof op.q === "string" ? op.q
            : op.q.o === O.literal ? op.q.q === L.bigint ? op.q.x + "n"
              : typeof op.q.x === "string" ? JSON.stringify(op.q.x) : op.q.x + ""
            : `[${ToWrapped(Op(O.comma, [], 0, 0), allowed, op.q)}]`)
          + (op.x.o !== O.fn || op.x.y.q !== "(){" ? ": " + (ToString(op.x, allowed) || kUnknown)
              : " " + FnToStr(op.x, allowed && (allowed | (1 << O.fn))))
  case O.fn: /* O.fn: */ {
    return op.y.q === "(){" ? ToString(typeof op.y.x === "string" ? Op(O.pair, op.y.x, op, null)
          : Op(O.pair, op.y.x.q, op, op.y.x.y), allowed && (allowed | (1 << O.pair))) : FnToStr(op, allowed)
  }
  case O.assign: /* O.assign: */ return `${ToString(op.y, allowed) || kUnknown} ${op.q} ${
      op.x.o === O.fn ? ToString(op.x, allowed) : ToWrapped(op, allowed, op.x)}`
  case O.ifElse: /* O.ifElse: */ return ToWrapped(op, allowed, op.q)
        + " ? " + ToWrapped(Op(O.fn, 0 as never, 0 as never, 0 as never), allowed, op.x)
        + " : " + ToWrapped(Op(O.fn, 0 as never, 0 as never, 0 as never), allowed, op.y)
  case O.binary: /* O.binary: */ return `${ToWrapped(op, allowed, op.x)} ${op.q} ${ToWrapped(op, allowed, op.y)}`
  case O.unary: /* O.unary: */
    return op.y ? (ToString(op.x, allowed) || kUnknown) + op.q
        : op.q === "`" ? (op as TemplateOp).x.q.map(i => {
          const literal = i.o === O.literal && i.q > L.t_middle - 1 && i.q < L.t_both + 1
              ? i as SomeLiteralOps<kTemplateLikeL> : null
          return literal ? (literal.y ?? replaceAll(JSON.stringify(literal.x).slice(1, -1), "`", "\\`"))
              : ToString(i, allowed && (allowed | (1 << O.binary) | (1 << O.unary) | (1 << O.access)))
        }).join("")
        : op.q + (op.q >= "a" && op.q < "zz" ? " " : "") + (ToString(op.x, allowed) || kUnknown)
  case O.call: /* O.call: */ {
    const args = op.q.length > 0 ? ToString(Op(O.comma, op.q, 0, 0), allowed) || "..." : ""
    return (op.y === "new" ? "new " : "") + ToWrapped(op, allowed, op.x) + (op.y === "?.(" ? op.y : "(") + args + ")"
  }
  case O.access: /* O.access: */
    return (ToWrapped(op, allowed, op.x) || kUnknown) + (op.q.endsWith(".") ? op.q + (op.y as string)
        : op.q + (typeof op.y === "object" ? ToString(op.y, allowed) || kUnknown : JSON.stringify(op.y)) + "]")
  case O.composed: /* O.composed: */
    return op.q.length == 0 ? op.x === "{" ? "{}" : "[]"
        : op.x + " " + ToString(Op(O.comma, op.q, 0, 0), allowed && (allowed | (1 << O.pair) | (1 << O.comma)))
          + (op.x === "{" ? " }" : " ]")
  case O.literal: /* O.literal: */
    return typeof op.x === "string" ? op.q === L.plain ? JSON.stringify(op.x)
          : op.q === L.regexp ? `/${op.x}/${op.y}` : (0 && op.q satisfies L.bigint | kTemplateLikeL, op.x + "n")
        : op.q === L.plain ? op.x + "" : op.q === L.regexp ? `/${op.x.source}/${op.x.flags}`
        : op.q === L.bigint ? op.x + "n" : (0 && (op.q satisfies L.array_hole), " ")
  case O.ref: /* O.ref: */
    return op.q
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
  const func: Function2 = this, priv_fn = typeof func === "function" && func.__fn
  return !priv_fn ? DefaultFunction.prototype.toString.apply(func, arguments)
      : replaceAll(ToString(priv_fn, 0), "\r", "\n")
}

const DebugCallee = (funcOp: ExprLikeOps, funcInst: ((...args: unknown[]) => unknown) | string | null | undefined
    , access: string | number | symbol): string => {
  const allowed = (1 << O.call) | (1 << O.access)
  if (funcOp.o !== O.access) {
    return ToString(funcOp, allowed) || !isLooselyNull(funcInst) && funcInst + "" || "(anonymous)"
  }
  const y = ToString(funcOp.x, allowed) || kUnknown
  const i = typeof funcOp.y !== "object" ? funcOp.y + "" : ToString(funcOp.y, allowed) || AccessToString(access, 1)
  return y + funcOp.q + i + (funcOp.q.endsWith(".") ? "" : "]")
}

//#endregion stringify

//#region exported

const parseArgsAndEnv = (arr: IArguments | string[], globals: Isolate | null): {
  globals: Isolate | null, body: string, args: string[]
} => {
  let i = 0
  while (i < arr.length && typeof arr[i] === "string") { i++ }
  if (i < arr.length) {
    arr[i] && typeof arr[i] === "object" && (globals = arr[i])
  }
  return { globals, body: i > 0 ? arr[i - 1] : "", args: [].slice.call(arr, 0, i - 1) }
}

const baseFunctionCtor = ({ body, globals, args }: ReturnType<typeof parseArgsAndEnv>
    , inNewFunc?: boolean | null | undefined): () => unknown => {
  const tokens = splitTokens(body.replace(<RegExpG> /\r\n?/g, "\n"))
  let tree = parseTree(tokens, inNewFunc)
  const statsNum = tree.o === O.block ? tree.q.length : 1
  if (!Build.NDEBUG && (statsNum > 0)) {
    const serialized = ToString(tree, 0), multipleLines = statsNum > 1 || serialized.includes("\n")
    console.log("Vimium C: parsed a function:" + (!multipleLines && serialized.length > 50 ? "\n " : "")
        , replaceAll(statsNum > 1 ? serialized.slice(1, -1).trimRight()
          : multipleLines ? "\n  " + replaceAll(serialized, "\n", "\n  ") : serialized, "\r", "\n"))
  }
  /*#__NOINLINE__*/ resetRe_()
  if (statsNum === 0 && !inNewFunc) { return (): void => {} }
  if (!inNewFunc && tree.o === O.block) {
    let par: StorableBlockOp = tree, last: EvaluatableOps
    while (last = par.q[par.q.length - 1], last.o === O.block) { par = last }
    if (last.o > O.stat && last.o !== O.fn) {
      (par as WritableOp2<O.block>).q[par.q.length - 1] = Op(O.stat, "return", null, last)
    }
  }
  inNewFunc = inNewFunc !== false && (tree.o === O.block || inNewFunc)
  const op = Op(O.fn, args.length ? args.map((i): RefOp => Op(O.ref, i as VarName, 0, 0)) : null, tree
      , Op(O.fnDesc, inNewFunc ? "fn" : "=>", inNewFunc ? Op(O.ref, <VarName> <string>"anonymous", 0, 0) : null
          , null as never) as OpValues[O.fn]["y"])
  /*#__NOINLINE__*/ getEscapeAnalyser()(op)
  return FunctionFromOp(op, globals ?? isolate_, locals_, "anonymous")
}

const innerFunction_ = function Function(_functionBody: string): () => unknown {
  return baseFunctionCtor(parseArgsAndEnv(arguments, null), true)
}

const innerEval_ = function (_functionBody: string): unknown {
  const func = baseFunctionCtor(parseArgsAndEnv(arguments, null), false)
  return func()
}

/**
 * (...args: [...funcArguments: string[], functionBody: string
 *     , globals?: Isolate | null | undefined, locals?: VarDict | VarDict[] | null | undefined]) => Result
 */
const outerEval_ = <VApiTy["v"] & { [method: string]: unknown }> function (_functionBody: string): unknown {
  const func = baseFunctionCtor(parseArgsAndEnv(arguments, DefaultIsolate), null)
  return func()
}

const doubleEval_mv2 = function (_functionBody: string | object): unknown {
  const info = typeof _functionBody === "object" && _functionBody ? _functionBody as ReturnType<typeof parseArgsAndEnv>
      : parseArgsAndEnv(arguments, null), hasEnv = !Build.MV3 && !!info.globals
  let func: (() => unknown) | null | undefined
  if (!Build.MV3 && NativeFunctionCtor === null && !hasEnv) {
    const ctor = baseFunctionCtor(parseArgsAndEnv(["Function"], DefaultIsolate))() as FunctionConstructor
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
  info.globals ??= DefaultIsolate
  func = baseFunctionCtor(info, null)
  return func()
}

const exposeStack = (stackArray: StackFrame[]): { bindings: VarBindings, vars: VarList, name: string }[] =>
    stackArray.slice().reverse().map(frame => ({ bindings: frame.o, vars: frame.x, name: frame.y ?? "" }))

if (Build.MV3) {
  const browser_ = Build.BTypes&BrowserType.Chrome && (DefaultIsolate as any).chrome || (DefaultIsolate as any).browser
  if (browser_?.runtime?.connect && typeof VApi === "object" && VApi) {
    VApi!.v = outerEval_
  } else {
    (DefaultIsolate as any)[GlobalConsts.kEvalNameInMV3] = outerEval_
  }
} else {
  typeof VApi === "object" && VApi ? VApi!.v = outerEval_
      : (DefaultIsolate as Partial<VApiTy["v"]>).vimiumEval = outerEval_
  outerEval_.vimiumEval = outerEval_
  outerEval_.doubleEval = doubleEval_mv2
  outerEval_["noNative"] = (): void => { NativeFunctionCtor = false }
}
outerEval_["getStack"] = (exc?: boolean): unknown => (exc && !g_exc ? null : {
  stack: exposeStack(exc ? g_exc!.l : locals_),
  depth: exc ? g_exc!.d : stackDepth_, globals: exc ? g_exc!.g : isolate_,
})
outerEval_.tryEval = function (_functionBody: string): ReturnType<VApiTy["v"]["tryEval"]> {
  const info = Build.MV3 ? null as never : parseArgsAndEnv(arguments, null)
  const hasEnv = !Build.MV3 && !!info.globals
  try {
    const result = Build.MV3 ? outerEval_(...(arguments as ArrayLike<unknown> as [string])) : doubleEval_mv2(info)
    return { ok: !Build.MV3 && NativeFunctionCtor && !hasEnv ? 1 : 2, result }
  } catch (error) {
    const native = !Build.MV3 && NativeFunctionCtor && !hasEnv
    Build.NDEBUG || console.log("Vimium C: catch an eval error:", error)
    return { ok: 0, result: error, stack: native ? null : exposeStack(g_exc ? g_exc!.l : []),
      type: native ? "native": "eval", globals: native ? null : g_exc ? g_exc!.g : isolate_
    } as ReturnType<VApiTy["v"]["tryEval"]>
  }
}

if (!(Build.NDEBUG || T.END < 0x80000000 && T.END > 0 )) { alert(`Assert error: wrong kTokenNames`) }
if (!(Build.NDEBUG || kOpNames.length === O.fnDesc + 1)) { alert(`Assert error: wrong fields in kOpNames`) }

//#endregion exported

})()
