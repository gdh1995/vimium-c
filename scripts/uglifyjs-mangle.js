#!/usr/bin/env node
// @ts-check
"use strict";

const MAX_ALLOWED_PROPERTY_GROUPS = 0;
const MIN_COMPLEX_CLOSURE = 300;
const MIN_COMPLEX_OBJECT = 1;
const MIN_ALLOWED_NAME_LENGTH = 3;
const MIN_LONG_STRING = 20;
const MIN_STRING_LENGTH_TO_COMPUTE_GAIN = 2;
const MIN_EXPECTED_STRING_GAIN = 11;

// @ts-ignore
const TEST = typeof require === "function" && require.main === module;
require("./dependencies").patchTerser();

/**
 * @typedef { import("terser").MinifyOptions } MinifyOptions
 * @typedef { import("terser").MinifyOutput } MinifyOutput
 * @typedef { import("../typings/base/terser").AST_Lambda } AST_Lambda
 * @typedef { import("../typings/base/terser").AST_Function } AST_Function
 * @typedef { import("../typings/base/terser").AST_Toplevel } AST_Toplevel
 * @typedef { Map<string, { references: object[]; mangled_name: string | null }> } VariableMap
 * @typedef { {
 *   vars?: { props?: { [oldName: string]: string } };
 *   props?: { props?: { [oldName: string]: string } };
 * } } NameCache
 */

/** @type { typeof import("../typings/base/terser").minify } */
let minify;
/** @type { typeof import("../typings/base/terser").parse } */
let parse;
/** @type { typeof import("../typings/base/terser").TreeWalker } */
let TreeWalker
/** @type { typeof import("../typings/base/terser").AST_Var } */
let AST_Var
/** @type { typeof import("../typings/base/terser").AST_SymbolVar } */
let AST_SymbolVar
const P = Promise.all([
  // @ts-ignore
  import("terser").then(i => minify = i.minify),
  import("terser/lib/parse").then(i => parse = i.parse),
  import("terser/lib/ast").then(i => { TreeWalker = i.TreeWalker; AST_Var = i.AST_Var; AST_SymbolVar = i.AST_SymbolVar }),
])

/**
 * @param { string | AST_Toplevel } text
 * @param { MinifyOptions } options
 * @returns { Promise<{
 *   namesToMangle: string[][]
 *   namesCount: ReadonlyMap<string, number>
 * }> }
 */
async function collectWords(text, options) {
  /** @type { Map<string, number> } */
  const map = new Map();
  /** @type { string[][] } */
  let namesToMangle = [];
  const _props0 = options.mangle && typeof options.mangle === "object" ? options.mangle.properties : null,
  props0 = _props0 && typeof _props0 === "object" ? _props0 : null;
  /** @type { RegExp } */
  // @ts-ignore
  const propRe = props0 && props0.regex || /^_|_$/;
  const reservedProps = new Set(props0 && props0.reserved || [ "__proto__", "$_", "_" ]);
  (await minify(text, { ...options,
    mangle: null, nameCache: null, format: { ast: true, code: false }
  })).ast.walk(new TreeWalker((node) => {
    switch (node.TYPE) {
    case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
      /** @type { AST_Lambda } */
      // @ts-ignore
      const closure = node;
      /** @type { VariableMap } */
      // @ts-ignore
      const variables = closure.variables;
      if (variables.size < MIN_COMPLEX_CLOSURE && !(closure.name && closure.name.name === "VC")) { break; }
      const names = [];
      for (const [key, node] of closure.variables) {
        const ref_count = node.references.length;
        if (ref_count === 0) { continue; }
        const id = ":" + key + ":" + namesToMangle.length;
        names.push(id);
        map.set(id, (map.get(id) || 0) + ref_count);
      }
      if (names.length > 0) {
        namesToMangle.push(names)
      }
      break;
    case "Object":
      /** @type { import("../typings/base/terser").AST_Object } */
      // @ts-ignore
      const obj = node;
      if (obj.properties.length < MIN_COMPLEX_OBJECT) { break; }
      const list = obj.properties.map(i => {
        const prop = i.key;
        return typeof prop === "string" ? prop : "";
      }).filter(i => !!i);
      if (list.length === 0) { break; }
      let subCounter = 0;
      list.forEach(prop => {
        if (propRe.test(prop) && !reservedProps.has(prop)) {
          subCounter++;
          map.set(prop, (map.get(prop) || 0) + 1);
        }
      });
      if (subCounter > 0) {
        namesToMangle.push(list);
      }
      break;
    case "Dot":
      /** @type { import("../typings/base/terser").AST_Dot } */
      // @ts-ignore
      const dot = node;
      /** @type { string } */
      // @ts-ignore
      const prop = dot.property;
      if (propRe.test(prop) && !reservedProps.has(prop)) {
        map.set(prop, (map.get(prop) || 0) + 1);
      }
      break;
    // no default
    }
    return false;
  }));
  namesToMangle.forEach(arr => arr.sort((i, j) => {
    return (map.get(j) || 0) - (map.get(i) || 0) || (i < j ? -1 : 1);
  }));
  let ids = namesToMangle.map(i => i.join());
  for (let i = ids.length; 1 <= --i; ) {
    let j = ids.indexOf(ids[i]);
    if (j < i) {
      namesToMangle.splice(i, 1);
    }
  }
  return {namesToMangle, namesCount: map}
}

