import { kPgReq } from "../background/page_messages"
import {
  CurCVer_, CurFFVer_, OnFirefox, OnChrome, OnEdge, $, $$, post_, disconnect_, isVApiReady_, simulateClick,
  toggleDark, browser_, selfTabId_, enableNextTick_, nextTick_, kReadyInfo, IsEdg_, import2, BrowserName_
} from "./async_bg"
import {
  bgSettings_,
  KnownOptionsDataset, showI18n, setupBorderWidth_, Option_, PossibleOptionNames, AllowedOptions, debounce_, oTrans_
} from "./options_base"
import { saveBtn, exportBtn, savedStatus, BooleanOption_, onKeyMappingsError } from "./options_defs"
import { manifest } from "./options_permissions"

interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
export interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}

export let delayed_task: [string, MouseEventToPrevent | null] | null | undefined
export const advancedOptBtn = $<AdvancedOptBtn>("#advancedOptionsButton")
let advancedMode = false
export const clear_delayed_task = (): void => { delayed_task = null }

enableNextTick_(kReadyInfo.LOCK)
nextTick_(showI18n)
setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_((versionEl): void => {
  versionEl.textContent = manifest.version_name || manifest.version
}, $(".version"))

saveBtn.onclick = (virtually): void => {
    if (virtually !== false) {
      void Option_.saveOptions_().then((changed): void => { changed && saveBtn.onclick(false) })
      return
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    if (OnFirefox) {
      saveBtn.blur()
    }
    saveBtn.disabled = true;
    (saveBtn.firstChild as Text).data = oTrans_("o115_3")
    exportBtn.disabled = false;
    savedStatus(false)
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout((toSync1: typeof Option_.syncToFrontend_): void => {
      void post_(kPgReq.notifyUpdate, toSync1.map(key => bgSettings_.valuesToLoad_[key]))
    }, 100, toSync)
}

let optionsInit1_ = function (): void {
  advancedOptBtn.onclick = function (ev, init): void {
    const el = $("#advancedOptions")
    let oldVal: boolean | null = null
    const loadOld = (): boolean => oldVal = <boolean> bgSettings_.get_("showAdvancedOptions")
    if (ev != null || (init === "hash" && loadOld() === false)) {
      advancedMode = !advancedMode;
      void bgSettings_.set_("showAdvancedOptions", advancedMode)
    } else {
      advancedMode = oldVal != null ? oldVal : loadOld()
    }
    nextTick_((): void => {
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    const s = advancedMode ? "Hide" : "Show";
    (this.firstChild as Text).data = oTrans_(s) || s
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  advancedOptBtn.onclick(null, true)
  let _element: HTMLElement
  let _ref: { length: number; [index: number]: HTMLElement }
  Option_.suppressPopulate_ = false
  if (Build.NDEBUG) {
    for (let key in Option_.all_) { void Option_.all_[key as "vimSync"].fetch_() }
  } else {
    const fetching = Object.values(Option_.all_).map(i => i.fetch_() && i.field_).filter(i => i)
    if (fetching.length > 0) {
      console.log("Warning: some options are not ready to fetch:", fetching.join(", "))
    }
  }
  OnFirefox && Build.OS & (1 << kOS.unixLike) && bgSettings_.os_ === kOS.unixLike && nextTick_((): void => {
    for (let key in Option_.all_) {
      const obj = Option_.all_[key as "vimSync"]
      if (obj instanceof BooleanOption_) {
        obj.element_.classList.add("baseline")
      }
    }
  });
  if (Option_.all_.exclusionRules.previous_.length > 0) {
    nextTick_((el): void => {
      el.style.visibility = "";
    }, $("#exclusionToolbar"));
  }

  _ref = $$("[data-check]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _element = _ref[_i];
    _element.addEventListener((_element.dataset as KnownOptionsDataset).check || "input", loadChecker);
  }

  document.addEventListener("keyup", function (this: void, event): void {
    const el = event.target as Element, i = event.keyCode;
    if (i !== kKeyCode.enter) {
      if (i !== kKeyCode.space) { return; }
      if (el instanceof HTMLSpanElement && el.parentElement instanceof HTMLLabelElement) {
        event.preventDefault();
        simulateClick(el.parentElement.control as HTMLElement)
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute("href") || setTimeout(function (el1) {
        simulateClick(el1)
        el1.blur();
      }, 0, el);
    } else if (event.ctrlKey || event.metaKey) {
      el.blur && el.blur();
      if (savedStatus()) {
        return saveBtn.onclick();
      }
    }
  });

  let func: {
    (this: HTMLElement, event: MouseEventToPrevent): void;
  } | ElementWithDelay["onclick"] = function (this: HTMLElement): void {
    const target = $("#" + (this.dataset as KnownOptionsDataset).autoResize)
    let height = target.scrollHeight, width = target.scrollWidth, dw = width - target.clientWidth;
    if (height <= target.clientHeight && dw <= 0) { return; }
    const maxWidth = Math.max(Math.min(innerWidth, 1024) - 120, 550);
    target.style.maxWidth = width > maxWidth ? maxWidth + "px" : "";
    target.style.height = target.style.width = "";
    dw = width - target.clientWidth;
    let delta = target.offsetHeight - target.clientHeight;
    delta = dw > 0 ? Math.max(26, delta) : delta + 18;
    height += delta;
    if (dw > 0) {
      target.style.width = target.offsetWidth + dw + 4 + "px";
    }
    target.style.height = height + "px";
  };
  _ref = $$("[data-auto-resize]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  func = function (event): void {
    let str = (this.dataset as KnownOptionsDataset).delay, e = null as MouseEventToPrevent | null
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    delayed_task = ["#" + this.id, e]
    if (document.readyState === "complete") {
      void import2("./options_ext.js")
      return;
    }
    window.addEventListener("load", function onLoad(event1): void {
      if (event1.target === document) {
        window.removeEventListener("load", onLoad);
        void import2("./options_ext.js")
      }
    });
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredWebkitUserSelectAll
      && CurCVer_ < BrowserVer.MinEnsuredWebkitUserSelectAll) {
  _ref = $$(".sel-all");
  func = function (this: HTMLElement, event): void {
    if (event.target !== this) { return; }
    event.preventDefault();
    getSelection().selectAllChildren(this);
  } as ElementWithDelay["onmousedown"];
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onmousedown = func;
  }
  }

  _ref = $$("[data-permission]");
  _ref.length > 0 && ((els: typeof _ref): void => {
    const validKeys2 = manifest.permissions || []
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = (el.dataset as KnownOptionsDataset).permission
      let transArgs: ["beforeChromium" | "lackPermission", string[]]
      if (key[0] === "C") {
        if (OnChrome ? CurCVer_ >= parseInt(key.slice(1)) : key.includes("nonC")) { continue }
        const secondCond = key.split(",", 2)[1] || ","
        if (secondCond[0] === "." ? (window as Dict<any>)[secondCond.slice(1)] != null
            : secondCond[0] === "(" && matchMedia(secondCond.slice(1, -1))) { continue }
        if (!OnChrome && secondCond[0] === ".") {
          nextTick_((el2): void => { el2.style.display = "none" }, el.parentElement as HTMLElement)
          continue
        }
        transArgs = OnChrome || secondCond === "," ? ["beforeChromium", [key.slice(1).split(",", 1)[0]]]
            : ["lackPermission", [secondCond]]
      } else {
        if (key in manifest || validKeys2.includes(key)) { continue }
        transArgs = ["lackPermission", [key ? ":\n* " + key : ""]]
      }
      nextTick_((el1): void => {
        (el1 as TextElement).disabled = true;
        const str = oTrans_("invalidOption", [oTrans_(transArgs[0], transArgs![1])])
        if (el1 instanceof HTMLInputElement && el1.type === "checkbox") {
          (el1 as SafeHTMLElement as EnsuredMountedHTMLElement).nextElementSibling.tabIndex = -1;
          el1 = el1.parentElement as HTMLElement;
          el1.title = str
        } else {
          (el1 as TextElement).value = "";
          el1.title = str;
          (el1.parentElement as HTMLElement).onclick = onclick;
          if (el1 instanceof HTMLSpanElement) {
            el1.style.textDecoration = "line-through"
          }
        }
      }, el);
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as TextElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = (el.dataset as KnownOptionsDataset).permission
      el.placeholder = oTrans_("lackPermission", [key ? `: "${key}"` : ""]);
    }
  })(_ref);
  if (OnEdge) {
    nextTick_((tipForNoShadow): void => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  nextTick_((): void => { setTimeout((): void => {
    const ref2 = $$("[data-href]")
    for (let _i = ref2.length; 0 <= --_i; ) {
      const element = ref2[_i] as HTMLAnchorElement & { dataset: KnownOptionsDataset }
      void post_(kPgReq.convertToUrl, [element.dataset.href, Urls.WorkType.ConvertKnown]).then(([str]): void => {
        element.removeAttribute("data-href")
        element.href = str
      })
    }
    void post_(kPgReq.whatsHelp).then((matched): void => {
      matched !== "?" && nextTick_(([el, text]) => el.textContent = text, [$("#questionShortcut"), matched] as const)
    })
  }, 100) })


  _element = $<HTMLAnchorElement>("#openExtensionsPage");
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && CurCVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    nextTick_((el): void => { el.href = "chrome://extensions/configureCommands" }, _element as HTMLAnchorElement)
  } else if (OnFirefox) {
    nextTick_(([el, el2, el3]): void => {
      el.textContent = el.href = "about:addons";
      const el1 = el.parentElement as HTMLElement, prefix = GlobalConsts.FirefoxAddonPrefix;
      el1.insertBefore(new Text(oTrans_("manageShortcut")), el); // lgtm [js/superfluous-trailing-arguments]
      el1.insertBefore(new Text(oTrans_("manageShortcut_2")) // lgtm [js/superfluous-trailing-arguments]
          , el.nextSibling);
      el2.href = prefix + "shortcut-forwarding-tool/?src=external-vc-options";
      el3.href = prefix + "newtab-adapter/?src=external-vc-options";
    }, [_element as HTMLAnchorElement,
        $<HTMLAnchorElement>("#shortcutHelper"), $<HTMLAnchorElement>("#newTabAdapter")] as const);
  }
  (_element as HTMLAnchorElement).onclick = function (event): void {
    event.preventDefault();
    if (OnFirefox) {
      VApi ? VApi.h(kTip.raw, 0, oTrans_("haveToOpenManually"))
      : alert(oTrans_("haveToOpenManually"))
    } else {
      void post_(kPgReq.focusOrLaunch, { u: this.href, p: true })
    }
  };

  if (OnFirefox || OnChrome) {
    nextTick_((el): void => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = oTrans_("NewTabAdapter");
      if (OnFirefox) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/?src=external-vc-options_omni";
      }
      anchor.title = name + " - " + oTrans_(OnFirefox ? "addons" : "webstore");
    }, $("#chromeExtVomnibar"));
  }

  _ref = $$(".ref-text");
  const onRefStatClick = function (this: HTMLElement, event: MouseEventToPrevent): void {
    if (!advancedMode) {
      $<AdvancedOptBtn>("#advancedOptionsButton").onclick(null);
    }
    event.preventDefault();
    const node2 = Option_.all_[this.getAttribute("for") as "ignoreKeyboardLayout"
        ].element_.nextElementSibling as SafeHTMLElement;
    {
      OnChrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        && CurCVer_ < BrowserVer.MinScrollIntoViewOptions
      ? node2.scrollIntoViewIfNeeded!()
      : node2.scrollIntoView({ block: "center" });
      node2.focus();
    }
    if (VApi) {
      VApi.x((node2 as EnsuredMountedHTMLElement).parentElement.parentElement as SafeHTMLElement)
    }
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    const opt = Option_.all_[ _ref[_i].getAttribute("for") as PossibleOptionNames<boolean> as "ignoreKeyboardLayout"]
    const oldOnSave = opt.onSave_
    opt.onSave_ = (): void | Promise<void> => {
      nextTick_((ref2): void => {
        ref2.textContent = oTrans_(opt.readValueFromElement_() > 1 ? "o145_2" : "o144")
      }, $(`#${opt.element_.id}Status`))
      return oldOnSave.call(opt)
    }
    _ref[_i].onclick = onRefStatClick;
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    opt.element_.addEventListener("change", opt.onSave_, true)
  }
},
optionsInitAll_ = function (): void {
  optionsInit1_()
  optionsInit1_ = optionsInitAll_ = null as never

  !(Build.OS & (1 << kOS.mac)) || Build.OS & ~(1 << kOS.mac) && bgSettings_.os_ ||
  nextTick_((el): void => { el.textContent = "Cmd" }, $("#Ctrl"))
  for (let key in Option_.all_) {
    void Option_.all_[key as keyof AllowedOptions].onSave_()
  }
  nextTick_((): void => { document.documentElement!.classList.remove("loading") })
  void isVApiReady_.then(disconnect_)
  location.hash && nextTick_(window.onhashchange as () => void)
  enableNextTick_(kReadyInfo.NONE, kReadyInfo.LOCK);

  Option_.all_.keyMappings.onSave_ = () => post_(kPgReq.keyMappingErrors).then(onKeyMappingsError)
  let useDarkQuery = true
  let darkMedia: MediaQueryList | null = matchMedia("(prefers-color-scheme: dark)")
  const onChange = (): void => {
    if (Build.MV3 || OnFirefox && (Build.MinFFVer >= FirefoxBrowserVer.MinMediaQueryListenersWorkInBg
          || CurFFVer_ > FirefoxBrowserVer.MinMediaQueryListenersWorkInBg - 1)) { /* empty */ }
    else if (!useDarkQuery || !darkOpt.saved_) { /* empty */ }
    else { void post_(kPgReq.updateMediaQueries) }
    setTimeout(useLocalStyle, 34)
  }
  const darkOpt = Option_.all_.autoDarkMode
  const useLocalStyle = (): void => {
      const rawVal = darkOpt.readValueFromElement_()
      const val = rawVal === 2 ? !!darkMedia && darkMedia.matches : rawVal === 1
      if (VApi && VApi.z) {
        const root = VApi.y().r
        if (root) {
          for (let el of OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
                && Build.MinCVer >= BrowserVer.BuildMinForOf && CurCVer_ < BrowserVer.MinEnsured$ForOf$ForDOMListTypes
                ? [].slice.call(root.children) : root.children as ArrayLike<Element> as HTMLElement[]) {
            if (el.localName !== "style") {
              el.classList.toggle("D", val)
              el = el.firstElementChild as HTMLElement | null || el
              if (el.localName === "iframe") {
                const isFind = el.classList.contains("Find")
                const childDoc = (el as HTMLIFrameElement).contentDocument!
                const dark = childDoc.querySelector("style#dark") as HTMLStyleElement
                dark && dark.sheet && (dark.sheet.disabled = !val)
                childDoc.body!.classList.toggle(isFind ? "D" : "has-dark", val)
                if (isFind) {
                  const input = VApi.y().f
                  input && input.parentElement!.classList.toggle("D", val)
                }
              }
            }
          }
        }
        void (post_(kPgReq.updatePayload, { key: "d", val }) as Promise<SettingsNS.FrontendSettingCache["d"]>)
        .then((val2): void => { VApi!.z!.d = val2 })
      }
      toggleDark(val ? rawVal === 2 ? 2 : 1 : 0)
  }
  // As https://bugzilla.mozilla.org/show_bug.cgi?id=1550804 said, to simulate color schemes, enable
  // https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#Color_scheme_simulation
  darkOpt.onSave_ = onChange;
  (OnChrome ? (Build.MinCVer >= BrowserVer.MinMediaQuery$PrefersColorScheme
      || CurCVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme - 1) : !OnEdge) ? nextTick_((): void => {
    if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
        && CurFFVer_ < FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme - 1) {
      darkMedia = null
      return
    }
    darkOpt.previous_ === 2 && void isVApiReady_.then(onChange)
    darkMedia!.onchange = onChange
  }) : (darkMedia = null)

  OnFirefox && setTimeout((): void => {
    const K = GlobalConsts.kIsHighContrast
    const hasFC = matchMedia("(forced-colors)").matches
    let valInLocal: string | null | undefined
    const test = hasFC ? null : document.createElement("div")
    if (test) {
      test.style.display = "none"
      test.style.color = "#543";
      (document.body as HTMLBodyElement).append!(test)
    }
    void post_(kPgReq.getStorage, K).then((res): void => {
      valInLocal = res[K] as string | undefined
      if (!test && valInLocal == null) { return }
    requestIdleCallback!((): void => {
      const newColor = test && (getComputedStyle(test).color || "").replace(<RegExpG> / /g, "").toLowerCase()
      const isHC = hasFC ? false : !!newColor && newColor !== "rgb(85,68,51)"
      test && test.remove()
      const oldIsHC = valInLocal === "1"
      if (isHC !== oldIsHC) {
        void post_(kPgReq.reloadCSS, { hc: isHC })
      }
    }, { timeout: 1e3 })
    })
  }, 34)
};

(Option_.all_.userDefinedCss.element_ as HTMLTextAreaElement).addEventListener("input", debounce_((): void => {
  const self = Option_.all_.userDefinedCss
  const isDebugging = self.element_.classList.contains("debugging")
  if (self.saved_ && !isDebugging || !VApi || !VApi.z) { return }
  const newVal = self.readValueFromElement_(), isSame = newVal === self.previous_,
  cssPromise = post_(kPgReq.parseCSS, [newVal, selfTabId_]), misc = VApi.y(), root = misc.r
  void cssPromise.then(css => {
  self.element_.classList.toggle("debugging", !isSame)
  VApi!.t({
    k: root || isSame ? 0 : kTip.raw, t: oTrans_("livePreview") || "Live preview CSS\u2026",
    H: css.ui, f: css.find
  })
  const frame = root && root.querySelector("iframe.Omnibar") as HTMLIFrameElement | null
  const doc = frame && frame.contentDocument
  if (doc) {
    let styleDebug = doc.querySelector("style.debugged") || doc.querySelector("style#custom")
    if (!styleDebug) {
      /** should keep the same as {@link ../front/vomnibar#Vomnibar_.css_} */
      (styleDebug = doc.createElement("style")).type = "text/css"
      styleDebug.id = "custom"
    }
    styleDebug.parentNode || (doc.head as HTMLHeadElement).appendChild(styleDebug)
    styleDebug.classList.add("debugged")
    styleDebug.textContent = (isSame ? "\n" : "\n.transparent { opacity: 1; }\n") + (css.omni && css.omni + "\n" || "")
  }
  })
}, 1200, null, 0))

if (OnChrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && CurCVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  nextTick_(el => { el.classList.add("font-fix") }, $("select"))
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : simulateClick($("#settingsFile"))
};

nextTick_((el0): void => {
  const platform = bgSettings_.platform_
  let name = BrowserName_
  if (!name) {
  const data = navigator.userAgentData
  const brands = (data && (OnChrome && Build.MinCVer <= BrowserVer.Only$navigator$$userAgentData$$$uaList
      ? data.brands || data.uaList : data.brands) || []
    ).filter(i => (OnChrome ? i.version === CurCVer_ && i.brand !== "Chromium"
      : OnFirefox ? i.version === CurFFVer_ : true) && !(` ${i.brand} `.includes(" Not ")))
  const brand = OnChrome && brands.find(i => i.brand.includes("Edge")) || brands[0]
  const nameFallback = OnFirefox ? "Firefox" : IsEdg_ ? "MS Edge" : ""
  name = brand ? brand.brand : data ? nameFallback || "Chromium"
      : OnChrome && ((<RegExpOne> /\bChromium\b/).exec(navigator.userAgent!) || [""])[0] || nameFallback || "Chrome"
  }
el0.textContent = (OnEdge ? "MS Edge (EdgeHTML)" : name + " " + (OnFirefox ? CurFFVer_ : CurCVer_)
  ) + oTrans_("comma") + oTrans_("NS")
  + (oTrans_(platform as "win" | "mac") || platform[0].toUpperCase() + platform.slice(1))
if (OnChrome && IsEdg_) {
  const a = $<HTMLAnchorElement>("#openExtensionsPage");
  a.textContent = a.href = "edge://extensions/shortcuts";
}
}, $("#browserName"));

export const loadChecker = (): void => { void import2("./options_checker.js") }

document.addEventListener("keydown", (event): void => {
  if (event.keyCode !== kKeyCode.space) {
    if (!VApi || !VApi.z || "input textarea".includes(document.activeElement!.localName as string)) { return; }
    const key = VApi.r[3]({c: kChar.INVALID, e: event, i: event.keyCode}, kModeId.NO_MAP_KEY)
    if (key === "a-" + kChar.f12) {
      let el2 = $<HTMLSelectElement>("#importOptions");
      const oldSelected = el2.selectedIndex, callback = (): void => {
        el2.onchange && el2.onchange(null as never)
        el2.selectedIndex = oldSelected
      }
      $<HTMLOptionElement>("#recommendedSettings").selected = true;
      el2.onchange != null ? callback() : setTimeout(callback, 100) && el2.click()
    }
    else if (key === "?") {
      if (!Build.NDEBUG) {
        console.log('The document receives a "?" key which has been passed (excluded) by Vimium C,',
          "so open the help dialog.");
      }
      $("#showCommands").click();
    }
    return;
  }
  const el = event.target as Element;
  if (el.localName === "span" && (el as EnsuredMountedHTMLElement).parentElement.localName === "label") {
    event.preventDefault();
  }
});

window.onhashchange = (): void => {
  let hash = location.hash, node: HTMLElement | null;
  hash = hash.slice(hash[1] === "!" ? 2 : 1);
  if (!hash || !(<RegExpI> /^[a-z][a-z\d_-]*$/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
        (node as ElementWithHash).onclick(null, "hash");
    }
  } else if (node = $("#" + hash)) {
    if ((node.dataset as KnownOptionsDataset).model) {
      node.classList.add("highlight")
    }
    const callback = function (event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        window.scrollTo(0, 0);
      }
      const node2 = node as Element;
      !(OnEdge || OnFirefox) ? node2.scrollIntoViewIfNeeded!() : node2.scrollIntoView();
    };
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
  }
};

