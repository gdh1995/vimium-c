import {
  CurCVer_, CurFFVer_, BG_, bgSettings_, reloadBG_, OnFirefox, OnChrome, OnEdge, $, $$,
  toggleDark, toggleReduceMotion, asyncBackend_, browser_, enableNextTick_, nextTick_, kReadyInfo, IsEdg_, import2
} from "./async_bg"
import {
  KnownOptionsDataset, showI18n, setupBorderWidth_, Option_, PossibleOptionNames, AllowedOptions, debounce_, oTrans_
} from "./options_base"
import { saveBtn, exportBtn, savedStatus, BooleanOption_ } from "./options_defs"

interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
export interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}

export let Platform_: "win" | "linux" | "mac" | "unknown"
export let delayed_task: [string, MouseEventToPrevent | null] | null | undefined
export const clear_delayed_task = (): void => { delayed_task = null }


if (!OnEdge || browser_.runtime.getPlatformInfo) {
  browser_.runtime.getPlatformInfo((info): void => {
    Platform_ = (OnChrome ? info.os : info.os || "").toLowerCase() as "mac" | "win" | "linux"
    enableNextTick_(kReadyInfo.platformInfo)
  })
} else {
  Platform_ = OnEdge ? "win" : "unknown"
  enableNextTick_(kReadyInfo.platformInfo)
}
nextTick_(showI18n)
setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_((versionEl): void => {
  const manifest = browser_.runtime.getManifest()
  versionEl.textContent = manifest.version_name || manifest.version
}, $(".version"))

export interface AdvancedOptBtn extends HTMLButtonElement {
  onclick (_0: MouseEvent | null, init?: "hash" | true): void;
}

saveBtn.onclick = function (virtually): void {
    if (virtually !== false) {
      if (!Option_.saveOptions_()) {
        return;
      }
    }
    const toSync = Option_.syncToFrontend_;
    Option_.syncToFrontend_ = [];
    if (OnFirefox) {
      this.blur();
    }
    this.disabled = true;
    (this.firstChild as Text).data = oTrans_("o115_3");
    exportBtn.disabled = false;
    savedStatus(false)
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout((toSync1: typeof Option_.syncToFrontend_): void => {
      bgSettings_.broadcast_({ N: kBgReq.settingsUpdate, d: toSync1.map(key => bgSettings_.valuesToLoad_[key]) })
    }, 100, toSync)
}

