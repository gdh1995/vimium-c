/// <reference path="./typings/base/chrome.d.ts" />
"use strict";
var fs = require("fs");
var gulp = require("gulp");
var logger = require("fancy-log");
var newer = require("gulp-newer");
var osPath = require("path");
var {
  getGitCommit, readJSON, writeJSON, readFile, patchTSNamespace, logFileSize, addMetaData,
  patchExtendClick: _patchExtendClick, BrowserType, fill_global_defs, replace_global_defs,
  loadTerserConfig: _loadTerserConfig, skip_declaring_known_globals,
} = require("./scripts/dependencies");
var gulpUtils = require("./scripts/gulp-utils")
var { print, ToBuffer, ToString, cleanByPath, minifyJSFiles, set_minifier_env, destCached,
      safeJSONParse, gulpMap, getGulpTerser } = gulpUtils

var DEST, willListFiles, willListEmittedFiles, JSDEST;
var locally = false;
var debugging = process.env.DEBUG === "1";
var gTypescript = null;
var buildConfig = null;
var doesMinifyLocalFiles = process.env.MINIFY_LOCAL !== "0";
var minifyDistPasses = +process.env.MINIFY_DIST_PASSES || 0;
var maxDistSequences = +process.env.MAX_DIST_SEQUENCES || 0;
var gNoComments = process.env.NO_COMMENT === "1";
var disableErrors = process.env.SHOW_ERRORS !== "1" && process.env.SHOW_ERRORS === "0";
var ignoreHeaderChanges = process.env.IGNORE_HEADER_CHANGES !== "0";
var onlyTestSize = false;
/** @type {chrome.runtime.Manifest} */
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json");
var jsmin_status = [false, false, false, false, false];
var buildOptionCache = Object.create(null);
var outputES6 = false;
const MaxLineLen = 120, MaxLineLen2 = 480
gulpUtils.set_dest(DEST, JSDEST)
set_minifier_env(willListEmittedFiles, /[\\\/](env|define)\./, 1, gNoComments, false)

createBuildConfigCache();
var has_polyfill = !!(getBuildItem("BTypes") & BrowserType.Chrome)
    && getBuildItem("MinCVer") < 43 /* MinSafe$String$$StartsWith */;
const POLYFILL_FILE = "lib/polyfill.ts"
const LOCALES_EN = "_locales/en/messages.json"
const JSON_TO_JS = ["i18n/*/options.json", "i18n/*/action.json"]

var CompileTasks = {
  background: ["background/*.ts", "background/*.d.ts"],
  content: [["content/*.ts", "lib/*.ts", "!" + POLYFILL_FILE, "!lib/injector.ts", "!lib/simple_eval.ts"]
              .concat(getBuildItem("MV3") ? [] : ["!*/extend_click_vc.*"])
      , "lib/*.d.ts", {module: "distES6"}],
  front: [["front/*.ts", has_polyfill ? POLYFILL_FILE : "!" + POLYFILL_FILE
            , "lib/injector.ts", "lib/simple_eval.ts"], ["lib/base.omni.d.ts"], { inBatch: false }],
  vomnibar: [["front/vomnibar*.ts", "front/tee.ts"], ["lib/base.omni.d.ts"]],
  polyfill: [POLYFILL_FILE],
  options: [["pages/options*.ts", "pages/async_bg.ts"], ["background/index.d.ts", "lib/base.d.ts"], {module: "mayES6"}],
  show: [["pages/show.ts", "pages/async_bg.ts"], ["background/index.d.ts", "lib/base.d.ts"], {module: "mayES6"}],
  others: [ ["pages/*.ts"
              , "!pages/options*.ts", "!pages/show.ts", "!pages/async_bg.ts"]
            , [], { inBatch: false } ],
}

