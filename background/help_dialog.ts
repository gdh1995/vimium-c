import {
  CONST_, CurCVer_, helpDialogData_, IsEdg_, keyToCommandMap_, OnChrome, OnFirefox, inlineRunKey_
} from "./store"
import * as BgUtils_ from "./utils"
import { browser_ } from "./browser"
import { convertToUrl_ } from "./normalize_urls"
import { extTrans_ } from "./i18n"

type NoAliasInCNames<k extends kCName> =
    k extends `${string}activate${string}Mode${string}` | `${string}Unhover` | `${string}CS${string}`
        | `${string}vateUrl${string}` | `${string}TabSelection`
        | "clearContentSetting" | kShortcutAliases.nextTab1 | "newTab" | "simBackspace" | "wait"
    ? never : k

// eslint-disable-next-line no-var
let html_: [string, string] | null = null
let i18n_: Map<keyof typeof import("../i18n/zh/help_dialog.json"), string>
const descriptions_ = new Map<kCName, [/** description */ string, /** parameters */ string]>()

const parseHTML = (template: string): [string, string] => {
      const noShadow = !(Build.MV3 || (!OnChrome || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
            && (!OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
            && (OnChrome || OnFirefox))
          && !(OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
                ? globalThis.ShadowRoot || (globalThis as MaybeWithWindow).document!.body!.webkitCreateShadowRoot
                : globalThis.ShadowRoot),
      noAllInitial = OnChrome && Build.MinCVer <= BrowserVer.CSS$All$$initial$MayBreakHelpDialog
          && CurCVer_ === BrowserVer.CSS$All$$initial$MayBreakHelpDialog,
      noContain = OnChrome && Build.MinCVer <= BrowserVer.CSS$Contain$BreaksHelpDialogSize
          && CurCVer_ === BrowserVer.CSS$Contain$BreaksHelpDialogSize;
      let pos = template.indexOf("</style>") + 8, head = template.slice(0, pos), body = template.slice(pos).trim();
      if (OnFirefox) {
        const arr = head.match(<RegExpOne> /<style.*?>/)!;
        body = head.slice(0, arr.index).trim() + body;
        head = head.slice(arr.index + arr[0].length, -8);
      }
      if (noShadow || noContain || noAllInitial) {
        if (noContain) {
          head = head.replace(<RegExpG> /contain:[\w\s!]+/g, "contain: none !important")
        }
        if (noAllInitial) { head = head.replace("initial", "inherit") }
        if (noShadow) {
          head = head.replace(<RegExpG> /[#.][A-Z][^,{};]*[,{]/g, "#VimiumUI $&");
        }
      }
    if (OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode
        && IsEdg_ && CurCVer_ < BrowserVer.MinForcedColorsMode) {
      head = head.replace(<RegExpG> /forced-colors/g, "-ms-high-contrast")
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
    })
    body = body.replace(<RegExpSearchable<1>> /\{\{(\w+)}}/g, (_, group: string) => consts[group] || _)
    return [head, body]
}

export const render_ = (isOptionsPage: boolean, showNames: boolean | null | undefined
      ): NonNullable<CmdOptions[kFgCmd.showHelpDialog]["h"]> => {
    i18n_ = helpDialogData_![1] as typeof i18n_
    if (!html_ || helpDialogData_![0]) {
      html_ = parseHTML(helpDialogData_![0]!)
      helpDialogData_![0] = ""
    }
    const commandToKeys = new Map<string, [string, CommandsNS.Item][]>(), hideUnbound = !isOptionsPage
    showNames = isOptionsPage || !!showNames
    keyToCommandMap_.forEach((registry, key): void => {
      if ((<RegExpOne> /^<v-.\w*>/).test(key)) { return }
      let rawCommand = registry.command_
      if (registry.alias_ === kBgCmd.runKey && registry.background_) {
        inlineRunKey_(registry)
        rawCommand = registry.command_
      }
      const command = normalizeCmdName_(rawCommand)
      let keys = commandToKeys.get(command)
      keys ? keys.push([key, registry]) : commandToKeys.set(command, [[key, registry]])
    })
    const title2 = isOptionsPage ? " " + i18n_.get("cmdList") : ""
    const result = BgUtils_.safer_<Dict<string>>({
      title2: title2 && (title2.includes(" ", 1) ? title2 : title2.trimLeft()),
      name2: " - " + (extTrans_("name") as string).split(" - ")[1],
      tip: showNames && i18n_.get("tipClickToCopy") || "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    });
    const div = html_[1].replace(<RegExpG & RegExpSearchable<1>> /\{\{(\w+)}}/g
        , (_, group: string) => result[group] ?? renderGroup(group, commandToKeys, hideUnbound, showNames!))
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
    : T extends "showHUD" | "showHud" ? "showTip" : T extends "wait" ? "blank"
    : T
type NormalizedNames = _NormalizedNames2<_NormalizedNames1<kCName>>

export const normalizeCmdName_ = (command: kCName): NormalizedNames => {
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
        command = "nextTab";
      } else if (command === "newTab") {
        command = "createTab"
      } else if (command === "closeSomeOtherTabs") {
        command = "closeOtherTabs"
      } else if (command === "simBackspace") {
        command = "simulateBackspace"
      } else if (command === "showHUD" || command === "showHud") {
        command = "showTip"
      } else if (command === "wait") {
        command = "blank"
      }
      return command
}

const renderGroup = (group: string, commandToKeys: Map<string, [string, CommandsNS.Item][]>
      , hideUnbound: boolean, showNames: boolean): string => {
    const cmdParams = i18n_.get("cmdParams") || " (use *)"
    let html = "";
    const cmdList = commandGroups_[group as keyof typeof commandGroups_]
    for (let i = 0; i < cmdList.length; i++) {
      const command = cmdList[i] as Exclude<typeof cmdList[0], BOOL | `$${string}`>
      let keys = commandToKeys.get(command)
      if (hideUnbound && !keys) { continue; }
      const isAdvanced = i < cmdList.length - 1 && cmdList[i + 1] === 1;
      isAdvanced && i++
      const _next = i < cmdList.length - 1 ? cmdList[i + 1] as Exclude<typeof cmdList[2], BOOL> : "a"
      const params = _next[0] === "$" ? (i++, _next.slice(1)) : ""
      let keyLen = -2, bindings = "", description = descriptions_.get(command)
      if (!description) {
        description = [i18n_.get(command as NormalizedNames)! // lgtm [js/incomplete-sanitization]
              .replace("<", "&lt;").replace(">", "&gt;"), // lgtm [js/incomplete-sanitization]
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
        ]: readonly (NoAliasInCNames<kCName> | 1 | `$${string}`)[]
} = {
  pageNavigation: [
    "LinkHints.activate"
    , "$button=\"\"/right, touch=false/true/\"auto\""
    , "LinkHints.activateOpenInNewTab"
    , "LinkHints.activateOpenInNewForegroundTab"
    , "LinkHints.activateWithQueue"
    , "scrollDown", "$keepHover=true|false|auto|never"
    , "scrollUp", "$keepHover=true|false|auto|never"
    , "scrollLeft"
    , "scrollRight"
    , "scrollToTop"
    , "scrollToBottom"
    , "scrollToLeft", 1
    , "scrollToRight", 1
    , "scrollPageDown"
    , "scrollPageUp"
    , "scrollPxDown", 1
    , "scrollPxUp", 1
    , "scrollPxLeft", 1
    , "scrollPxRight", 1
    , "scrollFullPageDown"
    , "scrollFullPageUp"
    , "scrollSelect", 1, "$dir=down|up, position=\"\"|begin|end"
    , "reload", "$hard"
    , "reloadTab"
    , "reloadGivenTab", 1, "$hard"
    , "zoom", "$in, out, reset"
    , "zoomIn", 1
    , "zoomOut", 1
    , "zoomReset", 1
    , "toggleUrl", 1
    , "toggleViewSource", 1
    , "copyCurrentUrl", "$type=url/title/frame, decoded"
    , "copyCurrentTitle"
    , "switchFocus", "$flash, select=\"\"/all/all-line/start/end"
    , "focusInput", "$keep, select=\"\"/all/all-line/start/end"
    , "LinkHints.activateCopyLinkUrl"
    , "LinkHints.activateCopyLinkText", "$join:boolean/string"
    , "openCopiedUrlInCurrentTab"
    , "openCopiedUrlInNewTab"
    , "goUp", "$trailingSlash=null/true/false"
    , "goToRoot"
    , "LinkHints.activateCopyImage", 1, "$richText=safe"
    , "LinkHints.activateDownloadImage", 1
    , "LinkHints.activateOpenImage", 1, "$auto=true"
    , "LinkHints.activateDownloadLink", 1
    , "LinkHints.activateOpenIncognito", 1
    , "LinkHints.activateOpenUrl", 1
    , "LinkHints.activateFocus"
    , "LinkHints.activateHover", 1, OnFirefox ? "$" : "$showUrl=true"
    , "LinkHints.activateLeave", 1
    , "LinkHints.unhoverLast", 1
    , "LinkHints.activateSearchLinkText"
    , "LinkHints.activateEdit"
    , "LinkHints.activateSelect", "$visual=true, caret, then:{}"
    , "LinkHints.click", "$direct=true|element|sel|focus|click|sel,focus,click"
    , "simulateBackspace"
    , "dispatchEvent", 1, "$key=\"key,keyCode,code\",init:{}"
    , "goNext", "$sed=true, patterns:string, rel:string, noRel, isNext"
    , "goPrevious"
    , "nextFrame"
    , "mainFrame"
    , "parentFrame"
    , "enterInsertMode", "$key:string, unhover, reset"
    , "enterVisualMode"
    , "enterVisualLineMode"
    , "Marks.activateCreate", "$swap"
    , "Marks.activate", "$prefix=true, swap, mapKey"
    , "Marks.clearLocal", 1
    , "Marks.clearGlobal", 1
    , "openUrl", "$url:string, urls:string[], reuse=newFg/current/newBg/reuse, incognito, window, position"
    , "focusOrLaunch", 1, "$url:string, prefix"
  ],
  vomnibarCommands: [
    "Vomnibar.activate", "$keyword=\"\", url:boolean/string"
    , "Vomnibar.activateInNewTab", "$keyword, url"
    , "Vomnibar.activateBookmarks"
    , "Vomnibar.activateBookmarksInNewTab"
    , "Vomnibar.activateHistory"
    , "Vomnibar.activateHistoryInNewTab"
    , "Vomnibar.activateTabs"
    , "Vomnibar.activateEditUrl", 1
    , "Vomnibar.activateEditUrlInNewTab", 1
    , "LinkHints.activateOpenVomnibar", "$url, newtab, then:{}"
    , "toggleVomnibarStyle", 1, "$style=dark, current"
  ],
  historyNavigation: [
    "goBack", "$reuse=current/newBg/newFg"
    , "goForward"
    , "reopenTab", 1
  ],
  findCommands: [
    "enterFindMode", "$last, selected=true"
    , "performFind"
    , "performBackwardsFind"
    , "performAnotherFind"
    , "clearFindHistory", 1
  ],
  tabManipulation: [
    "nextTab", "$blur"
    , "previousTab", "$blur"
    , "firstTab"
    , "lastTab"
    , "createTab"
    , "duplicateTab"
    , "removeTab", "$keepWindow=\"\"/always, mayClose, goto=\"\"/left/right/previous"
    , "removeRightTab", 1
    , "restoreTab"
    , "restoreGivenTab", 1
    , "discardTab", 1
    , "moveTabToNextWindow", 1, "$last, position, right=true, tabs"
    , "moveTabToNewWindow", 1, "$limited=null/true/false"
    , "moveTabToIncognito", 1
    , "joinTabs"
    , "sortTabs", "$sort=recency|createTime"
    , "togglePinTab"
    , "toggleMuteTab", "$all, other"
    , "visitPreviousTab", "$blur, acrossWindows, onlyActive"
    , "closeTabsOnLeft", 1, "$$count=0"
    , "closeTabsOnRight", 1, "$$count=0"
    , "closeOtherTabs", 1, "$filter=\"\"/url/url+hash/url+title"
    , "moveTabLeft", 1, "$group=true"
    , "moveTabRight", 1, "$group=true"
    , "toggleContentSetting", 1, "$type=images"
    , "enableContentSettingTemp", 1
    , "clearContentSettings", 1
    , "copyWindowInfo", 1, "$format=\"${title}: ${url}\", join:true/string, decoded"
    , "captureTab"
    , "toggleWindow", "$states=\"normal,maximized\""
  ],
  misc: [
    "showHelp"
    , "autoCopy", "$text: string, url, decoded"
    , "autoOpen"
    , "searchAs", "$copied=true, selected=true"
    , "searchInAnother", "$keyword, reuse=current/newFg/newBg/reuse"
    , "showTip", "$text:string"
    , "openBookmark", "$title, path"
    , "addBookmark", 1, "$folder:string"
    , "toggleStyle", 1, "$id/selector:string, css: string"
    , "toggleLinkHintCharacters", 1, "$value:string"
    , "editText", 1, "$run:string, dom=false"
    , "toggleSwitchTemp", 1, "$key:string, [value:any]"
    , "passNextKey", 1, "$expect:string, normal"
    , "debugBackground", 1
    , "reset", 1
    , "runKey", 1, "$expect:Envs, keys:KeySequence[]|string"
    , "sendToExtension", 1, "$id:string, data:any, raw"
    , "confirm", 1, "$ask:string, $then, $else"
    , "blank", 1
  ]
}

if (OnChrome) {
  (commandGroups_.misc as Writable<typeof commandGroups_.misc>).push("closeDownloadBar", 1)
  Build.MinCVer < BrowserVer.MinNoDownloadBubbleFlag && CurCVer_ < BrowserVer.MinNoDownloadBubbleFlag
      && (commandGroups_.misc as Writable<typeof commandGroups_.misc>).pop()
}

if (OnFirefox || OnChrome && IsEdg_) {
  (commandGroups_.tabManipulation as Writable<typeof commandGroups_.tabManipulation>).push("toggleReaderMode", 1)
}
