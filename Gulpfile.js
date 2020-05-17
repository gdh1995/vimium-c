"use strict";
var fs = require("fs");
var gulp = require("gulp");
var logger = require("fancy-log");
var gulpChanged = require('gulp-changed');
var ts = require("gulp-typescript");
var newer = require('gulp-newer');
var gulpPrint = require('gulp-print');
var gulpSome = require('gulp-some');
var osPath = require('path');
var {
  getGitCommit, extendIf, readJSON, readFile,
  touchFileIfNeeded,
  patchExtendClick: _patchExtendClick,
  loadUglifyConfig: _loadUglifyConfig,
  logFileSize, addMetaData, inlineAllSetters,
} = require("./scripts/dependencies");

class BrowserType {}
Object.assign(BrowserType, {
  Chrome: 1,
  Firefox: 2,
  Edge: 4
});

const LIB_UGLIFY_JS = 'terser';
var DEST, willListFiles, willListEmittedFiles, JSDEST;
var locally = false;
var debugging = process.env.DEBUG === "1";
var compileInBatch = true;
var gTypescript = null, tsOptionsCleaned = false;
var buildConfig = null;
var cacheNames = process.env.ENABLE_NAME_CACHE !== "0";
var envLegacy = process.env.SUPPORT_LEGACY === "1";
var needCommitInfo = process.env.NEED_COMMIT === "1";
var envSourceMap = process.env.ENABLE_SOURCE_MAP === "1";
var doesMergeProjects = process.env.MERGE_TS_PROJECTS !== "0";
var doesUglifyLocalFiles = process.env.UGLIFY_LOCAL !== "0";
var FORCED_NO_UGLIFY = process.env.FORCED_NO_UGLIFY === "1";
var LOCAL_SILENT = process.env.LOCAL_SILENT === "1";
var uglifyDistPasses = +process.env.UGLIFY_DIST_PASSES || 2;
var gNoComments = process.env.NO_COMMENT === "1";
var disableErrors = process.env.SHOW_ERRORS !== "1" && (process.env.SHOW_ERRORS === "0" || !compileInBatch);
var ignoreHeaderChanges = process.env.IGNORE_HEADER_CHANGES !== "0";
var onlyTestSize = false;
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json");
var has_dialog_ui = manifest.options_ui != null && manifest.options_ui.open_in_tab !== true;
var jsmin_status = [false, false, false];
var buildOptionCache = Object.create(null);
var outputES6 = false;
gulpPrint = gulpPrint.default || gulpPrint;

createBuildConfigCache();
var has_polyfill = !!(getBuildItem("BTypes") & BrowserType.Chrome)
    && getBuildItem("MinCVer") < 44 /* MinSafe$String$$StartsWith */;
var may_have_newtab = getNonNullBuildItem("MayOverrideNewTab") > 0;
var uglify_viewer = false;
uglify_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome)
    || getBuildItem("MinCVer") >= /* MinTestedES6Environment */ 49;
const POLYFILL_FILE = "lib/polyfill.ts", NEWTAB_FILE = "pages/newtab.ts";
const VIEWER_JS = "lib/viewer.min.js";
const FILE_URLS_CSS = "front/file_urls.css";

const KnownBackendGlobals = [
  "Backend_", "BgUtils_", "BrowserProtocol_",
  "Clipboard_", "CommandsData_", "Completion_", "ContentSettings_", "CurCVer_", "CurFFVer_",
  "FindModeHistory_", "IncognitoWatcher_", "Marks_", "MediaWatcher_",
  "Settings_", "TabRecency_", "trans_", "As_", "IsEdg_"
];

var CompileTasks = {
  background: ["background/*.ts", "background/*.d.ts"],
  content: [["content/*.ts", "lib/*.ts", "!" + POLYFILL_FILE, "!lib/injector.ts"], "content/*.d.ts"],
  lib: ["lib/*.ts"].concat(has_polyfill ? [] : ["!" + POLYFILL_FILE]),
  front: [["front/*.ts", has_polyfill ? POLYFILL_FILE : "!" + POLYFILL_FILE
            , "lib/injector.ts", "pages/*.ts"
            , may_have_newtab ? NEWTAB_FILE : "!" + NEWTAB_FILE
            , "!pages/options*.ts", "!pages/show.ts"]
          , ["background/bg.d.ts", "content/*.d.ts"]
          , { inBatch: false }],
  vomnibar: ["front/vomnibar*.ts", ["background/bg.d.ts", "content/*.d.ts"]],
  polyfill: [POLYFILL_FILE],
  injector: ["lib/injector.ts"],
  options: ["pages/options*.ts", ["background/*.d.ts", "content/*.d.ts"]],
  show: ["pages/show.ts", ["background/bg.d.ts", "content/*.d.ts"]],
  others: [ ["pages/*.ts", "front/*.ts", "!pages/options*.ts", "!pages/show.ts", "!front/vomnibar*.ts"]
            , "background/bg.d.ts" ],
}

