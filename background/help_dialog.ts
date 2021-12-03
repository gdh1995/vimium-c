import { CONST_, CurCVer_, helpDialogData_, IsEdg_, keyToCommandMap_, OnChrome, OnFirefox } from "./store"
import * as BgUtils_ from "./utils"
import { browser_ } from "./browser"
import { convertToUrl_ } from "./normalize_urls"
import { normalizedOptions_ } from "./key_mappings"

type NoAliasInCNames<k extends kCName> =
    k extends `${string}activate${string}Mode${string}` | `${string}Unhover` | `${string}CS${string}`
        | `${string}vateUrl${string}` | `${string}TabSelection`
        | "clearContentSetting" | kShortcutAliases.nextTab1 | "newTab" | "simBackspace" | "wait"
    ? never : k

// eslint-disable-next-line no-var
let html_: [string, string] | null = null
let i18n_: Map<keyof typeof import("../i18n/zh/help_dialog.json"), string>
const descriptions_ = new Map<kCName, [/** description */ string, /** parameters */ string]>()

export const parseHTML = (template: string): [string, string] => {
      const noShadow = !( (!OnChrome || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && (OnChrome || OnFirefox))
          && !(OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                ? globalThis.ShadowRoot || document.body!.webkitCreateShadowRoot : globalThis.ShadowRoot),
      noContain = OnChrome && Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize
          && CurCVer_ === BrowserVer.CSS$Contain$BreaksHelpDialogSize;
      let pos = template.indexOf("</style>") + 8, head = template.slice(0, pos), body = template.slice(pos).trim();
      if (OnFirefox) {
        const arr = head.match(<RegExpOne> /<style.*?>/)!;
        body = head.slice(0, arr.index).trim() + body;
        head = head.slice(arr.index + arr[0].length, -8);
      }
      if (noShadow || noContain) {
        if (noContain) {
          head = head.replace(<RegExpG> /contain:\s?[\w\s]+/g, "contain: none !important");
        }
        if (noShadow) {
          head = head.replace(<RegExpG> /[#.][A-Z][^,{};]*[,{]/g, "#VimiumUI $&");
        }
      }
      body = body.replace(<RegExpG & RegExpSearchable<1>> /\$(\w+)/g, (_, s): string => i18n_.get(s as "misc") ?? s)
      const consts = BgUtils_.safer_<Dict<string>>({
      homePage: CONST_.HomePage_,
      version: CONST_.VerName_,
      release: convertToUrl_("vimium://release"),
      reviewPage: OnFirefox
          ? GlobalConsts.FirefoxAddonPrefix + "vimium-c/reviews/?src=external-help-dialog"
          : (OnChrome && IsEdg_
              ? GlobalConsts.EdgStorePage : GlobalConsts.ChromeWebStorePage).replace("$id", () => browser_.runtime.id),
      webStore: i18n_.get(OnFirefox ? "addons" : IsEdg_ ? "edgestore" : "webstore"),
      browserHelp: OnFirefox ? GlobalConsts.FirefoxHelp as string
          : OnChrome && IsEdg_ ? GlobalConsts.EdgHelp
          : GlobalConsts.ChromeHelp
      });
      body = body.replace(<RegExpSearchable<1>> /\{\{(\w+)}}/g, (_, group: string) => consts[group] || _);
      return [head, body]
}

export const render_ = (isOptionsPage: boolean): NonNullable<CmdOptions[kFgCmd.showHelpDialog]["h"]> => {
    i18n_ = helpDialogData_![1] as typeof i18n_
    if (!html_ || helpDialogData_![0]) {
      html_ = parseHTML(helpDialogData_![0]!)
      helpDialogData_![0] = ""
    }
    const commandToKeys = new Map<string, [string, CommandsNS.Item][]>(),
    hideUnbound = !isOptionsPage, showNames = isOptionsPage
    keyToCommandMap_.forEach((registry, key): void => {
      if (key.startsWith("<v-") && key.endsWith(">")) { return }
      const command = normalizeCmdName(registry.command_)
      let keys = commandToKeys.get(command)
      keys || commandToKeys.set(command, keys = [])
      if (typeof registry.options_ === "string" && (<RegExpOne> /\$(?:key|desc)=/).test(registry.options_)) {
        normalizedOptions_(registry)
      }
      keys.push([key, registry])
    })
    const result = BgUtils_.safer_<Dict<string>>({
      title: i18n_.get(isOptionsPage ? "cmdList" : "help") || "",
      tip: showNames && i18n_.get("tipClickToCopy") || "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    });
    const div = html_[1].replace(<RegExpG & RegExpSearchable<1>> /\{\{(\w+)}}/g
        , (_, group: string) => result[group] ?? renderGroup(group, commandToKeys, hideUnbound, showNames))
    return OnFirefox ? { h: html_[0], b: div } : (html_[0] + div) as any as "html"
}

type StringIncluded<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}${string}` ? A : never
type StringStartsWith<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${S}${string}` ? A : never
type StringEndsWith<A extends string, S extends string>
    = string extends S ? string : string extends A ? string : A extends `${string}${S}` ? A : never
const includes = <A extends string, S extends string> (name: A, part: S): name is A & StringIncluded<A, S> =>
    name.includes(part)
const startsWith = <A extends string, S extends string> (name: A, tail: S): name is A & StringStartsWith<A, S> =>
    name.startsWith(tail)
const endsWith = <A extends string, S extends string> (name: A, tail: S): name is A & StringEndsWith<A, S> =>
    name.endsWith(tail)

type _NormalizedNames1<T extends kCName> =
      T extends `${infer A}.activate${infer B}ModeTo${infer C}` ? `${A}.activate${B}${C}`
    : T extends `${infer A}.activate${infer B}Mode${infer C}` ? `${A}.activate${B}${C}`
    : T
type _NormalizedNames2<T extends kCName> =
      T extends `${infer A}Unhover` ? `${A}Leave`
    : T extends `${infer A}Goto` ? `${A}`
    : T extends "clearContentSetting" ? `${T}s`
    : T extends `${infer A}CS${infer B}` ? A extends "clear" ? "clearContentSettings" : `${A}ContentSetting${B}`
    : T extends `${infer A}vateUrl${infer B}` ? `${A}vateEditUrl${B}`
    : T extends `${infer A}TabSelection` ? `${A}Tabs`
    : T extends "quickNext" ? "nextTab"
    : T extends "closeSomeOtherTabs" ? "closeOtherTabs"
    : T extends "newTab" ? "createTab" : T extends "simBackspace" ? "simulateBackspace"
    : T extends "showHUD" ? "showTip" : T extends "wait" ? "blank"
    : T
type NormalizedNames = _NormalizedNames2<_NormalizedNames1<kCName>>

const normalizeCmdName = (command: kCName): NormalizedNames => {
      if (includes(command, "Mode") && includes(command, ".activate")) {
        command = includes(command, "ModeTo") ? command.replace("ModeTo", "")
            : command.replace("Mode", "")
      }
      if (endsWith(command, "Unhover")) {
        command = command.replace("Unhover", "Leave")
      } else if (endsWith(command, "Goto")) {
        command = command.replace("Goto", "")
      } else if (command === "clearContentSetting") {
        command = `${command}s`
      } else if (includes(command, "CS")) {
        command = startsWith(command, "clear") ? "clearContentSettings"
            : command.replace("CS", "ContentSetting")
      } else if (includes(command, "vateUrl")) {
        command = command.replace("vateUrl", "vateEditUrl")
      } else if (endsWith(command, "TabSelection")) {
        command = command.replace("TabSelection", "Tabs")
      } else if (command === kShortcutAliases.nextTab1) {
        command = AsC_("nextTab");
      } else if (command === AsC_("newTab")) {
        command = AsC_("createTab")
      } else if (command === AsC_("closeSomeOtherTabs")) {
        command = AsC_("closeOtherTabs")
      } else if (command === AsC_("simBackspace")) {
        command = AsC_("simulateBackspace")
      } else if (command === AsC_("showHUD")) {
        command = AsC_("showTip")
      } else if (command === AsC_("wait")) {
        command = AsC_("blank")
      }
      return command
}

const renderGroup = (group: string, commandToKeys: Map<string, [string, CommandsNS.Item][]>
      , hideUnbound: boolean, showNames: boolean): string => {
    const cmdParams = i18n_.get("cmdParams") || " (use *)", i18nParams = helpDialogData_![2]!
    let html = "";
    for (const command of commandGroups_[group as keyof typeof commandGroups_]) {
      let keys = commandToKeys.get(command)
      if (hideUnbound && !keys) { continue; }
      const isAdvanced = advancedCommands_[command] === 1;
      let keyLen = -2, bindings = "", description = descriptions_.get(command)
      if (!description) {
        const params = i18nParams.get(command)
        description = [i18n_.get(command as NormalizedNames)!.replace("<", "&lt;").replace(">", "&gt;"),
            (params ? cmdParams.replace("*", () => params) : " ")] // lgtm [js/incomplete-sanitization]
        descriptions_.set(command, description)
        if (!(Build.NDEBUG || description)) {
          console.log("Assert error: lack a description for %c%s", "color:red", command);
        }
      }
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">';
        for (let i = 0; i < keys.length; i++) {
          if (keyLen > 42 && i < keys.length - 1) {
            bindings += `</span>\n\t<span>+ ${keys.length - i} \u2026`
            break
          }
          const item = keys[i]
          const key = BgUtils_.escapeText_(item[0])
          if (keyLen >= 0) {
            bindings += '</span> <span class="HelpKey">';
          }
          bindings += key;
          keyLen += item[0].length + 2;
        }
        bindings += "</span>\n\t";
      }
      const curDesc = showNames ? description[0] + description[1] : description[0]
      // keep rendering if not hideUnbound
      if (keyLen <= 12) {
        html += commandHTML_(isAdvanced, bindings, curDesc, showNames ? command : "")
      } else {
        html += commandHTML_(isAdvanced, bindings, "", "")
        html += commandHTML_(isAdvanced, "", curDesc, showNames ? command : "")
      }
    }
    return html;
}

const commandHTML_ = (isAdvanced: boolean, bindings: string, description: string, command: string): string => {
    let html = isAdvanced ? '<tr class="HelpAdv">\n\t' : "<tr>\n\t";
    if (description) {
      html += '<td class="HelpTd HelpKeys">';
      html += bindings;
      html += '</td>\n\t<td class="HelpTd HelpCommandInfo">';
      html += description;
      if (command) {
        html += '<span class="HelpCommandName" role="button">(';
        html += command;
        html += ")</span>\n\t";
      }
    } else {
      html += '<td class="HelpTd HelpKeys HelpLongKeys" colspan="2">';
      html += bindings;
    }
    return html + "</td>\n</tr>\n";
}

const commandGroups_: {
    readonly [key in
        "pageNavigation" | "vomnibarCommands" | "historyNavigation" | "findCommands" | "tabManipulation" | "misc"
        ]: readonly NoAliasInCNames<kCName>[]
} & SafeObject = {
    __proto__: null as never,
    pageNavigation: [
      "LinkHints.activate", "LinkHints.activateOpenInNewTab"
      , "LinkHints.activateOpenInNewForegroundTab", "LinkHints.activateWithQueue"
      , "scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
      , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
      , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
      , "scrollFullPageDown", "scrollFullPageUp", "scrollSelect"
      , "reload", "reloadTab", "reloadGivenTab"
      , "zoom", "zoomIn", "zoomOut", "zoomReset", "toggleViewSource"
      , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "focusInput"
      , "LinkHints.activateCopyLinkUrl", "LinkHints.activateCopyLinkText"
      , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
      , "LinkHints.activateDownloadImage", "LinkHints.activateOpenImage"
      , "LinkHints.activateDownloadLink", "LinkHints.activateOpenIncognito"
      , "LinkHints.activateFocus"
      , "LinkHints.activateHover", "LinkHints.activateLeave", "LinkHints.unhoverLast"
      , "LinkHints.activateSearchLinkText", "LinkHints.activateEdit"
      , "LinkHints.activateSelect", "LinkHints.click", "simulateBackspace", "dispatchEvent"
      , "goPrevious", "goNext", "nextFrame", "mainFrame", "parentFrame"
      , "enterInsertMode", "enterVisualMode", "enterVisualLineMode"
      , "Marks.activateCreate", "Marks.activate"
      , "Marks.clearLocal", "Marks.clearGlobal", "openUrl", "focusOrLaunch"
      ],
    vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
      , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
      , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabs"
      , "Vomnibar.activateEditUrl", "Vomnibar.activateEditUrlInNewTab"
      , "LinkHints.activateOpenVomnibar", "toggleVomnibarStyle"],
    historyNavigation: ["goBack", "goForward", "reopenTab"],
    findCommands: ["enterFindMode", "performFind", "performBackwardsFind", "performAnotherFind"
      , "clearFindHistory"],
    tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab"
      , "duplicateTab", "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab"
      , "discardTab", "moveTabToNextWindow", "moveTabToNewWindow", "moveTabToIncognito"
      , "joinTabs", "sortTabs"
      , "togglePinTab", "toggleMuteTab", "visitPreviousTab", "closeTabsOnLeft"
      , "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
      , "enableContentSettingTemp", "toggleContentSetting", "clearContentSettings", "copyWindowInfo", "captureTab"],
    misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "searchInAnother", "showTip"
      , "openBookmark", "addBookmark"
      , "toggleStyle", "toggleLinkHintCharacters"
      , "toggleSwitchTemp", "passNextKey", "debugBackground"
      , "reset", "runKey", "sendToExtension", "blank"]
}