var Tasks = {
  "build/pages": ["build/options", "build/show", "build/others"],
  "static/minify-js": function() {
    const path = ["lib/math_parser*.js", "lib/viewer*.js"];
    getBuildItem("MV3") && path.push("background/worker.js")
    if (!getBuildItem("NDEBUG")) {
      return copyByPath(path);
    }
    return minifyJSFiles(path, ".", { base: "." });
  },
  "static/json": function() {
    const path = ["_locales/*/messages.json", "settings-template.json", "i18n/**/*.json", "!" + LOCALES_EN]
    if (getBuildItem("BTypes") === BrowserType.Firefox) {
      path.push("!_locales/zh_CN/**")
    }
    if (!getBuildItem("NDEBUG")) {
      return copyByPath(path);
    }
    return minifyJSFiles([...path, ...JSON_TO_JS.map(i => "!" + i)], ".", { base: ".", json: true })
  },
  "static/json2js": function(done) {
    return getBuildItem("NDEBUG") ? minifyJSFiles(JSON_TO_JS, ".", { base: ".", json: true, toJs: true }) : done()
  },
  "locales_en/json": function() {
    return !getBuildItem("NDEBUG") ? copyByPath(LOCALES_EN) : minifyJSFiles(LOCALES_EN, ".", { base: ".", json: true })
  },
  "png2bin": function(cb) {
    const p2b = require("./scripts/icons-to-blob");
    if (p2b.called) { return cb(); } p2b.called = true;
    p2b.setDestRoot(DEST);
    p2b.main(() => cb(), { print });
  },
  "minify-css": function() {
    const path = ["pages/*.css", "lib/*.css"];
    if (!getBuildItem("NDEBUG")) { return copyByPath(path) }
    return copyByPath(path, file => {
      const CleanCSS = require("clean-css")
      const clean_css = new CleanCSS({ level: { 1: { variableValueOptimizers: ["color", "urlWhiteSpace"]} } })
      ToBuffer(file, clean_css.minify(file.contents).styles)
    });
  },
  "minify-html": function() {
    const arr = ["front/*.html", "pages/*.html", "!*/vomnibar.html"];
    if (!getBuildItem("MV3")) { arr.push("!*/offscreen.html") }
    if (!getBuildItem("NDEBUG")) { return copyByPath(arr) }
    return copyByPath(arr, file => { ToBuffer(file, require("html-minifier").minify(ToString(file), {
      collapseWhitespace: true,
      minifyCSS: true,
    })) })
  },
  "static/minify": function(cb) {
    gulp.parallel("static/minify-js", "static/json", "static/json2js", "locales_en/json", "minify-css", "minify-html")(cb)
  },
  static: ["static/minify", function() {
    var arr = ["front/*", "pages/*", "icons/*", "lib/*"
      , "*.txt", "*.md", "![a-hj-z]*/**/*.json", "!**/*.bin"
      , "!**/*.min.*"
      , "!pages/*.css", "!front/*.html", "front/vomnibar.html", "!pages/*.html", "!REL*.md", "!README*.md"
      , "!PRIVACY*", "!lib/math_parser*.js", "!lib/viewer*"
      , "!**/*.log", "!**/*.psd", "!**/*.zip", "!**/*.tar", "!**/*.tgz", "!**/*.gz"
      , '!**/*.ts', "!**/*.js", "!**/tsconfig*.json"
      , "!test*", "!todo*"
    ];
    if (!+(process.env.BUILD_CopyManifest || "0") || fs.existsSync(DEST + "/manifest.json")) {
      arr.push("!**/manifest*.json");
    } else {
      arr.push("manifest.json");
    }
    var btypes = getBuildItem("BTypes");
    const has_wordsRe = btypes & BrowserType.Chrome && getBuildItem("MinCVer") <
                /* min(MinSelExtendForwardOnlySkipWhitespaces, MinEnsuredUnicodePropertyEscapesInRegExp) */ 59
        || btypes & BrowserType.Firefox && !getBuildItem("NativeWordMoveOnFirefox")
            && getBuildItem("MinFFVer") < /* FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp */ 78
    if (!has_wordsRe) {
      arr.push("!front/words.txt");
      cleanByPath("front/words.txt", DEST)
    }
    if (btypes & BrowserType.Chrome) {
      gulp.series("png2bin")();
    }
    return copyByPath(arr);
  }],

  "build/scripts": ["build/background", "build/content", "build/front"],
  "build/_clean_diff": function() {
    return cleanByPath([".build/**", "manifest.json", "*/vomnibar.html", "background/*.html", ".*.build"
        , ...JSON_TO_JS, "*/*.html", "*/*.css", "**/*.json", "**/*.js", "!helpers/*/*.js", ".snapshot.sh", LOCALES_EN
        , "*/offscreen.html"], DEST)
  },
  "build/_all": ["build/scripts", "build/pages"],
  "build/ts": function(cb) {
    var btypes = getBuildItem("BTypes");
    var curConfig = [btypes, getBuildItem("MinCVer"), compilerOptions.target
          , /** 4: */ gulpUtils.NeedCommitInfo && !onlyTestSize ? getBuildItem("Commit") : 0, getBuildItem("NDEBUG")]
    var configFile = btypes === BrowserType.Chrome ? "chrome"
          : btypes === BrowserType.Firefox ? "firefox" : "browser-" + btypes;
    if (btypes === BrowserType.Firefox) {
      curConfig[1] = getBuildItem("MinFFVer");
      curConfig.push(getBuildItem("FirefoxID"));
      curConfig.push(getBuildItem("NativeWordMoveOnFirefox"));
    } else {
      curConfig.push(getBuildItem("EdgeC"));
    }
    curConfig.push(getBuildItem("Mangle"))
    curConfig.push(getBuildItem("Inline"))
    curConfig.push(getBuildItem("OS"))
    curConfig.push(getBuildItem("MV3"));
    curConfig = JSON.stringify(curConfig);
    configFile = osPath.join(JSDEST, "." + configFile + ".build");
    var needClean = true;
    try {
      var oldConfig = readJSON(configFile);
      if (onlyTestSize) { oldConfig[3] = 0; }
      oldConfig = JSON.stringify(oldConfig);
      needClean = oldConfig !== curConfig;
    } catch (e) {}
    var hasLocal2 = false;
    if (fs.existsSync(osPath.join(DEST, "lib/dom_utils.js"))) {
      hasLocal2 = true;
    }
    if (needClean || hasLocal2) {
      print("found diff:", oldConfig || (hasLocal2 ? "(local2)" : "(unknown)"), "!=", curConfig);
      gulp.series("build/_clean_diff")(function() {
        if (!fs.existsSync(JSDEST)) {
          fs.mkdirSync(JSDEST, {recursive: true});
        }
        fs.writeFileSync(configFile, curConfig);
        (onlyTestSize ? gulp.series("build/content", "min/content") : gulp.series("build/_all"))(cb);
      });
    } else {
      (onlyTestSize ? gulp.series("build/content", "min/content") : gulp.series("build/_all"))(cb);
    }
  },

  "min/content": ["locales_en/json", function(cb) {
    var cs = manifest.content_scripts[0], sources = cs.js;
    if (sources.length <= 1 || jsmin_status[0]) {
      jsmin_status[0] = true;
      return cb();
    }
    cs.js = ["content/vimium-c.js"];
    var exArgs = { nameCache: {}, aggressiveMangle: true };
    var rest = ["content/*.js"];
    for (var arr = sources, i = 0, len = arr.length; i < len; i++) { rest.push("!" + arr[i]); }
    var maps = [
      [sources.slice(0), cs.js[0], { rollup: true }], [rest, "."]
    ];
    if (onlyTestSize) { debugging = 1; maps.length = 1 }
    gulpUtils.checkJSAndMinifyAll(0, maps, "min/content", exArgs, (err) => {
      if (!err) {
        logFileSize(DEST + "/" + cs.js[0], logger);
      }
      cb(err);
    }, jsmin_status, debugging, false);
  }],
  "min/bg": function(cb) {
    if (jsmin_status[1]) {
      return cb();
    }
    gulpUtils.checkJSAndMinifyAll(1, [ [(manifest.background.scripts || []).concat(["background/*.js"]), "."] ]
      , "min/bg", { nameCache: {}, format: { max_line_len: MaxLineLen } }, cb, jsmin_status, debugging)
  },
  "min/pages": function(cb) {
    if (jsmin_status[2]) {
      return cb();
    }
    gulpUtils.checkJSAndMinifyAll(2, [ [["pages/options*.js", "pages/show*", "pages/async_bg*"], "."] ]
        , "min/pages", { nameCache: {} }, cb, jsmin_status, debugging)
  },
  "min/omni": function(cb) {
    if (jsmin_status[3]) { return cb(); }
    gulpUtils.checkJSAndMinifyAll(3, [ [["front/vomnibar*.js"], "."] ]
        , "min/omni", { nameCache: {} }, cb, jsmin_status, debugging)
  },
  "min/misc": function(cb) {
      if (jsmin_status[4]) { return cb() }
      var oriManifest = readJSON("manifest.json", true);
      var res = ["front/*.js", "lib/*.js", "pages/*.js", "!front/vomnibar*"
          , "!pages/options*", "!pages/show*", "!pages/async_bg*"];
      has_polyfill || res.push("!" + POLYFILL_FILE.replace(".ts", ".*"));
      for (var arr = oriManifest.content_scripts[0].js, i = 0, len = arr.length; i < len; i++) {
        if (arr[i].lastIndexOf("lib/", 0) === 0) {
          res.push("!" + arr[i]);
        }
      }
      minifyJSFiles(res, ".").on("end", () => { jsmin_status[4] = true; cb() })
  },
  "min/others": ["min/pages", "min/omni", "min/misc"],
  _manifest: function(cb) {
    const mv3 = !!getBuildItem("MV3")
    const manifest_v2 = readJSON("./manifest.v2.json")
    var minVer = getBuildItem("MinCVer"), browser = getBuildItem("BTypes");
    minVer = minVer ? (minVer | 0) : 0;
      if (mv3 && browser === BrowserType.Firefox) { manifest.background = manifest_v2.background }
      for (const key of Object.keys(manifest_v2)) {
          const val = manifest_v2[key]
          if (mv3) { /* empty */ }
          else if (key.endsWith("[]") && val instanceof Array) {
            const old = manifest[key.slice(0, -2)]
            for (const item of val) {
              if (item[0] === "-") {
                let found = old.indexOf(item.slice(1)); found >= 0 && old.splice(found, 1)
              } else {
                old.includes(item) || old.push(item)
              }
            }
          } else {
            val != null ? (manifest[key] = val) : delete manifest[key]
          }
      }
      for (const key of ["content_scripts"]) {
          manifest[key].splice(1, manifest[key].length - 1)
          if (!mv3) {
            for (const item of manifest[key]) { delete item.match_origin_as_fallback }
          } else if (browser === BrowserType.Chrome && minVer >= /* BrowserVer.MinCSAcceptWorldInManifest */ 111) {
            const cs = structuredClone(manifest[key][0])
            cs.js = ["content/extend_click_vc.js"]
            cs.world = "MAIN"
            manifest[key].push(cs)
          }
      }
    if (!(browser & BrowserType.Chrome)) {
      delete manifest.minimum_chrome_version;
      delete manifest.key;
      delete manifest.update_url;
    } else if (minVer && minVer < 999) {
      manifest.minimum_chrome_version = "" + (minVer | 0);
    }
    if ((browser & BrowserType.Firefox
          || !mv3 && browser & BrowserType.Chrome && minVer < /* BrowserVer.MinZeroAsPrefixInVersionNumber */ 42)
        && manifest.version.includes(".0")) {
      browser === BrowserType.Firefox || manifest.version_name || (manifest.version_name = manifest.version)
      manifest.version = manifest.version.replace(/\.0+/g, ".").replace(/\.+$/, "")
    }
    if (browser & BrowserType.Edge) {
      manifest.name = "Vimium C";
    }
    if (getBuildItem("EdgeC")) {
      delete manifest.key;
      delete manifest.update_url;
    }
    const permissions = manifest.permissions
    if (!(browser & BrowserType.Chrome)) {
      for (const i of "favicon offscreen tabGroups".split(" ")) {
        permissions.splice((permissions.indexOf(i) + 1 || permissions.length + 1) - 1, 1)
      }
      delete manifest.optional_host_permissions
    }
    let optional = manifest.optional_permissions
    if (browser === BrowserType.Firefox) {
      delete manifest.background.persistent;
      for (const i of manifest.web_accessible_resources || []) { delete i.use_dynamic_url }
      for (const i of manifest.content_scripts || []) { delete i.match_origin_as_fallback }
      mv3 && manifest.action && (manifest.action.default_area = "navbar")
    }
    if (optional && !(browser & BrowserType.Firefox)) {
      optional = optional.filter(i => { return i !== "cookies" })
    }
    if (browser === BrowserType.Chrome) {
      delete manifest.browser_specific_settings;
    } else {
      permissions.splice((permissions.indexOf("contentSettings") + 1 || permissions.length + 1) - 1, 1)
    }
    if (optional && !(browser & BrowserType.Chrome)) {
        optional = optional.filter(i => {
          return !i.includes("chrome:") && i !== "downloads.shelf" && i !== "contentSettings"
        })
    } else if (optional && minVer >= /* MinNoDownloadBubbleFlag */ 117) {
      optional = optional.filter(i => i !== "downloads.shelf")
    }
    if (!getBuildItem("OnBrowserNativePages")) {
      optional = optional.filter(i => { return !i.includes("chrome:") })
      let hosts = manifest.host_permissions
      hosts && (hosts = hosts.filter(i => { return !i.includes("chrome:") }),
          hosts.length ? manifest.host_permissions = hosts : delete manifest.host_permissions)
      hosts = manifest.optional_host_permissions
      hosts && (hosts = hosts.filter(i => { return !i.includes("chrome:") }),
          hosts.length ? manifest.optional_host_permissions = hosts : delete manifest.optional_host_permissions)
    }
    if (!(browser & BrowserType.Chrome) || browser !== BrowserType.Chrome && !locally || minVer < 35) {
      delete manifest.offline_enabled;
    }
    if (browser === BrowserType.Chrome) {
      if (minVer >= /** BrowserVer.MinOptionsUI */ 40) {
        delete manifest.options_page
      }
    }
    if (locally ? !(browser & BrowserType.Chrome) : browser !== BrowserType.Chrome) {
      if (!(browser & BrowserType.Edge)) {
        delete manifest.options_page;
      }
      if (browser === BrowserType.Safari) {
        manifest.options_ui && delete manifest.options_ui.open_in_tab
      }
      if (browser === BrowserType.Firefox) {
        delete manifest.version_name
      }
      for (const item of manifest.web_accessible_resources || []) {
        const matches = typeof item === "object" && item.matches || [], i = matches.indexOf("chrome-extension://*/*")
        if (i >= 0) { matches.splice(i, 1) }
      }
    }
    if (browser & BrowserType.Firefox) {
        var specific = manifest.browser_specific_settings || (manifest.browser_specific_settings = {});
        var gecko = specific.gecko || (specific.gecko = {})
        gecko.id = getBuildItem("FirefoxID")
        var ffVer = getBuildItem("MinFFVer")
        if (ffVer < 199 && ffVer >= 54) {
          gecko.strict_min_version = ffVer + ".0"
        } else {
          delete gecko.strict_min_version
        }
    }
    if (browser & BrowserType.Firefox) {
      locally && permissions.push("tabHide")
    }
    if (manifest.chrome_url_overrides && Object.keys(manifest.chrome_url_overrides) == 0) {
      delete manifest.chrome_url_overrides;
    }
    if (!optional && optional.length == 0) {
      delete manifest.optional_permissions
    } else {
      manifest.optional_permissions = optional
    }
    let newManifest = {};
    for (let key of Object.keys(manifest).sort()) { newManifest[key] = manifest[key]; }
    manifest = newManifest;
    var file = osPath.join(DEST, "manifest.json")
      , data = JSON.stringify(manifest, null, "  ");
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      var oldData = readFile(file);
      if (data === oldData) {
        if (willListEmittedFiles) {
          print("Skip " + file.replace(/\\/g, "/"))
        }
        return cb();
      }
    }
    fs.writeFile(file, data, cb);
    print("Save manifest file: " + file);
  },
  manifest: [["min/content", "min/bg"], "_manifest"],
  dist: [["build/ts"], ["static", "manifest", "min/others", function (done) {
    const rands = Object.setPrototypeOf(gulpUtils.getRandMap() || {}, null), names = Object.keys(rands)
    let cmd = "", isEdge = getBuildItem("EdgeC") == 1;
    Object.keys(process.env).filter(i => i.startsWith("BUILD_"))
        .filter(i => /^random|^commit/i.test(i.slice(6)))
        .forEach(key => { cmd += `${key}=${process.env[key]} ` })
    for (const key of names) { cmd += `BUILD_${key}=${rands[key]} ` }
    let shortCommit = gulpUtils.NeedCommitInfo ? getBuildItem("Commit") : ""
    if (shortCommit && !cmd.toLowerCase().includes(" BUILD_Commit=")) { cmd += `BUILD_Commit=${shortCommit} ` }
    cmd += "TEST_WORKING=0 "
    if (getBuildItem("MV3") !== 0) {
      cmd += `npm run ${isEdge ? "edge" : getBuildItem("BTypes") === BrowserType.Firefox ? "firefox" : "chrome"}`
    } else {
      cmd += `npm run ${isEdge ? "mv2-edge" : getBuildItem("BTypes") === BrowserType.Firefox ? "mv2-ff" : "mv2-cr"}`
    }
    let clone = shortCommit && `>>> git clone https://github.com/gdh1995/vimium-c.git`
    let checkout = shortCommit && `>>> git checkout ${getGitCommit(-1) || shortCommit}`
    let install_deps = `npm ci`
    let fullCmds = [clone, checkout, install_deps, cmd].map(i => i && i.trim()).filter(i => i)
    try {
      fs.writeFileSync(osPath.join(DEST, ".snapshot.sh"), fullCmds.concat("").join("\n"))
    } catch (e) {
      print("Reproduce:")
      for (let i of fullCmds) {
        print("%o", ` ${i} `)
      }
    }
    done()
  }]],
  "dist/": ["dist"],

  build: ["dist"],
  rebuild: [["clean"], "dist"],
  all: ["build"],
  clean: function() {
    return cleanByPath([".build/**", "manifest.json", ".snapshot.sh", "**/*.js", "!helpers/*/*.js", ".*.build"
      , "front/help_dialog.html", "front/vomnibar.html", "front/words.txt", ...JSON_TO_JS], DEST);
  },

  scripts: ["background", "content", "front"],
  pages: ["options", "show", "others"],
  "pages/": ["pages"],
  b: ["background"],
  ba: ["background"],
  bg: ["background"],
  c: ["content"],
  f: ["front"],
  p: ["pages"],
  pa: ["pages"],
  pg: ["pages"],
  local: ["scripts", "pages"],
  "local/": ["local"],
  tsc: ["locally", function(done) {
    debugging = true;
    compile(["*/*.ts", "!helpers/**"], false, done);
  }],
  "default": ["local"],
  watch: ["locally", function(done) {
    ignoreHeaderChanges = willListFiles = true;
    willListEmittedFiles = false;
    ["background", "content", "front", "options", "show"].forEach(makeWatchTask);
    done();
  }],
  debug: ["locally", function(done) {
    ignoreHeaderChanges = disableErrors = willListFiles = false;
    willListEmittedFiles = debugging = true;
    ["background", "content", "front", "polyfill", "options", "show", "others"].forEach(makeWatchTask)
    done();
  }],
  eslint: function (done) {
    process.argv = process.argv.slice(0, 2);
    require("./scripts/eslint");
    done();
  },
  "size/content": function (done) {
    onlyTestSize = true;
    print("Only build and minify content scripts");
    gulp.series("build/ts")(done);
  },
  "minc": ["size/content"],
  "content/size": ["size/content"],
  "content/csize": ["size/content"],
  "csize": ["size/content"],
  "words": ["build/content", function (cb) {
    process.env.CHECK_WORDS = "1";
    gulp.series("min/content")(function () {
      process.argv = process.argv.slice(0, 2);
      require("./scripts/words-collect");
      cb();
    });
  }],
  lint: ["eslint"],
  local2: function(cb) {
    gNoComments = false;
    locally = true;
    if (!process.env.LOCAL_DIST) {
      process.env.LOCAL_DIST = "dist";
      print("Set env's default: LOCAL_DIST = dist");
    }
    let d = 0
    if (process.env.BUILD_Inline === "1") { delete process.env.BUILD_Inline; print("Ignore env: BUILD_Inline"); d++ }
    if (d) { _buildConfigTSContent = null; buildOptionCache = Object.create(null); createBuildConfigCache() }
    var arr = ["static", "_manifest"];
    if (fs.existsSync(osPath.join(JSDEST, "lib/dom_utils.js"))) {
      arr.unshift("build/_clean_diff");
    }
    gulp.series(...arr)(function () {
      locally = false;
      gulp.series("local")(function() {
        cb();
      });
    });
  },
  test: ["local", "lint"]
};

