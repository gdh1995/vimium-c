import {
  OnFirefox, OnEdge, OnChrome, $, pageTrans_, enableNextTick_, nextTick_, kReadyInfo, type TransTy, IsEdg_, post_,
  toggleReduceMotion_, hasShift_, PageOs_, setupPageOs_, prevent_, CurCVer_, escapeAllForRe_
} from "./async_bg"
import {
  bgSettings_, type ExclusionVisibleVirtualNode, ExclusionRulesOption_, setupBorderWidth_, showI18n_, kExclusionChange,
  type ExclusionBaseVirtualNode, setupSettingsCache_
} from "./options_base"
import { kPgReq, PgReq } from "../background/page_messages"
import type * as i18n_action from "../i18n/zh/action.json"

type CachedMatcher = ValidUrlMatchers | false
let conf_: PgReq[kPgReq.actionInit][1]
let url: string, topUrl = ""
let inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */ = 0
let saved = true, oldPass: string | null = null
let exclusions: PopExclusionRulesOption = null as never
let toggleAction: "Disable" | "Enable"
let noHelpSpan: BOOL = 0

const protocolRe = <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//
const stateAction = $<EnsuredMountedHTMLElement>("#state-action")
const saveBtn2 = $<HTMLButtonElement>("#saveOptions") as HTMLButtonElement & { firstChild: Text }
let stateValue = stateAction.nextElementSibling, stateTail = stateValue.nextElementSibling
const testers_: SafeDict<Promise<CachedMatcher> | CachedMatcher> = Object.create(null)
let _onlyFirstMatch: boolean

const aTrans_: TransTy<keyof typeof i18n_action> = (k, a): string => pageTrans_(k, a) || ""

