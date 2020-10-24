interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
interface OptionWindow extends Window {
  _delayed: [string, MouseEventToPrevent | null];
}

setupBorderWidth_ && nextTick_(setupBorderWidth_);
nextTick_((versionEl): void => {
  const docCls = (document.documentElement as HTMLHtmlElement).classList;
  const kEventName = "DOMContentLoaded", onload = (): void => {
    removeEventListener(kEventName, onload);
    bgSettings_.payload_.d && docCls.add("auto-dark");
    bgSettings_.payload_.m && docCls.add("less-motion");
  };
  addEventListener(kEventName, onload);
  versionEl.textContent = bgSettings_.CONST_.VerName_;
}, $(".version"))

interface SaveBtn extends HTMLButtonElement {
  onclick (this: SaveBtn, virtually?: MouseEvent | false): void;
}
interface AdvancedOptBtn extends HTMLButtonElement {
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
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      this.blur();
    }
    this.disabled = true;
    (this.firstChild as Text).data = pTrans_("o115_3");
    exportBtn.disabled = false;
    savedStatus(false)
    window.onbeforeunload = null as never;
    if (toSync.length === 0) { return; }
    setTimeout((toSync: typeof Option_.syncToFrontend_): void => {
      bgSettings_.broadcast_({ N: kBgReq.settingsUpdate, d: toSync.map(key => bgSettings_.valuesToLoad_[key]) })
    }, 100, toSync)
}
  
