/// <reference path="./define.ts" />
import { CurCVer_, CurFFVer_, BG_, bgSettings_, reloadBG_, OnFirefox, OnChrome, OnEdge } from "./async_bg"
import {
  KnownOptionsDataset,
  setupBorderWidth_, nextTick_, Option_, pTrans_, PossibleOptionNames, AllowedOptions, debounce_, $, $$
} from "./options_base"
import { saveBtn, exportBtn, savedStatus, createNewOption, BooleanOption_, registerClass } from "./options_defs"
import kPermissions = chrome.permissions.kPermissions

interface ElementWithHash extends HTMLElement {
  onclick (this: ElementWithHash, event: MouseEventToPrevent | null, hash?: "hash"): void;
}
export interface ElementWithDelay extends HTMLElement {
  onclick (this: ElementWithDelay, event?: MouseEventToPrevent | null): void;
}
export interface OptionWindow extends Window {
  _delayed: [string, MouseEventToPrevent | null];
}

const IsEdg: boolean = OnChrome && (<RegExpOne> /\sEdg\//).test(navigator.appVersion)

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
    _element = $("#focusNewTabContent");
    (_element.dataset as KnownOptionsDataset).model = "Boolean"
    createNewOption(_element)
    nextTick_(box => box.style.display = "", $("#focusNewTabContentBox"));
    nextTick_(([el1, el2]) => el2.previousElementSibling !== el1 && el2.parentElement.insertBefore(el1, el2)
      , [$("#newTabUrlBox"), $<EnsuredMountedHTMLElement>("#searchUrlBox")] as const)
  }
  if (!Build.NoDialogUI && bgSettings_.CONST_.OptionsUIOpenInTab_) {
    _element = $("#dialogMode");
    (_element.dataset as KnownOptionsDataset).model = "Boolean"
    createNewOption(_element)
    nextTick_(box => box.style.display = "", $("#dialogModeBox"));
  }

  let _ref: { length: number; [index: number]: HTMLElement }
  nextTick_(() => {
    Option_.suppressPopulate_ = false;
    for (let key in Option_.all_) {
      const obj = Option_.all_[key as "vimSync"]
      if (OnFirefox && bgSettings_.payload_.o === kOS.unixLike && obj instanceof BooleanOption_) {
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
    const target = $("#" + (this.dataset as KnownOptionsDataset).autoResize!)
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
    let str = (this.dataset as KnownOptionsDataset).delay!, e = null as MouseEventToPrevent | null;
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
    if (!OnChrome || Build.MinCVer >= BrowserVer.MinCorrectBoxWidthForOptionsUI
        || CurCVer_ >= BrowserVer.MinCorrectBoxWidthForOptionsUI) { return; }
    ratio > 1 && ((document.body as HTMLBodyElement).style.width = 910 / ratio + "px");
    !OnEdge && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Tabs$$getZoom || chrome.tabs.getZoom) &&
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
      let key = (el.dataset as KnownOptionsDataset).permission!
      if (key[0] === "C") {
        if (!OnChrome) {
          if (key === "C") { // hide directly
            nextTick_((parentEl): void => {
              parentEl.style.display = "none";
            }, (el as EnsuredMountedHTMLElement).parentElement.parentElement.parentElement);
          }
          continue;
        } else if (CurCVer_ >= +key.slice(1)) {
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
      const key = (el.dataset as KnownOptionsDataset).permission!
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
  if (OnEdge) {
    nextTick_((tipForNoShadow): void => {
      tipForNoShadow.innerHTML = '(On Edge, may need "<kbd>#VimiumUI</kbd>" as prefix if no Shadow DOM)';
    }, $("#tipForNoShadow"));
  }

  setTimeout((): void => {
    const ref2 = $$("[data-href]")
    for (let _i = ref2.length; 0 <= --_i; ) {
    const element = ref2[_i] as HTMLInputElement;
    let str = BG_.BgUtils_.convertToUrl_((element.dataset as KnownOptionsDataset).href!
        , null, Urls.WorkType.ConvertKnown)
    element.removeAttribute("data-href");
    element.setAttribute("href", str);
    }
  }, 100)


  _element = $<HTMLAnchorElement>("#openExtensionsPage");
  if (OnChrome && Build.MinCVer < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts
      && CurCVer_ < BrowserVer.MinEnsuredChromeURL$ExtensionShortcuts) {
    (_element as HTMLAnchorElement).href = "chrome://extensions/configureCommands";
  } else if (OnFirefox) {
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
    if (OnFirefox) {
      window.VApi ? VApi.t({ k: kTip.haveToOpenManually }) : alert(pTrans_("" + kTip.haveToOpenManually));
    } else {
      BG_.Backend_.reqH_[kFgReq.focusOrLaunch]({ u: this.href, r: ReuseType.reuse, p: true })
    }
  };

  if (OnFirefox || OnChrome) {
    nextTick_((el): void => {
      const children = el.children, anchor = children[1] as HTMLAnchorElement, name = pTrans_("NewTabAdapter");
      if (OnFirefox) {
        children[0].textContent = "moz";
        anchor.textContent = name;
        anchor.href = GlobalConsts.FirefoxAddonPrefix + "newtab-adapter/?src=external-vc-options_omni";
      }
      anchor.title = name + " - " + pTrans_(OnFirefox ? "addons" : "webstore");
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
      VApi.x((node2 as EnsuredMountedHTMLElement).parentElement.parentElement);
    }
  };
  for (let _i = _ref.length; 0 <= --_i; ) {
    const opt = Option_.all_[ _ref[_i].getAttribute("for") as PossibleOptionNames<boolean> as "ignoreKeyboardLayout"]
    const oldOnSave = opt.onSave_
    opt.onSave_ = (): void => {
      oldOnSave.call(opt)
      nextTick_((ref2): void => {
        ref2.textContent = pTrans_(opt.readValueFromElement_() > 1 ? "o145_2" : "o144")
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

if (OnChrome && (Build.MinCVer >= BrowserVer.MinMediaQuery$PrefersColorScheme
        || CurCVer_ > BrowserVer.MinMediaQuery$PrefersColorScheme - 1)
    || OnFirefox && (Build.MinFFVer >= FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme
        || CurFFVer_ > FirefoxBrowserVer.MinMediaQuery$PrefersColorScheme)
    ) {
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

if (OnFirefox) {
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

const browserPermissions = !OnEdge ? chrome.permissions : null
let optional = (chrome.runtime.getManifest().optional_permissions || []) as kPermissions[]
if (!browserPermissions || !optional.length) {
  $("#optionalPermissionsBox").style.display = "none"
} else {
  const ignored: Array<kPermissions | RegExpOne> = OnFirefox ? ["downloads.shelf"] : ["downloads"]
  OnChrome || ignored.push(<RegExpOne> /^chrome:/, "contentSettings")
  OnChrome && !IsEdg || ignored.push("chrome://new-tab-page/")
  optional = optional.filter(i => !ignored.some(j => typeof j === "string" ? i === j : j.test(i)))
  Promise.all(optional.map(i => new Promise<boolean>(resolve => {
    browserPermissions.contains(i.includes(":") ? { origins: [i] }
        : { permissions: i === "downloads.shelf" ? ["downloads", i] : [i] },
    resolve) // DO NOT return `chrome.runtime.lastError`, so that logic errors will be exposed
  }))).then((previous_array: boolean[]): void => {
    interface PermissionItem { name_: kPermissions; previous_: boolean; element_: HTMLInputElement }
    const fragment = document.createDocumentFragment()
    const i18nItems: { [key in kPermissions]?: string } = {
      "chrome://*/*": "opt_chromeUrl",
      "chrome://new-tab-page/": "opt_cNewtab",
      "downloads.shelf": "opt_closeShelf"
    }
    const placeholder = $<HTMLTemplateElement & EnsuredMountedHTMLElement>("#optionalPermissionsTemplate")
    const template = placeholder.content.firstElementChild as HTMLElement
    const shownItems: PermissionItem[] = []
    for (let i = 0; i < optional.length; i++) {
      const node = document.importNode(template, true) as EnsuredMountedHTMLElement
      const checkbox = node.querySelector("input")!
      const name = optional[i], previous = previous_array[i] || false, i18nKey = i18nItems[name]
      checkbox.checked = previous
      checkbox.value = name
      let i18nName = pTrans_(i18nKey || "opt_" + name) || name
      let suffix = ""
      if (name.startsWith("chrome:")) {
        i18nName = IsEdg ? i18nName.replace("chrome:", "edge:") : i18nName
        suffix = pTrans_("optOfChromeUrl").replace(IsEdg ? "chrome" : "edge", "edge")
      }
      if (Build.BTypes & BrowserType.Chrome && name === "chrome://new-tab-page/"
          && (Build.MinCVer < BrowserVer.MinChromeURL$NewTabPage && CurCVer_ < BrowserVer.MinChromeURL$NewTabPage)) {
        suffix = pTrans_("requireChromium", [BrowserVer.MinChromeURL$NewTabPage])
        checkbox.disabled = true
        checkbox.checked = false
        node.title = pTrans_("invalidOption", [pTrans_("beforeChromium", [BrowserVer.MinChromeURL$NewTabPage])])
      }
      node.lastElementChild.textContent = i18nName + suffix
      if (optional.length === 1) {
        node.classList.add("single")
      }
      fragment.appendChild(node)
      shownItems.push({ name_: name, previous_: previous, element_: checkbox })
    }
    const container = placeholder.parentElement
    container.appendChild(fragment);
    (container.dataset as KnownOptionsDataset).model = "OptionalPermissions"
    registerClass("OptionalPermissions", class extends Option_<"nextPatterns"> {
      init_ (): void {
        this.element_.onchange = this.onUpdated_
      }
      readValueFromElement_ (): string { return shownItems.map(i => i.element_.checked ? "1" : "0").join("") }
      fetch_ (): void {
        this.saved_ = true
        this.previous_ = shownItems.map(i => i.previous_ ? "1" : "0").join("")
        this.populateElement_(this.previous_)
      }
      populateElement_ (value: string): void {
        for (let i = 0; i < shownItems.length; i++) {
          shownItems[i].element_.checked = value[i] === "1"
        }
      }
      _isDirty () { return false }
      executeSave_ (wanted_value: string): string {
        const new_permissions: kPermissions[] = [], new_origins: kPermissions[] = []
        const changed: { [key in kPermissions]?: PermissionItem } = {}
        let waiting = 1
        for (const i of shownItems) {
          const wanted = i.element_.checked
          if (i.previous_ === wanted) { continue }
          i.previous_ = wanted
          if (wanted) {
            i.name_ === "downloads.shelf" && new_permissions.push("downloads");
            (i.name_.includes(":") ? new_origins : new_permissions).push(i.name_)
            changed[i.name_] = i
          } else {
            waiting++
            browserPermissions.remove(i.name_.includes(":") ? { origins: [i.name_] } : {
              permissions: i.name_ === "downloads.shelf" ? ["downloads", i.name_] : [i.name_]
            }, (ok): void => {
              const err = chrome.runtime.lastError as any
              (err || !ok) && console.log('Can not remove the permission %o :', i.name_, err && err.message || err)
              tryRefreshing()
              return err
            })
          }
        }
        const cb = (arr: kPermissions[], ok?: boolean): void => {
          const err = chrome.runtime.lastError as any
          (err || !ok) && console.log('Can not request permissions of %o :', arr, err && err.message || err)
          if (!ok) {
            for (const name of arr) {
              const item = changed[name]
              if (item) {
                item.previous_ = false
                if (err) {
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
                      msg = pTrans_("optNeedChromeUrlFirst")
                      msg = IsEdg ? msg.replace("chrome:", "edge:") : msg
                    }
                  }
                  errEl.textContent = box.title = pTrans_("exc") + msg
                  box.lastElementChild.classList.add("has-error")
                }
              }
            }
            this.fetch_()
          }
          tryRefreshing()
          return err
        }
        const tryRefreshing = () => {
          waiting--
          if (waiting > 0) { return }
          let refreshing = 0
          for (const i of shownItems) {
            const name = i.name_
            refreshing++
            browserPermissions.contains(name.includes(":") ? { origins: [name] }
                : { permissions: name === "downloads.shelf" ? ["downloads", name] : [name] }, allowed => {
              i.previous_ = allowed || false
              refreshing--
              refreshing || this.fetch_()
            })
          }
        }
        waiting += (new_permissions.length && 1) + (new_origins.length && 1)
        new_permissions.length && browserPermissions.request({ permissions: new_permissions }
            , cb.bind(0, new_permissions))
        new_origins.length && browserPermissions.request({ origins: new_origins }, cb.bind(0, new_origins))
        tryRefreshing()
        return wanted_value
      }
    })
    createNewOption(container)
  })
}

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

if (OnChrome && Build.MinCVer < BrowserVer.Min$Option$HasReliableFontSize
    && CurCVer_ < BrowserVer.Min$Option$HasReliableFontSize) {
  $("select").classList.add("font-fix");
}

$("#importButton").onclick = function (): void {
  const opt = $<HTMLSelectElement>("#importOptions");
  opt.onchange ? opt.onchange(null as never) : click($("#settingsFile"));
};

nextTick_((el0): void => {
const platform = bgSettings_.CONST_.Platform_;
el0.textContent = (OnEdge ? "MS Edge (EdgeHTML)"
    : OnFirefox ? "Firefox " + CurFFVer_
    : (IsEdg ? ["MS Edge"]
        : (<RegExpOne> /\bChromium\b/).exec(navigator.appVersion) || ["Chrome"])[0] + " " + CurCVer_
  ) + pTrans_("comma") + pTrans_("NS") + (pTrans_(platform)
        || platform[0].toUpperCase() + platform.slice(1));
if (OnChrome && IsEdg) {
  const a = $<HTMLAnchorElement>("#openExtensionsPage");
  a.textContent = a.href = "edge://extensions/shortcuts";
}
}, $("#browserName"));

export const loadJS = (url: string): Promise<void> => {
  const filename = url.slice(url.lastIndexOf("/") + 1).replace(".js", "")
  __filename = `__loader_` + filename
  return new Promise<void>((resolve): void => {
    define([url], (): void => resolve())
  })
}

export const loadChecker = function (this: HTMLElement): void {
  if (loadChecker.info_ != null) { return }
  loadChecker.info_ = this.id
  loadJS("options_checker.js");
} as { (this: HTMLElement): void; info_?: string }

document.addEventListener("keydown", function (this: void, event): void {
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
    reloadBG_()
    if (!BG_) {
      window.onbeforeunload = null as any;
      window.close();
      return;
    }
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

  OnChrome && document.addEventListener("click", (event): void => {
    const el = event.target as Element
    if (el.localName !== "a" || !(event.ctrlKey || event.metaKey)) { return }
    const api = window.VApi, hintWorker = api && api.b, stat = hintWorker && hintWorker.$()
    if (stat && stat.b && !stat.a) { // .b: showing hints; !.a : is calling executor
      const m1 = stat.m & ~HintMode.queue
      if (m1 < HintMode.min_job && m1 & HintMode.newTab && !(m1 & HintMode.focused)) {
        const curTab = BG_.Backend_.curTab_()
        if (curTab >= 0) {
          setTimeout(() => {
            chrome.tabs.update(curTab, { active: true })
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
