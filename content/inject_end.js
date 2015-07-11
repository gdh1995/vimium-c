"use strict";
Settings.RequestHandlers.regExt = function(request) {
  if (Settings.RequestHandlers.reg(request)) {
    return true;
  }
  var id = chrome.runtime.id;
  if (typeof id === "string" && id.length === 32) {
    MainPort.port.postMessage({
      handlerSettings: "ext",
      extId: id
    });
  }
};

DomUtils.isSandboxed = function () {
  var i = 0, node;
  if (window.onunload == null) {
    node = document.createElement('div');
    node.onclick = function() { ++i };
    node.click();
    if (i === 0) {
      DomUtils.isSandboxed = function() { return true; }
      return true;
    }
  }
  DomUtils.isSandboxed = function() { return false; }
  return false;
};

DomUtils.DocumentReady(function() {
  if (Settings.RequestHandlers.regExt()) {
    return;
  }
  var ELs = Settings.ELs;
  window.addEventListener("unload", ELs.onUnload);
  window.addEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  window.addEventListener("focus", ELs.onWndFocus = (function(event) {
    if (event.target == window) {
      this();
    }
  }).bind(MainPort.safePost.bind(MainPort, ELs.focusMsg, null
  , setTimeout.bind(null, function() {
      if (MainPort && !MainPort.port) {
        Settings.ELs.destroy();
      }
    }, 50) //
  )));
});

if (chrome.runtime.onMessageExternal) {
  Settings.ELs.onMessage = (function(request, sender) {
    if (sender.id === "hfjbmagddngcpeloejdejnfgbamkjaeg") {
      request = request["vimium++"];
      if (request && (request.tabId ? request.tabId === Settings.ELs.focusMsg.tabId : true)) {
        this(request.request);
      }
    }
  }).bind(Settings.ELs.onMessage);
  chrome.runtime.onMessageExternal.addListener(Settings.ELs.onMessage);
  VimiumInjector.alive = 1;
} else {
  Settings.ELs.onMessage = null;
  VimiumInjector.alive = 0.5;
  console.log("%cVimium++ %c#" + Settings.ELs.focusMsg.frameId
    + "%c: injected %cpartly%c into %c" + chrome.runtime.id
    , "color: red;", "color: blue;", "color: auto;"
    , "color: red;", "color: auto;", "color: blue;");
}

Settings.onDestroy.injected = function() {
  window.removeEventListener("unload", this.onUnload);
  window.removeEventListener("focus", this.onWndFocus);
  window.removeEventListener("hashchange", Settings.RequestHandlers.checkIfEnabled);
  try {
    this.onMessage && chrome.runtime.onMessageExternal.removeListener(this.onMessage);
  } catch (e) {}
  Settings.RequestHandlers = Settings.ELs = null;
  var injector = VimiumInjector;
  injector.alive = 0;
  injector.oldFrameId = this.focusMsg.frameId;
  injector.destroy = null;
  injector.execute = null;
};

VimiumInjector.destroy = Settings.ELs.destroy.bind(Settings.ELs);
VimiumInjector.execute = function(command, count, options) {
  if (!command || typeof command !== "string") { return -1; }
  typeof options === "object" || (options = null);
  count = count > 1 ? (count | 0) : 1;
  if (! (command.split('.', 1)[0] in Settings.Commands)) {
    try {
      options = JSON.parse(JSON.stringify(options));
    } catch (e) {
      return -2;
    }
    chrome.runtime.sendMessage("hfjbmagddngcpeloejdejnfgbamkjaeg", {
      handler: "command",
      command: command,
      count: count,
      options: options
    });
    return 0;
  }
  if (MainPort.safePost({ handler: "esc" })) {
    return -127;
  }
  Settings.RequestHandlers.refreshKeyQueue({ currentFirst: null });
  try {
    MainPort.Listener({
      name: "execute",
      command: command,
      count: count,
      options: options || {}
    });
    return 1;
  } catch (e) {
    return -2;
  }
};
