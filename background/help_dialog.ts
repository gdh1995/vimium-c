var HelpDialog = {
  inited_: false,
  styles_: Settings.CONST.ChromeVersion === BrowserVer.CSS$Contain$BreaksHelpDialogSize ? "contain: none;"
    // here repeats the logic in frontend.ts, just for easier understanding
    : Settings.CONST.ChromeVersion < BrowserVer.MinFixedCSS$All$MayMistakenlyResetFixedPosition
      && Settings.CONST.ChromeVersion >= BrowserVer.MinCSS$All$MayMistakenlyResetFixedPosition ? "position: fixed;"
    : "",
  render_: (function(this: void, request: FgReq[kFgReq.initHelp]): string {
    if (!HelpDialog.inited_) {
      if (Settings.CONST.StyleCacheId_.split(',', 2)[1].indexOf("s") < 0) {
        let template = Settings.cache.helpDialog as string, styleEnd = template.indexOf("</style>");
        template = template.substring(0, styleEnd).replace(<RegExpG> /[#.][A-Z]/g, "#VimiumUI $&"
          ).replace("HelpAdvanced #VimiumUI .HelpAdv", "HelpAdvanced .HelpAdv"
          ) + template.substring(styleEnd);
        Settings.set("helpDialog", template);
      }
      HelpDialog.inited_ = true;
    }
    Object.setPrototypeOf(request, null);
    const commandToKeys = Object.create<string[]>(null), ref = CommandsData_.keyToCommandRegistry_,
          hideUnbound = !request.unbound, showNames = !!request.names;
    for (const key in ref) {
      let command = (ref[key] as CommandsNS.Item).command;
      if (command.endsWith(".activateMode")) {
        command = command.substring(0, command.length - 4);
      } else if (command.indexOf("EditUrl") > 0) {
        command = command.replace("EditUrl", "Url");
      } else if (command === "quickNext") {
        command = "nextTab";
      }
      (commandToKeys[command] || (commandToKeys[command] = [])).push(key);
    }
    const result = Object.setPrototypeOf({
      version: Settings.CONST.VerName,
      styles: HelpDialog.styles_,
      title: request.title || "Help",
      tip: showNames ? "Tip: click command names to copy them to the clipboard." : "",
      lbPad: showNames ? '\n\t\t<tr><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    }, null) as SafeDict<string>;
    return (<string>Settings.cache.helpDialog).replace(<RegExpSearchable<1>>/\{\{(\w+)}}/g, function(_, group: string) {
      let s = result[group];
      return s != null ? s
        : HelpDialog.groupHtml_(group, commandToKeys, hideUnbound, showNames);
    });
  }),
  groupHtml_: (function(this: {}, group: string, commandToKeys: SafeDict<string[]>
      , hideUnbound: boolean, showNames: boolean): string {
    const _ref = (this as typeof HelpDialog).commandGroups_[group], renderItem = (this as typeof HelpDialog).commandHtml_
      , availableCommands = CommandsData_.availableCommands_ as Readonly<EnsuredSafeDict<CommandsNS.Description>>;
    let keys: string[] | undefined, html = "";
    for (let _i = 0, _len = _ref.length; _i < _len; _i++) {
      const command = _ref[_i];
      keys = commandToKeys[command];
      if (hideUnbound && !keys) { continue; }
      let klen = -2, bindings = '';
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">';
        for (const key of keys) {
          if (klen >= 0) {
            bindings += '</span>, <span class="HelpKey">';
          }
          bindings += Utils.escapeText_(key);
          klen += key.length + 2;
        }
        bindings += '</span>\n\t';
      }
      const isAdvanced = command in (this as typeof HelpDialog).advancedCommands_
        , description = availableCommands[command][0];
      if (klen <= 12) {
        html += renderItem(isAdvanced, bindings, description, showNames ? command: "");
      } else {
        html += renderItem(isAdvanced, bindings, "", "");
        html += renderItem(isAdvanced, "", description, showNames ? command : "");
      }
    }
    return html;
  }),
  commandHtml_: (function(this: void, isAdvanced: boolean, bindings: string
      , description: string, command: string): string {
    let html = isAdvanced ? '<tr class="HelpAdv">\n\t' : "<tr>\n\t";
    if (description) {
      html += '<td class="HelpTd HelpKeys">';
      html += bindings;
      html += '</td>\n\t<td class="HelpTd HelpCommandInfo">';
      html += description;
      if (command) {
        html += '\n\t\t<span class="HelpCommandName" role="button">(';
        html += command;
        html += ")</span>\n\t";
      }
    } else {
      html += '<td class="HelpTd HelpKeys HelpLongKeys" colspan="2">';
      html += bindings;
    }
    return html + "</td>\n</tr>\n";
  }),
  commandGroups_: { __proto__: null as never,
    pageNavigation: ["scrollDown", "scrollUp", "scrollLeft", "scrollRight", "scrollToTop"
      , "scrollToBottom", "scrollToLeft", "scrollToRight", "scrollPageDown", "scrollPageUp"
      , "scrollPxDown", "scrollPxUp", "scrollPxLeft", "scrollPxRight"
      , "scrollFullPageDown", "scrollFullPageUp", "reload", "reloadTab", "reloadGivenTab"
      , "toggleViewSource"
      , "copyCurrentUrl", "copyCurrentTitle", "switchFocus", "simBackspace"
      , "LinkHints.activateModeToCopyLinkUrl", "LinkHints.activateModeToCopyLinkText"
      , "openCopiedUrlInCurrentTab", "openCopiedUrlInNewTab", "goUp", "goToRoot"
      , "focusInput", "LinkHints.activate", "LinkHints.activateModeToOpenInNewTab"
      , "LinkHints.activateModeToOpenInNewForegroundTab", "LinkHints.activateModeWithQueue"
      , "LinkHints.activateModeToDownloadImage", "LinkHints.activateModeToOpenImage"
      , "LinkHints.activateModeToDownloadLink", "LinkHints.activateModeToOpenIncognito"
      , "LinkHints.activateModeToHover", "LinkHints.activateModeToLeave", "LinkHints.unhoverLast"
      , "LinkHints.activateModeToSearchLinkText", "LinkHints.activateModeToEdit"
      , "goPrevious", "goNext", "nextFrame", "mainFrame", "parentFrame"
      , "enterInsertMode", "enterVisualMode", "enterVisualLineMode"
      , "Marks.activateCreateMode", "Marks.activate"
      , "Marks.clearLocal", "Marks.clearGlobal", "openUrl", "focusOrLaunch"
      ],
    vomnibarCommands: ["Vomnibar.activate", "Vomnibar.activateInNewTab"
      , "Vomnibar.activateBookmarks", "Vomnibar.activateBookmarksInNewTab", "Vomnibar.activateHistory"
      , "Vomnibar.activateHistoryInNewTab", "Vomnibar.activateTabSelection"
      , "Vomnibar.activateUrl", "Vomnibar.activateUrlInNewTab"
      , "LinkHints.activateModeToOpenVomnibar"],
    historyNavigation: ["goBack", "goForward", "reopenTab"],
    findCommands: ["enterFindMode", "performFind", "performBackwardsFind", "clearFindHistory"],
    tabManipulation: ["nextTab", "previousTab", "firstTab", "lastTab", "createTab", "duplicateTab"
      , "removeTab", "removeRightTab", "restoreTab", "restoreGivenTab", "moveTabToNextWindow"
      , "moveTabToNewWindow", "moveTabToIncognito", "togglePinTab", "toggleMuteTab", "visitPreviousTab"
      , "closeTabsOnLeft", "closeTabsOnRight", "closeOtherTabs", "moveTabLeft", "moveTabRight"
      , "enableCSTemp", "toggleCS", "clearCS"],
    misc: ["showHelp", "autoCopy", "autoOpen", "searchAs", "searchInAnother", "toggleLinkHintCharacters"
      , "toggleSwitchTemp", "passNextKey", "debugBackground", "blank"]
  } as Readonly<EnsuredSafeDict<ReadonlyArray<string>>>,
  advancedCommands_: { __proto__: null as never,
    toggleViewSource: 1, clearFindHistory: 1
    , scrollToLeft: 1, scrollToRight: 1, moveTabToNextWindow: 1
    , moveTabToNewWindow: 1, moveTabToIncognito: 1, reloadGivenTab: 1, focusOrLaunch: 1
    , goUp: 1, goToRoot: 1, focusInput: 1, "LinkHints.activateModeWithQueue": 1, enableCSTemp: 1
    , toggleCS: 1, clearCS: 1, "LinkHints.activateModeToDownloadImage": 1, reopenTab: 1
    , "LinkHints.activateModeToOpenImage": 1, removeRightTab: 1
    , "LinkHints.activateModeToDownloadLink": 1, restoreGivenTab: 1
    , "LinkHints.activateModeToOpenIncognito": 1, passNextKey: 1
    , goNext: 1, goPrevious: 1, "Marks.clearLocal": 1, "Marks.clearGlobal": 1
    , moveTabLeft: 1, moveTabRight: 1, closeTabsOnLeft: 1, closeTabsOnRight: 1, closeOtherTabs: 1
    , scrollPxDown: 1, scrollPxUp: 1, scrollPxLeft: 1, scrollPxRight: 1, debugBackground: 1, blank: 1
    , "LinkHints.activateModeToHover": 1, "LinkHints.unhoverLast": 1
    , toggleLinkHintCharacters: 1, toggleSwitchTemp: 1, "LinkHints.activateModeToLeave": 1
    , "Vomnibar.activateUrl": 1, "Vomnibar.activateUrlInNewTab": 1
  } as SafeEnum
};

interface BaseHelpDialog {
  render_: typeof HelpDialog.render_;
}