var Tasks = {
  "build/pages": ["build/options", "build/show", "build/others"],
  "static/special": function() {
    const path = ["lib/*.min.js", "lib/*.min.css"];
    uglify_viewer && path.push("!" + VIEWER_JS);
    return copyByPath(path);
  },
  "static/uglify-js": function() {
    const path = ["lib/math_parser*.js"];
    uglify_viewer && path.push(VIEWER_JS);
    if (!getNonNullBuildItem("NDEBUG")) {
      return copyByPath(path);
    }
    return uglifyJSFiles(path, ".", "", { base: "." });
  },
  "static/json": function() {
    const path = ["_locales/*/messages.json", "settings_template.json"];
    if (getBuildItem("BTypes") === BrowserType.Firefox) {
      path.push("!_locales/*_*/**")
    }
    if (!getNonNullBuildItem("NDEBUG")) {
      return copyByPath(path);
    }
    return uglifyJSFiles(path, ".", "", { base: ".", json: true });
  },
  "png2bin": function(cb) {
    const p2b = require("./scripts/icons-to-blob");
    if (p2b.called) { return cb(); } p2b.called = true;
    p2b.setDestRoot(DEST);
    p2b.main(() => cb(), { print });
  },
  "minify-css": function() {
    const path = ["pages/*.css"];
    if (!getNonNullBuildItem("NDEBUG")) { return copyByPath(path); }
    const CleanCSS = require("clean-css"), clean_css = new CleanCSS();
    return copyByPath(path, function(file) {
      file.contents = ToBuffer(clean_css.minify(ToString(file.contents)).styles);
    });
  },
  "minify-html": function() {
    const arr = ["front/*.html", "pages/*.html", "!*/vomnibar.html"];
    may_have_newtab || arr.push("!" + NEWTAB_FILE.replace(".ts", ".*"));
    if (!getNonNullBuildItem("NDEBUG")) { return copyByPath(arr); }
    return copyByPath(arr, null, require('gulp-htmlmin')({
      collapseWhitespace: true,
      minifyCSS: true,
      maxLineLength: 4096
    }));
  },
  "static/uglify": function(cb) {
    gulp.parallel("static/uglify-js", "static/json", "minify-css", "minify-html")(cb);
  },
  static: ["static/special", "static/uglify", function() {
    var arr = ["front/*", "pages/*", "icons/*", "lib/*"
      , "*.txt", "*.md", "!**/[a-ln-z.]*.json", "!**/*.bin"
      , "!**/*.min.*"
      , "!pages/*.css", "!front/[a-u]*.html", "!front/[w-z]*.html", "!pages/*.html", "!REL*.md", "!README_*.md"
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
    uglify_viewer && arr.push("!" + VIEWER_JS);
    var has_wordsRe = btypes & ~BrowserType.Firefox
            && getBuildItem("MinCVer") <
                59 /* min(MinSelExtendForwardOnlySkipWhitespaces, MinEnsuredUnicodePropertyEscapesInRegExp) */
        || btypes & BrowserType.Firefox && !getNonNullBuildItem("NativeWordMoveOnFirefox");
    if (!has_wordsRe) {
      arr.push("!front/words.txt");
      gulp.series(function() { return cleanByPath("front/words.txt"); })();
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
      , "*/*.html", "*/*.css", "**/*.json"
      , "**/*.js", "!helpers/*/*.js"
      , FILE_URLS_CSS]);
  },
  "build/_all": ["build/scripts", "build/options", "build/show"],
  "build/ts": function(cb) {
    var btypes = getBuildItem("BTypes");
    var curConfig = [btypes, getBuildItem("MinCVer"), envSourceMap, envLegacy, compilerOptions.target
          , /** 5 */ needCommitInfo && !onlyTestSize ? getNonNullBuildItem("Commit") : 0];
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
      if (onlyTestSize) {
        oldConfig[5] = 0;
      }
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
      [sources.slice(0), cs.js[0], null], [rest, ".", ""]
    ];
    if (onlyTestSize) { debugging = 1; maps.length = 1 }
    checkJSAndUglifyAll(0, maps, "min/content", exArgs, (err) => {
      if (!err) {
        logFileSize(DEST + "/" + cs.js[0], logger);
      }
      cb(err);
    });
  }],
  "min/bg": ["min/content", function(cb) {
    if (jsmin_status[1]) {
      return cb();
    }
    var exArgs = { nameCache: loadNameCache("content") };
    var config = loadUglifyConfig(!!exArgs.nameCache);
    config.nameCache = exArgs.nameCache;
    require(LIB_UGLIFY_JS).minify("var " + KnownBackendGlobals.join(" = {},\n") + " = {};", config);

    var sources = manifest.background.scripts;
    sources = ("\n" + sources.join("\n")).replace(/\n\//g, "\n").trim().split("\n");
    var ori_sources = sources.slice(0);
    // on Firefox, a browser-inner file `resource://devtools/server/main.js` is also shown as `main.js`
    // which makes debugging annoying
    var body = sources.splice(0, sources.indexOf("background/main.js") + 1, "background/body.js");
    var index = sources.indexOf("background/tools.js") + 1;
    var tail = sources.splice(index, sources.length - index, "background/tail.js");
    var rest = ["background/*.js"];
    for (var arr = ori_sources, i = 0, len = arr.length; i < len; i++) { rest.push("!" + arr[i]); }
    var maps = [
      [body, sources[0], null],
      [sources.slice(1, index), ".", ""],
      [tail, sources[index], null],
      [rest, ".", ""]
    ];
    manifest.background.scripts = sources;
    checkJSAndUglifyAll(1, maps, "min/bg", exArgs, cb);
  }],
  "min/others": ["min/bg", function(cb) {
    if (jsmin_status[2]) {
      return cb();
    }
    var exArgs = { nameCache: loadNameCache("bg"), nameCachePath: getNameCacheFilePath("bg") };
    var deepcopy = require("deepcopy");
    if (exArgs.nameCache.vars && exArgs.nameCache.props) {
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
      if (KnownBackendGlobals.length > 0 && loadUglifyConfig(false).mangle) {
        throw new Error('Some global variable are not found: ' + KnownBackendGlobals.join(", "));
      }
    }
    gulp.task("min/others/omni", function() {
      var props = exArgs.nameCache.props && exArgs.nameCache.props.props || null;
      props = props && {};
      return uglifyJSFiles(["front/vomnibar*.js"], ".", "", {
        passAll: null,
        nameCache: exArgs.nameCache && {
          vars: deepcopy(exArgs.nameCache.vars),
          props: { props: props }
        }
      });
    });
    gulp.task("min/others/options", function() {
      exArgs.passAll = null;
      return uglifyJSFiles(["pages/options_base.js", "pages/options.js", "pages/options_*.js"]
          , ".", "", deepcopy(exArgs));
    });
    gulp.task("min/others/misc", function() {
      var oriManifest = readJSON("manifest.json", true);
      var res = ["**/*.js", "!background/*.js", "!content/*.js", "!front/vomnibar*", "!helpers/*/*.js"
          , "!pages/options*"];
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
      return uglifyJSFiles(res, ".", "", deepcopy(exArgs));
    });
    gulp.parallel("min/others/omni", "min/others/options", "min/others/misc")(function() {
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
  dist: [["build/ts"], ["static", "manifest", "min/others"]],
  "dist/": ["dist"],

  build: ["dist"],
  rebuild: [["clean"], "dist"],
  all: ["build"],
  clean: function() {
    return cleanByPath([".build/**", "**/*.js", "!helpers/*/*.js"
      , "front/help_dialog.html", "front/vomnibar.html", "front/words.txt"]);
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
      print("Set env's default: BUILD_BTypes = dist");
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
  has_polyfill = getBuildItem("MinCVer") < 44 /* MinSafe$String$$StartsWith */;
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
  uglify_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome)
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
  willListEmittedFiles = true;
  done();
});
makeCompileTasks();
makeTasks();

function makeCompileTask(src, header_files, options) {
  header_files = typeof header_files === "string" ? [header_files] : header_files || [];
  return function(done) {
    compile(src, header_files, done, options);
  };
}

function makeCompileTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var key in CompileTasks) {
    if (!hasOwn.call(CompileTasks, key)) { continue; }
    var config = CompileTasks[key], task = makeCompileTask(config[0], config[1], config.length > 2 ? config[2] : null);
    gulp.task(key, gulp.series("locally", task));
    gulp.task("build/" + key, task);
    if (fs.existsSync(key) && fs.statSync(key).isDirectory()) {
      gulp.task(key + "/", gulp.series(key));
    }
  }
}

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

function makeTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  var left = [];
  for (let key in Tasks) {
    if (!hasOwn.call(Tasks, key)) { continue; }
    left.push([key, Tasks[key]]);
  }
  while (left.length > 0) {
    let [ key, task ] = left.shift();
    if (typeof task === "function") {
      gulp.task(key, task);
      continue;
    }
    const knownTasks = gulp.tree().nodes, toTest = task[0] instanceof Array ? task[0] : task;
    let notFound = false;
    for (const i of toTest) {
      if (typeof i === "string" && knownTasks.indexOf(i) < 0) {
        notFound = true;
        break;
      }
    }
    if (notFound) {
      left.push([key, task]);
      continue;
    }
    if (typeof task[1] === "function" || task[0] instanceof Array) {
      gulp.task(key, Tasks[key] =
          gulp.series(task[0] instanceof Array ? gulp.parallel(...task[0]) : task[0], task[1]));
    } else {
      gulp.task(key, task.length === 1 && typeof Tasks[task[0]] === "function" ? Tasks[task[0]]
          : gulp.parallel(...task));
    }
  }
}

