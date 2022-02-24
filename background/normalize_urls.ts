import {
  CONST_, os_, CurCVer_, evalVimiumUrl_, historyCache_, IsEdg_, OnChrome, OnFirefox, searchEngines_, newTabUrl_f
} from "./store"
import {
  isJSUrl_, DecodeURLPart_, resetRe_, isIPHost_, encodeAsciiComponent_, spacesRe_, protocolRe_, isTld_
} from "./utils"

export const hostRe_ = <RegExpOne & RegExpSearchable<4>> /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+])(:\d{2,5})?$/
export const customProtocolRe_ = <RegExpOne> /^(?:ext|web)\+[a-z]+:/
export const quotedStringRe_ = <RegExpOne> /^"[^"]*"$|^'[^']*'$|^\u201c[^\u201d]*\u201d$/
export const searchWordRe_ = <RegExpG & RegExpSearchable<2>> /\$([sS$])?(?:\{([^}]*)})?/g
export const searchVariableRe_ = <RegExpG & RegExpSearchable<1>> /\$([+-]?\d+)/g

const KnownPages_ = ["blank", "newtab", "options", "show"]
const kOpts = "options.html"
const RedirectedUrls_: SafeDict<string> = { __proto__: null as never,
  about: "", changelog: "/RELEASE-NOTES.md", help: "/wiki", home: "", license: "/LICENSE.txt",
  option: kOpts, permissions: "/PRIVACY-POLICY.md#permissions-required", policy: "/PRIVACY-POLICY.md",
  popup: kOpts, preference: kOpts, preferences: kOpts,
  privacy: "/PRIVACY-POLICY.md#privacy-policy", profile: kOpts, profiles: kOpts,
  readme: "#readme", release: "/RELEASE-NOTES.md", releases: "/RELEASE-NOTES.md", "release-notes": "/RELEASE-NOTES.md",
  setting: kOpts, settings: kOpts, wiki: "/wiki"
}

export let lastUrlType_ = Urls.Type.Default

