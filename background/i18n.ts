import { installation_, OnFirefox } from "./store"
import { fetchFile_, safer_ } from "./utils"
import { browser_ } from "./browser"
import type * as i18n_map from "../_locales/en/messages.json"

export const i18nPayload_: string[] = []

export const trans_: (messageName: keyof typeof i18n_map
    , substitutions?: Array<string | number> | string) => string = browser_.i18n.getMessage

const endsWith = <A extends string, S extends string> (a: A, child: S
    ): a is A & StringEndsWith<A, S> => a.endsWith(child)

export const transPart_ = (name: "i18n" | "sugs", child: string): string => {
  const msg = trans_(name)
  return (msg && msg.split(" ").find(i => i.startsWith(child)) || "").slice(child.length + 1)
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
