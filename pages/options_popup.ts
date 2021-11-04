import {
  BG_, bgSettings_, OnFirefox, OnEdge, OnChrome, $, pageTrans_, asyncBackend_, browser_, enableNextTick_, nextTick_,
  kReadyInfo, TransTy, IsEdg_, toggleDark, toggleReduceMotion, CurCVer_
} from "./async_bg"
import {
  ExclusionVisibleVirtualNode, ExclusionRulesOption_, setupBorderWidth_, showI18n, ExclusionBaseVirtualNode
} from "./options_base"

type CachedMatcher = ValidUrlMatchers | false
let frameInfo: Frames.Sender
let url: string, topUrl = ""
let inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */ = 0
let saved = true, oldPass: string | null = null, curLockedStatus = Frames.Status.__fake
let exclusions: PopExclusionRulesOption = null as never
let toggleAction: "Disable" | "Enable", curIsLocked = false

const protocolRe = <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//
const stateAction = $<EnsuredMountedHTMLElement>("#state-action")
const saveBtn2 = $<HTMLButtonElement>("#saveOptions") as HTMLButtonElement & { firstChild: Text }
let stateValue = stateAction.nextElementSibling, stateTail = stateValue.nextElementSibling
let testers_: SafeDict<Promise<CachedMatcher> | CachedMatcher> = Object.create(null)
const _onlyFirstMatch = bgSettings_.get_("exclusionOnlyFirstMatch")

import type * as i18n_popup from "../i18n/zh/popup.json"

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
    nextTick_(() => element1.focus())
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
  stateTail.textContent = curIsLocked && !isSaving && same
    ? pTrans_("o147", [pTrans_(curLockedStatus !== Frames.Status.enabled ? "o144" : "o145")])
    : curIsLocked ? pTrans_("o148") : ""
  saveBtn2.disabled = same
  saveBtn2.firstChild.data = pTrans_(isSaving ? "o115_3" : same ? "o115" : "o115_2")
}