let optionsInit1_ = function (): void {
  let advancedMode = false, _element: HTMLElement = $<AdvancedOptBtn>("#advancedOptionsButton");
  (_element as AdvancedOptBtn).onclick = function (this: AdvancedOptBtn, _0, init): void {
    if (init == null || (init === "hash" && bgSettings_.get_("showAdvancedOptions") === false)) {
      advancedMode = !advancedMode;
      bgSettings_.set_("showAdvancedOptions", advancedMode);
    } else {
      advancedMode = bgSettings_.get_("showAdvancedOptions");
    }
    const el = $("#advancedOptions");
    nextTick_((): void => {
    (el.previousElementSibling as HTMLElement).style.display = el.style.display = advancedMode ? "" : "none";
    let s = advancedMode ? "Hide" : "Show";
    (this.firstChild as Text).data = pTrans_(s) || s;
    this.setAttribute("aria-checked", "" + advancedMode);
    }, 9);
  };
  (_element as AdvancedOptBtn).onclick(null, true);

  if (Build.MayOverrideNewTab && bgSettings_.CONST_.OverrideNewTab_) {
    _element = $("#focusNewTabContent")
    _element.dataset.model = "Boolean"
    createNewOption(_element)
    nextTick_(box => box.style.display = "", $("#focusNewTabContentBox"));
    nextTick_(([el1, el2]) => el2.previousElementSibling !== el1 && el2.parentElement.insertBefore(el1, el2)
      , [$("#newTabUrlBox"), $<EnsuredMountedHTMLElement>("searchUrlBox")] as const)
  }
  if (!Build.NoDialogUI && bgSettings_.CONST_.OptionsUIOpenInTab_) {
    _element = $("#dialogMode")
    _element.dataset.model = "Boolean"
    createNewOption(_element)
    nextTick_(box => box.style.display = "", $("#dialogModeBox"));
  }

  let _ref: { length: number; [index: number]: HTMLElement }
  nextTick_(() => {
    Option_.suppressPopulate_ = false;
    for (let key in Option_.all_) {
      const obj = Option_.all_[key as "vimSync"]
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ & BrowserType.Firefox)
          && bgSettings_.payload_.o === kOS.unixLike && obj instanceof BooleanOption_) {
        obj.element_.classList.add("text-bottom");
      }
      obj.populateElement_(obj.previous_);
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
    _element.addEventListener(_element.dataset.check || "input", loadChecker);
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
    const target = $("#" + <string> this.dataset.autoResize);
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
    let str = this.dataset.delay as string, e = null as MouseEventToPrevent | null;
    if (str !== "continue") {
      event && event.preventDefault();
    }
    if (str === "event") { e = event || null; }
    (window as OptionWindow)._delayed = ["#" + this.id, e];
    if (document.readyState === "complete") {
      loadJS("options_ext.js");
      return;
    }
    window.addEventListener("load", function onLoad(event1): void {
      if (event1.target === document) {
        window.removeEventListener("load", onLoad);
        loadJS("options_ext.js");
      }
    });
  } as ElementWithDelay["onclick"];
  _ref = $$("[data-delay]");
  for (let _i = _ref.length; 0 <= --_i; ) {
    _ref[_i].onclick = func;
  }

  if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredWebkitUserSelectAll
      && bgBrowserVer_ < BrowserVer.MinEnsuredWebkitUserSelectAll) {
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

  let setUI = function (curTabId: number | null): void {
    const ratio = BG_.devicePixelRatio, element2 = document.getElementById("openInTab") as HTMLAnchorElement;
    const mainHeader = document.getElementById("mainHeader") as HTMLElement;
    element2.onclick = function (this: HTMLAnchorElement): void {
      setTimeout(window.close, 17);
    };
    nextTick_(() => {
    (document.body as HTMLBodyElement).classList.add("dialog-ui");
    mainHeader.remove();
    element2.style.display = "";
    (element2.nextElementSibling as SafeHTMLElement).style.display = "none";
    });
    if (Build.MinCVer >= BrowserVer.MinCorrectBoxWidthForOptionsUI
        || !(Build.BTypes & BrowserType.Chrome)
        || bgBrowserVer_ >= BrowserVer.MinCorrectBoxWidthForOptionsUI) { return; }
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    ( !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$Tabs$$getZoom)
      || Build.BTypes & BrowserType.ChromeOrFirefox && chrome.tabs.getZoom) &&
    chrome.tabs.getZoom(curTabId, function (zoom): void {
      if (!zoom) { return chrome.runtime.lastError; }
      const ratio2 = Math.round(devicePixelRatio / zoom * 1024) / 1024;
      (document.body as HTMLBodyElement).style.width = ratio2 !== 1 ? 910 / ratio2 + "px" : "";
    });
  }
  if (Build.NoDialogUI) { /* empty */ }
  else if (location.hash.toLowerCase() === "#dialog-ui") {
    setUI(null);
    setUI = null as never;
  } else if (chrome.tabs.query) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs): void {
      let url: string;
      if (tabs[0] && (<RegExpOne> /^(about|chrome|edge):/).test(url = tabs[0].url)
          && !url.startsWith(location.protocol)) {
        setUI(tabs[0].id);
      }
      setUI = null as never;
    });
  }

  _ref = $$("[data-permission]");
  _ref.length > 0 && ((els: typeof _ref): void => {
    const manifest = chrome.runtime.getManifest();
    for (const key of manifest.permissions || []) {
      manifest[key] = true;
    }
    for (let i = els.length; 0 <= --i; ) {
      let el: HTMLElement = els[i];
      let key = el.dataset.permission as string;
      if (key[0] === "C") {
        if (!(Build.BTypes & BrowserType.Chrome)
            || Build.BTypes & ~BrowserType.Chrome && bgOnOther_ !== BrowserType.Chrome) {
          if (key === "C") { // hide directly
            nextTick_((parentEl): void => {
              parentEl.style.display = "none";
            }, (el as EnsuredMountedHTMLElement).parentElement.parentElement.parentElement);
          }
          continue;
        } else if (bgBrowserVer_ >= +key.slice(1)) {
          continue;
        }
        key = pTrans_("beforeChromium", [key.slice(1)]);
      } else {
        if (key in manifest) { continue; }
        key = pTrans_("lackPermission", [key ? ":\n* " + key : ""]);
      }
      key = pTrans_("invalidOption", [key]);
      nextTick_((el1): void => {
        (el1 as TextElement).disabled = true;
        if (el1 instanceof HTMLInputElement && el1.type === "checkbox") {
          (el1 as SafeHTMLElement as EnsuredMountedHTMLElement).nextElementSibling.tabIndex = -1;
          el1 = el1.parentElement as HTMLElement;
          el1.title = key;
        } else {
          (el1 as TextElement).value = "";
          el1.title = key;
          (el1.parentElement as HTMLElement).onclick = onclick;
        }
      }, el);
    }
    function onclick(this: HTMLElement): void {
      const el = this.querySelector("[data-permission]") as TextElement | null;
      this.onclick = null as never;
      if (!el) { return; }
      const key = el.dataset.permission;
      el.placeholder = pTrans_("lackPermission", [key ? `: "${key}"` : ""]);
    }
  })(_ref);
  if (BG_.Settings_.CONST_.GlobalCommands_.length === 0) {
    nextTick_((ref2): void => {
      for (let _i = ref2.length; 0 <= --_i; ) {
        ref2[_i].remove();
      }
    }, $$(".require-shortcuts"));
  }
  if (Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)) {
    nextTick_((tipForNoShadow): void => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  nextTick_((ref2): void => {
  for (let _i = ref2.length; 0 <= --_i; ) {
    const element = ref2[_i] as HTMLInputElement;
    let str = element.dataset.href as string;
    str = BG_.BgUtils_.convertToUrl_(str, null, Urls.WorkType.ConvertKnown);
    element.removeAttribute("data-href");
    element.setAttribute("href", str);
  }
  }, $$("[data-href]"));


  _element = $<HTMLAnchorElement>("#openExtensionsPage");
  if (Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && Build.BTypes & BrowserType.Chrome
      && bgBrowserVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (_element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
  } else if (Build.BTypes & BrowserType.Firefox
      && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
    nextTick_(([el, el2, el3]) => {
      el.textContent = el.href = "about:addons";
      const el1 = el.parentElement as HTMLElement, prefix = GlobalConsts.FirefoxAddonPrefix;
      el1.insertBefore(new Text(pTrans_("manageShortcut")), el); // lgtm [js/superfluous-trailing-arguments]
      el1.insertBefore(new Text(pTrans_("manageShortcut_2")) // lgtm [js/superfluous-trailing-arguments]
          , el.nextSibling);
      el2.href = prefix + "shortcut-forwarding-tool/?src=external-vc-options";
      el3.href = prefix + "newtab-adapter/?src=external-vc-options";
    }, [_element as HTMLAnchorElement,
        $<HTMLAnchorElement>("#shortcutHelper"), $<HTMLAnchorElement>("#newTabAdapter")] as const);
  }
  (_element as HTMLAnchorElement).onclick = function (event): void {
    event.preventDefault();
    if (Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
      window.VApi ? VApi.t({ k: kTip.haveToOpenManually }) : alert(pTrans_("" + kTip.haveToOpenManually));
    } else {
      BG_.Backend_.reqH_[kFgReq.focusOrLaunch]({ u: this.href, r: ReuseType.reuse, p: true })
    }
  };

  if (Build.BTypes & BrowserType.ChromeOrFirefox
      && (!(Build.BTypes & ~BrowserType.Chrome) || !(Build.BTypes & ~BrowserType.Firefox)
          || (bgOnOther_ & BrowserType.ChromeOrFirefox))) {
    nextTick_((el): void => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = pTrans_("NewTabAdapter");
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/?src=external-vc-options_omni";
      }
      anchor.title = name + " - " + pTrans_(Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox) ? "addons" : "webstore");
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
      Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinScrollIntoViewOptions
        && bgBrowserVer_ < BrowserVer.MinScrollIntoViewOptions
      ? node2.scrollIntoViewIfNeeded!()
      : node2.scrollIntoView({ block: "center" });
      node2.focus();
    }
    if (window.VApi) {
      VApi.x((node2 as EnsuredMountedHTMLElement).parentElement.parentElement);
    }
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    const opt = Option_.all_[ _ref[_i].getAttribute("for") as PossibleOptionNames<boolean> as "ignoreKeyboardLayout"]
    const oldOnSave = opt.onSave_
    opt.onSave_ = (): void => {
      oldOnSave.call(opt)
      nextTick_((ref2): void => {
        ref2.textContent = pTrans_(opt.readValueFromElement_() ? "o145_2" : "o144")
      }, $(`#${opt.element_.id}Status`))
    }
    _ref[_i].onclick = onRefStatClick;
    opt.element_.addEventListener("change", opt.onSave_, true)
  }
},
optionsInitAll_ = function (): void {

optionsInit1_();
optionsInit1_ = optionsInitAll_ = null as never

for (let key in Option_.all_) {
  Option_.all_[key as keyof AllowedOptions].onSave_()
}
const newTabUrlOption_ = Option_.all_.newTabUrl
newTabUrlOption_.checker_!.check_(newTabUrlOption_.previous_)

if (!bgSettings_.payload_.o) {
  nextTick_((el): void => { el.textContent = "Cmd" }, $("#Ctrl"))
}

(window.onhashchange as () => void)();

if (Build.BTypes & BrowserType.ChromeOrFirefox
    && (Build.BTypes & BrowserType.Chrome && bgBrowserVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme
      || Build.BTypes & BrowserType.Firefox && BG_.CurFFVer_ > FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
      )) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.onchange = function (): void {
    bgSettings_.updateMediaQueries_();
    useLocalStyle()
    setTimeout(useLocalStyle, 34)
  }
  const useLocalStyle = () => {
    const darkOpt = Option_.all_.autoDarkMode
    if (darkOpt.previous_ && darkOpt.saved_ && window.VApi && VApi.z) {
      const val = media.matches
      const root = VApi.y().r, hud_box = root && root.querySelector(".HUD:not(.UI)")
      bgSettings_.updatePayload_("d", val, VApi.z)
      hud_box && hud_box.classList.toggle("D", val);
    }
  }
  // As https://bugzilla.mozilla.org/show_bug.cgi?id=1550804 said, to simulate color schemes, enable
  // https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Experimental_features#Color_scheme_simulation
  setTimeout(useLocalStyle, 800)
}