const advancedCommands_: { readonly [k in NoAliasInCNames<kCName>]?: 1 | 0; } & SafeObject = { __proto__: null as never,
    toggleViewSource: 1, clearFindHistory: 1, dispatchEvent: 1
    , scrollToLeft: 1, scrollToRight: 1, moveTabToNextWindow: 1
    , moveTabToNewWindow: 1, moveTabToIncognito: 1, reloadGivenTab: 1
    , focusOrLaunch: 1
    , enableContentSettingTemp: 1, toggleContentSetting: 1, toggleStyle: 1, clearContentSettings: 1
    , "LinkHints.activateDownloadImage": 1, reopenTab: 1
    , "LinkHints.activateOpenImage": 1, removeRightTab: 1
    , "LinkHints.activateDownloadLink": 1, restoreGivenTab: 1, runKey: 1, sendToExtension: 1
    , discardTab: 1, copyWindowInfo: 1
    , "LinkHints.activateOpenIncognito": 1, passNextKey: 1
    , goNext: 1, goPrevious: 1, "Marks.clearLocal": 1, "Marks.clearGlobal": 1
    , moveTabLeft: 1, moveTabRight: 1, closeTabsOnLeft: 1, closeTabsOnRight: 1
    , closeOtherTabs: 1, scrollPxDown: 1, scrollPxUp: 1, scrollPxLeft: 1
    , scrollPxRight: 1, debugBackground: 1, blank: 1, reset: 1, scrollSelect: 1
    , "LinkHints.activateHover": 1, "LinkHints.unhoverLast": 1
    , toggleLinkHintCharacters: 1, toggleSwitchTemp: 1, "LinkHints.activateLeave": 1
    , "Vomnibar.activateEditUrl": 1, "Vomnibar.activateEditUrlInNewTab": 1
    , closeDownloadBar: OnChrome ? 0 : 1, zoomIn: 1, zoomOut: 1, zoomReset: 1, addBookmark: 1
}

if (OnChrome) {
  (commandGroups_.misc as Writable<typeof commandGroups_.misc>).push("closeDownloadBar")
}

if (OnFirefox || OnChrome && IsEdg_) {
  (commandGroups_.tabManipulation as Writable<typeof commandGroups_.tabManipulation>).push("toggleReaderMode")
}
