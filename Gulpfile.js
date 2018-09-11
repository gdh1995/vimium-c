"use strict";
var fs = require("fs");
var gulp = require("gulp");
var logger = require("fancy-log");
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var changed = require('gulp-changed');
var ts = require("gulp-typescript");
var newer = require('gulp-newer');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var gulpPrint = require('gulp-print');
var gulpSome = require('gulp-some');
var osPath = require('path');

var DEST, enableSourceMap, willListFiles, willListEmittedFiles, removeComments, JSDEST;
var locally = false;
var debugging = process.env.DEBUG === "1";
var compileInBatch = true;
var typescript = null, tsOptionsLogged = false;
var envLegacy = process.env.SUPPORT_LEGACY === "1";
var envSourceMap = process.env.ENABLE_SOURCE_MAP !== "0";
var disableErrors = process.env.SHOW_ERRORS !== "1" && (process.env.SHOW_ERRORS === "0" || !compileInBatch);
var ignoreHeaderChanges = process.env.IGNORE_HEADER_CHANGES !== "0";
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("scripts/gulp.tsconfig.json", false);
gulpPrint = gulpPrint.default || gulpPrint;

var CompileTasks = {
  background: ["background/*.ts", "background/*.d.ts"],
  content: [["content/*.ts", "lib/*.ts", "!lib/polyfill.ts"], "content/*.d.ts"],
  lib: ["lib/*.ts"],
  front: [["front/*.ts", "lib/polyfill.ts", "pages/*.ts", "!pages/options*.ts", "!pages/show.ts"]
          , ["background/bg.d.ts", "content/*.d.ts"]],
  vomnibar: ["front/*.ts", ["background/bg.d.ts", "content/*.d.ts"]],
  polyfill: ["lib/polyfill.ts"],
  main_pages: [["pages/options*.ts", "pages/show.ts"], ["background/*.d.ts", "content/*.d.ts"]],
  show: ["pages/show.ts", ["background/bg.d.ts", "content/*.d.ts"]],
  options: ["pages/options*.ts", ["background/*.d.ts", "content/*.d.ts"]],
  others: [["pages/*.ts", "!pages/options*.ts", "!pages/show.ts"], "background/bg.d.ts"],
}

var Tasks = {
  "build/pages": ["build/main_pages", "build/others"],
  "static/special": function() {
    return copyByPath(["pages/newtab.js", "lib/math_parser*", "lib/*.min.js"]);
  },
  static: ["static/special", function() {
    return copyByPath(["front/*", "pages/*", "icons/*", "lib/*.css"
        , "settings_template.json", "*.txt", "*.md"
        , "!**/manifest.json"
        , '!**/*.ts', "!**/*.js", "!**/tsconfig*.json"
        , "!front/vimium.css", "!test*", "!todo*"
      ]);
  }],

  "build/scripts": ["build/background", "build/content", "build/front"],
  "build/ts": ["build/scripts", "build/main_pages"],

  "min/bg": function(cb) {
    var sources = manifest.background.scripts;
    sources = ("\n" + sources.join("\n")).replace(/\n\//g, "\n").split("\n");
    var body = sources.splice(0, sources.indexOf("background/main.js") + 1, "background/body.js");
    gulp.task("min/bg/_1", function() {
      return uglifyJSFiles(body, sources[0]);
    });
    var index = sources.indexOf("background/tools.js");
    var tail = sources.splice(index, sources.length - index, "background/tail.js");
    gulp.task("min/bg/_2", function() {
      return uglifyJSFiles(tail, sources[index]);
    });
    gulp.task("min/bg/_3", function() {
      return uglifyJSFiles(sources.slice(1, index), "background/", "");
    });
    manifest.background.scripts = sources;
    gulp.parallel("min/bg/_1", "min/bg/_2", "min/bg/_3")(cb);
  },
  "min/content": function() {
    var cs = manifest.content_scripts[0], sources = cs.js;
    if (sources.length <= 1) {
      return;
    }
    cs.js = ["content/body.js"];
    return uglifyJSFiles(sources, cs.js[0]);
  },
  "min/others": function() {
    var oriManifest = readJSON("manifest.json", true);
    var res = ["**/*.js"];
    for (var arr = oriManifest.background.scripts, i = 0, len = arr.length; i < len; i++) {
      res.push("!" + arr[i]);
    }
    for (var arr = oriManifest.content_scripts[0].js, i = 0, len = arr.length; i < len; i++) {
      res.push("!" + arr[i]);
    }
    return uglifyJSFiles(res, ".", "");
  },
  "min/js": ["min/bg", "min/content", "min/others"],
  manifest: [["min/bg", "min/content"], function(cb) {
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
  }],
  dist: [["static", "build/ts"], ["manifest", "min/others"]],
  "dist/": ["dist"],

  build: ["dist"],
  rebuild: [["clean"], "dist"],
  all: ["build"],
  "clean/temp": function() {
    return cleanByPath([JSDEST + "**/*.js"
      , JSDEST + "**/*.js.map"
      , "!" + JSDEST + "/pages/newtab.js"]);
  },
  clean: ["clean/temp", function() {
    return cleanByPath(DEST + "/*");
  }],

  scripts: ["background", "content", "front"],
  pages: ["main_pages", "others"],
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
  local: ["scripts", "main_pages"],
  tsc: ["local"],
  "default": ["tsc"],
  watch: ["locally", function(done) {
    ignoreHeaderChanges = willListFiles = true;
    willListEmittedFiles = false;
    ["background", "content", "front", "options", "show"].forEach(makeWatchTask);
    done();
  }],
  debug: ["locally", function(done) {
    ignoreHeaderChanges = disableErrors = willListFiles = false;
    willListEmittedFiles = debugging = true;
    ["background", "content", "vomnibar", "polyfill", "options", "show", "others"].forEach(makeWatchTask);
    done();
  }],
  test: ["local"]
}


typescript = compilerOptions.typescript = loadTypeScriptCompiler();
removeUnknownOptions();
gulp.task("locally", function(done) {
  if (locally) { return done(); }
  compilerOptions = loadValidCompilerOptions("tsconfig.json", true);
  removeUnknownOptions();
  JSDEST = compilerOptions.outDir = ".";
  enableSourceMap = false;
  willListEmittedFiles = true;
  locally = true;
  done();
});
makeCompileTasks();
makeTasks();

function makeCompileTask(src, header_files) {
  header_files = typeof header_files === "string" ? [header_files] : header_files || [];
  return function() {
    return compile(src, header_files);
  };
}

function makeCompileTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var key in CompileTasks) {
    if (!hasOwn.call(CompileTasks, key)) { continue; }
    var config = CompileTasks[key], task = makeCompileTask(config[0], config[1]);
    gulp.task(key, gulp.series("locally", task));
    gulp.task("build/" + key, task);
    if (fs.existsSync(key) && fs.statSync(key).isDirectory()) {
      gulp.task(key + "/", gulp.series(key));
    }
  }
}