const saveOptions = (): void => {
  if (saveBtn2.disabled) {
    return
  }
  void asyncBackend_.evalVimiumUrl_(`status/${frameInfo.tabId_}/reset/silent`, Urls.WorkType.EvenAffectStatus)
  exclusions.save_()
  setTimeout(function () {
    setTimeout(initBottomLeft, 150)
  }, 50)
  inited = 3
  updateState(true)
  saveBtn2.firstChild.data = pTrans_("o115_3")
  if (OnFirefox) {
    saveBtn2.blur()
  }
  saveBtn2.disabled = true
  saved = true
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

const forceState = (act: "Reset" | "Enable" | "Disable", event?: EventToPrevent): void => {
  event && event.preventDefault()
  void asyncBackend_.evalVimiumUrl_(`status/${frameInfo.tabId_}/${act}`, Urls.WorkType.EvenAffectStatus)
  window.close()
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
  const serialized = Promise.resolve(asyncBackend_.parseMatcher_(pattern)[0])
  return testers_[pattern] = vnode.matcher_ =
      serialized.then(i => testers_[pattern] = vnode.matcher_ = deserializeMatcher(i))
}

const deserializeMatcher = (serialized: BaseUrlMatcher): ValidUrlMatchers => {
  return serialized.t === kMatchUrl.StringPrefix ? { t: serialized.t, v: serialized.v as string }
      : serialized.t === kMatchUrl.Pattern ? { t: serialized.t, v: new URLPattern!(serialized.v as URLPatternDict) }
      : { t: serialized.t, v: new RegExp(serialized.v as string, "") }
}

const buildTester = (matchers: BaseUrlMatcher[]): void => {
  const rules = bgSettings_.get_("exclusionRules")
  for (let i = 0, len = rules.length; i < len; i++) {
    testers_[rules[i].pattern !== "__proto__" ? rules[i].pattern : "_"] = deserializeMatcher(matchers[i])
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

const initBottomLeft = (): void => {
  toggleAction = frameInfo.status_ !== Frames.Status.disabled ? "Disable" : "Enable"
  let el0 = $<EnsuredMountedHTMLElement>("#toggleOnce"), el1 = el0.nextElementSibling
  nextTick_(() => {
    el0.firstElementChild.textContent = (pTrans_(toggleAction) || toggleAction) + (curIsLocked ? "" : pTrans_("Once"))
    el0.onclick = forceState.bind(null, toggleAction)
    stateValue.id = "state-value"
    el1.classList.toggle("hidden", !curIsLocked)
    if (curIsLocked) {
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
      const a: MarksNS.FocusOrLaunch = BG_.Object.create(null)
      a.u = optionsUrl
      asyncBackend_.focusOrLaunch_(a)
      window.close()
    }
  }
}

const initExclusionRulesTable = (): void => {
  OnChrome && asyncBackend_.contentPayload_.o || window.addEventListener("keydown", function (event): void {
    if (event.altKey
        && (event.keyCode === kKeyCode.X || curIsLocked && event.keyCode === kKeyCode.Z)
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
  nextTick_((): void => {
    exclusions.fetch_()
  })
  if (!Build.NDEBUG) {
    Object.assign(globalThis, { exclusions })
  }
}

void Promise.all([asyncBackend_.restoreSettings_()
    , asyncBackend_.parseMatcher_(null)
    , new Promise<[chrome.tabs.Tab]>((resolve): void => {
  browser_.tabs.query({currentWindow: true, active: true}, resolve)
})]).then((_resolved): void => {
  const activeTabs: [chrome.tabs.Tab] | never[] = _resolved[2]
  const curTab = activeTabs[0], _url = curTab.url
  let ref = asyncBackend_.indexPorts_(curTab.id), blockedMsg = $("#blocked-msg")
  const notRunnable = !(ref || curTab && _url && curTab.status === "loading" && (<RegExpOne> /^(ht|s?f)tp/).test(_url))
  enableNextTick_(kReadyInfo.popup)
  if (notRunnable || hasUnknownExt(ref)) {
    onNotRunnable(blockedMsg, curTab, _url, ref)
    initOptionsLink(_url)
    nextTick_(showI18n)
    nextTick_(didShow)
    return
  }
  nextTick_((versionEl): void => {
    blockedMsg.remove()
    blockedMsg = null as never
    toggleDark(!!asyncBackend_.contentPayload_.d)
    toggleReduceMotion(!!asyncBackend_.contentPayload_.m)
    const manifest = browser_.runtime.getManifest()
    versionEl.textContent = manifest.version_name || manifest.version
  }, $(".version"))

  if (ref && ref.lock_) {
    curIsLocked = true
    curLockedStatus = ref.lock_.status_
  }
  frameInfo = ref && (!ref.cur_.s.frameId_ || protocolRe.test(ref.cur_.s.url_)) ? ref.cur_.s : {
    /** must keep aligned with {@link ../background/main.ts#formatPortSender} */
    frameId_: 0,
    incognito_: curTab.incognito,
    status_: Frames.Status.enabled, // not real
    flags_: Frames.Flags.blank,
    tabId_: curTab.id,
    url_: _url
  }
  if (frameInfo.frameId_) {
    topUrl = ref?.top_?.s.url_ || _url
  }
  url = frameInfo.url_

  saveBtn2.onclick = saveOptions
  document.addEventListener("keyup", function (event): void {
    if (event.keyCode === kKeyCode.enter && (event.ctrlKey || event.metaKey)) {
      setTimeout(window.close, 300)
      if (!saved) { saveOptions() }
    }
  })

  buildTester(_resolved[1])
  initOptionsLink(_url)
  initBottomLeft()
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

const hasUnknownExt = (frames: Frames.Frames | null): boolean => {
  return !!frames && typeof frames.unknownExt_ === "string"
      && asyncBackend_.extAllowList_.get(frames.unknownExt_) !== true
}

const onNotRunnable = (blockedMsg: HTMLElement, curTab: chrome.tabs.Tab | null, _url: string
    , frames: Frames.Frames | null): void => {
  const body = document.body as HTMLBodyElement, docEl = document.documentElement as HTMLHtmlElement
  body.innerText = ""
  blockedMsg.style.display = ""
  const manifest = browser_.runtime.getManifest()
  blockedMsg.querySelector(".version")!.textContent = manifest.version_name || manifest.version
  const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement
  if (OnFirefox
      || !curTab || !_url || !(<RegExpI> /^(ht|s?f)tp/i).test(_url)
      ) {
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
  const extHost = hasUnknownExt(frames) ? frames!.unknownExt_ as string
      : _url.startsWith(location.protocol) && !_url.startsWith(location.origin + "/") ? new URL(_url).host : "",
  extStat = extHost ? asyncBackend_.extAllowList_.get(extHost) : null
  if (extStat != null && extStat !== true) {
    const refusedEl = $<EnsuredMountedHTMLElement>("#injection-refused")
    refusedEl.style.display = ""
    refusedEl.nextElementSibling.remove()
    if (frames) {
      frames.unknownExt_ = -1
    }
    $<HTMLAnchorElement>("#doAllowExt").onclick = function () {
      let list = bgSettings_.get_("extAllowList"), old = list.split("\n"), extIdToAdd = extHost
      if (!OnChrome) {
        let maybeId = asyncBackend_.extAllowList_.get(extHost)
        extIdToAdd = typeof maybeId === "string" && maybeId ? maybeId : extIdToAdd
      }
      if (old.indexOf(extIdToAdd) < 0) {
        const ind = old.indexOf("# " + extIdToAdd) + 1 || old.indexOf("#" + extIdToAdd) + 1
        old.splice(ind ? ind - 1 : old.length, ind ? 1 : 0, extIdToAdd)
        list = old.join("\n")
        bgSettings_.set_("extAllowList", list)
      }
      frames && (frames.unknownExt_ = null)
      this.onclick = null as never
      browser_.tabs.query({ active: true, currentWindow: true }, (tabs1): void => {
        const cb = (): void => {
          setTimeout((): void => location.reload(), 500)
          return browser_.runtime.lastError
        }
        tabs1 && tabs1[0] ? browser_.tabs.reload(tabs1[0].id, cb) : browser_.tabs.reload(cb)
        return browser_.runtime.lastError
      })
    }
  }
  docEl.classList.toggle("no-dark", !asyncBackend_.contentPayload_.d)
  const retryInjectElement = $<HTMLAnchorElement>("#retryInject")
  if (!retryInjectElement) { return }
  if (!OnFirefox && (<RegExpOne> /^(file|ftps?|https?):/).test(_url) && curTab) {
    retryInjectElement.onclick = (event): void => {
      event.preventDefault()
      if (!asyncBackend_.indexPorts_(curTab.id)) {
        asyncBackend_.runContentScriptsOn_(curTab.id)
      }
      window.close()
    }
  } else {
    (retryInjectElement.nextElementSibling as HTMLElement).remove()
    retryInjectElement.remove()
  }
}