gulp.task("locally", function(done) {
  if (locally) { return done(); }
  locally = true;
  gTypescript = null;
  if (process.env.BUILD_MV3 === "0" && !process.env.LOCAL_DIST) {
    throw new Exception("MV3 can not be disabled locally")
  }
  compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json");
  createBuildConfigCache();
  var old_has_polyfill = has_polyfill;
  has_polyfill = getBuildItem("MinCVer") < /* MinSafe$String$$StartsWith */ 43
  if (has_polyfill != old_has_polyfill) {
    CompileTasks.front[0][1] = has_polyfill ? POLYFILL_FILE : "!" + POLYFILL_FILE;
    CompileTasks.lib.length = 1;
    has_polyfill || CompileTasks.lib.push("!" + POLYFILL_FILE);
  }
  JSDEST = process.env.LOCAL_DIST || ".";
  /[\/\\]$/.test(JSDEST) && (JSDEST = JSDEST.slice(0, -1));
  gulpUtils.set_dest(DEST, JSDEST)
  willListEmittedFiles = true;
  done();
});
gulpUtils.makeCompileTasks(CompileTasks, compile);
gulpUtils.makeTasks(Tasks);

var _notifiedTasks = [], _notifiedTaskTimer = 0;
function makeWatchTask(taskName) {
  var glob = CompileTasks[taskName][0];
  typeof glob === "string" && (glob = [glob]);
  if (!debugging) {
    glob.push("!background/*.d.ts", "!lib/*.d.ts", "!pages/*.d.ts",
      "!typings/**/*.ts", "!typings/*.d.ts", "!node_modules/**/*.ts");
  }
  gulp.watch(glob, function() {
    if (_notifiedTasks.indexOf(taskName) < 0) { _notifiedTasks.push(taskName); }
    if (_notifiedTaskTimer > 0) { clearTimeout(_notifiedTaskTimer); }
    _notifiedTaskTimer = setTimeout(function() {
      _notifiedTaskTimer = 0;
      gulp.parallel(..._notifiedTasks.slice(0))();
      _notifiedTasks.length = 0;
    }, 100);
  });
}

