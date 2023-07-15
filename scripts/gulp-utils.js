//@ts-check
"use strict";
/** @typedef {{ contents: Buffer & { _str?: string, _changed?: 0 | 1 } }} FileWithCachedContents  */
var dependencies = require("./dependencies");
var fs = require("fs");
var gulp = require("gulp");
/** @typedef { (stream: NodeJS.ReadWriteStream, sourceFile: any, targetPath: string) => void } ICompareContents */
/** @type { typeof import("gulp-changed") & { compareContents?: ICompareContents } } */
// @ts-ignore
var gulpChanged = require("gulp-changed");
var gulpPrint = require("gulp-print").default;
var gulpSome = require("gulp-some");
var logger = require("fancy-log");
/** @type { (options: Parameters<typeof import("gulp-newer")>[0] & { extra?: string | null}) => NodeJS.ReadWriteStream } */
var newer = require("gulp-newer");
var osPath = require("path");
var gulpfile = require("../gulpfile")
var Transform = require("stream").Transform

var DEST, JSDEST;

function print() { logger.apply(null, arguments) }

exports.NeedCommitInfo = process.env.BUILD_NeedCommit === "1";

exports.set_dest = function (_newDest, _newJSDest) { [DEST, JSDEST] = arguments }

exports.formatPath = function (path, base) {
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

exports.cleanByPath = function (path, dest) {
  var rimraf
  path = exports.formatPath(path, dest);
  return gulp.src(path, {
      base: ".", read: false, dot: true, allowEmpty: true, nodir: true
  }).pipe(exports.gulpMap(file => {
    rimraf = rimraf || require("rimraf")
    rimraf.sync(file.path, { glob: false })
  }));
}

exports.minifyJson = function (toJs, file) {
  var contents = exports.ToString(file)
  contents = contents.replace(/\r\n?/g, "\n").trim()
  var oldLen = contents.length
  const obj = JSON.parse(contents), obj2 = {}
  for (const i of Object.keys(obj).sort()) { obj2[i] = obj[i] }
  contents = JSON.stringify(obj2)
  if (contents.length < oldLen) {
    contents = toJs ? "export default" + (contents[0] === "{" ? "" : " ") + contents : contents
    exports.ToBuffer(file, contents)
  }
  if (toJs) {
    file.path = file.path.replace(/\.json$/i, ".js")
  }
}

exports.checkAnyNewer = function (path, pathBase, dest, ext) {
  path = exports.formatPath(path, pathBase)
  return new Promise(function(resolve) {
    gulp.src(path, { base: pathBase })
      .pipe(newer(ext ? { dest, ext, } : { dest, }))
      .pipe(exports.gulpCheckEmpty(function(isEmpty) {
        resolve(!isEmpty)
      }))
    
  })
}

exports.compareContentAndTouch = function (_stream, sourceFile, targetPath) {
  if (sourceFile.isNull()) {
    return gulpChanged.compareContents.apply(this, arguments);
  }
  var isSame = false, equals = sourceFile.contents.equals,
  newEquals = sourceFile.contents.equals = function() {
    var curIsSame = equals.apply(this, arguments);
    isSame || (isSame = curIsSame);
    return curIsSame;
  };
  return gulpChanged.compareContents.apply(this, arguments).then(function() {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    if (!isSame) { return; }
    var sourcePath = sourceFile.history && sourceFile.history[0] || targetPath;
    if (targetPath.slice(-3) === ".js") {
      let sourcePath2 = sourcePath.slice(-3) === ".js" ? sourcePath.slice(0, -3) + ".ts" : sourcePath;
      if (fs.existsSync(sourcePath2)) { sourcePath = sourcePath2; }
    }
    if (dependencies.touchFileIfNeeded(targetPath, sourcePath)) {
      var fileName = sourceFile.relative;
      print("Touch an unchanged file:", fileName.indexOf(":\\") > 0 ? fileName : fileName.replace(/\\/g, "/"));
    }
  }).catch(function(e) {
    sourceFile.contents.equals === newEquals && (sourceFile.contents.equals = equals);
    throw e;
  });
}

exports.gulpAllIfNotEmpty = function () {
  /** @type { Transform & { files: any[] } } */
  // @ts-ignore
  var b = new Transform({objectMode: true})
  var a = exports.gulpCheckEmpty(function(isEmpty) {
    if (!isEmpty) {
      var arr = b.files
      for (var i = 0; i < arr.length; i++) {
        this.push(arr[i])
      }
    }
  })
  b.files = []
  b._transform = function(srcFile, encoding, done) {
    this.files.push(srcFile)
    this.push(srcFile)
    done()
  }
  return {
    cond: a,
    prepare: b,
  }
}

exports.gulpCheckEmpty = function (callback) {
  /** @type { Transform & { _empty: boolean } } */
  // @ts-ignore
  var a = new Transform({objectMode: true})
  a._empty = true
  a._transform = function(_srcFile, _encoding, done) {
    a._empty = false
    done()
  }
  a._flush = function(done) {
    callback.call(a, a._empty)
    done()
  }
  return a
}

/**
 * @argument {() => NodeJS.WriteStream} streamFactory
 * @argument {(stream: NodeJS.WriteStream) => NodeJS.ReadStream} [getResultStream]
 */
exports.gulpLazyStream = function(streamFactory, getResultStream) {
  /** @type {NodeJS.WriteStream | null} */
  var lazyStream = null
  var srcTransformer = new Transform({objectMode: true})
  var allDone
  srcTransformer._transform = function(srcFile, encoding, done) {
    if (!lazyStream) {
      lazyStream = streamFactory()
      lazyStream.resume()
      const result = getResultStream ? getResultStream(lazyStream) : lazyStream
      streamFactory = getResultStream = null
      result.on("data", (dstFile) => dstFile != null && srcTransformer.push(dstFile))
      result.on("end", () => allDone ? allDone() : allDone = true)
      result.on("error", (err) => srcTransformer.emit("error", err))
    }
    lazyStream.write(srcFile, done)
  }
  srcTransformer._flush = (done) => { !lazyStream || allDone === true ? done() : (allDone = done, lazyStream.end()) }
  return srcTransformer
}

exports.gulpMap = function (map, async) {
  var transformer = new Transform({objectMode: true})
  transformer._transform = function(srcFile, encoding, done) {
    if (async) {
      return map.call(this, srcFile, done)
    }
    var dest = map(srcFile)
    if (dest instanceof Promise) {
      dest.then((result) => {
        if (result) {
          throw new Error("gulpMap doesn't accept any result value")
        }
        this.push(srcFile)
        done()
      }).catch(err => done(err))
      return
    }
    if (dest) {
      throw new Error("gulpMap doesn't accept any returned value")
    }
    this.push(srcFile)
    done()
  }
  transformer._flush = function(done) { done() }
  return transformer
}

exports.gulpMerge = function () {
  var knownFiles = {}
  var ref = 0
  /** @type { Transform & { attachSource? (): Transform } } */
  var merged = new Transform({objectMode: true})
  var push = function(srcFile, _encoding, done) {
    var path = "@" + srcFile.history[0]
    if (! knownFiles[path]) {
      knownFiles[path] = 1
      merged.push(srcFile)
    }
    done()
  }, flush = function(done) {
    ref--
    if (ref === 0) {
      merged.push(null)
    }
    done()
  }
  merged.attachSource = function() {
    var proxy = new Transform({objectMode: true})
    proxy._transform = push
    proxy._flush = flush
    ref++
    return proxy
  }
  return merged
}

exports.print = print

/**
 * @argument {FileWithCachedContents} file
 * @argument {string} string
 * */
exports.ToBuffer = (file, string) => {
  file.contents._str = string
  file.contents._changed = 1
  return null
}

/** @argument {FileWithCachedContents} file */
exports.correctBuffer = (file) => {
  if (file.contents._changed) {
    const string = file.contents._str
    file.contents = Buffer.from ? Buffer.from(string) : new Buffer(string)
  }
}

/** @argument {FileWithCachedContents} file */
exports.ToString = (file) => {
  const contents = file.contents
  return contents._str || (contents._changed = 0, contents._str = contents.toString("utf8"))
}

exports.destCached = (stream, dest, print, hasChanged) => {
  stream = stream.pipe(exports.gulpMap(exports.correctBuffer))
  if (hasChanged) {
    stream = stream.pipe(gulpChanged(dest, { hasChanged: hasChanged }))
  }
  if (print) {
    stream = stream.pipe(gulpPrint())
  }
  return stream.pipe(gulp.dest(dest))
}

exports.safeJSONParse = function (literalVal, defaultVal, type) {
  var newVal = defaultVal != null ? defaultVal : null;
  try {
    newVal = JSON.parse(literalVal);
  } catch (e) {}
  return newVal != null ? type ? type(newVal) : newVal : null;
}


exports.readTSConfig = function (tsConfigFile, throwError) {
  if (!tsConfigFile.endsWith(".json")) { tsConfigFile += ".json"; }
  var config = dependencies.readJSON(tsConfigFile);
  if (!config) { return null; }
  var opts = config.compilerOptions || (config.compilerOptions = {});
  if (config.extends) {
    var baseFile = osPath.join(osPath.dirname(tsConfigFile), config.extends);
    var baseConfig = exports.readTSConfig(baseFile, throwError), baseOptions = baseConfig.compilerOptions;
    if (baseConfig.build) {
      dependencies.extendIf(config.build, baseConfig.build);
    }
    if (baseOptions) {
      if (baseOptions.plugins && opts.plugins) {
        var pluginNames = opts.plugins.map(function (i) { return i.name; });
        opts.plugins.unshift.apply(opts.plugins, baseOptions.plugins.filter(function (i) {
          return pluginNames.indexOf(i.name) < 0;
        }));
      }
      dependencies.extendIf(opts, baseOptions);
    }
  }
  return config;
}

exports.loadTypeScriptCompiler = function (path, compilerOptions, cachedTypescript) {
  if (cachedTypescript) { return cachedTypescript; }
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
      path = osPath.resolve(path)
      exists1 = fs.existsSync(path)
      try {
        if (exists1 || fs.existsSync(path + ".js")) {
          dependencies.patchTypeScript(exists1 ? path : path + ".js")
        }
        typescript1 = require(path);
      } catch (e) {}
    }
    if (osPath.resolve(path).startsWith(process.cwd())) {
      print('Load the TypeScript dependency:', typescript1 != null ? "succeed" : "fail");
    } else {
      print('Load a customized TypeScript compiler:', typescript1 != null ? "succeed" : "fail");
    }
  }
  if (typescript1 == null) {
    path = "typescript/lib/typescript"
    exists1 = fs.existsSync(path)
    dependencies.patchTypeScript(exists1 ? path : path + ".js")
    typescript1 = require("typescript/lib/typescript");
  }
  return compilerOptions.typescript = typescript1;
}