class PopExclusionRulesOption extends ExclusionRulesOption_ {
  override init_ (element: HTMLElement): void {
    super.init_(element)
    this.$list_.onmousedown = (event: MouseEventToPrevent): void => {
      event.detail > 1 && (event.target as EnsuredMountedElement).localName !== "input" && prevent_(event)
    }
  }
  override addRule_ (_pattern: string, autoFocus?: false): void {
    super.addRule_(PopExclusionRulesOption.generateDefaultPattern_(), autoFocus)
  }
  override checkNodeVisible_ (vnode: ExclusionBaseVirtualNode): boolean {
    vnode.matcher_ = vnode.rule_.pattern && testers_[vnode.rule_.pattern] as CachedMatcher | undefined || false
    return doesMatchCur_(vnode.matcher_)
  }
  override populateElement_ (rules1: ExclusionsNS.StoredRule[]): void {
    super.populateElement_(rules1)
    PopExclusionRulesOption.prototype.populateElement_ = null as never
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
  override updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, passKeys: string): void {
    const patternIsSame = vnode.rule_.pattern === pattern, oldMatcher = vnode.matcher_
    super.updateVNode_(vnode, pattern, passKeys)
    const tip = !pattern ? "" : !passKeys ? aTrans_("completelyDisabled") || "completely disabled"
        : passKeys.length > 1 && passKeys[0] === "^"
        ? aTrans_("onlyHook") || "only hook such keys" : aTrans_("passThrough") || "pass through such keys"
    vnode.$pattern_.title !== pattern && (vnode.$pattern_.title = pattern)
    vnode.$keys_.title !== tip && (vnode.$keys_.title = tip)
    if (patternIsSame) {
      vnode.matcher_ = oldMatcher
      return
    }
    this.updateLineStyle_(vnode, pattern)
  }
  updateLineStyle_ (vnode: ExclusionVisibleVirtualNode, pattern: string): void {
    const patternElement = vnode.$pattern_
    let matcher: ReturnType<typeof parseMatcher>
    vnode.changed_ &= ~kExclusionChange.mismatches
    if (!pattern || pattern === PopExclusionRulesOption.generateDefaultPattern_()) {
      patternElement.title = patternElement.style.color = ""
    } else if ((matcher = parseMatcher(vnode)) instanceof Promise) {
      matcher.then(this.updateLineStyle_.bind(this as PopExclusionRulesOption, vnode, pattern))
    } else if (doesMatchCur_(matcher)) {
      patternElement.title = patternElement.style.color = ""
    } else {
      vnode.changed_ |= kExclusionChange.mismatches
      patternElement.style.color = "red"
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL."
    }
  }
  static generateDefaultPattern_ (this: void): string {
    const hasSubDomain = conf_.hasSubDomain
    const main = (hasSubDomain ? topUrl : url).split(<RegExpOne> /[?#]/)[0]
    const url2 = hasSubDomain || main.startsWith("http:")
      ? (hasSubDomain < 2 && main[4] !== ":" ? "^https://" : "^https?://") + (hasSubDomain ? "(?:[^/]+\.)?" : "")
        + escapeAllForRe_(main.split("/", 3)[2]) + "/"
      : main.startsWith(location.origin + "/")
      ? ":vimium:/" + new URL(main).pathname.replace("/pages", "")
      : (<RegExpOne> /^[^:]+:\/\/./).test(main) && !main.startsWith("file:")
      ? ":" + (main.split("/", 3).join("/") + "/") : ":" + main
    if (!testers_[url2]) {
      testers_[url2] = deserializeMatcher(url2[0] === "^" ? { t: kMatchUrl.RegExp, v: url2 }
          : { t: kMatchUrl.StringPrefix, v: url2.startsWith(":vimium:") ? main : url2.slice(1)})
    }
    PopExclusionRulesOption.generateDefaultPattern_ = () => url2
    return url2
  }
}

const updateState = (updateOldPass: boolean): void => {
  exclusions.readValueFromElement_(true)
  const toCheck = exclusions.list_.filter((i): i is ExclusionVisibleVirtualNode =>
      i.visible_ && (!!i.rule_.pattern || !!(i.changed_ & kExclusionChange.mismatches)))
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
    (isSaving ? pass ? aTrans_("137") + aTrans_(isReversed ? "138" : "139") : aTrans_("140")
      : aTrans_(same ? "141" : "142") + aTrans_(pass ? isReversed ? "138" : "139" : same ? "143" : "143_2")
      ).replace(" to be", "")
    + aTrans_("colon") + aTrans_("NS")
  /* note: on C91, Win10, text may have a negative margin-left (zh/fr) when inline-block and its left is inline */
  stateValue.className = pass ? "code" : ""
  stateValue.textContent = pass ? isReversed ? pass.slice(2) : pass
    : aTrans_("143_3") + aTrans_(pass !== null ? "144" : "145")
  stateTail.textContent = conf_.lock !== null && !isSaving && same
    ? aTrans_("147", [aTrans_(conf_.lock !== Frames.Status.enabled ? "144" : "145")])
    : conf_.lock !== null ? aTrans_("148") : ""
  const mismatches = toCheck.some(vnode => !!(vnode.changed_ & kExclusionChange.mismatches)
      && (vnode.rule_.pattern !== vnode.savedRule_.pattern || vnode.rule_.passKeys !== vnode.savedRule_.passKeys))
  saveBtn2.disabled = same && !mismatches
  saveBtn2.firstChild.data = aTrans_(isSaving ? "115_3" : same && !mismatches ? "115" : "115_2")
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
  saveBtn2.firstChild.data = aTrans_("115_3")
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
    dict[i === "*" ? aTrans_("asterisk") : i] = 1
  }
  return (isReversed ? "^ " : "") + Object.keys(dict).sort().join(" ")
}

const _forceState = (cmd: string): Promise<void> => {
  return post_(kPgReq.toggleStatus, [cmd, conf_.tabId, conf_.frameId])
      .then((res): void => { conf_.status = res[0], conf_.lock = res[1] })
}

const forceState = (act: "Reset" | "Enable" | "Disable", event?: EventToPrevent): void => {
  event && prevent_(event)
  const notClose = event && ((event as Event as MouseEvent).ctrlKey || (event as Event as MouseEvent).metaKey)
  void _forceState(`${conf_.tabId}/${act}`).then((): void => {
    notClose ? (updateBottomLeft(), updateState(false)) : window.close()
  })
}

const doesMatchCur_ = (rule: ValidUrlMatchers | false): boolean => {
  if (!rule) { return false }
  return rule.t === kMatchUrl.StringPrefix ? url.startsWith(rule.v) || (!!topUrl && topUrl.startsWith(rule.v))
      : rule.t === kMatchUrl.Pattern ? rule.v.p.test(url) || (!!topUrl && rule.v.p.test(topUrl))
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
      : serialized.t === kMatchUrl.Pattern ? { t: serialized.t, v: {
        p: OnChrome && Build.MinCVer < BrowserVer.MinURLPatternWith$ignoreCase
          && CurCVer_ < BrowserVer.MinURLPatternWith$ignoreCase
          ? new URLPattern!(serialized.v as string)
          : new URLPattern!(serialized.v as string, "http://localhost", { ignoreCase: true }),
        s: serialized.v as string
      } }
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
          : rule.t === kMatchUrl.Pattern ? rule.v.p.test(url) : rule.v.test(url))) {
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
    el0.firstElementChild.textContent = (aTrans_(toggleAction) || toggleAction)
        + (conf_.lock !== null ? "" : aTrans_("Once"))
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
      prevent_(event)
      void post_(kPgReq.focusOrLaunch, { u: optionsUrl, p: true }).then((): void => {
        window.close()
      })
    }
  }
}

