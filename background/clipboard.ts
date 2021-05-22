import { settings } from "./store"

declare const enum SedAction {
  NONE = 0, decodeForCopy = 1, decode = 1, decodeuri = 1, decodeurl = 1,
  decodeMaybeEscaped = 2, decodecomp = 2, unescape = 3,
  upper = 4, lower = 5, normalize = 6, reverseText = 7, reverse = 7,
  base64Decode = 8, atob = 8, base64 = 8, base64Encode = 9, btoa = 9,
  encode = 10, encodeComp = 11, encodeAll = 12, encodeAllComp = 13,
  camel = 14, camelcase = 14, dash = 15, dashed = 15, hyphen = 15, capitalize = 16, capitalizeAll = 17,
}
type Contexts = { normal_: SedContext, extras_: kCharCode[] | null}
interface ClipSubItem {
  readonly contexts_: Contexts; readonly host_: string | null; readonly match_: RegExp
  readonly retainMatched_: BOOL; readonly actions_: SedAction[]; readonly replaced_: string
}

const SedActionMap: ReadonlySafeDict<SedAction> = As_<SafeObject & {
  [key in Exclude<keyof typeof SedAction, "NONE"> as NormalizeKeywords<key>]: (typeof SedAction)[key]
}>({
  __proto__: null as never,
  atob: SedAction.base64Decode, base64: SedAction.base64Decode, base64decode: SedAction.base64Decode,
  btoa: SedAction.base64Encode, base64encode: SedAction.base64Encode, decodeforcopy: SedAction.decodeForCopy,
  decode: SedAction.decodeForCopy, decodeuri: SedAction.decodeForCopy, decodeurl: SedAction.decodeForCopy,
  decodemaybeescaped: SedAction.decodeMaybeEscaped,
  decodecomp: SedAction.decodeMaybeEscaped, encode: SedAction.encode, encodecomp: SedAction.encodeComp,
  encodeall: SedAction.encodeAll, encodeallcomp: SedAction.encodeAllComp,
  unescape: SedAction.unescape, upper: SedAction.upper, lower: SedAction.lower,
  capitalize: SedAction.capitalize, capitalizeall: SedAction.capitalizeAll,
  camel: SedAction.camel, camelcase: SedAction.camelcase, dash: SedAction.dash, dashed: SedAction.dash,
  hyphen: SedAction.hyphen,
  normalize: SedAction.normalize, reverse: SedAction.reverseText, reversetext: SedAction.reverseText,
})

let staticSeds_: readonly ClipSubItem[] | null = null

const parseSeds_ = (text: string, fixedContexts: Contexts | null): readonly ClipSubItem[] => {
  const result: ClipSubItem[] = []
  const sepReCache: Map<string, RegExpOne> = new Map()
  for (let line of text.split("\n")) {
    line = line.trim()
    const prefix = (<RegExpOne> /^([A-Za-z\x80-\ufffd]{1,6})([^\x00- A-Za-z\\\x7f-\uffff])/).exec(line)
    if (!prefix) { continue }
    let sep = prefix[2], sepRe = sepReCache.get(sep)
    if (!sepRe) {
      const s = "\\u" + (sep.charCodeAt(0) + 0x10000).toString(16).slice(1)
      sepRe = new RegExp(`^((?:\\\\${s}|[^${s}])+)${s}(.*)${s}([a-zD]{0,9})((?:,[A-Za-z-]+|,host=[\\w.*-]+)*)$`)
      sepReCache.set(sep, sepRe)
    }
    const head = prefix[1], body = sepRe.exec(line.slice(prefix[0].length))
    if (!body) { continue }
    let suffix = body[3]
    let flags = suffix.replace(<RegExpG> /[dDr]/g, "")
    let actions: SedAction[] = [], host: string | null = null, retainMatched = <BOOL> +suffix.includes("r")
    suffix.includes("d") ? actions.push(SedAction.decodeMaybeEscaped)
        : suffix.includes("D") ? actions.push(SedAction.decodeForCopy) : 0
    for (const i of body[4].toLowerCase().split(",")) {
      if (i.startsWith("host=")) {
        host = i.slice(5)
      } else if (i === "matched") {
        retainMatched = 1
      } else {
        let action = SedActionMap[i.replace(<RegExpG> /-/g, "")] || SedAction.NONE
        action && actions.push(action)
      }
    }
    const matchRe = BgUtils_.makeRegexp_(body[1], retainMatched ? flags.replace("g", "") : flags)
    matchRe && result.push({
      contexts_: fixedContexts || parseSedKeys_(head)!,
      host_: host,
      match_: matchRe,
      retainMatched_: retainMatched,
      actions_: actions,
      replaced_: decodeSlash_(body[2])
    })
  }
  return result
}

