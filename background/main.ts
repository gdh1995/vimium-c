import { runtimeError_, getTabUrl, tabsGet, browserTabs, tabsCreate, browserSessions, browser_ } from "./browser"
import {
  framesForTab, framesForOmni,
  contentPayload, cPort, needIcon_, reqH_, settings, set_cPort, set_needIcon_, set_visualWordsRe_
} from "./store"
import "./ui_css"
import { indexFrame, findCPort, OnConnect, isExtIdAllowed, getPortUrl, showHUD, complainLimits } from "./ports"
import { executeShortcut } from "./frame_commands"
import "./all_commands"
import "./request_handlers"
import { executeExternalCmd, shortcutRegistry_, visualKeys_ } from "./key_mappings"

declare const enum RefreshTabStep { start = 0, s1, s2, s3, s4, end }

const executeShortcutEntry = (cmd: StandardShortcutNames | kShortcutAliases): void => {
  const tabId = TabRecency_.curTab_, ref = framesForTab.get(tabId)
  if (cmd === kShortcutAliases.nextTab1) { cmd = "nextTab" }
  const map = shortcutRegistry_
  if (!map || !map.get(cmd)) {
    // usually, only userCustomized* and those from 3rd-party extensions will enter this branch
    if (map && map.get(cmd) !== null) {
      map.set(cmd, null)
      console.log("Shortcut %o has not been configured.", cmd)
    }
  } else if (ref == null || (ref.flags_ & Frames.Flags.userActed) || tabId < 0) {
    executeShortcut(cmd as StandardShortcutNames, ref)
  } else {
    tabsGet(tabId, (tab): void => {
      executeShortcut(cmd as StandardShortcutNames, tab && tab.status === "complete" ? framesForTab.get(tab.id) : null)
      return runtimeError_()
    })
  }
}

