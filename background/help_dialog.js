"use strict";
var HelpDialog = {
  render: function(request) {
    var command, commandsToKey, key, ref = Commands.keyToCommandRegistry, result;
    Object.setPrototypeOf(request, null);
    commandsToKey = Object.create(null);
    for (key in ref) {
      command = ref[key].command;
      (commandsToKey[command] || (commandsToKey[command] = [])).push(key);
    }
    var showUnbound = !!request.unbound, showNames = !!request.names;
    result = Object.setPrototypeOf({
      version: Settings.CONST.CurrentVersion,
      title: request.title || "Help",
      tip: showNames ? "Tip: click command names to copy them to the clipboard." : "",
      lbPad: showNames ? '\n\t\t<tr class="HelpTr"><td class="HelpTd TdBottom">&#160;</td></tr>' : ""
    }, null);
    return Settings.cache.helpDialog.replace(/\{\{(\w+)}}/g, function(_, group) {
      var s = result[group];
      return s != null ? s
        : HelpDialog.groupHtml(group, commandsToKey, Commands.availableCommands, showUnbound, showNames);
    });
  },
  groupHtml: function(group, commandsToKey, availableCommands, showUnbound, showNames) {
    var bindings, command, html, isAdvanced, _i, _len, _ref, keys, description, push;
    html = [];
    _ref = this.commandGroups[group];
    showNames = showNames || "";
    Utils.escapeText("");
    push = this.commandHtml;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      command = _ref[_i];
      if (!(keys = commandsToKey[command]) && !showUnbound) { continue; }
      if (keys && keys.length > 0) {
        bindings = '\n\t\t<span class="HelpKey">' + keys.map(Utils.escapeText).join('</span>, <span class="HelpKey">') + "</span>\n\t";
      } else {
        bindings = "";
      }
      isAdvanced = command in this.advancedCommands;
      description = availableCommands[command][0];
      if (!bindings || keys.join(", ").length <= 12) {
        push(html, isAdvanced, bindings, description, showNames && command);
      } else {
        push(html, isAdvanced, bindings, "", "");
        push(html, isAdvanced, "", description, showNames && command);
      }
    }
    return html.join("");
  },
  commandHtml: function(html, isAdvanced, bindings, description, command) {
    html.push('<tr class="HelpTr', isAdvanced ? " HelpAdv" : "", '">\n\t');
    if (description) {
      html.push('<td class="HelpTd HelpKeys">'
        , bindings, '</td>\n\t<td class="HelpTd HelpCommandInfo">'
        , description);
      if (command) {
        html.push('\n\t\t<span class="HelpCommandName" role="button">('
          , command, ")</span>\n\t");
      }
    } else {
      html.push('<td class="HelpTd HelpKeys HelpLongKeys" colspan="2">'
        , bindings);
    }
    html.push("</td>\n</tr>\n");
  },
  commandGroups: {
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
      , "Vomnibar.activateEditUrl", "Vomnibar.activateEditUrlInNewTab"
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
  },
  advancedCommands: {
    __proto__: null
    , toggleViewSource: 1, clearFindHistory: 1
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
    , "Vomnibar.activateEditUrl": 1, "Vomnibar.activateEditUrlInNewTab": 1
  }
};
