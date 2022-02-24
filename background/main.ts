import {
  framesForTab_, framesForOmni_, OnChrome, CurCVer_, OnEdge, OnFirefox, os_, curTabId_, bgC_,
  set_visualWordsRe_, bgIniting_, Completion_, CONST_, keyFSM_, reqH_, set_bgIniting_, set_hasGroupPermission_ff_,
  onInit_, set_onInit_, IsLimited
} from "./store"
import * as BgUtils_ from "./utils"
import { runtimeError_, tabsGet, Tabs_, browser_, watchPermissions_} from "./browser"
import "./normalize_urls"
import "./parse_urls"
import * as settings_ from "./settings"
import { OnConnect, isExtIdAllowed } from "./ports"
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
  if (!map || !map.get(cmd)) {
    // usually, only userCustomized* and those from 3rd-party extensions will enter this branch
    if (map && map.get(cmd) !== null) {
      map.set(cmd, null)
      console.log("Shortcut %o has not been configured.", cmd)
    }
  } else if (ref == null || (ref.flags_ & Frames.Flags.userActed) || curTabId_ < 0) {
    executeShortcut(cmd, ref)
  } else {
    tabsGet(curTabId_, (tab): void => {
      executeShortcut(cmd as StandardShortcutNames, tab && tab.status === "complete" ? framesForTab_.get(tab.id) : null)
      return runtimeError_()
    })
  }
}

set_onInit_(As_<typeof onInit_>((): void => {
      if (bgIniting_ !== BackendHandlersNS.kInitStat.FINISHED) { return }
      if (onInit_) {
        BgUtils_.nextTick_(settings_.ready_.then.bind(settings_.ready_, onInit_))
        set_onInit_(null)
        return
        // all code below requires all necessary have inited when calling this
      }
      if (!keyFSM_) {
        settings_.postUpdate_("keyMappings")
        if (!OnEdge && Build.OS & (1 << kOS.mac) && os_ === kOS.mac) {
          visualKeys_["m-s-c"] = VisualAction.YankRichText
        }
      }
      settings_.postUpdate_("exclusionListenHash")
      settings_.postUpdate_("vomnibarOptions")
      if (!(Build.MV3 && IsLimited)) { // media watchers should be setup after vomnibarOptions
        settings_.postUpdate_("autoDarkMode")
        settings_.postUpdate_("autoReduceMotion")
      }
      browser_.runtime.onConnect.addListener((port): void => {
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
}))

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

(OnEdge || OnFirefox && Build.MayAndroidOnFirefox) && !browser_.commands ||
(browser_.commands.onCommand as chrome.events.Event<
      (command: StandardShortcutNames | kShortcutAliases & string, exArg: FakeArg) => void
    >).addListener(executeShortcutEntry);

OnEdge || void settings_.ready_.then((): void => {
  settings_.postUpdate_("extAllowList")
  browser_.runtime.onMessageExternal!.addListener((
      message: boolean | number | string | null | undefined | ExternalMsgs[keyof ExternalMsgs]["req"]
      , sender, sendResponse): void => {
    if (!isExtIdAllowed(sender)) {
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
        injector: CONST_.Injector_,
        version: CONST_.VerCode_
      });
      break;
    case kFgReq.inject:
      (sendResponse as (res: ExternalMsgs[kFgReq.inject]["res"]) => void | 1)({
        s: message.scripts ? CONST_.ContentScripts_ : null,
        version: CONST_.VerCode_,
        host: OnChrome ? "" : location.host,
        h: PortNameEnum.Delimiter + CONST_.GitVer
      });
      break;
    case kFgReq.command:
      executeExternalCmd(message, sender)
      break;
    }
  })
  settings_.postUpdate_("vomnibarPage", null)
  settings_.postUpdate_("searchUrl", null) // will also update newTabUrl
})

OnFirefox && Build.MayAndroidOnFirefox && !Tabs_.onReplaced || // Not exist on Thunderbird
Tabs_.onReplaced.addListener((addedTabId, removedTabId) => {
    const frames = framesForTab_.get(removedTabId)
    if (!frames) { return; }
    framesForTab_.delete(removedTabId)
    framesForTab_.set(addedTabId, frames)
    for (const port of frames.ports_) {
      (port.s as Writable<Frames.Sender>).tabId_ = addedTabId;
    }
});

Completion_.filter_ = (a, b, c): void => { setTimeout(() => { Completion_.filter_(a, b, c) }, 210) }

OnFirefox && watchPermissions_([{ permissions: ["cookies"] }], (allowed): void => {
  set_hasGroupPermission_ff_(allowed[0]!)
})

set_bgIniting_(bgIniting_ | BackendHandlersNS.kInitStat.main)
onInit_!()

  // will run only on <kbd>F5</kbd>, not on runtime.reload
globalThis.onunload = (event): void => {
    if (event && (!OnChrome || Build.MinCVer >= BrowserVer.Min$Event$$IsTrusted
            ? !event.isTrusted : event.isTrusted === false)) { return; }
    for (let port of framesForOmni_) {
      port.disconnect()
    }
    framesForTab_.forEach((frames): void => {
      for (let port of frames.ports_.slice(0)) {
        port.disconnect();
      }
    })
}
if (!(globalThis as MaybeWithWindow).window) { (globalThis as any).onclose = onunload }

if (OnFirefox && !Build.NativeWordMoveOnFirefox
    || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      && Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces) {
  ( OnFirefox ? !Build.NativeWordMoveOnFirefox && !BgUtils_.makeRegexp_("\\p{L}", "u", 0)
    : !OnChrome ? false
    : Build.MinCVer < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
      && Build.MinCVer < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
      && (BrowserVer.MinSelExtendForwardOnlySkipWhitespaces < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
        ? CurCVer_ < (
          BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp < BrowserVer.MinSelExtendForwardOnlySkipWhitespaces
          ? BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp : BrowserVer.MinSelExtendForwardOnlySkipWhitespaces)
        : CurCVer_ < BrowserVer.MinMaybeUnicodePropertyEscapesInRegExp
          || !BgUtils_.makeRegexp_("\\p{L}", "u", 0))
  ) ? void BgUtils_.fetchFile_("words.txt").then((text): void => {
    set_visualWordsRe_(text.replace(<RegExpG> /[\n\r]/g, "")
        .replace(<RegExpG & RegExpSearchable<1>> /\\u(\w{4})/g, (_, s1) => String.fromCharCode(+("0x" + s1))))
  }) : set_visualWordsRe_("")
}
