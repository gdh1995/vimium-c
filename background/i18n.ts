import { CurCVer_ } from "./store"
import { fetchFile_ } from "./utils"
import { browser_, Q_ } from "./browser"
import type * as i18n_map from "../_locales/en/messages.json"
import type * as i18n_dyn from "../i18n/zh/background.json"

type ValidI18nFiles = "background" | "help_dialog"
export type ExtNames = keyof typeof i18n_map
export type I18nNames = keyof typeof i18n_dyn

let extPayload_: Map<string, string>
export let i18nReadyExt_: Promise<void> | BOOL = Build.MV3 && Build.MinCVer < BrowserVer.MinBg$i18n$$getMessage$InMV3
    && CurCVer_ < BrowserVer.MinBg$i18n$$getMessage$InMV3 ? 0 : 1
let i18nPayload_: Map<string, string>
let ready_: Promise<void> | BOOL = 0

export const contentI18n_: string[] = []

export const extTrans_: (msg: ExtNames) => string | Promise<string>
  = !(Build.MV3 && Build.MinCVer < BrowserVer.MinBg$i18n$$getMessage$InMV3
    && CurCVer_ < BrowserVer.MinBg$i18n$$getMessage$InMV3)
  ? (msg: string): string => browser_.i18n.getMessage(msg)
  : (msg: string): string | Promise<string> => i18nReadyExt_ === 1 ? extPayload_.get(msg)!
    : (i18nReadyExt_ || loadExt_()).then(extTrans_.bind(0, msg as ExtNames))

export const trans_ = (name: I18nNames, args?: (string | number)[]): string | Promise<string> => {
  if (ready_ === 1) {
    const val = i18nPayload_.get(name)
    return args != null && val
        ? val.replace(<RegExpG & RegExpSearchable<0>> /\$\d/g, (i): string => args[+i[1] - 1] as string)
        : val || ""
  } else {
    ready_ || (ready_ = getI18nJson("background").then((obj): void => { i18nPayload_ = obj, ready_ = 1 }))
    return ready_.then(trans_.bind(null, name, args))
  }
}

export const transEx_ = (name: I18nNames, args: (string | [I18nNames] | number | Promise<string | number>)[]
    ): string | Promise<string> => {
  args.forEach((i, ind, arr) => { if (i instanceof Array) {
    const name = i[0]
    arr[ind] = ready_ === 1 ? i18nPayload_.get(name) || name : (trans_(name) as Promise<string>).then(j => j || name)
  } })
  if (!args.some(i => i instanceof Promise)) {
    return trans_(name, args as (string | number)[])
  } else {
    const p = Promise.all(args as (string | number | Promise<string | number>)[])
    const p2 = ready_ === 1 ? p : (ready_ || trans_("NS") as Promise<string>).then(() => p)
    return p2.then((newArgs) => trans_(name, newArgs) as string)
  }
}

type RawExtDict = Map<ExtNames, { message: string }>
const loadExt_ = (): Promise<void> => {
  return i18nReadyExt_ = Promise.all([
    (fetchFile_("/_locales/en/messages.json") as Promise<RawExtDict>), Q_(browser_.i18n.getAcceptLanguages)
  ]).then(([enDict, wanted]): Promise<RawExtDict[]> | RawExtDict[] => {
    let all = ((enDict.get("i18nAll") || {}).message || "").split(" "), i = ""
    for (i of wanted || []) {
      all.includes(i) || all.includes(i = i.split("-")[0]) || (i = "")
      if (i) { break }
    }
    if (!i) { return [enDict] }
    return Promise.all([enDict, fetchFile_(`/_locales/${i}/messages.json`)])
  }).then((arr): void => {
    extPayload_ = new Map<string, string>()
    i18nReadyExt_ = 1
    for (let i of arr) {
      for (let [k, v] of (i as any).entries() as [string, { message: string }][]) {
        extPayload_.set(k, v.message)
      }
    }
  })
}

export const transPart_ = (msg: "t(i18n)" | "t(sugs)", child: string | null): string => {
  return msg && msg.split(" ").reduce((old, i) => old ? old : !i.includes("=") ? i
      : child && i.startsWith(child) ? i.slice(child.length + 1) : old, "")
}

export const i18nLang_ = (id?: ValidI18nFiles): string => {
  let msg2 = extTrans_("i18n") as "t(i18n)"
  return transPart_(msg2, id || "background") || extTrans_("lang1") as string || "en"
}

export const getI18nJson = (file_name: ValidI18nFiles): Promise<Map<string, string>> => {
  if (Build.MV3 && i18nReadyExt_ === 0) {
    return loadExt_().then(getI18nJson.bind(0, file_name))
  }
  return fetchFile_(`/i18n/${i18nLang_(file_name)}/${file_name}.json`)
}

export let loadContentI18n_: (() => void) | null = (): void => {
  const arr: string[] = contentI18n_, args = ["$1", "$2", "$3", "$4"]
  for (let i = 0; i < kTip.INJECTED_CONTENT_END; i++) {
    arr.push(Build.MV3 && Build.MinCVer < BrowserVer.MinBg$i18n$$getMessage$InMV3
        && CurCVer_ < BrowserVer.MinBg$i18n$$getMessage$InMV3
        ? extPayload_.get("" + i)!.replace(<RegExpG> /\$\$/g, "$")
        : browser_.i18n.getMessage(("" + i) as "0", args))
  }
  loadContentI18n_ = null
}