/**
 * @param { string | import("../typings/base/terser").AST_Node } text
 * @returns { Promise<{
  *   stringsTooLong: string[]
  *   stringGains: Map<string, {count: number; gain: number}>
  * }> }
  */
async function collectString(text) {
  /** @type { string[] } */
  const stringsTooLong = []
  /** @type { Map<string, number> } */
  const stringsOccurance = new Map();
  const AST_Binary = (await import("terser/lib/ast")).AST_Binary;
  const AST_Case = (await import("terser/lib/ast")).AST_Case;
  (typeof text === "string" ? parse(text) : text).walk(new TreeWalker(function (node) {
    switch (node.TYPE) {
    case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
      // @ts-ignore
      if (node.name && node.name.name === "VC") { return true }
      break
    case "String":
    case "RegExp":
      /** @type { string } */
      // @ts-ignore
      const str = node.value && node.value.source || node.value
      if (str.length >= MIN_LONG_STRING) { stringsTooLong.push(str) }
      if (str.length >= MIN_STRING_LENGTH_TO_COMPUTE_GAIN) {
        /** @type { import("terser/lib/ast").TreeWalker } */
        const walker = this
        const parentNode = walker.parent(0)
        if (parentNode instanceof AST_Case
           || parentNode instanceof AST_Binary && parentNode.operator === "in") {
          break
        }
        stringsOccurance.set(str, (stringsOccurance.get(str) || 0) + 1)
      }
      break
    // no default
    }
    return false
  }))
  /** @type { Map<string, {count: number; gain: number}> } */
  const stringGains = new Map()
  for (let [str, count] of stringsOccurance) {
    if (count <= 1) { continue }
    const selfSize = str.length + (str.includes('"') && str.includes("'") ? 3 : 2)
    const gain = selfSize * count - (selfSize + /* def */ 4 + /* occ */ 2 * count)
    gain >= MIN_EXPECTED_STRING_GAIN && stringGains.set(str, { count, gain })
  }
  return {stringsTooLong, stringGains}
}
 
/**
 * @param { readonly string[][] } names
 * @param { ReadonlyMap<string, number> } countsMap
 * @return { string[] }
 */
function findDuplicated(names, countsMap) {
  /** @type { Map<string, number> } */
  const dedup = new Map();
  for (const arr of names) {
    for (let name of arr) {
      name = name[0] === ":" ? name.split(":")[1] : name;
      if (!countsMap.has(name)) { continue; }
      dedup.set(name, (dedup.get(name) || 0) + 1);
    }
  }
  const duplicated = [...dedup.entries()].filter(item => item[1] > 1).map(item => item[0]);
  return duplicated;
}

/**
 * @param { readonly string[][] } names
 * @param { number } minAllowedLength
 * @return { string[] }
 */
