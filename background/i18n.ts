import { installation_, OnFirefox } from "./store"
import { fetchFile_, safer_ } from "./utils"
import { browser_ } from "./browser"
import type * as i18n_map from "../_locales/en/messages.json"

type StringEndsWith<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}` ? A : never

export const i18nPayload_: string[] = []

export const trans_: (messageName: keyof typeof i18n_map
    , substitutions?: Array<string | number> | string) => string = browser_.i18n.getMessage

const endsWith = <A extends string, S extends string> (name: A, tail: S): name is A & StringEndsWith<A, S> =>
    name.endsWith(tail)

export const transPart_ = (name: "i18n" | "sugs", child: string): string => {
  const msg = trans_(name)
  return msg && msg.split(" ").reduce((old, i) => old ? old : !i.includes("=") ? i
      : i.startsWith(child) ? i.slice(child.length + 1) : old, "")
}

export const getI18nJson = (file_name: "help_dialog" | "params.json"): Promise<SafeDict<string>> => {
  const url = endsWith(file_name, ".json") ? file_name as `${string}.json`
      : `${transPart_("i18n", file_name) || trans_("lang1") || "en"}/${file_name}.json` as const
  return fetchFile_(`/i18n/${url}`).then(safer_)
}

export let loadI18nPayload_: (() => void) | null = (): void => {
  const arr: string[] = i18nPayload_, args = ["$1", "$2", "$3", "$4"]
  for (let i = 0; i < kTip.INJECTED_CONTENT_END; i++) {
    arr.push(trans_(("" + i) as "0", args))
  }
  loadI18nPayload_ = null
}

if (OnFirefox) {
  installation_ && void installation_.then((): void => {
    localStorage.removeItem("i18n_f")
  })
}