var _todoTasks = [], _todoTimer = 0;
function makeWatchTask(taskName) {
  var glob = CompileTasks[taskName][0];
  typeof glob === "string" && (glob = [glob]);
  if (!debugging) {
    glob.push("!background/*.d.ts", "!content/*.d.ts", "!pages/*.d.ts", "!types/*.d.ts");
  }
  gulp.watch(glob, function() {
    if (_todoTasks.indexOf(taskName) < 0) { _todoTasks.push(taskName); }
    if (_todoTimer > 0) { clearTimeout(_todoTimer); }
    _todoTimer = setTimeout(function() {
      _todoTimer = 0;
      gulp.parallel(..._todoTasks.slice(0))();
      _todoTasks.length = 0;
    }, 100);
  });
}

function makeTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  var todo = [];
  for (let key in Tasks) {
    if (!hasOwn.call(Tasks, key)) { continue; }
    todo.push([key, Tasks[key]]);
  }
  while (todo.length > 0) {
    let [ key, task ] = todo.shift();
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
      todo.push([key, task]);
      continue;
    }
    if (typeof task[1] === "function" || task[0] instanceof Array) {
      gulp.task(key, Tasks[key] = gulp.series(task[0] instanceof Array ? gulp.parallel(...task[0]) : task[0], task[1]));
    } else {
      gulp.task(key, task.length === 1 && typeof Tasks[task[0]] === "function" ? Tasks[task[0]] : gulp.parallel(...task));
    }
  }
}

function tsProject() {
  return disableErrors ? ts(compilerOptions, ts.reporter.nullReporter()) : ts(compilerOptions);
}

