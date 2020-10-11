import { settings } from "./store"

declare const enum SedAction {
  NONE = 0, decodeForCopy = 1, decodeMaybeEscaped = 2, unescape = 3,
  upper = 4, lower = 5, normalize = 6, reverseText = 7, base64Decode = 8, base64Encode = 9,
  encode = 10, encodeComp = 11,
}
interface ClipSubItem {
  contexts_: SedContext
  host_: string | null
  match_: RegExp
  retainMatched_: BOOL
  actions_: SedAction[]
  replaced_: string
}

const SedActionMap: Dict<SedAction> & SafeObject = {
  __proto__: null as never,
  atob: SedAction.base64Decode, base64: SedAction.base64Decode, btoa: SedAction.base64Encode,
  base64encode: SedAction.base64Encode,
  decode: SedAction.decodeForCopy, decodeuri: SedAction.decodeForCopy, decodeurl: SedAction.decodeForCopy,
  decodecomp: SedAction.decodeMaybeEscaped, encode: SedAction.encode, encodecomp: SedAction.encodeComp,
  unescape: SedAction.unescape, upper: SedAction.upper, lower: SedAction.lower,
  normalize: SedAction.normalize, reverse: SedAction.reverseText
}

let staticSeds_: ClipSubItem[] | null = null

const parseSeds_ = (text: string): ClipSubItem[] => {
  const result: ClipSubItem[] = []
  for (let line of text.split("\n")) {
    line = line.trim()
    const prefix = (<RegExpOne> /^([a-z]{1,6})([^\x00- A-Za-z\\])/).exec(line)
    if (!prefix) { continue }
    const sep = "\\u" + (prefix[2].charCodeAt(0) + 0x10000).toString(16).slice(1),
    head = prefix[1],
    body = new RegExp(`^((?:\\\\${sep}|[^${sep}])+)${sep}(.*)${sep
        }([a-zD]{0,9})((,[A-Za-z]+|,host=[\\w.*-]+)*)$`
        ).exec(line.slice(prefix[0].length))
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
        let action = SedActionMap[i] || SedAction.NONE
        action && actions.push(action)
      }
    }
    const matchRe = BgUtils_.makeRegexp_(body[1], retainMatched ? flags.replace("g", "") : flags)
    matchRe && result.push({
      contexts_: parseSedKeys_(head),
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

export const parseSedOptions_ = (sed: string | boolean | UserSedOptions | null | undefined): ParsedSedOpts | null => {
  let r: MixedSedOpts | null | undefined, k: string | null | undefined
  return !sed ? null : typeof sed !== "object" ? { r: sed, k: ""}
      : !(r = sed.sed) && !(k = sed.sedKeys || sed.sedKey) ? null
      : !r || typeof r !== "object" ? { r, k } : r.r || r.k ? r : null
}

export const parseSedKeys_ = (keys: string): SedContext => {
  let context = SedContext.NONE
  for (let i = 0; i < keys.length; i++) {
    const ch = keys.charCodeAt(i) & ~kCharCode.CASE_DELTA
    context |= ch < kCharCode.minAlphabet || ch > kCharCode.maxAlphabet ? SedContext.NONE
      : ch === kCharCode.S ? SedContext.copy | SedContext.paste : (1 << (ch - kCharCode.A)) as SedContext
  }
  return context
}

export const substitute_ = (text: string, context: SedContext, mixedSed?: MixedSedOpts | null): string => {
  const notParsed = !mixedSed || typeof mixedSed !== "object"
  let rules = notParsed ? mixedSed as Exclude<typeof mixedSed, ParsedSedOpts> : (mixedSed as ParsedSedOpts).r
  if (rules === false) { return text }
  let arr = staticSeds_ || (staticSeds_ = parseSeds_(settings.get_("clipSub")))
  // note: `sed` may come from options of key mappings, so here always convert it to a string
  if (rules && rules !== true) {
    rules = (rules + "").replace(<RegExpG> /(?!\\) ([a-z]{1,6})(?![\x00- A-Za-z\\])/g, "\n$1")
    arr = arr.concat(parseSeds_(rules))
  }
  context = !notParsed && (mixedSed as ParsedSedOpts).k ? parseSedKeys_((mixedSed as ParsedSedOpts).k!)
      : context
  let parsedUrl: URL | null, host: string | null = "", hostType: number
  for (const item of arr) {
    if (item.contexts_ & context && (!item.host_
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
      if (end < 0) {
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
            : action === SedAction.base64Decode ? BgUtils_.DecodeURLPart_(text, "atob")
            : action === SedAction.base64Encode ? btoa(text)
            : (text = (action === SedAction.normalize || action === SedAction.reverseText)
                  && (Build.MinCVer >= BrowserVer.Min$String$$Normalize || !(Build.BTypes & BrowserType.Chrome)
                      || text.normalize) ? text.normalize() : text,
              action === SedAction.reverseText
              ? (Build.MinCVer < BrowserVer.Min$Array$$From && Build.BTypes & BrowserType.Chrome
                && !Array.from ? text.split("") : Array.from(text)).reverse().join("")
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
  if (!newLenLimit && (value.slice(0, 5).toLowerCase() === "data:" || BgUtils_.isJSUrl_(value))) {
    return BgUtils_.paste_(sed, GlobalConsts.MaxBufferLengthForPastingLongURL) as string
  }
  return reformat_(value, sed)
}

BgUtils_.copy_ = copy_
BgUtils_.paste_ = paste_
BgUtils_.sed_ = substitute_

settings.updateHooks_.clipSub = (): void => { staticSeds_ = null }
