import { BG_, bgSettings_, OnFirefox, OnEdge, OnChrome } from "./async_bg"
import {
  ExclusionVisibleVirtualNode, ExclusionRulesOption_, Option_, $, nextTick_, pTrans_, setupBorderWidth_
} from "./options_base"

let bgExclusions: typeof Exclusions
let frameInfo: Frames.Sender
let url: string, topUrl = ""
let inited: 0 | 1 /* no initial matches */ | 2 /* some matched */ | 3 /* is saving (temp status) */ = 0
let saved = true, oldPass: string | null = null, curLockedStatus = Frames.Status.__fake
let exclusions: PopExclusionRulesOption = null as never
let toggleAction: "Disable" | "Enable", curIsLocked: boolean

const stateAction = $<EnsuredMountedHTMLElement>("#state-action")
const saveBtn2 = $<HTMLButtonElement>("#saveOptions") as HTMLButtonElement & { firstChild: Text }
let stateValue = stateAction.nextElementSibling, stateTail = stateValue.nextElementSibling

class PopExclusionRulesOption extends ExclusionRulesOption_ {
  addRule_ (_pattern: string, autoFocus?: false): void {
    super.addRule_(PopExclusionRulesOption.generateDefaultPattern_(), autoFocus)
  }
  isPatternMatched_ (pattern: string): boolean {
    if (!pattern) { return false }
    const rule = bgExclusions.testers_.get(pattern)!
    if (rule.t === ExclusionsNS.TesterType.StringPrefix
        ? url.startsWith(rule.v) && (!topUrl || topUrl.startsWith(rule.v))
        : rule.v.test(url) && (!topUrl || rule.v.test(topUrl))) {
      return true
    }
    return false
  }
  populateElement_ (rules1: ExclusionsNS.StoredRule[]): void {
    super.populateElement_(rules1)
    const a = this
    a.populateElement_ = null as never // ensure .populateElement_ is only executed for once
    (document.documentElement as HTMLHtmlElement).style.height = ""
    PopExclusionRulesOption.prototype.isPatternMatched_ = ExclusionRulesOption_.prototype.isPatternMatched_
    let visible_ = a.list_.filter(i => i.visible_) as ExclusionVisibleVirtualNode[], some = visible_.length > 0
    let element1: SafeHTMLElement
    inited = some ? 2 : 1
    if (some) {
      element1 = visible_[0].$keys_
      updateState(true)
    } else {
      a.addRule_("", false)
      element1 = (a.list_[a.list_.length - 1] as ExclusionVisibleVirtualNode).$keys_
    }
    nextTick_(() => element1.focus())
  }
  updateVNode_ (vnode: ExclusionVisibleVirtualNode, pattern: string, keys: string): void {
    const patternIsSame = vnode.rule_.pattern === pattern
    super.updateVNode_(vnode, pattern, keys)
    if (patternIsSame) {
      return
    }
    const parsedPattern = bgExclusions.createRule_(pattern, ""), patternElement = vnode.$pattern_
    if (parsedPattern.t === ExclusionsNS.TesterType.StringPrefix
        ? url.startsWith(parsedPattern.v) : parsedPattern.v.test(url)) {
      patternElement.title = patternElement.style.color = ""
    } else {
      patternElement.style.color = "red"
      patternElement.title = "Red text means that the pattern does not\nmatch the current URL."
    }
  }
  static generateDefaultPattern_ (this: void): string {
    const url2 = url.startsWith("http:")
      ? "^https?://"
        + url.split("/", 3)[2].replace(<RegExpG> /[.[\]]/g, "\\$&") + "/" // lgtm [js/incomplete-sanitization]
      : url.startsWith(location.origin)
      ? ":vimium:/" + new URL(url).pathname.replace("/pages", "")
      : (<RegExpOne> /^[^:]+:\/\/./).test(url) && !url.startsWith("file:")
      ? ":" + (url.split("/", 3).join("/") + "/")
      : ":" + url
    PopExclusionRulesOption.generateDefaultPattern_ = () => url2
    return url2
  }
}