function _tsProject(moduleType, allowForOf) {
  gTypescript = gulpUtils.loadTypeScriptCompiler(null, compilerOptions, gTypescript);
  gulpUtils.removeSomeTypeScriptOptions(compilerOptions, gTypescript)
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  var noGenerator = !(btypes & BrowserType.Chrome) || cver >= /* MinEnsuredGeneratorFunction */ 39;
  var wrapGeneratorToken = !!(btypes & BrowserType.Chrome) && cver < /* MinEnsuredGeneratorFunction */ 39;
  patchTSNamespace(gTypescript, logger, noGenerator, wrapGeneratorToken, allowForOf);
  var localOptions = {...compilerOptions}
  localOptions.module = moduleType || "amd"
  var ts = require("gulp-typescript");
  return disableErrors ? ts(localOptions, ts.reporter.nullReporter()) : ts(localOptions);
}

exports.tsProject = (moduleType) => {
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  var allowForOfSpecially = !!(btypes & BrowserType.Chrome)
      && cver >= /* MinEnsuredES6$ForOf$Map$SetAnd$Symbol & BuildMinForOf */ 38
      && cver < /* MinTestedES6Environment */ 49
  const getResp = (tsStream) => {
    return !allowForOfSpecially ? tsStream.js : tsStream.js.pipe(gulpMap(file => {
      let code = ToString(file), oldSize = code.length
      code = code.replace(/\bfor\s?\(var ([^,=]+)[,=](.*?) of ([^\r\n]+)[\r\n](\s*)/g, (_, i, others, arr, indent) => {
        const isBlock = arr.trimRight().endsWith("{")
        if (!isBlock) {
          throw new Error("Can not convert for-of without a block body")
        }
        i = i.trim()
        if (!others.includes(",")) {
          const iOut = `_${i}_out`
          return `for (var ${iOut} of ${arr}\n`
              + indent + `var ${i} = ${others.replace(/\(void 0\)/, iOut)};\n`
              + indent
        }
        return `for (var ${i} of ${arr}\n`
          + indent + `var ${others.trim().replace(/^void 0,\s*/, "")};\n`
          + indent
      })
      if (code.length !== oldSize) {
        ToBuffer(file, code)
      }
    }))
  }
  return gulpUtils.gulpLazyStream(() => _tsProject(moduleType, allowForOfSpecially), getResp)
}

function compile(pathOrStream, header_files, done, options) {
  if (typeof pathOrStream === "string") {
    pathOrStream = [pathOrStream];
  }
  if (pathOrStream instanceof Array) {
    pathOrStream.push("!typings/**/*.ts");
    pathOrStream.push("!typings/*.ts");
  }
  var stream = pathOrStream instanceof Array ? gulp.src(pathOrStream, { base: "." }) : pathOrStream;
  var extra = ignoreHeaderChanges || header_files === false ? undefined
    : ["typings/**/*.d.ts", "typings/*.d.ts", "!typings/build/*.ts"].concat(header_files
        ).concat(buildConfig ? ["scripts/gulp.tsconfig.json"] : []);
  const moduleType = options?.module?.toLowerCase() || ""
  if (moduleType === "distes6") {
    options.module = locally ? "" : "es6"
  } else if (moduleType.startsWith("may")) {
    options.module = computeModuleType(moduleType !== "mayes6")
  }
  gulpUtils.compileTS(stream, options, extra, done, debugging, JSDEST, willListFiles)
}

function computeModuleType(needDynamicImport) {
  const btypes = getBuildItem("BTypes")
  return btypes & BrowserType.Edge
      || btypes & BrowserType.Chrome && (
        getBuildItem("MinCVer") < /* MinUsableScript$type$$module$InExtensions */ 66
        || needDynamicImport && getBuildItem("MinCVer") < /* MinES$DynamicImport */ 63) // lgtm [js/redundant-operation]
      || btypes & BrowserType.Firefox &&
        needDynamicImport && getBuildItem("MinFFVer") < /* MinEnsuredES$DynamicImport */ 67
      ? null
      : "es2020"
}

var _names = null
exports.outputJSResult = (stream, withES6Module) => {
  if (locally) {
    stream = stream.pipe(gulpMap(beforeTerser))
    var config
    if (doesMinifyLocalFiles) {
      let cachePath = osPath.join(JSDEST, ".name-cache.build")
      config = loadTerserConfig()
      const nameCache = config.mangle ? _names ? _names[0] : fs.existsSync(cachePath) ? readJSON(cachePath) : {} : null
      _names = nameCache ? _names || (delete nameCache.vars, [nameCache, JSON.stringify(nameCache)]) : _names
      let piped = 0;
      if (nameCache) { config.nameCache = nameCache }
      stream = stream.pipe(getGulpTerser()(config))
      nameCache && (stream = stream.pipe(gulpMap((f) => { piped++ })))
      nameCache && stream.on("end", () => {
        const newCache = piped ? JSON.stringify(nameCache) : _names[1]
        if (newCache !== _names[1]) {
          if (!fs.existsSync(JSDEST)) { fs.mkdirSync(JSDEST, {recursive: true}) }
          writeJSON(cachePath, nameCache)
          _names[1] = newCache
          print("NameCache saved");
        } else if (piped) {
          print("NameCache is not changed");
        }
      })
    }
    stream = stream.pipe(gulpMap(postTerser.bind(null, config)))
  }
  if (!locally || withES6Module) {
    stream = stream.pipe(gulpMap(file => {
      const data = ToString(file)
      let patched
      if (!withES6Module) {
        patched = addMetaData(file.relative, data)
      } else {
        patched = data.replace(/\bimport\b[^'"}]+\}?\s?\bfrom\b\s?['"][.\/\w]+['"]/g, s => {
            return s.includes(".js") ? s : s.slice(0, -1) + ".js" + s.slice(-1)
        })
      }
      if (patched.length !== data.length) { ToBuffer(file, patched) }
    }))
  }
  return destCached(stream, JSDEST, willListEmittedFiles, gulpUtils.compareContentAndTouch)
}

const beforeTerser = exports.beforeTerser = (file) => {
  var allPathStr = file.history.join("|").replace(/\\/g, "/");
  var contents = null, oldLen = 0;
  function get(c) { contents == null && (contents = ToString(file), oldLen = contents.length) }
  if (!locally && outputES6) {
    get();
    contents = contents.replace(/(?<!export\s)\bconst([\s{\[])/g, "let$1");
  }
  var btypes = getBuildItem("BTypes"), minCVer = getBuildItem("MinCVer");
  if (btypes & BrowserType.Chrome && minCVer < /* MinEnsuredAsyncFunctions */ 57
      && allPathStr.includes("/vimium-c.js")) {
    get();
    if (contents.includes("__awaiter(this")) {
      print("Warning: should avoid using `this` in async functions")
    }
    if (btypes & BrowserType.Chrome && minCVer < /* MinEnsuredGeneratorFunction */ 39) {
      contents = contents.replace(/\breturn __generator\(/g, "return (");
    }
    if (contents.includes("__myAwaiter")) {
      contents = contents.replace(/\b__awaiter\(void 0,[^,]+,[^,]+,\s?(?=\(?function|\(\(?\))/g, "__myAwaiter(");
    }
  }
  if (!(btypes & ~BrowserType.Firefox) && allPathStr.includes("/vimium-c.js")) {
    get();
    contents = contents.replaceAll("isSafeEl_()", "true");
  }
  if (allPathStr.includes("/env.js")) {
    const result = skip_declaring_known_globals(btypes, minCVer, () => (get(), contents))
    if (result != null) {
      contents = result
    }
  }
  if (locally ? doesMinifyLocalFiles : allPathStr.includes("pages/") || allPathStr.includes("background/")) {
    get()
    if (!known_defs) {
      known_defs = {}
      fill_global_defs(known_defs, getBuildItem("BTypes"))
    }
    contents = replace_global_defs(known_defs, contents)
  }
  var noAppendChild = !(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsured$ParentNode$$appendAndPrepend */ 54;
  if (noAppendChild && (allPathStr.includes("front/") || allPathStr.includes("pages/"))) {
    get();
    contents = contents.replace(/\bappendChild\b(?!\.call\([\w.]*doc)/g, "append");
  }
  if (oldLen > 0 && contents.length !== oldLen) {
    ToBuffer(file, contents);
  }
}

const postTerser = exports.postTerser = async (terserConfig, file, allPaths) => {
  var allPathStr = (allPaths || file.history).join("|").replace(/\\/g, "/");
  var contents = null, oldLen = 0;
  function get() { contents == null && (contents = ToString(file), oldLen = contents.length); }
  if (locally ? doesMinifyLocalFiles
      : terserConfig.compress && terserConfig.compress.booleans && false) {
    get()
    contents = contents.replace(/![01]\b/g, s => s === "!0")
  }
  if ((!locally && (allPathStr.includes("content/") || allPathStr.includes("lib/"))
      || allPathStr.includes("pages/"))) {
    get()
    contents = contents.replace(/\n?\/\*!? ?@OUTPUT ?\{([^}]+)\} ?\*\/\n?/g, '$1')
  }
  if (allPathStr.indexOf("extend_click.") >= 0) {
    var btypes = getBuildItem("BTypes"), minCVer = getBuildItem("MinCVer")
    if (!getBuildItem("MV3") || btypes & ~(BrowserType.Chrome | BrowserType.Firefox)
        || btypes & BrowserType.Chrome && minCVer < /* MinRegisterContentScriptsWorldInMV3 */ 102) {
      get();
      contents = patchExtendClick(contents);
    }
  }
  if (allPathStr.indexOf("extend_click_vc.") >= 0) {
    get()
    if (!contents.includes("VC(1)")) {
      contents = contents.replace(/ ?\bVC\b ?/, "")
    }
    logger("%o: %o %s", ":extend_click_vc", contents.length, "bytes in file");
  }
  if (locally) {
    get();
    contents = addMetaData(file.relative, contents)
  }
  if ((contents || file.contents).length < 24) {
    get()
    contents = contents.trim() === '"use strict";' ? "" : contents
  }
  if (terserConfig && terserConfig.format && terserConfig.format.max_line_len) {
    get()
    const tooLong = contents.split("\n").filter(i => i.length > MaxLineLen2)
    if (tooLong.length > 0) {
      throw new Error(file.relative.replace(/\\/g, "/") + `: ${tooLong.length} some lines are too long`)
    }
  }
  if (oldLen > 0 && contents.length !== oldLen) {
    ToBuffer(file, contents);
  }
}

function copyByPath(path, mapFuncOrPipe) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST))
    .pipe(gulpMap(function(file) {
      var fileName = file.history.join("|");
      if (fileName.indexOf("vimium-c.css") >= 0) {
        ToBuffer(file, ToString(file).replace(/\r\n?/g, "\n"))
      } else if (fileName.indexOf("vomnibar.html") >= 0
          && getBuildItem("BTypes") === BrowserType.Firefox) {
        ToBuffer(file, ToString(file).replace(/(\d)px\b/g, "$1rem"
            ).replace(/body ?\{/, "html{font-size:1px;}\nbody{"))
      } else if (fileName.indexOf("help_dialog.html") >= 0
          && getBuildItem("BTypes") === BrowserType.Firefox) {
        let str = ToString(file).replace(/\r\n?/g, "\n"), ind = str.indexOf("-webkit-scrollbar"),
        start = str.lastIndexOf("\n", ind), end = str.indexOf("</style>", ind);
        ToBuffer(file, str.slice(0, start + 1) + "/* stripped */" + str.slice(end))
      }
    }));
  stream = mapFuncOrPipe instanceof require("stream").Transform ? stream.pipe(mapFuncOrPipe)
      : typeof mapFuncOrPipe === "function" ? stream.pipe(gulpMap(mapFuncOrPipe)) : stream
  return destCached(stream, DEST, willListEmittedFiles, gulpUtils.compareContentAndTouch)
}

function loadValidCompilerOptions(tsConfigFile) {
  var tsconfig = gulpUtils.readTSConfig(tsConfigFile, true);
  buildConfig = tsconfig.build || buildConfig
  gulpUtils.normalizeTSConfig(tsconfig)
  var opts = tsconfig.compilerOptions;
  if (buildOptionCache) {
    createBuildConfigCache()
  }
  var oldTS = gTypescript || compilerOptions && compilerOptions.typescript;
  if (oldTS && !opts.typescript) {
    opts.typescript = oldTS;
  }
  DEST = process.env.LOCAL_DIST || "";
  if (!DEST || DEST === ".") {
    DEST = "dist";
  }
  JSDEST = osPath.join(DEST, ".build");
  gulpUtils.set_dest(DEST, JSDEST)
  willListFiles   = !!opts.listFiles;
  willListEmittedFiles = !!opts.listEmittedFiles;
  return opts;
}

var _buildConfigPrinted = false;
exports.getBuildConfigStream = () => {
  return gulp.src("typings/build/index.d.ts").pipe(gulpMap(function(file) {
    if (debugging && !_buildConfigPrinted) {
      _buildConfigPrinted = true;
      print("Current build config is:\n" + _getBuildConfigTSContent().trim());
    }
    ToBuffer(file, _getBuildConfigTSContent());
  }));
}

var _buildConfigTSContent
var _getBuildConfigTSContent = () => {
  _buildConfigTSContent = _buildConfigTSContent.replace(/\b([A-Z]\w+)\s?=\s?[^,}]+/g, function(_, key) {
    var newVal = getBuildItem(key);
    if (newVal == null) { throw new Error("Lack value for " + key) }
    return key + " = " + JSON.stringify(newVal);
  });
  _getBuildConfigTSContent = () => _buildConfigTSContent
  return _buildConfigTSContent
}

function createBuildConfigCache() {
  if (!_buildConfigTSContent) {
    _buildConfigTSContent = readFile("typings/build/index.d.ts")
    _buildConfigTSContent.replace(/\b([A-Z]\w+)\s?=\s?([^,}]+)/g, function(_, key, literalVal) {
      getBuildItem(key, literalVal, true)
      return ""
    });
  }
  if (!(getBuildItem("BTypes") & (BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge))) {
    throw new Error("Unsupported Build.BTypes: " + getBuildItem("BTypes"));
  }
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  outputES6 = !(btypes & BrowserType.Chrome && cver < /* MinTestedES6Environment */ 49);
  compilerOptions.target = !outputES6 ? "es5"
      : !(btypes & BrowserType.Chrome && cver < /* MinEnsuredAsyncFunctions */ 57) ? "es2017" : "es6"
}

function tryJSONParse(value) {
    value = safeJSONParse(value)
    if (value == null) {
      throw new Error("Failed in loading build item: " + key)
    }
  return value;
}

function getBuildItem(key, literalVal, notParse) {
  let cached = buildOptionCache[key];
  if (cached != null) {
    if (typeof cached[1] === "function") {
      cached[1] = cached[1](key, locally, cached[0])
    }
    return notParse || parseBuildItem(key, cached[1] ?? (cached[0] && tryJSONParse(cached[0])))
  }
  var newVal = gulpUtils.parseBuildEnv(key, literalVal, locally)
  if (newVal != null) {
    buildOptionCache[key] = [literalVal, newVal]
    return notParse || parseBuildItem(key, newVal)
  }
  newVal = buildConfig && buildConfig[key];
  buildOptionCache[key] = [literalVal, newVal != null ? newVal : null];
  return notParse || parseBuildItem(key, newVal)
}

function parseBuildItem(key, newVal) {
  if (newVal != null && newVal instanceof Array && newVal.length === 2) {
    newVal = newVal[locally ? 0 : 1];
  }
  return newVal;
}

function patchExtendClick(source) {
  //@ts-check
  if (getBuildItem("BTypes") === BrowserType.Firefox) { return source; }
  const patched = _patchExtendClick(source, locally, logger);
  if (typeof patched === "string") { return patched; }
  if (getBuildItem("MinCVer") < /* MinEnsuredES6ArrowFunction */ 49 && getBuildItem("BTypes") & BrowserType.Chrome) {
    patched[1] = patched[1].replace(/function ?\(([\w, ]*)\)({I=)?/g
        , (s, args, bodyPrefix, idx, full) => full.slice(idx - 2, idx) === ";(" ? s
            : bodyPrefix ? `function (${args})${bodyPrefix}` : `(${args})=>`)
  }
  let inCode, inJSON;
  if (getBuildItem("NDEBUG") && getBuildItem("Inline")) {
    const matched = patched[0].slice(-4).replace(/'/g, '"')
    const n1 = matched.endsWith('||"') ? 3 : matched === '|| "' ? 4 : 0;
    if (!n1 || patched[2][0] !== '"') {
      throw Error("Error: can not extract extend_click from the target code file!!!");
    }
    inCode = patched[0].slice(0, -n1) + patched[2].slice(1);
    inJSON = patched[1];
  } else {
    inCode = patched.join(""); inJSON = "";
  }
  if (inJSON) {
    if (inJSON.includes('"')) { throw Error("Error: extend_click should not include `\"`") }
    if (inJSON.includes("\\'")) { throw Error("Error: extend_click should not include `\\'`") }
    if (inJSON.includes("$")) {
      if (!/\$\$/.test(inJSON)) {
        print("[WARNING] extend_click: need to escape '$'")
        inJSON = inJSON.replace(/\$/g, "$$$$")
      } else {
        throw Error('Error: can not escape `$` in extend_click');
      }
    }
  }
  if (inJSON || !locally) {
    const jsonPath = DEST + "/" + LOCALES_EN
  print("Save extend_click into en/messages.json")
  const json = JSON.parse(readFile(jsonPath));
  if (inJSON) {
    json[/** kTip.extendClick */ "999"] = { message: inJSON };
  } else {
    delete json[999];
  }
  json[getBuildItem("MV3") ? /** kTip.removeCurScript */ 88 : /** kTip.removeEventScript */ 89] = { message: "" }
  fs.writeFileSync(jsonPath, JSON.stringify(json));
  }
  logger("%o: %o %s", ":extend_click", inJSON.length, inJSON ? "bytes" : "(embeded)");
  return inCode;
}

var known_defs
const loadTerserConfig = exports.loadTerserConfig = (reload) => {
  var a = _loadTerserConfig(getBuildItem("NDEBUG") ? "scripts/uglifyjs.dist.json" : "scripts/uglifyjs.local.json", reload);
  if (!getBuildItem("Mangle")) {
    a.mangle = false
    a.compress.sequences = false
    a.compress.join_vars = false
  }
  if (!a.mangle) { a.format.beautify = true }
  {
    if (!getBuildItem("NDEBUG")) {
      a.format.beautify = true
      a.format.indent_level = 2
      a.compress.sequences = false
      a.compress.join_vars = false
      a.compress.hoist_vars = false
    } else {
      maxDistSequences = maxDistSequences || a.compress.sequences
      minifyDistPasses = minifyDistPasses || a.compress.passes
      set_minifier_env(willListEmittedFiles, /[\\\/](env|define)\./, minifyDistPasses, gNoComments, maxDistSequences)
    }
    a.ecma = outputES6 ? 6 : 5
  }
  if (gNoComments || getBuildItem("NDEBUG")) {
    a.format.comments = /^!/
  }
  return a;
}