const decodeSlash_ = (text: string): string =>
    text.replace(<RegExpSearchable<1>> /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|.)/g,
        (_, s: string): string =>
            s[0] === "x" || s[0] === "u"
            ? (s = String.fromCharCode(parseInt(s.slice(1), 16)), s === "$" ? s + s : s)
            : s === "t" ? "\t" : s === "r" ? "\r" : s === "n" ? "\n"
            : s === "0" ? "$&" : s >= "1" && s <= "9" ? "$" + s // like r"\1" in sed
            : s // like r"abc\.def" / r"abc\\def"
    )

const convertCaseWithLocale = (text: string, action: SedAction): string => {
  const camel = action === SedAction.camel, dash = action === SedAction.dash, cap = action === SedAction.capitalize
  const capAll = action === SedAction.capitalizeAll
  const re = <RegExpG>
    (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || OnOther & BrowserType.Edge)
      || Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      || Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    ? camel || dash
      ? /(?:[-_\s\/+\u2010-\u2015]|(\d)|^)([a-z\u03b1-\u03c9]|[A-Z\u0391-\u03a9]+[a-z\u03b1-\u03c9]?)|[\t\r\n\/+]/g
      : cap ? /(\b|_)[a-z\u03b1-\u03c9]/ : capAll ? /(\b|_)[a-z\u03b1-\u03c9]/g : null
    : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
      && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          || !(Build.BTypes & BrowserType.Firefox))
      && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
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
    text = text.replace(<RegExpG & RegExpSearchable<1>> (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || OnOther & BrowserType.Edge)
      || Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      || Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        && Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox)
        && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      ? /[a-z\u03b1-\u03c9]([A-Z\u0391-\u03a9]+[a-z\u03b1-\u03c9]?)/g
      : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
        && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            || !(Build.BTypes & BrowserType.Firefox))
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      ? /\p{Ll}(\p{Lu}+\p{Ll}?)/ : new RegExp("\\p{Ll}(\\p{Lu}+\\p{Ll})", "ug" as "g"))
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

export const parseSedOptions_ = (sed: UserSedOptions): ParsedSedOpts | null => {
  if (sed.$sed != null) { return sed.$sed }
  let r = sed.sed, k = sed.sedKeys || sed.sedKey
  return r == null && !k ? null
      : !r || typeof r !== "object" ? sed.$sed = { r, k } : r.r != null || r.k ? r : null
}

const parseSedKeys_ = (keys: string | object, parsed?: ParsedSedOpts): Contexts | null => {
  if (typeof keys === "object") {
    return (keys as Contexts).normal_ || (keys as Contexts).extras_ ? keys as Contexts : parsed ? parsed.k = null : null
  }
  let extras_: kCharCode[] | null = null, normal_ = SedContext.NONE
  for (let i = 0; i < keys.length; i++) {
    const code = keys.charCodeAt(i)
    if (code > 0x7f) {
      extras_ || (extras_ = [])
      if (parsed || (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
                      ? extras_.indexOf(code) < 0 : !extras_.includes!(code))) {
        extras_.push(code)
      }
      continue
    }
    const ch = code & ~kCharCode.CASE_DELTA
    normal_ |= ch < kCharCode.minAlphabet || ch > kCharCode.maxAlphabet ? SedContext.NONE
      : ch === kCharCode.S ? SedContext.copy | SedContext.paste : (1 << (ch - kCharCode.A)) as SedContext
  }
  const result = normal_ || extras_ ? { normal_, extras_ } : null
  return parsed ? parsed.k = result : result
}

