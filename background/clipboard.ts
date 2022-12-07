import {
  CurCVer_, CurFFVer_, OnChrome, OnEdge, OnFirefox, copy_, paste_, substitute_, set_copy_, set_paste_, set_substitute_,
  settingsCache_, updateHooks_, searchEngines_, blank_, runOnTee_
} from "./store"
import * as BgUtils_ from "./utils"
import * as Exclusions from "./exclusions"
import { createSearch_ } from "./normalize_urls"

declare const enum SedAction {
  NONE = 0, decodeForCopy = 1, decode = 1, decodeuri = 1, decodeurl = 1,
  decodeMaybeEscaped = 2, decodecomp = 2, unescape = 3,
  upper = 4, lower = 5, normalize = 6, reverseText = 7, reverse = 7,
  base64Decode = 8, atob = 8, base64 = 9, base64Encode = 9, btoa = 9,
  encode = 10, encodeComp = 11, encodeAll = 12, encodeAllComp = 13,
  camel = 14, camelcase = 14, dash = 15, dashed = 15, hyphen = 15, capitalize = 16, capitalizeAll = 17,
  latin = 18, latinize = 18, latinise = 18, noaccent = 18, nodiacritic = 18, decodeAll = 19,
  json = 20, jsonParse = 21,
  break = 99, stop = 99, return = 99,
}
interface Contexts { normal_: SedContext, extras_: kCharCode[] | null }
interface ClipSubItem {
  readonly contexts_: Contexts; readonly match_: RegExp
  host_: string | ValidUrlMatchers | /** regexp is broken */ -1 | null
  readonly retainMatched_: number; readonly actions_: SedAction[]; readonly replaced_: string
}

const SedActionMap: ReadonlySafeDict<SedAction> = {
  __proto__: null as never,
  atob: SedAction.base64Decode, base64: SedAction.base64Encode, base64decode: SedAction.base64Decode,
  btoa: SedAction.base64Encode, base64encode: SedAction.base64Encode, decodeforcopy: SedAction.decodeForCopy,
  decode: SedAction.decodeForCopy, decodeuri: SedAction.decodeForCopy, decodeurl: SedAction.decodeForCopy,
  decodemaybeescaped: SedAction.decodeMaybeEscaped, decodeall: SedAction.decodeAll,
  decodecomp: SedAction.decodeMaybeEscaped, encode: SedAction.encode, encodecomp: SedAction.encodeComp,
  encodeall: SedAction.encodeAll, encodeallcomp: SedAction.encodeAllComp,
  unescape: SedAction.unescape, upper: SedAction.upper, lower: SedAction.lower,
  capitalize: SedAction.capitalize, capitalizeall: SedAction.capitalizeAll,
  camel: SedAction.camel, camelcase: SedAction.camelcase, dash: SedAction.dash, dashed: SedAction.dash,
  hyphen: SedAction.hyphen,
  normalize: SedAction.normalize, reverse: SedAction.reverseText, reversetext: SedAction.reverseText,
  break: SedAction.return, stop: SedAction.return, return: SedAction.return,
  latin: SedAction.latin, latinize: SedAction.latin, latinise: SedAction.latin,
  noaccent: SedAction.latin, nodiacritic: SedAction.latin,
  json: SedAction.json, jsonparse: SedAction.jsonParse,
} satisfies SafeObject & {
  [key in Exclude<keyof typeof SedAction, "NONE"> as NormalizeKeywords<key>]: (typeof SedAction)[key]
}

let staticSeds_: readonly ClipSubItem[] | null = null

