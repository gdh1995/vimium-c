import { runtimeError_, getTabUrl, tabsGet, browserTabs, tabsCreate, browserSessions } from "./browser"
import { cPort, needIcon, reqH_, set_cPort } from "./store"
import {
  framesForTab, indexFrame, findCPort, framesForOmni, OnConnect, isExtIdAllowed, getPortUrl, showHUD, complainLimits
} from "./ports"
import { executeShortcut } from "./frame_commands"
import { executeExternalCmd } from "./all_commands"
import "./request_handlers"

declare const enum RefreshTabStep { start = 0, s1, s2, s3, s4, end }

Backend_ = {
    reqH_,
    getExcluded_: BgUtils_.getNull_,
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
      const decoders = Settings_.cache_.searchEngineRules;
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
      if (!arr || !pattern) { BgUtils_.resetRe_(); return null; }
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
          browserTabs.create({url: "about:blank", active: false, windowId: tab.windowId}, (temp_tab): void => {
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
    forceStatus_ (act: Frames.ForcedStatusText, tabId?: number): void {
      const ref = framesForTab[tabId || (tabId = TabRecency_.curTab_)];
      if (!ref) { return; }
      let spaceInd = act.indexOf(" "), newPassedKeys = spaceInd > 0 ? act.slice(spaceInd + 1) : "";
      act = act.toLowerCase() as Frames.ForcedStatusText;
      if (spaceInd > 0) {
        act = act.slice(0, spaceInd) as Frames.ForcedStatusText;
      }
      const silent = !!newPassedKeys && (<RegExpOne> /^silent/i).test(newPassedKeys);
      newPassedKeys = (silent ? newPassedKeys.slice(7) : newPassedKeys).trimLeft();
      if (newPassedKeys && !newPassedKeys.startsWith("^ ")) {
        console.log('"vimium://status" only accepts a list of hooked keys');
        newPassedKeys = "";
      } else {
        newPassedKeys = newPassedKeys && newPassedKeys.replace(<RegExpG> /<(\S+)>/g, "$1");
      }
      set_cPort(indexFrame(tabId, 0) || ref[0])
      let pattern: string | null
      const curSender = cPort.s,
      always_enabled = !Exclusions.rules_.length, oldStatus = curSender.s,
      stdStatus = always_enabled ? Frames.Status.enabled : oldStatus === Frames.Status.partial ? oldStatus
          : (pattern = Backend_.getExcluded_(curSender.u, curSender),
              pattern ? Frames.Status.partial : pattern === null ? Frames.Status.disabled : Frames.Status.enabled),
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
        : null,
      locked = stat !== null, unknown = !(locked || always_enabled),
      msg: Req.bg<kBgReq.reset> = {
        N: kBgReq.reset,
        p: stat !== Frames.Status.disabled ? null : newPassedKeys,
        f: locked
      };
      if (stat === null && tabId < 0) {
        silent || oldStatus !== Frames.Status.disabled && showHUD(trans_("unknownStatAction", [act]));
        return;
      }
      let newStatus: Frames.ValidStatus = locked ? stat! : Frames.Status.enabled;
      for (let i = ref.length; 1 <= --i; ) {
        const port = ref[i], sender = port.s;
        sender.f = locked ? sender.f | Frames.Flags.locked : sender.f & ~Frames.Flags.locked;
        if (unknown) {
          let pattern = msg.p = Backend_.getExcluded_(sender.u, sender)
          newStatus = pattern === null ? Frames.Status.enabled : pattern
            ? Frames.Status.partial : Frames.Status.disabled;
          if (newStatus !== Frames.Status.partial && sender.s === newStatus) { continue; }
        }
        // must send "reset" messages even if port keeps enabled by 'v.st enable'
        // - frontend may need to reinstall listeners
        sender.s = newStatus;
        port.postMessage(msg);
      }
      silent || newStatus !== Frames.Status.disabled && showHUD(trans_("newStat", [
        trans_(newStatus === Frames.Status.enabled ? "fullEnabled" : "halfDisabled")
      ]));
      if (needIcon && (newStatus = curSender.s) !== oldStatus) {
        Backend_.setIcon_(tabId, newStatus);
      }
    },
    ExecuteShortcut_ (this: void, cmd: string): void {
      const tabId = TabRecency_.curTab_, ports = framesForTab[tabId];
      if (cmd === <string> <unknown> kShortcutAliases.nextTab1) { cmd = kCName.nextTab; }
      type NullableShortcutMap = ShortcutInfoMap & { [key: string]: CommandsNS.Item | null | undefined };
      const map = CommandsData_.shortcutRegistry_ as NullableShortcutMap;
      if (!map || !map[cmd]) {
        // usually, only userCustomized* and those from 3rd-party extensions will enter this branch
        if (map && map[cmd] !== null) {
          map[cmd] = null;
          console.log("Shortcut %o has not been configured.", cmd);
        }
        return;
      }
      if (ports == null || (ports[0].s.f & Frames.Flags.userActed) || tabId < 0) {
        return executeShortcut(cmd as keyof typeof CommandsData_.shortcutRegistry_, ports);
      }
      tabsGet(tabId, function (tab): void {
        executeShortcut(cmd as keyof typeof CommandsData_.shortcutRegistry_,
          tab && tab.status === "complete" ? framesForTab[tab.id] : null);
        return runtimeError_()
      });
    },
    indexPorts_: function (tabId?: number, frameId?: number): Frames.FramesMap | Frames.Frames | Port | null {
      return tabId == null ? framesForTab
        : frameId == null ? (tabId === GlobalConsts.VomnibarFakeTabId ? framesForOmni : framesForTab[tabId] || null)
        : indexFrame(tabId, frameId);
    } as BackendHandlersNS.BackendHandlers["indexPorts_"],
    onInit_(): void {
      if (Settings_.temp_.initing_ !== BackendHandlersNS.kInitStat.FINISHED) { return; }
      if (!CommandsData_.keyFSM_) {
        Settings_.postUpdate_("keyMappings");
        if (!Settings_.get_("vimSync") && !Settings_.temp_.hasEmptyLocalStorage_) {
          KeyMappings = null as never
        }
      }
      if (Settings_.payload_.o === kOS.mac) {
        CommandsData_.visualKeys_["m-s-c"] = VisualAction.YankRichText
      }
      // the line below requires all necessary have inited when calling this
      Backend_.onInit_ = null;
      Settings_.get_("hideHud", true);
      Settings_.get_("nextPatterns", true);
      Settings_.get_("previousPatterns", true);
      chrome.runtime.onConnect.addListener(function (port): void {
        if (!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther & BrowserType.Edge) {
          let name = port.name, pos = name.indexOf(PortNameEnum.Delimiter), type = pos > 0 ? name.slice(0, pos) : name;
          port.sender.url = name.slice(type.length + 1);
          return OnConnect(port as Frames.Port, (type as string | number as number) | 0);
        }
        return OnConnect(port as Frames.Port, (port.name as string | number as number) | 0);
      });
      if (Build.BTypes & BrowserType.Edge && !chrome.runtime.onConnectExternal) {
        return;
      }
      chrome.runtime.onConnectExternal!.addListener(function (port): void {
        let { sender, name } = port, arr: string[];
        if (sender
            && isExtIdAllowed(sender.id, sender.url)
            && name.startsWith(PortNameEnum.Prefix) && (arr = name.split(PortNameEnum.Delimiter)).length > 1) {
          if (arr[1] !== Settings_.CONST_.GitVer) {
            (port as Port).postMessage({ N: kBgReq.injectorRun, t: InjectorTask.reload });
            port.disconnect();
            return;
          }
          OnConnect(port as Frames.Port, (arr[0].slice(PortNameEnum.PrefixLen) as string | number as number) | 0);
          (port as Frames.Port).s.f |= Frames.Flags.OtherExtension;
        } else {
          port.disconnect();
        }
      });
    }
};

(!(Build.BTypes & BrowserType.Edge) || chrome.runtime.onMessageExternal) &&
(chrome.runtime.onMessageExternal!.addListener((
      message: boolean | number | string | null | undefined | ExternalMsgs[keyof ExternalMsgs]["req"]
      , sender, sendResponse): void => {
    if (!isExtIdAllowed(sender.id, sender.url)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      executeExternalCmd({command: message}, sender);
      return;
    }
    else if (typeof message !== "object" || !message) {
      return;
    }
    switch (message.handler) {
    case kFgReq.shortcut:
      let shortcut = message.shortcut;
      if (shortcut) {
        Backend_.ExecuteShortcut_(shortcut + "");
      }
      break;
    case kFgReq.id:
      (sendResponse as (res: ExternalMsgs[kFgReq.id]["res"]) => void | 1)({
        name: "Vimium C",
        host: location.host,
        shortcuts: true,
        injector: Settings_.CONST_.Injector_,
        version: Settings_.CONST_.VerCode_
      });
      break;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        s: message.scripts ? Settings_.CONST_.ContentScripts_ : null,
        version: Settings_.CONST_.VerCode_,
        host: !(Build.BTypes & ~BrowserType.Chrome) ? "" : location.host,
        h: PortNameEnum.Delimiter + Settings_.CONST_.GitVer
      });
      break;
    case kFgReq.command:
      executeExternalCmd(message, sender);
      break;
    }
}), Settings_.postUpdate_("extAllowList"))

