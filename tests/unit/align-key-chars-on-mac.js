// @ts-check
/// <reference path="../../typings/base/base.d.ts" />
/// <reference path="../../typings/vimium_c.d.ts" />
/// <reference path="../../lib/base.d.ts" />
// Usage: void await import("./align-key-chars-on-mac.js?clear&ok=ignore" + Date.now())
"use strict";
/** @typedef { readonly [alt: 0|1, ctrl: 0|1, meta: 0|1, shift: 0|1] } Modifiers */

const importParams = (import.meta.url.split("?")[1] || "")
/** @type { Record<string, kKeyCode> } */
const kKeyCodes = {
  m: 77, k: 75, "[": 219, ",": 188, "9": 57
}
/** @type { { [key in string]?: kChar } } */
const kAltKeys = Object.fromEntries(`
  miu µ
  Upper-M M
  ^A Â
  degree ˚
  Upper-K K
  APPLE 
  leftdq “
  RIGHTDQ ”
  [-??? [
  comma ,
  <= ≤
  CEIL-LINE ¯
  CEIL ¯
  upper-a ª
  BIG-DOT ·
`.trim().split("\n").map(i => i.trim().split(" ")))
/** @type { { [lower in kChar]?: kChar } } */
const kUppers = Object.fromEntries(`
  miu ^A
  degree APPLE
  leftdq RIGHTDQ
  <= CEIL-LINE
  upper-a BIG-DOT
  [ {
  , <
  9 (
`.trim().split("\n").map(i => { const [k, v] = i.trim().split(" "); return [kAltKeys[k] || k, kAltKeys[v] || v] }))
/** @type { { [upper in kChar]?: kChar } } */ // @ts-ignore
const kLowers = Object.fromEntries(Object.entries(kUppers).map(([l, u]) => [u, l]))
/** @type { readonly Modifiers[] } */
const kModifiers = Object.freeze([
  [0, 0, 0, 0], // <>
  [1, 0, 0, 0], // alt
  [0, 1, 0, 0], // ctrl
  [0, 0, 1, 0], // meta
  [0, 0, 0, 1], // shift
  [1, 0, 0, 1], // a-s-
  [0, 1, 0, 1], // c-s-
  [0, 0, 1, 1], // m-s-
  [0, 1, 1, 0], // c-m-
  [1, 1, 0, 0], // a-c-
  [1, 0, 1, 0], // a-m-
  [1, 1, 1, 0], // a-c-m-
  [1, 1, 0, 1], // a-c-s-
  [1, 0, 1, 1], // a-m-s-
  [0, 1, 1, 1], // c-m-s-
  [1, 1, 1, 1], // a-c-m-s-
])
// @ts-ignore
/** @type { kModeId.NO_MAP_KEY } */
const NO_MAP_KEY = 11
// @ts-ignore
/** @type { kKeyLayout.inPrivResist_ff } */
const IN_PRIV_RESIST = 32

/** @type { VApiTy } */ // @ts-ignore
const vApi = VApi
/** @type { SettingsNS.FrontendSettingCache } */ // @ts-ignore
const fgCache = vApi.z
const browserType_ = fgCache.b ?? // @ts-ignore
    (fgCache.b =
        ((globalThis.browser || chrome).runtime.getURL("/").startsWith("moz-")) ? 2 : 1)
let os_ = fgCache.o ?? // @ts-ignore
    (fgCache.o =
        (navigator.userAgentData ?? navigator).platform.toLowerCase().includes("mac") ? 0
        : (navigator.userAgentData ?? navigator).platform.toLowerCase().includes("win") ? 2 : 1)