const parseSeds_ = (text: string, fixedContexts: Contexts | null): readonly ClipSubItem[] => {
  const result: ClipSubItem[] = []
  const sepReCache: Map<string, RegExpOne> = new Map()
  for (let line of text.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : "").split("\n")) {
    line = line.trim()
    const prefix = (<RegExpOne> /^([\w\x80-\ufffd]{1,6})([^\x00- \w\\\x7f-\uffff])/).exec(line)
    if (!prefix) { continue }
    let sep = prefix[2], sepRe = sepReCache.get(sep)
    if (!sepRe) {
      const s = "\\u" + (sep.charCodeAt(0) + 0x10000).toString(16).slice(1)
      sepRe = new RegExp(`^((?:\\\\[^]|[^${s}\\\\])+)${s}(.*)${s}([a-z]{0,9})(?:,|$)`)
      sepReCache.set(sep, sepRe)
    }
    const body = sepRe.exec(line = line.slice(prefix[0].length))
    if (!body) { continue }
    const head = prefix[1], flags = body[3], tail = line.slice(body[0].length), actions: SedAction[] = []
    let host: string | null = null, retainMatched: number = 0
    for (const rawI of tail ? tail.split(",") : []) {
      const i = rawI.toLowerCase()
      if (i.startsWith("host=")) {
        host = rawI.slice(5)
      } else if (i.startsWith("match")) {
        retainMatched = Math.max(i.includes("=") && parseInt(i.split("=")[1]) || 1, 1)
      } else {
        let action = SedActionMap[i.replace(<RegExpG> /[_-]/g, "")] || SedAction.NONE
        action && actions.push(action)
      }
    }
    const matchRe = BgUtils_.makeRegexp_(body[1], retainMatched ? flags.replace(<RegExpG> /g/g, "") : flags)
    matchRe && result.push({
      contexts_: fixedContexts || parseSedKeys_(head)!,
      host_: host,
      match_: matchRe,
      retainMatched_: retainMatched,
      actions_: actions,
      replaced_: decodeSlash_(body[2], 1)
    })
  }
  return result
}

const decodeSlash_ = (text: string, numbersInRe?: 1): string =>
    text.replace(<RegExpSearchable<1>> /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[^])|\$0/g,
        (raw, s: string): string =>
            !s ? numbersInRe ? "$&" : raw : s[0] === "x" || s[0] === "u"
            ? (s = String.fromCharCode(parseInt(s.slice(1), 16)), s === "$" ? s + s : s)
            : s === "t" ? "\t" : s === "r" ? "\r" : s === "n" ? "\n"
            : !numbersInRe ? s
            : s === "0" ? "$&" : s >= "1" && s <= "9" ? "$" + s // like r"\1" in sed
            : s // like r"abc\.def" / r"abc\\def"
    )