function compile(pathOrStream, header_files, skipOutput) {
  if (typeof pathOrStream === "string") {
    pathOrStream = [pathOrStream];
  }
  if (pathOrStream instanceof Array) {
    pathOrStream.push("!node_modules/**/*.ts");
    pathOrStream.push("!types/**/*.ts");
    pathOrStream.push("!types/*.ts");
  }
  var stream = pathOrStream instanceof Array ? gulp.src(pathOrStream, { base: "." }) : pathOrStream;
  var extra = ignoreHeaderChanges || header_files === false ? undefined
    : ["types/**/*.d.ts", "types/*.d.ts"].concat(header_files);
  var ifNotEmpty = gulpIfNotEmpty();
  stream = stream.pipe(ifNotEmpty.prepare);
  if (!debugging) {
    stream = stream.pipe(newer({ dest: JSDEST, ext: '.js', extra: extra }));
  }
  stream = stream.pipe(gulpSome(function(file) {
    var t = file.relative, s = ".d.ts", i = t.length - s.length;
    return i < 0 || t.indexOf(s, i) !== i;
  }));
  if (compileInBatch) {
    stream = stream.pipe(ifNotEmpty.cond);
  }
  if (willListFiles) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.init());
  }
  var project = tsProject();
  var tsResult = stream.pipe(project);
  if (skipOutput) {
    return tsResult;
  }
  return outputJSResult(tsResult.js);
}

function outputJSResult(stream, concatedFile) {
  if (locally) {
    stream = stream.pipe(gulpMap(function(file) {
      if (file.history.join("|").indexOf("extend_click") >= 0) {
        file.contents = new Buffer(patchExtendClick(String(file.contents)));
      }
    }));
  }
  if (concatedFile) {
    stream = stream.pipe(concat(concatedFile));
  }
  stream = stream.pipe(changed(JSDEST, {
    hasChanged: compareContentAndTouch
  }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.write(".", {
      sourceRoot: ""
    }));
  }
  return stream.pipe(gulp.dest(JSDEST));
}

function uglifyJSFiles(path, output, new_suffix) {
  if (typeof path === "string") {
    path = [path];
  }
  for (var i = 0; i < path.length; i++) {
    var p = path[i];
    path[i] = p[0] !== "!" ? osPath.join(JSDEST, p) : "!" + osPath.join(JSDEST, p.substring(1));
  }
  path.push("!**/*.min.js");
  output = output || ".";
  new_suffix = new_suffix !== "" ? (new_suffix || ".min") : "";

  var stream = gulp.src(path, { base: JSDEST });
  var is_file = output.indexOf(".js", Math.max(0, output.length - 3)) > 0;
  stream = stream.pipe(newer(is_file ? {
    dest: osPath.join(DEST, output)
  } : {
    dest: DEST,
    ext: new_suffix + ".js"
  }));
  let mayPatch = false;
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.init({ loadMaps: true }));
  } else {
    stream = stream.pipe(gulpMap(function(file) {
      if (file.history.join("|").indexOf("extend_click") >= 0) {
        mayPatch = true;
      }
    }));
  }
  if (is_file) {
     stream = stream.pipe(concat(output));
  }
  stream = stream.pipe(uglify(loadUglifyConfig()));
  if (!is_file && new_suffix !== "") {
     stream = stream.pipe(rename({ suffix: new_suffix }));
  }
  stream = stream.pipe(gulpMap(function(file) {
    if (!mayPatch) { return; }
    if (is_file || file.history.join("|").indexOf("extend_click") >= 0) {
      file.contents = new Buffer(patchExtendClick(String(file.contents)));
    }
  }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.write(".", {
      sourceRoot: "/"
    }));
  }
  return stream.pipe(gulp.dest(DEST));
}

function copyByPath(path) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST))
    .pipe(changed(DEST, {
      hasChanged: compareContentAndTouch
    }));
  if (willListEmittedFiles) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(DEST));
}

function cleanByPath(path) {
  return gulp.src(path, {read: false}).pipe(clean());
}

function convertToStream(pathOrStream) {
  return typeof pathOrStream === "string" || pathOrStream instanceof Array
    ? gulp.src(pathOrStream, { base: "." }) : pathOrStream;
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
        var src = (sourceFile.history && sourceFile.history[0] || targetPath).substring(0, len1 - 3) + ".ts";
        if (fs.existsSync(src)) {
          var mtime = fs.fstatSync(fd2 = fs.openSync(src, "r")).mtime;
          if (mtime != null && mtime < s.mtime) {
            return;
          }
        }
      }
      fs.futimesSync(fd, parseInt(s.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
      print("Touch an unchanged file:", sourceFile.relative);
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
  var stringOrComment = /"(?:\\[\\\"]|[^"])*"|'(?:\\[\\\']|[^'])*'|\/\/[^\r\n]*|\/\*.*?\*\//g
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
      console.warn(err);
      return {};
    }
  }
  global._readJSON = readJSON;
}

function readJSON(fileName, throwError) {
  if (!global._readJSON) {
    _makeJSONReader();
  }
  return _readJSON(fileName, throwError);
}