export const convertToUrl_ = function (str: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url {
  str = str.trim();
  lastUrlType_ = Urls.Type.Full;
  if (isJSUrl_(str)) {
    if (OnChrome && Build.MinCVer < BrowserVer.MinAutoDecodeJSURL && CurCVer_ < BrowserVer.MinAutoDecodeJSURL
        && str.includes("%") && !(<RegExpOne> /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/).test(str)) {
      str = DecodeURLPart_(str);
    }
    str = str.replace(<RegExpG> /\xa0/g, " ");
    resetRe_();
    return str;
  }
  let type: Urls.Type | Urls.TempType.Unspecified | Urls.TldType = Urls.TempType.Unspecified
    , expected: Urls.Type.Full | Urls.Type.NoProtocolName | Urls.Type.NoScheme = Urls.Type.Full
    , hasPath = false, index: number, index2: number, oldString: string
    , arr: [never, string | undefined, string | undefined, string, string | undefined] | null | undefined;
  // refer: https://cs.chromium.org/chromium/src/url/url_canon_etc.cc?type=cs&q=IsRemovableURLWhitespace&g=0&l=18
  // here's not its copy, but a more generalized strategy
  oldString = str.replace(<RegExpG> /[\n\r]+[\t \xa0]*/g, "").replace(<RegExpG> /\xa0/g, " ");
  const isQuoted = oldString[0] === '"' && oldString.endsWith('"'),
  oldStrForSearch = oldString;
  str = oldString = isQuoted ? oldString.slice(1, -1) : oldString;
  if ((<RegExpOne> /^[A-Za-z]:(?:[\\/](?![:*?"<>|/])|$)|^\/(?:Users|home|root)\/[^:*?"<>|/]+/).test(str)
      || str.startsWith("\\\\") && str.length > 3) {
    return convertFromFilePath(str)
  }
  str = oldString.toLowerCase();
  if ((index = str.indexOf(" ") + 1 || str.indexOf("\t") + 1) > 1) {
    str = str.slice(0, index - 1);
  }
  if ((index = str.indexOf(":")) === 0) { type = Urls.Type.Search; }
  else if (index === -1 || !protocolRe_.test(str)) {
    if (index !== -1 && str.lastIndexOf("/", index) < 0) {
      type = checkSpecialSchemes_(oldString.toLowerCase(), index, str.length % oldString.length);
    }
    expected = Urls.Type.NoScheme; index2 = oldString.length;
    if (type === Urls.TempType.Unspecified && str.startsWith("//")) {
      str = str.slice(2);
      expected = Urls.Type.NoProtocolName;
      index2 -= 2;
    }
    if (type !== Urls.TempType.Unspecified) {
      if (str === "about:blank/") { oldString = "about:blank"; }
    }
    else if ((index = str.indexOf("/")) <= 0) {
      if (index === 0 || str.length < index2) { type = Urls.Type.Search; }
    } else if (str.length >= index2 || str.charCodeAt(index + 1) > kCharCode.space) {
      hasPath = str.length > index + 1;
      str = str.slice(0, index);
    } else {
      type = Urls.Type.Search;
    }
  }
  else if (str.startsWith("vimium:")) {
    type = Urls.Type.PlainVimium;
    vimiumUrlWork = vimiumUrlWork! | 0;
    str = oldString.slice(9);
    if (vimiumUrlWork < Urls.WorkType.ConvertKnown || !str) {
      oldString = "vimium://" + str;
    }
    else if (vimiumUrlWork === Urls.WorkType.ConvertKnown || isQuoted
        || !(oldString = evalVimiumUrl_(str, vimiumUrlWork) as string)) {
      oldString = formatVimiumUrl_(str, false, vimiumUrlWork);
    } else if (typeof oldString !== "string") {
      type = Urls.Type.Functional;
    }
  }
  else if (customProtocolRe_.test(str)) {
    type = Urls.Type.Full
  }
  else if ((index2 = str.indexOf("/", index + 3)) === -1
      ? str.length < oldString.length : str.charCodeAt(index2 + 1) < kCharCode.minNotSpace
  ) {
    type = Urls.Type.Search;
  }
  else if ((<RegExpOne> /[^a-z]/).test(str.slice(0, index))) {
    type = (index = str.charCodeAt(index + 3)) > kCharCode.space
      && index !== kCharCode.slash ? Urls.Type.Full : Urls.Type.Search;
  }
  else if (str.startsWith("file:")) { type = Urls.Type.Full; }
  else if (str.startsWith("chrome:")) {
    type = str.length < oldString.length && str.includes("/") ? Urls.Type.Search : Urls.Type.Full;
  } else if (OnChrome && IsEdg_ && str.startsWith("read:")) {
    // read://http_xn--6qq79v_8715/?url=http%3A%2F%2Fxn--6qq79v%3A8715%2Fhello%2520-%2520world.html
    type = !(<RegExpOne> /^read:\/\/([a-z]+)_([.\da-z\-]+)(?:_(\d+))?\/\?url=\1%3a%2f%2f\2(%3a\3)?(%2f|$)/).test(str)
        || str.length < oldString.length ? Urls.Type.Search : Urls.Type.Full;
  } else {
    str = str.slice(index + 3, index2 >= 0 ? index2 : void 0);
  }

  // Note: here `string` should be just a host, and can only become a hostname.
  //       Otherwise `type` must not be `NoScheme | NoProtocolName`
  if (type === Urls.TempType.Unspecified && str.lastIndexOf("%") >= 0) {
    str = DecodeURLPart_(str)
    if (str.includes("/")) { type = Urls.Type.Search; }
  }
  if (type === Urls.TempType.Unspecified && str.startsWith(".")) { str = str.slice(1); }
  if (type !== Urls.TempType.Unspecified) { /* empty */ }
  else if (!(arr = hostRe_.exec(str) as typeof arr)) {
    type = Urls.Type.Search;
    if (str.length === oldString.length && isIPHost_(str = `[${str}]`, 6)) {
      oldString = str;
      type = Urls.Type.NoScheme;
    }
  } else if ((str = arr[3]).endsWith("]")) {
    type = isIPHost_(str, 6) ? expected : Urls.Type.Search;
  } else if (str === "localhost" || str.endsWith(".localhost") || isIPHost_(str, 4) || arr[4] && hasPath) {
    type = expected;
  } else if ((index = str.lastIndexOf(".")) < 0
      || (type = isTld_(str.slice(index + 1))) === Urls.TldType.NotTld) {
    index < 0 && str === "__proto__" && (str = "." + str);
    index2 = str.length - index - 1;
    // the new gTLDs allow long and notEnglish TLDs
    // https://en.wikipedia.org/wiki/Generic_top-level_domain#New_top-level_domains
    type = expected !== Urls.Type.NoScheme && (index < 0 || (expected !== Urls.Type.Full ? index2 >= 3 && index2 <= 5
        // most of TLDs longer than 14 chars mean some specific business companies (2021-09-13)
          : index2 >= 2 && index2 <= 14) && !(<RegExpOne> /[^a-z]/).test(str.slice(index + 1)))
        || checkInDomain_(str, arr[4]) > 0 ? expected : Urls.Type.Search
  } else if ((<RegExpOne> /[^.\da-z\-]|xn--|^-/).test(str)) {
    // non-English domain, maybe with an English but non-CC TLD
    type = (str.startsWith("xn--") || str.includes(".xn--") ? true
        : str.length === index + 3 || type !== Urls.TldType.ENTld ? !expected
        : checkInDomain_(str, arr[4])) ? expected : Urls.Type.Search;
  } else if (expected !== Urls.Type.NoScheme || hasPath) {
    type = expected;
  } else if (str.endsWith(".so") && str.startsWith("lib") && str.indexOf(".") === str.length - 3) {
    type = Urls.Type.Search;
  // the below check the username field
  } else if (arr[2] || arr[4] || !arr[1] || (<RegExpOne> /^ftps?(\b|_)/).test(str)) {
    type = Urls.Type.NoScheme;
  // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
  } else if (str.startsWith("mail") || str.indexOf(".mail") > 0
      || (index2 = str.indexOf(".")) === index) {
    type = Urls.Type.Search;
  } else if (str.indexOf(".", ++index2) !== index) {
    type = Urls.Type.NoScheme;
  } else if (str.length === index + 3 && type === Urls.TldType.ENTld) { // treat as a ccTLD
    type = isTld_(str.slice(index2, index), true) ? Urls.Type.Search : Urls.Type.NoScheme;
  } else {
    type = Urls.Type.NoScheme;
  }
  resetRe_();
  lastUrlType_ = type;
  return type === Urls.Type.Full
    ? (<RegExpI> /^extension:\/\//i).test(oldString) ? (OnFirefox ? "moz-" : "chrome-"
      ) + oldString : oldString
    : type === Urls.Type.Search ?
      createSearchUrl_(oldStrForSearch.split(spacesRe_), keyword || "~", vimiumUrlWork)
    : type <= Urls.Type.MaxOfInputIsPlainUrl ?
      type === Urls.Type.NoScheme && _guessDomain(oldString, str) ||
      (checkInDomain_(str, arr && arr[4]) === 2 ? "https:" : "http:")
      + (type === Urls.Type.NoScheme ? "//" : "") + oldString
    : oldString;
} as {
  (string: string, keyword: string | null | undefined, vimiumUrlWork: Urls.WorkAllowEval): Urls.Url
  (string: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkEnsureString): string
  (string: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url
}

const checkInDomain_ = (host: string, port?: string | null): 0 | 1 | 2 => {
  const domain = port && historyCache_.domains_.get(host + port) || historyCache_.domains_.get(host)
  return domain ? domain.https_ ? 2 : 1 : 0;
}

const _guessDomain = (url: string, host: string): string => {
  if ((<RegExpOne> /^(?!www\.)[a-z\d-]+\.([a-z]{3}(\.[a-z]{2})?|[a-z]{2})\/?$/i).test(url)
      && !checkInDomain_(host)) {
    const domain2 = historyCache_.domains_.get("www." + host)
    if (domain2) {
      return `${domain2.https_ ? "https" : "http"}://www.${url.toLowerCase().replace("/", "")}/`
    }
  }
  return ""
}

const checkSpecialSchemes_ = (str: string, i: number, spacePos: number): Urls.Type | Urls.TempType.Unspecified => {
  const isSlash = str.substr(i + 1, 1) === "/";
  switch (str.slice(0, i)) {
  case "about":
    return isSlash ? Urls.Type.Search : spacePos > 0 || str.includes("@", i)
      ? Urls.TempType.Unspecified : Urls.Type.Full;
  case "blob": case "view-source":
    str = str.slice(i + 1);
    if (str.startsWith("blob:") || str.startsWith("view-source:")) { return Urls.Type.Search; }
    convertToUrl_(str, null, Urls.WorkType.KeepAll);
    return lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? Urls.Type.Full : Urls.Type.Search;
  case "data":
    return isSlash ? Urls.Type.Search : (i = str.indexOf(",", i)) < 0 || (spacePos > 0 && spacePos < i)
      ? Urls.TempType.Unspecified : Urls.Type.Full;
  case "file": return Urls.Type.Full;
  case "filesystem":
    str = str.slice(i + 1);
    if (!protocolRe_.test(str)) { return Urls.Type.Search; }
    convertToUrl_(str, null, Urls.WorkType.KeepAll);
    return lastUrlType_ === Urls.Type.Full &&
        (<RegExpOne> /[^/]\/(?:persistent|temporary)(?:\/|$)/).test(str)
      ? Urls.Type.Full : Urls.Type.Search;
  case "magnet": return str[i + 1] !== "?" ? Urls.TempType.Unspecified : Urls.Type.Full;
  case "mailto": return isSlash ? Urls.Type.Search
    : (i = str.indexOf("/", i)) > 0 && str.lastIndexOf("?", i) < 0
    ? Urls.TempType.Unspecified : Urls.Type.Full;
  case "tel": return (<RegExpOne> /\d/).test(str) ? Urls.Type.Full : Urls.Type.Search;
  default:
    return customProtocolRe_.test(str) ? Urls.Type.Full
        : isSlash ? Urls.Type.Search : Urls.TempType.Unspecified;
  }
}

export const removeComposedScheme_ = (url: string): string => {
  const i = url.startsWith("filesystem:") ? 11 : url.startsWith("view-source:") ? 12 : 0;
  return i ? url.slice(i) : url;
}

export const formatVimiumUrl_ = (fullPath: string, partly: boolean, vimiumUrlWork: Urls.WorkType): string => {
  let ind: number, subPath = "", query = "", tempStr: string | undefined, path = fullPath.trim();
  if (!path) { return partly ? "" : location.origin + "/pages/"; }
  if (ind = path.indexOf(" ") + 1) {
    query = path.slice(ind).trim();
    path = path.slice(0, ind - 1);
  }
  if (ind = path.search(<RegExpOne> /[\/#?]/) + 1) {
    subPath = path.slice(ind - 1).trim();
    path = path.slice(0, ind - 1);
  }
  path === "display" && (path = "show");
  if (!(<RegExpOne> /\.\w+$/).test(path)) {
    path = path.toLowerCase();
    if ((tempStr = RedirectedUrls_[path]) != null) {
      (path === "release" || path === "releases") && (tempStr += "#" + CONST_.VerCode_.replace(<RegExpG> /\D/g, ""))
      tempStr = path = !tempStr || tempStr[0] === "/" || tempStr[0] === "#"
        ? CONST_.HomePage_ + (tempStr.includes(".") ? "/blob/master" + tempStr : tempStr)
        : tempStr;
    } else if (path === "newtab") {
      return newTabUrl_f
    } else if (path[0] === "/" || KnownPages_.indexOf(path) >= 0) {
      path += ".html";
    } else if (vimiumUrlWork === Urls.WorkType.ActIfNoSideEffects  || vimiumUrlWork === Urls.WorkType.ConvertKnown) {
      return "vimium://" + fullPath.trim();
    } else {
      path = "show.html#!url vimium://" + path;
    }
  }
  if (!partly && (!tempStr || !tempStr.includes("://"))) {
    path = location.origin + (path[0] === "/" ? "" : "/pages/") + path;
  }
  subPath && (path += subPath);
  return path + (query && (path.includes("#") ? " " : "#!") + query);
}

export const createSearchUrl_ = function (query: string[], keyword: string, vimiumUrlWork: Urls.WorkType): Urls.Url {
  let url: string, pattern: Search.Engine | undefined = searchEngines_.map.get(keyword || query[0])
  if (pattern) {
    if (!keyword) { keyword = query.shift()!; }
    url = createSearch_(query, pattern.url_, pattern.blank_);
  } else {
    url = query.join(" ");
  }
  if (keyword !== "~") {
    return convertToUrl_(url, null, vimiumUrlWork);
  }
  lastUrlType_ = Urls.Type.Search;
  return url;
} as {
  (query: string[], keyword: "~", vimiumUrlWork?: Urls.WorkType): string;
  (query: string[], keyword: string | null | undefined, vimiumUrlWork: Urls.WorkAllowEval): Urls.Url
  (query: string[], keyword?: string | null, vimiumUrlWork?: Urls.WorkEnsureString): string
  (query: string[], keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url
}

export const createSearch_ = function (query: string[], url: string, blank: string, indexes?: number[]
    ): string | Search.Result {
  let q2: string[] | undefined, delta = 0;
  url = query.length === 0 && blank ? blank : url.replace(searchWordRe_
      , (full, s1: string | undefined, s2: string | undefined, ind): string => {
    let arr: string[];
    if (full.endsWith("$")) { return "$" }
    if (!s1) {
      if ((<RegExpOne> /^s:/i).test(s2!)) { s1 = s2![0]; s2 = s2?.slice(2) }
      else { s1 = "s" }
    }
    if (s1 === "S") {
      arr = query;
      s1 = " ";
    } else {
      arr = (q2 || (q2 = query.map(encodeAsciiComponent_)));
      s1 = isJSUrl_(url) ? "%20" : "+";
    }
    if (arr.length === 0) { return ""; }
    if (s2 && s2.includes("$")) {
      s2 = s2.replace(searchVariableRe_, function (_t: string, s3: string): string {
        let i = parseInt(s3, 10);
        if (!i) {
          return arr.join(s1);
        } else if (i < 0) {
          i += arr.length + 1;
        } else if (s3[0] === "+") {
          return arr.slice(i - 1).join(s1);
        }
        return arr[i - 1] || "";
      });
    } else {
      s2 = arr.join(s2 != null ? s2 : s1);
    }
    if (indexes != null) {
      ind += delta;
      indexes.push(ind, ind + s2.length);
      delta += s2.length - full.length
    }
    return s2;
  });
  resetRe_();
  return indexes == null ? url : { url_: url, indexes_: indexes };
} as Search.Executor

export const reformatURL_ = (url: string): string => {
  let ind = url.indexOf(":"), ind2 = ind;
  if (ind <= 0) { return url; }
  if (customProtocolRe_.test(url.slice(0, ind + 1).toLowerCase())) {
    return url.slice(0, ind).toLowerCase() + url.slice(ind)
  }
  if (url.substr(ind, 3) === "://") {
    ind = url.indexOf("/", ind + 3);
    if (ind < 0) {
      ind = ind2;
      ind2 = -1;
    } else if (ind === 7 && url.slice(0, 4).toLowerCase() === "file") {
      // file:///*
      ind = url.charAt(9) === ":" ? 3 : url.substr(9, 3).toLowerCase() === "%3a" ? 5 : 0
      return "file:///" + (ind ? url[8].toUpperCase() + ":/" : "") + url.slice(ind + 8);
    }
    // may be file://*/
  }
  const origin = url.slice(0, ind), o2 = origin.toLowerCase();
  if (ind2 === -1) {
    if ((<RegExpOne> /^(file|ftp|https?|rt[ms]p|wss?)$/).test(origin)) {
      url += "/";
    }
  }
  return origin !== o2 ? o2 + url.slice(ind) : url;
}

const normalizeFileHost = (host: string) => {
  const host2 = DecodeURLPart_(host)
  return (<RegExpOne> /[^\w.$+-\x80-\ufffd]|\s/).test(host2) ? host.replace("%24", "$") : host2
}

const convertFromFilePath = (path: string): string => {
  path = path.replace(<RegExpG> /\\/g, "/");
  if (path.startsWith("//") && !path.startsWith("//./")) {
    path = path.slice(2)
    const host = path.split("/", 1)[0]
    if (host.includes("%")) { path = normalizeFileHost(host) + path.slice(host.length) }
    path.includes("/") || (path += "/")
  } else {
    if (path.startsWith("//")) { path = path.slice(4) }
    if (path[1] === ":") { path = path[0].toUpperCase() + ":/" + path.slice(3) }
    if (path[0] !== "/") { path = "/" + path }
  }
  if (!(<RegExpOne> /[%?#&\s]/).test(path)) { resetRe_(); return "file://" + path }
  let hash = ""
  if (path.indexOf("#")) {
    let arr = (<RegExpOne> /\.[A-Za-z\d]{1,4}(\?[^#]*)?#/).exec(path)
    if (arr) {
      hash = path.slice(arr.index + arr[0].length - 1)
      if (hash.includes("=") || !hash.includes("/") || hash.includes(":~:")) {
        hash = arr[1] ? arr[1] + hash : hash
      } else {
        hash = ""
      }
    } else if (arr = (<RegExpOne> /#(\w+=|:~:)/).exec(path)) {
      hash = path.slice(arr.index)
    }
    if (hash) {
      path = path.slice(0, -hash.length)
    }
  }
  path = "file://" + path.replace(<RegExpG & RegExpSearchable<0>> /[?#&\s]/g, encodeURIComponent) // not re-encode "%"
      + hash.replace(<RegExpG & RegExpSearchable<0>> /\s/g, encodeURIComponent)
  resetRe_()
  return path
}

export const decodeFileURL_ = (url: string): string => {
  if (Build.OS & (1 << kOS.win) && os_ === kOS.win && url.startsWith("file://")) {
    const slash = url.indexOf("/", 7)
    if (slash < 0 || slash === url.length - 1) { return slash < 0 ? url + "/" : url }
    const type = slash === 7 ? url.charAt(9) === ":" ? 3 : url.substr(9, 3).toLowerCase() === "%3a" ? 5 : 0 : 0
    url = type ? url[8].toUpperCase() + ":\\" + url.slice(type + 8) : url
    if (!type && slash > 7) {
      url = "\\\\" + normalizeFileHost(url.slice(7, slash)) + url.slice(slash)
    }
    let sep = (<RegExpOne> /[?#]/).exec(url), index = sep ? sep.index : 0
    let tail = index ? url.slice(index) : ""
    url = index ? url.slice(0, index) : url
    url = url.replace(<RegExpG> /\/+/g, "\\")
    url = index ? url + tail : url
  }
  return url
}