let optionsInit1_ = function (): void {
  let advancedMode = false, _element: HTMLElement = $<AdvancedOptBtn>("#advancedOptionsButton");
  (_element as AdvancedOptBtn).onclick = function (this: AdvancedOptBtn, _0, init): void {
    const el = $("#advancedOptions")
    let oldVal: boolean | null = null
    const loadOld = (): boolean => oldVal = bgSettings_.get_("showAdvancedOptions")
    if (init == null || (init === "hash" && loadOld() === false)) {
      advancedMode = !advancedMode;
      bgSettings_.set_("showAdvancedOptions", advancedMode);
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
  (_element as AdvancedOptBtn).onclick(null, true);

  let _ref: { length: number; [index: number]: HTMLElement }
  for (let key in Option_.all_) { Option_.all_[key as "vimSync"].fetch_() }
  nextTick_((): void => {
    for (let key in Option_.all_) {
      const obj = Option_.all_[key as "vimSync"]
      if (OnFirefox && asyncBackend_.contentPayload_.o === kOS.unixLike && obj instanceof BooleanOption_) {
        obj.element_.classList.add("baseline")
      }
      obj.populateElement_(obj.previous_)
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
        click(el.parentElement.control as HTMLElement);
      }
      return;
    }
    if (el instanceof HTMLAnchorElement) {
      el.hasAttribute("href") || setTimeout(function (el1) {
        click(el1);
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
    const manifest = browser_.runtime.getManifest()
    for (const key of manifest.permissions || []) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = (el.dataset as KnownOptionsDataset).permission
      let transArgs: ["beforeChromium" | "lackPermission", string[]]
      if (key[0] === "C") {
        if (OnChrome && CurCVer_ >= parseInt(key.slice(1))) { continue }
        const secondCond = key.split(",", 2)[1] || ","
        if (secondCond[0] === "." ? (window as Dict<any>)[secondCond.slice(1)] != null
            : secondCond[0] === "(" && matchMedia(secondCond.slice(1, -1))) { continue }
        if (!OnChrome && secondCond[0] === ".") {
          nextTick_((el2): void => { el2.style.display = "none" }, el.parentElement as HTMLElement)
          continue
        }
        transArgs = ["beforeChromium", [key.slice(1).split(",", 1)[0]]]
      } else {
        if (key in manifest) { continue; }
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
    const element = ref2[_i] as HTMLInputElement;
    let str = asyncBackend_.convertToUrl_((element.dataset as KnownOptionsDataset).href
        , null, Urls.WorkType.ConvertKnown)
    element.removeAttribute("data-href");
    element.setAttribute("href", str);
    }
  }, 100) })


  _element = $<HTMLAnchorElement>("#openExtensionsPage");
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && CurCVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (_element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
  } else if (OnFirefox) {
    nextTick_(([el, el2, el3]) => {
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
      window.VApi ? VApi.t({ k: kTip.raw, t: oTrans_("haveToOpenManually") })
      : alert(oTrans_("haveToOpenManually"))
    } else {
      asyncBackend_.focusOrLaunch_({ u: this.href, p: true })
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
    if (window.VApi) {
      VApi.x((node2 as EnsuredMountedHTMLElement).parentElement.parentElement as SafeHTMLElement)
    }
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    const opt = Option_.all_[ _ref[_i].getAttribute("for") as PossibleOptionNames<boolean> as "ignoreKeyboardLayout"]
    const oldOnSave = opt.onSave_
    opt.onSave_ = (): void => {
      oldOnSave.call(opt)
      nextTick_((ref2): void => {
        ref2.textContent = oTrans_(opt.readValueFromElement_() > 1 ? "o145_2" : "o144")
      }, $(`#${opt.element_.id}Status`))
    }
    _ref[_i].onclick = onRefStatClick;
    opt.element_.addEventListener("change", opt.onSave_, true)
  }
},
optionsInitAll_ = function (): void {

Option_.suppressPopulate_ = false
optionsInit1_();
optionsInit1_ = optionsInitAll_ = null as never

for (let key in Option_.all_) {
  Option_.all_[key as keyof AllowedOptions].onSave_()
}
const newTabUrlOption_ = Option_.all_.newTabUrl
newTabUrlOption_.checker_!.check_(newTabUrlOption_.previous_)

if (!asyncBackend_.contentPayload_.o) {
  nextTick_((el): void => { el.textContent = "Cmd" }, $("#Ctrl"))
}

(window.onhashchange as () => void)();

if (OnChrome ? (Build.MinCVer >= BrowserVer.MinMediaQuery$PrefersColorScheme
        || CurCVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme - 1)
    : OnFirefox ? (Build.MinFFVer >= FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
        || CurFFVer_ > FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme)
    : !OnEdge) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.onchange = function (): void {
    asyncBackend_.updateMediaQueries_()
    setTimeout(useLocalStyle, 34)
  }
  const useLocalStyle = (first?: 1 | TimerType.fake): void => {
    const darkOpt = Option_.all_.autoDarkMode
    if (darkOpt.previous_ && darkOpt.saved_) {
      const val = media.matches
      if (window.VApi && VApi.z) {
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
        bgSettings_.updatePayload_("d", val, VApi.z)
      } else if (first === 1 && (val !== !!asyncBackend_.contentPayload_.d)) {
        setTimeout(useLocalStyle, 500)
      }
      toggleDark(val)
    }
  }
  // As https://bugzilla.mozilla.org/show_bug.cgi?id=1550804 said, to simulate color schemes, enable
  // https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#Color_scheme_simulation
  useLocalStyle(1)
}

Option_.all_.autoDarkMode.onSave_ = function (): void {
  asyncBackend_.updateMediaQueries_()
  toggleDark(this.previous_)
}
Option_.all_.autoReduceMotion.onSave_ = function (): void { toggleReduceMotion(this.previous_) }

if (OnFirefox) {
  setTimeout((): void => {
    const K = GlobalConsts.kIsHighContrast, storage = localStorage
    const hasFC = matchMedia("(forced-colors)").matches
    const test = hasFC ? null : document.createElement("div")
    if (test) {
      test.style.display = "none"
      test.style.color = "#543";
      (document.body as HTMLBodyElement).append!(test)
    } else if (storage.getItem(K) == null) {
      return
    }
    requestIdleCallback!((): void => {
      const newColor = test && (getComputedStyle(test).color || "").replace(<RegExpG> / /g, "").toLowerCase()
      const isHC = hasFC ? false : !!newColor && newColor !== "rgb(85,68,51)"
      test && test.remove()
      const oldIsHC = storage.getItem(K) === "1"
      if (isHC !== oldIsHC) {
        isHC ? storage.setItem(K, "1") : storage.removeItem(K);
        asyncBackend_.reloadCSS_(2)
      }
    }, { timeout: 1e3 })
  }, 34)
}
};

(Option_.all_.userDefinedCss.element_ as HTMLTextAreaElement).addEventListener("input", debounce_((): void => {
  const self = Option_.all_.userDefinedCss
  const isDebugging = self.element_.classList.contains("debugging")
  if (self.saved_ && !isDebugging || !window.VApi || !VApi.z) { return }
  const newVal = self.readValueFromElement_(), isSame = newVal === self.previous_,
  css = asyncBackend_.reloadCSS_(-1, newVal), misc = VApi.y(), root = misc.r
  if (!isDebugging && BG_) {
    browser_.tabs.query({ currentWindow: true, active: true }, (tabs?: [chrome.tabs.Tab?]): void => {
      if (tabs && tabs[0] && tabs[0].url === location.href) {
        const port = asyncBackend_.indexPorts_(tabs[0].id, 0) as Frames.Port | null
        port && (port.s.flags_ |= Frames.Flags.hasCSS | Frames.Flags.hasFindCSS)
      }
    })
  }
  self.element_.classList.toggle("debugging", !isSame)
  VApi.t({
    k: root || isSame ? 0 : kTip.raw, t: "Debugging CSS\u2026",
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
}, 1200, null, 0))

if (OnChrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && CurCVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  nextTick_(el => { el.classList.add("font-fix") }, $("select"))
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_((el0): void => {
  const data = navigator.userAgentData
  const brand = (data && data.brands || []).find(i => i.version === CurCVer_ && i.brand !== "Chromium")
  const nameFallback = OnFirefox ? "Firefox" : IsEdg_ ? "MS Edge" : ""
  const name = brand ? brand.brand : data ? nameFallback || "Chromium"
      : OnChrome && ((<RegExpOne> /\bChromium\b/).exec(navigator.userAgent!) || [""])[0] || nameFallback || "Chrome"
el0.textContent = (OnEdge ? "MS Edge (EdgeHTML)" : name + " " + (OnFirefox ? CurFFVer_ : CurCVer_)
  ) + oTrans_("comma") + oTrans_("NS")
  + (oTrans_(Platform_ as "win" | "mac") || Platform_[0].toUpperCase() + Platform_.slice(1))
if (OnChrome && IsEdg_) {
  const a = $<HTMLAnchorElement>("#openExtensionsPage");
  a.textContent = a.href = "edge://extensions/shortcuts";
}
}, $("#browserName"));

export const loadChecker = (): void => { void import2("./options_checker.js") }

document.addEventListener("keydown", (event): void => {
  if (event.keyCode !== kKeyCode.space) {
    if (!window.VApi || !VApi.z || "input textarea".includes(document.activeElement!.localName as string)) { return; }
    const key = VApi.m({c: kChar.INVALID, e: event, i: event.keyCode}, kModeId.NO_MAP_KEY)
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
      nextTick_(() => {
        (node as ElementWithHash).onclick(null, "hash");
      });
    }
  } else if (node = $("#" + hash)) {
    nextTick_((): void => {
    if (((node as HTMLElement).dataset as KnownOptionsDataset).model) {
      (node as HTMLElement).classList.add("highlight");
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
    });
  }
};

asyncBackend_.restoreSettings_() && asyncBackend_.restoreSettings_() ? (
  Build.NDEBUG || console.log("Now restore settings before page loading"),
  void asyncBackend_.restoreSettings_()!.then(optionsInitAll_)
) : optionsInitAll_();

// below is for programmer debugging
window.onunload = function (): void {
  BG_.removeEventListener("unload", OnBgUnload);
};

function OnBgUnload(): void {
  BG_.removeEventListener("unload", OnBgUnload, { capture: false as never })
  setTimeout(function (): void {
    reloadBG_()
    if (!BG_) {
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
    BG_.addEventListener("unload", OnBgUnload);
    if (BG_.document.readyState !== "loading") { setTimeout(callback, 67); return; }
    (BG_ as unknown as typeof globalThis).addEventListener("DOMContentLoaded", function load(): void {
      if (OnChrome && Build.MinCVer < BrowserVer.Min$addEventListener$support$once) {
        BG_.removeEventListener("DOMContentLoaded", load, { capture: true })
      }
      setTimeout(callback, 100);
    }, { capture: true, once: true })
  }, 200);
  function callback(): void {
    const ref = Option_.all_;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous_: previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous_ = opt.innerFetch_()
      }
    }
  }
}
(BG_ as unknown as typeof globalThis).addEventListener("unload", OnBgUnload, { capture: false as never, once: true })

const cmdRegistry = asyncBackend_.CommandsData_().keyToCommandMap_.get("?")
if (!cmdRegistry || cmdRegistry.alias_ !== kBgCmd.showHelp) {
  let matched = "";
  asyncBackend_.CommandsData_().keyToCommandMap_.forEach((item, key): void => {
    if (item.alias_ === kBgCmd.showHelp) {
      matched = matched && matched.length < key.length ? matched : key;
    }
  })
  if (matched) {
    nextTick_(([el, text]) => el.textContent = text, [$("#questionShortcut"), matched] as const)
  }
}

document.addEventListener("click", function onClickOnce(): void {
  const api1 = window.VApi, misc = api1 && api1.y()
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
    if (el.localName !== "a" || !(event.ctrlKey || event.metaKey)) { return }
    const api2 = window.VApi, hintWorker = api2 && api2.b, stat = hintWorker && hintWorker.$()
    if (stat && stat.b && !stat.a) { // .b: showing hints; !.a : is calling executor
      const m1 = stat.m & ~HintMode.queue
      if (m1 < HintMode.min_job && m1 & HintMode.newTab && !(m1 & HintMode.focused)) {
        const curTab = asyncBackend_.curTab_()
        if (curTab >= 0) {
          setTimeout(() => {
            browser_.tabs.update(curTab, { active: true })
          }, 0)
        }
      }
    }
  })
}, true);

export const click = function (a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}