const initExclusionRulesTable = (): void => {
  !(Build.OS & kBOS.MAC) || Build.OS !== kBOS.MAC as number && OnChrome && PageOs_ ||
  window.addEventListener("keydown", function (event): void {
    if (event.keyCode === kKeyCode.enter && event.metaKey) {
      onEnterKeyUp(event)
    } else if (event.altKey
        && (event.keyCode === kKeyCode.X || conf_.lock !== null && event.keyCode === kKeyCode.Z)
        && !(event.ctrlKey || event.metaKey || hasShift_(event))
        ) {
      prevent_(event)
      event.stopImmediatePropagation()
      forceState(event.keyCode === kKeyCode.X ? toggleAction : "Reset")
    }
  })
  exclusions = new PopExclusionRulesOption($("#exclusionRules"), (): void => {
    if (saved) {
      saved = false
      let el = !noHelpSpan && $("#helpSpan")
      if (el) {
        (el.nextElementSibling as HTMLElement).style.display = ""
        el.remove()
        noHelpSpan = 1
      }
    }
    updateState(inited < 2)
  })
  void exclusions.fetch_()
  if (!Build.NDEBUG) {
    Object.assign(globalThis, { exclusions, updateState, updateBottomLeft })
  }
}

void post_(kPgReq.actionInit).then((_resolved): void => {
  conf_ = _resolved
  setupPageOs_(conf_.os)
  const _url = conf_.url
  let blockedMsg = $("#blocked-msg")
  enableNextTick_(kReadyInfo.action)
  if (!conf_.runnable) {
    onNotRunnable(blockedMsg)
    initOptionsLink(_url)
    nextTick_(showI18n_)
    nextTick_(didShow)
    return
  }
  nextTick_((versionEl): void => {
    blockedMsg.remove()
    blockedMsg = null as never
    toggleReduceMotion_(conf_.reduceMotion)
    versionEl.textContent = conf_.ver
  }, $("#version"))

  topUrl = conf_.topUrl || _url
  url = conf_.frameUrl || topUrl
  _onlyFirstMatch = conf_.exclusions!.onlyFirst;
  (bgSettings_ as { defaults_: Partial<typeof bgSettings_.defaults_> }
      ).defaults_ = { exclusionRules: conf_.exclusions!.defaults }
  setupSettingsCache_({ exclusionRules: conf_.exclusions!.rules })
  buildTester()
  conf_.exclusions = null

  saveBtn2.onclick = saveOptions
  document.addEventListener("keyup", onEnterKeyUp)

  initOptionsLink(_url)
  updateBottomLeft()
  initExclusionRulesTable()
  nextTick_(showI18n_)
  setupBorderWidth_ && nextTick_(setupBorderWidth_)
  nextTick_(didShow)
})

const onEnterKeyUp = (event: KeyboardEventToPrevent): void => {
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
}

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
  blockedMsg.querySelector("#version")!.textContent = conf_.ver
  const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement
  let uad: Navigator["userAgentData"] | undefined
  let uaList: UABrandInfo[] | null | undefined
  if (OnFirefox || conf_.tabId < 0 || !_url || !(<RegExpI> /^(ht|s?f)tp/i).test(_url)) {
    refreshTip.remove()
  } else if (OnEdge) {
    (refreshTip.querySelector(".action") as HTMLElement).textContent = "open a new web page"
  } else if (OnChrome && !IsEdg_ && ((uad = navigator.userAgentData, uaList =
          Build.MinCVer >= BrowserVer.MinEnsuredNavigator$userAgentData ? uad!.brands : uad && (uad.brands
          || (Build.MinCVer > BrowserVer.Only$navigator$$userAgentData$$$uaList ? null : uad.uaList)))
        ? uaList.find(i => i.brand.includes("Opera"))
        : (<RegExpOne> /\b(Opera|OPR)\//).test(navigator.userAgent!))
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
      prevent_(event)
      void post_(kPgReq.runFgOn, conf_.tabId).then((): void => {
        window.close()
      })
    }
  } else {
    (retryInjectElement.nextElementSibling as HTMLElement).remove()
    retryInjectElement.remove()
  }
}