exports.removeSomeTypeScriptOptions = function (compilerOptions, cachedTypescript) {
  if (cachedTypescript.__tsOptionsCleaned) { return; }
  var hasOwn = Object.prototype.hasOwnProperty, toDelete = [];
  for (let key in compilerOptions) {
    if (key === "typescript" || key === "__proto__") { continue; }
    if (!hasOwn.call(compilerOptions, key)) { continue; }
    var declared = cachedTypescript.optionDeclarations.some(function(i) {
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
    delete compilerOptions[toDelete[i]]
  }
  if (toDelete.length > 1) {
    print("Skip these TypeScript options:", toDelete.join(", "));
  } else if (toDelete.length === 1) {
    print("Skip the TypeScript option:", toDelete[0]);
  }
  cachedTypescript.__tsOptionsCleaned = true;
}

exports.normalizeTSConfig = function (tsconfig) {
  var opts = tsconfig.compilerOptions;
  if (tsconfig.build && opts.types) {
    opts.types = opts.types.filter(i => i !== "build");
  }
  if (opts.noImplicitUseStrict) {
    opts.alwaysStrict = false;
  }
  opts.removeComments = false;
  const arr = opts.plugins || [];
  for (let i = arr.length; 0 <= --i; ) {
    if (arr[i].name == "typescript-tslint-plugin") {
      arr.splice(i, 1);
    }
  }
  return opts;
}

var _mergedProject5 = null, _mergedProjectInput5 = null, _mergedProject6 = null, _mergedProjectInput6 = null

exports.compileTS = function (stream, options, extra, done, debugging, dest, willListFiles) {
  var localCompileInBatch = options && options.inBatch != null ? options.inBatch : true;
  var allIfNotEmpty = localCompileInBatch && exports.gulpAllIfNotEmpty()
  if (allIfNotEmpty) {
    stream = stream.pipe(allIfNotEmpty.prepare);
  }
  if (!debugging) {
    stream = stream.pipe(newer({ dest, ext: '.js', extra }));
  }
  stream = stream.pipe(gulpSome(function(file) {
    var t = file.relative, s = ".d.ts", i = t.length - s.length;
    return i < 0 || t.indexOf(s, i) !== i;
  }));
  if (allIfNotEmpty) {
    stream = stream.pipe(allIfNotEmpty.cond);
  }
  if (willListFiles) { stream = stream.pipe(gulpPrint()); }
  var es6Module = !!options && !!options.module?.toLowerCase().startsWith("es")
  var merged = es6Module ? _mergedProjectInput6 : _mergedProjectInput5
  var isInitingMerged = merged == null;
  if (isInitingMerged) {
    merged = exports.gulpMerge();
    es6Module ? _mergedProjectInput6 = merged : _mergedProjectInput5 = merged
  }
  stream.pipe(merged.attachSource());
  if (isInitingMerged) {
    gulpfile.getBuildConfigStream().pipe(merged.attachSource());
    merged.on("end", () => es6Module ? _mergedProjectInput6 = _mergedProject6 = null
        : _mergedProjectInput5 = _mergedProject5 = null)
    merged = merged.pipe(gulpSome(function(file) {
      var t = file.relative, s = ".d.ts", i = t.length - s.length;
      return i < 0 || t.indexOf(s, i) !== i;
    })).pipe(exports.gulpMap(exports.correctBuffer))
    merged = merged.pipe(gulpfile.tsProject(options?.module?.toLowerCase()))
    merged = merged.pipe(exports.gulpMap(inlineGetters.bind(null, es6Module)))
    merged = gulpfile.outputJSResult(merged, es6Module);
    es6Module ? _mergedProject6 = merged : _mergedProject5 = merged;
  }
  merged = es6Module ? _mergedProject6 : _mergedProject5
  merged.on("finish", done);
}

const inlineGetters = (isES6, file) => {
  const path = file.relative.replace(/\\/g, "/")
  if (!path.includes("background/")) { return }
  let text = exports.ToString(file)
  if (isES6) {
    text = text.replace(/export const get_([\w$]+) ?=[^>]+>\s*[\w$]+;?/g, "export { $1 }")
        .replace(/\bget_([\w$]+)(\(\))?/g, "$1")
  } else {
    if (path.includes("/store")) {
      let prefix = text.split("void 0", 1)[0], suffix = text.slice(prefix.length)
      prefix = prefix.replace(/exports\.[gs]et_([\w$]+) ?= ?/g, "")
      suffix = suffix.replace(/exports\.[gs]et_[\w$]+ ?=\s*\S(\{[^}]*\}|[^{;])+;/g, (s) =>
          s.startsWith("exports.set") ? "" : s.replace(/get_/g, ""))
      text = prefix + suffix
      // .replace(/exports\.[gs]et_([\w$]+)/g, "exports.$1")
    }
    text = text.replace(/\b\w+\.[gs]et_[\w$]+\(\)?/g, (s) =>
      s.includes(".set_") ? "(" + s.slice(0, -1).replace(/set_/, "") + " = " : s.slice(0, -2).replace(/get_/, ""))
  }
  text = text.replace(/(?<!"%)\bc[A-Z][a-z]\w*/g, "$&_")
  exports.ToBuffer(file, text)
}

exports.makeCompileTask = function (src, header_files, options, compile) {
  header_files = typeof header_files === "string" ? [header_files] : header_files || [];
  return function(done) { compile(src, header_files, done, options) }
}

exports.makeCompileTasks = function (tasks, compile) {
  var hasOwn = Object.prototype.hasOwnProperty;
  for (var key in tasks) {
    if (!hasOwn.call(tasks, key)) { continue; }
    var config = tasks[key],
    task = exports.makeCompileTask(config[0], config[1], config.length > 2 ? config[2] : null, compile);
    gulp.task(key, gulp.series("locally", task));
    gulp.task("build/" + key, task);
    if (fs.existsSync(key) && fs.statSync(key).isDirectory()) {
      gulp.task(key + "/", gulp.series(key));
    }
  }
}

var _hasLoggedTerserPasses = false
exports.getGulpTerser = function (aggressiveMangle, unique_passes, noComments) {
  dependencies.patchTerser()
  const passes = unique_passes && unique_passes > 1 ? unique_passes : 0
  const betterMinifier = {
      minify: async function (files, config) {
        var terser = require("terser")
        var aggressiveTerser = aggressiveMangle ? require("./uglifyjs-mangle") : terser
        let firstOut = await aggressiveTerser.minify(files, { ...config,
          mangle: aggressiveMangle ? config.mangle : null,
          format: { ...config.format, comments: /^[!@#]/, preserve_annotations: true,
              ast: !aggressiveMangle, code: !!aggressiveMangle },
        }), ast = aggressiveMangle ? firstOut.code
            // @ts-ignore
            : firstOut.ast;
        // @ts-ignore
        if (firstOut.error) { return firstOut; }
        for (let i = 2; i < unique_passes; i++) {
          _hasLoggedTerserPasses || print("terser: middle pass #%o", i)
          ast = (await terser.minify(ast, { ...config,
            format: { ...config.format, comments: /^[!@#]/, preserve_annotations: true, ast: true, code: false },
            compress: { ...config.compress, sequences: false, passes: 1, global_defs: null },
            mangle: null,
          // @ts-ignore
          })).ast
        }
        _hasLoggedTerserPasses || print("terser: last pass #%o, seqences=%o", unique_passes, maxDistSequences)
        _hasLoggedTerserPasses = true
        return await terser.minify(ast, { ...config, mangle: aggressiveMangle ? null : config.mangle,
          compress: { ...config.compress, sequences: maxDistSequences, passes: 1, global_defs: null },
          format: { ...config.format, comments: noComments ? false : /^!/,
            preserve_annotations: false, ast: false, code: true },
        })
      }
  }
  return terserOptions => {
    return exports.gulpMap(function (file, done) {
      const stream = this;
      const minifier1 = passes ? betterMinifier : aggressiveMangle ? require("./uglifyjs-mangle") : require("terser")
      const nameCache = terserOptions.nameCache
      if (nameCache) {
        nameCache.props || (nameCache.props = { props: {} })
        terserOptions = { ...terserOptions, nameCache: { vars: { props: {} },
            get props () { return nameCache.props }, set props (v) { nameCache.props = v } } }
      }
      minifier1.minify(exports.ToString(file), terserOptions).then(result => {
        // @ts-ignore
        if (!result || result.error) {
          // @ts-ignore
          throw new Error(result ? result.error.message ? result.error.message : "(empty-message)" : "(null)");
        }
        exports.ToBuffer(file, result.code)
        stream.push(file);
        done();
      }, err => {
        stream.emit('error', err)
        done();
      });
    }, true);
  }
}

exports.makeTasks = function (Tasks) {
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
    /** @type { string[] } */
    // @ts-ignore
    const knownTasks = gulp.tree().nodes
    const toTest = task[0] instanceof Array ? task[0] : task
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
          gulp.series(task[0] instanceof Array ? gulp.parallel(...task[0]) : task[0]
              , task[1] instanceof Array ? gulp.parallel(...task[1]) : task[1]))
    } else {
      gulp.task(key, task.length === 1 && typeof Tasks[task[0]] === "function" ? Tasks[task[0]]
          : gulp.parallel(...task));
    }
  }
}

exports.checkJSAndMinifyAll = function (taskOrder, maps, key, exArgs, cb
    , jsmin_status, debugging) {
  Promise.all(maps.map(function(i) {
    if (debugging) { return true; }
    var is_file = i[1] && i[1] !== ".";
    return exports.checkAnyNewer(i[0], JSDEST, is_file ? osPath.join(DEST, i[1]) : DEST, is_file ? "" : ".js");
  })).then(function(all) {
    if (!all.some(i => i)) { jsmin_status[taskOrder] = true; return cb(); }
    exArgs.passAll = true;
    var tasks = [];
    for (var i = 0; i < maps.length; i++) {
      const name = key + "/_" + (i + 1)
      const map = maps[i]
      const rollup = !!map[2] && !!map[2].rollup
      tasks.push(name);
      gulp.task(name, function() {
          const newExArgs = {...exArgs, rollup};
          return exports.minifyJSFiles(map[0], map[1], newExArgs)
      });
    }
    gulp.series(...tasks)(function(err) {
      jsmin_status[taskOrder] = true;
      if (exArgs.nameCache) {
        const toSave = { props: {... exArgs.nameCache.props}, vars: {... exArgs.nameCache.vars} }
        const path = osPath.join(JSDEST, ".names-" + key.replace("min/", "") + ".cache");
        let json = Object.keys(toSave.props.props || {}).length === 0
            && Object.keys(toSave.vars.props || {}).length === 0 ? "" : JSON.stringify(toSave)
        if (fs.existsSync(path) && JSON.stringify(dependencies.readJSON(path)) === json) {
          print("NameCache for " + key.replace("min/", "") + " is unchanged");
        } else {
          dependencies.writeJSON(path, json)
          print("Saved nameCache for " + key.replace("min/", ""));
        }
      }
      cb(err);
    });
  });
}

var willListEmittedFiles, excludedPathRe, minifyDistPasses, gNoComments, maxDistSequences
exports.set_minifier_env = function () {
  [willListEmittedFiles, excludedPathRe, minifyDistPasses, gNoComments, maxDistSequences ] = arguments
}

exports.minifyJSFiles = function (path, output, exArgs) {
  exArgs || (exArgs = {});
  const base = exArgs.base || JSDEST;
  path = exports.formatPath(path, base);
  output = output || ".";

  var stream = gulp.src(path, { base: base });
  var isJson = !!exArgs.json;
  var ext = isJson && !exArgs.toJs ? ".json" : ".js";
  var is_file = output.endsWith(ext);

  if (!exArgs.passAll) {
    const newerTransform = newer(is_file ? { dest: osPath.join(DEST, output) } : { dest: DEST, ext })
    if (!is_file && exArgs.nameCache) {
      if (!("_bufferedFiles" in newerTransform)) {
        throw new Error("This version of `gulp-newer` is unsupported!");
      }
      // @ts-ignore
      newerTransform._bufferedFiles = [];
    }
    stream = stream.pipe(newerTransform);
  }
  let allPaths = null;
  if (is_file) {
    stream = stream.pipe(exports.gulpMap(function(file) {
      allPaths = (allPaths || []).concat(file.history);
    }));
  }
  if (is_file) {
    if (willListEmittedFiles) {
      // @ts-ignore
      stream = stream.pipe(gulpPrint());
    }
    if (exArgs.rollup) {
      stream = stream.pipe(gulpRollupContent(excludedPathRe))
    }
    stream = stream.pipe(exports.gulpMap(exports.correctBuffer)).pipe(require("gulp-concat")(output));
  }
  var nameCache = exArgs.nameCache;
  var stdConfig = gulpfile.loadTerserConfig(!!nameCache)
  if (nameCache) {
    stdConfig.nameCache = nameCache;
  }
  if (!isJson) {
    stream = stream.pipe(exports.gulpMap(gulpfile.beforeTerser))
  }
  let config = stdConfig
  if (isJson) {
    stream = stream.pipe(exports.gulpMap(exports.minifyJson.bind(null, exArgs.toJs)))
  } else if (minifyDistPasses > 0) {
    if (exArgs.format) { config = { ...config, format: { ...(config.format || {}), ...exArgs.format} } }
    stream = stream.pipe(exports.getGulpTerser(!!(exArgs.aggressiveMangle && config.mangle)
        , minifyDistPasses, gNoComments)(config))
  }
  if (!isJson) {
    stream = stream.pipe(exports.gulpMap(function (file) {
      gulpfile.postTerser(stdConfig, file, allPaths)
    }));
  }
  return exports.destCached(stream, DEST, willListEmittedFiles && !is_file)
}

var oriRollupConfig;
function gulpRollupContent(localExcludedPathRe) {
  var transformer = new Transform({objectMode: true});
  var others = []
  var historys = []
  transformer._transform = function(srcFile, _encoding, done) {
    if (localExcludedPathRe.test(srcFile.history.join(";"))) { // env.js / define.js
      this.push(srcFile);
    } else {
      others.push(srcFile)
    }
    historys = historys.concat(srcFile.history)
    done();
  };
  transformer._flush = function(done) {
    const file = others[others.length - 1];
    if (!file) {
      return done();
    }
    oriRollupConfig = oriRollupConfig || require("./rollup.config.js")
    require("rollup").rollup({ ...oriRollupConfig, output: null, input: require("path").relative(file.cwd, file.path) })
    .then(builder => builder.generate({ ...oriRollupConfig.output, file: null }))
    .then(result => {
      if (result === undefined) {
        return done(new Error("No rollup.js found"));
      }
      var code = result.output[0].code
      code = dependencies.inlineAllSetters(code)
      exports.ToBuffer(file, code)
      file.history = historys
      this.push(file)
      done()
    }, err => done(err))
  };
  return transformer
}

exports.kAllBuildEnv = Object.entries(process.env)
    .filter((i) => i[0].startsWith("BUILD_") && !i[0].toLowerCase().includes("random"))
    .map(i => i[0] + "=" + i[1]).sort().join("&")

exports.parseBuildEnv = function (key, literalVal) {
  var newVal = process.env["BUILD_" + key];
  if (newVal) {
    let newVal2 = exports.safeJSONParse(newVal, null, key === "Commit" ? String : null);
    if (newVal2 == null && key === "Commit") { newVal2 = newVal }
    if (newVal2 != null) {
      newVal = newVal2
      print("Use env:", "BUILD_" + key, "=", newVal);
    }
  } else if (key.startsWith("Random")) {
    // @ts-ignore
    newVal = (id, locally) => exports.getRandom(id, locally
        , () =>  `${osPath.resolve(__dirname).replace(/\\/g, "/")}:${id}?${exports.kAllBuildEnv}&t=${
                  // @ts-ignore
                  parseInt(+fs.statSync("manifest.json").mtimeMs)}`)
  } else if (key === "Commit") {
    // @ts-ignore
    newVal = (_, locally) => locally || !exports.NeedCommitInfo ? exports.safeJSONParse(literalVal, null, String)
        : dependencies.getGitCommit()
  }
  return newVal
}

var randMap, _randSeed;

exports.getRandMap = function () { return randMap }

exports.getRandom = function (id, _locally, getSeed) {
  var rand = randMap ? randMap[id] : 0;
  if (rand) {
    return rand;
  }
  if (!randMap) {
    randMap = {};
    _randSeed = getSeed()
    const name = _randSeed.split("?").slice(-1)[0]
    name && print("Get random seed:", name)
    var rng;
      try {
        rng = require("seedrandom");
      } catch (e) {}
    if (rng) {
      _randSeed = rng(_randSeed + "/" + id)
    }
  }
    while (!rand || Object.values(randMap).includes(rand)) {
      /** {@see #GlobalConsts.SecretRange} */
      rand = 1e6 + (0 | ((typeof _randSeed === "function" ? _randSeed() : Math.random()) * 9e6));
    }
  randMap[id] = rand;
  return rand;
}