Backend_ = {
    reqH_,
    getExcluded_: null,
    getPortUrl_: getPortUrl,
    removeSug_ (this: void, { t: type, u: url }: FgReq[kFgReq.removeSug], port?: Port | null): void {
      const name = type === "tab" ? type : type + " item"
      set_cPort(findCPort(port))
      if (type === "tab" && TabRecency_.curTab_ === +url) {
        showHUD(trans_("notRemoveCur"))
      } else {
        Completion_.removeSug_(url, type, (succeed): void => {
          showHUD(trans_(succeed ? "delSug" : "notDelSug", [trans_("sug_" + type) || name]))
        })
      }
    },
    setIcon_ (): void { /* empty */ },
    complain_: complainLimits,
    parse_ (this: void, request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl] {
      let s0 = request.u, url = s0.toLowerCase(), pattern: Search.Rule | undefined
        , arr: string[] | null = null, _i: number, selectLast = false;
      if (!BgUtils_.protocolRe_.test(BgUtils_.removeComposedScheme_(url))) {
        BgUtils_.resetRe_();
        return null;
      }
      if (request.p) {
        const obj = reqH_[kFgReq.parseUpperUrl](request),
        didSucceed = obj.p != null;
        return { k: "", s: 0, u: didSucceed ? obj.u : s0, e: didSucceed ? obj.p : obj.u };
      }
      const decoders = settings.cache_.searchEngineRules;
      if (_i = BgUtils_.IsURLHttp_(url)) {
        url = url.slice(_i);
        s0 = s0.slice(_i);
      }
      for (_i = decoders.length; 0 <= --_i; ) {
        pattern = decoders[_i];
        if (!url.startsWith(pattern.prefix_)) { continue; }
        arr = s0.slice(pattern.prefix_.length).match(pattern.matcher_ as RegExpG);
        if (arr) { break; }
      }
      if (!arr || !pattern) {
        const showPage = settings.CONST_.ShowPage_
        if (url.startsWith(showPage)) {
          s0 = s0.slice(showPage.length).replace(<RegExpOne> /^#!?/, "")
          return {
            k: "vimium://show",
            u: s0,
            s: s0.startsWith("image") && s0.lastIndexOf("&", s0.indexOf(":") + 1) + 1 || s0.indexOf(" ") + 1,
          }
        }
        BgUtils_.resetRe_()
        return null
      }
      if (arr.length > 1 && !pattern.matcher_.global) { arr.shift(); }
      const re = pattern.delimiter_;
      if (arr.length > 1) {
        selectLast = true;
      } else if (re instanceof RegExp) {
        url = arr[0];
        if (arr = url.match(re)) {
          arr.shift();
          selectLast = true;
        } else {
          arr = [url];
        }
      } else {
        arr = arr[0].split(re);
      }
      url = "";
      for (_i = 0; _i < arr.length; _i++) { url += " " + BgUtils_.DecodeURLPart_(arr[_i]); }
      url = url.trim().replace(BgUtils_.spacesRe_, " ");
      BgUtils_.resetRe_();
      return {
        k: pattern.name_,
        u: url,
        s: selectLast ? url.lastIndexOf(" ") + 1 : 0
      };
    },
    reopenTab_ (this: void, tab: Tab, refresh, exProps): void {
      const tabId = tab.id, needTempBlankTab = refresh === 1;
      if (Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox
            || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSessions
          ? refresh && browserSessions() : refresh) {
        let step = RefreshTabStep.start,
        tempTabId = -1,
        onRefresh = function (this: void): void {
          const err = runtimeError_();
          if (err) {
            browserSessions().restore();
            tempTabId >= 0 && browserTabs.remove(tempTabId);
            tempTabId = 0;
            return err;
          }
          step = step + 1;
          if (step >= RefreshTabStep.end) { return; }
          setTimeout(function (): void {
            tabsGet(tabId, onRefresh);
          }, 50 * step * step);
        };
        if (needTempBlankTab) {
          tabsCreate({url: "about:blank", active: false, windowId: tab.windowId}, (temp_tab): void => {
            tempTabId /* === -1 */ ? (tempTabId = temp_tab.id) : browserTabs.remove(temp_tab.id);
          });
        }
        browserTabs.remove(tabId, runtimeError_);
        tabsGet(tabId, onRefresh);
        return;
      }
      let callback: ((this: void, tab: Tab) => void) | null | undefined
      if (!(Build.BTypes & ~BrowserType.Edge)
          || (Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
          || Build.MinCVer < BrowserVer.MinMuted && Build.BTypes & BrowserType.Chrome
              && CurCVer_ < BrowserVer.MinMuted) {
      } else {
        const muted = Build.MinCVer < BrowserVer.MinMutedInfo && Build.BTypes & BrowserType.Chrome
            && CurCVer_ < BrowserVer.MinMutedInfo ? !tab.muted : !tab.mutedInfo.muted
        callback = (tab2: Tab): void => { browserTabs.update(tab2.id, { muted }) }
      }
      const args: Parameters<BackendHandlersNS.BackendHandlers["reopenTab_"]>[2] = {
        windowId: tab.windowId,
        index: tab.index,
        url: getTabUrl(tab),
        active: tab.active,
        pinned: tab.pinned,
        openerTabId: tab.openerTabId
      }
      if (Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther & BrowserType.Firefox) && exProps) {
        BgUtils_.extendIf_(args, exProps)
      }
      tabsCreate(args, callback);
      browserTabs.remove(tabId);
      // should never remove its session item - in case that goBack/goForward might be wanted
      // not seems to need to restore muted status
    },
    showHUD_: showHUD,
    checkHarmfulUrl_ (url: string, port?: Port | null): boolean {
      url = url.slice(0, 128).split("?")[0].replace(<RegExpG> /\\/g, "/")
      let bsod = Settings_.payload_.o === kOS.win
          && (<RegExpOne> /\/globalroot\/device\/condrv|\bdevice\/condrv\/kernelconnect/).test(url)
      if (bsod) {
        set_cPort(port || cPort)
        showHUD(trans_("harmfulURL"))
      }
      return bsod
    },
    forceStatus_ (act: Frames.ForcedStatusText, tabId?: number): void {
      const ref = framesForTab.get(tabId || (tabId = TabRecency_.curTab_));
      if (!ref) { return; }
      set_cPort(ref.top_ || ref.cur_)
      let spaceInd = act.search(<RegExpOne> /\/| /), newPassedKeys = spaceInd > 0 ? act.slice(spaceInd + 1) : ""
      act = act.toLowerCase() as Frames.ForcedStatusText;
      if (spaceInd > 0) {
        act = act.slice(0, spaceInd) as Frames.ForcedStatusText;
      }
      act.includes("-") && act.endsWith("able") && (act += "d")
      const silent = !!newPassedKeys && (<RegExpOne> /^silent/i).test(newPassedKeys);
      newPassedKeys = (silent ? newPassedKeys.slice(7) : newPassedKeys).trim()
      let shown: BOOL = 0
      const logAndShow = (msg: string): void => { console.log(msg), shown || showHUD(msg); shown = 1 }
      if (newPassedKeys && !newPassedKeys.startsWith("^ ")) {
        logAndShow('"vimium://status" only accepts a list of hooked keys')
        newPassedKeys = "";
      } else if (newPassedKeys) {
        newPassedKeys = newPassedKeys.replace(<RegExpG> /<(\S+)>/g, "$1").replace(BgUtils_.spacesRe_, " ")
      }
      let pattern: string | null
      const curSender = cPort.s, oldStatus = curSender.status_,
      stdStatus = Backend_.getExcluded_ == null ? Frames.Status.enabled
          : oldStatus === Frames.Status.partial ? oldStatus
          : (pattern = Backend_.getExcluded_(curSender.url_, curSender),
              pattern ? Frames.Status.partial : pattern === null ? Frames.Status.enabled : Frames.Status.disabled),
      stat = act === "enable" ? Frames.Status.enabled : act === "disable" ? Frames.Status.disabled
        : act === "toggle-disabled" ? oldStatus !== Frames.Status.disabled
            ? stdStatus === Frames.Status.disabled ? null : Frames.Status.disabled
            : stdStatus === Frames.Status.disabled ? Frames.Status.enabled : null
        : act === "toggle-enabled" ? oldStatus !== Frames.Status.enabled
            ? stdStatus === Frames.Status.enabled ? null : Frames.Status.enabled
            : stdStatus === Frames.Status.enabled ? Frames.Status.disabled : null
        : act === "toggle-next" ? oldStatus === Frames.Status.partial ? Frames.Status.enabled
            : oldStatus === Frames.Status.enabled ? stdStatus === Frames.Status.disabled ? null : Frames.Status.disabled
            : stdStatus === Frames.Status.disabled ? Frames.Status.enabled : null
        : act === "toggle" || act === "next"
        ? oldStatus !== Frames.Status.enabled ? Frames.Status.enabled : Frames.Status.disabled
        : (act !== "reset" && logAndShow(`Unknown status action: "${act}", so reset`) , null),
      enableWithPassedKeys = !!newPassedKeys && act === "enable",
      locked = stat === null ? Frames.Flags.blank
          : stat === Frames.Status.disabled ? Frames.Flags.lockedAndDisabled : Frames.Flags.locked,
      msg: Req.bg<kBgReq.reset> = {
        N: kBgReq.reset,
        p: stat === Frames.Status.disabled || enableWithPassedKeys ? newPassedKeys : null,
        f: locked
      };
      // avoid Status.partial even if `newPassedKeys`, to keep other checks about Flags.locked correct
      let newStatus: Frames.ValidStatus = locked ? stat! : Frames.Status.enabled;
      ref.lock_ = locked ? { status_: newStatus, passKeys_: msg.p } : null
      for (const port of ref.ports_) {
        const sender = port.s
        if (!locked && Backend_.getExcluded_ !== null) {
          let pattern = msg.p = Backend_.getExcluded_(sender.url_, sender)
          newStatus = pattern === null ? Frames.Status.enabled : pattern
            ? Frames.Status.partial : Frames.Status.disabled;
          if (newStatus !== Frames.Status.partial && sender.status_ === newStatus) { continue; }
        }
        // must send "reset" messages even if port keeps enabled by 'v.st enable'
        // - frontend may need to reinstall listeners
        sender.status_ = newStatus;
        port.postMessage(msg);
      }
      newStatus = ref.cur_.s.status_
      silent || shown || showHUD(trans_("newStat", trans_(newStatus === Frames.Status.enabled && !enableWithPassedKeys
          ? "fullEnabled" : newStatus === Frames.Status.disabled ? "fullDisabled" : "halfDisabled")))
      if (needIcon_ && newStatus !== oldStatus) {
        Backend_.setIcon_(tabId, newStatus);
      }
    },
    indexPorts_: function (tabId?: number, frameId?: number): Frames.FramesMap | Frames.Frames | Port[] | Port | null {
      return tabId == null ? framesForTab
        : frameId == null ? (tabId === GlobalConsts.VomnibarFakeTabId ? framesForOmni : framesForTab.get(tabId) || null)
        : indexFrame(tabId, frameId);
    } as BackendHandlersNS.BackendHandlers["indexPorts_"],
    curTab_: () => TabRecency_.curTab_,
    onInit_(): void {
      if (settings.temp_.initing_ !== BackendHandlersNS.kInitStat.FINISHED) { return; }
      if (!CommandsData_.keyFSM_) {
        settings.postUpdate_("keyMappings");
        if (Build.BTypes & ~BrowserType.Edge && contentPayload.o === kOS.mac) {
          visualKeys_["m-s-c"] = VisualAction.YankRichText
        }
      }
      // the line below requires all necessary have inited when calling this
      Backend_.onInit_ = null;
      settings.get_("hideHud", true);
      settings.get_("nextPatterns", true);
      settings.get_("previousPatterns", true);
      browser_.runtime.onConnect.addListener(function (port): void {
        if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge) {
          let name = port.name, pos = name.indexOf(PortNameEnum.Delimiter), type = pos > 0 ? name.slice(0, pos) : name;
          port.sender.url = name.slice(type.length + 1);
          return OnConnect(port as Frames.Port, (type as string | number as number) | 0);
        }
        return OnConnect(port as Frames.Port, (port.name as string | number as number) | 0);
      });
      if (Build.BTypes & BrowserType.Edge && !browser_.runtime.onConnectExternal) {
        return;
      }
      browser_.runtime.onConnectExternal!.addListener(function (port): void {
        let { sender, name } = port, arr: string[];
        if (sender
            && isExtIdAllowed(sender.id, sender.url)
            && name.startsWith(PortNameEnum.Prefix) && (arr = name.split(PortNameEnum.Delimiter)).length > 1) {
          if (arr[1] !== settings.CONST_.GitVer) {
            (port as Port).postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reload });
            port.disconnect();
            return;
          }
          OnConnect(port as Frames.Port, (arr[0].slice(PortNameEnum.PrefixLen) as string | number as number
              ) | PortType.otherExtension)
        } else {
          port.disconnect();
        }
      });
    }
};

