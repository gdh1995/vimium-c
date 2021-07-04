import { CONST_, contentPayload_, settingsCache_, substitute_ } from "./store"
import * as BgUtils_ from "./utils"
import {
  convertToUrl_, formatVimiumUrl_, lastUrlType_, removeComposedScheme_, searchVariableRe_, searchWordRe_
} from "./normalize_urls"


export const parseSearchUrl_ = (request: FgReqWithRes[kFgReq.parseSearchUrl]): FgRes[kFgReq.parseSearchUrl] => {
  let s0 = request.u, url = s0.toLowerCase(), pattern: Search.Rule | undefined
    , arr: string[] | null = null, _i: number, selectLast = false;
  if (!BgUtils_.protocolRe_.test(removeComposedScheme_(url))) {
    BgUtils_.resetRe_();
    return null;
  }
  if (request.p) {
    const obj = parseUpperUrl_(request)
    return { k: "", s: 0, u: obj.p != null ? obj.u : s0, e: obj.p != null ? obj.p : obj.u }
  }
  const decoders = settingsCache_.searchEngineRules;
  if (_i = BgUtils_.IsURLHttp_(url)) {
    url = url.slice(_i);
    s0 = s0.slice(_i);
  }
  for (_i = decoders.length; 0 <= --_i; ) {
    pattern = decoders[_i];
    if (!url.startsWith(pattern.prefix_)) { continue; }
    arr = s0.slice(pattern.prefix_.length).match(pattern.matcher_ as RegExpG);
    if (arr) { break; }
  }
  if (!arr || !pattern) {
    const showPage = CONST_.ShowPage_
    if (url.startsWith(showPage)) {
      s0 = s0.slice(showPage.length).replace(<RegExpOne> /^#!?/, "")
      return {
        k: "vimium://show",
        u: s0,
        s: s0.startsWith("image") && s0.lastIndexOf("&", s0.indexOf(":") + 1) + 1 || s0.indexOf(" ") + 1,
      }
    }
    BgUtils_.resetRe_()
    return null
  }
  if (arr.length > 1 && !pattern.matcher_.global) { arr.shift(); }
  const re = pattern.delimiter_;
  if (arr.length > 1) {
    selectLast = true;
  } else if (re instanceof RegExp) {
    url = arr[0];
    if (arr = url.match(re)) {
      arr.shift();
      selectLast = true;
    } else {
      arr = [url];
    }
  } else {
    arr = arr[0].split(re);
  }
  url = "";
  for (_i = 0; _i < arr.length; _i++) { url += " " + BgUtils_.DecodeURLPart_(arr[_i]); }
  url = url.trim().replace(BgUtils_.spacesRe_, " ");
  BgUtils_.resetRe_();
  return {
    k: pattern.name_,
    u: url,
    s: selectLast ? url.lastIndexOf(" ") + 1 : 0
  };
}

export const parseUpperUrl_ = (request: FgReqWithRes[kFgReq.parseUpperUrl]): FgRes[kFgReq.parseUpperUrl] => {
  let { u: url } = request, url_l = url.toLowerCase()
  if (request.p === 1) {
    let url2 = substitute_(url, SedContext.goToRoot, request.s)
    if (url2 !== url && url2 && url2 !== url + "/" && url2 + "/" !== url) {
      const url3 = convertToUrl_(url2, null, Urls.WorkType.KeepAll)
      if (lastUrlType_ === Urls.Type.Full) {
        return { u: url3, p: "(sed)" }
      }
    }
  }
  if (!BgUtils_.protocolRe_.test(removeComposedScheme_(url_l))) {
    return { u: "This url has no upper paths", p: null }
  }
  const enc = encodeURIComponent
  let hash = "", str: string, arr: RegExpExecArray | null, startWithSlash = false, endSlash = false
    , removeSlash = false
    , path: string | null = null, i: number, start = 0, end = 0, decoded = false, arr2: RegExpExecArray | null
  if (i = url.lastIndexOf("#") + 1) {
    hash = url.slice(i + +(url.substr(i, 1) === "!"))
    str = BgUtils_.DecodeURLPart_(hash)
    i = str.lastIndexOf("/")
    if (i > 0 || (i === 0 && str.length > 1)) {
      decoded = str !== hash
      const argRe = <RegExpOne> /([^&=]+=)([^&\/=]*\/[^&]*)/
      arr = argRe.exec(str) || (<RegExpOne> /(^|&)([^&\/=]*\/[^&=]*)(?:&|$)/).exec(str)
      path = arr ? arr[2] : str
      // here `path` is ensured not empty
      if (path === "/" || path.includes("://")) { path = null }
      else if (!arr) { start = 0 }
      else if (!decoded) { start = arr.index + arr[1].length }
      else {
        str = "https://example.com/"
        str = encodeURI(str + path).slice(str.length)
        i = (hash.indexOf(str) + 1 || hash.indexOf(str = enc(path)) + 1) - 1
        if (i < 0) { decoded = false, i = hash.indexOf(str = path) }
        end = i + str.length
        if (i < 0 && arr[1] !== "&") {
          i = hash.indexOf(str = arr[1])
          if (i < 0) { decoded = true, str = enc(arr[1].slice(0, -1)), i = hash.indexOf(str) }
          if (i >= 0) {
            i += str.length
            end = hash.indexOf("&", i) + 1
          }
        }
        if (i >= 0) { start = i }
        else if (arr2 = argRe.exec(hash)) {
          path = BgUtils_.DecodeURLPart_(arr2[2]), start = arr2.index + arr2[1].length, end = start + arr2[2].length
        } else if ((str = arr[1]) !== "&") {
          i = url.length - hash.length
          hash = str + enc(path), url = url.slice(0, i) + hash, start = str.length, end = 0
        }
      }
      if (path) {
        i = url.length - hash.length
        start += i, end > 0 && (end += i)
      }
    }
  }
  if (!path) {
    if (url_l.startsWith(CONST_.BrowserProtocol_) && !request.f) {
      return { u: "An extension has no upper-level pages", p: null }
    }
    hash = ""
    start = url.indexOf("/", url.indexOf("://") + 3)
    if (url_l.startsWith("filesystem:")) { start = url.indexOf("/", start + 1) }
    start = start < 0 ? 0 : start
    i = url.indexOf("?", start), end = url.indexOf("#", start)
    i = end < 0 ? i : i < 0 ? end : i < end ? i : end
    i = i > 0 ? i : url.length
    path = url.slice(start, i), end = 0, decoded = false
  }
  // Note: here should ensure `end` >= 0
  i = request.p
  startWithSlash = path.startsWith("/")
  if (!hash && url_l.startsWith("file:")) {
    if (path.length <= 1 || url.length === 11 && url.endsWith(":/")) {
      if (!request.f) {
        return { u: "This has been the root path", p: null }
      }
      i = 0
    }
    endSlash = true
    request.f || i === 1 && (i = -1)
  } else if (!hash && url_l.startsWith("ftp:")) {
    endSlash = true
  } else {
    endSlash = request.t != null ? !!request.t : request.r != null ? !!request.r
        : path.length > 1 && path.endsWith("/")
          || (<RegExpI> /\.([a-z]{2,3}|apng|jpeg|tiff)$/i).test(path) // just a try: not include .html
  }
  const arr3 = path.slice(+startWithSlash, path.length - +path.endsWith("/")).split("/")
  const len3 = arr3.length, level = i < 0 ? i + len3 : i
  removeSlash = len3 <= 1 && i <= -2 && url.lastIndexOf("#", start) > 0
  i = level > len3 ? len3 : i > 0 ? level - 1 : level > 0 ? level : 0
  arr3.length = i
  path = arr3.join("/")
  if (str = request.a || "") {
    path += str[0] === "/" ? str : "/" + str
  }
  path = path ? (path[0] === "/" ? "" : "/") + path + (!endSlash || path.endsWith("/") ? "" : "/") : "/"
  if (!end && url.lastIndexOf("git", start - 3) > 0) {
    path = /*#__NOINLINE__*/ upperGitUrls(url, path) || path
  }
  if (removeSlash && (!path || path === "/")) {
    url = url.split("#", 1)[0]
  } else {
    str = decoded ? enc(path) : path
    url = url.slice(0, start) + (end ? str + url.slice(end) : str)
  }
  let substituted = substitute_(url, SedContext.gotoUpperUrl, request.s) || url
  if (substituted !== url) {
    // if substitution returns an invalid URL, then refuse it
    const url4 = convertToUrl_(substituted, null, Urls.WorkType.KeepAll)
    url = lastUrlType_ === Urls.Type.Full ? url4 : url
  }
  return { u: url, p: path }
}

const upperGitUrls = (url: string, path: string): string | void | null => {
  const obj = BgUtils_.safeParseURL_(url), host: string | undefined = obj ? obj.host : ""
  if (!host) { return }
  if (!(<RegExpI> /git\b|\bgit/i).test(host) || !(<RegExpI> /^[\w\-]+(\.\w+)?(:\d{2,5})?$/).test(host)) {
    return
  }
  let arr = path.split("/"), lastIndex = arr.length - 1
  if (!arr[lastIndex]) { lastIndex--, arr.pop() }
  let last = arr[lastIndex]
  if (host === "github.com") {
    if (lastIndex === 3) {
      return last === "pull" || last === "milestone" || last === "commit" ? path + "s"
        : last === "tree" || last === "blob" ? arr.slice(0, 3).join("/")
        : null
    } else if (lastIndex === 4 && arr[3] === "releases" && (arr[4] === "tag" || arr[4] === "edit")) {
      return arr.slice(0, 4).join("/")
    } else if (lastIndex > 3) {
      return arr[3] === "blob" ? (arr[3] = "tree", arr.join("/")) : null
    }
  }
}

export const findUrlInText_ = (url: string, testUrl: OpenPageUrlOptions["testUrl"] | UnknownValue): string => {
  return typeof testUrl === "string" && testUrl.toLowerCase().startsWith("whole")
    ? fixCharsInUrl_(url) : detectLinkDeclaration_(url)
}

const detectLinkDeclaration_ = (str: string): string => {
  let i = str.indexOf("\uff1a") + 1 || str.indexOf(":") + 1;
  let url: string
  if (!i || str[i] === "/") {
    if (!i || str.substr(i + 1, 1) !== "/") {
      return str
    }
    url = str
  } else {
    let s = str.slice(0, i - 1).trim().toLowerCase();
    if (s !== "link" && s !== "\u94fe\u63a5") { return str; }
    url = str.slice(i).trim()
    i = url.indexOf("\uff1a") + 1 || url.indexOf(":") + 1
    if (!i || !(<RegExpOne> /^[\w+-]+((?:\.[\w+-])*\.[a-z]{2,6})?\//).test(url)) { return str }
  }
  const sepArr = (<RegExpOne> /\s|[^=][\u3002\uff0c\uff1b]([^a-z?&#-]|$)/).exec(url)
  const endChar = ",.;\u3002\uff0c\uff1b"
  const isSepSpace = !!sepArr && sepArr[0].length === 1
  const first = sepArr ? url.slice(0, sepArr.index + (isSepSpace ? 0 : 1)) : null
  const leftCharRe = <RegExpOne> /["(\u2018\u201c\u300a\uff08\uff1c]/
  const rightChar = '")\u2019\u201d\u300b\uff09\uff1e'
  let todo = (first || url).includes("#~:text=") ? 0 : 7 // 1: left, 2: right, 4: end
  if (todo && first) {
    if (!isSepSpace) { url = first, todo = 3 }
    else if (endChar.lastIndexOf(first.slice(-1), 2) >= 0) { url = first.slice(0, -1), todo = 3 }
    else if (rightChar.includes(first.slice(-1))) {
      todo = !leftCharRe.test(first.slice(i)) ? (url = first.slice(0, -1), 1) : 0
    }
  }
  if (todo & 4 && endChar.includes(url.slice(-1))) { url = url.slice(0, -1) }
  if (todo & 2 && rightChar.includes(url.slice(-1))) {
    !leftCharRe.test(url.slice(i)) ? url = url.slice(0, -1) : todo = 0
  }
  if (url && endChar.includes(url[0])) { url = url.slice(1).trim() }
  if (todo & 1 && url && leftCharRe.test(url[0])) { url = url.slice(1) }
  url = fixCharsInUrl_(url, false, true)
  return lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl && !url.startsWith("vimium:") ? url : str;
}

export const fixCharsInUrl_ = (url: string, alwaysNo3002?: boolean, forceConversion?: boolean): string => {
  let type = +url.includes("\u3002") + 2 * +url.includes("\uff1a");
  if (!type && !forceConversion) { return url; }
  let i = url.indexOf("//");
  i = url.indexOf("/", i >= 0 ? i + 2 : 0);
  if (i >= 0 && i < 4) { return url; }
  let str = i > 0 ? url.slice(0, i) : url;
  if ((<RegExpI> /^(data|javascript)[:\uff1a]/i).test(str)) { return url }
  if (type & 1) {
    str = str.replace(<RegExpG> /\u3002/g, ".");
  }
  if (type & 2) {
    str = str.replace("\uff1a", ":").replace("\uff1a", ":");
  }
  i > 0 && (str += url.slice(i));
  convertToUrl_(str, null, Urls.WorkType.KeepAll);
  return lastUrlType_ < Urls.Type.MaxOfInputIsPlainUrl + 1 ? str
      : type !== 1 || !alwaysNo3002 || (<RegExpOne> /[^.\w\u3002-]/).test(url) ? url
      : url.replace(<RegExpG> /\u3002/g, ".")
}

export const decodeFileURL_ = (url: string): string => {
  if (contentPayload_.o === kOS.win && url.startsWith("file://")) {
    const slash = url.indexOf("/", 7)
    if (slash < 0 || slash === url.length - 1) { return slash < 0 ? url + "/" : url }
    url = slash === 7 && url.substr(9, 1) === ":" ? url[8].toUpperCase() + url.slice(9) : "\\\\" + url.slice(7)
    let sep = (<RegExpOne> /[?#]/).exec(url), index = sep ? sep.index : 0
    let tail = index ? url.slice(index) : ""
    url = index ? url.slice(0, index) : url
    url = url.replace(<RegExpG> /\/+/g, "\\")
    url = index ? url + tail : url
  }
  return url
}

export const parseSearchEngines_ = (str: string, map: Map<string, Search.Engine>): Search.Rule[] => {
  let ids: string[], tmpRule: Search.TmpRule | null, tmpKey: Search.Rule["delimiter_"],
  key: string, obj: Search.RawEngine,
  ind: number, rules: Search.Rule[] = [], re = searchWordRe_,
  rSpace = <RegExpOne> /\s/,
  func = (function (k: string): boolean {
    return (k = k.trim()) && k !== "__proto__" && k.length < Consts.MinInvalidLengthOfSearchKey
      ? (map.set(k, obj), true) : false
  });
  for (let val of str.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : "").split("\n")) {
    val = val.trim();
    if (val < kChar.minNotCommentHead) { continue; } // mask: /[!"#]/
    ind = 0;
    do {
      ind = val.indexOf(":", ind + 1);
    } while (val.charCodeAt(ind - 1) === kCharCode.backslash);
    if (ind <= 0 || !(key = val.slice(0, ind).trimRight())) { continue; }
    ids = key.replace(<RegExpG & RegExpSearchable<0>> /\\:/g, ":").split("|");
    val = val.slice(ind + 1).trimLeft();
    if (!val) { continue; }
    key = val.replace(<RegExpG & RegExpSearchable<0>> /\\\s/g, "\\s");
    ind = key.search(rSpace);
    let blank = "";
    if (ind > 0) {
      str = val.slice(ind);
      val = key.slice(0, ind);
      ind = str.search(<RegExpI & RegExpSearchable<0>> /\sblank=/i);
      if (ind >= 0) {
        let ind2 = str.slice(ind + 7).search(rSpace);
        ind2 = ind2 > 0 ? ind + 7 + ind2 : 0;
        blank = str.slice(ind + 7, ind2 || void 0);
        str = str.slice(0, ind) + (ind2 ? str.slice(ind2) : "");
      }
      ind = str.search(<RegExpI> /\sre=/i);
    } else {
      val = key;
      str = "";
    }
    val = val.replace(<RegExpG & RegExpSearchable<0>> /\\s/g, " "
      ).trim().replace(<RegExpG & RegExpSearchable<2>> /([^\\]|^)%(s)/gi, "$1$$$2"
      ).replace(<RegExpG & RegExpSearchable<0>> /\\%/g, "%");
    obj = {
      name_: "",
      blank_: blank,
      url_: val
    };
    ids = ids.filter(func);
    if (ids.length === 0) { continue; }
    if (ind === -1) {
      re.lastIndex = 0;
      const pair = (re as RegExp as RegExpOne).exec(val);
      if (pair && (ind = pair.index + 1)) {
        key = pair[2];
        if (key) {
          val = val.replace(re, "$$$1");
        } else {
          key = pair[1] === "s" ? "+" : " ";
        }
        val = convertToUrl_(val, null, Urls.WorkType.ConvertKnown);
        if (lastUrlType_ > Urls.Type.MaxOfInputIsPlainUrl) {
          val = val.replace(<RegExpG & RegExpSearchable<1>> /%24(s)/gi, "$$$1");
          ind = val.search(re as RegExp as RegExpOne) + 1;
        } else if (lastUrlType_ !== Urls.Type.Full) {
          ind += lastUrlType_ === Urls.Type.NoScheme ? 7 : 5;
        }
        if (tmpRule = reParseSearchUrl_(val.toLowerCase(), ind)) {
          if (key.includes("$")) {
            key = key.replace(searchVariableRe_, "(.*)");
            tmpKey = new RegExp("^" + key, (<RegExpI> /[a-z]/i).test(key) ? "i" as "" : ""
              ) as RegExpI | RegExpOne;
          } else {
            tmpKey = key.trim() || " ";
          }
          rules.push({
            prefix_: tmpRule.prefix_,
            matcher_: tmpRule.matcher_,
            name_: ids[0].trimRight(), delimiter_: tmpKey
          });
        }
      }
    } else if (str.charCodeAt(ind + 4) === kCharCode.slash) {
      key = ind > 1 ? str.slice(1, ind).trim() : "";
      str = str.slice(ind + 5);
      ind = str.search(<RegExpOne> /[^\\]\//) + 1;
      val = str.slice(0, ind);
      str = str.slice(ind + 1);
      ind = str.search(rSpace);
      const tmpKey2 = BgUtils_.makeRegexp_(val, ind >= 0 ? str.slice(0, ind) : str);
      if (tmpKey2) {
        key = prepareReParsingPrefix_(key);
        rules.push({prefix_: key, matcher_: tmpKey2, name_: ids[0].trimRight(),
            delimiter_: obj.url_.lastIndexOf("$S") >= 0 ? " " : "+"});
      }
      str = ind >= 0 ? str.slice(ind + 1) : "";
    } else {
      str = str.slice(ind + 4);
    }
    str = str.trimLeft();
    obj.name_ = str ? BgUtils_.DecodeURLPart_(str) : ids[ids.length - 1].trimLeft();
  }
  return rules;
}

const reParseSearchUrl_ = (url: string, ind: number): Search.TmpRule | null => {
  if (ind < 1 || !BgUtils_.protocolRe_.test(url)) { return null; }
  let prefix: string, str: string, str2: string, ind2: number;
  prefix = url.slice(0, ind - 1);
  if (ind = Math.max(prefix.lastIndexOf("?"), prefix.lastIndexOf("#")) + 1) {
    str2 = str = prefix.slice(ind);
    prefix = prefix.slice(0, prefix.search(<RegExpOne> /[#?]/));
    if (ind2 = str.lastIndexOf("&") + 1) {
      str2 = str.slice(ind2);
    }
    if (str2 && str2.indexOf("=") >= 1) {
      str = "[#&?]";
      url = "([^#&]*)"
    } else {
      str2 = str;
      str = url[ind - 1] === "#" ? "#" : str2 ? "[#?]" : "\\?";
      url = "([^#&?]*)"
    }
  } else {
    str = "^([^#?]*)";
    if (str2 = url.slice(prefix.length + 2)) {
      if (ind = str2.search(<RegExpOne> /[#?]/) + 1) {
        str2 = str2.slice(0, ind - 1);
      }
    }
    url = "";
  }
  str2 = str2 && BgUtils_.escapeAllForRe_(str2).replace(<RegExpG> /\\\+|%20| /g, "(?:\\+|%20| )");
  prefix = prepareReParsingPrefix_(prefix);
  return {
    prefix_: prefix,
    matcher_: new RegExp(str + str2 + url, (<RegExpI> /[a-z]/i).test(str2) ? "i" as "" : "") as RegExpI | RegExpOne
  };
}

export const prepareReParsingPrefix_ = (prefix: string): string => {
  const head = prefix.slice(0, 9).toLowerCase(), httpType = BgUtils_.IsURLHttp_(head)
  if (httpType) {
    prefix = prefix.slice(httpType)
  } else if (head === "vimium://") {
    prefix = formatVimiumUrl_(prefix.slice(9), false, Urls.WorkType.ConvertKnown)
  }
  return prefix;
}
