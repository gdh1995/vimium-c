"use strict";
// Run from the repository root: node --test tests/unit/media-watcher.js
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const queries = ["(prefers-reduced-motion: reduce)", "(prefers-color-scheme: dark)"];
const source = readFileSync(path.join(__dirname, "../../background/ui_css.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 }
}).outputText;

function loadWatcher({ firefox = true, mv3 = true } = {}) {
  const values = new Map(queries.map(query => [query, false]));
  const calls = { media: [], tee: [], broadcasts: [] };
  const store = {
    OnFirefox: firefox, OnChrome: !firefox, OnEdge: false, CurCVer_: 120,
    settingsCache_: { autoDarkMode: 2, autoReduceMotion: 2 }, updateHooks_: {},
    contentPayload_: { m: false, d: false }, omniPayload_: { t: "" }, lastVisitTabTime_: 0,
    runOnTee_: (task, args) => {
      calls.tee.push({ task, args: Array.from(args) });
      return Promise.resolve(Array.from(args, query => !!query && values.get(query)));
    }
  };
  const modules = {
    "./store": store,
    "./utils": { spacesRe_: /\s+/g },
    "./browser": { set_getFindCSS_cr_: () => {} },
    "./settings": {
      ready_: { then: () => {} },
      updatePayload_: (_key, value) => value,
      broadcast_: value => calls.broadcasts.push(value),
      broadcastOmniConf_: () => {}
    },
    "./ports": {}
  };
  const context = {
    exports: {}, require: name => {
      assert.ok(name in modules, "Unexpected module: " + name);
      return modules[name];
    },
    Build: { MV3: mv3, MinFFVer: 101, MinCVer: 109, NDEBUG: true },
    BrowserVer: { MinOffscreenAPIs: 109 },
    FirefoxBrowserVer: { MinMediaQueryListenersWorkInBg: 64 },
    MediaNS: { Watcher: { InvalidMedia: 0, WaitToTest: 1, NotWatching: 2 } },
    kTeeTask: { updateMedia: 10 },
    kBgReq: { settingsUpdate: 6 },
    performance: { now: () => 0 },
    setInterval: () => 1, clearInterval: () => {}, setTimeout: () => 1
  };
  // Chromium MV3 has no DOM API: accidentally using matchMedia must fail there.
  if (firefox || !mv3) {
    context.matchMedia = query => {
      calls.media.push(query);
      return { media: query, matches: values.get(query), onchange: null };
    };
  }
  vm.runInNewContext(compiled, context, { filename: "background/ui_css.js" });
  const watcher = context.exports.MediaWatcher_;
  watcher.watchers_ = queries.map(media => ({ media, matches: false }));
  return { watcher, values, calls, store };
}

test("Firefox MV3 checks both preferences without invoking a helper window", async () => {
  const { watcher, values, calls, store } = loadWatcher();
  values.set(queries[0], true);
  values.set(queries[1], true);
  watcher.RefreshAll_();
  await Promise.resolve();
  assert.equal(calls.tee.length, 0);
  assert.deepEqual(calls.media, queries);
  assert.equal(watcher.get_(0), true);
  assert.equal(watcher.get_(1), true);
  assert.equal(store.contentPayload_.m, true);
  assert.equal(store.contentPayload_.d, true);
});

test("Firefox MV3 continues to apply preference changes in both directions", async () => {
  const { watcher, values, calls, store } = loadWatcher();
  values.set(queries[0], true);
  watcher.RefreshAll_();
  await Promise.resolve();
  values.set(queries[0], false);
  values.set(queries[1], true);
  watcher.RefreshAll_();
  await Promise.resolve();
  assert.equal(watcher.get_(0), false);
  assert.equal(watcher.get_(1), true);
  assert.equal(store.contentPayload_.m, false);
  assert.equal(store.contentPayload_.d, true);
  assert.equal(calls.tee.length, 0);
  assert.ok(calls.broadcasts.length > 0);
});

test("Firefox MV3 skips preferences that are not following the system", async () => {
  const { watcher, calls } = loadWatcher();
  watcher.watchers_[0] = 2;
  watcher.RefreshAll_();
  await Promise.resolve();
  assert.deepEqual(calls.media, [queries[1]]);
  assert.equal(watcher.get_(0), null);
  assert.equal(calls.tee.length, 0);
});

test("no active watchers cause no media queries or helper tasks", async () => {
  const { watcher, calls } = loadWatcher();
  watcher.watchers_ = [2, 2];
  watcher.RefreshAll_();
  await Promise.resolve();
  assert.equal(calls.media.length, 0);
  assert.equal(calls.tee.length, 0);
});

test("Chromium MV3 retains the asynchronous offscreen helper path", async () => {
  const { watcher, values, calls } = loadWatcher({ firefox: false });
  values.set(queries[1], true);
  watcher.RefreshAll_();
  await Promise.resolve();
  assert.deepEqual(calls.tee, [{ task: 10, args: queries }]);
  assert.equal(calls.media.length, 0);
  assert.equal(watcher.get_(1), true);
});

test("Firefox MV2 still reads its existing live media-query watchers", () => {
  const { watcher, calls, store } = loadWatcher({ mv3: false });
  watcher.watchers_[0].matches = true;
  watcher.RefreshAll_();
  assert.equal(store.contentPayload_.m, true);
  assert.equal(calls.tee.length, 0);
});