const priv_resist_ff_ = {
  get value() {
    return !!(fgCache.l & IN_PRIV_RESIST)
  },
  _old_l: fgCache.l,
  _old_iac: false,
  push (newValue) {
    this._old_l = fgCache.l
    newValue ? fgCache.l |= IN_PRIV_RESIST : fgCache.l &= ~IN_PRIV_RESIST
    // @ts-ignore
    define && (this._old_iac = define.utils.isAsContent, define.utils.isAsContent = true)
  },
  pop () {
    fgCache.l = this._old_l
    // @ts-ignore
    define && (define.utils.isAsContent = this._old_iac)
  }
}
const vApiGetMappedKey = vApi.r[3]
/** @type { (raw: string, key: string, a: 0|1, c: 0|1, m: 0|1, s: 0|1, caps: 0|1) => [string, HandlerNS.Event] } */
const wrappedGetMappedKey = (raw, key, a, c, m, s, caps) => {
  const keyCode = kKeyCodes[raw]
  /** @type { Partial<KeyboardEvent> } */
  const rawEv = {
    keyCode, key, code: "",
    altKey: !!a, ctrlKey: !!c, metaKey: !!m, shiftKey: !!s,
    getModifierState (name) {
      if (name == "CapsLock") return !!caps
      throw new ReferenceError("no state for " + name)
    }
  }
  /** @type { kChar.INVALID } */ // @ts-ignore
  const INVALID_CHAR = " "
  Object.freeze(rawEv)
  /** @type { HandlerNS.Event } */
  const ev = {
    i: keyCode,
    c: INVALID_CHAR,
    e: new Proxy(rawEv, {
      get (target, key) {
        if (Object.getOwnPropertyDescriptor(target, key) || typeof key === "symbol") {
          return target[key]
        }
        throw new ReferenceError("avoid key = " + key)
      }
    }),
    v: ""
  }
  const mapped = vApiGetMappedKey(ev, NO_MAP_KEY)
  return [mapped, ev]
}
/** @type { (key: string, a: 0|1, c: 0|1, m: 0|1, s: 0|1, caps: 0|1, gt_modifiers?: Modifiers) => string } */
const buildGT = (key, a, c, m, s, caps, gt_modifiers) => {
  if (key.toLowerCase() !== key.toUpperCase()) {
    const any_acm = a || c || m || (!!gt_modifiers && gt_modifiers.slice(0, 3).some(i => !!i))
    key = s && any_acm ? "s-" + key.toLowerCase()
          : s !== caps && !any_acm ? key.toUpperCase() : key.toLowerCase()
  } else {
    key = (s ? kUppers[key] : kLowers[key]) || key
    if (!(key in (s ? kLowers : kUppers))) {
      return "aaa"
    }
  }
  return (a ? "a-" : "") + (c ? "c-" : "") + (m ? "m-" : "") + key
}

/** @type { (event: KeyboardEvent) => boolean } */
const hasShift_ff = (event) => {
  const key = event.key
  const lower = key ? key.toLowerCase() : ""
  if (lower && event.getModifierState("CapsLock") && key.toUpperCase() !== lower) {
    if (os_) {
      return key === lower
    }
    // ensure the affect of `priv_resist_ff_ is not enabled correctly` is smallest
    if (priv_resist_ff_.value && !event.altKey && !event.metaKey) {
      return false
    }
  }
  return event.shiftKey
}

/** @type { (js_modifiers: Modifiers, gt_modifiers?: Modifiers | null) => string[] } */
const ModifiersToStr = (js_modifiers, gt_modifiers) => {
  const [a, c, m, js_shift] = js_modifiers
  if (gt_modifiers) {
    const [a2, c2, m2, gt_shift] = gt_modifiers
    return [(a ? "a" : " ") + (a2 ? "/a" : "/ "), (c ? "c" : " ") + (c2 ? "/c" : "/ "),
            (m ? "m" : " ") + (m2 ? "/m" : "/ "), (js_shift ? "s" : " ") + (gt_shift ? "/s" : "/ ")]
  } else {
    return [a ? "a" : " ", c ? "c" : " ", m ? "m" : " ", js_shift ? "s" : " "]
  }
}

/**
 * @type { (raw: string, key: string, js_modifiers: Modifiers, caps: 0|1, expected?: string, gt_modifiers?: Modifiers
 *    ) => [0|1, string, ...any[]] }
 */
