import {
  OnFirefox, OnEdge, OnChrome, $, pageTrans_, enableNextTick_, nextTick_, kReadyInfo, TransTy, IsEdg_, post_,
  toggleReduceMotion, CurCVer_
} from "./async_bg"
import {
  bgSettings_, ExclusionVisibleVirtualNode, ExclusionRulesOption_, setupBorderWidth_, showI18n,
  ExclusionBaseVirtualNode, setupSettingsCache_
} from "./options_base"
import { kPgReq, PgReq } from "../background/page_messages"
import type * as i18n_popup from "../i18n/zh/popup.json"

type CachedMatcher = ValidUrlMatchers | false
let conf_: PgReq[kPgReq.popupInit][1]
let url: string, topUrl = ""
let inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */ = 0
let saved = true, oldPass: string | null = null
let exclusions: PopExclusionRulesOption = null as never
let toggleAction: "Disable" | "Enable"

const protocolRe = <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//
const stateAction = $<EnsuredMountedHTMLElement>("#state-action")
const saveBtn2 = $<HTMLButtonElement>("#saveOptions") as HTMLButtonElement & { firstChild: Text }
let stateValue = stateAction.nextElementSibling, stateTail = stateValue.nextElementSibling
const testers_: SafeDict<Promise<CachedMatcher> | CachedMatcher> = Object.create(null)
let _onlyFirstMatch: boolean

const pTrans_: TransTy<keyof typeof i18n_popup> = (k, a): string => pageTrans_(k, a) || ""

