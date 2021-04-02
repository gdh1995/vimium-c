"use strict";
var fs = require("fs");
var gulp = require("gulp");
var logger = require("fancy-log");
var gulpChanged = require('gulp-changed');
var ts = require("gulp-typescript");
var newer = require('gulp-newer');
var gulpPrint = require('gulp-print');
var osPath = require('path');
var {
  getGitCommit, readJSON, readFile, patchTSNamespace, logFileSize, addMetaData, patchTerser,
  patchExtendClick: _patchExtendClick, BrowserType, fill_global_defs, replace_global_defs, remove_dead_code,
  loadTerserConfig: _loadTerserConfig,
} = require("./scripts/dependencies");
var gulpUtils = require("./scripts/gulp-utils")
var { print, ToBuffer, ToString, cleanByPath, minifyJSFiles, set_minifier_env,
      safeJSONParse, gulpMap, getGulpTerser } = gulpUtils

var DEST, willListFiles, willListEmittedFiles, JSDEST;
var locally = false;
var debugging = process.env.DEBUG === "1";
var gTypescript = null;
var buildConfig = null;
var cacheNames = process.env.ENABLE_NAME_CACHE !== "0";
var needCommitInfo = process.env.NEED_COMMIT === "1";
var doesMergeProjects = process.env.MERGE_TS_PROJECTS !== "0";
var doesMinifyLocalFiles = process.env.MINIFY_LOCAL !== "0";
var LOCAL_SILENT = process.env.LOCAL_SILENT === "1";
var minifyDistPasses = +process.env.MINIFY_DIST_PASSES || 0;
var maxDistSequences = +process.env.MAX_DIST_SEQUENCES || 0;
var gNoComments = process.env.NO_COMMENT === "1";
var disableErrors = process.env.SHOW_ERRORS !== "1" && process.env.SHOW_ERRORS === "0";
var ignoreHeaderChanges = process.env.IGNORE_HEADER_CHANGES !== "0";
var onlyTestSize = false;
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json");
var has_dialog_ui = manifest.options_ui != null && manifest.options_ui.open_in_tab !== true;
var jsmin_status = [false, false, false];
var buildOptionCache = Object.create(null);
var outputES6 = false;
gulpPrint = gulpPrint.default || gulpPrint;
gulpUtils.set_dest(DEST, JSDEST)
set_minifier_env(willListEmittedFiles, /[\\\/](env|define)\./, 1, gNoComments, false)

createBuildConfigCache();
var has_polyfill = !!(getBuildItem("BTypes") & BrowserType.Chrome)
    && getBuildItem("MinCVer") < 43 /* MinSafe$String$$StartsWith */;
var may_have_newtab = getNonNullBuildItem("MayOverrideNewTab") > 0;
var minify_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome)
    || getBuildItem("MinCVer") >= /* MinTestedES6Environment */ 49;
const POLYFILL_FILE = "lib/polyfill.ts", NEWTAB_FILE = "pages/newtab.ts";
const VIEWER_JS = "lib/viewer.min.js";
const FILE_URLS_CSS = "front/file_urls.css";

const KnownBackendGlobals = [
  "Backend_", "BgUtils_", "BrowserProtocol_",
  "Clipboard_", "CommandsData_", "Completion_", "ContentSettings_", "CurCVer_", "CurFFVer_",
  "FindModeHistory_", "IncognitoWatcher_", "Marks_", "MediaWatcher_",
  "Settings_", "TabRecency_", "trans_", "IsEdg_"
];

var CompileTasks = {
  background: ["background/*.ts", "background/*.d.ts"],
  content: [["content/*.ts", "lib/*.ts", "!" + POLYFILL_FILE, "!lib/injector.ts"], "content/*.d.ts"],
  lib: ["lib/*.ts"].concat(has_polyfill ? [] : ["!" + POLYFILL_FILE]),
  front: [["front/*.ts", has_polyfill ? POLYFILL_FILE : "!" + POLYFILL_FILE
            , "lib/injector.ts", "pages/*.ts"
            , may_have_newtab ? NEWTAB_FILE : "!" + NEWTAB_FILE
            , "!pages/options*.ts", "!pages/show.ts", "!pages/async_bg.ts"]
          , ["background/index.d.ts", "content/*.d.ts"]
          , { inBatch: false }],
  vomnibar: ["front/vomnibar*.ts", ["background/index.d.ts", "content/*.d.ts"]],
  polyfill: [POLYFILL_FILE],
  injector: ["lib/injector.ts"],
  options: [["pages/options*.ts", "pages/async_bg.ts"], ["background/*.d.ts", "content/*.d.ts"]],
  show: [["pages/show.ts", "pages/async_bg.ts"], ["background/index.d.ts", "content/*.d.ts"]],
  others: [ ["pages/*.ts", "front/*.ts", "!pages/options*.ts", "!pages/show.ts", "!pages/async_bg.ts"
              , "!front/vomnibar*.ts"]
            , "background/index.d.ts" ],
}