if (!(Build.BTypes & ~BrowserType.Firefox) || Build.BTypes & BrowserType.Firefox && bgOnOther_ & BrowserType.Firefox) {
  setTimeout((): void => {
    const test = document.createElement("div")
    test.style.display = "none"
    test.style.color = "#543";
    (document.body as HTMLBodyElement).append!(test)
    requestIdleCallback!((): void => {
      const K = GlobalConsts.kIsHighContrast, storage = localStorage
      const newColor = (getComputedStyle(test).color || "").replace(<RegExpG> / /g, '').toLowerCase()
      const isHC = !!newColor && newColor != "rgb(85,68,51)"
      test.remove()
      const oldIsHC = storage.getItem(K) == "1"
      if (isHC != oldIsHC) {
        isHC ? storage.setItem(K, "1") : storage.removeItem(K);
        delete (bgSettings_.cache_ as Partial<SettingsNS.FullCache>).helpDialog
        bgSettings_.reloadCSS_(2)
      }
    }, { timeout: 1e3 })
  }, 34)
}
};

$("#userDefinedCss").addEventListener("input", debounce_(function (): void {
  const self = Option_.all_.userDefinedCss
  const isDebugging = self.element_.classList.contains("debugging")
  if (self.saved_ && !isDebugging || !window.VApi || !VApi.z) { return }
  const newVal = self.readValueFromElement_(), isSame = newVal === self.previous_,
  css = bgSettings_.reloadCSS_(-1, newVal), misc = VApi.y(), root = misc.r
  if (!isDebugging && BG_) {
    chrome.tabs.query({ currentWindow: true, active: true }, (tabs?: [chrome.tabs.Tab?]): void => {
      if (tabs && tabs[0] && tabs[0].url === location.href) {
        const port = BG_.Backend_.indexPorts_(tabs[0].id, 0) as Frames.Port | null
        port && (port.s.f |= Frames.Flags.hasCSS | Frames.Flags.hasFindCSS)
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
}, 1200, $("#userDefinedCss") as HTMLTextAreaElement, 0));

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && bgBrowserVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  $("select").classList.add("font-fix");
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_((el0): void => {
const platform = bgSettings_.CONST_.Platform_;
el0.textContent = (Build.BTypes & BrowserType.Edge
        && (!(Build.BTypes & ~BrowserType.Edge) || bgOnOther_ === BrowserType.Edge)
    ? "MS Edge (EdgeHTML)"
    : Build.BTypes & BrowserType.Firefox
        && (!(Build.BTypes & ~BrowserType.Firefox) || bgOnOther_ === BrowserType.Firefox)
    ? "Firefox " + BG_.CurFFVer_
    : (BG_.IsEdg_ ? ["MS Edge"]
        : (<RegExpOne> /\bChromium\b/).exec(navigator.appVersion) || ["Chrome"])[0] + " " + bgBrowserVer_
  ) + pTrans_("comma") + (pTrans_(platform)
        || platform[0].toUpperCase() + platform.slice(1));
if (Build.BTypes & BrowserType.Chrome && BG_.IsEdg_) {
  const a = $<HTMLAnchorElement>("#openExtensionsPage");
  a.textContent = a.href = "edge://extensions/shortcuts";
}
}, $("#browserName"));

function loadJS(file: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.src = file;
  script.async = false; script.defer = true;
  (document.head as HTMLHeadElement).appendChild(script);
  return script;
}

interface CheckerLoader { info_?: string }
function loadChecker(this: HTMLElement): void {
  if ((loadChecker as CheckerLoader).info_ != null) { return; }
  (loadChecker as CheckerLoader).info_ = this.id;
  loadJS("options_checker.js");
}

document.addEventListener("keydown", function (this: void, event): void {
  if (event.keyCode !== kKeyCode.space) {
    if (!window.VApi || !VApi.z || "input textarea".includes(document.activeElement!.localName as string)) { return; }
    const key = VApi.m({c: kChar.INVALID, e: event, i: event.keyCode}, kModeId.NO_MAP_KEY)
    if (key === "a-" + kChar.f12) {
      let el2 = $<HTMLSelectElement>("#importOptions");
      const oldSelected = el2.selectedIndex, callback = (): void => {
        el2.onchange && (el2 as any).onchange()
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

window.onhashchange = function (this: void): void {
  let hash = location.hash, node: HTMLElement | null;
  hash = hash.slice(hash[1] === "!" ? 2 : 1);
  if (Build.MayOverrideNewTab
      && !hash && Option_.all_.newTabUrl.previous_ === bgSettings_.CONST_.NewTabForNewUser_) {
    hash = "newTabUrl";
  }
  if (!hash || !(<RegExpI> /^[a-z][a-z\d_-]*$/i).test(hash)) { return; }
  if (node = $(`[data-hash="${hash}"]`) as HTMLElement | null) {
    if (node.onclick) {
      nextTick_(() => {
        (node as ElementWithHash).onclick(null, "hash");
      });
    }
  } else if (node = $("#" + hash)) {
    nextTick_((): void => {
    if ((node as HTMLElement).dataset.model) {
      (node as HTMLElement).classList.add("highlight");
    }
    const callback = function (event?: Event): void {
      if (event && event.target !== window) { return; }
      if (window.onload) {
        window.onload = null as never;
        window.scrollTo(0, 0);
      }
      const node2 = node as Element;
      Build.BTypes & BrowserType.Chrome ? node2.scrollIntoViewIfNeeded!() : node2.scrollIntoView();
    };
    if (document.readyState === "complete") { return callback(); }
    window.scrollTo(0, 0);
    window.onload = callback;
    });
  }
};

bgSettings_.restore_ && bgSettings_.restore_() ? (
  Build.NDEBUG || console.log("Now restore settings before page loading"),
  bgSettings_.restore_()!.then(optionsInitAll_)
) : optionsInitAll_();

// below is for programmer debugging
window.onunload = function (): void {
  BG_.removeEventListener("unload", OnBgUnload);
  BG_.BgUtils_.GC_(-1);
};
BG_.BgUtils_.GC_(1);

function OnBgUnload(): void {
  BG_.removeEventListener("unload", OnBgUnload);
  setTimeout(function (): void {
    BG_ = chrome.extension.getBackgroundPage() as Window as typeof BG_ // lgtm [js/missing-variable-declaration]
    if (!BG_) { // a user may call `close()` in the console panel
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
    bgSettings_ = BG_.Settings_ // lgtm [js/missing-variable-declaration]
    if (!bgSettings_) { BG_ = null as never; return; }
    BG_.addEventListener("unload", OnBgUnload);
    if (BG_.document.readyState !== "loading") { setTimeout(callback, 67); return; }
    BG_.addEventListener("DOMContentLoaded", function load(): void {
      BG_.removeEventListener("DOMContentLoaded", load, true);
      setTimeout(callback, 100);
    }, true);
  }, 200);
  function callback(): void {
    const ref = Option_.all_;
    for (const key in ref) {
      const opt = ref[key as keyof AllowedOptions], { previous_: previous } = opt;
      if (typeof previous === "object" && previous) {
        opt.previous_ = bgSettings_.get_(opt.field_);
      }
    }
    let needCommands = false
    if (ref.exclusionRules.list_.length || ref.keyMappings.checker_) {
      needCommands = true
    }
    needCommands && !BG_.KeyMappings && BG_.BgUtils_.require_("KeyMappings");
    BG_.BgUtils_.GC_(1);
  }
}
BG_.addEventListener("unload", OnBgUnload);

const cmdRegistry = BG_.CommandsData_.keyToCommandRegistry_.get("?")
if (!cmdRegistry || cmdRegistry.alias_ !== kBgCmd.showHelp) { (function (): void {
  const arr = BG_.CommandsData_.keyToCommandRegistry_
  let matched = "";
  arr.forEach((item, key): void => {
    if (item.alias_ === kBgCmd.showHelp) {
      matched = matched && matched.length < key.length ? matched : key;
    }
  })
  if (matched) {
    nextTick_(el => el.textContent = matched, $("#questionShortcut"));
  }
})(); }

document.addEventListener("click", function onClickOnce(): void {
  const api = window.VApi, misc = api && api.y()
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
}, true);

function click(a: Element): boolean {
  const mouseEvent = document.createEvent("MouseEvents");
  mouseEvent.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0
    , false, false, false, false, 0, null);
  return a.dispatchEvent(mouseEvent);
}
