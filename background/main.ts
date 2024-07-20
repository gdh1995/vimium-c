import {
  framesForTab_, framesForOmni_, OnChrome, CurCVer_, OnEdge, OnFirefox, os_, curTabId_, bgC_,
  set_visualWordsRe_, bgIniting_, Completion_, CONST_, keyFSM_, reqH_, set_bgIniting_, set_hasGroupPermission_ff_,
  onInit_, set_onInit_, set_cPort, lastKeptTabId_, set_lastKeptTabId_, CurFFVer_
} from "./store"
import * as BgUtils_ from "./utils"
import { runtimeError_, tabsGet, Tabs_, browser_, watchPermissions_ } from "./browser"
import "./normalize_urls"
import "./parse_urls"
import * as settings_ from "./settings"
import { OnConnect, isExtIdAllowed, showHUD } from "./ports"
import "./exclusions"
import "./ui_css"
import { shortcutRegistry_, visualKeys_ } from "./key_mappings"
import { executeShortcut, executeExternalCmd } from "./run_commands"
import "./eval_urls"
import "./open_urls"
import "./all_commands"
import "./request_handlers"
import "./tools"

const executeShortcutEntry = (cmd: StandardShortcutNames | kShortcutAliases): void => {
  const ref = framesForTab_.get(curTabId_)
  if (cmd === kShortcutAliases.nextTab1) { cmd = "nextTab" }
  const map = shortcutRegistry_
  if (bgIniting_ !== BackendHandlersNS.kInitStat.FINISHED) { /* empty */
  } else if (!map || !map.get(cmd)) {
    // usually, only userCustomized* and those from 3rd-party extensions will enter this branch
    if (map && map.get(cmd) !== null) {
      map.set(cmd, null)
      console.log("Shortcut %o has not been configured.", cmd)
    }
    ref && set_cPort(ref.cur_)
    showHUD(`Shortcut "${cmd}" has not been configured.`)
  } else if (ref == null || (ref.flags_ & Frames.Flags.userActed) || curTabId_ < 0) {
    executeShortcut(cmd, ref)
  } else {
    tabsGet(curTabId_, (tab): void => {
      executeShortcut(cmd as StandardShortcutNames, tab && tab.status === "complete" ? framesForTab_.get(tab.id) : null)
      return runtimeError_()
    })
  }
}

set_onInit_(((): void => {
      if (bgIniting_ !== BackendHandlersNS.kInitStat.FINISHED) { return }
      if (onInit_) {
        BgUtils_.nextTick_(settings_.ready_.then.bind(settings_.ready_, onInit_))
        set_onInit_(null)
        return
        // all code below requires all necessary have inited when calling this
      }
      if (!keyFSM_) {
        settings_.postUpdate_("keyMappings")
        if (!OnEdge && Build.OS & kBOS.MAC && (Build.OS === kBOS.MAC as number || !os_)) {
          visualKeys_["m-s-c"] = VisualAction.YankRichText
        }
      }
      settings_.postUpdate_("exclusionListenHash")
      settings_.postUpdate_("vomnibarOptions")
      { // media watchers should be setup after vomnibarOptions
        settings_.postUpdate_("autoDarkMode")
        settings_.postUpdate_("autoReduceMotion")
      }
      Build.MV3 || browser_.runtime.onConnect.addListener((port): void => {
        if (OnEdge) {
          let name = port.name, pos = name.indexOf(PortNameEnum.Delimiter), type = pos > 0 ? name.slice(0, pos) : name;
          port.sender.url = name.slice(type.length + 1);
          return OnConnect(port as Frames.Port, (type as string | number as number) | 0);
        }
        return OnConnect(port as Frames.Port, (port.name as string | number as number) | 0);
      });
      if (OnEdge && !browser_.runtime.onConnectExternal) {
        return;
      }
      browser_.runtime.onConnectExternal!.addListener(function (port): void {
        let { sender, name } = port, arr: string[];
        if (sender && isExtIdAllowed(sender)
            && name.startsWith(PortNameEnum.Prefix) && (arr = name.split(PortNameEnum.Delimiter)).length > 1) {
          if (arr[1] !== CONST_.GitVer) {
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
  browser_.extension.isAllowedIncognitoAccess((isAllowedAccess): void => {
    CONST_.DisallowIncognito_ = isAllowedAccess === false
    Build.MV3 || setTimeout((): void => {
      import("/background/others.js" as any)
      setTimeout((): void => {
        import("/background/browsing_data_manager.js" as any)
        import("/background/completion_utils.js" as any)
        import("/background/completion.js" as any)
      }, 200)
    }, 200)
  })
}) satisfies typeof onInit_)

if (!Build.NDEBUG) {
  let lacking: any[] = (bgC_ as { [K: number]: any } as any[]).map((i, ind) => !!i ? -1 : ind).filter(i => i >= 0)
  if (lacking.length > 0) {
    throw new Error("Some functions in bgC_ are not inited: " + lacking.join(", "))
  }
  lacking = (reqH_ as { [K: number]: any } as any[]).map((i, ind) => !!i ? -1 : ind).filter(i => i >= 0)
  if (lacking.length > 0) {
    throw new Error("Some functions in reqH_ are not inited: " + lacking.join(", "))
  }
}

Build.MV3 && browser_.runtime.onConnect.addListener((port): void => {
  if (bgIniting_ !== BackendHandlersNS.kInitStat.FINISHED) { port.disconnect(); return }
  return OnConnect(port as Frames.Port, (port.name as string | number as number) | 0)
});

(OnEdge || OnFirefox && Build.MayAndroidOnFirefox) && !browser_.commands ||
(browser_.commands.onCommand as chrome.events.Event<
      (command: StandardShortcutNames | kShortcutAliases & string, exArg: FakeArg) => void
    >).addListener(executeShortcutEntry);

OnEdge || void settings_.ready_.then((): void => {
  settings_.postUpdate_("extAllowList")
  browser_.runtime.onMessageExternal!.addListener((
      message: boolean | number | string | null | undefined | ExternalMsgs[keyof ExternalMsgs]["req"]
      , sender, sendResponse): void => {
    // https://stackoverflow.com/questions/66618136#:~:text=If%20you%20also%20use%20sendMessage
    const requireResp = Build.MV3 && OnChrome && Build.MinCVer <= 101 && CurCVer_ < 101 + 1 && CurCVer_ >= 99
    if (!isExtIdAllowed(sender)) {
      sendResponse(false);
      return;
    }
    if (typeof message === "string") {
      executeExternalCmd({command: message}, sender)
    }
    else if (typeof message !== "object" || !message) { /* empty */ }
    else switch (message.handler) {
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
        injector: CONST_.Injector_,
        version: CONST_.VerCode_
      });
      return;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        s: message.scripts ? CONST_.ContentScripts_ : null,
        version: CONST_.VerCode_,
        host: OnChrome ? "" : location.host,
        h: PortNameEnum.Delimiter + CONST_.GitVer
      });
      return;
    case kFgReq.command:
      executeExternalCmd(message, sender)
      break;
    }
    requireResp && sendResponse(true)
  })
  settings_.postUpdate_("vomnibarPage", null)
  settings_.postUpdate_("searchUrl", null) // will also update newTabUrl
})