const convertCaseWithLocale = (text: string, action: SedAction): string => {
  const camel = action === SedAction.camel, dash = action === SedAction.dash, cap = action === SedAction.capitalize
  const capAll = action === SedAction.capitalizeAll
  const re = <RegExpG>
    (OnEdge
      || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    ? camel || dash
      ? /(?:[-_\s\/+\u2010-\u2015]|(\d)|^)([a-z\u03b1-\u03c9]|[A-Z\u0391-\u03a9]+[a-z\u03b1-\u03c9]?)|[\t\r\n\/+]/g
      : cap ? /(\b|_)[a-z\u03b1-\u03c9]/ : capAll ? /(\b|_)[a-z\u03b1-\u03c9]/g : null
    : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
      && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          || !(Build.BTypes & BrowserType.Firefox))
      && (Build.BTypes & ~BrowserType.ChromeOrFirefox)
    ? camel || dash ? /(?:[-_\t\r\n\/+\u2010-\u2015\p{Z}]|(\p{N})|^)(\p{Ll}|\p{Lu}+\p{Ll}?)|[\t\r\n\/+]/ug
      : cap ? /(\b|_)\p{Ll}/u : capAll ? /(\b|_)\p{Ll}/ug : null
    : new RegExp(camel || dash
        ? "(?:[-_\\t\\r\\n/+\\u2010-\\u2015\\p{Z}]|(\\p{N})|^)(\\p{Ll}|\\p{Lu}+\\p{Ll}?)|[\\t\\r\\n/+]"
        : cap || capAll ? "(\\b|_)\\p{Ll}" : "", (cap ? "u" : "ug") as "g"))
  let count = 0, start = 0
  const toLower = (s: string, lower: boolean): string => lower ? s.toLocaleLowerCase!() : s.toLocaleUpperCase!()
  text = camel || dash ? text.replace(re as RegExpG & RegExpSearchable<2>, (s, p, b, i): string => {
    const resetStart = "\t\r\n/+".includes(s[0])
    const isFirst = resetStart || !count++ && text.slice(start, i).toUpperCase() === text.slice(start, i).toLowerCase()
    if (resetStart) { count = 0; start = i + 1 }
    b = !b ? "" : b.length > 2 && b.slice(-1).toLowerCase() === b.slice(-1)
        && !(<RegExpOne> /^e?s\b/).test(text.substr(i + s.length - 1, 3))
        ? dash ? toLower(b.slice(0, -2), true) + "-" + toLower(b.slice(-2), true)
          : toLower(b[0], isFirst) + toLower(b.slice(1, -2), true) + toLower(b.slice(-2, -1), false) + b.slice(-1)
        : dash ? toLower(b, true) : toLower(b[0], isFirst) + toLower(b.slice(1), true)
    return (resetStart ? s[0] : (p || "") + (p || dash && !isFirst ? "-" : "")) + b
  }) : cap || capAll ? text.replace(re as RegExpG & RegExpSearchable<1>, s => toLower(s, false)) : text
  if (dash) {
    text = text.replace(<RegExpG & RegExpSearchable<1>> (OnEdge
      || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      ? /[a-z\u03b1-\u03c9]([A-Z\u0391-\u03a9]+[a-z\u03b1-\u03c9]?)/g
      : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
        && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            || !(Build.BTypes & BrowserType.Firefox))
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      ? /\p{Ll}(\p{Lu}+\p{Ll}?)/u : new RegExp("\\p{Ll}(\\p{Lu}+\\p{Ll})", "ug" as "g"))
    , (s, b, i): string => {
      // s[0] + "-" + toLower(s.slice(1), true))
      b = b.length > 2 && b.slice(-1).toLowerCase() === b.slice(-1)
          && !(<RegExpOne> /^e?s\b/).test(text.substr(i + s.length - 1, 3))
          ? toLower(b.slice(0, -2), true) + "-" + toLower(b.slice(-2), true) : toLower(b, true)
      return s[0] + "-" + b
    })
  }
  return text
}

const latinize = (text: string): string => {
  return text.replace(<RegExpG> (OnEdge
    || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    ? /[\u0300-\u0362]/g
    : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
    && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        || !(Build.BTypes & BrowserType.Firefox))
    && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
    ? /\p{Diacritic}/gu : new RegExp("\\p{Diacritic}", "gu" as "g")), "")
}

const jsonToEmbed = (text: string): string => {
  text = JSON.stringify(text).slice(1, -1)
  /** encode OPs in `parseKeySeq` and `parseEmbeddedOptions` from {@see ./run_keys.ts} */
  text = text.replace(<RegExpG & RegExpSearchable<0>> /[<\s"$%&#()?:+]/g, (s): string => {
    const hex = s.charCodeAt(0) + 0x10000
    return "\\u" + hex.toString(16).slice(1)
  })
  return text
}

const tryParseJSON = (text: string): string => {
  text = text[0] === '"' ? text.slice(1, text.endsWith('"') ? -1 : undefined) : text
  text = text.replace(<RegExpG & RegExpSearchable<0>> /[\r\n\0]/g, s => s < "\n" ? "\\0" : s > "\n" ? "\\r" : "\\n")
  text = `"${text}"`
  try { text = JSON.parse(text) } catch { /* empty */ }
  return text
}

export const parseSedOptions_ = (sed: UserSedOptions): ParsedSedOpts | null => {
  if (sed.$sed != null) { return sed.$sed }
  let r = sed.sed, k = sed.sedKeys || sed.sedKey
  return r == null && (!k && k !== 0) ? null : !r || typeof r !== "object"
      ? sed.$sed = { r: typeof r === "number" ? r + "" : r, k: typeof k === "number" ? k + "" : k }
      : r.r != null || r.k ? r : null
}