function tsProject() {
  loadTypeScriptCompiler();
  removeSomeTypeScriptOptions();
  return disableErrors ? ts(compilerOptions, ts.reporter.nullReporter()) : ts(compilerOptions);
}

var _mergedProject = null, _mergedProjectInput = null;
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
  var allIfNotEmpty = gulpAllIfNotEmpty();
  var localCompileInBatch = options && options.inBatch != null ? options.inBatch : compileInBatch;
  if (localCompileInBatch) {
    stream = stream.pipe(allIfNotEmpty.prepare);
  }
  if (!debugging) {
    stream = stream.pipe(newer({ dest: JSDEST, ext: '.js', extra: extra }));
  }
  stream = stream.pipe(gulpSome(function(file) {
    var t = file.relative, s = ".d.ts", i = t.length - s.length;
    return i < 0 || t.indexOf(s, i) !== i;
  }));
  if (localCompileInBatch) {
    stream = stream.pipe(allIfNotEmpty.cond);
  }
  if (willListFiles) {
    stream = stream.pipe(gulpPrint());
  }
  stream = stream.pipe(gulpMap(beforeCompile));
  var merged = doesMergeProjects ? _mergedProjectInput : null;
  var isInitingMerged = merged == null;
  if (isInitingMerged) {
    merged = gulpMerge();
    doesMergeProjects && (_mergedProjectInput = merged);
  }
  stream.pipe(merged.attachSource());
  if (isInitingMerged) {
    getBuildConfigStream().pipe(merged.attachSource());
    merged = merged.pipe(gulpSome(function(file) {
      var t = file.relative, s = ".d.ts", i = t.length - s.length;
      return i < 0 || t.indexOf(s, i) !== i;
    }));
    var project = tsProject();
    merged = merged.pipe(project);
    merged = outputJSResult(merged.js);
    _mergedProject = merged;
  }
  merged = _mergedProject;
  merged.on("finish", done);
}