(Build.BTypes & BrowserType.Edge || Build.BTypes & BrowserType.Firefox && Build.MayAndroidOnFirefox)
    && !chrome.commands ||
(chrome.commands.onCommand as chrome.events.Event<
      (command: StandardShortcutNames | kShortcutAliases & string, exArg: FakeArg) => void
    >).addListener(executeShortcutEntry);

(!(Build.BTypes & BrowserType.Edge) || browser_.runtime.onMessageExternal) &&
(browser_.runtime.onMessageExternal!.addListener((
      message: boolean | number | string | null | undefined | ExternalMsgs[keyof ExternalMsgs]["req"]
      , sender, sendResponse): void => {
    if (!isExtIdAllowed(sender.id, sender.url)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      executeExternalCmd({command: message}, sender)
      return;
    }
    else if (typeof message !== "object" || !message) {
      return;
    }
    switch (message.handler) {
    case kFgReq.shortcut:
      let shortcut = message.shortcut;
      if (shortcut) {
        executeShortcutEntry(shortcut + "" as StandardShortcutNames | kShortcutAliases)
      }
      break;
    case kFgReq.id:
      (sendResponse as (res: ExternalMsgs[kFgReq.id]["res"]) => void | 1)({
        name: "Vimium C",
        host: location.host,
        shortcuts: true,
        injector: settings.CONST_.Injector_,
        version: settings.CONST_.VerCode_
      });
      break;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        s: message.scripts ? settings.CONST_.ContentScripts_ : null,
        version: settings.CONST_.VerCode_,
        host: !(Build.BTypes & ~BrowserType.Chrome) ? "" : location.host,
        h: PortNameEnum.Delimiter + settings.CONST_.GitVer
      });
      break;
    case kFgReq.command:
      executeExternalCmd(message, sender)
      break;
    }
}), settings.postUpdate_("extAllowList"))