function findTooShort(names, minAllowedLength) {
  /** @type { Set<string> } */
  const short = new Set();
  for (const arr of names) {
    for (const name of arr) {
      if ((name[0] === ":" ? name.split(":")[1].length : name.length) < minAllowedLength) {
        short.add(name);
      }
    }
  }
  return [...short];
}

/**
 * @argument { string | string[] | { [file: string]: string } } files
 * @argument { MinifyOptions | null | undefined } options
 * @returns { Promise<MinifyOutput> }
 */
async function myMinify(files, options) {
  await P
  const sources = typeof files === "object" ? files instanceof Array ? files : Object.values(files) : [files];
  let ast = sources.length === 1 ? parse(sources[0], options && options.parse) : sources.join("\n")
  /** @type { (() => void) | null | undefined } */
  let disposeNameMangler;
  const isES6 = options && options.ecma && options.ecma >= 6;
  if (isES6) {
    ast = typeof ast !== "string" ? ast : parse(ast, options && options.parse)
    replaceLets(ast)
  }
  if (options && options.mangle) {
    const { namesToMangle: names, namesCount: countsMap} = await collectWords(ast, options);
    if (names.length > 0) {
      const duplicated = findDuplicated(names, countsMap);
      if (duplicated.length > 0) {
        throw Error("Find duplicated keys: " + JSON.stringify(duplicated, null, 2));
      }
      const tooShort = findTooShort(names, MIN_ALLOWED_NAME_LENGTH);
      if (tooShort.length > 0) {
        throw Error("Some keys are too short: " + JSON.stringify(tooShort, null, 2));
      }
      const variables = names.filter(arr => arr[0][0] === ":");
      if (variables.length > 2) {
        throw Error("Too many big closures to mangle: "
            + JSON.stringify(variables.map(list => list.slice(0, 16).map(i => i.split(":")[1]).concat(["..."]))));
      }
      if (variables.length < 1) {
        throw Error("No big closure found");
      }
      const properties = names.filter(arr => arr[0][0] !== ":");
      const normalProperties = properties.map(i => i.filter(j => j !== "label_" && j !== "sent_")).filter(i => i.length)
      if (normalProperties.length > MAX_ALLOWED_PROPERTY_GROUPS) {
        throw Error("Too many property groups to mangle: " + JSON.stringify(normalProperties));
      }
      if (properties.length < 5 && properties.length > 0) {
        console.log("Find some property groups to mangle:", properties);
      }
      /** @type { NameCache } */
      // @ts-ignore
      const nameCache = options.nameCache || { vars: { props: {} }, props: { props: {} } };
      if (!nameCache.props) { nameCache.props = { props: {} }; }
      const props = nameCache.props.props || (nameCache.props.props = {});
      // @ts-ignore
      if (options.format && options.format.code) {
        disposeNameMangler = await hookMangleNamesOnce(variables[0]
            , variables.length > 1 ? variables[1] : null, countsMap)
      }
      for (const arr of properties) {
        const next = createMangler(arr);
        for (const name of arr) {
          if (countsMap.has(name)) {
            props["$" + name] = next(name)
          }
        }
      }
    }
  }
  const CHECK_WORDS = +(process.env.CHECK_WORDS || 0) > 0
  const minified = await minify(ast, { ...options,
    // @ts-ignore
    format: {...options.format, ast: CHECK_WORDS || options.format.ast }
  })
  disposeNameMangler && (disposeNameMangler(), disposeNameMangler = null)
  if (CHECK_WORDS) {
    const {stringsTooLong, stringGains} = await collectString(minified.ast)
    if (stringsTooLong.length > 0) {
      console.log("Some strings are too long:")
      stringsTooLong.sort((i, j) => j.length - i.length)
      for (const str of stringsTooLong) {
        console.log("  (%s) %s", ("" + str.length).padStart(3, " "), str.length > 64 ? str.slice(0, 61) + "..." : str)
      }
    }
    if (CHECK_WORDS && stringGains.size > 0) {
      const gains = [...stringGains.entries()].sort((i, j) => j[1].gain - i[1].gain)
          .map(([i, {count, gain}]) => `${JSON.stringify(i)} (${count} times => ${gain})`)
          .join("\n  ")
      console.log("Some strings can be shared:\n  %s", gains)
    }
  }
  return minified
}

