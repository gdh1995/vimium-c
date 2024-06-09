import {
  get_cOptions, cPort, cRepeat, set_cPort, cKey, keyToCommandMap_, get_cEnv, set_cEnv, OnChrome, curIncognito_,
  set_cKey, set_cOptions, set_runOneMapping_, runOneMapping_, inlineRunKey_, set_inlineRunKey_
} from "./store"
import * as BgUtils_ from "./utils"
import { runtimeError_, getCurWnd } from "./browser"
import { getPortUrl_, safePost, showHUD, getCurFrames_ } from "./ports"
import { createSimpleUrlMatcher_, matchSimply_ } from "./exclusions"
import { extTrans_ } from "./i18n"
import {
  kCmdCxt, normalizedOptions_, envRegistry_, parseOptions_, normalizeCommand_, availableCommands_, makeCommand_
} from "./key_mappings"
import {
  copyCmdOptions, executeCommand, overrideOption, parseFallbackOptions, replaceCmdOptions, runNextCmdBy,
  fillOptionWithMask, concatOptions, overrideCmdOptions, makeFallbackContext
} from "./run_commands"
import C = kBgCmd
import NormalizedEnvCond = CommandsNS.NormalizedEnvCond

declare const enum kStr { RunKeyWithId = "<v-runKey:$1>" }

const DEBUG = 0

const abs = Math.abs
const kRunKeyOptionNames: readonly (Exclude<keyof BgCmdOptions[C.runKey], `$${string}` | `o.${string}`>)[] =
    [ "expect", "keys", "options", "mask" ]
let _loopIdToRunSeq = 0

const collectOptions = (opts: { [key: `o.${string}`]: any }): CommandsNS.Options | null => {
  const o2 = BgUtils_.safeObj_<any>(), others = [] as string[]
  let found = ""
  for (const key in opts) {
    if (key.includes("$")) { /* empty */ }
    else if (!key.startsWith("o.")) {
      kRunKeyOptionNames.includes(key) || others.push(key)
    } else if (key.length > 2) {
      o2[found = key.slice(2)] = opts[key as `o.${string}`]
    }
  }
  for (const key2 of others) {
    o2[found = key2] = opts[key2 as `o.${string}`]
  }
  return found ? o2 : null
}

//#region execute a command when in a special environment

declare const enum EnvMatchResult { interrupt, nextEnv, matched }

const matchEnvRule = (rule: CommandsNS.EnvItem, info: CurrentEnvCache): EnvMatchResult => {
  // avoid sending messages to content scripts - in case a current tab is running slow
  let { host, iframe, fullscreen, element: elSelector, incognito } = rule
  if (host === undefined) {
    host = rule.host = rule.url != null ? rule.url : null
    delete rule.url
  }
  if (incognito != null) {
    if ((curIncognito_ === IncognitoType.true) !== !!incognito) {
      return EnvMatchResult.nextEnv
    }
  }
  if (typeof host === "string") {
    host = rule.host = createSimpleUrlMatcher_(host)
  }
  if (host != null) {
    let url: string | null | undefined | Promise<string> = info.url, slash: number
    if (url != null ? false : host.t === kMatchUrl.Pattern
        ? ["/*", "*"].includes(host.v.p.pathname) && host.v.p.search === "*" && host.v.p.hash === "*"
        : host.t === kMatchUrl.StringPrefix
        && ((slash = host.v.indexOf("/", host.v.indexOf("://") + 3)) === host.v.length - 1 || slash === -1)) {
      const frames = getCurFrames_(), port = frames && frames.top_ || cPort
      url = port ? port.s.url_ : null
    }
    if (url == null && (url = getPortUrl_(null, true)) instanceof Promise) {
      void url.then((s): void => {
        info.url = s || (cPort ? (getCurFrames_()?.top_ || cPort).s.url_
            : /** should not reach here */ "")
        runKeyWithCond(info)
      })
      return EnvMatchResult.interrupt
    }
    if (!matchSimply_(host, url)) { return EnvMatchResult.nextEnv }
  }
  if (iframe != null) {
    if (!cPort && iframe !== false) { return EnvMatchResult.nextEnv }
    if (typeof iframe === "string") {
      iframe = rule.iframe = createSimpleUrlMatcher_(iframe) || true
    }
    if (typeof iframe === "boolean") {
      if (iframe !== !!(cPort && cPort.s.frameId_)) { return EnvMatchResult.nextEnv }
    } else if (!matchSimply_(iframe, cPort.s.url_)) {
      return EnvMatchResult.nextEnv
    }
  }
  if (fullscreen == null) { /* empty */ }
  else if (info.fullscreen == null) {
    getCurWnd(false, (wnd): void => {
      info.fullscreen = !!wnd && wnd.state.includes("fullscreen")
      runKeyWithCond(info)
      return runtimeError_()
    })
    return EnvMatchResult.interrupt
  } else if (!!fullscreen !== info.fullscreen) {
    return EnvMatchResult.nextEnv
  }
  if (elSelector && elSelector !== "*") {
    const selectorArr = typeof elSelector === "string" ? [] : elSelector
    typeof elSelector === "string" && (rule.element = elSelector.split(",").some((s): boolean => {
      s = s[0] === "*" ? s.slice(1) : s
      const hash = s.indexOf("#"), dot = s.indexOf("."), len = s.length
      s && selectorArr.push({
        tag: s.slice(0, hash < 0 ? dot < 0 ? len : dot : dot < 0 ? hash : Math.min(dot, hash)),
        id: hash >= 0 ? s.slice(hash + 1, dot > hash ? dot : len) : "",
        classList: BgUtils_.normalizeClassesToMatch_(dot >= 0 ? s.slice(dot + 1, hash > dot ? hash : len) : "")
      })
      return s === "*" || s.includes(" ")
    }) ? (selectorArr.length = 0, "*") : selectorArr)
    const cur = info.element
    if (!selectorArr.length) { /* empty */ }
    else if (cur == null) {
      cPort && safePost(cPort, { N: kBgReq.queryForRunKey, n: performance.now(), c: info })
      return cPort ? EnvMatchResult.interrupt : EnvMatchResult.nextEnv
    } else if (! selectorArr.some((s): any => cur === 0 ? s.tag === "body" && !s.id && !s.classList :
        (!s.tag || cur[0] === s.tag) && (!s.id || cur[1] === s.id)
        && (!s.classList.length || cur[2].length > 0 && s.classList.every(i => cur[2].includes(i)))
    )) {
      return EnvMatchResult.nextEnv
    }
  }
  return EnvMatchResult.matched
}