class PopExclusionRulesOption extends ExclusionRulesOption_ {
  override addRule_ (_pattern: string, autoFocus?: false): void {
    super.addRule_(PopExclusionRulesOption.generateDefaultPattern_(), autoFocus)
  }
  override checkNodeVisible_ (vnode: ExclusionBaseVirtualNode): boolean {
    vnode.matcher_ = vnode.rule_.pattern && testers_[vnode.rule_.pattern] as CachedMatcher | undefined || false
    return doesMatchCur_(vnode.matcher_)
  }
  override populateElement_ (rules1: ExclusionsNS.StoredRule[]): void {
    super.populateElement_(rules1)
    this.populateElement_ = null as never // ensure .populateElement_ is only executed for once
    PopExclusionRulesOption.prototype.checkNodeVisible_ = ExclusionRulesOption_.prototype.checkNodeVisible_
    let visible_ = this.list_.filter((i): i is ExclusionVisibleVirtualNode => i.visible_), some = visible_.length > 0
    let element1: SafeHTMLElement
    inited = some ? 2 : 1
    if (some) {
      element1 = visible_[0].$keys_
      updateState(true)
    } else {
      this.addRule_("", false)
      element1 = (this.list_[this.list_.length - 1] as ExclusionVisibleVirtualNode).$keys_
    }
    setTimeout((): void => { element1.focus() }, 67)
  }
  override executeSave_ (value: ExclusionsNS.StoredRule[] | null): Promise<ExclusionsNS.StoredRule[]> {
    const p = super.executeSave_(value)
    const p2 = _forceState(`${conf_.tabId}/reset/silent`)
    return Promise.all([p, p2]).then(([a]) => a)
  }
  override updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, keys: string): void {
    const patternIsSame = vnode.rule_.pattern === pattern, oldMatcher = vnode.matcher_
    super.updateVNode_(vnode, pattern, keys)
    if (patternIsSame) {
      vnode.matcher_ = oldMatcher
      return
    }
    this.updateLineStyle_(vnode, pattern)
  }
  updateLineStyle_ (vnode: ExclusionVisibleVirtualNode, pattern: string): void {
    const patternElement = vnode.$pattern_
    let matcher: ReturnType<typeof parseMatcher>
    if (!pattern || pattern === PopExclusionRulesOption.generateDefaultPattern_()) {
      patternElement.title = patternElement.style.color = ""
    } else if ((matcher = parseMatcher(vnode)) instanceof Promise) {
      void matcher.then((): void => { this.updateLineStyle_(vnode, pattern) })
    } else if (doesMatchCur_(matcher)) {
      patternElement.title = patternElement.style.color = ""
    } else {
      patternElement.style.color = "red"
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL."
    }
  }
  static generateDefaultPattern_ (this: void): string {
    const url2 = url.startsWith("http:")
      ? "^https?://"
        + url.split("/", 3)[2].replace(<RegExpG> /[$()*+.?\[\\\]\^{|}]/g, "\\$&") + "/"
      : url.startsWith(location.origin + "/")
      ? ":vimium:/" + new URL(url).pathname.replace("/pages", "")
      : (<RegExpOne> /^[^:]+:\/\/./).test(url) && !url.startsWith("file:")
      ? ":" + (url.split("/", 3).join("/") + "/")
      : ":" + url
    if (!testers_[url2]) {
      testers_[url2] = deserializeMatcher(url2[0] === "^" ? { t: kMatchUrl.RegExp, v: url2 }
          : { t: kMatchUrl.StringPrefix,
              v: url2.startsWith(":vimium:") ? url.split(<RegExpOne> /[?#]/)[0] : url2.slice(1)})
    }
    PopExclusionRulesOption.generateDefaultPattern_ = () => url2
    return url2
  }
}

const updateState = (updateOldPass: boolean): void => {
  exclusions.readValueFromElement_(true)
  const toCheck = exclusions.list_.filter((i): i is ExclusionVisibleVirtualNode => i.visible_ && !!i.rule_.pattern)
  const oldInited = inited
  inited = 2
  void Promise.all(toCheck.map(
    (i): NonNullable<ExclusionBaseVirtualNode["matcher_"]> => i.matcher_ !== null ? i.matcher_ : parseMatcher(i)
  )).then((): void => { _doUpdateState(oldInited, updateOldPass, toCheck) })
}

const _doUpdateState = (oldInited: typeof inited
    , updateOldPass: boolean, toCheck: ExclusionVisibleVirtualNode[]): void => {
  const isSaving = oldInited === 3
  let pass = getExcluded_(!!topUrl, toCheck)
  pass && (pass = collectPass(pass))
  if (updateOldPass) {
    oldPass = oldInited >= 2 ? pass : null
  }
  const same = pass === oldPass
  const isReversed = !!pass && pass.length > 2 && pass[0] === "^"
  stateAction.textContent =
    (isSaving ? pass ? pTrans_("o137") + pTrans_(isReversed ? "o138" : "o139") : pTrans_("o140")
      : pTrans_(same ? "o141" : "o142") + pTrans_(pass ? isReversed ? "o138" : "o139" : same ? "o143" : "o143_2")
      ).replace(" to be", "")
    + pTrans_("colon") + pTrans_("NS")
  /* note: on C91, Win10, text may have a negative margin-left (zh/fr) when inline-block and its left is inline */
  stateValue.className = pass ? "code" : ""
  stateValue.textContent = pass ? isReversed ? pass.slice(2) : pass
    : pTrans_("o143_3") + pTrans_(pass !== null ? "o144" : "o145")
  stateTail.textContent = conf_.lock !== null && !isSaving && same
    ? pTrans_("o147", [pTrans_(conf_.lock !== Frames.Status.enabled ? "o144" : "o145")])
    : conf_.lock !== null ? pTrans_("o148") : ""
  saveBtn2.disabled = same
  saveBtn2.firstChild.data = pTrans_(isSaving ? "o115_3" : same ? "o115" : "o115_2")
}

const saveOptions = (): void | Promise<void> => {
  if (saveBtn2.disabled) {
    return
  }
  enableNextTick_(kReadyInfo.LOCK)
  return exclusions.save_().then((): void => {
  enableNextTick_(kReadyInfo.NONE, kReadyInfo.LOCK)
  inited = 3
  updateBottomLeft()
  updateState(true)
  saveBtn2.firstChild.data = pTrans_("o115_3")
  if (OnFirefox) {
    saveBtn2.blur()
  }
  saveBtn2.disabled = true
  saved = true
  })
}

const collectPass = (pass: string): string => {
  pass = pass.trim()
  const isReversed = pass.length > 2 && pass.startsWith("^")
  isReversed && (pass = pass.slice(1).trimLeft())
  const dict = Object.create<1>(null)
  for (let i of pass.split(" ")) {
    dict[i] = 1
  }
  return (isReversed ? "^ " : "") + Object.keys(dict).sort().join(" ")
}

const _forceState = (cmd: string): Promise<void> => {
  return post_(kPgReq.toggleStatus, [cmd, conf_.tabId, conf_.frameId])
      .then((res): void => { conf_.status = res[0], conf_.lock = res[1] })
}

const forceState = (act: "Reset" | "Enable" | "Disable", event?: EventToPrevent): void => {
  event && event.preventDefault()
  const notClose = event && ((event as Event as MouseEvent).ctrlKey || (event as Event as MouseEvent).metaKey)
  void _forceState(`${conf_.tabId}/${act}`).then((): void => {
    notClose ? (updateBottomLeft(), updateState(false)) : window.close()
  })
}

const doesMatchCur_ = (rule: ValidUrlMatchers | false): boolean => {
  if (!rule) { return false }
  return rule.t === kMatchUrl.StringPrefix ? url.startsWith(rule.v) || (!!topUrl && topUrl.startsWith(rule.v))
      : rule.t === kMatchUrl.Pattern ? rule.v.test(url) || (!!topUrl && rule.v.test(topUrl))
      : rule.v.test(url) || (!!topUrl && rule.v.test(topUrl))
}

const parseMatcher = (vnode: ExclusionVisibleVirtualNode): Promise<CachedMatcher> | CachedMatcher => {
  const pattern = vnode.rule_.pattern
  const cached = testers_[pattern]
  if (cached) {
    return vnode.matcher_ = cached instanceof Promise ? cached.then(i => vnode.matcher_ = i) : cached
  }
  const serialized = post_(kPgReq.parseMatcher, pattern)
  return testers_[pattern] = vnode.matcher_ =
      serialized.then(i => testers_[pattern] = vnode.matcher_ = deserializeMatcher(i))
}

const deserializeMatcher = (serialized: BaseUrlMatcher): ValidUrlMatchers => {
  return serialized.t === kMatchUrl.StringPrefix ? { t: serialized.t, v: serialized.v as string }
      : serialized.t === kMatchUrl.Pattern ? { t: serialized.t, v: new URLPattern!(serialized.v as URLPatternDict) }
      : { t: serialized.t, v: new RegExp(serialized.v as string, "") }
}

const buildTester = (): void => {
  const { rules, matchers } = conf_.exclusions!
  for (let i = 0, len = rules.length; i < len; i++) {
    const str = rules[i].pattern
    testers_[str !== "__proto__" ? str : "_"] = deserializeMatcher(matchers[i])
  }
}

const getExcluded_ = (inIframe: boolean, vnodes: ExclusionVisibleVirtualNode[]): string | null => {
  let matchedKeys = ""
  for (const node of vnodes) {
    const rule = node.matcher_! as Exclude<ExclusionBaseVirtualNode["matcher_"], null | Promise<any>>
    if (rule && (rule.t === kMatchUrl.StringPrefix ? url.startsWith(rule.v)
          : rule.t === kMatchUrl.Pattern ? rule.v.test(url) : rule.v.test(url))) {
      const str = node.rule_.passKeys
      if (str.length === 0 || _onlyFirstMatch || str[0] === "^" && str.length > 2) { return str }
      matchedKeys += str
    }
  }
  if (!matchedKeys && inIframe && url.lastIndexOf("://", 5) < 0 && !protocolRe.test(url)) {
    if (topUrl) {
      return getExcluded_(false, vnodes)
    }
  }
  return matchedKeys || null
}

const updateBottomLeft = (): void => {
  toggleAction = conf_.status !== Frames.Status.disabled ? "Disable" : "Enable"
  let el0 = $<EnsuredMountedHTMLElement>("#toggleOnce"), el1 = el0.nextElementSibling
  nextTick_((): void => {
    el0.firstElementChild.textContent = (pTrans_(toggleAction) || toggleAction)
        + (conf_.lock !== null ? "" : pTrans_("Once"))
    el0.onclick = forceState.bind(null, toggleAction)
    stateValue.id = "state-value"
    el1.classList.toggle("hidden", conf_.lock === null)
    if (conf_.lock !== null) {
      el1.firstElementChild.onclick = forceState.bind(null, "Reset")
    }
  })
}

const initOptionsLink = (_url: string): void => {
  const element = $<HTMLAnchorElement>(".options-link"), optionsUrl = location.origin + "/" + GlobalConsts.OptionsPage
  if (_url.startsWith(optionsUrl)) {
    nextTick_((): void => {
      (element.nextElementSibling as HTMLElement).remove()
      element.remove()
    })
  } else {
    element.href !== optionsUrl && nextTick_((): void => {
      element.href = optionsUrl
    })
    element.onclick = (event: EventToPrevent): void => {
      event.preventDefault()
      void post_(kPgReq.focusOrLaunch, { u: optionsUrl, p: true }).then((): void => {
        window.close()
      })
    }
  }
}

const initExclusionRulesTable = (): void => {
  !(Build.OS & (1 << kOS.mac)) || Build.OS & ~(1 << kOS.mac) && OnChrome && conf_.os ||
  window.addEventListener("keydown", function (event): void {
    if (event.altKey
        && (event.keyCode === kKeyCode.X || conf_.lock !== null && event.keyCode === kKeyCode.Z)
        && !(event.shiftKey || event.ctrlKey || event.metaKey)
        ) {
      event.preventDefault()
      event.stopImmediatePropagation()
      forceState(event.keyCode === kKeyCode.X ? toggleAction : "Reset")
    }
  })
  exclusions = new PopExclusionRulesOption($("#exclusionRules"), (): void => {
    if (saved) {
      saved = false
      let el = $("#helpSpan")
      if (el) {
        (el.nextElementSibling as HTMLElement).style.display = ""
        el.remove()
      }
      saveBtn2.removeAttribute("disabled")
      saveBtn2.firstChild.data = pTrans_("o115_2")
    }
    updateState(inited < 2)
  })
  void exclusions.fetch_()
  if (!Build.NDEBUG) {
    Object.assign(globalThis, { exclusions })
  }
}

void post_(kPgReq.popupInit).then((_resolved): void => {
  conf_ = _resolved
  const _url = conf_.url
  let blockedMsg = $("#blocked-msg")
  enableNextTick_(kReadyInfo.popup)
  if (!conf_.runnable) {
    onNotRunnable(blockedMsg)
    initOptionsLink(_url)
    nextTick_(showI18n)
    nextTick_(didShow)
    return
  }
  nextTick_((versionEl): void => {
    blockedMsg.remove()
    blockedMsg = null as never
    toggleReduceMotion(conf_.reduceMotion)
    versionEl.textContent = conf_.ver
  }, $(".version"))

  topUrl = conf_.topUrl || _url
  url = conf_.frameUrl || topUrl
  _onlyFirstMatch = conf_.exclusions!.onlyFirst;
  (bgSettings_ as { defaults_: Partial<typeof bgSettings_.defaults_> }
      ).defaults_ = { exclusionRules: conf_.exclusions!.defaults }
  setupSettingsCache_({ exclusionRules: conf_.exclusions!.rules })
  buildTester()
  conf_.exclusions = null

  saveBtn2.onclick = saveOptions
  document.addEventListener("keyup", function (event): void {
    if (event.keyCode === kKeyCode.enter) {
      const el = event.target as Element
      if (el instanceof HTMLAnchorElement) {
        el.hasAttribute("href") || setTimeout(function (el1) {
          el1.click()
          el1.blur()
        }, 0, el);
      } else if (event.ctrlKey || event.metaKey) {
        const q = !saved && saveOptions()
        q && q.then((): void => { setTimeout(window.close, 300) })
      }
    }
  })

  initOptionsLink(_url)
  updateBottomLeft()
  initExclusionRulesTable()
  nextTick_(showI18n)
  setupBorderWidth_ && nextTick_(setupBorderWidth_)
  nextTick_(didShow)
})

const didShow = (): void => {
  const docEl = document.documentElement as HTMLHtmlElement
  docEl.classList.remove("loading")
  docEl.style.width = ""
  docEl.style.height = ""
}

const onNotRunnable = (blockedMsg: HTMLElement): void => {
  const _url = conf_.url || ""
  const body = document.body as HTMLBodyElement
  body.innerText = ""
  blockedMsg.style.display = ""
  blockedMsg.querySelector(".version")!.textContent = conf_.ver
  const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement
  if (OnFirefox || conf_.tabId < 0 || !_url || !(<RegExpI> /^(ht|s?f)tp/i).test(_url)) {
    refreshTip.remove()
  } else if (OnEdge) {
    (refreshTip.querySelector(".action") as HTMLElement).textContent = "open a new web page"
  } else if (OnChrome && !IsEdg_ && (navigator.userAgentData
        ? navigator.userAgentData.brands.find(i => i.brand.includes("Opera") && i.version === CurCVer_)
        : (<RegExpOne> /\bOpera\//).test(navigator.userAgent!))
      && (<RegExpOne> /\.(google|bing|baidu)\./).test(_url.split("/", 4).slice(0, 3).join("/"))) {
    (blockedMsg.querySelector("#opera-warning") as HTMLElement).style.display = ""
  }
  body.appendChild(blockedMsg)
  const extIdToAdd = conf_.unknownExt
  if (extIdToAdd) {
    const refusedEl = $<EnsuredMountedHTMLElement>("#injection-refused")
    refusedEl.style.display = ""
    refusedEl.nextElementSibling.remove()
    $<HTMLAnchorElement>("#doAllowExt").onclick = function () {
      this.onclick = null as never
      void post_(kPgReq.allowExt, [ conf_.tabId, extIdToAdd ]).then((): void => {
        setTimeout((): void => { location.reload() }, 0)
      })
    }
  }
  const retryInjectElement = $<HTMLAnchorElement>("#retryInject")
  if (!retryInjectElement) { return }
  if (!OnFirefox && (<RegExpOne> /^(file|ftps?|https?):/).test(_url) && conf_.tabId >= 0) {
    retryInjectElement.onclick = (event): void => {
      event.preventDefault()
      void post_(kPgReq.runJSOn, conf_.tabId).then((): void => {
        window.close()
      })
    }
  } else {
    (retryInjectElement.nextElementSibling as HTMLElement).remove()
    retryInjectElement.remove()
  }
}