!OnChrome && !Tabs_.onReplaced || // Not exist on Thunderbird
Tabs_.onReplaced.addListener((addedTabId, removedTabId): void => {
    const frames = framesForTab_.get(removedTabId)
    if (lastKeptTabId_ === removedTabId) { set_lastKeptTabId_(addedTabId) }
    if (!frames) { return; }
    framesForTab_.delete(removedTabId)
    framesForTab_.set(addedTabId, frames)
    for (const port of frames.ports_) {
      (port.s as Writable<Frames.Sender>).tabId_ = addedTabId;
    }
    (frames.cur_.s as Writable<Frames.Sender>).tabId_ = addedTabId
    for (const port of framesForOmni_) {
      port.s.tabId_ === removedTabId && ((port.s as Writable<Frames.Sender>).tabId_ = addedTabId)
    }
});

Completion_.filter_ = (a, b, c): void => { setTimeout(() => { Completion_.filter_(a, b, c) }, 210) }

OnFirefox && watchPermissions_([{ permissions: ["cookies"] }], (allowed): void => {
  set_hasGroupPermission_ff_(allowed[0]!)
})

set_bgIniting_(bgIniting_ | BackendHandlersNS.kInitStat.main)
onInit_!()

if (Build.MV3 && !OnFirefox && (!OnChrome ||
    (Build.MinCVer < BrowserVer.MinCSAcceptWorldInManifest
        || !Build.NDEBUG && browser_.runtime.getManifest().content_scripts!.length === 1)
    && (Build.MinCVer >= BrowserVer.MinRegisterContentScriptsWorldInMV3
        || CurCVer_ > BrowserVer.MinRegisterContentScriptsWorldInMV3 - 1))) {
  browser_.scripting.registerContentScripts([{
    id: "extend_click",
    js: ["content/extend_click_vc.js"],
    matches: ["<all_urls>"],
    allFrames: true,
    runAt: "document_start",
    world: "MAIN"
  }]).catch(err => {
    const msg = err + ""
    msg.includes("Duplicate script ID") || console.log("Can not register extend_click:", err)
  })
}

// @ts-ignore // will run only on <kbd>F5</kbd>, not on runtime.reload
Build.MV3 || ((window as Window) // `window.` is necessary on Chrome 32
.onpagehide = (): void => {
    for (let port of framesForOmni_) {
      port.disconnect()
    }
    framesForTab_.forEach((frames): void => {
      for (let port of frames.ports_) {
        port.disconnect();
      }
    })
})

if (OnFirefox && !Build.NativeWordMoveOnFirefox
        && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  (OnFirefox ? CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
    : CurCVer_ < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces <= BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          || CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && (CurCVer_ < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp || !BgUtils_.makeRegexp_("\\p{L}", "u",0)))
  ) ? void BgUtils_.fetchFile_("words.txt").then((text): void => {
    set_visualWordsRe_(text.replace(<RegExpG> /[\n\r]/g, "")
        .replace(<RegExpG & RegExpSearchable<1>> /\\u(\w{4})/g, (_, s1) => String.fromCharCode(parseInt(s1, 16))))
  }) : set_visualWordsRe_("")
}