const normalizeExpects = (options: KnownOptions<C.runKey>): (NormalizedEnvCond | null)[] => {
  const expected_rules = options.expect
  if (options.$normalized) { return expected_rules as NormalizedEnvCond[] }
  const normalizeKeys = (keys: string | string[] | null | undefined): string[] => {
    return !keys ? [] : typeof keys !== "string" ? (keys instanceof Array ? keys : [])
        : (keys = keys.trim()).includes(" ") ? keys.split(/ +/)
        : BgUtils_.splitWhenKeepExpressions(keys, ",").map(i => i.trim())
  }
  let new_rules: (NormalizedEnvCond | null)[] = []
  if (!expected_rules) { /* empty */ }
  else if (expected_rules instanceof Array) {
    new_rules = expected_rules.map((rule): NormalizedEnvCond | null => rule instanceof Array
        ? { env: rule[0], keys: normalizeKeys(rule[1] as string | string[]), options: rule[2] as Dict<any> }
        : !rule || typeof rule !== "object" ? null
        : { env: rule.env || rule, keys: normalizeKeys(rule.keys), options: rule.options })
  } else if (typeof expected_rules === "object") {
    new_rules = Object.keys(expected_rules).map((name): NormalizedEnvCond => {
      const val = expected_rules[name], isDict = val && typeof val === "object" && !(val instanceof Array)
      return { env: name, keys: normalizeKeys(isDict ? val.keys : val), options: isDict ? val.options : null }
    })
  } else if (typeof expected_rules === "string" && (<RegExpOne> /^[^{].*?[:=]/).test(expected_rules)) {
    const delimiterRe = expected_rules.includes(":") ? <RegExpOne> /:/ : <RegExpOne> /=/
    new_rules = expected_rules.split(expected_rules.includes(";") ? <RegExpG> /[;\s]+/g : <RegExpG> /[,\s]+/g)
        .map(i => i.split(delimiterRe))
        .map((rule): NormalizedEnvCond | null => rule.length !== 2 ? null
              : ({ env: rule[0].trim(), keys: normalizeKeys(rule[1]), options: null }))
  }
  new_rules = new_rules.map((i): NormalizedEnvCond | null =>
      i && i.env && !(OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        && i.env === "__proto__") && (i.keys.length || i.options) ? i : null)
  overrideOption<C.runKey, "expect">("expect", new_rules, options)
  overrideOption<C.runKey, "keys">("keys", normalizeKeys(options.keys), options)
  overrideOption<C.runKey, "$normalized">("$normalized", 1, options)
  return new_rules
}

const normalizeKeySeq = (seq: string): SingleSequence => {
  const optionsPrefix = seq.startsWith("#") ? seq.split("+", 1)[0] : ""
  return { tree: parseKeySeq(seq.slice(optionsPrefix ? optionsPrefix.length + 1 : 0)),
      options: optionsPrefix.length > 1 ? parseEmbeddedOptions(optionsPrefix.slice(1)) : null }
}


interface SingleSequence { tree: ListNode | ErrorNode; options: CommandsNS.RawOptions | null }
/** not call runNextCmd on invalid env/key info, but just show HUD to alert */
export const runKeyWithCond = (info?: CurrentEnvCache): void => {
  const absCRepeat = abs(cRepeat)
  let matched: NormalizedEnvCond | undefined
  const frames = getCurFrames_()
  if (!cPort) {
    set_cPort(frames ? frames.cur_ : null as never)
  }
  info = info || get_cEnv() || {}
  set_cEnv(null)
  const expected_rules = normalizeExpects(get_cOptions<C.runKey, true>())
  for (const normalizedRule of expected_rules) {
    if (!normalizedRule) { continue }
    const ruleName = normalizedRule.env
    let rule: CommandsNS.EnvItem | string | null | undefined = ruleName
    if (typeof rule === "string") {
      if (!envRegistry_) {
        showHUD("No environments have been declared")
        return
      }
      rule = envRegistry_.get(rule)
      if (rule === undefined) {
        showHUD(`No environment named "${ruleName as string}"`)
        return
      }
      if (typeof rule === "string") {
        rule = parseOptions_(rule, 2) as CommandsNS.EnvItem | null
        envRegistry_.set(ruleName as string, rule)
      }
      if (rule === null) { continue }
    }
    const res = matchEnvRule(rule, info)
    if (res === EnvMatchResult.interrupt) { return }
    if (res === EnvMatchResult.matched) {
      matched = normalizedRule
      break
    }
  }
  const keys = (matched && matched.keys.length ? matched.keys : get_cOptions<C.runKey, true>().keys
      ) as (string | SingleSequence)[]
  let seq: string | SingleSequence, keysInd: number
  const sub_name = matched ? typeof matched.env === "string" ? `[${matched.env}]: `
      : `(${expected_rules.indexOf(matched)})` : ""
  if (keys.length === 0) {
    showHUD(sub_name + "Require keys: comma-seperated-string | string[]")
  } else if (absCRepeat > keys.length && keys.length !== 1) {
    showHUD(sub_name + "Has no such a key")
  } else if (seq = keys[keysInd = keys.length === 1 ? 0 : cRepeat > 0 ? absCRepeat - 1 : keys.length - absCRepeat],
      !seq || typeof seq !== "string" && (typeof seq !== "object"
        || !seq.tree || typeof seq.tree !== "object" || typeof seq.tree.t !== "number")) {
    showHUD(sub_name + "The key is invalid")
  } else {
    let repeat = keys.length === 1 ? cRepeat : 1
    if (typeof seq === "string") {
      let mask = get_cOptions<C.runKey, true>().mask
      if (mask != null) {
        const filled = fillOptionWithMask<C.runKey>(seq, mask, "", kRunKeyOptionNames, repeat)
        if (!filled.ok) {
          showHUD((filled.result ? "Too many potential keys" : "No key") + " to fill masks")
          return
        }
        mask = filled.ok > 0; seq = filled.result; repeat = filled.useCount ? 1 : repeat
      }
      seq = normalizeKeySeq(seq)
      mask || (keys[keysInd] = seq)
    }
    const key = seq.tree, options2 = seq.options
    if (key.t === kN.error || ((key satisfies ListNode)).val.length === 0) {
      key.t === kN.error && showHUD(key.val)
      return
    }
    let options = matched && matched.options && typeof matched.options === "object" && matched.options
        || get_cOptions<C.runKey, true>().options
        || (get_cOptions<C.runKey, true>().$masked ? null : collectOptions(get_cOptions<C.runKey, true>()))
    options = concatOptions(options, options2)
    const newIntId = (_loopIdToRunSeq + 1) % 64 || 1
    const $seq: BgCmdOptions[C.runKey]["$seq"] = {
      keys: key, repeat, options, cursor: key, timeout: 0, id: "single",
      fallback: parseFallbackOptions(get_cOptions<C.runKey, true>())
    }
    if (key.val.length > 1 || key.val[0].t !== kN.key) {
      const seqId = kStr.RunKeyWithId.replace("$1", "" + newIntId as "1")
      const fakeOptions: KnownOptions<C.runKey> = { $seq, $then: seqId, $else: "-" + seqId, $retry: -999 }
      $seq.id = seqId
      _loopIdToRunSeq = newIntId
      replaceCmdOptions(fakeOptions)
      keyToCommandMap_.set(seqId, makeCommand_("runKey", fakeOptions as CommandsNS.Options)!)
      runKeyInSeq($seq, 1, info)
    } else {
      if (!Build.NDEBUG && DEBUG) {
        console.log("keySeq[%o]: single(%o) # %o * %o @ %o", newIntId, key.val[0].val, options, repeat, Date.now()%3e5)
      }
      replaceCmdOptions<C.runKey>({ $seq } satisfies KnownOptions<C.runKey> as KnownOptions<C.runKey>)
      onLastKeyInSeq($seq, key.val[0])
      runOneKey(key.val[0], $seq, info)
    }
  }
}

//#endregion

//#region run a key sequence (tree)

/**
 * syntax: a?b+c+2d:(e+-3f?-4g:h+i)?:j
 * * `"-"` only contributes to number prefixes
 * * `"%c" | "$c"` means the outer repeat
 */
declare const enum kN { key = 0, list = 1, ifElse = 2, error = 3 }
interface BaseNode { t: kN; val: unknown; par: Node | null }
interface OneKeyInstance { prefix: string, count: number, key: string, options: CommandsNS.Options | null }
interface KeyNode extends BaseNode { t: kN.key; val: string | OneKeyInstance; par: ListNode }
interface ListNode extends BaseNode { t: kN.list; val: (Node | KeyNode)[] }
interface IfElseNode extends BaseNode { t: kN.ifElse; val: { cond: Node, t: Node | null, f: Node | null}; par: Node }
interface ErrorNode extends BaseNode { t: kN.error; val: string; par: null }
type Node = ListNode | IfElseNode
export const parseKeySeq = (keys: string): ListNode | ErrorNode => {
  const re = <RegExpOne
      > /^([$%][a-zA-Z]\+?)*([\d-]\d*\+?)?([$%][a-zA-Z]\+?)*((<([acmsv]-){0,4}.\w*(:i)?>|[^#()?:+$%-])+|-)(#[^()?:+]*)?/
  let cur: ListNode = { t: kN.list, val: [], par: null }, root: ListNode = cur, last: Node | null
  for (let i = keys.length > 1 ? 0 : keys.length; i < keys.length; i++) {
    switch (keys[i]) {
    case "(":
      last = cur; cur = { t: kN.list, val: [], par: cur }; last.val.push(cur)
      break
    case ")": last = cur; do { last = last.par! } while (last.t === kN.ifElse); cur = last; break
    case "?": case ":":
      last = keys[i] === "?" ? null : cur
      while (last && last.t !== kN.ifElse) { last = last.par }
      if (!last || last.val.f) {
        last = cur.par
        cur.par = { t: kN.ifElse, val: { cond: cur, t: null, f: null },
                    par: last || (root = { t: kN.list, val: [], par: null }) }
        !last ? root.val.push(cur.par)
            : last.t === kN.list ? last.val.splice(last.val.indexOf(cur), 1, cur.par)
            : last.val.t === cur ? last.val.t = cur.par : last.val.f = cur.par
        last = cur.par
      }
      cur = { t: kN.list, val: [], par: last }
      keys[i] === "?" ? last.val.t = cur : last.val.f = cur
      break
    case "+": break
    default:
      while (i < keys.length && !"()?:+".includes(keys[i])) {
        const arr = re.exec(keys.slice(i))
        if (!arr) {
          const err = keys.slice(i)
          return { t: kN.error,
              val: "Invalid item to run: " + (err.length > 12 ? err.slice(0, 11) + "\u2026" : err), par: null }
        }
        let oneKey = arr[0]
        const hash = oneKey.indexOf("#")
        if (hash > 0 && (<RegExpOne> /[#&]#/).test(oneKey.slice(hash))) {
          oneKey = keys.slice(i)
          i = keys.length
        } else if (hash > 0 && (<RegExpOne> /["\[]/).test(oneKey.slice(hash))) {
          const arr = BgUtils_.extractComplexOptions_(keys.slice(i + hash))
          oneKey = oneKey.slice(0, hash) + arr[0]
          i += hash + arr[1]
        } else {
          i += oneKey.length
        }
        cur.val.push({ t: kN.key, val: oneKey, par: cur })
      }
      i--
      break
    }
  }
  if (keys.length === 1) { root.val.push({ t: kN.key, val: keys, par: root }) }
  if (!Build.NDEBUG) { Object.defineProperty(root, "to_json", { get: exprKeySeq }) }
  BgUtils_.resetRe_()
  return root
}

const exprKeySeq = function (this: ListNode): object | string | null {
  const ifNotEmpty = (arr: any[]): any[] | null => arr.some(i => i != null) ? arr : null
  const iter = (node: Node | KeyNode | null): object | string | null => {
    return !node ? null
        : node.t === kN.list ? node.val.length === 1 ? iter(node.val[0])
            : node.val.length === 0 ? null : ifNotEmpty(node.val.map(iter))
        : node.t !== kN.ifElse ? node.val satisfies string | OneKeyInstance
        : { if: iter(node.val.cond), then: iter(node.val.t), else: iter(node.val.f) }
  }
  return iter(this)
}

const nextKeyInSeq = (lastCursor: ListNode | KeyNode, dir: number): KeyNode | null => {
  let down = true, par: ListNode | IfElseNode, ind: number
  let cursor: Node | KeyNode | null = lastCursor
  if (cursor.t === kN.key) {
    par = cursor.par, ind = par.val.indexOf(cursor)
    cursor = ind < par.val.length - 1 && dir > 0 ? par.val[ind + 1] : (down = false, par)
  }
  while (cursor && cursor.t !== kN.key) {
    if (down && cursor.t === kN.list && cursor.val.length > 0) {
      cursor = cursor.val[0]
    } else if (down && cursor.t === kN.ifElse) {
      cursor = cursor.val.cond
    } else if (!cursor.par) {
      cursor = null
      break
    } else if (cursor.par.t === kN.list) {
      par = cursor.par, ind = par.val.indexOf(cursor)
      down = ind < par.val.length - 1
      down && dir < 0 && (dir = 1)
      cursor = down ? par.val[ind + 1] : par
    } else {
      par = cursor.par
      down = cursor === par.val.cond
      cursor = down && (dir > 0 ? par.val.t : (dir = 1, par.val.f)) || (down = false, par)
    }
  }
  return cursor
}

/** Note: this requires a temporary cOptions to modify */
const onLastKeyInSeq = ($seq: BgCmdOptions[C.runKey]["$seq"], cursor: KeyNode | null): void => {
  const runOptions = get_cOptions<C.runKey, true>() as KnownOptions<C.runKey> | null
  const finalFallback = $seq.fallback
  if (cursor && runOptions) { delete runOptions.$then, delete runOptions.$else }
  if (!finalFallback) { return }
  if (cursor) { // ensured no $then/$else in outerFallback
    $seq.options = $seq.options ? Object.assign(finalFallback, $seq.options) : finalFallback
  } else if (runOptions?.$f) {
    finalFallback.$f = makeFallbackContext(finalFallback.$f, 0, runOptions.$f.t)
  }
  runOptions && (runOptions.$f = finalFallback.$f)
}

export const runKeyInSeq = ($seq: BgCmdOptions[C.runKey]["$seq"], dir: number, envInfo: CurrentEnvCache|null): void => {
  const cursor: KeyNode | null = nextKeyInSeq($seq.cursor as ListNode | KeyNode, dir)
  const ifOk = cursor && nextKeyInSeq(cursor, 1), ifFail = cursor && nextKeyInSeq(cursor, -1)
  const isLast = !(cursor && (ifOk || ifFail))
  const finalFallback = $seq.fallback
  const seqId = $seq.id, intSeqId = !Build.NDEBUG && DEBUG ? +(<RegExpOne>/\d+/).exec($seq.id)![0] : -1
  if (isLast) {
    if (!Build.NDEBUG && DEBUG) {
      console.log("keySeq[%o]: last = %o, fallback = %o @ %o", intSeqId, cursor && cursor.val
          , finalFallback, Date.now() % 3e5)
    }
    if (kStr.RunKeyWithId.replace("$1", "" + _loopIdToRunSeq as "1") === $seq.id) {
      _loopIdToRunSeq = Math.max(--_loopIdToRunSeq, 0)
    }
    keyToCommandMap_.delete(seqId)
    clearTimeout($seq.timeout || 0)
    onLastKeyInSeq($seq, cursor)
  } else if (!Build.NDEBUG && DEBUG) {
    console.log("keySeq[%o]: cursor = %o : $then=%o $else=%o @ %o", intSeqId, cursor && cursor.val
        , ifOk && ifOk.val, ifFail && ifFail.val, Date.now() % 3e5)
  }
  let seqOptions = get_cOptions<C.runKey, true>()
  if (!cursor) {
    if (finalFallback && runNextCmdBy(dir > 0 ? 1 : 0, finalFallback, 1)) { return }
    const tip = dir > 0 ? 0 : seqOptions.$f?.t || finalFallback?.$f?.t || 0
    tip && showHUD(extTrans_(`${tip as 99}`))
    return
  }
  const thenPrefix = ifOk && seqOptions.$then ? typeof ifOk.val === "string" ? ifOk.val : ifOk.val.prefix : ""
  const elsePrefix = ifFail && seqOptions.$else ? typeof ifFail.val === "string" ? ifFail.val : ifFail.val.prefix : ""
  const evenLoading = (thenPrefix.includes("$l") ? 1 : 0) + (elsePrefix.includes("$l") ? 2 : 0)
  const noDelay = (thenPrefix.includes("$D") ? 1 : 0) + (elsePrefix.includes("$D") ? 2 : 0)
  if (evenLoading || noDelay) {
    if ($seq.cursor === $seq.keys) {
      overrideCmdOptions<C.runKey>({})
      seqOptions = get_cOptions<C.runKey, true>()
    }
    seqOptions.$then = (evenLoading & 1 ? "$l+" : "") + (noDelay & 1 ? "$D+" : "") + seqOptions.$then
    seqOptions.$else = (evenLoading & 2 ? "$l+" : "") + (noDelay & 2 ? "$D+" : "") + seqOptions.$else
  }
  const timeout = isLast ? 0 : $seq.timeout = setTimeout((): void => {
    const old = keyToCommandMap_.get(seqId)
    const opts2 = old && (old.options_ as KnownOptions<C.runKey>)
    if (opts2 && opts2.$seq && opts2.$seq.timeout === timeout) {
      keyToCommandMap_.delete(seqId)
    }
  }, 30000)
  runOneKey(cursor, $seq, envInfo)
}

//#endregion

//#region run one key node with count and placeholder prefixes and a suffix of inline options

export const parseKeyNode = (cursor: KeyNode): OneKeyInstance => {
  let str = cursor.val
  if (typeof str !== "string") { return str }
  let arr = (<RegExpOne> /^([$%][a-zA-Z]\+?|-)+/).exec(str)
  const isNegative = !!arr && arr[0].includes("-"), allowPlus = !arr || "+-".includes(arr[0].slice(-1))
  const prefix = !arr ? "" : arr[0].replace(<RegExpOne> /[+-]/g, "").replace(<RegExpOne> /%/g, "$")
  str = arr ? str.slice(arr[0].length) : str
  arr = (<RegExpOne> /^\d+/).exec(str)
  const count = (isNegative ? -1 : 1) * (arr && parseInt(arr[0], 10) || 1)
  str = arr ? str.slice(arr[0].length) : str
  str = allowPlus || arr || !str.startsWith("+") ? str : str.slice(1)
  const hashIndex = str.indexOf("#", 1)
  const key = hashIndex > 0 ? str.slice(0, hashIndex) : str
  let options: CommandsNS.RawOptions | null = null
  if (hashIndex > 0 && hashIndex + 1 < str.length) {
    str = str.slice(hashIndex + 1)
    options = parseEmbeddedOptions(str)
  }
  return cursor.val = { prefix, count, key: OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
            && key === "__proto__" ? "<v-__proto__>" : key, options }
}

export const parseEmbeddedOptions = (/** has no prefixed "#" */ str: string): CommandsNS.RawOptions | null => {
  const arrHash = (<RegExpOne> /(^|&)#/).exec(str)
  const rawPart = arrHash ? str.slice(arrHash.index + arrHash[0].length) : ""
  const encodeValue = (s: string): string => (<RegExpOne> /\s/).test(s)
      ? JSON.stringify(s).replace(<RegExpG & RegExpSearchable<0>> /\s/g, BgUtils_.encodeUnicode_) : s
  str = (arrHash ? str.slice(0, arrHash.index) : str).split("&").map((pair): string => {
    const key = pair.split("=", 1)[0], val = pair.slice(key.length)
    return key ? key + (val ? "=" + encodeValue(BgUtils_.DecodeURLPart_(val.slice(1))) : "") : ""
  }).join(" ")
  if (rawPart) {
    const key2 = rawPart.split("=", 1)[0], val2 = rawPart.slice(key2.length)
    str = key2 ? (str ? str + " " : "") + key2 + (val2 ? "=" + encodeValue(val2.slice(1)) : "") : str
  }
  return parseOptions_(str, 2)
}

const runOneKey = (cursor: KeyNode, seq: BgCmdOptions[C.runKey]["$seq"], envInfo: CurrentEnvCache | null): void => {
  const info = parseKeyNode(cursor)
  const isFirst = seq.cursor === seq.keys, hasCount = isFirst || info.prefix.includes("$c")
  const notWait = info.prefix.includes("$W")
  const seqOptions = get_cOptions<C.runKey, true>()
  let options = notWait ? concatOptions(info.options, BgUtils_.safer_({ $then: "", $else: "" }))
      : concatOptions(seq.options, info.options)
  seq.cursor = cursor
  runOneKeyWithOptions(info.key, info.count * (hasCount ? seq.repeat : 1), options, envInfo, null, isFirst)
  if (notWait) {
    setTimeout((): void => {
      replaceCmdOptions(seqOptions)
      runKeyInSeq(seq, 1, null)
    }, 0)
    return
  }
}

const mayBuildVKey = (key: string): boolean => !key.includes("<") && !key.includes(":", 1)
const findMappedVKey = (key: string): CommandsNS.Item | null =>
    mayBuildVKey(key) && keyToCommandMap_.get(`<v-${key}>`) || null

set_runOneMapping_(((key, port, fStatus, baseCount): void => {
  key = key.replace(<RegExpOne> /^([$%][a-zA-Z]\+?)+(?=\S)/, "")
  const arr: null | string[] = (<RegExpOne> /^\d+|^-\d*/).exec(key)
  let count = 1
  if (arr != null) {
    const prefix = arr[0]
    key = key.slice(prefix.length)
    count = prefix !== "-" ? parseInt(prefix, 10) || 1 : -1
  }
  baseCount && (count *= baseCount)
  key = key.replace(<RegExpOne> /^([$%][a-zA-Z]\+?)+(?=\S)/, "")
  let hash = 1
  while (hash = key.indexOf("#", hash) + 1) {
    const slice = key.slice(0, hash - 1)
    if (keyToCommandMap_.has(slice) || findMappedVKey(slice) || (<RegExpI> /^[a-z]+(\.[a-z]+)?$/i).test(slice)) {break}
  }
  set_cPort(port!)
  set_cKey(kKeyCode.None)
  set_cOptions(null)
  if (!Build.NDEBUG && DEBUG) {
    console.log("run one: %o # %o * %o / %o @ %o", hash ? key.slice(0, hash - 1) : key, hash ? key.slice(hash) : null
        , count, fStatus, Date.now() % 3e5)
  }
  runOneKeyWithOptions(hash ? key.slice(0, hash - 1) : key, count, hash ? key.slice(hash) : null, null, fStatus)
}) satisfies typeof runOneMapping_)

const doesInheritOptions = (baseOptions: CommandsNS.Options): boolean => {
  let cur = get_cOptions<C.blank>() as CommandsNS.Options | undefined
  while (cur && cur !== baseOptions) { cur = cur.$o }
  return cur === baseOptions
}

const runOneKeyWithOptions = (key: string, count: number
    , exOptions: CommandsNS.EnvItemOptions | string | null | undefined
    , envInfo: CurrentEnvCache | null, fallbackCounter?: FgReq[kFgReq.nextKey]["f"] | null
    , avoidStackOverflow?: boolean): void => {
  let finalKey = key, registryEntry = !(OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
          && key === "__proto__") && keyToCommandMap_.get(key)
      || mayBuildVKey(key) && keyToCommandMap_.get(finalKey = `<v-${key}>`) || null
  let entryReadonly = true
  if (registryEntry == null && key in availableCommands_) {
    entryReadonly = false
    registryEntry = makeCommand_(key as Exclude<keyof typeof availableCommands_, "__proto__">, null)
  }
  if (registryEntry == null) {
    let desc = (<RegExpOne> /^\w+$/).test(key) ? finalKey : key
    showHUD(`"${desc.length >= 20 ? desc.slice(0, 19) + "\u2026" : desc}" has not been mapped`)
    return
  }
  if (registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_) {
    inlineRunKey_(registryEntry)
    if (doesInheritOptions((registryEntry as CommandsNS.NormalizedItem).options_!)) {
      showHUD('"runKey" should not call itself')
      return
    }
  }
  typeof exOptions === "string" && (exOptions = exOptions ? parseEmbeddedOptions(exOptions) : null)
  const cmdOptions = get_cOptions<C.runKey, true>() as KnownOptions<C.runKey> | null
  const fallOpts = cmdOptions && parseFallbackOptions(cmdOptions)
  const fStatus = cmdOptions && cmdOptions.$f
  if (exOptions && typeof exOptions === "object" || fallOpts || fStatus) {
    const originalOptions = normalizedOptions_(registryEntry)
    registryEntry = entryReadonly ? Object.assign<{}, CommandsNS.Item>({}, registryEntry) : registryEntry
    let newOptions: CommandsNS.RawOptions & NonNullable<CommandsNS.EnvItem["options"]> = BgUtils_.safeObj_()
    exOptions && copyCmdOptions(newOptions, BgUtils_.safer_(exOptions))
    fallOpts && copyCmdOptions(newOptions, BgUtils_.safer_(fallOpts))
    originalOptions && copyCmdOptions(newOptions, originalOptions)
    newOptions.$f = fStatus
    if (exOptions && "$count" in exOptions) {
      newOptions.$count = exOptions.$count
    } else if (originalOptions && "$count" in originalOptions) {
      exOptions && "count" in exOptions || (newOptions.$count = originalOptions.$count)
    }
    (registryEntry as Writable<typeof registryEntry>).options_ = newOptions
    normalizeCommand_(registryEntry, availableCommands_[registryEntry.alias_ === kBgCmd.runKey
        && registryEntry.background_ ? "runKey" : registryEntry.command_])
  }
  BgUtils_.resetRe_()
  if (!Build.NDEBUG && DEBUG) {
    const seq = registryEntry.options_ && typeof registryEntry.options_ === "object"
        ? (registryEntry.options_ as Partial<KnownOptions<C.runKey>>).$seq : null
    if (seq) {
      console.log("run next in keySeq[%o] # $retry=%o * %o / %o @ %o", +(<RegExpOne>/\d+/).exec(seq.id)![0]
          , (registryEntry.options_ as KnownOptions<C.runKey>).$retry, count, fallbackCounter, Date.now() % 3e5)
    } else {
      const alias = registryEntry.alias_, background = !!registryEntry.background_
      const def = (Object.entries!(availableCommands_) as [kCName, CommandsNS.Description][]).find(
          ([_, [defAlias, defBg]]): boolean => defAlias === alias && (defBg === kCmdCxt.bg) === background)!
      console.log("run %o%s # %o * %o / %o @ %o", def[0]
          , registryEntry.command_ !== def[0] ? `(${registryEntry.command_})` : ""
          , registryEntry.options_, count, fallbackCounter, Date.now() % 3e5)
    }
  }
  if (avoidStackOverflow && registryEntry.alias_ === kBgCmd.runKey && registryEntry.background_) {
    setTimeout((): void => {
      set_cEnv(envInfo)
      executeCommand(registryEntry!, count, cKey, cPort, 0, fallbackCounter)
    }, 0)
    return
  }
  set_cEnv(envInfo)
  executeCommand(registryEntry, count, cKey, cPort, 0, fallbackCounter)
}

/** return whether skip it in help dialog or not */
set_inlineRunKey_(((rootRegistry: Writable<CommandsNS.Item>
    , path?: CommandsNS.Item[]): void => {
  /** @note should keep `fullOpts` writable */
  let fullOpts: KnownOptions<C.runKey> & SafeObject | null = normalizedOptions_(rootRegistry)
  if (!fullOpts) { fullOpts = rootRegistry.options_ = BgUtils_.safeObj_() }
  if (fullOpts.$normalized === 2) { return }
  let keyOpts: KnownOptions<C.runKey> & SafeObject = fullOpts, canInline = true
  normalizeExpects(keyOpts)
  keyOpts.$normalized = 2
  let count = 1
  if ((keyOpts as CommandsNS.Options).$count) {
    count = (keyOpts as CommandsNS.Options).$count!
    keyOpts = fullOpts = copyCmdOptions(BgUtils_.safeObj_(), keyOpts) // auto filter out "$count"
  }
  while (keyOpts && normalizeExpects(keyOpts).length === 0 && keyOpts.keys!.length >= 1) {
    let keys = keyOpts.keys as (string | SingleSequence)[], seq = keys[0]
    canInline = canInline && keys.length === 1
    if (typeof seq === "string") {
      let mask = keyOpts.mask
      if (mask != null) {
        keyOpts !== fullOpts && (keyOpts = fullOpts = concatOptions(keyOpts, fullOpts || BgUtils_.safeObj_())!)
        const filled = fillOptionWithMask<C.runKey>(seq, mask, "", kRunKeyOptionNames, 1, fullOpts)
        if (!filled.ok) { return }
        mask = filled.ok > 0; seq = filled.result
        canInline = canInline && (!!filled.value && !filled.useCount && !filled.useDict)
      }
      seq = normalizeKeySeq(seq)
      mask || (keys[0] = seq)
    }
    const first = seq.tree.t === kN.list ? nextKeyInSeq(seq.tree, 1) : null
    if (!first) { return }
    canInline = canInline && (seq.tree as ListNode).val.length === 1 && (seq.tree as ListNode).val[0] === first
    const info = parseKeyNode(first), key = info.key
    const calleeEntry = keyToCommandMap_.get(key) || findMappedVKey(key)
    if (calleeEntry != null && calleeEntry.alias_ === C.runKey && calleeEntry.background_) {
      path || (path = [rootRegistry])
      if (path.includes(calleeEntry)) {
        rootRegistry.alias_ = C.showHUD
        rootRegistry.command_ = "showHUD"
        rootRegistry.options_ = BgUtils_.safer_<KnownOptions<C.showHUD>>({ text: '"runKey" should not call itself' })
        return
      }
      path.push(calleeEntry)
      inlineRunKey_(calleeEntry, path.slice(0))
    }
    const newName = calleeEntry ? calleeEntry.command_ : key in availableCommands_ ? key as kCName : null
    if (!newName) { return }
    const doesContinue = calleeEntry != null && calleeEntry.alias_ === C.runKey && calleeEntry.background_
    if (!doesContinue && !canInline) {
      rootRegistry.command_ = newName
      return
    }
    keyOpts !== fullOpts && (fullOpts = concatOptions(keyOpts, fullOpts)!)
    fullOpts = (fullOpts.options ? copyCmdOptions(BgUtils_.safeObj_(), fullOpts.options as typeof fullOpts)
        : (fullOpts.$masked ? null : collectOptions(fullOpts))) as typeof fullOpts | null // writable again
    let $count = info.options?.$count ?? seq.options?.$count ?? (fullOpts as CommandsNS.Options | null)?.$count
    fullOpts = concatOptions(concatOptions(fullOpts, seq.options), info.options)
    fullOpts = fullOpts && (fullOpts === seq.options || fullOpts === info.options)
        ? copyCmdOptions(BgUtils_.safeObj_(), fullOpts) : fullOpts // writable again
    if (fullOpts && ("count" in fullOpts || $count != null)) {
      $count = $count != null ? parseFloat($count) || 1
          : (parseFloat((fullOpts as CommandsNS.RawOptions).count || 1) || 1)
      delete (fullOpts as CommandsNS.RawOptions).count
    }
    count *= ($count ?? 1) * info.count
    const calleeOptions = calleeEntry && normalizedOptions_(calleeEntry)
    if (!doesContinue) {
      fullOpts = concatOptions(calleeOptions, fullOpts)
      fullOpts && fullOpts === calleeOptions && (fullOpts = copyCmdOptions(BgUtils_.safeObj_(), fullOpts))
      count !== 1 && (((fullOpts || (fullOpts = BgUtils_.safeObj_())) as CommandsNS.Options).$count = count)
      Object.assign(rootRegistry, makeCommand_(newName, fullOpts))
      return
    }
    keyOpts = fullOpts && (fullOpts.keys !== void 0 || fullOpts.expect !== void 0 || fullOpts.mask !== void 0)
        ? fullOpts = concatOptions(calleeOptions, fullOpts)!
        : calleeOptions || BgUtils_.safeObj_()
  }
}) satisfies typeof inlineRunKey_)

//#endregion
