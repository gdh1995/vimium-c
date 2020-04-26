#!/usr/bin/env node
// @ts-check
"use strict";

const MAX_ALLOWED_PROPERTY_GROUPS = 0;
const MIN_COMPLEX_CLOSURE = 300;
const MIN_COMPLEX_OBJECT = 1;
const MIN_ALLOWED_NAME_LENGTH = 3;

// @ts-ignore
const TEST = typeof require === "function" && require.main === module;

const terser = require("terser");
/**
 * @typedef { import("terser").MinifyOptions } MinifyOptions
 * @typedef { import("terser").MinifyOutput } MinifyOutput
 * @typedef { import("terser").AST_Scope } AST_Scope
 * @typedef { Map<string, { references: object[]; mangled_name: string | null }> } VariableMap
 * @typedef { {
 *   vars?: { props?: { [oldName: string]: string } };
 *   props?: { props?: { [oldName: string]: string } };
 * } } NameCache
 */

/**
 * @param { string | import("terser").AST_Node } text
 * @param { MinifyOptions } options
 * @returns { [string[][], ReadonlyMap<string, number>] }
 */
function collectWords(text, options) {
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
  terser.minify(text, { ...options,
    sourceMap: false, mangle: null, nameCache: null,
    // @ts-ignore
    output: { ast: true, code: false  }
  }).ast.walk(new terser.TreeWalker((node) => {
    switch (node.TYPE) {
    case "Function": case "Lambda":
      /** @type { AST_Scope } */
      // @ts-ignore
      const closure = node;
      /** @type { VariableMap } */
      // @ts-ignore
      const variables = closure.variables;
      if (variables.size < MIN_COMPLEX_CLOSURE) { break; }
      const names = [];
      for (const [key, node] of closure.variables) {
        const ref_count = node.references.length;
        if (ref_count === 0) { continue; }
        const id = ":" + key;
        names.push(id);
        map.set(id, (map.get(id) || 0) + ref_count);
      }
      if (names.length > 0) {
        namesToMangle.push(names)
      }
      break;
    case "Object":
      /** @type { import("terser").AST_Object } */
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
      /** @type { import("terser").AST_Dot } */
      // @ts-ignore
      const dot = node;
      /** @type { string } */
      // @ts-ignore
      const prop = dot.property;
      if (propRe.test(prop) && !reservedProps.has(prop)) {
        map.set(prop, (map.get(prop) || 0) + 1);
      }
      break;
    default:
      break;
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
  return [namesToMangle, map];
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
      name = name[0] === ":" ? name.slice(1) : name;
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
      if ((name[0] === ":" ? name.length - 1 : name.length) < minAllowedLength) {
        short.add(name);
      }
    }
  }
  return [...short];
}

/**
 * @argument { string | string[] | { [file: string]: string } } files
 * @argument { MinifyOptions | null | undefined } options
 * @returns { MinifyOutput }
 */
function minify(files, options) {
  const sources = typeof files === "object" ? files instanceof Array ? files : Object.values(files) : [files];
  const ast = sources.length === 1 ? terser.parse(sources[0], options && options.parse) : sources.join("\n");
  if (options && options.mangle) {
    const [names, countsMap] = collectWords(ast, options);
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
      if (variables.length > 1) {
        throw Error("Too many big closures to mangle: " + JSON.stringify(variables.slice(0, 16).concat(["..."])));
      }
      if (variables.length < 1) {
        throw Error("No big closure found");
      }
      const properties = names.filter(arr => arr[0][0] !== ":");
      if (properties.length > MAX_ALLOWED_PROPERTY_GROUPS) {
        throw Error("Too many property groups to mangle: " + JSON.stringify(properties));
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
      if (options.output && options.output.code) {
        hookMangleNamesOnce(variables[0], countsMap);
      }
      for (const arr of properties) {
        const next = createMangler();
        for (const name of arr) {
          if (countsMap.has(name)) {
            let newName = next();
            for (; arr.includes(newName); newName = next()) { /* empty */ }
            props["$" + name] = newName;
          }
        }
      }
    }
  }
  return terser.minify(ast, options);
}

/**
 * @param { readonly string[] } variableNames
 * @param { ReadonlyMap<string, number> } countsMap
 * @returns { void }
 */
function hookMangleNamesOnce(variableNames, countsMap) {
  const AST_Toplevel = require("terser").AST_Toplevel;
  // @ts-ignore
  const oldMangle = AST_Toplevel.prototype.mangle_names;
  /** @type { (this: AST_Scope, options: import("terser").MangleOptions) => any } */
  const myMangle = function (options) {
    const mainClosure = this.body ? this.body.filter(i => i.TYPE.includes("Statement"))[0] : null;
    /** @type { VariableMap } */
    // @ts-ignore
    const body = mainClosure && mainClosure.body, expression = body && body.expression,
    astVariables = expression && expression.variables;
    if (!astVariables || astVariables.size < MIN_COMPLEX_CLOSURE) { return; }
    const next = createMangler();
    /** @type {string[]} */
    const missing = [];
    const reserved = new Set([...(options.reserved || [])].concat([
      "do", "for", "if", "in", "new", "try", "var", "let"
    ]));
    for (const name of variableNames) {
      if (countsMap.has(name)) {
        let newName = next();
        for (; variableNames.includes(newName) || reserved.has(newName); newName = next()) { /* empty */ }
        const varDef = astVariables.get(name.slice(1));
        if (varDef) {
          varDef.mangled_name = newName;
        } else {
          missing.push(name.slice(1));
        }
      }
    }
  // @ts-ignore
    AST_Toplevel.prototype.mangle_names = oldMangle;
    // @ts-ignore
    return this.mangle_names(options);
  };
  // @ts-ignore
  AST_Toplevel.prototype.mangle_names = myMangle;
}

/** @type { () => () => string } */
const createMangler = (function (doesTest) {
  /** @type { string[] } */
  const mangledNamesList = [];
  const _chars1 = "abcdefghijklmnopqrstuvwxyz", _chars2 = "0123456789",
  _chars3 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", _chars4 = "_$",
  firstChars = doesTest ? _chars2 : _chars1 + _chars3 + _chars4,
  suffixChars = doesTest ? _chars2 + _chars4 : _chars1 + _chars2 + _chars3 + _chars4,
  n1 = firstChars.length, n2 = suffixChars.length;
  return () => {
    let counter = -1;
    return function nextName() {
      counter++;
      if (counter < mangledNamesList.length) {
        return mangledNamesList[counter];
      }
      let name = firstChars[counter % n1];
      for (let idx = (counter / n1) | 0; idx > 0; idx = (idx / n2) | 0) {
        idx--;
        name += suffixChars[idx % n2];
      }
      mangledNamesList.push(name);
      return name;
    }
  };
})(TEST);

if (typeof module !== "undefined") {
  module.exports = { minify };
}

if (TEST) {
  const next = createMangler(), arr = {};
  for (let i = 0; i < 300; i++) {
    arr[i] = next();
  }
  console.log(arr);
}