browserTabs.onReplaced.addListener((addedTabId, removedTabId) => {
    const ref = framesForTab, frames = ref[removedTabId];
    if (!frames) { return; }
    delete ref[removedTabId];
    ref[addedTabId] = frames;
    for (let i = frames.length; 0 < --i; ) {
      (frames[i].s as Writable<Frames.Sender>).t = addedTabId;
    }
});

if (Settings_.storage_.getItem("exclusionRules") !== "[]") {
  Exclusions.setRules_(Settings_.get_("exclusionRules"))
}

  Settings_.postUpdate_("vomnibarPage", null);
  Settings_.postUpdate_("searchUrl", null); // will also update newTabUrl
  Settings_.postUpdate_("vomnibarOptions");

  // will run only on <kbd>F5</kbd>, not on runtime.reload
window.onunload = (event): void => {
    if (event
        && (Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted || !(Build.BTypes & BrowserType.Chrome)
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    let ref = framesForTab as Frames.FramesMapToDestroy;
    ref.o = framesForOmni;
    for (const tabId in ref) {
      const arr = ref[tabId];
      for (let i = arr.length; 0 < --i; ) {
        arr[i].disconnect();
      }
    }
    if (framesForOmni.length > 0) {
      framesForOmni[0].disconnect();
    }
}
