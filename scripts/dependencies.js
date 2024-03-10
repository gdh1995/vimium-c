// @ts-check
"use strict";

/**
 * @typedef { {
 *    argv: string[];
 *    env: {[key: string]: string | undefined};
 *    chdir (cwd: string): void;
 *    cwd (): string;
 *    exit (err?: number): void;
 * } } ProcessType
 * @typedef { {
 *    [ind: number]: number; length: number;
 *    toString (encoding?: string, start?: number, end?: number): string;
 * } } Buffer
 * @typedef { {
 *    size: number;
 *    mtime: Date; atime: Date;
 *    isDirectory (): boolean;
 * } } FileStat
 * @typedef { {
 *    openSync (path: string, method: "a" | "r" | "w"): number;
 *    fstatSync (fd: number): FileStat;
 *    futimesSync (fd: number, atime: number, mtime: number): void;
 *    close (fd: number): void;
 *    closeSync (fd: number): void;
 *    existsSync (path: string): boolean;
 *    statSync (path: string): FileStat;
 *    mkdirSync (path: string, options?: {recursive?: boolean}): void;
 *    readFileSync (path: string): Buffer;
 *    writeFile (path: string, data: string | Buffer, callback?: (err?: Error) => void): void;
 *    writeFileSync (path: string, data: string | Buffer): void;
 *    unlinkSync (path: string): void
 *    createReadStream (path: string): any;
 * } } FileSystem
 * 
 * @typedef { {
 *    compress: any; format: any; mangle: any; ecma?: 5 | 2015 | 2016 | 2017 | 2018;
 * } } TerserOptions
 */
/** @type {FileSystem} */
// @ts-ignore
var fs = require("fs");
// @ts-ignore
var pathDirname = require("path").dirname
/** @type {string} */
// @ts-ignore
var projectRoot = pathDirname(pathDirname(__filename)).replace(/\\/g, "/")
/** @type { { [func in "log" | "warn"]: (...messages: any[]) => unknown } } */
var console = globalThis.console

/**
 * Read file to string and remember info like BOM (support utf-8 / utf16le)
 * @param {string} fileName - file path
 * @param { { bom?: "\uFFFE" | "\uFEFF" | "" } | null } [info] - object to store extra info
 * @returns {string} file text content
 */
