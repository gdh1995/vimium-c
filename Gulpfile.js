"use strict";
var fs = require("fs");
var gulp = require("gulp");
var logger = require("fancy-log");
var changed = require('gulp-changed');
var ts = require("gulp-typescript");
var newer = require('gulp-newer');
var gulpPrint = require('gulp-print');
var gulpSome = require('gulp-some');
var osPath = require('path');

class BrowserType {}
Object.assign(BrowserType, {
  Chrome: 1,
  Firefox: 2,
  Edge: 4
});

const LIB_UGLIFY_JS = 'terser';
var DEST, enableSourceMap, willListFiles, willListEmittedFiles, JSDEST;
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
var gNoComments = process.env.NO_COMMENT === "1";
var disableErrors = process.env.SHOW_ERRORS !== "1" && (process.env.SHOW_ERRORS === "0" || !compileInBatch);
var forcedESTarget = (process.env.TARGET || "").toLowerCase();
var ignoreHeaderChanges = process.env.IGNORE_HEADER_CHANGES !== "0";
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json", false);
var has_dialog_ui = manifest.options_ui != null && manifest.options_ui.open_in_tab !== true;
var jsmin_status = [false, false, false];
var buildOptionCache = Object.create(null);
var onlyES6 = false;
gulpPrint = gulpPrint.default || gulpPrint;

createBuildConfigCache();
var has_polyfill = !!(getBuildItem("BTypes") & BrowserType.Chrome)
    && getBuildItem("MinCVer") < 44 /* MinSafe$String$$StartsWith */;