export const testKey = (raw, key0, js_modifiers, caps, expected, gt_modifiers) => {
  const key = kAltKeys[key0] || key0
  if (key.length > 1) {
    return [0, "%c%s: %o", "color: red", "invalid key", [raw, key0]]
  }
  const [a, c, m, js_shift] = js_modifiers
  let [mapped, js_event] = wrappedGetMappedKey(raw, key, a, c, m, js_shift, caps)
  const gt_shift = gt_modifiers ? gt_modifiers[3] : hasShift_ff(js_event.e) ? 1 : 0
  expected = expected || buildGT(key, a, c, m, gt_shift, caps, gt_modifiers)
  mapped.length > 1 && (mapped = `<${mapped}>`)
  expected.length > 1 && expected[0] !== "<" && (expected = `<${expected}>`)
  const info = [`raw=${raw}`, `key="${key}"` + " ".repeat(8 - key.length), ",",
                ...ModifiersToStr(js_modifiers, priv_resist_ff_.value ? gt_modifiers : null),
                caps ? "caps" : "    "].join(" ")
  if (expected === mapped) {
    return [1, `%s %c%s%s (OK)`, info, "color: green; font-weight: bold", expected,
        " ".repeat((key.charCodeAt(0) > 6e4 ? 11 : 12) - expected.length)]
  } else {
    return [0, `%s %c%s%c != %c%s %c(Fail)`, info, "color: red; font-weight: bold", mapped,
        "color: auto; font-weight: normal", "color: auto; font-weight: bold", expected,
        "color: red; font-weight: bold"]
  }
}

/**
 * @type { (raw: string, key: string, js_modifiers: Modifiers, gt_modifiers: Modifiers, caps: 0|1
 *    ) => [0|1, string, ...any[]] }
 */
export const testHasShift_ff = (raw, key0, js_modifiers, gt_modifiers, caps) => {
  const key = kAltKeys[key0] || key0
  if (key.length > 1) {
    return [0, "%c%s: %o", "color: red", "invalid key", [raw, key0]]
  }
  const [a, c, m, js_shift] = js_modifiers
  const [a2, c2, m2, gt_shift] = gt_modifiers
  const [_, { e: js_event }] = wrappedGetMappedKey(raw, key, a, c, m, js_shift, caps)
  const result = hasShift_ff(js_event)
  const info = [`raw=${raw}`, `key="${key}"` + " ".repeat(8 - key.length), ",",
                (a ? "a" : " ") + (a2 ? "/a" : "/ "), (c ? "c" : " ") + (c2 ? "/c" : "/ "),
                (m ? "m" : " ") + (m2 ? "/m" : "/ "), (js_shift ? "s" : " ") + (gt_shift ? "/s" : "/ "),
                caps ? "caps" : "    "].join(" ")
  if (!!gt_shift === !!result) {
    return [1, `%s %c%s%s (OK)`, info, "color: green; font-weight: bold", !!gt_shift,
        " ".repeat((key.charCodeAt(0) > 6e4 ? 11 : 12) - (!!gt_shift + "").length)]
  } else {
    return [0, `%s %c%s%c != %c%s %c(Fail)%c%s`, info, "color: red; font-weight: bold", result,
        "color: auto; font-weight: normal", "color: auto; font-weight: bold", !!gt_shift,
        "color: red; font-weight: bold"]
  }
}