browserTabs.onReplaced.addListener((addedTabId, removedTabId) => {
    const frames = framesForTab.get(removedTabId)
    if (!frames) { return; }
    framesForTab.delete(removedTabId)
    framesForTab.set(addedTabId, frames)
    for (const port of frames.ports_) {
      (port.s as Writable<Frames.Sender>).tabId_ = addedTabId;
    }
});

if (settings.storage_.getItem("exclusionRules") !== "[]") {
  Exclusions.setRules_(settings.get_("exclusionRules"))
}

settings.updateHooks_.showActionIcon = (value): void => { set_needIcon_(value && !!browser_.browserAction) }

  settings.postUpdate_("vomnibarPage", null);
  settings.postUpdate_("searchUrl", null); // will also update newTabUrl
  settings.postUpdate_("vomnibarOptions");

  // will run only on <kbd>F5</kbd>, not on runtime.reload
window.onunload = (event): void => {
    if (event
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    framesForTab.set("-1" as string | number as number, { ports_: framesForOmni } as Frames.Frames)
    framesForTab.forEach((frames): void => {
      for (let port of frames.ports_) {
        port.disconnect();
      }
    })
}

if (Build.BTypes & BrowserType.Firefox && !Build.NativeWordMoveOnFirefox
    || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  ( (Build.BTypes & BrowserType.Firefox && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox))
    ? !Build.NativeWordMoveOnFirefox
      && !BgUtils_.makeRegexp_("\\p{L}", "u", 0)
    : Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
      ? false
    : Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && Build.MinCVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
      && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
        ? CurCVer_ < (
          BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp : BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
        : CurCVer_ < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          || !BgUtils_.makeRegexp_("\\p{L}", "u", 0))
  ) ? settings.fetchFile_("words", (text): void => {
    set_visualWordsRe_(text.replace(<RegExpG> /[\n\r]/g, "")
        .replace(<RegExpG & RegExpSearchable<1>> /\\u(\w{4})/g, (_, s1) => String.fromCharCode(+("0x" + s1))))
  }) : set_visualWordsRe_("")
}
