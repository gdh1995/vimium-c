//@ts-check
"use strict";
var dependencies = require("./dependencies");
var fs = require("fs");
var gulp = require("gulp");
var gulpChanged = require('gulp-changed');
var gulpPrint = require('gulp-print').default;
var gulpSome = require('gulp-some');
var logger = require("fancy-log");
var newer = require('gulp-newer');
var osPath = require('path');
var gulpfile = require("../gulpfile")

var DEST, JSDEST;

function print() { logger.apply(null, arguments) }

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
  path = exports.formatPath(path, dest);
  var rimraf = require("rimraf");
  return gulp.src(path, {
      base: ".", read: false, dot: true, allowEmpty: true, nodir: true
  }).pipe(exports.gulpMap(file => {
    rimraf.sync(file.path, { disableGlob: true });
  }));
}

exports.minifyJson = function (file) {
  var contents = exports.ToString(file.contents), oldLen = contents.length;
  var data = JSON.parse(contents);
  contents = JSON.stringify(data);
  if (contents.length !== oldLen) {
    file.contents = exports.ToBuffer(contents);
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
  var Transform = require('stream').Transform
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
  var Transform = require('stream').Transform
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

exports.gulpMap = function (map, async) {
  var Transform = require('stream').Transform
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
      })
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
  var Transform = require('stream').Transform
  var knownFiles = {}
  var ref = 0
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
  // @ts-ignore
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

exports.ToBuffer = function (string) { return Buffer.from ? Buffer.from(string) : new Buffer(string) }

exports.ToString = function (buffer) { return buffer.toString('utf8') }

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
  if (cachedTypescript) { return; }
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
      try {
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

var _mergedProject = null, _mergedProjectInput = null

exports.compileTS = function (stream, options, extra, done, doesMergeProjects
    , debugging, dest, willListFiles, getBuildConfigStream, beforeCompile, outputJSResult, tsProject) {
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
  stream = stream.pipe(exports.gulpMap(beforeCompile));
  var merged = doesMergeProjects ? _mergedProjectInput : null;
  var isInitingMerged = merged == null;
  if (isInitingMerged) {
    merged = exports.gulpMerge();
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
  var aggressive = aggressiveMangle && require("./uglifyjs-mangle")
  var terser = require("terser")
  const passes = unique_passes && unique_passes > 1 ? unique_passes : 0
  const minifier = passes ? {
      minify: async function (files, config) {
        let firstOut = await (aggressive || terser).minify(files, { ...config,
          mangle: aggressive ? config.mangle : null,
          format: { ...config.format, comments: /^[!@#]/, preserve_annotations: true,
              ast: !aggressive, code: !!aggressive },
        }), ast = aggressive ? firstOut.code
            // @ts-ignore
            : firstOut.ast;
        // @ts-ignore
        if (firstOut.error) { return firstOut; }
        for (let i = 2; i < unique_passes; i++) {
          _hasLoggedTerserPasses || print("terser: middle pass #%o", i)
          ast = (await terser.minify(ast, { ...config,
            format: { ...config.format, comments: /^[!@#]/, preserve_annotations: true, ast: true, code: false },
            compress: { ...config.compress, sequences: false, passes: 1 },
            mangle: null,
          // @ts-ignore
          })).ast
        }
        _hasLoggedTerserPasses || print("terser: last pass #%o, seqences=%o", unique_passes, maxDistSequences)
        _hasLoggedTerserPasses = true
        return await terser.minify(ast, { ...config, mangle: aggressive ? null : config.mangle,
          compress: { ...config.compress, sequences: maxDistSequences, passes: 1 },
          format: { ...config.format, comments: noComments ? false : /^!/,
            preserve_annotations: false, ast: false, code: true },
        })
      }
  } : aggressive || terser
  return terserOptions => {
    return exports.gulpMap(function (file, done) {
      const stream = this;
      minifier.minify(exports.ToString(file.contents), terserOptions).then(result => {
        // @ts-ignore
        if (!result || result.error) {
          // @ts-ignore
          throw new Error(result ? result.error.message ? result.error.message : "(empty-message)" : "(null)");
        }
        file.contents = exports.ToBuffer(result.code);
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

exports.checkJSAndMinifyAll = function (taskOrder, maps, key, exArgs, cb
    , jsmin_status, debugging, getNameCacheFilePath, cacheNames) {
  Promise.all(maps.map(function(i) {
    if (debugging) { return true; }
    var is_file = i[1] && i[1] !== ".";
    return exports.checkAnyNewer(i[0], JSDEST, is_file ? osPath.join(DEST, i[1]) : DEST, is_file ? "" : ".js");
  })).then(function(all) {
    var isNewer = false;
    for (var i = 0; i < all.length; i++) { if (all[i]) { isNewer = true; break; } }
    if (!isNewer && exArgs.nameCache && "timestamp" in exArgs.nameCache && cacheNames) {
      var path = getNameCacheFilePath(key);
      var stat = fs.existsSync(path) ? fs.statSync(path) : null;
      if (!stat || +stat.mtime < exArgs.nameCache.timestamp - 4) {
        isNewer = true;
      }
    }
    if (!isNewer) { jsmin_status[taskOrder] = true; return cb(); }
    exArgs.passAll = true;
    var tasks = [];
    for (var i = 0; i < maps.length; i++) {
      const name = key + "/_" + (i + 1)
      const map = maps[i]
      const rollup = !!map[2] && !!map[2].rollup
      tasks.push(name);
      gulp.task(name, function() {
          const newExArgs = {...exArgs, rollup};
          if (exArgs.aggressiveMangle) {
            exArgs.aggressiveMangle = false;
          }
          return exports.minifyJSFiles(map[0], map[1], newExArgs)
      });
    }
    gulp.series(...tasks)(function(err) {
      jsmin_status[taskOrder] = true;
      saveNameCacheIfNeeded(key, exArgs.nameCache, cacheNames, getNameCacheFilePath);
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
  if (path.join("\n").indexOf("viewer.min.js") < 0) {
    path.push("!**/*.min.js");
  }
  output = output || ".";

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
      ext: ext,
      extra: exArgs.passAll === false ? exArgs.nameCachePath || null
        : (exArgs.nameCachePath && path.push(exArgs.nameCachePath), path)
    } : {
      dest: DEST,
      extra: exArgs.nameCachePath || null,
      ext: ext
    });
    if (!is_file && exArgs.nameCachePath && exArgs.passAll !== false) {
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
      stream = stream.pipe(gulpPrint());
    }
    if (exArgs.rollup) {
      stream = rollupContent(stream, excludedPathRe)
    }
    stream = stream.pipe(require('gulp-concat')(output));
  }
  var nameCache = exArgs.nameCache;
  var stdConfig = gulpfile.loadTerserConfig(!!nameCache)
  if (nameCache) {
    stdConfig.nameCache = nameCache;
  }
  if (!isJson) {
    stream = stream.pipe(exports.gulpMap(gulpfile.beforeTerser))
  }
  const config = stdConfig;
  if (isJson) {
    stream = stream.pipe(exports.gulpMap(exports.minifyJson))
  } else if (minifyDistPasses > 0) {
    stream = stream.pipe(exports.getGulpTerser(!!(exArgs.aggressiveMangle && config.mangle)
        , minifyDistPasses, gNoComments)(config))
    if (exArgs.aggressiveMangle) {
      exArgs.aggressiveMangle = false;
    }
  }
  if (!isJson) {
    stream = stream.pipe(exports.gulpMap(function (file) {
      gulpfile.postTerser(null, file, allPaths)
    }));
  }
  if (willListEmittedFiles && !is_file) {
    stream = stream.pipe(gulpPrint());
  }
  return stream.pipe(gulp.dest(DEST));
}

var oriRollupConfig;
function rollupContent(stream, localExcludedPathRe) {
  var Transform = require('stream').Transform;
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
    oriRollupConfig.output.file = null
    require("rollup").rollup({ ...oriRollupConfig, output: null, input: require("path").relative(file.cwd, file.path) })
    .then(builder => builder.generate({ ...oriRollupConfig.output }))
    .then(result => {
      if (result === undefined) {
        return done(new Error("No rollup.js found"));
      }
      var code = result.output[0].code
      code = dependencies.inlineAllSetters(code)
      file.contents = Buffer.from(code)
      file.history = historys
      this.push(file)
      done()
    })
  };
  return stream.pipe(transformer)
}

exports.parseBuildEnv = function (key, literalVal, LOCAL_SILENT, locally) {
  var newVal = process.env["BUILD_" + key];
  if (!newVal) {
    let env_key = key.replace(/[A-Z]+[a-z\d]*/g, word => "_" + word.toUpperCase()).replace(/^_/, "");
    newVal = process.env["BUILD_" + env_key];
  }
  if (newVal) {
    let newVal2 = exports.safeJSONParse(newVal, null, key === "Commit" ? String : null);
    if (newVal2 == null && key === "Commit") { newVal2 = newVal }
    if (newVal2 != null) {
      newVal = newVal2
      LOCAL_SILENT || print("Use env:", "BUILD_" + key, "=", newVal);
    }
  } else if (key.startsWith("Random")) {
    // @ts-ignore
    newVal = (id) => exports.getRandom(id, locally
        , () =>  `${osPath.resolve(__dirname).replace(/\\/g, "/")}@${
                  // @ts-ignore
                  parseInt(+fs.statSync("manifest.json").mtimeMs)}/`)
  } else if (key === "Commit") {
    // @ts-ignore
    newVal = [
        exports.safeJSONParse(literalVal, null, String), locally ? null : dependencies.getGitCommit()]
  }
  return newVal
}

function saveNameCacheIfNeeded(key, nameCache, cacheNames, getNameCacheFilePath) {
  if (nameCache && cacheNames) {
    nameCache.timestamp = 0;
    const path = getNameCacheFilePath(key);
    if (fs.existsSync(path)) {
      const oldCache = dependencies.readJSON(path);
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

exports.loadNameCache = function (path, cacheNames, getNameCacheFilePath) {
  var nameCache = cacheNames ? dependencies.readJSON(getNameCacheFilePath(path), false) : null;
  if (nameCache) {
    print("Loaded nameCache of " + path);
  }
  return nameCache || { vars: {}, props: {}, timestamp: 0 };
}

var randMap, _randSeed;

exports.getRandMap = function () { return randMap }

exports.getRandom = function (id, locally, getSeed) {
  var rand = randMap ? randMap[id] : 0;
  if (rand) {
    if ((typeof rand === "string") === locally) {
      return rand;
    }
  }
  if (!randMap) {
    randMap = {};
    _randSeed = getSeed()
    var rng;
    if (!locally) {
      try {
        rng = require('seedrandom');
      } catch (e) {}
    }
    if (rng) {
      _randSeed = rng(_randSeed);
    }
  }
  if (!locally) {
    while (!rand || Object.values(randMap).includes(rand)) {
      /** {@see #GlobalConsts.SecretRange} */
      rand = 1e6 + (0 | ((typeof _randSeed === "function" ? _randSeed() : Math.random()) * 9e6));
    }
  } else {
    var hash = _randSeed + id;
    hash = compute_hash(hash);
    hash = hash.slice(0, 7);
    rand = hash;
  }
  randMap[id] = rand;
  return rand;
}

function compute_hash(str) {
  var crypto = require('crypto')
  var md5 = crypto.createHash('sha1')
  md5.update(str)
  return md5.digest('hex')
}
