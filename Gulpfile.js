"use strict";
var fs = require("fs");
var gulp = require("gulp");
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var ts = require("gulp-typescript");
var newer = require('gulp-newer');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var gulpPrint = require('gulp-print');
var osPath = require('path');

var locally = false;
var compilerOptions = loadValidCompilerOptions("tsconfig.gulp.json");
var typescript = null;
var manifest = readJSON("manifest.json", true);
var DEST = compilerOptions.outDir;
if (!DEST || DEST === ".") {
  DEST = compilerOptions.outDir = "dist";
}
var enableSourceMap = !!compilerOptions.sourceMap;
var willListFiles   = !!compilerOptions.listFiles;
var removeComments  = !!compilerOptions.removeComments;
var JSDEST = osPath.join(DEST, ".build");
var globalForceUpdate = false;
var disableErrors = !globalForceUpdate;

if (compilerOptions.noImplicitUseStrict) {
  compilerOptions.alwaysStrict = false;
}

var Tasks = {
  "build/background": "background/*.ts",
  "build/content": ["./content/*.ts", "./lib/*.ts"],
  "build/front": "front/*.ts",
  "build/lib": "lib/*.ts",
  "build/others": ["pages/loader.ts", "pages/chrome_ui.ts"],
  "build/show": "pages/show.ts",
  "build/options": "pages/options*.ts",
  "build/pages": ["build/others", "build/show", "build/options"],
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
  "build/ts": ["build/scripts", "build/pages"],

  "min/bg": function() {
    var sources = manifest.background.scripts;
    sources = ("\n" + sources.join("\n")).replace(/\n\//g, "\n").split("\n");
    var body = sources.splice(0, sources.indexOf("background/main.js") + 1, "background/body.js");
    var stream1 = uglifyJSFiles(body, sources[0]);
    var index = sources.indexOf("background/tools.js");
    var tail = sources.splice(index, sources.length - index, "background/tail.js");
    uglifyJSFiles(tail, sources[index]);
    uglifyJSFiles(sources.slice(1, index), "background/", "");
    manifest.background.scripts = sources;
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
  manifest: [["min/bg", "min/content"], function() {
    var file = osPath.join(DEST, "manifest.json")
      , data = JSON.stringify(manifest, null, "  ");
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      var oldData = readFile(file);
      if (data === oldData) {
        if (willListFiles) {
          print('skip', file);
        }
        return;
      }
    }
    fs.writeFileSync(file, data);
  }],
  minjs: ["min/bg", "min/content", "min/others"],
  dist: [["static", "build/ts"], willStart("manifest", "min/others")],

  build: ["dist"],
  rebuild: ["clean", willStart("dist")],
  all: ["rebuild"],
  "clean/temp": function() {
    disableErrors = false;
    return cleanByPath([JSDEST + "**/*.js"
      , JSDEST + "**/*.js.map"
      , "!" + JSDEST + "/pages/newtab.js"]);
  },
  clean: ["clean/temp", function() {
    return cleanByPath(DEST + "/*");
  }],

  locally: function() {
    if (locally) { return; }
    enableSourceMap = false;
    willListFiles = true;
    globalForceUpdate = false;
    disableErrors = !globalForceUpdate;
    JSDEST = ".";
    compilerOptions = loadValidCompilerOptions("tsconfig.json", true);
    locally = true;
  },
  "background": ["locally", makeCompileTask("background/*.ts")],
  "content": ["locally", makeCompileTask(["content/*.ts", "lib/*.ts", "!lib/polyfill.ts"])],
  "lib": ["locally", makeCompileTask("lib/*.ts")],
  "front": ["locally", makeCompileTask("front/*.ts")],
  "scripts": ["background", "content"],
  "others": ["locally", function() {
    return compile(["front/*.ts", "lib/polyfill.ts"
        , "pages/*.ts", "!pages/options*.ts", "!pages/show.ts"]);
  }],
  "pages": ["locally", function() {
    return compile(["pages/options*.ts", "pages/show.ts"]);
  }],
  local: ["scripts", "others", "pages"],
  default: ["local"],
  test: ["local"]
}


typescript = compilerOptions.typescript = loadTypeScriptCompiler();
makeTasks();

function makeCompileTask(src) {
  if (typeof src === "function") { return src; }
  return function() {
    return compile(src);
  };
}

function makeTasks() {
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var key in Tasks) {
    if (!hasOwn.call(Tasks, key)) { continue; }
    var task = Tasks[key];
    if (typeof task === "function") {
      gulp.task(key, task);
    } else if (typeof task === "string") {
      gulp.task(key, Tasks[key] = makeCompileTask(task));
    } else if (typeof task[1] === "function") {
      gulp.task(key, task[0] instanceof Array ? task[0] : [task[0]], task[1]);
    } else if (!/\.ts\b/i.test(task[0])) {
      gulp.task(key, task);
    } else {
      gulp.task(key, Tasks[key] = makeCompileTask(task));
    }
    if (key.indexOf("/") === -1 && fs.existsSync(key) && fs.statSync(key).isDirectory()) {
      gulp.task(key + "/", [key]);
    }
  }
}

