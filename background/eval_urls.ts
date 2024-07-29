import {
  set_evalVimiumUrl_, copy_, evalVimiumUrl_, substitute_, paste_, cPort, curTabId_, framesForTab_, needIcon_, setIcon_,
  set_cPort, searchEngines_, OnEdge, OnChrome, CurCVer_, OnFirefox, CurFFVer_
} from "./store"
import { decodeEscapedURL_, spacesRe_, DecodeURLPart_ } from "./utils"
import { browser_, import2 } from "./browser"
import { convertToUrl_, lastUrlType_, createSearchUrl_, quotedStringRe_ } from "./normalize_urls"
import { parseSearchUrl_ } from "./parse_urls"
import { getPortUrl_, showHUD, showHUDEx } from "./ports"
import * as Exclusions from "./exclusions"
import { parseReuse } from "./open_urls"

set_evalVimiumUrl_(function (path: string, workType?: Urls.WorkType
    , onlyOnce?: boolean | null, _isNested?: number): Urls.Url | null {
  let ind: number, cmd: string, arr: string[], obj: { u: string } | null
    , res: Urls.Url | string[] | Promise<string | null> | null;
  workType = workType! | 0;
  if (path === "paste") {
    path += " .";
  } else if (path.includes("%20") && !path.includes(" ") && !path.startsWith("run")) {
    path = path.replace(<RegExpG> /%20/g, " ")
  }
  if (workType < Urls.WorkType.ValidNormal || !(path = path.trim()) || (ind = path.search(<RegExpOne> /[/ ]/)) <= 0
      || !(<RegExpI> /^[a-z][\da-z\-]*(?:\.[a-z][\da-z\-]*)*$/i).test(cmd = path.slice(0, ind).toLowerCase())
      || (<RegExpI> /\.(?:css|html?|js)$/i).test(cmd)) {
    return null;
  }
  path = path.slice(ind + 1).trim();
  if (!path) { return null; }
  const mathSepRe = <RegExpG> /[\s+,\uff0b\uff0c]+/g;
  if (workType === Urls.WorkType.ActIfNoSideEffects) { switch (cmd) {
  case "sum": case "mul":
    path = path.replace(mathSepRe, cmd === "sum" ? " + " : " * ");
    cmd = "e"; break;
  case "avg": case "average":
    arr = path.split(mathSepRe);
    path = "(" + arr.join(" + ") + ") / " + arr.length;
    cmd = "e"; break;
  } }
  if (workType === Urls.WorkType.ActIfNoSideEffects) { switch (cmd) {
  case "e": case "exec": case "eval": case "expr": case "calc": case "m": case "math":
    return (import2<typeof import("../lib/math_parser")>("/lib/math_parser.js")
        ).then(/*#__NOINLINE__*/ tryEvalMath_.bind(0, path))
  case "error":
    return [path, Urls.kEval.ERROR];
  } }
  else if (workType >= Urls.WorkType.ActAnyway) { switch (cmd) {
  case "run": case "run1": case "run-one": case "run-one-key":
    return [[cmd, path], Urls.kEval.run]
  case "status": case "state":
    if (workType >= Urls.WorkType.EvenAffectStatus) {
      /*#__NOINLINE__*/ forceStatus_(path as Frames.ForcedStatusText)
    }
    return [path, workType >= Urls.WorkType.EvenAffectStatus ? Urls.kEval.status : Urls.kEval.plainUrl]
  case "url-copy": case "search-copy": case "search.copy": case "copy-url":
    res = convertToUrl_(path, null, Urls.WorkType.ActIfNoSideEffects, _isNested)
    if (res instanceof Promise) {
      return res.then((arr1): Promise<Urls.CopyEvalResult> => {
        let path2 = arr1[0] || (arr1[2] || "");
        path2 = path2 instanceof Array ? path2.join(" ") : path2;
        return Promise.resolve(copy_(path2)).then(path22 => [path22, Urls.kEval.copy])
      });
    } else {
      res = lastUrlType_ === Urls.Type.Functional &&
        res instanceof Array ? (res as Urls.BaseEvalResult)[0] : res as string;
      path = res instanceof Array ? res.join(" ") : res;
    }
    // no break;
  case "cp": case "copy": case "clip": // here `typeof path` must be `string`
    const path3 = copy_(path);
    return typeof path3 === "string" ? [path, Urls.kEval.copy]
        : path3.then<Urls.CopyEvalResult>(path32 => [path32, Urls.kEval.copy])
  case "browser-search": case "browser-search2": case "browser-search.at": case "browser-search-at":
  case "bs": case "bs2": case "bs.at": case "bs-at": case "b-s": case "b-s2": case "b-s.at": case "b-s-at":
  case "b-search": case "b-search2": case "b-search.at": case "b-search-at":
    if (OnChrome ? Build.MinCVer >= BrowserVer.Min$search$$query || CurCVer_ > BrowserVer.Min$search$$query - 1
        : OnFirefox ? (Build.MinFFVer >= FirefoxBrowserVer.Min$search$$search
            || CurFFVer_ > FirefoxBrowserVer.Min$search$$search - 1)
        : !OnEdge && browser_.search) {
      let disposition: Parameters<typeof chrome.search.query>[0]["disposition"] = "NEW_TAB"
      if (cmd.endsWith("2") || cmd.endsWith("at")) {
        const prefixArr = (<RegExpOne> /^[-\w][^ /]*/).exec(path)
        if (prefixArr) {
          const reuse = parseReuse(prefixArr[0] as UserReuseType & string)
          disposition = reuse === ReuseType.newWnd ? "NEW_WINDOW"
              : reuse >= ReuseType.current || reuse === ReuseType.reuseInCurWnd ? "CURRENT_TAB" : disposition
          path = path.slice(prefixArr[0].length + 1)
        }
      }
      path = path.trim().replace(spacesRe_, " ")
      if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.Min$search$$query
          && CurFFVer_ < FirefoxBrowserVer.Min$search$$query) {
        browser_.search.search(disposition === "CURRENT_TAB" && curTabId_ >= 0 ? { tabId: curTabId_, query: path }
            : { query: path })
      } else {
        browser_.search.query({ disposition, text: path })
      }
      return [path, Urls.kEval.browserSearch]
    } else {
      return ["Browser API not supported", Urls.kEval.ERROR]
    }
  } }
  switch (cmd) {
  case "urls":
    if (workType < Urls.WorkType.ActIfNoSideEffects) { return null }
    return callOpenUrls(path, workType)
  case "cd": case "up":
    arr = (path + "  ").split(" ");
    if (!arr[2]) {
      if (workType < Urls.WorkType.ActIfNoSideEffects) { return null; }
      res = getPortUrl_();
      if (typeof res === "string") {
        arr[2] = res;
      } else {
        return res.then(url => {
          const res1 = url && evalVimiumUrl_("cd " + path + " " + (path.includes(" ") ? url : ". " + url)
              , workType as Urls.WorkAllowEval, onlyOnce, _isNested
              ) as string | Urls.BaseEvalResult | null;
          return !res1 ? [url ? "fail in parsing" : "No current tab found", Urls.kEval.ERROR]
              : typeof res1 === "string" ? [res1, Urls.kEval.plainUrl] : res1;
        });
      }
    }
    cmd = arr[0];
    let startsWithSlash = cmd[0] === "/";
    ind = parseInt(cmd, 10);
    ind = !isNaN(ind) ? ind : cmd === "/" ? 1
        : startsWithSlash ? cmd.replace(<RegExpG> /(\.+)|./g, "$1").length + 1
        : -cmd.replace(<RegExpG> /\.(\.+)|./g, "$1").length || -1;
    let cdRes = parseSearchUrl_({ u: arr[2], p: ind, t: null, f: 1, a: arr[1] !== "." ? arr[1] : "" });
    return cdRes && cdRes.u || [cdRes ? cdRes.e! : "No upper path", Urls.kEval.ERROR];
  case "parse": case "decode":
    cmd = path.split(" ", 1)[0];
    if (cmd.search(<RegExpI> /\/|%2f/i) < 0) {
      path = path.slice(cmd.length + 1).trimLeft();
    } else {
      cmd = "~";
    }
    path = decodeEscapedURL_(path);
    arr = [path];
    path = convertToUrl_(path, null, Urls.WorkType.Default, _isNested)
    if (lastUrlType_ !== Urls.Type.Search && (obj = parseSearchUrl_({ u: path }))) {
      if (obj.u === "") {
        arr = [cmd];
      } else {
        arr = obj.u.split(" ");
        arr.unshift(cmd);
      }
    } else {
      arr = arr[0].split(spacesRe_);
    }
    break;
  case "sed": case "substitute": case "sed-p": case "sed.p": case "sed2":
    const first = path.split(" ", 1)[0]
    path = path.slice(first.length + 1).trim()
    const second = cmd === "sed2" ? path.split(" ", 1)[0] : ""
    path = path.slice(second.length).trim()
    path = path && substitute_(path, cmd.endsWith("p") ? SedContext.paste : SedContext.NONE,
        second ? { r: first, k: second }
        : (<RegExpOne> /^[@#$-]?[\w\x80-\ufffd]+$|^\.$/).test(first) ? { r: null, k: first } : { r: first, k: null } )
    return [path, Urls.kEval.paste]
  case "u": case "url": case "search":
    // here path is not empty, and so `decodeEscapedURL(path).trim()` is also not empty
    arr = decodeEscapedURL_(path, true).split(spacesRe_)
    break;
  case "paste":
    if (workType > Urls.WorkType.ActIfNoSideEffects - 1) {
      res = paste_(path);
      return res instanceof Promise ? res.then<Urls.PasteEvalResult>(
          s => [s ? s.trim().replace(spacesRe_, " ") : "", Urls.kEval.paste])
                : [res ? res.trim().replace(spacesRe_, " ") : "", Urls.kEval.paste];
    }
  default:
    return null;
  }
  if (onlyOnce) {
    return [arr, Urls.kEval.search];
  }
  if (_isNested && _isNested > 12) { return null }
  let keyword = arr[0] && searchEngines_.map.has(arr[0]) ? arr.shift()! : null
  return createSearchUrl_(arr, keyword, _isNested === 12 ? Urls.WorkType.Default : workType, _isNested)
} as Urls.Executor)

const tryEvalMath_ = (path: string, math_parser: typeof import("../lib/math_parser")): Urls.MathEvalResult => {
  quotedStringRe_.test(path) && (path = path.slice(1, -1));
  path = path.replace(/\uff0c/g as RegExpG, " ");
  const re2 = /([\u2070-\u2079\xb2\xb3\xb9]+)|[\xb0\uff0b\u2212\xd7\xf7]|''?/g
  path = path.replace(<RegExpG> /deg\b/g, "\xb0")
      .replace(<RegExpG & RegExpSearchable<0>> /[\xb0']\s*\d+(\s*)(?=\)|$)/g, (str, g1): string => {
    str = str.trim()
    return str + (str[0] === "'"  ? "''" : "'") + g1
  }).replace(<RegExpG & RegExpSearchable<1>> re2, (str, g1): string => {
    let out = "", i: number
    if (!g1) {
      return str === "\xb0" ? "/180*PI+" : (i = "\uff0b\u2212\xd7\xf7".indexOf(str)) >= 0 ? "+-*/"[i]
          : `/${str === "''" ? 3600 : 60}/180*PI+`
    }
    for (const ch of str) {
      out += ch < "\xba" ? ch > "\xb3" ? 1 : ch < "\xb3" ? 2 : 3 : ch.charCodeAt(0) - 0x2070
    }
    return out && "**" + out
  }).replace(<RegExpG> /([\d.])rad\b/g, "$1")
  path = path.replace(<RegExpG> /^=+|=+$/g, "").trim()
  let nParenthesis = ([].reduce as (cb: (o: number, c: string) => number, o: number) => number
      ).call(path, (n, ch) => n + (ch === "(" ? 1 : ch === ")" ? -1 : 0), 0)
  for (; nParenthesis < 0; nParenthesis++) { path = "(" + path }
  while (nParenthesis-- > 0) { path += ")" }
  if (path) {
    while (path && path[0] === "(" && path.slice(-1) === ")") { path = path.slice(1, -1).trim() }
    path = path || "()"
  }

  let result: any = ""
  let mathParser: any = math_parser.MathParser || (globalThis as any).MathParser || {}
  if (mathParser.evaluate) {
    try {
      result = mathParser.evaluate(path !== "()" ? path : "0") // eslint-disable-line @typescript-eslint/no-unsafe-call
      if (typeof result === "function") {
        result = ""
      } else {
        result = "" + result;
      }
    } catch {}
    mathParser.clean() // eslint-disable-line @typescript-eslint/no-unsafe-call
    mathParser.errormsg && (mathParser.errormsg = "")
  }
  return [result, Urls.kEval.math, path];
}

const forceStatus_ = (act: Frames.ForcedStatusText): void => {
  let tabId = curTabId_
  if (!!parseInt(act, 10)) {
    tabId = parseInt(act, 10)
    act = act.slice(act.search(<RegExpOne> /[/ ]/) + 1) as Frames.ForcedStatusText
  }
  const ref = framesForTab_.get(tabId || (tabId = curTabId_))
  if (!ref) { return; }
  if (ref.flags_ & Frames.Flags.ResReleased) {
    console.log(`Unexpected inactive Tab ${tabId}`)
    return
  }
  set_cPort(ref.top_ || ref.cur_)
  let spaceInd = act.search(<RegExpOne> /[/ ]/), newPassedKeys = spaceInd > 0 ? act.slice(spaceInd + 1) : ""
  act = act.toLowerCase() as Frames.ForcedStatusText;
  if (spaceInd > 0) {
    act = act.slice(0, spaceInd) as Frames.ForcedStatusText;
  }
  act.includes("-") && act.endsWith("able") && (act += "d")
  const silent = !!newPassedKeys && (<RegExpOne> /^silent/i).test(newPassedKeys);
  newPassedKeys = (silent ? newPassedKeys.slice(7) : newPassedKeys).trim()
  let shown: BOOL = 0
  const logAndShow = (msg: string): void => { console.log(msg), shown || showHUD(msg); shown = 1 }
  if (newPassedKeys.includes("%") && (<RegExpI> /%[a-f0-9]{2}/i).test(newPassedKeys)) {
    newPassedKeys = DecodeURLPart_(newPassedKeys)
  }
  if (newPassedKeys && !newPassedKeys.startsWith("^ ")) {
    logAndShow('"vimium://status" only accepts a list of hooked keys')
    newPassedKeys = "";
  } else if (newPassedKeys) {
    const passArr = newPassedKeys.match(<RegExpG> /<(?!<)(?:a-)?(?:c-)?(?:m-)?(?:s-)?(?:[a-z]\w+|[^\sA-Z])>|\S/g)
    newPassedKeys = passArr ? passArr.join(" ").replace(<RegExpG> /<(\S+)>/g, "$1") : ""
  }
  let pattern: string | null
  const curSender = cPort.s, oldStatus = curSender.status_,
  stdStatus = !Exclusions.exclusionListening_ ? Frames.Status.enabled
      : oldStatus === Frames.Status.partial ? oldStatus
      : (pattern = Exclusions.getExcluded_(curSender.url_, curSender),
          pattern ? Frames.Status.partial : pattern === null ? Frames.Status.enabled : Frames.Status.disabled),
  stat = act === "enable" ? Frames.Status.enabled : act === "disable" ? Frames.Status.disabled
    : act === "toggle-disabled" ? oldStatus !== Frames.Status.disabled
        ? stdStatus === Frames.Status.disabled ? null : Frames.Status.disabled
        : stdStatus === Frames.Status.disabled ? Frames.Status.enabled : null
    : act === "toggle-enabled" ? oldStatus !== Frames.Status.enabled
        ? stdStatus === Frames.Status.enabled ? null : Frames.Status.enabled
        : stdStatus === Frames.Status.enabled ? Frames.Status.disabled : null
    : act === "toggle-next" ? oldStatus === Frames.Status.partial ? Frames.Status.enabled
        : oldStatus === Frames.Status.enabled ? stdStatus === Frames.Status.disabled ? null : Frames.Status.disabled
        : stdStatus === Frames.Status.disabled ? Frames.Status.enabled : null
    : act === "toggle" || act === "next"
    ? oldStatus !== Frames.Status.enabled ? Frames.Status.enabled : Frames.Status.disabled
    : (act !== "reset" && logAndShow(`Unknown status action: "${act}", so reset`) , null),
  enableWithPassedKeys = !!newPassedKeys && act === "enable",
  locked = stat === null ? Frames.Flags.blank
      : stat === Frames.Status.disabled ? Frames.Flags.lockedAndDisabled : Frames.Flags.locked,
  msg: Req.bg<kBgReq.reset> = {
    N: kBgReq.reset,
    p: stat === Frames.Status.disabled || enableWithPassedKeys ? newPassedKeys : null,
    f: locked
  };
  // avoid Status.partial even if `newPassedKeys`, to keep other checks about Flags.locked correct
  let newStatus: Frames.ValidStatus = locked ? stat! : Frames.Status.enabled;
  ref.lock_ = locked ? { status_: newStatus, passKeys_: msg.p } : null
  for (const port of ref.ports_) {
    const sender = port.s
    if (!locked && Exclusions.exclusionListening_) {
      pattern = msg.p = Exclusions.getExcluded_(sender.url_, sender)
      newStatus = pattern === null ? Frames.Status.enabled : pattern
        ? Frames.Status.partial : Frames.Status.disabled;
      if (newStatus !== Frames.Status.partial && sender.status_ === newStatus) { continue; }
    }
    // must send "reset" messages even if port keeps enabled by 'v.st enable'
    // - frontend may need to reinstall listeners
    sender.status_ = newStatus;
    port.postMessage(msg);
  }
  newStatus = ref.cur_.s.status_
  silent || shown || showHUDEx(cPort, "newStat", 0, [
      [newStatus === Frames.Status.enabled && !enableWithPassedKeys
        ? "fullyEnabled" : newStatus === Frames.Status.disabled ? "fullyDisabled" : "halfDisabled"]])
  if (needIcon_ && newStatus !== oldStatus) {
    setIcon_(tabId, newStatus);
  }
}

const callOpenUrls = (path: string, workType: Urls.WorkType): Urls.ErrorEvalResult
    | Urls.RunEvalResult | Promise<Urls.RunEvalResult> => {
  const ind = path.indexOf(":") + 1 || path.indexOf(" ") + 1
  if (ind <= 0) { return ["No search engines given", Urls.kEval.ERROR] }
  const keys = path.slice(0, ind - 1).split(path.lastIndexOf(" ", ind - 1) >= 0 ? " " : "|")
      .filter(i => searchEngines_.map.has(i))
  if (keys.length <= 0) { return ["No valid search engines found", Urls.kEval.ERROR] }
  const query = path.slice(ind).trim().split(" ")
  const urls: Urls.RunEvalResult[0] = ["openUrls"]
  // `as string` is safe when only used by {@see open_urls.ts#onEvalUrl_}
  for (const keyword of keys) { urls.push(createSearchUrl_(query, keyword, workType) as string) }
  return !urls.some((u): boolean => <unknown> u instanceof Promise) ? [urls, Urls.kEval.run]
      : Promise.all(urls).then((urls2): Urls.RunEvalResult => [ urls2 as Urls.RunEvalResult[0], Urls.kEval.run ])
}
