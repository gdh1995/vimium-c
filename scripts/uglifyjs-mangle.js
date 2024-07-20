#!/usr/bin/env node
// @ts-check
"use strict";

const MIN_COMPLEX_CLOSURE = 100;
const MIN_ALLOWED_NAME_LENGTH = 3
const MIN_LONG_STRING = 20;
const MIN_STRING_LENGTH_TO_COMPUTE_GAIN = 2;
const MIN_EXPECTED_STRING_GAIN = 11;
const ALLOWED_SHORT_NAMES = new Set([
  ":SP:0", ":BU:0", ":V:0", ":I:0", ":V:1", ":I:1", ":VC:0"
])

// @ts-ignore
const TEST = typeof require === "function" && require.main === module;
require("./dependencies").patchTerser();

/**
 * @typedef { import("terser").MinifyOptions } MinifyOptions
 * @typedef { import("terser").MinifyOutput } MinifyOutput
 * @typedef { import("../typings/base/terser").AST_Lambda } AST_LambdaClass
 * @typedef { import("../typings/base/terser").AST_Function } AST_Function
 * @typedef { import("../typings/base/terser").AST_Toplevel } AST_Toplevel
 * @typedef { import("../typings/base/terser").AST_Node } AST_Node
 * @typedef { import("../typings/base/terser").AST_Let } AST_Let
 * @typedef { import("../typings/base/terser").AST_Const } AST_Const
 * @typedef { import("../typings/base/terser").AST_SymbolConst } AST_SymbolConst
 * @typedef { import("../typings/base/terser").AST_SymbolLet } AST_SymbolLet
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
/** @type { typeof import("../typings/base/terser").AST_Lambda } */
let AST_Lambda
/** @type { typeof import("../typings/base/terser").AST_Block } */
let AST_Block
/** @type { typeof import("../typings/base/terser").AST_IterationStatement } */
let AST_IterationStatement
/** @type { typeof import("../typings/base/terser").AST_Block } */
let AST_TryBlock
const P = Promise.all([
  // @ts-ignore
  import("terser").then(i => minify = i.minify),
  import("terser/lib/parse").then(i => parse = i.parse),
  import("terser/lib/ast").then(i => {
    TreeWalker = i.TreeWalker; AST_Var = i.AST_Var; AST_SymbolVar = i.AST_SymbolVar; AST_Lambda = i.AST_Lambda
    AST_Block = i.AST_Block, AST_IterationStatement = i.AST_IterationStatement
    AST_TryBlock = i.AST_TryBlock
  }),
])

/**
 * @param { AST_Node } ast
 * @param { MinifyOptions } options
 * @returns { Promise<{
 *   namesToMangle: string[][]
 *   propsToMangle: Set<string>
 * }> }
 */
async function collectWords(ast, options) {
  /** @type { string[][] } */
  let namesToMangle = [];
  /** @type { Set<string> } */
  const propsToMangle = new Set();
  const _props0 = options.mangle && typeof options.mangle === "object" ? options.mangle.properties : null,
  props0 = _props0 && typeof _props0 === "object" ? _props0 : null;
  /** @type { RegExp } */
  // @ts-ignore
  const propRe = props0 && props0.regex || /^_|_$/;
  const reservedProps = new Set(props0 && props0.reserved || [ "__proto__", "$_" ]);
  ast.walk(new TreeWalker((node) => {
    switch (node.TYPE) {
    case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
      /** @type { AST_LambdaClass } */
      // @ts-ignore
      const closure = node;
      /** @type { VariableMap } */
      // @ts-ignore
      const variables = closure.variables;
      if (variables.size < MIN_COMPLEX_CLOSURE && !(closure.name && closure.name.name === "VC")) { break; }
      const names = [];
      for (const [key, node] of variables) {
        const ref_count = node.references.length;
        if (ref_count === 0) { continue; }
        names.push(key);
      }
      if (names.length > 0) {
        namesToMangle.push(names)
      }
      break;
    case "Object":
      /** @type { import("../typings/base/terser").AST_Object } */
      // @ts-ignore
      const obj = node;
      obj.properties.filter(i => {
        const prop = i.key;
        if (typeof prop === "string" && propRe.test(prop) && !reservedProps.has(prop)) {
          propsToMangle.add(prop)
        }
      })
      break;
    case "Dot":
      /** @type { import("../typings/base/terser").AST_Dot } */
      // @ts-ignore
      const dot = node;
      /** @type { string } */
      // @ts-ignore
      const prop = dot.property;
      if (propRe.test(prop) && !reservedProps.has(prop)) {
        propsToMangle.add(prop)
      }
      break;
    // no default
    }
    return false;
  }));
  return {namesToMangle, propsToMangle: propsToMangle}
}

