#!/usr/bin/env node
// @ts-check
"use strict";
/** @type {import("./dependencies").FileSystem} */
// @ts-ignore
var fs = require("fs");
/** @type {import("./dependencies").ProcessType} */
// @ts-ignore
var process = require("process");
var lib = require("./dependencies");

var argv = process.argv, argi = 0, cmd = argv[0];
if (/\bnode\b/i.test(argv[argi])) {
  argi++;
}
if (/\btsc(\.\b|$)/i.test(argv[argi])) {
  argi++;
}
if (argv.indexOf("-p") < 0 && argv.indexOf("--project") < 0 && !fs.existsSync("tsconfig.json")) {
  // @ts-ignore
  const parent = __dirname.replace(/[\\\/][^\\\/]+[\\\/]?$/, "");
  if (fs.existsSync(parent + "/tsconfig.base.json")) {
    process.chdir(parent);
  }
}
var root = "./";
var logPrefix = "";
if (!fs.existsSync("package.json")) {
  if (fs.existsSync("../package.json")) {
    root = "../";
    // @ts-ignore
    logPrefix = require("path").basename(process.cwd());
  }
}

var _WORKER_ENV_KEY = "__VIMIUM_C_TSC_WORKER__";
var IN_WORKER = +(process.env[_WORKER_ENV_KEY] || 0) > 0;
var fakeArg = "--vimium-c-fake-arg";
var _tscPatched = IN_WORKER, _tsNSPatched = false;

function patchTSC() {
  if (_tscPatched) { return; }
  var path = "node_modules/typescript/lib/tsc.js";
  for (var i = 0; i < 3 && !fs.existsSync(path); i++) {
    path = "../" + path;
  }
  if (i >= 3) { return; }
  var info = {};
  lib.patchTypeScript(path)
  try {
    var code = lib.readFile(path, info).trim();
    var patched = "\n;\n\nmodule.exports = ts;\n"
          + "ts.sys.args[0] !== '" + fakeArg + "' &&\n";
    if (code.slice(-4096).indexOf(patched) < 0 && code.indexOf("module.exports = ") < 0) {
      var oldTail = "ts.executeCommandLine(ts.sys";
      var pos = code.lastIndexOf(oldTail);
      if (pos < 0) {
        throw Error("The target call is not found:");
      }
      code = code.slice(0, pos) + patched + code.slice(pos);
      fs.writeFileSync(path, code);
      console.log("Patch TypeScript/lib/tsc.js: succeed");
    }
    _tscPatched = true;
  } catch (e) {
    console.error("Error: Failed to patch TypeScript/lib/tsc.js: " + e);
  }
}

patchTSC();
if (!_tscPatched) {
  // @ts-ignore
  require("typescript/lib/tsc");
  // @ts-ignore
  return;
}

// ==================== customized building ====================

var doesMinifyLocalFiles = process.env.MINIFY_LOCAL !== "0";

var real_proc_exit = process.exit;
process.exit = function(){};
var real_args = argv.length > 2 ? argv.splice(2, argv.length - 2) : [];
argv.length = 2;

var real_write;
/** @type Array<Promise<number | void>> */
var PROMISES = [];

/**
 * @param {string} path
 * @param {string} data
 * @param {unknown} writeBom
 */
var writeFile = function(path, data, writeBom) {
  var isJS = path.slice(-3) === ".js";
  var srcPath = isJS ? path.slice(0, -3) + ".ts" : path;
  var same = fs.existsSync(path);
  var skip = false;
  PROMISES.push((async function () {
  try {
  if (!skip) {
    if (doesMinifyLocalFiles && isJS) {
      data = await getTerser()(data, null, path);
    }
    data = data.replace(/\bimport\b[^'"}]+\}?\s?\bfrom\b\s?['"][.\/\w]+['"]/g, s => {
      return s.includes(".js") ? s : s.slice(0, -1) + ".js" + s.slice(-1)
    })
    data = lib.addMetaData(path, data)
    same = same && lib.readFile(path, {}) === data;
  }
  var prefix = logPrefix && "[" + logPrefix + "]", space = " "
  prefix += logPrefix && space.repeat && space.repeat(13 - prefix.length)
  console.log("%s%s: %s", prefix, skip ? " SKIP" : same ? "TOUCH" : "WRITE", path.replace(root, ""));
  if (same) {
    lib.touchFileIfNeeded(path, srcPath);
  } else {
    real_write(path, data, writeBom);
  }
  }catch (ex) {
    console.log(ex);
    throw ex;
  }
  })());
};