const intersectContexts = (a: Contexts, b: Contexts): boolean => {
  if (a.normal_ & b.normal_) { return true }
  const e2 = b.extras_
  if (!a.extras_ || !e2) { return false }
  for (const i of a.extras_) {
    if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES6$Array$$Includes
        ?  e2.indexOf(i) >= 0 : e2.includes!(i)) { return true }
  }
  return false
}

export const doesNeedToSed = (context: SedContext, sed: ParsedSedOpts | null): boolean => {
  if (sed && (sed.r === false || sed.r && sed.r !== true)) { return sed.r !== false }
  // if (!sed || sed.r === false || !sed.k && )
  const contexts: Contexts | null = sed && sed.k && parseSedKeys_(sed.k, sed)
      || (context ? { normal_: context, extras_: null } : null)
  staticSeds_ || contexts && (staticSeds_ = parseSeds_(settings.get_("clipSub"), null))
  for (const item of contexts ? staticSeds_! : []) {
    if (intersectContexts(item.contexts_, contexts!)) {
      return true
    }
  }
  return false
}

export const substitute_ = (text: string, normalContext: SedContext, mixedSed?: MixedSedOpts | null): string => {
  const rules = !mixedSed || typeof mixedSed !== "object" ? mixedSed : mixedSed.r
  if (rules === false) { return text }
  let arr = staticSeds_ || (staticSeds_ = parseSeds_(settings.get_("clipSub"), null))
  let contexts = mixedSed && typeof mixedSed === "object" && mixedSed.k && parseSedKeys_(mixedSed.k!, mixedSed)
      || (normalContext ? { normal_: normalContext, extras_: null } : null)
  // note: `sed` may come from options of key mappings, so here always convert it to a string
  if (rules && rules !== true) {
    contexts || (arr = [])
    arr = parseSeds_((rules + "").replace(
          <RegExpG> /(?!\\) ([A-Za-z\x80-\ufffd]{1,6})(?![\x00- A-Za-z\\\x7f-\uffff])/g, "\n$1")
        , contexts || (contexts = { normal_: SedContext.NO_STATIC, extras_: null })).concat(arr)
  }
  let parsedUrl: URL | null, host: string | null = "", hostType: number
  for (const item of contexts ? arr : []) {
    if (intersectContexts(item.contexts_, contexts!) && (!item.host_
          || (host = host !== "" ? host
                : (parsedUrl = BgUtils_.safeParseURL_(text), parsedUrl && parsedUrl.host.toLowerCase()))
              && (hostType = 2 * +item.host_.endsWith(".*") + +item.host_.startsWith("*."),
                  hostType > 2 ? `.${host}.`.includes(item.host_.slice(1, -1))
                  : hostType > 1 ? `${host}.`.startsWith(item.host_.slice(0, -1))
                  : hostType ? `.${host}`.endsWith(item.host_.slice(1)) : host === item.host_)
        )) {
      let end = -1
      if (item.retainMatched_) {
        let start = 0, first_group: string | undefined
        text.replace(item.match_ as RegExpOne & RegExpSearchable<0>, function (matched_text): string {
          const args = arguments
          start = args[args.length - 2], end = start + matched_text.length
          first_group = args.length > 3 ? args[1] : ""
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
      if (end < 0 || !text) {
        continue
      }
      host = ""
      for (const action of item.actions_) {
        text = action === SedAction.decodeForCopy ? BgUtils_.decodeUrlForCopy_(text)
            : action === SedAction.decodeMaybeEscaped ? BgUtils_.decodeEscapedURL_(text)
            : action === SedAction.unescape ? decodeSlash_(text)
            : action === SedAction.upper ? text.toLocaleUpperCase!()
            : action === SedAction.lower ? text.toLocaleLowerCase!()
            : action === SedAction.encode ? BgUtils_.encodeAsciiURI(text)
            : action === SedAction.encodeComp ? BgUtils_.encodeAsciiComponent(text)
            : action === SedAction.encodeAll ? encodeURI(text)
            : action === SedAction.encodeAllComp ? encodeURIComponent(text)
            : action === SedAction.base64Decode ? BgUtils_.DecodeURLPart_(text, "atob")
            : action === SedAction.base64Encode ? btoa(text)
            : (text = (action === SedAction.normalize || action === SedAction.reverseText)
                  && (Build.MinCVer >= BrowserVer.Min$String$$Normalize || !(Build.BTypes & BrowserType.Chrome)
                      || text.normalize) ? text.normalize() : text,
              action === SedAction.reverseText
              ? (Build.MinCVer < BrowserVer.Min$Array$$From && Build.BTypes & BrowserType.Chrome
                && !Array.from ? text.split("") : Array.from(text)).reverse().join("")
              : action === SedAction.camel || action === SedAction.dash || action === SedAction.capitalize ||
                action === SedAction.capitalizeAll ? convertCaseWithLocale(text, action)
              : text
            )
      }
    }
  }
  BgUtils_.resetRe_()
  return text
}

const getTextArea_ = (): HTMLTextAreaElement => {
  const el = document.createElement("textarea")
  el.style.position = "absolute"
  el.style.left = "-99px"
  el.style.width = "0"
  Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
    && (el.contentEditable = "true")
  return el
}

const format_ = (data: string | any[], join?: FgReq[kFgReq.copy]["j"], sed?: MixedSedOpts | null): string => {
  if (typeof data !== "string") {
    data = join === "json" ? JSON.stringify(data, null, 2) : data.join(join !== !!join && (join as string) || "\n") +
        (data.length > 1 && (!join || join === !!join) ? "\n" : "")
  }
  data = data.replace(BgUtils_.A0Re_, " ").replace(<RegExpG & RegExpSearchable<0>> /[ \t]+(\r\n?|\n)|\r\n?/g, "\n")
  let i = data.charCodeAt(data.length - 1)
  if (i !== kCharCode.space && i !== kCharCode.tab) { /* empty */ }
  else if (i = data.lastIndexOf("\n") + 1) {
    data = data.slice(0, i) + data.slice(i).trimRight()
  } else if ((i = data.charCodeAt(0)) !== kCharCode.space && i !== kCharCode.tab) {
    data = data.trimRight()
  }
  data = substitute_(data, SedContext.copy, sed)
  return data
}

const reformat_ = (copied: string, sed?: MixedSedOpts | null): string => {
  if (copied) {
  copied = copied.replace(BgUtils_.A0Re_, " ")
  copied = substitute_(copied, SedContext.paste, sed)
  }
  return copied
}

export const copy_: typeof BgUtils_.copy_ = Build.BTypes & BrowserType.Firefox && navigator.clipboard
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
? (data, join, sed): string => {
  data = format_(data, join, sed)
  data && navigator.clipboard!.writeText!(data)
  return data
} : (data, join, sed): string => {
  data = format_(data, join, sed)
  if (data) {
    const doc = document, textArea = getTextArea_()
    textArea.value = data
    doc.documentElement!.appendChild(textArea)
    textArea.select()
    doc.execCommand("copy")
    textArea.remove()
    textArea.value = ""
  }
  return data
}

export const paste_: typeof BgUtils_.paste_ = !settings.CONST_.AllowClipboardRead_ ? () => null
: Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
? (sed): Promise<string | null> | null => {
  const clipboard = navigator.clipboard
  return clipboard ? clipboard.readText!().then(s => reformat_(
      s.slice(0, GlobalConsts.MaxBufferLengthForPastingLongURL), sed), () => null) : null
} : (sed, newLenLimit?: number): string => {
  const textArea = getTextArea_()
  textArea.maxLength = newLenLimit || GlobalConsts.MaxBufferLengthForPastingNormalText
  document.documentElement!.appendChild(textArea)
  textArea.focus()
  document.execCommand("paste")
  let value = textArea.value.slice(0, newLenLimit || GlobalConsts.MaxBufferLengthForPastingNormalText)
  textArea.value = ""
  textArea.remove()
  textArea.removeAttribute("maxlength")
  if (!newLenLimit && value.length >= GlobalConsts.MaxBufferLengthForPastingNormalText * 0.8
      && (value.slice(0, 5).toLowerCase() === "data:" || BgUtils_.isJSUrl_(value))) {
    return BgUtils_.paste_(sed, GlobalConsts.MaxBufferLengthForPastingLongURL) as string
  }
  return reformat_(value, sed)
}

BgUtils_.copy_ = copy_
BgUtils_.paste_ = paste_
BgUtils_.sed_ = substitute_

settings.updateHooks_.clipSub = (): void => { staticSeds_ = null }