var may_have_newtab = getNonNullBuildItem("MayOverrideNewTab") > 0;
var es6_viewer = false;
// es6_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome) || getBuildItem("MinCVer") >= 52;
const POLYFILL_FILE = "lib/polyfill.ts", NEWTAB_FILE = "pages/newtab.ts";
const VIEWER_JS = "lib/viewer.min.js";
const FILE_URLS_CSS = "front/file_urls.css";

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
    const path = ["lib/*.min.js"];
    es6_viewer && path.push("!" + VIEWER_JS);
    return copyByPath(path);
  },
  "static/uglify": function() {
    const path = ["lib/math_parser*.js"];
    // todo: currently, generated es6 code of viewer.js always breaks (can not .shown()), so disable it
    es6_viewer && path.push(VIEWER_JS);
    if (!getNonNullBuildItem("NDEBUG")) {
      return copyByPath(path);
    }
    return uglifyJSFiles(path, ".", "", { base: "." });
  },
  static: ["static/special", "static/uglify", function() {
    var arr = ["front/*", "pages/*", "icons/*", "lib/*.css"
      , "settings_template.json", "*.txt", "*.md"
      , "!**/manifest*.json"
      , "!**/*.log", "!**/*.psd", "!**/*.zip", "!**/*.tar", "!**/*.tgz", "!**/*.gz"
      , '!**/*.ts', "!**/*.js", "!**/tsconfig*.json"
      , "!test*", "!todo*"
    ];
    may_have_newtab || arr.push("!" + NEWTAB_FILE.replace(".ts", ".*"));
    getBuildItem("BTypes") & BrowserType.Chrome || arr.push("!" + FILE_URLS_CSS);
    es6_viewer && arr.push("!" + VIEWER_JS);
    var has_wordsRe = getBuildItem("BTypes") & ~BrowserType.Firefox
            && getBuildItem("MinCVer") <
                59 /* min(MinSelExtendForwardOnlySkipWhitespaces, MinEnsuredUnicodePropertyEscapesInRegExp) */
        || getBuildItem("BTypes") & BrowserType.Firefox && !getNonNullBuildItem("NativeWordMoveOnFirefox");
    if (!has_wordsRe) {
      arr.push("!front/words.txt");
      gulp.series(function() { return cleanByPath("front/words.txt"); })();
    }
    if (!has_dialog_ui) {
      arr.push("!*/dialog_ui.*");
    }
    return copyByPath(arr);
  }],

  "build/scripts": ["build/background", "build/content", "build/front"],
  "build/_clean_diff": function() {
    return cleanByPath([".build/**", "manifest.json", "lib/polyfill.js", "pages/dialog_ui.*", "*/vomnibar.html"
      , "**/*.js"
      , FILE_URLS_CSS]);
  },
  "build/_all": ["build/scripts", "build/options", "build/show"],
  "build/ts": function(cb) {
    var btypes = getBuildItem("BTypes");
    var curConfig = [btypes, getBuildItem("MinCVer"), envSourceMap, envLegacy, compilerOptions.target];
    var configFile = btypes === BrowserType.Chrome ? "chrome"
          : btypes === BrowserType.Firefox ? "firefox" : "browser-" + btypes;
    if (btypes === BrowserType.Firefox) {
      curConfig[1] = getNonNullBuildItem("MinFFVer");
      curConfig.push(getNonNullBuildItem("FirefoxID"));
      curConfig.push(getNonNullBuildItem("NativeWordMoveOnFirefox"));
    }
    if (needCommitInfo) {
      curConfig.push(getNonNullBuildItem("Commit"));
    }
    curConfig.push(getNonNullBuildItem("NDEBUG"));
    curConfig.push(getNonNullBuildItem("MayOverrideNewTab"));
    curConfig = JSON.stringify(curConfig);
    configFile = osPath.join(JSDEST, "." + configFile + ".build");
    var needClean = true;
    try {
      var oldConfig = readFile(configFile);
      needClean = oldConfig !== curConfig;
    } catch (e) {}
    if (needClean) {
      print("found diff:", oldConfig || "(unknown)", "!=", curConfig);
      gulp.series("build/_clean_diff")(function() {
        if (!fs.existsSync(JSDEST)) {
          fs.mkdirSync(JSDEST, {recursive: true});
        }
        fs.writeFileSync(configFile, curConfig);
        gulp.series("build/_all")(cb);
      });
    } else {
      gulp.series("build/_all")(cb);
    }
  },

  "min/content": function(cb) {
    var cs = manifest.content_scripts[0], sources = cs.js;
    if (sources.length <= 1 || jsmin_status[0]) {
      jsmin_status[0] = true;
      return cb();
    }
    cs.js = ["content/vimium-c.js"];
    var exArgs = { nameCache: { vars: {}, props: {}, timestamp: 0 } };
    var rest = ["content/*.js"];
    for (var arr = sources, i = 0, len = arr.length; i < len; i++) { rest.push("!" + arr[i]); }
    var maps = [
      [sources.slice(0), cs.js[0], null], [rest, ".", ""]
    ];
    checkJSAndUglifyAll(0, maps, "min/content", exArgs, cb);
  },
  "min/bg": ["min/content", function(cb) {
    if (jsmin_status[1]) {
      return cb();
    }
    var exArgs = { nameCache: loadNameCache("content") };
    var config = loadUglifyConfig(!!exArgs.nameCache);
    config.nameCache = exArgs.nameCache;
    require(LIB_UGLIFY_JS).minify("var CommandsData_, Completion_ \
      , ContentSettings_, FindModeHistory_, Marks_, TabRecency_, Clipboard_ \
      , Utils, OnOther, BrowserProtocol_, ChromeVer, Settings, Backend \
      ;", config);

    var sources = manifest.background.scripts;
    sources = ("\n" + sources.join("\n")).replace(/\n\//g, "\n").trim().split("\n");
    var ori_sources = sources.slice(0);
    // on Firefox, a browser-inner file `resource://devtools/server/main.js` is also shown as `main.js`
    // which makes debugging annoying
    var body = sources.splice(0, sources.indexOf("background/main.js") + 1, "background/body.js");
    var index = sources.indexOf("background/tools.js");
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
    if (exArgs.nameCache.vars && exArgs.nameCache.props) {
      let {vars: {props: vars}, props: {props: props}} = exArgs.nameCache;
      const remembed = [];
      for (let key in vars) {
        if (vars.hasOwnProperty(key)) {
          if (props[key] != null) {
            throw new Error('The name cache #bg can not be used to build others: values differ for ' + key);
          }
          props[key] = vars[key];
          remembed.push(key.replace("$", ""));
        }
      }
      remembed.sort();
      console.log("Treat global variables as properties:", remembed.join(", "));
    }
    gulp.task("min/others/omni", function() {
      return uglifyJSFiles(["front/vomnibar*.js"], ".", "", {
        nameCache: exArgs.nameCache
      });
    });
    gulp.task("min/others/options", function() {
      exArgs.passAll = null;
      return uglifyJSFiles(["pages/options_base.js", "pages/options.js", "pages/options_*.js"], ".", "", exArgs);
    });
    gulp.task("min/others/misc", function() {
      var oriManifest = readJSON("manifest.json", true);
      var res = ["**/*.js", "!background/*.js", "!content/*.js", "!front/vomnibar*", "!pages/options*"];
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
      return uglifyJSFiles(res, ".", "", exArgs);
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
      delete manifest.background.persistent;
    } else if (minVer && minVer < 999) {
      manifest.minimum_chrome_version = "" + (minVer | 0);
    }
    if (browser === BrowserType.Chrome) {
      delete manifest.browser_specific_settings;
    } else if (browser === BrowserType.Firefox) {
      manifest.permissions.splice(manifest.permissions.indexOf("contentSettings") || manifest.length, 1);
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
    return cleanByPath([".build/**", "**/*.js"
      , "front/vomnibar.html", "front/words.txt"]);
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
    compile(["*/*.ts"], false, done);
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
  tslint: function (done) {
    var node = process.argv[0];
    process.argv = [node, ..."./node_modules/tslint/bin/tslint --project .".split(" ")];
    require(process.argv[1]);
    done();
  },
  lint: ["tslint"],
  local2: function(cb) {
    gNoComments = true;
    compilerOptions.removeComments = true;
    locally = true;
    var arr = ["static", "_manifest"];
    if (fs.existsSync(osPath.join(JSDEST, "lib/utils.js"))) {
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
  compilerOptions = loadValidCompilerOptions("tsconfig.json", true);
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
  es6_viewer = false;
  // es6_viewer = !(getBuildItem("BTypes") & BrowserType.Chrome) || getBuildItem("MinCVer") >= 52;
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
  compilerOptions.outDir = JSDEST;
  enableSourceMap = false;
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
      "!types/**/*.ts", "!types/*.d.ts", "!node_modules/**/*.ts");
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
  removeUnknownOptions();
  return disableErrors ? ts(compilerOptions, ts.reporter.nullReporter()) : ts(compilerOptions);
}

var _mergedProject = null, _mergedProjectInput = null;
function compile(pathOrStream, header_files, done, options) {
  if (typeof pathOrStream === "string") {
    pathOrStream = [pathOrStream];
  }
  if (pathOrStream instanceof Array) {
    pathOrStream.push("!types/**/*.ts");
    pathOrStream.push("!types/*.ts");
  }
  var stream = pathOrStream instanceof Array ? gulp.src(pathOrStream, { base: "." }) : pathOrStream;
  var extra = ignoreHeaderChanges || header_files === false ? undefined
    : ["types/**/*.d.ts", "types/*.d.ts", "!types/build/*.ts"].concat(header_files
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
    if (enableSourceMap) {
      merged = merged.pipe(require('gulp-sourcemaps').init());
    }
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
    if (doesUglifyLocalFiles) {
      var config = loadUglifyConfig();
      stream = stream.pipe(getGulpUglify()(config));
    }
    stream = stream.pipe(gulpMap(function(file) {
      postUglify(file, file.history.join("|").indexOf("extend_click") >= 0);
    }));
  }
  stream = stream.pipe(changed(JSDEST, {
    hasChanged: compareContentAndTouch
  }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(require('gulp-sourcemaps').write(".", {
      sourceRoot: ""
    }));
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
      var name = key + "/_" + (i + 1);
      tasks.push(name);
      gulp.task(name, (function(map) {
        return function() {
          return uglifyJSFiles(map[0], map[1], map[2], exArgs);
        }
      })(maps[i]));
    }
    gulp.series(...tasks)(function() {
      jsmin_status[taskOrder] = true;
      saveNameCacheIfNeeded(key, exArgs.nameCache);
      cb();
    });
  });
}

function uglifyJSFiles(path, output, new_suffix, exArgs) {
  const base = exArgs && exArgs.base || JSDEST;
  path = formatPath(path, base);
  if (path.join("\n").indexOf("viewer.min.js") < 0) {
    path.push("!**/*.min.js");
  }
  output = output || ".";
  new_suffix = new_suffix !== "" ? (new_suffix || ".min") : "";
  exArgs || (exArgs = {});

  var stream = gulp.src(path, { base: base });
  var is_file = output.endsWith(".js");
  if (!exArgs.passAll) {
    stream = stream.pipe(newer(is_file ? {
      extra: exArgs.nameCachePath || null,
      dest: osPath.join(DEST, output)
    } : exArgs.nameCache ? {
      dest: DEST,
      ext: new_suffix + ".js",
      extra: exArgs.passAll === false ? exArgs.nameCachePath || null
        : (exArgs.nameCachePath && path.push(exArgs.nameCachePath), path)
    } : {
      dest: DEST,
      extra: exArgs.nameCachePath || null,
      ext: new_suffix + ".js"
    }));
  }
  let needPatch = false;
  if (enableSourceMap) {
    stream = stream.pipe(require('gulp-sourcemaps').init({ loadMaps: true }));
  } else {
    stream = stream.pipe(gulpMap(function(file) {
      if (file.history.join("|").indexOf("extend_click") >= 0) {
        needPatch = true;
      }
    }));
  }
  if (is_file) {
    if (willListEmittedFiles) {
      stream = stream.pipe(gulpPrint());
    }
    stream = stream.pipe(require('gulp-concat')(output));
  }
  var config = loadUglifyConfig(!!exArgs.nameCache);
  if (exArgs.nameCache) {
    config.nameCache = exArgs.nameCache;
    patchGulpUglify();
  }
  stream = stream.pipe(getGulpUglify()(config));
  if (!is_file && new_suffix !== "") {
     stream = stream.pipe(require('gulp-rename')({ suffix: new_suffix }));
  }
  stream = stream.pipe(gulpMap(function(file) {
    postUglify(file, needPatch);
  }));
  if (willListEmittedFiles && !is_file) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(require('gulp-sourcemaps').write(".", {
      sourceRoot: "/"
    }));
  }
  return stream.pipe(gulp.dest(DEST));
}

function postUglify(file, needToPatchExtendClick) {
  var contents = String(file.contents), changed = false;
  if (onlyES6 && !locally) {
    contents = contents.replace(/\bconst([\s{\[])/g, "let$1");
    changed = true;
  }
  if (needToPatchExtendClick) {
    contents = patchExtendClick(contents);
    changed = true;
  }
  if (changed) {
    file.contents = new Buffer(contents);
  }
}

function copyByPath(path) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST))
    .pipe(gulpMap(function(file) {
      var fileName = file.history.join("|");
      if (fileName.indexOf("vimium.min.css") >= 0) {
        file.contents = new Buffer(String(file.contents).replace(/\r\n?/g, "\n"));
      } else if (fileName.indexOf("vomnibar.html") >= 0
          && getBuildItem("BTypes") === BrowserType.Firefox) {
        file.contents = new Buffer(String(file.contents).replace(/(\d)px\b/g, "$1rem"
            ).replace(/body ?\{/, "html{font-size:1px;}\nbody{"));
      }
    }))
    .pipe(changed(DEST, {
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
    return changed.compareContents.apply(this, arguments);
  }
  var isSame = false, equals = sourceFile.contents.equals,
  newEquals = sourceFile.contents.equals = function(targetData) {
    var curIsSame = equals.apply(this, arguments);
    isSame || (isSame = curIsSame);
    return curIsSame;
  };
  return changed.compareContents.apply(this, arguments
  ).then(function() {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    if (!isSame) { return; }
    var fd = fs.openSync(targetPath, "a"), len1 = targetPath.length, fd2 = null;
    try {
      var s = s = fs.fstatSync(fd);
      if (s.mtime != null && len1 > 3 && targetPath.indexOf(".js", len1 - 3) > 0) {
        var src = (sourceFile.history && sourceFile.history[0] || targetPath).slice(0, -3) + ".ts";
        if (fs.existsSync(src)) {
          var mtime = fs.fstatSync(fd2 = fs.openSync(src, "r")).mtime;
          if (mtime != null && mtime < s.mtime) {
            return;
          }
        }
      }
      fs.futimesSync(fd, parseInt(s.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
      var fileName = sourceFile.relative;
      print("Touch an unchanged file:", fileName.indexOf(":\\") > 0 ? fileName : fileName.replace(/\\/g, "/"));
    } finally {
      fs.closeSync(fd);
      if (fd2 != null) {
        fs.closeSync(fd2);
      }
    }
  }).catch(function(e) {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    throw e;
  });
}

function readFile(fileName, info) {
  info == null && (info = {});
  var buffer = fs.readFileSync(fileName);
  var len = buffer.length;
  if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
      // flip all byte pairs and treat as little endian.
      len &= ~1;
      for (var i = 0; i < len; i += 2) {
          const temp = buffer[i];
          buffer[i] = buffer[i + 1];
          buffer[i + 1] = temp;
      }
      info.bom = "\uFFFE";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // Little endian UTF-16 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf16le", 2);
  }
  if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      // UTF-8 byte order mark detected
      info.bom = "\uFEFF";
      return buffer.toString("utf8", 3);
  }
  info.bom = "";
  // Default is UTF-8 with no byte order mark
  return buffer.toString("utf8");
}

function _makeJSONReader() {
  var stringOrComment = /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*[^]*?\*\//g
    , notLF = /[^\r\n]+/g, notWhiteSpace = /\S/;
  function spaceN(str) {
    return ' '.repeat(str.length);
  }
  function onReplace(str) {
    switch (str[0]) {
    case '/': case '#':
      if (str[0] === "/*") {
        // replace comments with whitespace to preserve original character positions
        return str.replace(notLF, spaceN);
      }
      return spaceN(str);
    case '"': case "'": // falls through
    default:
      return str;
    }
  }
  function readJSON(fileName, throwError) {
    var text = readFile(fileName);
    text = text.replace(stringOrComment, onReplace);
    try {
      return notWhiteSpace.test(text) ? JSON.parse(text) : {};
    } catch (e) {
      if (throwError === true) {
        throw e;
      }
      var err = "Failed to parse file '" + fileName + "': " + e + ".";
      console.warn("%s", err);
      return {};
    }
  }
  global._readJSON = readJSON;
}

function safeJSONParse(literalVal, defaultVal) {
  var newVal = defaultVal != null ? defaultVal : null;
  try {
    newVal = JSON.parse(literalVal);
  } catch (e) {}
  return newVal;
}

function readJSON(fileName, throwError) {
  if (!global._readJSON) {
    _makeJSONReader();
  }
  return _readJSON(fileName, throwError);
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

function loadValidCompilerOptions(tsConfigFile, keepCustomOptions) {
  var tsconfig = readTSConfig(tsConfigFile, true);
  if (tsconfig.build) {
    buildConfig = tsconfig.build;
  }
  var opts = tsconfig.compilerOptions;
  if (buildConfig && opts.types) {
    opts.types = opts.types.filter(i => i !== "build");
  }
  if (!keepCustomOptions && (keepCustomOptions === false || !opts.typescript)) {
    delete opts.inferThisForObjectLiterals;
    delete opts.narrowFormat;
  }
  if (opts.noImplicitUseStrict) {
    opts.alwaysStrict = false;
  }
  if (gNoComments) {
    opts.removeComments = true;
  }
  const arr = opts.plugins || [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].name == "typescript-tslint-plugin") {
      arr.splice(i, 1);
    }
  }
  opts.target = forcedESTarget || locally && opts.target || "es5";
  var oldTS = gTypescript || compilerOptions && compilerOptions.typescript;
  if (oldTS && !opts.typescript) {
    opts.typescript = oldTS;
  }
  DEST = opts.outDir;
  DEST = process.env.LOCAL_DIST || DEST;
  if (!DEST || DEST === ".") {
    DEST = opts.outDir = "dist";
  }
  JSDEST = osPath.join(DEST, ".build");
  enableSourceMap = !!opts.sourceMap && envSourceMap;
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

function removeUnknownOptions() {
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
  return gulp.src("types/build/index.d.ts").pipe(gulpMap(function(file) {
    if (debugging && !_buildConfigPrinted) {
      _buildConfigPrinted = true;
      print("Current build config is:\n" + _buildConfigTSContent);
    }
    file.contents = new Buffer(_buildConfigTSContent);
    return file;
  }));
}

var _buildConfigTSContent;
function createBuildConfigCache() {
  _buildConfigTSContent = _buildConfigTSContent || readFile("types/build/index.d.ts");
  _buildConfigTSContent = _buildConfigTSContent.replace(/\b([A-Z]\w+)\s?=\s?([^,}]+)/g, function(_, key, literalVal) {
    var newVal = getBuildItem(key, literalVal);
    return key + " = " + (newVal != null ? JSON.stringify(newVal) : buildOptionCache[key][0]);
  });
  if (!(getBuildItem("BTypes") & (BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge))) {
    throw new Error("Unsupported Build.BTypes: " + getBuildItem("BTypes"));
  }
  var btypes = getBuildItem("BTypes"), cver = getBuildItem("MinCVer");
  onlyES6 = !(btypes & BrowserType.Chrome && cver < /* MinTestedES6Environment */ 49);
  compilerOptions.target = onlyES6 ? "es6" : "es5";
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
      cached = [literalVal, [safeJSONParse(literalVal), getGitCommit()]];
    } else if (key === "MayOverrideNewTab") {
      if (!manifest.chrome_url_overrides || !manifest.chrome_url_overrides.newtab) {
        cached = buildOptionCache[key] = ["0", 0];
      }
    }
    cached && (buildOptionCache[key] = cached);
  }
  if (cached != null) {
    return parseBuildItem(key, cached[1]);
  }
  var env_key = key.replace(/[A-Z]+[a-z0-9]*/g, word => "_" + word.toUpperCase()).replace(/^_/, "");
  var newVal = process.env["BUILD_" + env_key];
  if (!newVal) {
    newVal = process.env["BUILD_" + key];
  }
  if (newVal) {
    newVal = safeJSONParse(newVal);
    if (newVal != null) {
      print("Use env:", "BUILD_" + key, "=", newVal);
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
  if (newVal == null) {
    if (key === "NoDialogUI") {
      newVal = !has_dialog_ui;
    }
  }
  return newVal;
}

function getGitCommit() {
  if (locally) { return null; }
  try {
    var branch = readFile(".git/HEAD");
    branch = branch && branch.replace("ref:", "").trim();
    if (branch) {
      var commit = readFile(".git/" + branch);
      return commit ? commit.trim().slice(0, 7) : null;
    }
  } catch (e) {}
  return null;
}

function extendIf(b, a) {
  Object.setPrototypeOf(a, null);
  for (const i in a) {
    (i in b) || (b[i] = a[i]);
  }
  return b;
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
  if (locally && envLegacy) { return source; }
  print('Patch the extend_click module');
  source = source.replace(/(addEventListener|toString) ?: ?function ?\w*/g, "$1");
  let match = /\/: \?function \\w\+\/g, ?(""|'')/.exec(source);
  if (match) {
    const start = Math.max(0, match.index - 128), end = match.index;
    let prefix = source.slice(0, start), suffix = source.slice(end);
    source = source.slice(start, end).replace(/>= ?45/, "< 45").replace(/45 ?<=/, "45 >");
    suffix = '/\\b(addEventListener|toString)\\(/g, "$1:function $1("' + suffix.slice(match[0].length);
    source = prefix + source + suffix;
  }
  match = /' ?\+ ?\(?function VC ?\(/.exec(source);
  if (match) {
    const start = match.index;
    const end = source.indexOf('}).toString()', start) + 1 || source.indexOf('}.toString()', start) + 1;
    let end2 = source.indexOf('")();"', end + 2) + 1 || source.indexOf("')();'", end + 2) + 1;
    if (end2 <= 0) {
      throw new Error('Can not find the end ".toString() + \')();\'" around the injected function.');
    }
    let prefix = source.slice(0, start), suffix = source.slice(end2 + ")();'".length);
    source = source.slice(start + match[0].length, end).replace(/ \/\/[^\n]*?$/g, "").replace(/'/g, '"');
    source = source.replace(/\\/g, "\\\\");
    if (locally) {
      source = source.replace(/([\r\n]) {4}/g, "$1").replace(/\r\n?|\n/g, "\\n\\\n");
    } else {
      source = source.replace(/[\r\n]\s*/g, "");
    }
    source = "function(" + source;
    source = prefix + source + ")();'" + suffix;
  } else if (! /= ?'"use strict";\(function\b/.test(source)) {
    logger.error("Error: can not wrap extend_click scripts!!!");
  }
  return source;
}

function getGulpUglify() {
  var compose = require('gulp-uglify/composer');
  var logger = require('gulp-uglify/lib/log');
  var uglify = require(LIB_UGLIFY_JS);
  return compose(
    uglify,
    logger
  );
}

var _gulpUglifyPatched = false;
function patchGulpUglify() {
  if (_gulpUglifyPatched) { return; }
  var path = "node_modules/gulp-uglify/lib/minify.js";
  var info = {};
  try {
    var minify_tmpl = readFile(path, info);
    if (! /nameCache\s*=/.test(minify_tmpl)) {
      minify_tmpl = minify_tmpl.replace(/\b(\w+)\s?=\s?setup\(([^)]+)\)(.*?);/
          , "$1 = setup($2)$3;\n      $1.nameCache = ($2).nameCache || null;");
      fs.writeFileSync(path, minify_tmpl);
      print("Patch gulp-uglify: succeed");
    }
  } catch (e) {
    logger.error("Error: Failed to patch gulp-uglify: " + e);
  }
  _gulpUglifyPatched = true;
}

var _uglifyjsConfig = null;
function loadUglifyConfig(reload) {
  let a = _uglifyjsConfig;
  if (a == null || reload) {
    a = readJSON(locally ? "scripts/uglifyjs.local.json" : "scripts/uglifyjs.dist.json");
    if (!reload) {
      _uglifyjsConfig = a;
    }
    a.output || (a.output = {});
    var c = a.compress || (a.compress = {}); // gd = c.global_defs || (c.global_defs = {});
    if (typeof c.keep_fnames === "string") {
      let re = c.keep_fnames.match(/^\/(.*)\/([a-z]*)$/);
      c.keep_fnames = new RegExp(re[1], re[2]);
    }
    if (!getNonNullBuildItem("NDEBUG")) {
      a.mangle = false;
      a.output.beautify = true;
      a.output.comments = true;
      a.output.indent_level = 2;
    }
    var m = a.mangle, p = m && m.properties;
    if (p && typeof p.regex === "string") {
      let re = p.regex.match(/^\/(.*)\/([a-z]*)$/);
      p.regex = new RegExp(re[1], re[2]);
    }
    if (m && typeof m.keep_fnames === "string") {
      let re = m.keep_fnames.match(/^\/(.*)\/([a-z]*)$/);
      m.keep_fnames = new RegExp(re[1], re[2]);
    }
    else if (m && !typeof m.keep_fnames) {
      m.keep_fnames = c.keep_fnames;
    }
    if (onlyES6) {
      a.ecma = 6;
      c.hoist_vars = false;
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
    nameCache.timestamp = Date.now(); // safe for (ignore) time changes
    fs.writeFileSync(getNameCacheFilePath(key), JSON.stringify(nameCache));
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