function outputJSResult(stream) {
  if (locally) {
    stream = stream.pipe(gulpMap(beforeUglify));
    if (doesUglifyLocalFiles) {
      var config = loadUglifyConfig();
      stream = stream.pipe(getGulpUglify()(config));
    }
    stream = stream.pipe(gulpMap(postUglify));
  }
  stream = stream.pipe(gulpChanged(JSDEST, {
    hasChanged: compareContentAndTouch
  }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(JSDEST));
}

function checkJSAndUglifyAll(taskOrder, maps, key, exArgs, cb) {
  Promise.all(maps.map(function(i) {
    if (debugging) { return true; }
    var is_file = i[1] && i[1] !== ".";
    return checkAnyNewer(i[0], JSDEST, is_file ? osPath.join(DEST, i[1]) : DEST, is_file ? "" : ".js");
  })).then(function(all) {
    var isNewer = false;
    for (var i = 0; i < all.length; i++) {
      if (all[i]) {
        isNewer = true; break;
      }
    }
    if (!isNewer && exArgs.nameCache && "timestamp" in exArgs.nameCache && cacheNames) {
      var path = getNameCacheFilePath(key);
      var stat = fs.existsSync(path) ? fs.statSync(path) : null;
      if (!stat || stat.mtime < exArgs.nameCache.timestamp - 4) {
        isNewer = true;
      }
    }
    if (!isNewer) { jsmin_status[taskOrder] = true; return cb(); }
    exArgs.passAll = true;
    var tasks = [];
    for (var i = 0; i < maps.length; i++) {
      const name = key + "/_" + (i + 1)
      const map = maps[i]
      const rollup = taskOrder === 0 && i === 0
      tasks.push(name);
      gulp.task(name, function() {
          const newExArgs = {...exArgs, rollup};
          if (exArgs.aggressiveMangle) {
            exArgs.aggressiveMangle = false;
          }
          return uglifyJSFiles(map[0], map[1], map[2], newExArgs);
      });
    }
    gulp.series(...tasks)(function(err) {
      jsmin_status[taskOrder] = true;
      saveNameCacheIfNeeded(key, exArgs.nameCache);
      cb(err);
    });
  });
}

function uglifyJSFiles(path, output, new_suffix, exArgs) {
  exArgs || (exArgs = {});
  const base = exArgs.base || JSDEST;
  path = formatPath(path, base);
  if (path.join("\n").indexOf("viewer.min.js") < 0) {
    path.push("!**/*.min.js");
  }
  output = output || ".";
  new_suffix = new_suffix !== "" ? (new_suffix || ".min") : "";

  var stream = gulp.src(path, { base: base });
  var isJson = !!exArgs.json;
  var ext = isJson ? ".json" : ".js";
  var is_file = output.endsWith(ext);

  if (!exArgs.passAll) {
    const newerTransform = newer(is_file ? {
      extra: exArgs.nameCachePath || null,
      dest: osPath.join(DEST, output)
    } : exArgs.nameCache ? {
      dest: DEST,
      ext: new_suffix + ext,
      extra: exArgs.passAll === false ? exArgs.nameCachePath || null
        : (exArgs.nameCachePath && path.push(exArgs.nameCachePath), path)
    } : {
      dest: DEST,
      extra: exArgs.nameCachePath || null,
      ext: new_suffix + ext
    });
    if (!is_file && exArgs.nameCachePath && exArgs.passAll !== false) {
      if (!("_bufferedFiles" in newerTransform)) {
        throw new Error("This version of `gulp-newer` is unsupported!");
      }
      newerTransform._bufferedFiles = [];
    }
    stream = stream.pipe(newerTransform);
  }
  let allPaths = null;
  if (is_file) {
    stream = stream.pipe(gulpMap(function(file) {
      allPaths = (allPaths || []).concat(file.history);
    }));
  }
  if (is_file) {
    if (willListEmittedFiles) {
      stream = stream.pipe(gulpPrint());
    }
    if (exArgs.rollup) {
      stream = rollupContent(stream)
    }
    stream = stream.pipe(require('gulp-concat')(output));
  }
  var nameCache = exArgs.nameCache;
  var stdConfig = loadUglifyConfig(!!nameCache);
  if (nameCache) {
    stdConfig.nameCache = nameCache;
  }
  if (!isJson) {
    stream = stream.pipe(gulpMap(beforeUglify));
  }
  const config = stdConfig;
  if (isJson) {
    stream = stream.pipe(gulpMap(uglifyJson));
  } else if (uglifyDistPasses > 0) {
    stream = stream.pipe(getGulpUglify(!!(exArgs.aggressiveMangle && config.mangle), uglifyDistPasses)(config));
    if (exArgs.aggressiveMangle) {
      exArgs.aggressiveMangle = false;
    }
  }
  if (!is_file && new_suffix !== "") {
     stream = stream.pipe(require('gulp-rename')({ suffix: new_suffix }));
  }
  if (!isJson) {
    stream = stream.pipe(gulpMap(function(file) {
      postUglify(file, allPaths);
    }));
  }
  if (willListEmittedFiles && !is_file) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(DEST));
}