exports.readFile = (fileName, info) => {
  info == null && (info = {});
  var buffer = fs.readFileSync(fileName);
  var len = buffer.length;
  // console.log("[DEBUG] read %o (%o bytes)", fileName, len);
  if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
      // flip all byte pairs and treat as little endian.
      len &= ~1;
      for (var i = 0; i < len; i += 2) {
          var temp = buffer[i];
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

/**
 * @callback ReadJson
 * @param {string} fileName - file path
 * @param {boolean} [throwError] - throw on error or just log it
 * @returns {any} parsed JSON object
 */
/** @type {ReadJson} */
var _readJSON;
/** @type { (fileName, object) => void } */
var _writeJSON;

/**
 * Read json file to any object or throw error
 * @type {ReadJson}
 */
exports.readJSON = (fileName, throwError) => {
  if (!_readJSON) { _makeJSONReader() }
  return _readJSON(fileName, throwError);
}

exports.writeJSON = (fileName, object) => {
  if (!_writeJSON) { _makeJSONReader() }
  return _writeJSON(fileName, object)
}

function _makeJSONReader() {
  var stringOrComment = /"(?:\\[^\r\n]|[^"\\\r\n])*"|'(?:\\[^\r\n]|[^'\\\r\n])*'|(?:\/\/|#)[^\r\n]*|\/\*[^]*?\*\//g
    , notLF = /[^\r\n]+/g, notWhiteSpace = /\S/;
  /** @type { {[path: string]: string} } */
  var cached = {};
  /** @param {string} str */
  function spaceN(str) { // @ts-ignore
    return ' '.repeat(str.length);
  }
  /** @param {string} str */
  function onReplace(str) {
    switch (str[0]) {
    case '/': case '#':
      if (str.slice(0, 2) === "/*") {
        // replace comments with whitespace to preserve original character positions
        return str.replace(notLF, spaceN);
      }
      return spaceN(str);
    case '"': case "'": // falls through
    default:
      return str;
    }
  }
  _readJSON = function (fileName, throwError) {
    fileName = fileName.replace(/\\/g, "/");
    /** @type string | undefined */
    var text = cached[fileName];
    if (text == null) {
      text = exports.readFile(fileName);
      text = text.replace(stringOrComment, onReplace);
      cached[fileName] = text;
    }
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
  _writeJSON = (fileName, object) => {
    fileName = fileName.replace(/\\/g, "/");
    var text = typeof object === "string" ? object : JSON.stringify(object)
    if (!text) {
      delete cached[fileName]
      fs.existsSync(fileName) && fs.unlinkSync(fileName)
      return
    }
    cached[fileName] = text;
    fs.writeFileSync(fileName, text);
  }
}

var _terserConfig = null

/**
 * Load configuration of terser
 * @param {string} path - file path
 * @param {boolean} [reload] - force to reload or return the cache if possible
 * @returns {TerserOptions & { nameCache?: { vars?: {}, props?: {} } }} parsed configuration object
 */
exports.loadTerserConfig = (path, reload) => {
  var a = _terserConfig;
  if (a == null || reload) {
    a = exports.readJSON(path);
    if (!reload) {
      _terserConfig = a;
    }
    var f = a.format || (a.format = {});
    var c = a.compress || (a.compress = {}); // gd = c.global_defs || (c.global_defs = {});
    function ToRegExp(literal) {
      var re = literal.match(/^\/(.*)\/([a-z]*)$/);
      return re ? new RegExp(re[1], re[2]) : literal;
    }
    if (typeof c.keep_fnames === "string") {
      c.keep_fnames = ToRegExp(c.keep_fnames);
    }
    var m = a.mangle, p = m && m.properties;
    if (p && typeof p.regex === "string") {
      p.regex = ToRegExp(p.regex);
    }
    if (m && typeof m.keep_fnames === "string") {
      m.keep_fnames = ToRegExp(m.keep_fnames);
    }
    else if (m && !m.keep_fnames) {
      m.keep_fnames = c.keep_fnames;
    }
    var comments = f.comments;
    if (comments && typeof comments === "string") {
      f.comments = ToRegExp(comments);
    }
    exports.patchTerser();
  }
  return a;
}

/**
 * Touch a file if it's older than `fileToCompareTime`
 * @param {string} targetPath - target file to check and touch
 * @param {string} [fileToCompareTime] - source file to compare its mtime
 * @param {boolean} [virtual] - whether to skip real actions
 * @returns {boolean | null} whether it's needed to touch or not
 */
exports.touchFileIfNeeded = (targetPath, fileToCompareTime, virtual) => {
  if (fileToCompareTime === targetPath) { fileToCompareTime = void 0; }
  if (!fs.existsSync(targetPath) || fileToCompareTime && !fs.existsSync(fileToCompareTime)) {
    return null;
  }
  var fd = fs.openSync(targetPath, "a"), fd2 = null;
  try {
    var stat = fs.fstatSync(fd);
    if (stat.mtime != null && fileToCompareTime) {
      var srcMtime = fs.fstatSync(fd2 = fs.openSync(fileToCompareTime, "r")).mtime;
      if (srcMtime != null && srcMtime < stat.mtime) {
        return false;
      }
    }
    virtual ||
    // @ts-ignore
    fs.futimesSync(fd, parseInt(stat.atime.getTime() / 1000, 10), parseInt(Date.now() / 1000, 10));
  } finally {
    fs.closeSync(fd);
    if (fd2 != null) {
      fs.closeSync(fd2);
    }
  }
  return true;
}

/**
 * Compare modification time of two files
 * @param {string} src - source file
 * @param {string} dest - target file
 * @returns {boolean} whether src is older than dest or not
 */
exports.compareFileTime = (src, dest) => {
  return exports.touchFileIfNeeded(dest, src, true) === false;
}

/**
 * Copy members of `a` into `b`
 * @template T
 * @param {T} b - dest object
 * @param {Partial<T>} a - source object
 * @return {T} b
 */
exports.extendIf = (b, a) => {
  Object.setPrototypeOf(a, null);
  for (var i in a) {
    // @ts-ignore
    (i in b) || (b[i] = a[i]);
  }
  return b;
}

/**
 * Get git commit id (7-character version) or null
 * @argument {number} [maxLen]
 * @return {string | null}
 */
exports.getGitCommit = (maxLen) => {
  try {
    if (fs.statSync(".git").isDirectory()) {
    var branch = exports.readFile(".git/HEAD");
    branch = branch && branch.trim();
    /** @type {string | undefined} */
    var commit;
    if (!branch.startsWith("ref:") && branch.length >= 32) {
      commit = branch;
    } else if (branch.startsWith("ref:") && branch.length > 4) {
      commit = exports.readFile(".git/" + branch.slice(4).trim());
    }
    } else {
      commit = require('child_process').execSync("git rev-parse HEAD").toString("utf8")
    }
    maxLen = maxLen || 0
    return commit ? commit.trim().slice(0, maxLen > 0 ? maxLen : maxLen < 0 ? commit.length : 7) : null;
  } catch (e) {}
  return null;
}

/**
 * 
 * @param {string} source
 * @param {boolean} locally
 * @param {{ (...args: any[]): any; error(message: string): any; }} [logger]
 * @returns { [string, string, string] | string }
 */
exports.patchExtendClick = (source, locally, logger) => {
  logger && logger('Patch the extend_click module');
  source = source.replace(/\b(addEventListener|toString|open|write) ?: ?function ?\w*/g, "$1");
  var match = /\/: \?function \\w\+\/g, ?(""|'')/.exec(source);
  if (match) {
    var start = Math.max(0, match.index - 128), end = match.index;
    var prefix = source.slice(0, start), suffix = source.slice(end);
    /** {@see #BrowserVer.MinEnsuredES6MethodFunction} */
    source = source.slice(start, end).replace(/>= ?45/, "< 45").replace(/45 ?<=/, "45 >");
    suffix = '/\\b(addEventListener|toString|open|write)\\(/g, "$1:function $1("' + suffix.slice(match[0].length);
    source = prefix + source + suffix;
  }
  match = /['"] ?\+ ?\(?function VC ?\(/.exec(source);
  if (match) {
    var start = match.index;
    var end1 = source.indexOf('}).toString()', start) + 1 || source.indexOf('}.toString()', start) + 1;
    var end2 = source.indexOf('")();"', end1 + 2) + 1 || source.indexOf("')();'", end1 + 2) + 1;
    if (end2 <= 0) {
      throw new Error('Can not find the end ".toString() + \\")();\\"" around the injected function.');
    }
    var prefix = source.slice(0, start), suffix = '"' + source.slice(end2 + ')();"'.length);
    source = source.slice(start + match[0].length, end1).replace(/ \/\/[^\n]*$/mg, "").replace(/"/g, "'");
    source = source.replace(/\\/g, "\\\\");
    if (locally) {
      source = source.replace(/([\r\n]) {4}/g, "$1").replace(/\r\n?|\n/g, "\\n\\\n");
    } else {
      source = source.replace(/[\r\n]\s*/g, "");
    }
    source = "function(" + source + ")()";
    const sourceHead = "''use strict';("
    if (prefix.slice(-sourceHead.length).replace(/"/g, "'") === sourceHead) {
      prefix = prefix.slice(0, -sourceHead.length) + '"'
      source = sourceHead.slice(1) + source
    }
    return [prefix, source, suffix];
  } else if (! (/(=|\?|:|\|\|) ?'"use strict";\(function\b/).test(source)) {
    throw Error("Error: can not wrap extend_click scripts!!!");
  }
  return source;
}

/**
 * @argument {string} filePath
 * @argument {{ (...args: any[]): any; error(message: string): any; }} logger
 * @returns {boolean} whether successful or not
 */
exports.logFileSize = (filePath, logger) => {
  try {
    var fd = fs.openSync(filePath, "r"),
    size = fs.fstatSync(fd).size;
    fs.close(fd);
    logger("%o: %o bytes = %o KB", filePath, size, ((size / 1024 * 100 + 0.5) | 0) / 100);
    return true;
  } catch (e) {
    logger.error('fail to read "' + filePath + '": ' + e);
    return false;
  }
}

/**
 * @param {string} path
 * @param {string} data
 * @return {string}
 */
const kFilenameHeader = '"use strict";\n__filename = '
exports.addMetaData = (path, data) => {
  const isAMDModule = /^define\(\[/m.test(data.slice(0, 512))
  if (!isAMDModule || data.startsWith(kFilenameHeader)) { return data }
  path = path.replace(/\\/g, "/").replace(projectRoot, "").replace(/^\//, "")
  var banner = kFilenameHeader + JSON.stringify(path) + ";\n"
  return banner + data;
}

/**
 * @param { string } code 
 * @returns { string }
 */
exports.inlineAllSetters = (code) => {
  const allNames = code.match(/\bset_[a-zA-Z]\w*\b/g) || []
  for (let i = 0; i < allNames.length; i++) {
    const name = allNames[i].slice(4);
    if (!new RegExp("\\b" + name + " ?=").test(code)) {
      throw new Error('Can not find symbol "' + name + '"');
    }
  }
  code = code.replace(/\b[gs]et_([a-zA-Z]\w*)\(\)?/g, function (fullStr, name, ind) {
    if (code.slice(ind - 16, ind).trim().endsWith("function")) {
      return fullStr;
    }
    if (fullStr[0] === "g") {
      if (!fullStr.endsWith(")")) {
        const data = code.slice(ind + fullStr.length).split("\n", 1)[0]
        console.log("[WARNING] inlineSetters: found a parameterized getter:", name + "(" + data.split(")", 1)[0] + ")")
        return fullStr;
      }
      return name
    }
    return "(" + name + " = ";
  });
  return code
}

var tsPatched = ""
/** @argument {string} path */
exports.patchTypeScript = (path) => {
  if (tsPatched && tsPatched === path) { return }
  let todo = 2
  let code = fs.readFileSync(path).toString("utf8")
  const oldSize = code.length
  {
    const start = code.indexOf("function convertIterationStatementBodyIfNecessary(")
    const slice = start > 0 ? code.substr(start, 4096) : ""
    const ind1 = slice.includes("ts.allowForOf") ? (todo--, -2)
        : slice.indexOf("{", 0)
    if (ind1 > 0) {
      code = code.slice(0, start + ind1 + 1)
          + "\n            convert = ts.allowForOf ? null : convert;"
          + code.slice(start + ind1 + 1)
      todo--
    } else if (ind1 === -1) {
      throw new Error("Can not patch convertIterationStatementBodyIfNecessary in TypeScript")
    }
  }
  {
    const start = code.indexOf("function emitCallExpression(")
    const slice = start > 0 ? code.substr(start, 512) : ""
    const ind1 = slice.includes("indirectCall = 0; //") ? (todo--, -2)
        : slice.indexOf("indirectCall = ts.getEmitFlags(", 0)
    if (ind1 > 0) {
      const pos = start + ind1 + "indirectCall = ".length
      code = code.slice(0, pos) + "0; // " + code.slice(pos)
      todo--
    } else if (ind1 === -1) {
      throw new Error("Can not patch IndirectCall in TypeScript")
    }
  }
  let name = path.replace(/\\/g, "/")
  name = name.toLowerCase().includes("typescript/lib") ? "TypeScript/lib/" + name.split("/").slice(-1)[0]
      : name.split("node_modules/").slice(-1)[0]
  if (code.length !== oldSize) {
    require("fancy-log")(`Patch ${name}: succeed`)
    fs.writeFileSync(path, code)
    tsPatched = path
  } else if (todo) {
    throw new Error("Can not patch " + name)
  }
}

/**
 * @argument {any} ts
 * @param {{ (...args: any[]): any; error(message: string): any; }} [logger]
 * @argument {boolean} [noGenerator]
 * @argument {boolean} [wrapGeneratorToken]
 * @argument {boolean} [allowForOf]
 */
exports.patchTSNamespace = (ts, logger, noGenerator, wrapGeneratorToken, allowForOf) => {
  var key, bak = "_bak_"

  key = "transformGenerators"
  var logged1 = false
  var originalTransGen = ts[bak + key] || ts[key]
  var notTransformGenerator = function (_context) {
    if (!logged1) {
      logged1 = true;
      (logger || console.log)("Not transform ES6 generators");
    }
    return function (node) { return node; };
  }
  ts[bak + key] = noGenerator ? originalTransGen : null
  ts[key] = noGenerator ? notTransformGenerator : originalTransGen

  key = "createPropertyAccessExpression"
  var originalPropAccExpr = ts.factory[bak + key] || ts.factory[key]
  if (originalPropAccExpr) {
    var wrappedAccessPropExpr = function (_expression, name) {
      var args = [].slice.call(arguments, 0)
      args[1] = name === "label" ? "label_" : name === "sent" ? "sent_" : name
      return originalPropAccExpr.apply(this, args)
    }
    ts.factory[bak + key] = wrapGeneratorToken ? originalPropAccExpr : null
    ts.factory[key] = wrapGeneratorToken ? wrappedAccessPropExpr : originalPropAccExpr
  }
  key = "createPropertyAccess"
  var originalAccessProp = ts[bak + key] || ts[key]
  if (originalAccessProp) {
    var wrappedAccessProp = function (_expression, name) {
      var args = [].slice.call(arguments, 0)
      args[1] = name === "label" ? "label_" : name === "sent" ? "sent_" : name
      return originalAccessProp.apply(this, args)
    }
    ts[bak + key] = wrapGeneratorToken ? originalAccessProp : null
    ts[key] = wrapGeneratorToken ? wrappedAccessProp : originalAccessProp
  }
  key = "createDiagnosticCollection"
  if (!ts[bak + key]) {
    var originalCDC = ts[key]
    const wrappedCDC = function () {
      const dc = originalCDC.apply(this, arguments)
      const oldAdd = dc.add
      if (typeof oldAdd !== "function") {
        throw new Error("unexpected ts.createDiagnosticCollection : no .add")
      }
      dc.add = function(diag) {
        if (diag.code === 5055 && (diag.file ? diag.file.fileName.endsWith(".js")
            : diag.messageText.includes(".js'"))) {
          console.log("Ignore a warning:", diag.file ? diag.file.fileName : diag.messageText.split("'")[1])
          return
        }
        return oldAdd.apply(this, arguments)
      }
      return dc
    }
    ts[bak + key] = originalCDC
    ts[key] = wrappedCDC
  }
  ts.allowForOf = allowForOf;
}

let __terserPatched = false
exports.patchTerser = () => {
  if (__terserPatched) { return }
  __terserPatched = true
  let path = "node_modules/terser/package.json"
  let i = 0
  for (; i < 4 && !fs.existsSync(path); i++) { path = "../" + path; }
  if (i > 4) { return } // no terser installed
  const terserPackage = exports.readJSON(path)
  if (!terserPackage.exports) { return }
  let mod = false
  for (const i of ["./lib/parse", "./lib/ast"]) {
    if (!terserPackage.exports[i]) {
      mod = true
      terserPackage.exports[i] = i + ".js"
    }
  }
  if (mod) {
    fs.writeFileSync(path, JSON.stringify(terserPackage, null, 2))
    // @ts-ignore
    delete require.cache[require("path").resolve(path)]
    var ver = ""
    try {
      ver = require("terser/package.json").version;
    } catch (e) {
      console.log("Can not read the version of terser.");
      throw e;
    }
    if (!ver) {
      console.log("Warning: Can not get the version of terser.")
    }
    require("fancy-log")("Patch terser/package.json: succeed");
  }
}

const BrowserType = exports.BrowserType = {
  Chrome: 1,
  Firefox: 2,
  Edge: 4,
  Safari: 8,
  WithDialog: 3,
}

/**
 * @argument {{ [key: string]: any }} global_defs
 * @argument {number} btypes
 */
exports.fill_global_defs = (global_defs, btypes) => {
  for (const key of Object.keys(BrowserType)) {
    const val = BrowserType[key], onlyVal = btypes === val
    if (onlyVal || !(btypes & val)) {
      global_defs[key.startsWith("With") ? key : "On" + key] = onlyVal
    }
  }
}

/**
 * @argument {{ [key: string]: any }} global_defs
 * @argument {string} code
 * @returns {string}
 */
exports.replace_global_defs = (global_defs, code) => {
  const keys = Object.keys(global_defs).join("|")
  if (!keys) { return code }
  const keyRe = new RegExp(`\\b(?:${keys})\\b`, "g")
  /** @type {[start: number, end: number, value: any][]} */
  const to_replace = []
  let match
  while (match = keyRe.exec(code)) {
    const pos = match.index, key = match[0]
    if (code[pos - 1] === "." && code.substr(pos + key.length, 12).trimLeft()[0] !== "=") {
      const arr = [...code.slice(Math.max(0, pos - 32), pos - 1)].reverse().join("")
      const prefix = /^[\w$]+/.exec(arr)
      if (prefix) {
        to_replace.push([pos - 1 - prefix[0].length, pos + key.length, global_defs[key]])
      }
    } else if ("|&?)".includes(code.substr(pos + key.length, 64).trimLeft()[0] || "a")) {
      to_replace.push([pos, pos + key.length, global_defs[key]])
    }
  }
  if (!to_replace.length) { return code }
  let buf = [], offset = 0
  for (const task of to_replace) {
    buf.push(code.slice(offset, task[0]), "" + task[2])
    offset = task[1]
  }
  buf.push(code.slice(offset))
  return buf.join("")
}

/**
 * @argument {number} btypes
 * @argument {number} minCVer
 * @argument {() => string} get_code
 * @returns {string | null}
 */
exports.skip_declaring_known_globals = (btypes, minCVer, get_code) =>{
  var toRemovedGlobal = "";
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
  if (!(btypes & BrowserType.Chrome && minCVer < /* MinEnsured$visualViewport$ */ 61
        || btypes & BrowserType.Edge)) {
    toRemovedGlobal += "visualViewport|";
  }
  if (!(btypes & BrowserType.Chrome && minCVer < /* Min$queueMicrotask */ 71 || btypes & BrowserType.Edge)) {
    toRemovedGlobal += "queueMicrotask|";
  }
  if (!(btypes & BrowserType.Chrome && minCVer < /* BrowserVer.MinEnsured$WeakRef */ 92
        || btypes & BrowserType.Firefox)) {
    toRemovedGlobal += "WeakRef|";
  }
  toRemovedGlobal = toRemovedGlobal.slice(0, -1);
  if (toRemovedGlobal) {
    const re = new RegExp(`(const|let|var|,)\\s?(${toRemovedGlobal})[,;]\n?\n?`, "g")
    let n = 0, remove = str => str[0] === "," ? str.slice(-1) : str.slice(-1) === "," ? str.split(/\s/)[0] + " " : "";
    const contents = get_code()
    let s1 = contents.slice(0, 2000)
    for (; ; n++) {
      let s2 = s1.replace(re, remove);
      if (s2.length === s1.length) {
        break;
      }
      s1 = s2;
    }
    if (n > 0) {
      return s1 + contents.slice(2000)
    }
  }
  return null
}