function readCompilerOptions(tsConfigFile, throwError) {
  if (tsConfigFile.lastIndexOf(".json") !== tsConfigFile.length - 5) {
    tsConfigFile += ".json";
  }
  var config = readJSON(tsConfigFile);
  var compilerOptions = config ? config.compilerOptions || {} : null;
  if (compilerOptions && config.extends) {
    var baseFile = osPath.join(osPath.dirname(tsConfigFile), config.extends);
    var baseOptions = readCompilerOptions(baseFile, throwError);
    if (baseOptions) {
      for (var key in baseOptions) {
        if (baseOptions.hasOwnProperty(key) && !(key in compilerOptions)) {
          compilerOptions[key] = baseOptions[key];
        }
      }
    }
  }
  return compilerOptions;
}

function loadValidCompilerOptions(tsConfigFile, keepCustomOptions) {
  var compilerOptions = readCompilerOptions(tsConfigFile, true);
  if (!keepCustomOptions && (keepCustomOptions === false || !compilerOptions.typescript)) {
    delete compilerOptions.inferThisForObjectLiterals;
    delete compilerOptions.narrowFormat;
  }
  if (typescript && !compilerOptions.typescript) {
    compilerOptions.typescript = typescript;
  }
  if (compilerOptions.noImplicitUseStrict) {
    compilerOptions.alwaysStrict = false;
  }
  DEST = compilerOptions.outDir;
  if (!DEST || DEST === ".") {
    DEST = compilerOptions.outDir = "dist";
  }
  JSDEST = osPath.join(DEST, ".build");
  enableSourceMap = !!compilerOptions.sourceMap && envSourceMap;
  willListFiles   = !!compilerOptions.listFiles;
  willListEmittedFiles = !!compilerOptions.listEmittedFiles;
  removeComments  = !!compilerOptions.removeComments;
  return compilerOptions;
}

function loadTypeScriptCompiler(path) {
  var typescript;
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
        typescript = require(path);
      } catch (e) {}
    }
    print('Load customized TypeScript compiler:', typescript != null ? "succeed" : "fail");
  }
  if (typescript == null) {
    typescript = require("typescript/lib/typescript");
  }
  return typescript;
}

function removeUnknownOptions() {
  var hasOwn = Object.prototype.hasOwnProperty, toDelete = [], key, val;
  for (var key in compilerOptions) {
    if (key === "typescript" || key === "__proto__") { continue; }
    if (!hasOwn.call(compilerOptions, key)) { continue; }
    var declared = typescript.optionDeclarations.some(function(i) {
      return i.name === key;
    });
    declared || toDelete.push(key);
  }
  for (var i = 0; i < toDelete.length; i++) {
    key = toDelete[i], val = compilerOptions[key];
    delete compilerOptions[key];
  }
  if (tsOptionsLogged) { return; }
  tsOptionsLogged = true;
  if (toDelete.length > 1) {
    print("Skip these TypeScript options:", toDelete.join(", "));
  } else if (toDelete.length === 1) {
    print("Skip the TypeScript option:", toDelete[0]);
  }
}

function print() {
  return logger.apply(null, arguments);
}

function gulpIfNotEmpty() {
  var Transform = require('stream').Transform;
  var a = new Transform({objectMode: true}), b = new Transform({objectMode: true});
  a._empty = true;
  a._transform = function(srcFile, encoding, done) {
    a._empty = false;
    done();
  };
  a._flush = function(done) {
    if (!a._empty) {
      var arr = b.files;
      for (var i = 0; i < arr.length; i++) {
        this.push(arr[i]);
      }
    }
    done();
  };
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

function patchExtendClick(source) {
  if (!locally) { return source; }
  if (locally && envLegacy) { return source; }
  print('patch the extend_click module');
  source = source.replace(/(addEventListener|toString) ?: ?function \1/g, "$1 "); // es6 member function
  const match = /\/: \?function \\w\+\/g, ?(""|'')/.exec(source);
  if (match) {
    const start = Math.max(0, match.index - 64), end = match.index;
    let prefix = source.substring(0, start), suffix = source.substring(end);
    source = source.substring(start, end).replace(/>= ?45/, "< 45").replace(/45 ?<=/, "45 >");
    suffix = '/(addEventListener|toString) \\(/g, "$1: function $1("' + suffix.substring(match[0].length);
    source = prefix + source + suffix;
  }
  return source;
}

var _uglifyjsConfig = null;
function loadUglifyConfig() {
  if (_uglifyjsConfig == null) {
    _uglifyjsConfig = readJSON("scripts/uglifyjs.json");
    _uglifyjsConfig.output || (_uglifyjsConfig.output = {});
  }
  _uglifyjsConfig.output.comments = removeComments ? false : "all";
  return _uglifyjsConfig;
}