/**
 * @param { AST_Toplevel } ast
 */
function replaceLets(ast) {
  ast.walk(new TreeWalker(node => {
    switch (node.TYPE) {
    case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
      /** @type { AST_Function | AST_Lambda } */
      // @ts-ignore
      const func = node
      const nodes = func.body.filter(i => i.TYPE === "Let" || i.TYPE === "Const")
      /** @type { Array<import("../typings/base/terser").AST_Let> } */
      // @ts-ignore
      const es6Vars = nodes
      for (const var1 of es6Vars) {
        for (const { name } of var1.definitions) {
          if (name.TYPE === "SymbolConst" || name.TYPE === "SymbolLet") {
            Object.setPrototypeOf(name, AST_SymbolVar.prototype)
          }
        }
        if (!var1.definitions.some(def => def.name.TYPE === "Destructuring")) {
          Object.setPrototypeOf(var1, AST_Var.prototype)
        }
      }
    }
    return false
  }))
}

/**
 * @param { readonly string[] } mainVariableNames
 * @param { readonly string[] | null } extendClickValiables
 * @param { ReadonlyMap<string, number> } countsMap
 * @returns { Promise<() => void> } dispose
 */
async function hookMangleNamesOnce(mainVariableNames, extendClickValiables, countsMap) {
  /** @type { { prototype: AST_Toplevel } } */
  const AST_Toplevel = (await import("terser/lib/ast")).AST_Toplevel;
  // @ts-ignore
  const oldMangle = AST_Toplevel.prototype.mangle_names;
  const varCountMap = new Map([...countsMap].filter(i => i[0][0] === ":").map(([k, v]) => [k.split(":")[1], v]));
  const kNo$ = {}
  /** @type { (this: AST_Lambda, options: import("terser").MangleOptions, no$?: object) => any } */
  const myMangle = function (options, argNo$) {
    const mainClosure = this.body ? this.body.filter(i => i.TYPE.includes("Statement"))[0] : null;
    /** @type { VariableMap } */
    // @ts-ignore
    const body = mainClosure && mainClosure.body, expression = body && body.expression,
    isVC = this.name && this.name.name === "VC"
    /** @type {Map<string, any>} */
    const astVariables = isVC ? this.variables : expression && expression.variables;
    if (!astVariables || !isVC && astVariables.size < MIN_COMPLEX_CLOSURE) { return; }
    const vars = isVC ? extendClickValiables : mainVariableNames
    const next = createMangler(["do", "for", "if", "in", "new", "try", "var", "let",
        ...vars, ...(options.reserved || [])]);
    for (const id of vars) {
      const name = id.split(":")[1]
      if (varCountMap.has(name)) {
        const varDef = astVariables.get(name);
        if (varDef) {
          let newName = ""
          do {
            newName = next(name)
          } while (argNo$ === kNo$ && newName.includes("$"))
          varDef.mangled_name = newName
        }
      }
    }
    const astVariableNameList = [...astVariables.keys()]
    const unknownVars = astVariableNameList.filter(k => !varCountMap.has(k) && k !== "arguments" && k !== "VC")
    if (unknownVars.length > 0) {
      console.log("Warning: some unknown variables in a closure:", unknownVars)
    }
    // const rareVars = astVariableNameList.filter(k => varCountMap.get(k) && varCountMap.get(k) <= 1)
    if (isVC) { return; }
    succeed = true;
    this.walk(new TreeWalker(function (node) {
      switch (node.TYPE) {
      case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
        // @ts-ignore
        if (node.name && node.name.name === "VC") {
          myMangle.call(node, options, kNo$)
          return true
        }
      }
      return false
    }))
    dispose()
    // @ts-ignore
    return this.mangle_names(options)
  };
  // @ts-ignore
  AST_Toplevel.prototype.mangle_names = myMangle;
  let succeed = false;
  const dispose = () => {
    // @ts-ignore
    AST_Toplevel.prototype.mangle_names = oldMangle;
    if (!succeed) {
      throw TypeError('Can not hook the "mangle_names" member function of terser')
    }
  }
  return dispose
}