function rollupContent(stream) {
  var Transform = require('stream').Transform;
  var transformer = new Transform({objectMode: true});
  var others = []
  var historys = []
  transformer._transform = function(srcFile, encoding, done) {
    if (/[\\\/]env./.test(srcFile.history.join(";"))) { // env.js
      this.push(srcFile);
    } else {
      others.push(srcFile)
    }
    historys = historys.concat(srcFile.history)
    done();
  };
  transformer._flush = function(done) {
    const file = others.filter(i => i.history.join(" ").includes("frontend."))[0];
    if (!file) {
      for (const i of others) { this.push(i) }
      return done();
    }
    const inputOptions = require("./scripts/rollup.config.js")
    inputOptions.input = require("path").relative(file.cwd, file.path)
    inputOptions.onwarn = (warning, rollupWarn) => {
      if (warning.code !== 'CIRCULAR_DEPENDENCY') {
        rollupWarn(warning);
      }
    }
    const outputOptions = inputOptions.output
    inputOptions.output = null
    outputOptions.file = null
    require("rollup").rollup(inputOptions)
    .then(builder => builder.generate(outputOptions))
    .then(result => {
      if (result === undefined) {
        return done("No rollup.js found");
      }
      var code = result.output[0].code
      code = inlineAllSetters(code)
      file.contents = Buffer.from(code)
      file.history = historys
      this.push(file)
      done()
    })
  };
  return stream.pipe(transformer)
}

