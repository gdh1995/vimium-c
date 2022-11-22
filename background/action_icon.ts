import {
  framesForTab_, CurCVer_, OnChrome, set_setIcon_, setIcon_, set_iconData_, iconData_, blank_, set_needIcon_,
  needIcon_, updateHooks_
} from "./store"
import * as BgUtils_ from "./utils"
import { extTrans_ } from "./i18n"
import { browser_, runtimeError_ } from "./browser"
import { asyncIterFrames_ } from "./ports"

const knownIcons_: readonly [IconNS.BinaryPath, IconNS.BinaryPath, IconNS.BinaryPath
    ] | readonly [IconNS.ImagePath, IconNS.ImagePath, IconNS.ImagePath] = OnChrome ? [
  "/icons/enabled.bin", "/icons/partial.bin", "/icons/disabled.bin"
] : [
  { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
  { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
  { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
]

export const browserAction_ = Build.MV3 ? (browser_ as any).action as never : browser_.browserAction
let tabIds_cr_: Map<Frames.ValidStatus, number[] | null> | null

const onerror = (err: any): void => {
  if (setIcon_ === blank_) { return }
  console.log("Can not access binary icon data:", err);
  set_setIcon_(blank_)
  set_needIcon_(false)
  updateHooks_.showActionIcon = undefined
  Promise.resolve(extTrans_("name")).then((name) => {
    browserAction_.setTitle({ title: name + "\n\nFailed in showing dynamic icons." })
  })
}

const loadBinaryImagesAndSetIcon_cr = (type: Frames.ValidStatus): void => {
  const path = knownIcons_[type] as IconNS.BinaryPath;
  const loadFromRawArray = (array: ArrayBuffer): void => {
    const uint8Array = new Uint8ClampedArray(array), firstSize = array.byteLength / 5,
    small = (Math.sqrt(firstSize / 4) | 0) as IconNS.ValidSizes, large = (small + small) as IconNS.ValidSizes,
    cache = BgUtils_.safeObj_() as IconNS.IconBuffer;
    cache[small] = new ImageData(uint8Array.subarray(0, firstSize), small, small);
    cache[large] = new ImageData(uint8Array.subarray(firstSize), large, large);
    iconData_![type] = cache;
    const arr = tabIds_cr_!.get(type)!
    tabIds_cr_!.delete(type)
    for (let w = 0, h = arr.length; w < h; w++) {
      framesForTab_.has(arr[w]) && setIcon_(arr[w], type, true)
    }
  };
  if (Build.MinCVer >= BrowserVer.MinFetchExtensionFiles || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
    const p = fetch(path).then(r => r.arrayBuffer()).then(loadFromRawArray)
    if (!Build.NDEBUG) { p.catch(onerror) }
  } else {
    const req = new XMLHttpRequest() as ArrayXHR
    req.open("GET", path, true)
    req.responseType = "arraybuffer"
    req.onload = function (this: typeof req) { loadFromRawArray(this.response) }
    if (!Build.NDEBUG) { req.onerror = onerror }
    req.send()
  }
}

export const toggleIconBuffer_ = (): void => {
  const enabled = needIcon_
  if (enabled === !!iconData_) { return }
  set_setIcon_(enabled ? doSetIcon_ : blank_)
  const iter = ({ cur_: { s: sender }, flags_ }: Frames.Frames): void => {
    if (sender.status_ !== Frames.Status.enabled) {
      if (flags_ & Frames.Flags.ResReleased && enabled) {
        sender.status_ = Frames.Status.enabled
        return
      }
      setIcon_(sender.tabId_, enabled ? sender.status_ : Frames.Status.enabled)
    }
  }
  const cond = (): boolean => needIcon_ === enabled
  if (!enabled) {
    setTimeout((): void => {
      if (needIcon_ || iconData_ == null) { return }
      set_iconData_(null)
      if (OnChrome) { tabIds_cr_ = null }
      else {
        asyncIterFrames_(Frames.Flags.blank, iter, cond)
      }
    }, 200);
    return;
  }
  if (!OnChrome) {
    set_iconData_(1 as never)
  } else {
    set_iconData_([null, null, null])
    tabIds_cr_ = new Map()
  }
  // only do partly updates: ignore "rare" cases like `sender.s` is enabled but the real icon isn't
  asyncIterFrames_(Frames.Flags.blank, iter, cond)
}

/** Firefox does not use ImageData as inner data format
 * * https://dxr.mozilla.org/mozilla-central/source/toolkit/components/extensions/schemas/manifest.json#577
 *   converts ImageData objects in parameters into data:image/png,... URLs
 * * https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/parent/ext-browserAction.js#483
 *   builds a css text of "--webextension-***: url(icon-url)",
 *   and then set the style of an extension's toolbar button to it
 */
const doSetIcon_: typeof setIcon_ = !OnChrome ? (tabId, type): void => {
  tabId < 0 || browserAction_.setIcon({ tabId, path: knownIcons_[type]! })
} : (tabId: number, type: Frames.ValidStatus, isLater?: true): void => {
  let data: IconNS.IconBuffer | null | undefined;
  if (tabId < 0) { /* empty */ }
  else if (data = iconData_![type]) {
    const f = browserAction_.setIcon
    const args: Parameters<typeof f>[0] = { tabId, imageData: data }
    isLater ? f(args, runtimeError_) : f(args);
  } else if (tabIds_cr_!.has(type)) {
    tabIds_cr_!.get(type)!.push(tabId)
  } else {
    setTimeout(loadBinaryImagesAndSetIcon_cr, 0, type);
    tabIds_cr_!.set(type, [tabId])
  }
}

toggleIconBuffer_()