void bgSettings_.preloadCache_().then(optionsInitAll_)

document.addEventListener("click", function onClickOnce(): void {
  const api1 = VApi, misc = api1 && api1.y()
  if (!misc || !misc.r) { return; }
  document.removeEventListener("click", onClickOnce, true);
  misc.r.addEventListener("click", function (event): void {
    let target = event.target as HTMLElement, str: string;
    if (VApi && target.classList.contains("HelpCommandName")) {
      str = target.textContent.slice(1, -1);
      VApi.p({
        H: kFgReq.copy,
        s: str
      });
    }
  }, true);

  OnChrome && document.addEventListener("click", (event): void => {
    const el = event.target as Element
    if (el.localName !== "a" || !(event.ctrlKey || event.metaKey) || selfTabId_ < GlobalConsts.TabIdNone) { return }
    const api2 = VApi, hintWorker = api2 && api2.b, stat = hintWorker && hintWorker.$()
    if (stat && stat.a && stat.k && stat.k.c === null) { // .a: isActive; .k.c === null : is calling executor
      const m1 = stat.m & ~HintMode.queue
      if (m1 < HintMode.min_job && m1 & HintMode.newTab && !(m1 & HintMode.focused)) {
          setTimeout((): void => {
            selfTabId_ >= 0 && (browser_.tabs ? browser_.tabs.update(selfTabId_, { active: true }, (): void => {})
            : void post_(kPgReq.callApi, { module: "tabs", name: "update", args: [selfTabId_, { active: true }] }))
          }, 0)
      }
    }
  })
}, true);