/**
 * @param { string | AST_Node } text
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
  /** @type { typeof import("../typings/base/terser").AST_Binary } */
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
        const parentNode = this.parent(0)
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
 * @param { number } minAllowedLength
 * @return { Set<string> }
 */
function findTooShort(names, minAllowedLength) {
  /** @type { Set<string> } */
  const short = new Set();
  let ind = 0
  for (const arr of names) {
    for (const name of arr) {
      if (name.length < minAllowedLength) {
        short.add(`:${name}:${ind}`);
      }
    }
    ind++
  }
  return short
}

/**
 * @argument { string | string[] | { [file: string]: string } } files
 * @argument { MinifyOptions | null | undefined } options
 * @returns { Promise<MinifyOutput> }
 */
async function myMinify(files, options) {
  await P
  const sources = typeof files === "object" ? files instanceof Array ? files : Object.values(files) : [files];
  /** @type {MinifyOptions["compress"]} */
  const compress = { ...(options && typeof options.compress === "object" && options.compress || {}),
      sequences: false, passes: 1 }
  let ast = parse(sources.join("\n"), options && options.parse || undefined)
  /** @type { (() => void) | null | undefined } */
  let disposeNameMangler;
  const isES6 = options && options.ecma && options.ecma >= 6;
  // @ts-ignore
  ast = (await minify(ast, { compress, mangle: false,
    // @ts-ignore
    format: { ast: true, code: false, comments: true }
  })).ast
  if (isES6) {
    replaceLets(ast)
  }
  if (options && options.mangle) {
    const { namesToMangle: names, propsToMangle: props } = await collectWords(ast, options);
    if (names.length > 0) {
      const tooShort = findTooShort(names, MIN_ALLOWED_NAME_LENGTH);
      ALLOWED_SHORT_NAMES.forEach(i => tooShort.delete(i))
      if (tooShort.size > 0) {
        throw Error("Some keys are too short: " + JSON.stringify([...tooShort], null, 2))
      }
      const properties = [...props];
      const normalProperties = properties.filter(j => j !== "label_" && j !== "sent_").filter(i => i.length)
      if (normalProperties.length > 0) {
        throw Error("Too many property groups to mangle: " + JSON.stringify(normalProperties));
      }
      /** @type { NameCache } */
      // @ts-ignore
      const nameCache = options.nameCache || { vars: { props: {} }, props: { props: {} } };
      if (!nameCache.props) { nameCache.props = { props: {} }; }
      nameCache.props.props || (nameCache.props.props = {});
      // @ts-ignore
      if (options.format && options.format.code) {
        disposeNameMangler = await hookMangleNamesOnce()
      }
    }
  }
  const CHECK_WORDS = +(process.env.CHECK_WORDS || 0) > 0
  const minified = await minify(ast, { ...options, compress,
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
 * @param { AST_Node } ast
 */
function replaceLets(ast) {
  ast.walk(new TreeWalker(function (node) {
    switch (node.TYPE) {
    case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
      /** @type { AST_Function | AST_LambdaClass } */
      // @ts-ignore
      const func = node
      const nodes = func.body.filter(i => i.TYPE === "Let" || i.TYPE === "Const")
      const argNames = collectArgumentNames(func)
      /** @type { Array<AST_Let | AST_Const> } */
      // @ts-ignore
      const es6Vars = nodes
      for (const var1 of es6Vars) {
        const names = new Map(collectVariableAndValues(var1, this))
        for (const [name, _hasValue] of names) {
          if (argNames.has(name.name)) {
            throw new Error("conflicted argument name and variable name: " + name)
          }
        }
        for (const name of names.keys()) {
          if (name.TYPE === "SymbolConst" || name.TYPE === "SymbolLet") {
            Object.setPrototypeOf(name, AST_SymbolVar.prototype)
          }
        }
        Object.setPrototypeOf(var1, AST_Var.prototype)
      }
    }
    return false
  }))
  ast.walk(new TreeWalker(function (node) {
    if (node.TYPE === "Let" || node.TYPE === "Const") {
      /** @type { AST_Let | AST_Const } */
      // @ts-ignore
      const es6Var = node
      const names = new Map(collectVariableAndValues(es6Var, this))
      if ([...names.values()].includes(false)) {
          const func_context = this.find_parent(AST_Lambda)
          for (let i = 0, node2; node2 = this.parent(i), node2 && node2 !== func_context; i++) {
            if (node2 instanceof AST_IterationStatement) {
              return false
            }
          }
      }
      if (names.size > 0 && testScopedLets(es6Var, this, new Map([...names.entries()].map(([i, j]) => [i.name, j])))) {
        for (const name of names.keys()) {
          if (name.TYPE === "SymbolConst" || name.TYPE === "SymbolLet") {
            Object.setPrototypeOf(name, AST_SymbolVar.prototype)
          }
        }
        Object.setPrototypeOf(es6Var, AST_Var.prototype)
      }
    }
    return false
  }))
}

/**
 * @param { AST_Let | AST_Const } selfVar
 * @param { import("../typings/base/terser").TreeWalker } context
 * @param { Map<string, boolean> } varNames
 * @returns { boolean } whether it can be converted to a `var`
 */
function testScopedLets(selfVar, context, varNames) {
  const root = context.find_parent(AST_Lambda)
  if (!root) { return false }
  const argNames = collectArgumentNames(root)
  for (const name of argNames.keys()) {
    if (varNames.get(name) == false) { return false }
  }
  /** @type { (AST_Node | undefined)[] } */
  let curBlocks = []
  for (let i = 0, may_block; may_block = context.parent(i), may_block !== root; i++) {
    (may_block instanceof AST_Block || may_block instanceof AST_IterationStatement) && curBlocks.push(may_block)
  }
  if (!curBlocks[0] || context.parent(0) !== curBlocks[0]) {
    throw Error("unsupported AST: unknown type of blocks")
  }
  let sameNameFound = false
  /** @type { AST_Node } */ //@ts-expect-error
  let sameVar = null
  let sameNames = ""
  root.walk(new TreeWalker(function (node1) {
    if (!sameNameFound && (node1.TYPE === "Let" || node1.TYPE === "Const" || node1.TYPE === "Var")
        && node1 !== selfVar) {
      /** @type { import("../typings/base/terser").AST_Definitions } */
      // @ts-ignore
      let var1 = node1
      for (const [name, anotherHasValue] of collectVariableAndValues(var1, this)) {
        if (!varNames.has(name.name)) { continue }
        const curHasVal = varNames.get(name.name)
        const found = () => { sameNames = name.name + ", "; sameVar = var1; return sameNameFound = true }
        if (var1.TYPE === "Var" && (!curHasVal || !anotherHasValue)) { return found() }
        if (curBlocks.includes(this.parent(0))) { return found() }
        let inSubBlock = false
        for (let i = 0, node2; node2 = this.parent(i), node2 !== root && node2; i++) {
          inSubBlock = inSubBlock || node2 instanceof AST_Block || node2 instanceof AST_IterationStatement
          if (node2 === curBlocks[0]) { return found() }
        }
        if (!inSubBlock) { return found() }
      } // @ts-ignore
    } else if (!sameNameFound && node1.TYPE === "SymbolRef" && varNames.has(node1.name)) {
      /** @type { import("../typings/base/terser").AST_Scope | null } */ // @ts-ignore
      let def_scope = node1.thedef.scope
      for (; def_scope !== root && def_scope; def_scope = def_scope.parent_scope) {}
      if (!def_scope) { //@ts-ignore
        sameNames = node1.name + ", "; sameVar = node1.thedef
        return sameNameFound = true
      }
    }
    return sameNameFound
  }))
  if (sameNameFound) {
    if (sameVar) {
      console.log("Warning: Found conflicted declarations with a same name:", sameNames.slice(0, -2) + ";"
          , selfVar.print_to_string(), " ### ", sameVar.print_to_string())
      throw new Error("conflicted declarations!");
    }
    return false
  }
  const inIter = curBlocks.some(i => i instanceof AST_IterationStatement)
  let other_closures = false // @ts-ignore
  const cur_scope = inIter ? null : curBlocks[0].block_scope
  inIter || root.walk(new TreeWalker((node) => {
    if (other_closures) { return true }
    if (node !== root && node instanceof AST_Lambda) {
      let scope = node.parent_scope, variables = root.variables.size
      for (; scope !== root && scope !== cur_scope && scope; scope = scope.parent_scope) {
        variables += scope.variables.size
      }
      return scope === cur_scope && !!cur_scope || (other_closures = variables > 0)
    }
  }))
  if (inIter || other_closures) {
    let foundFuncInLoop = 0, foundNames = new Set()
    /** @type { (walk_root: AST_Node, node2: AST_Node) => boolean } */
    const walk = (walk_root, node2) => {
      if (node2 === walk_root) { /* empty */ } // @ts-ignore
      else if (node2.TYPE === "SymbolRef" && varNames.has(node2.name) && !/^kIs/.test(node2.name)) { // @ts-ignore
        foundFuncInLoop = 2; foundNames.add(node2.name)
      } else if (node2 instanceof AST_Lambda) {
        node2.walk(new TreeWalker(walk.bind(null, node2)))
      }
      return false
    }
    curBlocks[0].walk(new TreeWalker(function (node1) {
      if (node1 instanceof AST_Lambda) {
        foundFuncInLoop = foundFuncInLoop || 1
        node1.walk(new TreeWalker(walk.bind(null, node1)))
      }
      return false
    }))
    if (foundFuncInLoop === 1 && inIter) { // @ts-ignore
      const comments_after = curBlocks[0].start.comments_after 
      if (comments_after.length > 0 && (comments_after[0].value + "").includes("#__ENABLE_SCOPED__")) { return false }
      console.error("[Warning] Found a function in a scoped loop:", curBlocks[0].print_to_string())
      throw new Error("Please avoid scoped variable in a loop!")
    }
    if (foundFuncInLoop === 2) {
      if (!root.async) { // @ts-ignore
        const first_token = (curBlocks[0] instanceof AST_IterationStatement && curBlocks[0].body || curBlocks[0]).start
        const comments = first_token.comments_after?.length ? first_token.comments_after : first_token.comments_before
        if (comments.length > 0 && (comments[0].value + "").includes("#__ENABLE_SCOPED__")) { /* empty */ }
        else if (inIter) {
          console.log("[Error] ====== A function uses let/const variables of a loop's scoped closure !!! ======",
              curBlocks[0].print_to_string())
          throw new Error("scoped variable in a loop!"); // @ts-ignore
        } else {
          console.log("[Error] ====== A function uses let/const variables when other closures exist !!! ======",
              curBlocks[0].print_to_string(), " === for ", [...foundNames].join(", "))
          throw new Error("scoped variable in multi-closures!");
        }
      }
      return false
    }
  }
  return true
}

/**
 * @param {AST_LambdaClass | undefined} func
 * @returns {Set<string>}
 */
function collectArgumentNames(func) {
  /** @type { Set<string> } */
  const argNames = new Set()
  if (func && func.argnames.length) {
    /** string */
    for (const arg of func.argnames) {
      switch (arg.TYPE) {
        case "SymbolFunarg": argNames.add(arg.name); break
        case "Destructuring":
          arg.all_symbols().forEach(i => {
            if (i.TYPE !== "SymbolFunarg" || typeof i.name !== "string") {
              throw new Error("unsupported destructing in function arguments: " + arg.print_to_string())
            }
            argNames.add(i.name)
          })
          break
        case "Expansion": throw new Error("unsupported: expansion in function arguments: " + arg.print_to_string())
        case "DefaultAssign":
          if (!arg.left.name || typeof arg.left.name !== "string") {
            throw new Error("unsupported defaultAssigin in function arguments: " + arg.print_to_string())
          }
          argNames.add(arg.left.name)
          break
      }
    }
  }
  return argNames
}

/**
 * @param { import("../typings/base/terser").AST_Definitions } var1
 * @param { import("../typings/base/terser").TreeWalker } context
 * @returns { Generator<[import("../typings/base/terser").AST_Symbol, boolean]> }
 */
function* collectVariableAndValues(var1, context) {
  for (const def of var1.definitions) {
    if (def.name.TYPE === "Destructuring") {
      for (const name3 of def.name.all_symbols()) {
        yield [name3, true]
      }
      continue
    }
    let hasValue = !!def.value, parent = context.parent(0)
    if (!hasValue && parent) {
      const type = parent.TYPE
      if (type === "ForOf" || type === "ForIn") {
        // @ts-ignore
        hasValue = parent.init === var1
      // @ts-ignore
      } else if (type === "For" && parent.init === var1) {
        // @ts-ignore
        let cond = parent.condition
        while (cond.TYPE === "Binary" && (cond.operator === "&&" || cond.operator === "||")) { cond = cond.left }
        if (cond.TYPE === "Assign" && cond.operator === "="
            && cond.left.TYPE === "SymbolRef" && cond.left.name === def.name.name) {
          hasValue = true
        }
      }
    }
    yield [def.name, hasValue]
  }
}

/**
 * @returns { Promise<() => void> } dispose
 */
async function hookMangleNamesOnce() {
  /** @type { { prototype: AST_Toplevel } } */
  const AST_Toplevel = (await import("terser/lib/ast")).AST_Toplevel;
  // @ts-ignore
  const oldMangle = AST_Toplevel.prototype.mangle_names;
  const kNo$ = {}
  /** @type { (this: AST_LambdaClass, options: import("terser").MangleOptions, no$?: object) => any } */
  const myMangleNames = function (options, argNo$) {
    const mainClosure = this.body ? this.body.filter(i => i.TYPE.includes("Statement"))[0] : null;
    /** @type { VariableMap } */
    // @ts-ignore
    const body = mainClosure && mainClosure.body, expression = body && body.expression,
    isVC = this.name && this.name.name === "VC"
    const isVC2 = expression && expression.name && expression.name.name === "VC"
    /** @type {Map<string, any>} */
    const astVariables = isVC ? this.variables : expression && expression.variables;
    if (!astVariables || !(isVC || isVC2) && astVariables.size < MIN_COMPLEX_CLOSURE) { return; }
    /** @type {Map<string, number>} */
    const varCountMap = new Map([...astVariables].map(([name, { references: { length: count } }]) => [name, count]))
    const reversed = ["do", "for", "if", "in", "new", "try", "var", "let"
        // , ..."$".split("") // leave an element to make child functions smaller
        , ...[...varCountMap.keys()].filter(i => i.length <= 3), ...(options.reserved || [])]
    const next = createMangler(reversed)
    const vars = [...varCountMap].filter(i => i[1] > 0).sort((i, j) => (j[1] - i[1]) || (i < j ? -1 : 1))
    for (const [name, _count] of vars) {
        const varDef = astVariables.get(name);
        if (varDef) {
          if (name.length < MIN_ALLOWED_NAME_LENGTH) {
            varDef.mangled_name = name
            continue
          }
          let newName = ""
          do {
            newName = next(name)
          } while (argNo$ === kNo$ && newName.includes("$"))
          varDef.mangled_name = newName
        }
    }
    const astVariableNameList = [...astVariables.keys()].filter(i => !i.startsWith("scoped_"))
    const unknownVars = astVariableNameList.filter(k => !varCountMap.has(k) && k !== "arguments" && k !== "VC")
    if (unknownVars.length > 0) {
      console.log("Warning: some unknown variables in a closure:", unknownVars)
    }
    // const rareVars = astVariableNameList.filter(k => varCountMap.get(k) && varCountMap.get(k) <= 1)
    if (isVC) { return; }
    succeed = true;
    isVC2 || this.walk(new TreeWalker(function (node) {
      switch (node.TYPE) {
      case "Accessor": case "Function": case "Arrow": case "Defun": case "Lambda":
        // @ts-ignore
        if (node.name && node.name.name === "VC") {
          myMangleNames.call(node, options, kNo$)
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
  AST_Toplevel.prototype.mangle_names = myMangleNames;
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
      let shorter = (originalName.match(firstCharInWordRe) || []).map(i => i.slice(-1)).join("")
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
      const lookupSize = n1 * Math.pow(n2, width - 1)
      let lookupStart = 0;
      for (let i = 0; i < width - 1; i++) {
        lookupStart += n1 * Math.pow(n2, i)
      }
      const hash1 = hashCode(lower) % lookupSize
      const lookupOffset = lookupStart + (hash1 >= 0 ? hash1 : hash1 + lookupSize)
      for (let i = lookupOffset; i < lookupStart + lookupSize; i++) {
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
