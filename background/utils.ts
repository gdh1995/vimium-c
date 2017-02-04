/// <reference path="../types/bg.d.ts" />

const Utils = {
  fetchHttpContents (url: string, success: (this: TextXHR, event: Event & TypedEvent<"load">) => void,
      req?: XMLHttpRequest | null): TextXHR {
    req = req || (new XMLHttpRequest() as TextXHR);
    (req as TextXHR).open("GET", url, true);
    (req as TextXHR).responseType = "text";
    (req as TextXHR).onload = success;
    (req as TextXHR).send();
    return req as TextXHR;
  },
  /**
   * both b and a must extend SafeObject
   */
  extendIf<T extends object, K extends keyof T> (b: T, a: Readonly<Pick<T, K>>): T {
    for (let i in a) {
      (i in b) || (b[i] = a[i]);
    }
    return b;
  },
  _reToReset: <RegExpOne> /a?/,
  resetRe (): true {
    return this._reToReset.test("") as true;
  },
  escapeText (s: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /[&<]/g, escapeCallback = function(c: string): string {
      return c.charCodeAt(0) === 38 ? "&amp;" : "&lt;";
    };
    this.escapeText = function(s: string): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeText(s);
  },
  _chromePrefixes: { "chrome-extension": 1, "chrome-search": 1, __proto__: null as never } as SafeEnum,
  // url: only accept real tab's
  isRefusingIncognito (url: string): boolean {
    url = url.toLowerCase();
    if (url.startsWith('chrome://')) {
      return !url.startsWith("chrome://downloads");
    }
    return !url.startsWith(Settings.CONST.ChromeInnerNewTab) && url.startsWith('chrome');
  },
  _nonENTlds: ".\u4e2d\u56fd.\u516c\u53f8.\u7f51\u7edc.\u96c6\u56e2.\u4e2d\u570b.\u6211\u7231\u4f60.",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.an.ao.aq.ar.as.at.au.aw.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.eh.er.es.et.eu.fi.fj.fk.fm.fo.fr.ga.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tp.tr.tt.tv.tw.tz.ua.ug.uk.um.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.yu.za.zm.zw",
    ".biz.cat.com.dev.edu.gov.int.mil.mtn.net.new.org.pro.pub.ren.tel.top.win.xin.xxx.xyz",
    ".aero.arpa.asia.band.club.coop.date.gift.help.info.jobs.link.live.mobi.name.news.pics.post.site.tech.wang.wiki",
    ".click.local.onion.party.photo.press.rocks.space.today.trade.video",
    ".design.lawyer.market.museum.online.social.studio.travel"
    , ".science.website"
    , ".engineer.software"
  ] as ReadonlyArray<string>,
  domains: Object.create<CompletersNS.Domain>(null),
  _hostRe: <RegExpOne> /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+])(:\d{2,5})?$/,
  _ipRe: <RegExpOne> /^(?:\d{1,3}\.){3}\d{1,3}$/,
  _ipv6Re: <RegExpOne> /^\[[\da-f]{0,4}(?::[\da-f]{0,4}){1,5}(?:(?::[\da-f]{0,4}){1,2}|:\d{0,3}(?:\.\d{0,3}){3})]$/,
  lfRe: <RegExpG> /[\r\n]+/g,
  spacesRe: <RegExpG> /\s+/g,
  A0Re: <RegExpG> /\xa0/g,
  _nonENTldRe: <RegExpOne> /[^a-z]/,
  protocolRe: <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//,
  _nonENDoaminRe: <RegExpOne> /[^.\da-z\-]|^-/,
  _jsNotEscapeRe: <RegExpOne> /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  filePathRe: <RegExpOne> /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  lastUrlType: Urls.Type.Default,
  convertToUrl: function(this: any, string: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url {
    string = string.trim();
    if (string.charCodeAt(10) === 58 && string.substring(0, 11).toLowerCase() === "javascript:") {
      if (Settings.CONST.ChromeVersion < 46 && string.indexOf('%', 11) > 0
          && !this._jsNotEscapeRe.test(string)) {
        string = this.DecodeURLPart(string);
      }
      string = string.replace(this.A0Re, ' ');
      this.resetRe();
      this.lastUrlType = Urls.Type.Full;
      return string;
    }
    let type: Urls.Type | Urls.TempType | Urls.TldType = Urls.TempType.Unspecified
      , expected: Urls.Type = Urls.Type.Full
      , hasPath = false, index: number, index2: number, oldString: string
      , arr: [never, string | undefined, string | undefined, string, string | undefined] | null;
    oldString = string.replace(this.lfRe, '').replace(this.spacesRe, ' ');
    string = oldString.toLowerCase();
    if ((index = string.indexOf(' ')) > 0) {
      string = string.substring(0, index);
    }
    if ((index = string.indexOf(':')) === 0) { type = Urls.Type.Search; }
    else if (index === -1 || !this.protocolRe.test(string)) {
      if (index !== -1 && string.lastIndexOf('/', index) < 0) {
        type = this.checkSpecialSchemes(oldString, index, string.length % oldString.length);
      }
      expected = Urls.Type.NoSchema; index2 = 0;
      if (type === Urls.TempType.Unspecified && string.startsWith("//")) {
        string = string.substring(2);
        expected = Urls.Type.NoProtocolName; index2 = 2;
      }
      if (type !== Urls.TempType.Unspecified) {}
      else if ((index = string.indexOf('/')) <= 0) {
        if (index === 0 || string.length < oldString.length - index2) { type = Urls.Type.Search; }
      } else if (string.length >= oldString.length - index2 || string.charCodeAt(index + 1) > KnownKey.space) {
        hasPath = string.length > index + 1;
        string = string.substring(0, index);
      } else {
        type = Urls.Type.Search;
      }
    }
    else if (string.startsWith("vimium:")) {
      type = Urls.Type.PlainVimium;
      vimiumUrlWork = (vimiumUrlWork as number) | 0;
      if (vimiumUrlWork < -1 || !(string = oldString.substring(9))) {}
      else if (vimiumUrlWork === -1
          || !(oldString = this.evalVimiumUrl(string, vimiumUrlWork))) {
        oldString = this.formatVimiumUrl(string, false, vimiumUrlWork);
      } else if (typeof oldString !== "string") {
        type = Urls.Type.Functional;
      }
    }
    else if ((index2 = string.indexOf('/', index + 3)) === -1
        ? string.length < oldString.length : string.charCodeAt(index2 + 1) <= 32
    ) {
      type = Urls.Type.Search;
    }
    else if (this._nonENTldRe.test(string.substring(0, index))) {
      type = (index = string.charCodeAt(index + 3)) > 32 && index !== 47 ? Urls.Type.Full : Urls.Type.Search;
    }
    else if (string.startsWith("file:")) { type = Urls.Type.Full; }
    else if (string.startsWith("chrome:")) {
      type = string.length < oldString.length && string.indexOf('/', 9) === -1 ? Urls.Type.Search : Urls.Type.Full;
    } else {
      string = string.substring(index + 3, index2 !== -1 ? index2 : undefined);
    }

    if (type === Urls.TempType.Unspecified && string.indexOf("%") >= 0) {
      string = Utils.DecodeURLPart(string);
      if (string.indexOf('/') >= 0) { type = Urls.Type.Search; }
    }
    if (type === Urls.TempType.Unspecified && string.startsWith(".")) { string = string.substring(1); }
    if (type !== Urls.TempType.Unspecified) {
    } else if (!(arr = this._hostRe.exec(string) as any)) {
      type = Urls.Type.Search;
      if (string.length === oldString.length && this._ipv6Re.test(string = "[" + string + "]")) {
        oldString = string;
        type = Urls.Type.NoSchema;
      }
    } else if ((string = arr[3]).endsWith(']')) {
      type = this._ipv6Re.test(string) ? expected : Urls.Type.Search;
    } else if (string.endsWith("localhost")) {
      type = expected;
    } else if ((index = string.lastIndexOf('.')) < 0) {
      string === "__proto__" && (string = ".__proto__");
      type = expected !== Urls.Type.NoSchema || arr[4] && hasPath ||
        (string in this.domains) ? expected : Urls.Type.Search;
    } else if (this._ipRe.test(string)) {
      type = expected;
    } else if ((type = this.isTld(string.substring(index + 1))) === Urls.TldType.NotTld) {
      type = (string in this.domains) ? expected : Urls.Type.Search;
    } else if (string.length !== index + 3 && type === Urls.TldType.ENTld && this._nonENDoaminRe.test(string)) {
      // `non-english.non-ccTld` AND NOT `non-english.non-english-tld`
      type = Urls.Type.Search;
    } else if (expected !== Urls.Type.NoSchema || hasPath) {
      type = expected;
    } else if (arr[2] || arr[4] || !arr[1] || string.startsWith("ftp")) {
      type = Urls.Type.NoSchema;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0
        || (index2 = string.indexOf(".")) === index) {
      type = Urls.Type.Search;
    } else if (string.indexOf(".", ++index2) !== index) {
      type = Urls.Type.NoSchema;
    } else if (string.length === index + 3 && type === Urls.TldType.ENTld) { // treat as a ccTLD
      string = string.substring(index2, index);
      type = string.length < this._tlds.length &&
          this._tlds[string.length].indexOf(string) > 0 ? Urls.Type.Search : Urls.Type.NoSchema;
    } else {
      type = Urls.Type.NoSchema;
    }
    this.resetRe();
    this.lastUrlType = type as Urls.Type;
    return type === Urls.Type.Full ? oldString
      : type === Urls.Type.Search ? this.createSearchUrl(oldString.split(' '), keyword || "~"
        , vimiumUrlWork === 1 ? 0 : vimiumUrlWork)
      : type === Urls.Type.NoSchema ? ("http://" + oldString)
      : type === Urls.Type.NoProtocolName ? ("http:" + oldString)
      : oldString;
  } as Urls.Converter,
  checkSpecialSchemes (string: string, i: number, spacePos: number): Urls.Type | Urls.TempType.Unspecified {
    const isSlash = string[i + 1] === "/";
    switch (string.substring(0, i)) {
    case "about":
      return isSlash ? Urls.Type.Search : spacePos > 0 || string.indexOf('@', i) > 0
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "blob": case "view-source":
      string = string.substring(i + 1);
      if (string.startsWith("blob:") || string.startsWith("view-source:")) { return Urls.Type.Search; }
      this.convertToUrl(string, null, -2);
      return this.lastUrlType <= Urls.Type.NoProtocolName ? Urls.Type.Full : Urls.Type.Search;
    case "data":
      return isSlash ? Urls.Type.Search : (i = string.indexOf(',', i)) < 0 || (spacePos > 0 && spacePos < i)
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "file": return Urls.Type.Full;
    case "filesystem":
      string = string.substring(i + 1);
      if (!this.protocolRe.test(string)) { return Urls.Type.Search; }
      this.convertToUrl(string, null, -2);
      return this.lastUrlType === 0 && (<RegExpOne>/[^/]\/(?:persistent|temporary)(?:\/|$)/).test(string)
        ? Urls.Type.Full : Urls.Type.Search;
    case "magnet": return string[i + 1] !== '?' ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "mailto": return isSlash ? Urls.Type.Search
      : (i = string.indexOf('/', i)) > 0 && string.lastIndexOf('?', i) < 0
      ? Urls.TempType.Unspecified : Urls.Type.Full;
    default: return isSlash ? Urls.Type.Search : Urls.TempType.Unspecified;
    }
  },
  removeComposedScheme (url: string): string {
    var i = url.startsWith("filesystem:") ? 11 : url.startsWith("view-source:") ? 12 : 0;
    return i ? url.substring(i) : url;
  },
  isTld (tld: string): Urls.TldType {
    return this._nonENTldRe.test(tld) ? (this._nonENTlds.indexOf("." + tld + ".") !== -1
        ? Urls.TldType.NonENTld : Urls.TldType.NotTld)
      : tld.length < this._tlds.length && this._tlds[tld.length].indexOf(tld) > 0 ? Urls.TldType.ENTld
      : Urls.TldType.NotTld;
  },
  _fileExtRe: <RegExpOne> /\.\w+$/,
  formatVimiumUrl (fullpath: string, partly: boolean, vimiumUrlWork: Urls.WorkType): string {
    let ind: number, query = "", tempStr: string | undefined, path = fullpath.trim();
    if (!path) { return partly ? "" : location.origin + "/pages/"; }
    ind = path.indexOf(" ");
    if (ind > 0) {
      query = path.substring(ind + 1).trim();
      path = path.substring(0, ind);
    }
    if (!(this._fileExtRe.test(path) || this._queryRe.test(path))) {
      path = path.toLowerCase();
      if (tempStr = Settings.CONST.RedirectedUrls[path]) {
        path = tempStr;
      } else if (Settings.CONST.KnownPages.indexOf(path) >= 0 || path.charCodeAt(0) === 47) {
        path += ".html";
      } else if (vimiumUrlWork === Urls.WorkType.ActIfNoSideEffects  || vimiumUrlWork === Urls.WorkType.ConvertKnown) {
        return "vimium://" + fullpath.trim();
      } else {
        path = "show.html#!url vimium://" + path;
      }
    }
    if (!partly && (!tempStr || tempStr.indexOf("://") < 0)) {
      path = location.origin + (path.charCodeAt(0) === 47 ? "" : "/pages/") + path;
    }
    return path + (query && (path.indexOf("#") > 0 ? " " : "#!") + query);
  },
  _nestedEvalCounter: 0,
  _vimiumCmdRe: <RegExpI> /^[a-z][\da-z\-]*(?:\.[a-z][\da-z\-]*)*$/i,
  evalVimiumUrl (path: string, workType?: Urls.WorkType): Urls.Url | null {
    let ind: number, cmd: string, arr: string[], obj: { url: string } | null, res: Urls.Url | string[];
    path = path.trim();
    workType |= 0;
    if (!path || workType < Urls.WorkType.ValidNormal || (ind = path.indexOf(" ")) <= 0 ||
        !this._vimiumCmdRe.test(cmd = path.substring(0, ind).toLowerCase()) ||
        cmd.endsWith(".html") || cmd.endsWith(".js") || cmd.endsWith(".css")) {
      return null;
    }
    path = path.substring(ind + 1).trimLeft();
    if (!path) { return null; }
    if (workType === Urls.WorkType.ActIfNoSideEffects) switch (cmd) {
    case "e": case "exec": case "eval": case "expr": case "calc": case "m": case "math":
      return this.require<any>("MathParser").catch(function() { return null;
      }).then(function(MathParser: any): Urls.MathEvalResult {
        let result = Utils.tryEvalMath(path, MathParser) || "";
        return [result, "math", path] as Urls.MathEvalResult;
      });
    }
    else if (workType === Urls.WorkType.ActAnyway) switch (cmd) {
    case "url-copy": case "search-copy": case "search.copy": case "copy-url":
      res = this.convertToUrl(path, null, Urls.WorkType.ActIfNoSideEffects);
      if (res instanceof Promise) {
        return res.then(function(arr): Urls.CopyEvalResult {
          let path = arr[0] || (arr[2] || "");
          path = path instanceof Array ? path.join(" ") : path;
          Clipboard.copy(path);
          return [path, "copy"] as Urls.CopyEvalResult;
        });
      } else {
        res = (this.lastUrlType === 5 && res instanceof Array ? (res as Urls.BaseEvalResult)[0] : res as string);
        path = res instanceof Array ? res.join(" ") : res;
      }
      // no break;
    case "c": case "cp": case "copy": // here `typeof path` must be `string`
      Clipboard.copy(path);
      return [path, "copy"] as Urls.CopyEvalResult;
    }
    switch (cmd) {
    case "p": case "parse": case "decode":
      cmd = path.split(' ', 1)[0];
      if (cmd.indexOf("/") < 0) {
        path = path.substring(cmd.length + 1).trimLeft();
      } else {
        cmd = "~";
      }
      arr = [path];
      path = this.convertToUrl(path);
      if (this.lastUrlType !== 4 && typeof path === "string") {
        if (obj = g_requestHandlers.parseSearchUrl({ url: path })) {
          arr = obj.url.split(" ");
          arr.unshift(cmd);
          break;
        }
      }
      path = arr[0];
      // no break;
    case "u": case "url": case "search":
      arr = path.split(this.spacesRe);
      break;
    case "newtab":
      return Settings.cache.newTabUrl_f;
    case "error":
      return [path, "ERROR"] as Urls.ErrorEvalResult;
    default:
      return null;
    }
    if (workType === 1) {
      return [arr, "search"] as Urls.SearchEvalResult;
    }
    ind = this._nestedEvalCounter++;
    if (ind > 12) { return null; }
    if (ind === 12) { return this.createSearchUrl(arr, "", 0); }
    if (ind > 0) { return this.createSearchUrl(arr, "", workType); }
    res = this.createSearchUrl(arr, "", workType);
    this._nestedEvalCounter = 0;
    return res;
  },
  tryEvalMath (expr: string, mathParser: any): string | null {
    let result: string | null = null;
    if ((mathParser = mathParser || window.MathParser || {}).evaluate) {
      try {
        result = "" + mathParser.evaluate(expr);
      } catch (e) {}
      mathParser.expression = "";
    }
    return result;
  },
  jsLoadingTimeout: 300,
  require<T extends object> (name: SettingsNS.DynamicFiles): Promise<T> {
    const p: Promise<T> | T | undefined = (window as any)[name];
    if (p) {
      return p instanceof Promise ? p : Promise.resolve(p);
    }
    return (window as any)[name] = new Promise<T>(function(resolve, reject) {
      const script = document.createElement("script");
      script.src = Settings.CONST[name];
      script.onerror = function(): void {
        reject("ImportError: " + name);
      };
      script.onload = function(): void {
        if ((window as any)[name] instanceof Promise) {
          reject("ImportError: " + name);
        } else {
          resolve((window as any)[name]);
        }
      };
      document.documentElement.appendChild(script).remove();
    });
  },
  searchWordRe: <RegExpG & RegExpSearchable<2>> /\$([sS])(?:\{([^}]*)})?/g,
  searchWordRe2: <RegExpG & RegExpSearchable<2>> /([^\\]|^)%([sS])/g,
  searchVariable: <RegExpG & RegExpSearchable<1>> /\$([+-]?\d+)/g,
  createSearchUrl: function (this: any, query: string[], keyword?: string | null
      , vimiumUrlWork?: Urls.WorkType): Urls.Url {
    let url: string, pattern: Search.Engine | undefined = Settings.cache.searchEngineMap[keyword || query[0]];
    if (pattern) {
      if (!keyword) { keyword = query.shift() as string; }
      url = this.createSearch(query, pattern.url) as string;
    } else {
      url = query.join(" ");
    }
    if (keyword !== "~") {
      return this.convertToUrl(url, null, vimiumUrlWork);
    }
    return url;
  } as {
    (query: string[], keyword: "~", vimiumUrlWork?: Urls.WorkType): string;
    (query: string[], keyword: string | null | undefined, vimiumUrlWork: Urls.WorkAllowEval): Urls.Url;
    (query: string[], keyword?: string | null, vimiumUrlWork?: Urls.WorkType): string;
  },
  createSearch: function(this: any, query: string[], url: string, indexes?: number[]): string | Search.Result {
    let q2: string[] | undefined, delta = 0;
    url = url.replace(this.searchWordRe, function(_s: string, s1: string | undefined, s2: string, ind: number): string {
      let arr: string[];
      if (s1 === "S") {
        arr = query;
        s1 = " ";
      } else {
        arr = (q2 || (q2 = query.map(encodeURIComponent)));
        s1 = "+";
      }
      if (arr.length === 0) { return ""; }
      if (s2 && s2.indexOf('$') !== -1) {
        s2 = s2.replace(Utils.searchVariable, function(_s: string, s3: string): string {
          var i = parseInt(s3, 10);
          if (i == 0) {
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
        delta += s2.length - _s.length;
      }
      return s2;
    });
    this.resetRe();
    return indexes == null ? url : {
      url: url,
      indexes: indexes
    };
  } as Search.Executor,
  DecodeURLPart (this: void, url: string | undefined): string {
    if (!url) { url = ""; }
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
    return url;
  },
  parseSearchEngines: function(str: string, map: Search.EngineMap): Search.Rule[] {
    let ids: string[], tmpRule: Search.TmpRule | null, tmpKey: Search.Rule[3],
    key: string, val: string, obj: Search.Engine,
    ind: number, rSlash = <RegExpOne> /[^\\]\//, rules = [] as Search.Rule[],
    rEscapeSpace = <RegExpG & RegExpSearchable<0>> /\\\s/g, rSpace = <RegExpOne> /\s/,
    rEscapeS = <RegExpG & RegExpSearchable<0>> /\\s/g, rColon = <RegExpG & RegExpSearchable<0>> /\\:/g,
    rPercent = <RegExpG & RegExpSearchable<0>> /\\%/g, rRe = <RegExpI> /\sre=/i,
    a = str.replace(<RegExpSearchable<0>> /\\\n/g, '').split('\n'),
    encodedSearchWordRe = <RegExpG & RegExpSearchable<1>> /%24([sS])/g, re = this.searchWordRe,
    func = function(key: string): any {
      return (key = key.trim()) && key !== "__proto__" && (map[key] = obj);
    };
    for (let _i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!(val.charCodeAt(0) > KnownKey.maxCommentHead)) { continue; } // mask: /[!"#]/
      ind = 0;
      do {
        ind = val.indexOf(":", ind + 1);
      } while (val.charCodeAt(ind - 1)  === 92);
      if (ind <= 0 || !(key = val.substring(0, ind).trimRight())) continue;
      ids = key.replace(rColon, ":").split('|');
      val = val.substring(ind + 1).trimLeft();
      if (!val) continue;
      key = val.replace(rEscapeSpace, "\\s");
      ind = key.search(rSpace);
      if (ind > 0) {
        str = val.substring(ind);
        val = key.substring(0, ind);
        ind = str.search(rRe);
      } else {
        val = key;
        str = "";
      }
      val = val.replace(rEscapeS, " ").trim().replace(this.searchWordRe2, "$1$$$2"
        ).replace(rPercent, "%");
      obj = {
        name: "",
        url: val
      };
      ids = ids.filter(func);
      if (ids.length === 0) continue;
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
          val = this.convertToUrl(val, null, -1);
          if (this.lastUrlType >= 3) {
            val = val.replace(encodedSearchWordRe, "$$$1");
            ind = val.search(re as RegExp as RegExpOne) + 1;
          } else if (this.lastUrlType > 0) {
            ind += this.lastUrlType === 1 ? 7 : 5;
          }
          if (tmpRule = this.reparseSearchUrl(val.toLowerCase(), ind)) {
            if (key.indexOf("$") >= 0) {
              key = key.replace(this.searchVariable, "(.*)");
              tmpKey = new RegExp("^" + key, this.alphaRe.test(key) ? "i" as "" : "") as RegExpI | RegExpOne;
            } else {
              tmpKey = key.trim() || " ";
            }
            rules.push([tmpRule[0], tmpRule[1], ids[0].trimRight(), tmpKey]);
          }
        }
      } else if (str.charCodeAt(ind + 4) === 47) {
        key = ind > 1 ? str.substring(1, ind).trim() : "";
        str = str.substring(ind + 5);
        ind = str.search(rSlash) + 1;
        val = str.substring(0, ind);
        str = str.substring(ind + 1);
        ind = str.search(rSpace);
        const tmpKey2 = this.makeRegexp(val, ind >= 0 ? str.substring(0, ind) : str);
        if (tmpKey2) {
          key = this.prepareReparsingPrefix(key);
          rules.push([key, tmpKey2, ids[0].trimRight(), obj.url.lastIndexOf("$S") >= 0 ? " " : "+"]);
        }
        str = ind >= 0 ? str.substring(ind + 1) : "";
      } else {
        str = str.substring(ind + 4);
      }
      str = str.trimLeft();
      (obj as any).name = str ? this.DecodeURLPart(str) : ids[ids.length - 1].trimLeft();
    }
    return rules;
  },
  escapeAllRe: <RegExpG & RegExpSearchable<0>> /[$()*+.?\[\\\]\^{|}]/g,
  _spaceOrPlusRe: <RegExpG> /\\\+|%20| /g,
  _queryRe: <RegExpOne> /[#?]/,
  alphaRe: <RegExpI> /[a-z]/i,
  reparseSearchUrl: function (url: string, ind: number): Search.TmpRule | null {
    var prefix, str, str2, ind2;
    if (!this.protocolRe.test(url)) { return null; }
    prefix = url.substring(0, ind - 1);
    if (ind = Math.max(prefix.lastIndexOf("?"), prefix.lastIndexOf("#")) + 1) {
      str2 = str = prefix.substring(ind);
      prefix = prefix.substring(0, prefix.search(this._queryRe));
      if (ind2 = str.lastIndexOf("&") + 1) {
        str2 = str.substring(ind2);
      }
      if (str2 && str2.indexOf("=") >= 1) {
        str = "[#&?]";
      } else {
        str2 = str;
        str = url[ind - 1] === "#" ? "#" : str2 ? "[#?]" : "\\?";
      }
      url = "([^#&?]*)";
    } else {
      str = "^([^#?]*)";
      if (str2 = url.substring(prefix.length + 2)) {
        if (ind = str2.search(this._queryRe) + 1) {
          str2 = str2.substring(0, ind - 1);
        }
      }
      url = "";
    }
    str2 = str2 && str2.replace(this.escapeAllRe, "\\$&"
      ).replace(this._spaceOrPlusRe, "(?:\\+|%20| )");
    prefix = this.prepareReparsingPrefix(prefix);
    return [prefix, new RegExp(str + str2 + url, this.alphaRe.test(str2) ? "i" as "" : "") as RegExpI | RegExpOne];
  },
  prepareReparsingPrefix (prefix: string): string {
    if (prefix.startsWith("http://") || prefix.startsWith("https://")) {
      prefix = prefix.substring(prefix[4] === 's' ? 8 : 7);
    } else if (prefix.startsWith("vimium://")) {
      prefix = this.formatVimiumUrl(prefix.substring(9), false, Urls.WorkType.ConvertKnown);
    }
    return prefix;
  },
  makeRegexp (pattern: string, suffix: string, logError?: boolean): RegExp | null {
    try {
      return new RegExp(pattern, suffix as "");
    } catch (e) {
      logError === false || console.log("%c/%s/%s%c %s", "color:#C41A16;"
        , pattern, suffix, "color:auto;", "is not a valid regexp.");
    }
    return null;
  },
  keyRe: <RegExpG & RegExpSearchable<0>> /<(?!<)(?:.-){0,3}..*?>|./g,
  makeCommand: function(command: string, options?: CommandsNS.Options | null, details?: CommandsNS.Description) : CommandsNS.Item {
    let opt: CommandsNS.Options | null;
    if (!details) { details = CommandsData.availableCommands[command] as CommandsNS.Description };
    opt = (details[3] as CommandsNS.Options | null) || null;
    if (options) {
      if (opt) {
        opt instanceof Object && Object.setPrototypeOf(opt, null);
        Utils.extendIf(options, opt);
      }
      if (options.count == null) {}
      else if (details[1] === 1 || (options.count |= 0) <= 0) {
        options.count = 1;
      }
    } else {
      options = opt;
    }
    return {
      alias: details[4] || null,
      background: details[2],
      command: command,
      options: options,
      repeat: details[1]
    };
  },
  getNull (this: void): null { return null; },
  hasUpperCase (this: void, s: string): boolean { return s.toLowerCase() !== s; }
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = (function(this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
});
String.prototype.endsWith || (String.prototype.endsWith = (function(this: string, s: string): boolean {
  var i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
}));
}
