import {
  $, OnEdge, browser_, OnFirefox, OnChrome, nextTick_, CurCVer_, IsEdg_, bgSettings_, asyncBackend_
} from "./async_bg"
import { Option_, KnownOptionsDataset, oTrans_ } from "./options_base"
import { registerClass, createNewOption } from "./options_defs"
import kPermissions = chrome.permissions.kPermissions

interface PermissionItem { name_: kPermissions; previous_: 0 | 1 | 2; element_: HTMLInputElement }

const kShelf = "downloads.shelf", kNTP = "chrome://new-tab-page/*", kCrURL = "chrome://*/*"
const i18nItems = {
  [kCrURL]: "opt_chromeUrl",
  [kNTP]: "opt_cNewtab",
  [kShelf]: "opt_closeShelf"
} as const
const placeholder = $<HTMLTemplateElement & EnsuredMountedHTMLElement>("#optionalPermissionsTemplate")
const template = placeholder.content.firstElementChild as HTMLElement
const shownItems: PermissionItem[] = []
const container = placeholder.parentElement
const browserPermissions_ = browser_.permissions
let optional_permissions = (!OnEdge && browser_.runtime.getManifest().optional_permissions || []) as kPermissions[]

registerClass("OptionalPermissions", class extends Option_<"nextPatterns"> {
  override init_ (): void { this.element_.onchange = this.onUpdated_ }
  override readValueFromElement_ = (): string => shownItems.map(
      i => i.element_.checked ? i.element_.indeterminate ? "1" : "2" : "0").join("")
  override innerFetch_ = (): string => shownItems.map(i => i.previous_).join("")
  override populateElement_ (value: string): void {
    for (let i = 0; i < shownItems.length; i++) {
      shownItems[i].element_.checked = value[i] !== "0"
      shownItems[i].element_.indeterminate = value[i] === "1"
    }
  }
  override executeSave_ (wanted_value: string): string {
    const new_permissions: kPermissions[] = [], new_origins: kPermissions[] = []
    const changed: { [key in kPermissions]?: PermissionItem } = {}
    let waiting = 1
    for (let _ind = 0; _ind < shownItems.length; _ind++) {
      const i = shownItems[_ind]
      const wanted = +wanted_value[_ind] as 0 | 1 | 2
      if (i.previous_ === wanted) { continue }
      const orig2: kPermissions | "" = i.name_ === kNTP ? "chrome://newtab/*" : ""
      i.previous_ = wanted
      if (i.name_ === kCrURL) {
        if (bgSettings_.get_("allBrowserUrls") !== (wanted === 2)) {
          bgSettings_.set_("allBrowserUrls", wanted === 2)
        }
      }
      if (wanted) {
        i.name_ === kShelf && new_permissions.push("downloads");
        (i.name_.includes(":") ? new_origins : new_permissions).push(i.name_)
        orig2 && new_origins.push(orig2)
        changed[i.name_] = i
      } else {
        waiting++
        browserPermissions_.remove(i.name_.includes(":") ? { origins: orig2 ? [i.name_, orig2] : [i.name_] } : {
          permissions: i.name_ === kShelf ? ["downloads", i.name_] : [i.name_]
        }, (ok): void => {
          const err = browser_.runtime.lastError as any
          (err || !ok) && console.log("Can not remove the permission %o :", i.name_, err && err.message || err)
          tryRefreshing()
          return err
        })
      }
    }
    const cb = (arr: kPermissions[], ok?: boolean): void => {
      const err = browser_.runtime.lastError as any
      (err || !ok) && console.log("Can not request permissions of %o :", arr, err && err.message || err)
      if (!ok) {
        for (const name of arr) {
          const item = changed[name]
          item && (item.previous_ = 0)
          if (!item || !err) { return }
          const box = item.element_.parentElement as Element as EnsuredMountedHTMLElement
          let errEl = box.nextElementSibling as HTMLElement | null
          if (!errEl || !errEl.classList.contains("tip")) {
            errEl = document.createElement("div")
            errEl.className = "tip"
            box.parentElement.insertBefore(errEl, box.nextElementSibling)
          }
          let msg = (err && err.message || JSON.stringify(err)) + ""
          if (name.startsWith("chrome://") && msg.includes("Only permissions specified in the manifest")) {
            if (name.startsWith("chrome:")) {
              msg = oTrans_("optNeedChromeUrlFirst")
              msg = IsEdg_ ? msg.replace("chrome:", "edge:") : msg
            }
          }
          errEl.textContent = box.title = oTrans_("exc") + msg
          box.lastElementChild.classList.add("has-error")
        }
        this.fetch_()
      }
      tryRefreshing()
      return err
    }
    const tryRefreshing = (): void => {
      waiting--
      if (waiting > 0) { return }
      Promise.all(shownItems.map(doPermissionsContain_)).then(() => {
        this.fetch_()
      })
    }
    waiting += (new_permissions.length && 1) + (new_origins.length && 1)
    new_permissions.length && browserPermissions_.request({ permissions: new_permissions }
        , cb.bind(0, new_permissions))
    new_origins.length && browserPermissions_.request({ origins: new_origins }, cb.bind(0, new_origins))
    tryRefreshing()
    return wanted_value
  }
})