const updateState = (updateOldPass: boolean): void => {
  const isSaving = inited === 3
  let pass = isSaving ? bgExclusions.GetPassKeys_(url, frameInfo)
        : bgExclusions.getTemp_(url, frameInfo, exclusions.readValueFromElement_(true))
  pass && (pass = collectPass(pass))
  if (updateOldPass) {
    oldPass = inited >= 2 ? pass : null
  }
  inited = 2
  const same = pass === oldPass
  const isReversed = !!pass && pass.length > 2 && pass[0] === "^"
  stateAction.textContent =
    (isSaving ? pass ? pTrans_("o137") + pTrans_(isReversed ? "o138" : "o139") : pTrans_("o140")
      : pTrans_(same ? "o141" : "o142") + pTrans_(pass ? isReversed ? "o138" : "o139" : same ? "o143" : "o143_2")
      ).replace(" to be", "")
    + pTrans_("colon") + (pass ? pTrans_("NS") : "")
  stateValue.className = pass ? "code" : "fixed-width"
  stateValue.textContent = pass ? isReversed ? pass.slice(2) : pass
    : pTrans_(pass !== null ? "o144" : "o145") + pTrans_("o146")
  stateTail.textContent = curIsLocked && !isSaving && same
    ? pTrans_("o147", [pTrans_(curLockedStatus !== Frames.Status.enabled ? "o144" : "o145")])
    : curIsLocked ? pTrans_("o148") : ""
  saveBtn2.disabled = same
  saveBtn2.firstChild.data = pTrans_(same ? "o115" : "o115_2")
}

