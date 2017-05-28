"use strict";
var fs = require("fs");
var gulp = require("gulp");
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
var runSequence = require('run-sequence');
var osPath = require('path');

var DEST, enableSourceMap, willListFiles, willListEmittedFiles, removeComments, JSDEST;
var locally = false;
var typescript = null;
var disableErrors = !process.env.DISABLE_ERRORS;
var manifest = readJSON("manifest.json", true);
var compilerOptions = loadValidCompilerOptions("tsconfig.gulp.json");

var CompileTasks = {
  background: ["background/*.ts", "background/*.d.ts"],
  content: [["content/*.ts", "lib/*.ts", "!lib/polyfill.ts"], "content/*.d.ts"],
  lib: [["lib/*.ts", "!lib/extend_click.ts"]],
  front: [["front/*.ts", "lib/polyfill.ts", "pages/*.ts", "!pages/options*.ts", "!pages/show.ts"]
          , ["background/bg.d.ts", "content/*.d.ts"]],
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
        , "!front/vimium.css", "!todo*"
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
    runSequence(["min/bg/_1", "min/bg/_2", "min/bg/_3"], cb);
  },
  "min/content": function() {
    var cs = manifest.content_scripts[0], sources = cs.js;
    if (sources.length <= 2) {
      return;
    }
    var lastFile = sources.pop();
    cs.js = ["content/body.js", lastFile];
    return uglifyJSFiles(sources, cs.js[0]);
  },
  "min/others": function() {
    var oriManifest = readJSON("manifest.json", true);
    var res = ["**/*.js"];
    for (var arr = oriManifest.background.scripts, i = 0, len = arr.length; i < len; i++) {
      res.push("!" + arr[i]);
    }
    for (var arr = oriManifest.content_scripts[0].js, i = 0, len = arr.length - 1; i < len; i++) {
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

  build: ["dist"],
  rebuild: [["clean"], "dist"],
  all: ["rebuild"],
  "clean/temp": function() {
    return cleanByPath([JSDEST + "**/*.js"
      , JSDEST + "**/*.js.map"
      , "!" + JSDEST + "/pages/newtab.js"]);
  },
  clean: ["clean/temp", function() {
    return cleanByPath(DEST + "/*");
  }],

  locally: function() {
    if (locally) { return; }
    compilerOptions = loadValidCompilerOptions("tsconfig.json", true);
    JSDEST = compilerOptions.outDir = ".";
    enableSourceMap = false;
    willListEmittedFiles = true;
    locally = true;
  },
  "scripts": ["background", "content", "front"],
  "pages": ["main_pages", "others"],
  local: ["scripts", "main_pages"],
  tsc: ["local"],
  default: ["tsc"],
  test: ["local"]
}


typescript = compilerOptions.typescript = loadTypeScriptCompiler();
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
    gulp.task(key, ["locally"], task);
    gulp.task("build/" + key, task);
    if (fs.existsSync(key) && fs.statSync(key).isDirectory()) {
      gulp.task(key + "/", [key]);
    }
  }
}

function makeTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var key in Tasks) {
    if (!hasOwn.call(Tasks, key)) { continue; }
    var task = Tasks[key];
    if (typeof task === "function") {
      gulp.task(key, task);
    } else if (typeof task[1] === "function") {
      gulp.task(key, task[0] instanceof Array ? task[0] : [task[0]], task[1]);
    } else if (task[0] instanceof Array) {
      gulp.task(key, Tasks[key] = willStart(task));
    } else if (!/\.ts\b/i.test(task[0])) {
      gulp.task(key, task);
    }
  }
}

function willStart(taskSeq) {
  return function(cb) {
    taskSeq.push(cb);
    runSequence.apply(null, taskSeq);
  };
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
  stream = stream.pipe(newer({ dest: JSDEST, ext: '.js', extra: ["types/**/*.d.ts", "types/*.d.ts"].concat(header_files) }));
  stream = stream.pipe(gulpSome(function(file) {
    var t = file.relative, s = ".d.ts", i = t.length - s.length;
    return i < 0 || t.indexOf(s, i) !== i;
  }));
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
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.init({ loadMaps: true }));
  }
  if (is_file) {
     stream = stream.pipe(concat(output));
  }
  stream = stream.pipe(uglify({
    output: {
      comments: removeComments ? false : "all"
    },
    compress: {
      booleans: false,
      negate_iife: false,
      sequences: false
    }
  }));
  if (!is_file && new_suffix !== "") {
     stream = stream.pipe(rename({ suffix: new_suffix }));
  }
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
    var fd = fs.openSync(targetPath, "a");
    try {
      var s = s = fs.fstatSync(fd);
      fs.futimesSync(fd, parseInt(s.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
      console.log("Touch an unchanged file:", sourceFile.relative);
    } finally {
      fs.closeSync(fd);
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
    , lf = /\r\n|\r(?!\n)/g, notLF = /[^\r\n]+/g, notWhiteSpace = /\S/;
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
    // text = text.replace(lf, "\n");
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
  enableSourceMap = !!compilerOptions.sourceMap;
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
    console.log('Load customized TypeScript compiler:', typescript != null);
  }
  if (typescript == null) {
    typescript = require("typescript/lib/typescript");
  }
  return typescript;
}

function print() {
  return console.log.apply(console, arguments);
}