var Tasks = {
  "build/pages": ["build/options", "build/show", "build/others"],
  "static/special": function() {
    const path = ["lib/*.min.js", "lib/*.min.css"];
    minify_viewer && path.push("!" + VIEWER_JS)
    return copyByPath(path);
  },
  "static/minify-js": function() {
    const path = ["lib/math_parser*.js"];
    minify_viewer && path.push(VIEWER_JS)
    if (!getBuildItem("Minify")) {
      return copyByPath(path);
    }
    return minifyJSFiles(path, ".", { base: "." });
  },
  "static/json": function() {
    const path = ["_locales/*/messages.json", "settings-template.json"];
    if (getBuildItem("BTypes") === BrowserType.Firefox) {
      path.push("!_locales/*_*/**")
    }
    for (const lang of "ru".split(" ")) {
      const file = "_locales/" + lang + "/messages.json"
      if (fs.existsSync(file)) {
        const obj = readJSON(file)
        if (!obj.name || !obj.description) {
          path.push("!" + file)
        }
      }
    }
    if (!getBuildItem("Minify")) {
      return copyByPath(path);
    }
    return minifyJSFiles(path, ".", { base: ".", json: true })
  },
  "png2bin": function(cb) {
    const p2b = require("./scripts/icons-to-blob");
    if (p2b.called) { return cb(); } p2b.called = true;
    p2b.setDestRoot(DEST);
    p2b.main(() => cb(), { print });
  },
  "minify-css": function() {
    const path = ["pages/*.css"];
    if (!getBuildItem("Minify")) { return copyByPath(path) }
    const CleanCSS = require("clean-css"), clean_css = new CleanCSS();
    return copyByPath(path, function(file) {
      file.contents = ToBuffer(clean_css.minify(ToString(file.contents)).styles);
    });
  },
  "minify-html": function() {
    const arr = ["front/*.html", "pages/*.html", "!*/vomnibar.html"];
    may_have_newtab || arr.push("!" + NEWTAB_FILE.replace(".ts", ".*"));
    if (!getBuildItem("Minify")) { return copyByPath(arr) }
    return copyByPath(arr, file => { file.contents = ToBuffer(require('html-minifier').minify(ToString(file.contents), {
      collapseWhitespace: true,
      minifyCSS: true,
      maxLineLength: 4096
    })) })
  },
  "static/minify": function(cb) {
    gulp.parallel("static/minify-js", "static/json", "minify-css", "minify-html")(cb)
  },
  static: ["static/special", "static/minify", function() {
    var arr = ["front/*", "pages/*", "icons/*", "lib/*"
      , "*.txt", "*.md", "!**/[a-ln-z.]*.json", "!**/*.bin"
      , "!**/*.min.*"
      , "!pages/*.css", "!front/[a-u]*.html", "!front/[w-z]*.html", "!pages/*.html", "!REL*.md", "!README*.md"
      , "!PRIVACY*"
      , "!**/*.log", "!**/*.psd", "!**/*.zip", "!**/*.tar", "!**/*.tgz", "!**/*.gz"
      , '!**/*.ts', "!**/*.js", "!**/tsconfig*.json"
      , "!test*", "!todo*"
    ];
    if (!+(process.env.BUILD_CopyManifest || "0") || fs.existsSync(DEST + "/manifest.json")) {
      arr.push("!**/manifest*.json");
    } else {
      arr.push("manifest.json");
    }
    may_have_newtab || arr.push("!" + NEWTAB_FILE.replace(".ts", ".*"));
    var btypes = getBuildItem("BTypes");
    btypes & BrowserType.Chrome || arr.push("!" + FILE_URLS_CSS);
    minify_viewer && arr.push("!" + VIEWER_JS)
    var has_wordsRe = btypes & ~BrowserType.Firefox
            && getBuildItem("MinCVer") <
                59 /* min(MinSelExtendForwardOnlySkipWhitespaces, MinEnsuredUnicodePropertyEscapesInRegExp) */
        || btypes & BrowserType.Firefox && !getNonNullBuildItem("NativeWordMoveOnFirefox");
    if (!has_wordsRe) {
      arr.push("!front/words.txt");
      gulp.series(function() { return cleanByPath("front/words.txt", DEST); })();
    }
    if (btypes & BrowserType.Chrome) {
      gulp.series("png2bin")();
    }
    if (!has_dialog_ui) {
      arr.push("!*/dialog_ui.*");
    }
    return copyByPath(arr);
  }],

  "build/scripts": ["build/background", "build/content", "build/front"],
  "build/_clean_diff": function() {
    return cleanByPath([".build/**", "manifest.json", "pages/dialog_ui.*", "*/vomnibar.html"
        , "*/*.html", "*/*.css", "**/*.json", "**/*.js", "!helpers/*/*.js"
        , FILE_URLS_CSS], DEST)
  },
  "build/_all": ["build/scripts", "build/options", "build/show"],
  "build/ts": function(cb) {
    var btypes = getBuildItem("BTypes");
    var curConfig = [btypes, getBuildItem("MinCVer"), compilerOptions.target
          , /** 4 */ needCommitInfo && !onlyTestSize ? getBuildItem("Commit") : 0, getBuildItem("Minify")]
    var configFile = btypes === BrowserType.Chrome ? "chrome"
          : btypes === BrowserType.Firefox ? "firefox" : "browser-" + btypes;
    if (btypes === BrowserType.Firefox) {
      curConfig[1] = getNonNullBuildItem("MinFFVer");
      curConfig.push(getNonNullBuildItem("FirefoxID"));
      curConfig.push(getNonNullBuildItem("NativeWordMoveOnFirefox"));
    }
    curConfig.push(getNonNullBuildItem("NDEBUG"));
    curConfig.push(getNonNullBuildItem("MayOverrideNewTab"));
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

  "min/content": ["static/json", function(cb) {
    var cs = manifest.content_scripts[0], sources = cs.js;
    if (sources.length <= 1 || jsmin_status[0]) {
      jsmin_status[0] = true;
      return cb();
    }
    cs.js = ["content/vimium-c.js"];
    var exArgs = { nameCache: { vars: {}, props: {}, timestamp: 0 }, aggressiveMangle: true };
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
    }, jsmin_status, debugging, getNameCacheFilePath, cacheNames);
  }],
  "min/bg": ["min/content", function(cb) {
    if (jsmin_status[1]) {
      return cb();
    }
    var exArgs = { nameCache: { vars: {}, props: {}, timestamp: 0 } };
    var config = loadTerserConfig(!!exArgs.nameCache)
    config.nameCache = exArgs.nameCache;
    patchTerser()
    require("terser").minify("var " + KnownBackendGlobals.join(" = {},\n") + " = {};", config)

    var sources = manifest.background.scripts;
    sources = ("\n" + sources.join("\n")).replace(/\n\//g, "\n").trim().split("\n");
    var ori_sources = sources.slice(0);
    // on Firefox, a browser-inner file `resource://devtools/server/main.js` is also shown as `main.js`
    // which makes debugging annoying
    var globals = sources.splice(0, sources.indexOf("background/exclusions.js") + 1, "background/globals.js");
    var body = sources.splice(1, sources.indexOf("background/main.js"), "background/main.js");
    var index = sources.indexOf("background/tools.js") + 1;
    var tail = sources.splice(index, sources.length - index, "background/tail.js");
    var rest = ["background/*.js"];
    for (var arr = ori_sources, i = 0, len = arr.length; i < len; i++) { rest.push("!" + arr[i]); }
    var maps = [
      [globals, sources[0]],
      [body, sources[1], { rollup: true }],
      [sources.slice(2, index), "."],
      [tail, sources[index]],
      [rest, "."]
    ];
    manifest.background.scripts = sources;
    gulpUtils.checkJSAndMinifyAll(1, maps, "min/bg", exArgs, cb
        , jsmin_status, debugging, getNameCacheFilePath, cacheNames)
  }],
  "min/others": ["min/bg", function(cb) {
    if (jsmin_status[2]) {
      return cb();
    }
    var exArgs = { nameCache: gulpUtils.loadNameCache("bg", cacheNames, getNameCacheFilePath),
        nameCachePath: getNameCacheFilePath("bg") };
    var deepcopy = require("deepcopy");
    if (getBuildItem("Minify") && exArgs.nameCache.vars && exArgs.nameCache.props) {
      let {vars: {props: vars}, props: {props: props}} = exArgs.nameCache;
      var browser = getNonNullBuildItem("BTypes");
      if ("$OnOther" in vars
          && (browser === BrowserType.Chrome || browser === BrowserType.Firefox || browser === BrowserType.Edge)) {
        throw new Error('Unexpected global bariable in backend: OnOther');
      }
      for (let key in vars) {
        if (vars.hasOwnProperty(key)) {
          let key2 = key.replace(/^\$/, ""), idx = KnownBackendGlobals.indexOf(key2);
          if (idx < 0) {
            throw new Error('Unknown global variable in backend: ' + key2);
          }
          KnownBackendGlobals.splice(idx, 1);
          if (props[key] != null) {
            throw new Error('The name cache #bg can not be used to build others: values differ for ' + key2);
          }
          props[key] = vars[key];
        }
      }
      if (KnownBackendGlobals.length > 0 && loadTerserConfig(false).mangle) {
        throw new Error('Some global variable are not found: ' + KnownBackendGlobals.join(", "));
      }
    }
    gulp.task("min/others/omni", function() {
      var props = exArgs.nameCache.props && exArgs.nameCache.props.props || null;
      props = props && {};
      return minifyJSFiles(["front/vomnibar*.js"], ".", {
        passAll: null,
        nameCache: exArgs.nameCache && {
          vars: deepcopy(exArgs.nameCache.vars),
          props: { props: props }
        }
      });
    });
    gulp.task("min/others/pages", function() {
      exArgs.passAll = null;
      return minifyJSFiles(["pages/options*.js", "pages/show*", "pages/async_bg*"]
          , ".", deepcopy(exArgs));
    });
    gulp.task("min/others/misc", function() {
      var oriManifest = readJSON("manifest.json", true);
      var res = ["**/*.js", "!background/*.js", "!content/*.js", "!front/vomnibar*", "!helpers/*/*.js"
          , "!pages/options*", "!pages/show*", "!pages/async_bg*"];
      has_polyfill || res.push("!" + POLYFILL_FILE.replace(".ts", ".*"));
      may_have_newtab || res.push("!" + NEWTAB_FILE.replace(".ts", ".*"));
      if (!has_dialog_ui) {
        res.push("!*/dialog_ui.*");
      }
      for (var arr = oriManifest.content_scripts[0].js, i = 0, len = arr.length; i < len; i++) {
        if (arr[i].lastIndexOf("lib/", 0) === 0) {
          res.push("!" + arr[i]);
        }
      }
      exArgs.passAll = false;
      return minifyJSFiles(res, ".", deepcopy(exArgs))
    });
    gulp.parallel("min/others/omni", "min/others/pages", "min/others/misc")(function() {
      jsmin_status[2] = true;
      cb();
    });
  }],
  "min/js": ["min/others"],
  _manifest: function(cb) {
    var minVer = getBuildItem("MinCVer"), browser = getBuildItem("BTypes");
    minVer = minVer ? (minVer | 0) : 0;
    if (locally ? browser & ~BrowserType.Chrome : !(browser & BrowserType.Chrome)) {
      delete manifest.minimum_chrome_version;
      delete manifest.key;
      delete manifest.update_url;
    } else if (minVer && minVer < 999) {
      manifest.minimum_chrome_version = "" + (minVer | 0);
    }
    if (browser & BrowserType.Edge) {
      manifest.name = "Vimium C";
    }
    if (getBuildItem("EdgeC")) {
      delete manifest.key;
      delete manifest.update_url;
    }
    if (!(browser & ~BrowserType.Firefox)) {
      delete manifest.background.persistent;
    }
    if (browser === BrowserType.Chrome) {
      delete manifest.browser_specific_settings;
    } else if (browser === BrowserType.Firefox) {
      manifest.permissions.splice(manifest.permissions.indexOf("contentSettings") || manifest.length, 1);
    }
    if (!(browser & BrowserType.Chrome) || browser & ~BrowserType.Chrome && !locally || minVer < 35) {
      delete manifest.offline_enabled;
    }
    if (locally ? browser & BrowserType.Firefox : browser === BrowserType.Firefox) {
      if (!(browser & BrowserType.Edge)) {
        delete manifest.options_page;
      }
      delete manifest.version_name;
      var specific = manifest.browser_specific_settings || (manifest.browser_specific_settings = {});
      var gecko = specific.gecko || (specific.gecko = {});
      gecko.id = getNonNullBuildItem("FirefoxID");
      var ffVer = getNonNullBuildItem("MinFFVer");
      if (ffVer < 199 && ffVer >= 54) {
        gecko.strict_min_version = ffVer + ".0";
      } else {
        delete gecko.strict_min_version;
      }
    }
    if (browser & BrowserType.Firefox) {
      locally && manifest.permissions.push("tabHide");
    }
    var dialog_ui = getBuildItem("NoDialogUI");
    if (dialog_ui != null && !!dialog_ui !== has_dialog_ui && !dialog_ui) {
      manifest.options_ui && (manifest.options_ui.open_in_tab = true);
    }
    if (getNonNullBuildItem("MayOverrideNewTab") <= 0) {
      if (manifest.chrome_url_overrides) {
        delete manifest.chrome_url_overrides.newtab;
      }
    }
    if (!(browser & BrowserType.Chrome)) {
      manifest.content_scripts = manifest.content_scripts.filter(function(item) {
        return item.matches.length > 1 || item.matches.indexOf("file:///*") < 0 && item.matches.indexOf("file://*") < 0;
      });
    }
    if (manifest.chrome_url_overrides && Object.keys(manifest.chrome_url_overrides) == 0) {
      delete manifest.chrome_url_overrides;
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
          print('skip', file);
        }
        return cb();
      }
    }
    fs.writeFile(file, data, cb);
    print("Save manifest file: " + file);
  },
  manifest: [["min/bg"], "_manifest"],
  dist: [["build/ts"], ["static", "manifest", "min/others", function (done) {
    const rands = Object.setPrototypeOf(gulpUtils.getRandMap() || {}, null), names = Object.keys(rands)
    let cmd = "", isEdge = getBuildItem("EdgeC") == 1;
    Object.keys(process.env).filter(i => i.startsWith("BUILD_"))
        .filter(i => /^random|^commit/i.test(i.slice(6)))
        .forEach(key => { cmd += `${key}=${process.env[key]} ` })
    for (const key of names) { cmd += `BUILD_${key}=${rands[key]} ` }
    let shortCommit = getBuildItem("Commit")
    if (!cmd.toLowerCase().includes(" BUILD_Commit=")) { cmd += `BUILD_Commit=${shortCommit} ` }
    cmd += "TEST_WORKING=0 "
    cmd += `npm run ${isEdge ? "edge-c" : getBuildItem("BTypes") === BrowserType.Firefox ? "firefox" : "chrome"}`
    let checkout = shortCommit && `git checkout ${getGitCommit(-1) || shortCommit}`
    let install_deps = `npm ci`
    let fullCmds = [checkout, install_deps, cmd].map(i => i && i.trim()).filter(i => i)
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
    return cleanByPath([".build/**", "manifest.json", ".snapshot.sh", "**/*.js", "!helpers/*/*.js"
      , "front/help_dialog.html", "front/vomnibar.html", "front/words.txt"], DEST);
  },

  scripts: ["background", "content", "front"],
  pages: ["options", "show", "others"],
  "pages/": ["pages"],
  b: ["background"],
  ba: ["background"],
  bg: ["background"],
  c: ["content"],
  f: ["front"],
  l: ["lib"],
  p: ["pages"],
  pa: ["pages"],
  pg: ["pages"],
  local: ["scripts", "options", "show"],
  "local/": ["local"],
  tsc: ["locally", function(done) {
    debugging = true;
    doesMergeProjects = true;
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
    ["background", "content", "vomnibar", "polyfill", "injector", "options", "show", "others"].forEach(makeWatchTask);
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
  "cize": ["size/content"],
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

if (!has_dialog_ui) {
  CompileTasks.front[0].push("!*/dialog_ui.*");
  CompileTasks.others[0].push("!*/dialog_ui.*");
}
gulp.task("locally", function(done) {
  if (locally) { return done(); }
  locally = true;
  gTypescript = null;
  compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json");
  createBuildConfigCache();
  var old_has_polyfill = has_polyfill;
  has_polyfill = getBuildItem("MinCVer") < 43 /* MinSafe$String$$StartsWith */;
  if (has_polyfill != old_has_polyfill) {
    CompileTasks.front[0][1] = has_polyfill ? POLYFILL_FILE : "!" + POLYFILL_FILE;
    CompileTasks.lib.length = 1;
    has_polyfill || CompileTasks.lib.push("!" + POLYFILL_FILE);
  }
  var old_has_newtab = may_have_newtab;
  may_have_newtab = getNonNullBuildItem("MayOverrideNewTab") > 0;
  if (may_have_newtab != old_has_newtab) {
    CompileTasks.front[0][4] = may_have_newtab ? NEWTAB_FILE : "!" + NEWTAB_FILE;
  }
  minify_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome)
      || getBuildItem("MinCVer") >= /* MinTestedES6Environment */ 49;
  if (!has_dialog_ui) {
    let i = CompileTasks.others[0].indexOf("!*/dialog_ui.*");
    if (i >= 0) {
      CompileTasks.others[0].splice(i, 1);
    }
    i = CompileTasks.front[0].indexOf("!*/dialog_ui.*");
    if (i >= 0) {
      CompileTasks.front[0].splice(i, 1);
    }
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
    glob.push("!background/*.d.ts", "!content/*.d.ts", "!pages/*.d.ts",
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

function tsProject() {
  gTypescript = gulpUtils.loadTypeScriptCompiler(null, compilerOptions, gTypescript);
  gulpUtils.removeSomeTypeScriptOptions(compilerOptions, gTypescript)
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  var noGenerator = !(btypes & BrowserType.Chrome) || cver >= /* MinEnsuredGeneratorFunction */ 39;
  var wrapGeneratorToken = !!(btypes & BrowserType.Chrome) && cver < /* MinEnsuredGeneratorFunction */ 39;
  patchTSNamespace(gTypescript, logger, noGenerator, wrapGeneratorToken);
  return disableErrors ? ts(compilerOptions, ts.reporter.nullReporter()) : ts(compilerOptions);
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
  gulpUtils.compileTS(stream, options, extra, done, doesMergeProjects
      , debugging, JSDEST, willListFiles, getBuildConfigStream, beforeCompile, outputJSResult, tsProject)
}

function outputJSResult(stream) {
  if (locally) {
    stream = stream.pipe(gulpMap(beforeTerser))
    var config
    if (doesMinifyLocalFiles) {
      config = loadTerserConfig()
      stream = stream.pipe(getGulpTerser()(config));
    }
    stream = stream.pipe(gulpMap(postTerser.bind(null, config)))
  }
  {
    const es5 = locally ? !compilerOptions.module.startsWith("es")
        : getBuildItem("BTypes") & BrowserType.Edge || getBuildItem("BTypes") & BrowserType.Chrome
          && getBuildItem("MinCVer") < /* MinUsableScript$type$$module$InExtensions */ 63
    stream = stream.pipe(gulpMap(file => {
      const path = file.relative.replace(/\\/g, "/")
      if (path.includes("pages/") && /show|options|async_bg/.test(path)) {
        const data = ToString(file.contents)
        const isAMDModule = data.startsWith("define") || data.startsWith("(factory")
            || data.startsWith("(function(factory)") || data.startsWith("(function (factory)");
        if (es5) {
          var banner = "__filename = " + JSON.stringify(path.replace(/^\//, "")) + ";\n"
          if (isAMDModule) {
            file.contents = ToBuffer(banner + data)
            return
          }
          return gulpUtils.rollupOne(file, {
            treeshake: false, output: { format: "amd", preserveModules: true }
          }, (code) => { return banner + code })
        } else {
          file.contents = ToBuffer(data.replace(/\bimport\b[^'"}]+\}?\s?\bfrom\b\s?['"][.\/\w]+['"]/g, s => {
            return s.includes(".js") ? s : s.slice(0, -1) + ".js" + s.slice(-1)
          }))
        }
      }
    }))
  }
  stream = stream.pipe(gulpChanged(JSDEST, { hasChanged: gulpUtils.compareContentAndTouch }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(JSDEST));
}

function beforeCompile(file) {
  var allPathStr = file.history.join("|").replace(/\\/g, "/");
  var contents = null, oldLen = 0;
  function get() { contents == null && (contents = ToString(file.contents), oldLen = contents.length) }
  if (!locally && (allPathStr.includes("background/") || allPathStr.includes("front/"))) {
    get();
    contents = contents.replace(/\b(const|let|var)?\s?As[a-zA-Z]*_\s?=[^,;\n]+[,;\n]/g, ""
        ).replace(/\bAs[a-zA-Z]*_\b/g, "");
  }
  if (oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

var toRemovedGlobal = null;

const beforeTerser = exports.beforeTerser = (file) => {
  var allPathStr = file.history.join("|").replace(/\\/g, "/");
  var contents = null, oldLen = 0;
  function get(c) { contents == null && (contents = ToString(file.contents), oldLen = contents.length) }
  if (!locally && outputES6) {
    get();
    contents = contents.replace(/\bconst([\s{\[])/g, "let$1");
  }
  var btypes = getBuildItem("BTypes"), minCVer = getBuildItem("MinCVer");
  if (btypes & BrowserType.Chrome && minCVer < /* MinEnsuredAsyncFunctions */ 57
      && (allPathStr.includes("/vimium-c") || allPathStr.includes("/async"))) {
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
  if (allPathStr.includes("/env.js")) {
    toRemovedGlobal = "";
    if (btypes === BrowserType.Chrome || !(btypes & BrowserType.Chrome)) {
      toRemovedGlobal += "browser|";
    }
    if (!(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsuredES6WeakMapAndWeakSet */ 36) {
      toRemovedGlobal += "Weak(Set|Map)|";
    }
    if (!(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsuredES6$ForOf$Map$SetAnd$Symbol */ 38) {
      toRemovedGlobal += "Set|";
    }
    if (!(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsured$InputDeviceCapabilities */ 47) {
      toRemovedGlobal += "InputDeviceCapabilities|";
    }
    if ((!(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsured$requestIdleCallback */ 47)
        && !(btypes & BrowserType.Edge)) {
      toRemovedGlobal += "requestIdleCallback|";
    }
    if (!(btypes & ~BrowserType.Chrome) && minCVer >= /* MinEnsured$visualViewport$ */ 61) {
      toRemovedGlobal += "visualViewport|";
    }
    if (!(btypes & BrowserType.Chrome)) {
      toRemovedGlobal += "WeakRef|";
    }
    toRemovedGlobal = toRemovedGlobal.slice(0, -1);
    toRemovedGlobal = toRemovedGlobal && new RegExp(`(const|let|var|,)\\s?(${toRemovedGlobal})[,;]\n?\n?`, "g");
    let n = 0, remove = str => str[0] === "," ? str.slice(-1) : str.slice(-1) === "," ? str.split(/\s/)[0] + " " : "";
    get()
    let s1 = contents.slice(0, 1000);
    for (; ; n++) {
      let s2 = s1.replace(toRemovedGlobal, remove);
      if (s2.length === s1.length) {
        break;
      }
      s1 = s2;
    }
    if (n > 0) {
      contents = s1 + contents.slice(1000);
    }
  }
  if (locally ? doesMinifyLocalFiles : allPathStr.includes("pages/")) {
    get()
    if (!known_defs) {
      known_defs = {}
      fill_global_defs(known_defs, getBuildItem("BTypes"))
    }
    contents = replace_global_defs(known_defs, contents)
  }
  if (oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

const postTerser = exports.postTerser = async (terserConfig, file, allPaths) => {
  var allPathStr = (allPaths || file.history).join("|").replace(/\\/g, "/");
  var contents = null, oldLen = 0;
  function get() { contents == null && (contents = ToString(file.contents), oldLen = contents.length); }
  if (locally ? doesMinifyLocalFiles
      : terserConfig.compress && terserConfig.compress.booleans && false) {
    get()
    contents = contents.replace(/![01]\b/g, s => s === "!0")
  }
  if (!locally && (allPathStr.includes("content/") || allPathStr.includes("lib/"))) {
    get()
    contents = contents.replace(/\n?\/\*!? ?@OUTPUT ?\{([^]+)\} ?\*\/\n?/g, '$1')
  }
  if (allPathStr.indexOf("extend_click.") >= 0) {
    get();
    contents = patchExtendClick(contents);
  }
  if (allPathStr.includes("content/") || allPathStr.includes("lib/") && !allPathStr.includes("/env.js")) {
    get();
    contents = addMetaData(file.relative, contents)
  }
  if (oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

function copyByPath(path, mapFuncOrPipe) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST))
    .pipe(gulpMap(function(file) {
      var fileName = file.history.join("|");
      if (fileName.indexOf("vimium-c.css") >= 0) {
        file.contents = ToBuffer(ToString(file.contents).replace(/\r\n?/g, "\n"));
      } else if (fileName.indexOf("vomnibar.html") >= 0
          && getBuildItem("BTypes") === BrowserType.Firefox) {
        file.contents = ToBuffer(ToString(file.contents).replace(/(\d)px\b/g, "$1rem"
            ).replace(/body ?\{/, "html{font-size:1px;}\nbody{"));
      } else if (fileName.indexOf("help_dialog.html") >= 0
          && getBuildItem("BTypes") === BrowserType.Firefox) {
        let str = ToString(file.contents), ind = str.indexOf("-webkit-scrollbar"),
        start = str.lastIndexOf("\n", ind), end = str.indexOf("</style>", ind);
        file.contents = ToBuffer(str.slice(0, start + 1) + str.slice(end));
      }
    }));
  stream = mapFuncOrPipe instanceof require("stream").Transform ? stream.pipe(mapFuncOrPipe)
      : typeof mapFuncOrPipe === "function" ? stream.pipe(gulpMap(mapFuncOrPipe)) : stream
  stream = stream.pipe(gulpChanged(DEST, { hasChanged: gulpUtils.compareContentAndTouch }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(DEST));
}

function loadValidCompilerOptions(tsConfigFile) {
  var tsconfig = gulpUtils.readTSConfig(tsConfigFile, true);
  buildConfig = tsconfig.build || buildConfig
  gulpUtils.normalizeTSConfig(tsconfig)
  var opts = tsconfig.compilerOptions;
  if (buildOptionCache) {
    var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
    outputES6 = !(btypes & BrowserType.Chrome && cver < /* MinTestedES6Environment */ 49);
    opts.target = outputES6
      ? !(btypes & BrowserType.Chrome && cver < /* MinEnsuredAsyncFunctions */ 57) ? "es2017"
      : "es6" : "es5";
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
function getBuildConfigStream() {
  return gulp.src("typings/build/index.d.ts").pipe(gulpMap(function(file) {
    if (debugging && !_buildConfigPrinted) {
      _buildConfigPrinted = true;
      print("Current build config is:\n" + _buildConfigTSContent.trim());
    }
    file.contents = ToBuffer(_buildConfigTSContent);
  }));
}

var _buildConfigTSContent;
function createBuildConfigCache() {
  _buildConfigTSContent = _buildConfigTSContent || readFile("typings/build/index.d.ts");
  _buildConfigTSContent = _buildConfigTSContent.replace(/\b([A-Z]\w+)\s?=\s?([^,}]+)/g, function(_, key, literalVal) {
    var newVal = getBuildItem(key, literalVal);
    return key + " = " + (newVal != null ? JSON.stringify(newVal) : buildOptionCache[key][0]);
  });
  if (!(getBuildItem("BTypes") & (BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge))) {
    throw new Error("Unsupported Build.BTypes: " + getBuildItem("BTypes"));
  }
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  outputES6 = !(btypes & BrowserType.Chrome && cver < /* MinTestedES6Environment */ 49);
  compilerOptions.target = outputES6
    ? !(btypes & BrowserType.Chrome && cver < /* MinEnsuredAsyncFunctions */ 57) ? "es2017"
    : "es6" : "es5";
  if (getBuildItem("NDEBUG")) {
    compilerOptions.module = "es6";
  }
}

function getNonNullBuildItem(key) {
  const cache = buildOptionCache[key];
  let value = parseBuildItem(key, cache[1]);
  if (value == null) {
    value = safeJSONParse(cache[0]);
    if (value == null) {
      throw new Error("Failed in loading build item: " + key, cache);
    }
  }
  return value;
}

function getBuildItem(key, literalVal) {
  let cached = buildOptionCache[key];
  if (!cached) {
    if (key === "MayOverrideNewTab") {
      if (!manifest.chrome_url_overrides || !manifest.chrome_url_overrides.newtab) {
        cached = ["0", 0];
      }
    }
    cached && (buildOptionCache[key] = cached);
  }
  if (cached != null) {
    return parseBuildItem(key, cached[1]);
  }
  var newVal = gulpUtils.parseBuildEnv(key, literalVal, LOCAL_SILENT, locally)
  if (newVal != null) {
    buildOptionCache[key] = [literalVal, newVal]
    return parseBuildItem(key, newVal)
  }
  newVal = buildConfig && buildConfig[key];
  buildOptionCache[key] = [literalVal, newVal != null ? newVal : null];
  return parseBuildItem(key, newVal);
}

function parseBuildItem(key, newVal) {
  if (newVal != null && newVal instanceof Array && newVal.length === 2) {
    newVal = newVal[locally ? 0 : 1];
  }
  if (typeof newVal === "function") {
    newVal = newVal(key, buildOptionCache[key][0]);
  }
  if (newVal == null) {
    if (key === "NoDialogUI") {
      newVal = !has_dialog_ui;
    }
  }
  return newVal;
}

function patchExtendClick(source) {
  //@ts-check
  if (!(getBuildItem("BTypes") & ~BrowserType.Firefox)) { return source; }
  const patched = _patchExtendClick(source, locally, logger);
  if (typeof patched === "string") { return patched; }
  if (getBuildItem("MinCVer") < /* MinEnsuredES6ArrowFunction */ 49 && getBuildItem("BTypes") & BrowserType.Chrome) {
    patched[1] = patched[1].replace(/function ?\(([\w, ]*)\)({I=)?/g
        , (s, args, bodyPrefix, idx, full) => full.slice(idx - 2, idx) === ";(" ? s
            : bodyPrefix ? `function (${args})${bodyPrefix}` : `(${args})=>`)
  }
  let inCode, inJSON;
  if (getNonNullBuildItem("NDEBUG") && !+(process.env.EMBED_EXTEND_CLICK || 0)) {
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
  const jsonPath = DEST + "/_locales/en/messages.json";
  print("Save extend_click into en/messages.json")
  const json = JSON.parse(readFile(jsonPath));
  if (inJSON) {
    json[/** kTip.extendClick */ "999"] = { message: inJSON };
  } else {
    delete json[999];
  }
  fs.writeFileSync(jsonPath, JSON.stringify(json));
  }
  logger("%o: %o %s", ":extend_click", inJSON.length, inJSON ? "bytes" : "(embeded)");
  return inCode;
}

var known_defs
const loadTerserConfig = exports.loadTerserConfig = (reload) => {
  var a = _loadTerserConfig(locally ? "scripts/uglifyjs.local.json" : "scripts/uglifyjs.dist.json", reload);
  {
    if (!getBuildItem("Minify")) {
      a.mangle = false;
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
  if (gNoComments || !locally && getBuildItem("Minify")) {
    a.format.comments = /^!/
  }
  return a;
}

function getNameCacheFilePath(path) {
  if (path.indexOf(".cache") >= 0 ) {
    return path;
  }
  return osPath.join(JSDEST, ".names-" + path.replace("min/", "") + ".cache");
}
