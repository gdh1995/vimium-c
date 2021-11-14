import { installation_, OnFirefox } from "./store"
import { fetchFile_ } from "./utils"
import { browser_ } from "./browser"
import type * as i18n_map from "../_locales/en/messages.json"
import type * as i18n_dyn from "../i18n/zh/background.json"

type StringEndsWith<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}` ? A : never
type ValidI18nFiles = "background" | "help_dialog" | "params.json"
export type I18nNames = keyof typeof i18n_dyn

let i18nPayload_: Map<string, string>
let ready_: Promise<Map<string, string>> | BOOL = 0

export const contentI18n_: string[] = []

export const extTrans_ = (msg: keyof typeof i18n_map, args?: string[]): string => browser_.i18n.getMessage(msg, args)

export const trans_ = (name: I18nNames, args?: (string | number)[]): string | Promise<string> => {
  if (ready_ === 1) {
    const val = i18nPayload_.get(name)
    return args != null && val
        ? val.replace(<RegExpG & RegExpSearchable<0>> /\$\d/g, (i): string => args[+i[1] - 1] as string)
        : val || ""
  } else {
    ready_ || (ready_ = getI18nJson("background"))
    return ready_.then((obj): void => { i18nPayload_ = obj, ready_ = 1 })
      .then(trans_.bind(null, name, args))
  }
}

const endsWith = <A extends string, S extends string> (name: A, tail: S): name is A & StringEndsWith<A, S> =>
    name.endsWith(tail)

export const transPart_ = (name: "i18n" | "sugs", child: string): string => {
  const msg = name === "i18n" ? extTrans_(name) : name
  return msg && msg.split(" ").reduce((old, i) => old ? old : !i.includes("=") ? i
      : i.startsWith(child) ? i.slice(child.length + 1) : old, "")
}

export let i18nLang_ = (id?: ValidI18nFiles): string =>
    transPart_("i18n", id || "background") || extTrans_("lang1") || "en"

export const getI18nJson = (file_name: ValidI18nFiles): Promise<Map<string, string>> => {
  const url = endsWith(file_name, ".json") ? file_name as `${string}.json`
      : `${i18nLang_(file_name)}/${file_name}.json` as const
  return fetchFile_(`/i18n/${url}`)
}

export let loadContentI18n_: (() => void) | null = (): void => {
  const arr: string[] = contentI18n_, args = ["$1", "$2", "$3", "$4"], bTrans = browser_.i18n.getMessage
  for (let i = 0; i < kTip.INJECTED_CONTENT_END; i++) {
    arr.push(bTrans(("" + i) as "0", args))
  }
  loadContentI18n_ = null
}

if (OnFirefox) {
  installation_ && void installation_.then((): void => {
    localStorage.removeItem("i18n_f")
  })
}