const parseSedKeys_ = (keys: string | number | object, parsed?: ParsedSedOpts): Contexts | null => {
  if (typeof keys === "object") {
    return (keys as Contexts).normal_ || (keys as Contexts).extras_ ? keys as Contexts : parsed ? parsed.k = null : null
  }
  let extras_: kCharCode[] | null = null, normal_ = SedContext.NONE
  const keysStr = typeof keys === "number" ? keys + "" : keys
  for (let i = 0; i < keysStr.length; i++) {
    const code = keysStr.charCodeAt(i), ch = code & ~kCharCode.CASE_DELTA
    if (!(ch > kCharCode.maxNotAlphabet && ch < kCharCode.minNotAlphabet)) {
      extras_ || (extras_ = [])
      if (parsed || !extras_.includes(code)) {
        extras_.push(code)
      }
      continue
    }
    normal_ |= ch === kCharCode.S ? SedContext.copy | SedContext.paste : (1 << (ch - kCharCode.A)) as SedContext
  }
  const result = normal_ || extras_ ? { normal_, extras_ } : null
  return parsed ? parsed.k = result : result
}

const intersectContexts = (a: Contexts, b: Contexts): boolean => {
  if (a.normal_ & b.normal_) { return true }
  const e2 = b.extras_
  if (!a.extras_ || !e2) { return false }
  for (const i of a.extras_) {
    if (e2.includes(i)) { return true }
  }
  return false
}

export const doesNeedToSed = (context: SedContext, sed: ParsedSedOpts | null): boolean => {
  if (sed && (sed.r === false || sed.r && sed.r !== true)) { return sed.r !== false }
  // if (!sed || sed.r === false || !sed.k && )
  const contexts: Contexts | null = sed && sed.k && parseSedKeys_(sed.k, sed)
      || (context ? { normal_: context, extras_: null } : null)
  staticSeds_ || contexts && (staticSeds_ = parseSeds_(settingsCache_.clipSub, null))
  for (const item of contexts ? staticSeds_! : []) {
    if (intersectContexts(item.contexts_, contexts!)) {
      return true
    }
  }
  return false
}

const convertJoinedRules = (rules: string): string => {
  return rules.includes("\n") ? rules : !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
  && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsuredLookBehindInRegexp)
  && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinLookBehindInRegexp)
  ? rules.replace(<RegExpG> /(?<!\\) ([\w\x80-\ufffd]{1,6})(?![\x00- \w\\\x7f-\uffff])/g, "\n$1")
  : OnChrome && CurCVer_ > BrowserVer.MinEnsuredLookBehindInRegexp - 1
    || OnFirefox && CurFFVer_ > FirefoxBrowserVer.MinLookBehindInRegexp - 1
  ? rules.replace(new RegExp("(?<!\\\\) ([\\w\\x80-\\ufffd]{1,6})(?![\\x00- \\w\\\\\\x7f-\\uffff])", "g")
      , "\n$1")
  : rules.replace(<RegExpG & RegExpSearchable<1>> /\\ | ([\w\x80-\ufffd]{1,6})(?![\x00- \w\\\x7f-\uffff])/g
      , (s, a): string => s[1] === " " ? s : "\n" + a)
}