function beforeCompile(file) {
  var allPathStr = file.history.join("|");
  var contents = null, changed = false, oldLen = 0;
  function get() { contents == null && (contents = ToString(file.contents), changed = true, oldLen = contents.length); }
  if (!locally && (allPathStr.includes("settings") || allPathStr.includes("commands")
      || allPathStr.includes("help_dialog") || allPathStr.includes("completion"))) {
    get();
    contents = contents.replace(/\b(const|let|var)?\s?As_\s?=[^,;]+[,;]/g, "").replace(/\bAs_\b/g, "");
  }
  if (changed || oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

var toRemovedGlobal = null;

function beforeUglify(file) {
  var allPathStr = file.history.join("|").replace(/\\/g, "/");
  var contents = null, changed = false, oldLen = 0;
  function get() { contents == null && (contents = ToString(file.contents), changed = true, oldLen = contents.length); }
  if (!locally && outputES6) {
    get();
    contents = contents.replace(/\bconst([\s{\[])/g, "let$1");
  }
  if (allPathStr.includes("/env.js")) {
    var btypes = getBuildItem("BTypes"), minCVer = getBuildItem("MinCVer");
    toRemovedGlobal = "";
    if (btypes === BrowserType.Chrome || !(btypes & BrowserType.Chrome)) {
      toRemovedGlobal += "browser|";
    }
    if (!(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsuredES6WeakMapAndWeakSet */ 36) {
      toRemovedGlobal += "Weak(Set|Map)|";
    }
    if (!(btypes & BrowserType.Chrome) || minCVer >= /* MinES6$ForOf$Map$SetAnd$Symbol */ 38) {
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
    if (getNonNullBuildItem("NDEBUG")) {
      toRemovedGlobal += "__filename|";
    }
    toRemovedGlobal = toRemovedGlobal.slice(0, -1);
    toRemovedGlobal = toRemovedGlobal && new RegExp(`(const|let|var|,)\\s?(${toRemovedGlobal})[,;]\n?\n?`, "g");
    const oldChanged = changed;
    get();
    let n = 0, remove = str => str[0] === "," ? str.slice(-1) : str.slice(-1) === "," ? str.split(/\s/)[0] + " " : "";
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
    changed = oldChanged || n > 0;
  }
  if (changed || oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

function postUglify(file, allPaths) {
  var allPathStr = (allPaths || file.history).join("|").replace(/\\/g, "/");
  var contents = null, changed = false, oldLen = 0;
  function get() { contents == null && (contents = ToString(file.contents), changed = true, oldLen = contents.length); }
  if (allPathStr.indexOf("extend_click") >= 0) {
    get();
    contents = patchExtendClick(contents);
  }
  var btypes = getBuildItem("BTypes"), minCVer = getBuildItem("MinCVer");
  var noAppendChild = !(btypes & BrowserType.Chrome) || minCVer >= /* MinEnsured$ParentNode$$appendAndPrepend */ 54;
  if (noAppendChild) {
    get();
    contents = contents.replace(/\bappendChild\b(?!\.call\([\w.]*doc)/g, "append");
  }
  if (allPathStr.includes("content/") || allPathStr.includes("lib/") && !allPathStr.includes("/env.js")) {
    get();
    contents = addMetaData(file.relative, contents)
  }
  if (changed || oldLen > 0 && contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

function uglifyJson(file) {
  var contents = ToString(file.contents), oldLen = contents.length;
  var data = JSON.parse(contents);
  contents = JSON.stringify(data);
  if (contents.length !== oldLen) {
    file.contents = ToBuffer(contents);
  }
}

function copyByPath(path, mapFunc, pipe) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST))
    .pipe(gulpMap(mapFunc || function(file) {
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
  stream = pipe ? stream.pipe(pipe) : stream;
  stream = stream
    .pipe(gulpChanged(DEST, {
      hasChanged: compareContentAndTouch
    }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(DEST));
}

function cleanByPath(path) {
  path = formatPath(path, DEST);
  return gulp.src(path, {
      base: ".", read: false, dot: true, allowEmpty: true, nodir: true
    }).pipe(require('gulp-clean')());
}

function formatPath(path, base) {
  if (typeof path === "string") {
    path = [path];
  } else {
    path = path.slice(0);
  }
  if (base && base !== ".") {
    for (var i = 0; i < path.length; i++) {
      var p = path[i];
      path[i] = p[0] !== "!" ? osPath.join(base, p) : "!" + osPath.join(base, p.slice(1));
    }
  }
  return path;
}

function compareContentAndTouch(stream, sourceFile, targetPath) {
  if (sourceFile.isNull()) {
    return gulpChanged.compareContents.apply(this, arguments);
  }
  var isSame = false, equals = sourceFile.contents.equals,
  newEquals = sourceFile.contents.equals = function(targetData) {
    var curIsSame = equals.apply(this, arguments);
    isSame || (isSame = curIsSame);
    return curIsSame;
  };
  return gulpChanged.compareContents.apply(this, arguments
  ).then(function() {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    if (!isSame) { return; }
    var sourcePath = sourceFile.history && sourceFile.history[0] || targetPath;
    if (targetPath.slice(-3) === ".js") {
      let sourcePath2 = sourcePath.slice(-3) === ".js" ? sourcePath.slice(0, -3) + ".ts" : sourcePath;
      if (fs.existsSync(sourcePath2)) { sourcePath = sourcePath2; }
    }
    if (touchFileIfNeeded(targetPath, sourcePath)) {
      var fileName = sourceFile.relative;
      print("Touch an unchanged file:", fileName.indexOf(":\\") > 0 ? fileName : fileName.replace(/\\/g, "/"));
    }
  }).catch(function(e) {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    throw e;
  });
}

function safeJSONParse(literalVal, defaultVal) {
  var newVal = defaultVal != null ? defaultVal : null;
  try {
    newVal = JSON.parse(literalVal);
  } catch (e) {}
  return newVal;
}

function readTSConfig(tsConfigFile, throwError) {
  if (tsConfigFile.lastIndexOf(".json") !== tsConfigFile.length - 5) {
    tsConfigFile += ".json";
  }
  var config = readJSON(tsConfigFile);
  if (!config) { return null; }
  var opts = config.compilerOptions || (config.compilerOptions = {});
  if (config.extends) {
    var baseFile = osPath.join(osPath.dirname(tsConfigFile), config.extends);
    var baseConfig = readTSConfig(baseFile, throwError), baseOptions = baseConfig.compilerOptions;
    if (baseConfig.build) {
      extendIf(config.build, baseConfig.build);
    }
    if (baseOptions) {
      if (baseOptions.plugins && opts.plugins) {
        var pluginNames = opts.plugins.map(function (i) { return i.name; });
        opts.plugins.unshift.apply(opts.plugins, baseOptions.plugins.filter(function (i) {
          return pluginNames.indexOf(i.name) < 0;
        }));
      }
      extendIf(opts, baseOptions);
    }
  }
  return config;
}

function loadValidCompilerOptions(tsConfigFile) {
  var tsconfig = readTSConfig(tsConfigFile, true);
  if (tsconfig.build) {
    buildConfig = tsconfig.build;
  }
  var opts = tsconfig.compilerOptions;
  if (buildConfig && opts.types) {
    opts.types = opts.types.filter(i => i !== "build");
  }
  if (opts.noImplicitUseStrict) {
    opts.alwaysStrict = false;
  }
  opts.removeComments = false;
  const arr = opts.plugins || [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name == "typescript-tslint-plugin") {
      arr.splice(i, 1);
    }
  }
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
  willListFiles   = !!opts.listFiles;
  willListEmittedFiles = !!opts.listEmittedFiles;
  return opts;
}

function loadTypeScriptCompiler(path) {
  if (gTypescript) { return; }
  tsOptionsCleaned = false;
  var typescript1;
  path = path || compilerOptions.typescript || null;
  if (typeof path === "string") {
    var exists1 = fs.existsSync(path), exists = exists1 || fs.existsSync(path + ".js");
    if (!exists) {
      var dir = "./node_modules/" + path;
      exists1 = fs.existsSync(dir);
      if (exists1 || fs.existsSync(dir + ".js")) { path = dir; exists = true; }
    }
    if (exists) {
      if (exists1 && fs.statSync(path).isDirectory()) {
        path = osPath.join(path, "typescript");
      }
      try {
        typescript1 = require(path);
      } catch (e) {}
    }
    if (path.startsWith("./node_modules/typescript/")) {
      print('Load the TypeScript dependency:', typescript1 != null ? "succeed" : "fail");
    } else {
      print('Load a customized TypeScript compiler:', typescript1 != null ? "succeed" : "fail");
    }
  }
  if (typescript1 == null) {
    typescript1 = require("typescript/lib/typescript");
  }
  gTypescript = compilerOptions.typescript = typescript1;
}

function removeSomeTypeScriptOptions() {
  if (tsOptionsCleaned) { return; }
  var hasOwn = Object.prototype.hasOwnProperty, toDelete = [], key, val;
  for (var key in compilerOptions) {
    if (key === "typescript" || key === "__proto__") { continue; }
    if (!hasOwn.call(compilerOptions, key)) { continue; }
    var declared = gTypescript.optionDeclarations.some(function(i) {
      return i.name === key;
    });
    declared || toDelete.push(key);
  }
  for (const key of ["incremental", "tsBuildInfoFile"]) {
    if (key in compilerOptions) {
      toDelete.push(key);
    }
  }
  for (var i = 0; i < toDelete.length; i++) {
    key = toDelete[i], val = compilerOptions[key];
    delete compilerOptions[key];
  }
  if (toDelete.length > 1) {
    print("Skip these TypeScript options:", toDelete.join(", "));
  } else if (toDelete.length === 1) {
    print("Skip the TypeScript option:", toDelete[0]);
  }
  tsOptionsCleaned = true;
}

var _buildConfigPrinted = false;
function getBuildConfigStream() {
  return gulp.src("typings/build/index.d.ts").pipe(gulpMap(function(file) {
    if (debugging && !_buildConfigPrinted) {
      _buildConfigPrinted = true;
      print("Current build config is:\n" + _buildConfigTSContent.trim());
    }
    file.contents = ToBuffer(_buildConfigTSContent);
    return file;
  }));
}

function ToBuffer(string) {
  return Buffer.from ? Buffer.from(string) : new Buffer(string);
}
function ToString(buffer) {
  return String(buffer);
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
    if (key === "Commit") {
      cached = [literalVal, [safeJSONParse(literalVal), locally ? null : getGitCommit()]];
    } else if (key === "MayOverrideNewTab") {
      if (!manifest.chrome_url_overrides || !manifest.chrome_url_overrides.newtab) {
        cached = buildOptionCache[key] = ["0", 0];
      }
    } else if (key.startsWith("Random")) {
      cached = [literalVal, getRandom];
    }
    cached && (buildOptionCache[key] = cached);
  }
  if (cached != null) {
    return parseBuildItem(key, cached[1]);
  }
  var env_key = key.replace(/[A-Z]+[a-z\d]*/g, word => "_" + word.toUpperCase()).replace(/^_/, "");
  var newVal = process.env["BUILD_" + env_key];
  if (!newVal) {
    newVal = process.env["BUILD_" + key];
  }
  if (newVal) {
    newVal = safeJSONParse(newVal);
    if (newVal != null) {
      LOCAL_SILENT || print("Use env:", "BUILD_" + key, "=", newVal);
      buildOptionCache[key] = [literalVal, newVal];
      return parseBuildItem(key, newVal);
    }
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

function print() {
  return logger.apply(null, arguments);
}

function checkAnyNewer(path, pathBase, dest, ext) {
  path = formatPath(path, pathBase);
  return new Promise(function(resolve, reject) {
    gulp.src(path, { base: pathBase })
      .pipe(newer(ext ? { dest: dest, ext: ext, } : { dest: dest, }))
      .pipe(gulpCheckEmpty(function(isEmpty) {
        resolve(!isEmpty);
      }))
    ;
  });
}

function gulpAllIfNotEmpty() {
  var Transform = require('stream').Transform;
  var b = new Transform({objectMode: true});
  var a = gulpCheckEmpty(function(isEmpty) {
    if (!isEmpty) {
      var arr = b.files;
      for (var i = 0; i < arr.length; i++) {
        this.push(arr[i]);
      }
    }
  });
  b.files = [];
  b._transform = function(srcFile, encoding, done) {
    this.files.push(srcFile);
    this.push(srcFile);
    done();
  };
  return {
    cond: a,
    prepare: b,
  };
}

function gulpCheckEmpty(callback, log) {
  var Transform = require('stream').Transform;
  var a = new Transform({objectMode: true});
  a._empty = true;
  a._transform = function(srcFile, encoding, done) {
    a._empty = false;
    done();
  };
  a._flush = function(done) {
    callback.call(a, a._empty);
    done();
  };
  return a;
}

function gulpMap(map) {
  var Transform = require('stream').Transform;
  var transformer = new Transform({objectMode: true});
  transformer._transform = function(srcFile, encoding, done) {
    var dest = map(srcFile);
    this.push(dest || srcFile);
    done();
  };
  transformer._flush = function(done) { done(); };
  return transformer;
}

function gulpMerge() {
  var Transform = require('stream').Transform;
  var knownFiles = {};
  var ref = 0;
  var merged = new Transform({objectMode: true});
  var push = function(srcFile, encoding, done) {
    var path = "@" + srcFile.history[0];
    if (! knownFiles[path]) {
      knownFiles[path] = 1;
      merged.push(srcFile);
    }
    done();
  }, flush = function(done) {
    ref--;
    if (ref === 0) {
      merged.push(null);
    }
    done();
  };
  merged.attachSource = function() {
    var proxy = new Transform({objectMode: true});
    proxy._transform = push;
    proxy._flush = flush;
    ref++;
    return proxy;
  };
  return merged;
}

function patchExtendClick(source) {
  //@ts-check
  if (locally && envLegacy) { return source; }
  if (!(getBuildItem("BTypes") & ~BrowserType.Firefox)) { return source; }
  const patched = _patchExtendClick(source, locally, logger);
  if (typeof patched === "string") { return patched; }
  let inCode, inJSON;
  if (getNonNullBuildItem("NDEBUG") && !+(process.env.EMBED_EXTEND_CLICK || 0)) {
    const n1 = patched[0].endsWith("||'") ? 3 : patched[0].endsWith("|| '") ? 4 : 0;
    if (!n1 || patched[2][0] !== "'") {
      throw Error("Error: can not extract extend_click from the target code file!!!");
    }
    inCode = patched[0].slice(0, -n1) + patched[2].slice(1);
    inJSON = patched[1];
  } else {
    inCode = patched.join(""); inJSON = "";
  }
  if (inJSON) {
    if (inJSON.includes("'")) { throw Error("Error: extend_click should not include `'`"); }
    if (inJSON.includes('\\"')) { throw Error('Error: extend_click should not include `\\"`'); }
    inJSON = inJSON.replace(/"/g, "'");
    if (inJSON.includes("$")) {
      if (!/\bzz\b/.test(inJSON)) {
        inJSON = inJSON.replace(/\$/g, "zz");
      } else {
        throw Error('Error: can not escape `$` in extend_click');
      }
    }
  }
  const jsonPath = DEST + "/_locales/en/messages.json";
  print("Save extend_click into en/messages.json")
  const json = JSON.parse(readFile(jsonPath));
  if (inJSON) {
    json[/** kTip.extendClick */ "99"] = { message: inJSON };
  } else {
    delete json[99];
  }
  fs.writeFileSync(jsonPath, JSON.stringify(json));
  logger("%o: %o %s", ":extend_click", inJSON.length, inJSON ? "bytes" : "(embeded)");
  return inCode;
}

function getGulpUglify(aggressiveMangle, unique_passes) {
  var compose = require('gulp-uglify/composer');
  var logger = require('gulp-uglify/lib/log');
  var uglify = require(LIB_UGLIFY_JS);
  var aggressive = aggressiveMangle && require("./scripts/uglify-mangle")
  const passes = unique_passes && unique_passes > 1 ? unique_passes : 0
  if (passes) {
    var multipleUglify = {
      minify: function (files, config) {
        let firstOut = (aggressive || uglify).minify(files, { ...config,
          mangle: aggressive ? config.mangle : null,
          output: { ...config.output, comments: /^[!@#]/, preserve_annotations: true,
              ast: !aggressive, code: !!aggressive },
        }), ast = aggressive ? firstOut.code : firstOut.ast;
        if (firstOut.error) { return firstOut; }
        for (let i = 1; i < unique_passes - 1; i++) {
          ast = uglify.minify(ast, { ...config,
            output: { ...config.output, comments: /^[!@#]/, preserve_annotations: true, ast: true, code: false },
            mangle: null,
          }).ast
        }
        return uglify.minify(ast, { ...config, mangle: aggressive ? null : config.mangle,
          output: { ...config.output, comments: gNoComments ? false : /^!/,
            preserve_annotations: false, ast: false, code: true },
        })
      }
    }
  }
  return compose(
    passes ? multipleUglify : aggressive || uglify,
    logger
  );
}

function loadUglifyConfig(reload) {
  var a = _loadUglifyConfig(locally ? "scripts/uglifyjs.local.json" : "scripts/uglifyjs.dist.json", reload);
  {
    if (FORCED_NO_UGLIFY || !getNonNullBuildItem("NDEBUG")) {
      a.mangle = false;
      a.output.beautify = true;
      a.output.indent_level = 2;
    }
    if (outputES6) {
      a.ecma = 6;
      var c = a.compress || (a.compress = {});
      c.hoist_vars = false;
    } else {
      a.ecma = 5;
    }
  }
  if (gNoComments || !locally && getNonNullBuildItem("NDEBUG")) {
    a.output.comments = /^!/;
  }
  return a;
}

function getNameCacheFilePath(path) {
  if (path.indexOf(".cache") >= 0 ) {
    return path;
  }
  return osPath.join(JSDEST, ".names-" + path.replace("min/", "") + ".cache");
}

function saveNameCacheIfNeeded(key, nameCache) {
  if (nameCache && cacheNames) {
    nameCache.timestamp = 0;
    const path = getNameCacheFilePath(key);
    if (fs.existsSync(path)) {
      const oldCache = readJSON(path);
      oldCache.timestamp = 0;
      if (JSON.stringify(oldCache) === JSON.stringify(nameCache)) {
        print("NameCache for " + key.replace("min/", "") + " is unchanged");
        return;
      }
    }
    nameCache.timestamp = Date.now();
    fs.writeFileSync(path, JSON.stringify(nameCache));
    print("Saved nameCache for " + key.replace("min/", ""));
  }
}

function loadNameCache(path) {
  var nameCache = cacheNames ? readJSON(getNameCacheFilePath(path), false) : null;
  if (nameCache) {
    print("Loaded nameCache of " + path);
  }
  return nameCache || { vars: {}, props: {}, timestamp: 0 };
}

var _randMap, _randSeed;
function getRandom(id) {
  var rand = _randMap ? _randMap[id] : 0;
  if (rand) {
    if ((typeof rand === "string") === locally) {
      return rand;
    }
  }
  if (!_randMap) {
    _randMap = {};
    _randSeed = `${osPath.resolve(__dirname).replace(/\\/g, "/")}@${parseInt(fs.statSync("manifest.json").mtimeMs)}/`;
    var rng;
    if (!locally) {
      try {
        rng = require('seedrandom');
      } catch (e) {}
    }
    if (rng) {
      _randSeed = rng = rng(_randSeed);
    }
  }
  if (!locally) {
    while (!rand || Object.values(_randMap).includes(rand)) {
      /** {@see #GlobalConsts.SecretRange} */
      rand = 1e6 + (0 | ((typeof _randSeed === "function" ? _randSeed() : Math.random()) * 9e6));
    }
  } else {
    var hash = _randSeed + id;
    hash = compute_hash(hash);
    hash = hash.slice(0, 7);
    rand = hash;
  }
  _randMap[id] = rand;
  return rand;
}

function compute_hash(str) {
  var crypto = require('crypto');
  var md5 = crypto.createHash('sha1');
  md5.update(str)
  return md5.digest('hex');
}