; (function () {
  /** @type { (ref: Map<string, readonly string[]> | null, lines: string) => Map<string, readonly string[]> } */
  const parseCSV = (ref, lines) => {
    /** @type { [string, readonly string[]][] } */
    const entries = lines.replace(/\t/g, "\uffff").trim().split("\n").map(i => {
      const line = i.trimStart().replace(/\uffff/g, "\t").split(/\s/)
      const keys = Object.freeze(line.slice(1))
      if (keys.length !== kModifiers.length) {
        throw new RangeError("invalid: " + line);
      }
      return [line[0], keys]
    })
    const map = new Map(entries)
    for (const k of ref ? ref.keys() : []) {
      map.has(k) || map.set(k, ref?.get(k) || [])
    }
    return map
  }
  /** @type { (key: string, gt_modifiers: Modifiers) => [js_key: string, js_modifiers: Modifiers] } */
  const parseKey = (key, gt_modifiers) => {
    const js_key = priv_resist_ff_.value ? key.split("-").slice(-1)[0] : key
    /** @type { typeof gt_modifiers } */
    const js_modifiers = !priv_resist_ff_.value ? [...gt_modifiers]
        : [key.includes("a-") ? 1 : 0, key.includes("c-") ? 1 : 0,
            key.includes("m-") ? 1 : 0, key.includes("s-") ? 1 : 0]
    return [js_key, js_modifiers]    
  }
  /** @type { (map: Map<string, readonly string[]>, caps: 0|1, unicode?: 0|1, priv_resist_finger?: 0|1) => number } */
  const compareKeyDict = (map, caps, unicode, priv_resist_finger) => {
    let err = 0
    const results = []
    for (const [raw, lines] of map.entries()) {
      for (let i = 0; i < lines.length; i++) {
        const key = lines[i], gt_modifiers = kModifiers[i]
        if (key) {
          if (priv_resist_finger && lines.slice(0, i).includes(key)) { continue }
          priv_resist_ff_.push(!!priv_resist_finger)
          const [js_key, js_modifiers] = parseKey(key, gt_modifiers)
          const result = testKey(raw, js_key, js_modifiers, caps, '', gt_modifiers)
          priv_resist_ff_.pop()
          results.push(result)
        }
      }
    }
    const local_err = results.reduce((x, i) => x + (i[0] ? 0 : 1), 0)
    let head = [">>> compare %o with unicode=%o caps=%o", [...map.keys()].join("/"), unicode || 0, caps]
    if (priv_resist_finger) {
      head = [head[0] + " priv.resist_f=%o", ...head.slice(1), 1]
    }
    if (local_err > 0) {
      console.group(...head, "=> total errors =", local_err)
      err += local_err
    } else {
      head.push("=> no errors")
      if (kSkipOkByDefault) {
        console.log(...head)
        return err
      }
      console.groupCollapsed(...head)
    }
    for (const [ok, template, ...args] of results) {
      if (kSkipOkByDefault && ok) { continue }
      console.log(template, ...args)
    }
    console.groupEnd()
    return err
  }
  /** @type { (map: Map<string, readonly string[]>, map_u: typeof map, caps: 0|1, priv_resist: 0|1) => number } */
  const compareShifts_ff = (map, map_u, caps, priv_resist_finger) => {
    let err = 0, unicode = 0
    for (const imap of [map, map_u]) {
      const iresults = []
      for (const [raw, lines] of imap.entries()) {
        for (let i = 0; i < lines.length; i++) {
          const key = lines[i], gt_modifiers = kModifiers[i]
          if (priv_resist_finger && lines.slice(0, i).includes(key)) { continue }
          priv_resist_ff_.push(!!priv_resist_finger)
          const [js_key, js_modifiers] = parseKey(key, gt_modifiers)
          const result = testHasShift_ff(raw, js_key, js_modifiers, gt_modifiers, caps ? 1 : 0)
          priv_resist_ff_.pop()
          iresults.push(result)
        }
      }
      const local_err = iresults.reduce((x, i) => x + (i[0] ? 0 : 1), 0)
      const head = [">>> check shifts with unicode=%o caps=%o priv.resist_f=%o", unicode, caps, priv_resist_finger]
      if (local_err > 0) {
        console.group(...head, "=> total errors =", local_err)
        err += local_err
      } else {
        console.groupCollapsed(...head, "=> no errors")
      }
      for (const log of iresults) {
        console.log(...log.slice(1))
      }
      console.groupEnd()
      unicode++
    }
    return err
  }
  const kSkipOkByDefault = importParams.includes("ok=ignore")
  const cr_no_caps = parseCSV(null, `
    m	m	miu	m	m	Upper-M	^A	Upper-M	m	m	miu	miu	miu	^A	^A	Upper-M	^A
    k	k	degree	k	k	Upper-K	APPLE	Upper-K	k	k	degree	degree	degree	APPLE	APPLE	Upper-K	APPLE
    [	[	leftdq	[	[	{	RIGHTDQ	{	[-???	[	leftdq	leftdq	leftdq	RIGHTDQ	RIGHTDQ	{	RIGHTDQ
    ,	comma	<=	comma	comma	<	CEIL-LINE	comma	comma	comma	comma	<=	comma	comma	CEIL-LINE	comma	comma
    9	9	upper-a	9	9	(	BIG-DOT	9	9	9	9	upper-a	9	9	BIG-DOT	9	9
  `)
  const cr_caps = parseCSV(cr_no_caps, `
    m	Upper-M	^A	Upper-M	m	Upper-M	^A	Upper-M	m	Upper-M	^A	miu	^A	^A	^A	Upper-M	^A
    k	Upper-K	degree	Upper-K	k	Upper-K	APPLE	Upper-K	k	Upper-K	degree	degree	degree	APPLE	APPLE	Upper-K	APPLE
  `)
  const cr_no_caps_unicode = parseCSV(null, `
    m	m		m	m	Upper-M		Upper-M	m	m		m			m	Upper-M	
    [	[		[	[	{		{	[-???	[		[			[	{	
    ,	comma		comma	comma	<		comma	comma	comma	comma	comma	comma	comma	comma	comma	comma
    9	9		9	9	(		9	9	9						9	
  `)
  const cr_caps_unicode = parseCSV(cr_no_caps_unicode, `
    m	Upper-M		Upper-M	m	Upper-M		Upper-M	m	Upper-M		m			m	Upper-M	
  `)
  const ff_no_caps = parseCSV(null, `
    m	m	miu	m	m	Upper-M	^A	Upper-M	m	m	miu	miu	m	^A	^A	Upper-M	Upper-M
    k	k	degree	k	k	Upper-K	APPLE	Upper-K	k	k	degree	degree	k	APPLE	APPLE	Upper-K	Upper-K
    [	[	leftdq	[	[	{	RIGHTDQ	{	[	[	leftdq	leftdq	[	RIGHTDQ	RIGHTDQ	{	{
    ,	comma	<=	comma	comma	<	CEIL-LINE	<	comma	comma	<=	<=	comma	CEIL-LINE	CEIL-LINE	comma	comma
    9	9	upper-a	9	9	(	BIG-DOT	(	9	9	upper-a	upper-a	9	BIG-DOT	BIG-DOT	9	9
  `)
  const ff_caps = parseCSV(ff_no_caps, `
    m	Upper-M	^A	Upper-M	m	Upper-M	^A	Upper-M	m	m	^A	miu	m	^A	^A	Upper-M	Upper-M
    k	Upper-K	degree	Upper-K	k	Upper-K	APPLE	Upper-K	k	k	degree	degree	k	APPLE	APPLE	Upper-K	Upper-K
  `)
  const ff_no_caps_resist = parseCSV(null, `
    m	m	a-miu	c-m	m-m	s-M	a-s-^A	c-s-M	m-m	c-m-m	a-c-miu	a-m-miu	c-m-m	a-c-s-^A	a-m-s-^A	c-m-s-M	c-m-s-M
    ,	comma	a-<=	c-,	m-comma	s-<	a-s-CEIL	c-s-<	m-comma	c-m-,	a-c-<=	a-m-<=	c-m-,	a-c-s-CEIL	a-m-s-CEIL	c-m-,	c-m-,
  `)
  const ff_caps_resist = parseCSV(null, `
    m s-M	a-^A	c-s-M	m-m	s-M	a-s-^A	c-s-M	m-m	c-m-m	a-c-^A	a-m-miu	c-m-m	a-c-s-^A	a-m-s-^A	c-m-s-M	c-m-s-M
    , comma	a-<=	c-comma	m-comma	s-<	a-s-CEIL	c-s-<	m-comma	c-m-,	a-c-<=	a-m-<=	c-m-,	a-c-s-CEIL	a-m-s-CEIL	c-m-,	c-m-,
  `)
  const ff_no_caps_unicode = parseCSV(null, `
    m	m	m	m	m	Upper-M	Upper-M	Upper-M	m	m	m	m	m	Upper-M	m	Upper-M	Upper-M
    [	[	[	[	[	{	{	{	[	[	[	[	[	{	[	{	{
    ,	comma	comma	comma	comma	<	<	<	comma	comma	comma	comma	comma	<	comma	comma	comma
    9	9	9	9	9	(	(	(	9	9		9	9		9	9	9
  `)
  const ff_caps_unicode = parseCSV(ff_no_caps_unicode, `
    m	Upper-M	m	Upper-M	m	Upper-M	Upper-M	Upper-M	m	m	m	m	m	Upper-M	m	Upper-M	Upper-M
  `)
  const ff_no_caps_unicode_resist = parseCSV(null, `
    m	m	m	c-m	m-m	s-M	s-M	c-s-M	m-m	c-m-m	c-m	m-m	c-m-m	c-s-M	m-m	c-m-s-M	c-m-s-M
    ,	comma	comma	c-comma	m-comma	s-<	s-<	c-s-<	m-comma	c-m-,	c-comma	m-comma	c-m-,	c-s-<	m-comma	c-m-,	c-m-,
  `)
  const ff_caps_unicode_resist = parseCSV(null, `
    m	s-M	m	c-s-M	m-m	s-M	s-M	c-s-M	m-m	c-m-m	c-m	m-m	c-m-m	c-s-M	m-m	c-m-s-M	c-m-s-M
    ,	comma	comma	c-comma	m-comma	s-<	s-<	c-s-<	m-comma	c-m-,	c-comma	m-comma	c-m-,	c-s-<	m-comma	c-m-,	c-m-,
  `)
  let err = 0
  if (importParams.includes("clear")) {
    console.clear()
  }
  if (os_ !== 0) {
    // @ts-ignore
    define && (define.utils.os_ = fgCache.o = os_ = 0)
  }
  if (browserType_ == 1) {
    err += compareKeyDict(cr_no_caps, 0)
    err += compareKeyDict(cr_caps, 1)
    if (err === 0) {
      err += compareKeyDict(cr_no_caps_unicode, 0, 1)
      err += compareKeyDict(cr_caps_unicode, 1, 1)
    }
  } else if (browserType_ === 2) {
    err += compareShifts_ff(ff_no_caps, ff_no_caps_unicode, 0, 0)
    err += compareShifts_ff(ff_caps, ff_caps_unicode, 1, 0)
    err += compareShifts_ff(ff_no_caps_resist, ff_no_caps_unicode_resist, 0, 1)
    err += compareShifts_ff(ff_caps_resist, ff_caps_unicode_resist, 1, 1)
    if (err === 0) {
      err += compareKeyDict(ff_no_caps, 0)
      err += compareKeyDict(ff_no_caps_unicode, 0, 1)
      err += compareKeyDict(ff_caps, 1)
      err += compareKeyDict(ff_caps_unicode, 1, 1)
    }
    if (err === 0) {
      err += compareKeyDict(ff_no_caps_resist, 0, 0, 1)
      err += compareKeyDict(ff_no_caps_unicode_resist, 0, 1, 1)
      err += compareKeyDict(ff_caps_resist, 1, 0, 1)
      err += compareKeyDict(ff_caps_unicode_resist, 1, 1, 1)
    }
  } else {
    console.log(">>> No preset info")
    return
  }
  console.log("%c>>> All compared: %o error(s)", "font-weight: bold", err)
})();