set_substitute_((text: string, normalContext: SedContext, mixedSed?: MixedSedOpts | null): string => {
  let rules = !mixedSed || typeof mixedSed !== "object" ? mixedSed : mixedSed.r
  if (rules === false) { return text }
  let arr = staticSeds_ || (staticSeds_ = parseSeds_(settingsCache_.clipSub, null))
  if (rules && (typeof rules === "number"
      || typeof rules === "string" && rules.length <= 6 && !(<RegExpOne> /[^\w\x80-\ufffd]/).test(rules))) {
    mixedSed = { r: null, k: rules }
    rules = null
  }
  let contexts = mixedSed && typeof mixedSed === "object" && (mixedSed.k || mixedSed.k === 0)
      && parseSedKeys_(mixedSed.k, mixedSed) || (normalContext ? { normal_: normalContext, extras_: null } : null)
  // note: `sed` may come from options of key mappings, so here always convert it to a string
  if (rules && rules !== true) {
    contexts || (arr = [])
    arr = parseSeds_(convertJoinedRules(rules + "")
        , contexts || (contexts = { normal_: SedContext.NO_STATIC, extras_: null })).concat(arr)
  }
  for (const item of contexts ? arr : []) {
    if (intersectContexts(item.contexts_, contexts!) && (!item.host_
          || (typeof item.host_ === "string" && (item.host_ = Exclusions.createSimpleUrlMatcher_(item.host_) || -1),
              item.host_ !== -1 && Exclusions.matchSimply_(item.host_, text))
        )) {
      let end = -1
      if (item.retainMatched_) {
        let start = 0, first_group: string | undefined, retain = item.retainMatched_
        text.replace(item.match_ as RegExpOne & RegExpSearchable<0>, function (matched_text): string {
          const args = arguments
          start = args[args.length - 2], end = start + matched_text.length
          first_group = args.length > 2 + retain ? args[retain] || "" : ""
          return ""
        })
        if (end >= 0) {
          const newText = text.replace(item.match_ as RegExpOne, item.replaced_)
          text = newText.slice(start, newText.length - (text.length - end)) || first_group || text.slice(start, end)
        }
      } else if ((item.match_ as RegExpOne).test(text)) {
        end = (item.match_ as RegExpG).lastIndex = 0
        text = text.replace(item.match_ as RegExpG, item.replaced_)
      }
      if (end < 0) {
        continue
      }
      if (!text) { break }
      let doesReturn = false
      for (const action of item.actions_) {
        text = action === SedAction.decodeForCopy ? BgUtils_.decodeUrlForCopy_(text)
            : action === SedAction.decodeMaybeEscaped ? BgUtils_.decodeEscapedURL_(text)
            : action === SedAction.decodeAll ? BgUtils_.decodeEscapedURL_(text, true)
            : action === SedAction.unescape ? decodeSlash_(text)
            : action === SedAction.upper ? text.toLocaleUpperCase!()
            : action === SedAction.lower ? text.toLocaleLowerCase!()
            : action === SedAction.encode ? BgUtils_.encodeAsciiURI_(text)
            : action === SedAction.encodeComp ? BgUtils_.encodeAsciiComponent_(text)
            : action === SedAction.encodeAll ? encodeURI(text)
            : action === SedAction.encodeAllComp ? encodeURIComponent(text)
            : action === SedAction.base64Decode ? BgUtils_.DecodeURLPart_(text, "atob")
            : action === SedAction.base64Encode ? btoa(text)
            : action === SedAction.json ? jsonToEmbed(text)
            : action === SedAction.jsonParse ? tryParseJSON(text)
            : (text = (action === SedAction.normalize || action === SedAction.reverseText || action === SedAction.latin)
                  && (!OnChrome || Build.MinCVer >= BrowserVer.Min$String$$Normalize
                      || text.normalize) ? text.normalize(action === SedAction.latin ? "NFD" : "NFC") : text,
              action === SedAction.reverseText
              ? (OnChrome && Build.MinCVer < BrowserVer.Min$Array$$From
                && !Array.from ? text.split("") : Array.from(text)).reverse().join("")
              : action === SedAction.latin ? latinize(text)
              : action === SedAction.camel || action === SedAction.dash || action === SedAction.capitalize ||
                action === SedAction.capitalizeAll ? convertCaseWithLocale(text, action)
              : text
            )
        doesReturn = action === SedAction.return
      }
      if (doesReturn) { break }
    }
  }
  BgUtils_.resetRe_()
  return text
})

const getTextArea_html = (): HTMLTextAreaElement => {
  const el = (globalThis as MaybeWithWindow).document!.createElement("textarea")
  el.style.position = "absolute"
  el.style.left = "-99px"
  el.style.width = "0"
  OnFirefox && (el.contentEditable = "true")
  return el
}