const saveOptions = (): void => {
  if (saveBtn2.disabled) {
    return
  }
  const testers = bgExclusions.testers_
  BG_.Backend_.forceStatus_("reset silent", frameInfo.t)
  exclusions.save_()
  setTimeout(function () {
    bgExclusions.testers_ = testers
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
  BG_.Backend_.forceStatus_(act.toLowerCase() as "reset" | "enable" | "disable", frameInfo.t)
  window.close()
}

const initBottomLeft = (): void => {
  toggleAction = frameInfo.s !== Frames.Status.disabled ? "Disable" : "Enable"
  curIsLocked = !!(frameInfo.f & Frames.Flags.locked)
  curLockedStatus = curIsLocked ? frameInfo.s : Frames.Status.__fake
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
  const element = $<HTMLAnchorElement>(".options-link"), optionsUrl = bgSettings_.CONST_.OptionsPage_
  if (_url.startsWith(optionsUrl)) {
    (element.nextElementSibling as HTMLElement).remove()
    element.remove()
  } else {
    element.href !== optionsUrl && (element.href = optionsUrl)
    element.onclick = (event: EventToPrevent): void => {
      event.preventDefault()
      const a: MarksNS.FocusOrLaunch = BG_.Object.create(null)
      a.u = bgSettings_.CONST_.OptionsPage_
      BG_.Backend_.reqH_[kFgReq.focusOrLaunch](a)
      window.close()
    }
  }
}

const initExclusionRulesTable = (): void => {
  const rules = bgSettings_.get_("exclusionRules")
    , ref1: typeof bgExclusions.testers_ = bgExclusions.testers_ = new (BG_ as {} as typeof globalThis).Map()
    , ref2 = bgExclusions.rules_
  for (let _i = 0, _len = rules.length; _i < _len; _i++) {
    ref1.set(rules[_i].pattern, ref2[_i])
  }
  OnChrome && bgSettings_.payload_.o || window.addEventListener("keydown", function (event): void {
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
  Option_.suppressPopulate_ = false
  exclusions.fetch_()
  if (!Build.NDEBUG) {
    interface WindowEx extends Window { exclusions?: PopExclusionRulesOption }
    (window as WindowEx).exclusions = exclusions
  }
  window.onunload = function (): void {
    bgExclusions.testers_ = null as never
  }
}

Promise.resolve(bgSettings_.restore_ && bgSettings_.restore_()).then(((callback): () => void =>
    (): void => { chrome.tabs.query({currentWindow: true, active: true}, callback) }
)((activeTabs: [chrome.tabs.Tab] | never[]): void => {
  const curTab = activeTabs[0], _url = curTab.url
  let ref = BG_.Backend_.indexPorts_(curTab.id), blockedMsg = $("#blocked-msg")
  const notRunnable = !(ref || curTab && _url && curTab.status === "loading" && (<RegExpOne> /^(ht|s?f)tp/).test(_url))
  if (notRunnable) {
    onNotRunnable(blockedMsg, curTab, _url)
    initOptionsLink(_url)
    return
  }
  nextTick_((versionEl): void => {
    blockedMsg.remove()
    blockedMsg = null as never
    const docCls = (document.documentElement as HTMLHtmlElement).classList
    docCls.toggle("auto-dark", !!bgSettings_.payload_.d)
    docCls.toggle("less-motion", !!bgSettings_.payload_.m)
    versionEl.textContent = bgSettings_.CONST_.VerName_
  }, $(".version"))

  bgExclusions = BG_.Exclusions as typeof Exclusions
  frameInfo = ref && (!ref[0].s.i || BG_.BgUtils_.protocolRe_.test(ref[0].s.u)) ? ref[0].s : {
    /** must keep aligned with {@link ../background/main.ts#formatPortSender} */
    i: 0,
    a: curTab.incognito,
    s: Frames.Status.enabled, // not real
    f: Frames.Flags.blank,
    t: curTab.id,
    u: _url
  }
  if (frameInfo.i) {
    topUrl = ((BG_.Backend_.indexPorts_(curTab.id, 0) || {} as Frames.Port).s || {} as Frames.Sender).u || _url
  }
  url = frameInfo.u

  saveBtn2.onclick = saveOptions
  document.addEventListener("keyup", function (event): void {
    if (event.keyCode === kKeyCode.enter && (event.ctrlKey || event.metaKey)) {
      setTimeout(window.close, 300)
      if (!saved) { saveOptions() }
    }
  })

  initOptionsLink(_url)
  initBottomLeft()
  initExclusionRulesTable()
  setupBorderWidth_ && nextTick_(setupBorderWidth_)
}))

const onNotRunnable = (blockedMsg: HTMLElement, curTab: chrome.tabs.Tab | null, _url: string) => {
  const body = document.body as HTMLBodyElement, docEl = document.documentElement as HTMLHtmlElement
  body.innerText = ""
  blockedMsg.style.display = ""
  blockedMsg.querySelector(".version")!.textContent = bgSettings_.CONST_.VerName_
  const refreshTip = blockedMsg.querySelector("#refresh-after-install") as HTMLElement
  if (OnFirefox
      || !curTab || !_url || !(<RegExpI> /^(ht|s?f)tp/i).test(_url)
      ) {
    refreshTip.remove()
  } else if (OnEdge) {
    (refreshTip.querySelector(".action") as HTMLElement).textContent = "open a new web page"
  } else if ((<RegExpOne> /\bOpera\//).test(navigator.userAgent)
      && (<RegExpOne> /\.(google|bing|baidu)\./).test(_url.split("/", 4).slice(0, 3).join("/"))) {
    (blockedMsg.querySelector("#opera-warning") as HTMLElement).style.display = ""
  }
  body.style.width = "auto"
  body.appendChild(blockedMsg)
  const extHost = _url.startsWith(location.protocol) && !_url.startsWith(location.origin) ? new URL(_url).host : "",
  extStat = extHost ? bgSettings_.extAllowList_.get(extHost) : null
  if (extStat != null && (!OnChrome ? !extStat || typeof extStat === "string" : !extStat)) {
    const refusedEl = $<EnsuredMountedHTMLElement>("#injection-refused")
    refusedEl.style.display = ""
    refusedEl.nextElementSibling.remove()
    $<HTMLAnchorElement>("#doAllowExt").onclick = function () {
      let list = bgSettings_.get_("extAllowList"), old = list.split("\n"), extIdToAdd = extHost
      if (!OnChrome) {
        let maybeId = bgSettings_.extAllowList_.get(extHost)
        extIdToAdd = typeof maybeId === "string" && maybeId ? maybeId : extIdToAdd
      }
      if (old.indexOf(extIdToAdd) < 0) {
        const ind = old.indexOf("# " + extIdToAdd) + 1 || old.indexOf("#" + extIdToAdd) + 1
        old.splice(ind ? ind - 1 : old.length, ind ? 1 : 0, extIdToAdd)
        list = old.join("\n")
        bgSettings_.set_("extAllowList", list)
      }
      this.onclick = null as never
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs1): void => {
        const cb = (): void => {
          setTimeout((): void => location.reload(), 500)
          return chrome.runtime.lastError
        }
        tabs1 && tabs1[0] ? chrome.tabs.reload(tabs1[0].id, cb) : chrome.tabs.reload(cb)
        return chrome.runtime.lastError
      })
    }
  }
  docEl.classList.toggle("auto-dark", !!bgSettings_.payload_.d)
  docEl.style.height = ""
  const retryInjectElement = $<HTMLAnchorElement>("#retryInject")
  if (!OnFirefox && (<RegExpOne> /^(file|ftps?|https?):/).test(_url) && curTab) {
    retryInjectElement.onclick = (event) => {
      event.preventDefault()
      if (!BG_.Backend_.indexPorts_(curTab.id)) {
        const offset = location.origin.length, ignoreErr = (): void => {}
        for (let js of bgSettings_.CONST_.ContentScripts_) {
          chrome.tabs.executeScript(curTab.id, {file: js.slice(offset), allFrames: true}, ignoreErr)
        }
      }
      window.close()
    }
  } else {
    (retryInjectElement.nextElementSibling as HTMLElement).remove()
    retryInjectElement.remove()
  }
}