function willStart() {
  var taskNames = [].slice.call(arguments, 0);
  return function() {
    // try to run it as a `sync` task if possible
    if (taskNames.length === 1) {
      var task = Tasks[taskNames[0]];
      if (typeof task === "function") {
        return task();
      }
    }
    return gulp.start.apply(gulp, taskNames);
  };
}

function tsProject() {
  return disableErrors ? ts(compilerOptions, ts.reporter.nullReporter()) : ts(compilerOptions);
}

function compile(pathOrStream, skipOutput, forceUpdate) {
  if (typeof pathOrStream === "string") {
    pathOrStream = [pathOrStream];
  }
  if (pathOrStream instanceof Array) {
    pathOrStream.push("!**/*.d.ts");
  }
  if (forceUpdate == null) {
    forceUpdate = globalForceUpdate;
  }
  var stream = pathOrStream instanceof Array ? gulp.src(pathOrStream, { base: "." }) : pathOrStream;
  if (!skipOutput && !forceUpdate) {
    stream = stream.pipe(newer({ dest: JSDEST, ext: '.js', extra: "**/*.d.ts" }));
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
  if (concatedFile) {
    stream = stream.pipe(concat(concatedFile));
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.write("."));
  }
  return stream.pipe(gulp.dest(JSDEST));
}

function uglifyJSFiles(path, output, new_suffix, forceUpdate) {
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
  if (forceUpdate) {
  } else if (is_file) {
    stream = stream.pipe(newer({ dest: osPath.join(DEST, output) }));
  } else {
    stream = stream.pipe(newer({ dest: DEST, ext: new_suffix + '.js' }));
  }
  if (willListFiles) {
    stream = stream.pipe(gulpPrint());
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.init({ loadMaps: true }));
  }
  if (is_file) {
     stream = stream.pipe(concat(output));
  }
  stream = stream.pipe(uglify({
    preserveComments: removeComments ? undefined : "all"
  }));
  if (!is_file && new_suffix !== "") {
     stream = stream.pipe(rename({ suffix: new_suffix }));
  }
  if (enableSourceMap) {
    stream = stream.pipe(sourcemaps.write("."));
  }
  return stream.pipe(gulp.dest(DEST));
}

function copyByPath(path) {
  var stream = gulp.src(path, { base: "." })
    .pipe(newer(DEST));
  if (willListFiles) {
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
      if (str.startsWith("/*")) {
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
  return compilerOptions;
}

function loadTypeScriptCompiler(path) {
  var typescript;
  path = path || compilerOptions.typescript || null;
  if (typeof path === "string") {
    if (fs.existsSync(path)) {
      if (fs.statSync(path).isDirectory()) {
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