const format_ = (data: string | any[], join: FgReq[kFgReq.copy]["j"] | undefined, sed: MixedSedOpts | null | undefined
    , keyword: string | null | undefined): string => {
  let pattern: Search.Engine | null | undefined
  const createSearchToCopy = (data: string): string => {
    if (pattern === void 0) { pattern = searchEngines_.map.get(keyword!) || null }
    return pattern ? createSearch_(data.trim().split(BgUtils_.spacesRe_), pattern.url_, pattern.blank_) : data
  }
  if (typeof data !== "string") {
    data = data.map(i => substitute_(i, SedContext.paste, sed))
    if (keyword)
    keyword && (data = data.map(createSearchToCopy))
    data = typeof join === "string" && join.startsWith("json") ? JSON.stringify(data, null, +join.slice(4) || 2)
      : data.join(join !== !!join && (join as string) || "\n") +
        (data.length > 1 && (!join || join === !!join) ? "\n" : "")
    const rules = !sed || typeof sed !== "object" ? sed : sed.r
    if (rules !== false) {
      data = substitute_(data, SedContext.multiline)
    }
    return data
  }
  data = data.replace(<RegExpG> /\xa0/g, " ").replace(<RegExpG & RegExpSearchable<0>> /\r\n?/g, "\n")
  let i = data.charCodeAt(data.length - 1)
  if (i !== kCharCode.space && i !== kCharCode.tab) { /* empty */ }
  else if (i = data.lastIndexOf("\n") + 1) {
    data = data.slice(0, i) + data.slice(i).trimRight()
  } else if ((i = data.charCodeAt(0)) !== kCharCode.space && i !== kCharCode.tab) {
    data = data.trimRight()
  }
  data = substitute_(data, SedContext.copy, sed)
  data = keyword ? createSearchToCopy(data) : data
  return data
}

const reformat_ = (copied: string, sed?: MixedSedOpts | null): string => {
  if (copied) {
  copied = copied.replace(<RegExpG> /\xa0/g, " ")
  copied = substitute_(copied, SedContext.paste, sed)
  }
  return copied
}

let navClipboard: (typeof navigator.clipboard) | undefined

set_copy_(((data, join, sed, keyword): string | Promise<string> => {
  data = format_(data, join, sed, keyword)
  if (!data) { return "" }
  if (Build.MV3 || OnFirefox && (navClipboard || (navClipboard = navigator.clipboard))) {
    return (Build.MV3 ? runOnTee_(kTeeTask.Copy, data, null)
        : navClipboard!.writeText!(data).catch(blank_)).then(() => data as string)
  } else {
    const doc = (globalThis as MaybeWithWindow).document!, textArea = getTextArea_html()
    textArea.value = data
    doc.body!.appendChild(textArea)
    textArea.select()
    doc.execCommand("copy")
    textArea.remove()
    textArea.value = ""
    return data
  }
}) satisfies typeof copy_)

set_paste_(((sed, newLenLimit?: number): string | Promise<string | null> => {
  if (Build.MV3 || OnFirefox && (navClipboard || (navClipboard = navigator.clipboard))) {
    return (Build.MV3 ? runOnTee_(kTeeTask.Paste, null, null)
        : navClipboard!.readText!().catch(() => null)).then(s => s && typeof s === "string"
              ? reformat_(s.slice(0, GlobalConsts.MaxBufferLengthForPastingLongURL), sed) : null)
  }
  const doc = (globalThis as MaybeWithWindow).document!, textArea = getTextArea_html()
  textArea.maxLength = newLenLimit || GlobalConsts.MaxBufferLengthForPastingNormalText
  doc.body!.appendChild(textArea)
  textArea.focus()
  doc.execCommand("paste")
  let value = textArea.value.slice(0, newLenLimit || GlobalConsts.MaxBufferLengthForPastingNormalText)
  textArea.value = ""
  textArea.remove()
  textArea.removeAttribute("maxlength")
  if (!newLenLimit && value.length >= GlobalConsts.MaxBufferLengthForPastingNormalText * 0.8
      && (value.slice(0, 5).toLowerCase() === "data:" || BgUtils_.isJSUrl_(value))) {
    return paste_(sed, GlobalConsts.MaxBufferLengthForPastingLongURL) as string
  }
  return reformat_(value, sed)
}) satisfies typeof paste_)

updateHooks_.clipSub = (): void => { staticSeds_ = null }

if (!Build.NDEBUG) { Object.assign(globalThis as any, { parseSeds_, staticSeds_: () => staticSeds_ }) }