const initOptionalPermissions = (): void => {
  const fragment = document.createDocumentFragment()
  if (OnFirefox && asyncBackend_.contentPayload_.o === kOS.unixLike) {
    template.querySelector("input")!.classList.add("baseline")
  }
  let itemInd = 0
  for (const name of optional_permissions) {
    const node = document.importNode(template, true) as EnsuredMountedHTMLElement
    const checkbox = node.querySelector("input")!
    const i18nKey = i18nItems[name as keyof typeof i18nItems]
    checkbox.value = name
    let i18nName = oTrans_(i18nKey || `opt_${name}`) || name
    let suffix = ""
    if (name.startsWith("chrome:")) {
      i18nName = IsEdg_ ? i18nName.replace("chrome:", "edge:") : i18nName
      suffix = oTrans_("optOfChromeUrl").replace(IsEdg_ ? "chrome" : "edge", "edge")
    }
    if (name === kNTP) {
      if (OnChrome && Build.MinCVer < BrowserVer.MinChromeURL$NewTabPage
          && CurCVer_ < BrowserVer.MinChromeURL$NewTabPage) {
        suffix = oTrans_("requireChromium", [BrowserVer.MinChromeURL$NewTabPage])
        checkbox.disabled = true
        checkbox.checked = false
        node.title = oTrans_("invalidOption", [oTrans_("beforeChromium", [BrowserVer.MinChromeURL$NewTabPage])])
      }
    }
    node.lastElementChild.textContent = i18nName + suffix
    if (optional_permissions.length === 1) {
      node.classList.add("single")
    }
    fragment.appendChild(node)
    shownItems[itemInd++].element_ = checkbox
  }
  container.appendChild(fragment)
  container.addEventListener("change", onChange, true)
}

const doPermissionsContain_ = (item: PermissionItem): Promise<void> => {
  const name = item.name_
  let resolve: () => void, p = new Promise<void>(curResolve => { resolve = curResolve })
  browserPermissions_.contains(name.includes(":") ? { origins: [name] }
      : { permissions: name === kShelf ? ["downloads", name] : [name] }, (result): void => {
    if (OnChrome && Build.MinCVer < BrowserVer.MinCorrectExtPermissionsOnChromeURL$NewTabPage
        && CurCVer_ < BrowserVer.MinCorrectExtPermissionsOnChromeURL$NewTabPage
        && name === "chrome://new-tab-page/*") {
      result = false
    }
    const val = result ? item.name_ !== kCrURL || bgSettings_.get_("allBrowserUrls") ? 2 : 1 : 0
    item.previous_ = val
    resolve()
    return browser_.runtime.lastError
  })
  return p
}

const onChange = (e: Event): void => {
  const el = e.target as HTMLInputElement
  const item = shownItems.find(i => i.element_ === el)
  if (!item) { return }
  const value = el.checked
  if (OnChrome && (item.name_ === kCrURL || item.name_ === kNTP)) {
    const isCurNTP = item.name_ === kNTP, theOtherName = isCurNTP ? kCrURL : kNTP
    const theOther = shownItems.find(i => i.name_ === theOtherName)
    if (theOther) {
      if (isCurNTP && value && !theOther.element_.checked) {
        theOther.element_.checked = theOther.element_.indeterminate = true
      } else if (!isCurNTP && value && el.indeterminate) {
        el.indeterminate = false
      } else {
        theOther.element_.checked = value
        theOther.element_.indeterminate = false
      }
    }
  }
}

if (!OnEdge) {
  const ignored: Array<kPermissions | RegExpOne> = OnFirefox ? [kShelf] : ["downloads"]
  OnChrome || ignored.push(<RegExpOne> /^chrome:/, "contentSettings")
  OnChrome && !IsEdg_ || ignored.push(kNTP)
  OnFirefox || ignored.push("cookies")
  optional_permissions = optional_permissions.filter(
      i => !ignored.some(j => typeof j === "string" ? i === j : j.test(i)))
}
if (OnEdge || !optional_permissions.length) {
  nextTick_((): void => { $("#optionalPermissionsBox").style.display = "none" })
} else {
  for (const name of optional_permissions) {
    shownItems.push({ name_: name, previous_: 0, element_: null as never })
  }
  nextTick_(initOptionalPermissions)
  void Promise.all(shownItems.map(doPermissionsContain_)).then((): void => {
    nextTick_((): void => {
      (container.dataset as KnownOptionsDataset).model = "OptionalPermissions"
      void createNewOption(container).fetch_()
    })
  })
}