/** @type {import("./dependencies").TerserOptions | null} */
var defaultTerserConfig = null;
var known_defs = null
var other_consts = null
var getTerser = function() {
  var terser;
  try {
    terser = require("terser")
  } catch (e) {}
  var minify;
  if (terser == null) {
    console.log("Can not load terser, so skip minifying JS")
    minify = function(data) { return Promise.resolve(data); };
  } else {
    minify = function(data, config, path) {
      config || (config = getDefaultTerserConfig());
      data = lib.replace_global_defs(known_defs, data)
      var output = terser.minify(data, config);
      return (output instanceof Promise ? output.then(function (output) {
        if (output.error) {
          throw output.error;
        }
        return output;
      }) : new Promise(function (resolve, reject) {
        output.error ? reject(output.error) : resolve(output);
      })).then(function (output) {
        data = output.code;
        if ((path.includes("front/") || path.includes("pages/")) && config.ecma && config.ecma >= 2017) {
          data = data.replace(/\bappendChild\b(?!`|\.call\([\w.]*doc)/g, "append");
        }
        if (path.includes("pages/")) {
          data = data.replace(/\n?\/\*!? ?@OUTPUT ?\{([^}]+)\} ?\*\/\n?/g, '$1')
        }
        if (path.includes("/env")) {
          data = lib.skip_declaring_known_globals(other_consts.BTypes, other_consts.MinCVer, () => data) || data
        }
        return data.replace(/![01]\b/g, s => s === "!0")
      });
    };
  }
  getTerser = function() { return minify; };
  return minify;
};

function getDefaultTerserConfig() {
  if (!defaultTerserConfig) {
    defaultTerserConfig = lib.loadTerserConfig(root + "scripts/uglifyjs.local.json");
    var tsconfig = lib.readJSON(root + "tsconfig.base.json");
    var target = tsconfig.compilerOptions.target;
    defaultTerserConfig.ecma = ({
      es5: 5, es6: 6, es2015: 6, es2017: 2017, es2018: 2018
    })[target] || defaultTerserConfig.ecma
    var format = defaultTerserConfig.format || (defaultTerserConfig.format = {})
    format.code = true; format.ast = false
  }
  if (!known_defs) {
    known_defs = {}
    other_consts = {}
    var _buildConfigTSContent = lib.readFile(root + "typings/build/index.d.ts")
    _buildConfigTSContent.replace(/\b([A-Z]\w+)\s?=\s?([^,}]+)/g, function(_, key, literalVal) {
      if (key === "BTypes") {
        lib.fill_global_defs(known_defs, +literalVal)
      }
      try {
        literalVal = JSON.parse(literalVal)
        other_consts[key] = literalVal
      } catch (e) {}
      return ""
    });
  }
  return defaultTerserConfig;
}

/** @type { 0 | 1 | 2 | null } */
var iconsDone = null;

if (typeof module !== "undefined") {
  module.exports = {
    executeTS: executeTS,
    main: main,
  }
}
// @ts-ignore
if (typeof require === "function" && require.main === module) {
  try {
    IN_WORKER || require("./icons-to-blob").main(function (err) {
      var curIconsDone = iconsDone;
      iconsDone = err ? 1 : curIconsDone || 0;
      if (curIconsDone == null) {
        main(real_args);
      }
    });
  } catch (ex) {
    console.log("Failed to convert icons to binary data:", ex);
  }
  if (iconsDone == null) {
    iconsDone = 2;
    main(real_args);
  }
}

/** @param {string[]} args */
function main(args) {
  var useDefaultConfigFile = args.indexOf("-p") < 0 && args.indexOf("--project") < 0;
  var useWatch = args.includes("--watch");
  var destDirs = [];
  lib.patchTerser();
  for (var i = !IN_WORKER && useDefaultConfigFile ? 0 : args.length; i < args.length; ) {
    var argi = args[i];
    if (argi[0] === "-") {
      i += argi === "-p" || argi === "--project" || argi === "--outDir" ? 2 : 1;
    } else if (/^([a-zA-Z]:)?[\w\\\/]+$/.test(argi) && fs.existsSync(argi) && fs.statSync(argi).isDirectory()) {
      "/\\".indexOf(argi[argi.length - 1]) >= 0 && (argi = argi.slice(0, -1));
      if (fs.existsSync(argi + "/tsconfig.json")) {
        destDirs.push(argi);
        args.splice(i, 1);
      } else if ((args[i - 1] || "a")[0] !== "-"
        && (fs.existsSync(argi + "/lib") || fs.existsSync(argi + "/manifest.json"))) {
        args.splice(i - 1, 0, "--outDir");
        i += 2;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  if (destDirs.length === 0 && useDefaultConfigFile && fs.existsSync("./package.json")) {
    destDirs.push("front", "background", "content", "pages");
  }
  if (destDirs.length === 0) {
    destDirs.push(".");
  }
  // @ts-ignore
  var child_process = require("child_process");
  var env = process.env;
  env[_WORKER_ENV_KEY] = "1";

  var outDirArgIdx = args.indexOf("--outDir");
  var gulp_cmd = "./node_modules/gulp/bin/gulp.js";
  if (!IN_WORKER && outDirArgIdx >= 0 && outDirArgIdx + 1 < args.length
      && args[outDirArgIdx + 1] && args[outDirArgIdx + 1] !== "." && fs.existsSync(gulp_cmd)) {
    env["BUILD_NDEBUG"] = "0";
    env["BUILD_CopyManifest"] = "1";
    env["LOCAL_SILENT"] = "1";
    env["LOCAL_DIST"] = args[outDirArgIdx + 1];
    PROMISES.push(new Promise(function (resolve) {
      var child = child_process.spawn(cmd, [gulp_cmd, "--silent", "static"], { env: env,
        // @ts-ignore
        stdio: ["ignore", process.stdout, process.stderr]
      });
      child.on("close", function (code) { resolve(code || 0); });
    }));
  }
  // @ts-ignore
  root = require("path").resolve(root).replace(/\\/g, "/") + "/";
  if (useWatch && (destDirs.length > 1 || destDirs[0] === ".")) {
    args.unshift("--build")
    args.push(...destDirs);
    destDirs = ["."]
  }
  for (var i = 1; i < destDirs.length; i++) {
    PROMISES.push(new Promise(function (resolve) {
      var child = child_process.spawn(cmd, argv.slice(1).concat(args), {
        cwd: destDirs[i], env: env,
        // @ts-ignore
        stdio: ["ignore", process.stdout, process.stderr]
      });
      child.on("close", function (code) { resolve(code || 0); });
    }));
  }
  var watchedDest = destDirs[0];
  if (watchedDest !== ".") {
    logPrefix = watchedDest;
    process.chdir(watchedDest);
  }
  PROMISES.push(executeTS(args));
  const q = Promise.all(PROMISES);
  PROMISES = [];
  q.then(function waitAll(results) {
    var err = results.reduce(function (prev, cur) { return prev || cur; }, 0);
    err && console.log("[ERROR] result code is %d", err);
    if (PROMISES.length > 0) {
      const q2 = Promise.all(PROMISES);
      PROMISES = [];
      q2.then(waitAll);
      return;
    }
    err = err || 0;
    real_proc_exit(err);
  });
}

/**
 * @argument { string[] } args
 * @returns { Promise<number> }
 */
function executeTS(args) {
  return new Promise(function (resolve) {
    process.exit = function (exit_code) {
      resolve(exit_code || 0);
    };
    try {
      _executeTS(args);
    } catch (e) {
      console.log("[ERROR] Unexpected:", e);
      resolve(-1);
    }
  });
}

/** @argument { string[] } args */
function _executeTS(args) {
  process.argv.length = 2;
  process.argv.push(fakeArg);
  // @ts-ignore
  var ts = require("typescript/lib/tsc");
  process.argv.length = 2;

  real_write = ts.sys.writeFile;
  ts.sys.writeFile = writeFile;
  _tsNSPatched || (_tsNSPatched = true) &&
  lib.patchTSNamespace(ts, void 0, true); // when MinCVer >= 39 or not Chrome

  if (ts.version < '3.7') {
    ts.executeCommandLine(args);
  } else if (ts.version < '3.8') {
    ts.executeCommandLine(ts.sys, {
      onCompilerHostCreate: ts.noop,
      onCompilationComplete: ts.noop,
      onSolutionBuilderHostCreate: ts.noop,
      onSolutionBuildComplete: ts.noop
    }, args);
  } else {
    ts.executeCommandLine(ts.sys, ts.noop, args);
  }
}