/** @type { (reserved?: Set<string> | Array<string>) => (originalName: string) => string } */
const createMangler = (function (doesTest) {
  /** @type { string[] } */
  const mangledNamesList = [];
  const _chars1 = "abcdefghijklmnopqrstuvwxyz", _chars2 = "0123456789",
  _chars3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", _chars4 = "_$",
  firstChars = doesTest ? _chars2 : _chars1 + _chars3 + _chars4,
  suffixChars = doesTest ? _chars2 + _chars4 : _chars1 + _chars2 + _chars3 + _chars4,
  n1 = firstChars.length, n2 = suffixChars.length;

  mangledNamesList.push(...firstChars)
  const fillNext = () => {
    const size = mangledNamesList.length
    let suffixWidth = 0
    for (let subSize = n1; subSize < size; ) {
      subSize += n1 * Math.pow(n2, ++suffixWidth)
      if (subSize > size) { throw Error("`mangledNamesList` is being updated from a wrong state") }
    }
    const curWidth = suffixWidth + 1
    const lastStart = size - n1 * Math.pow(n2, curWidth - 1)
    for (let i = lastStart; i < size; i++) {
      for (let oldName = mangledNamesList[i], j = 0; j < n2; j++) {
        mangledNamesList.push(oldName + suffixChars[j])
      }
    }
  }

  const firstCharInWordRe = /(\b|[$_])[a-zA-Z]|[^A-Z][A-Z]/g;
  /** @type { (reserved?: Set<string> | Array<string>) => (originalName: string) => string } */
  const getIterator = (reserved) => {
    const usedMaps = new Set(reserved)
    let width = 1;
    /**
     * @argument {string} name
     * @returns { boolean } whether add it successfully or not
     */
    const tryAddUnique = (name) => usedMaps.has(name) ? false : (usedMaps.add(name), true)
    return function nextName(originalName) {
      let shorter = originalName.match(firstCharInWordRe).map(i => i.slice(-1)).join("")
      shorter = shorter.length >= width ? shorter : originalName.slice(0, width)
      while (shorter.length < width) { shorter += suffixChars[0] }
      const lower = shorter.toLowerCase(), upper = lower.toUpperCase()
      /** @type { number[] } */
      const candidateIndexes = []
      for (let part = 0; part <= width; part++) {
        for (let partEnd = lower.length; 0 <= partEnd - part; partEnd--) {
          const lowUp = lower.slice(0, partEnd - part) + upper.slice(partEnd - part, partEnd) + lower.slice(partEnd)
          for (let i = 0; i + width <= lowUp.length; i++) {
            const newName = lowUp.slice(i, i + width)
            if (tryAddUnique(newName)) { return newName }
            candidateIndexes.push(mangledNamesList.indexOf(newName))
          }
        }
      }
      for (let i = 1; i < 4; i++) {
        for (let ind of candidateIndexes) {
          const j = ind + i < mangledNamesList.length ? mangledNamesList[ind + i] : ""
          if (j && j.slice(0, -1) === mangledNamesList[ind].slice(0, -1) && tryAddUnique(j)) {
            return j
          }
        }
      }
      const lookupSize = n1 * Math.pow(n2, width - 1), lookupStart = mangledNamesList.length - lookupSize
      const lookupOffset = lookupStart + (hashCode(lower) % lookupSize)
      for (let i = lookupOffset; i < mangledNamesList.length; i++) {
        if (tryAddUnique(mangledNamesList[i])) { return mangledNamesList[i] }
      }
      for (let i = lookupStart; i < lookupOffset; i++) {
        if (tryAddUnique(mangledNamesList[i])) { return mangledNamesList[i] }
      }
      fillNext(); width++
      return nextName(originalName)
    }
  };
  return getIterator
})(TEST);

/** @type { (str: string) => number } */
const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

if (typeof module !== "undefined") {
  module.exports = { minify: myMinify };
}

if (TEST) {
  const next = createMangler(), arr = {};
  for (let i = 0; i < 300; i++) {
    arr[i] = next("a");
  }
  console.log(arr);
}
