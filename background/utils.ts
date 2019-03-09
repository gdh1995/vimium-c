var Utils = {
  fetchHttpContents_ (url: string, success: (this: TextXHR, event: Event & TypedEvent<"load">) => void): TextXHR {
    const req = new XMLHttpRequest() as TextXHR;
    req.open("GET", url, true);
    req.responseType = "text";
    req.onload = success;
    req.send();
    return req as TextXHR;
  },
  /**
   * both b and a must extend SafeObject
   */
  extendIf_<T extends object, K extends keyof T> (b: T, a: Readonly<Pick<T, K>>): T {
    for (const i in a) {
      (i in b) || ((b as any)[i as K] = a[i as K]);
    }
    return b;
  },
  blank_ (this: void): void { /* empty */ },
  _reToReset: <RegExpOne> /a?/,
  resetRe_ (): true {
    return this._reToReset.test("") as true;
  },
  runtimeError_ (this: void): any { return chrome.runtime.lastError; },
  unicodeSubstring_ (str: string, start: number, end: number): string {
    const charCode = end < str.length ? str.charCodeAt(end - 1) : 0;
    // Note: ZWJ is too hard to split correctly (https://en.wikipedia.org/wiki/Zero-width_joiner)
    // so just remove such a character (if any)
    // unicode surrogates: https://www.jianshu.com/p/7ae9005e0671
    end += charCode === 0x200D ? -1 : charCode >= 0xD800 && charCode < 0xDC00 ? 1 : 0;
    return str.substring(start, end);
  },
  unicodeLsubstring_ (str: string, start: number, end: number): string {
    const charCode = start > 0 ? str.charCodeAt(start) : 0;
    start += charCode === 0x200D ? 1 : charCode >= 0xDC00 && charCode <= 0xDFFF ? -1 : 0;
    return str.substring(start, end);
  },
  escapeText_ (str: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === KnownKey.and ? "&amp;" : i === KnownKey.quote1 ? "&apos;"
        : i < KnownKey.quote1 ? "&quot;" : i === KnownKey.lt ? "&lt;" : "&gt;";
    }
    this.escapeText_ = function (s: string): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeText_(str);
  },
  unescapeHTML_ (str: string): string {
    const escapedRe = <RegExpG & RegExpSearchable<1>> /\&(amp|gt|lt|nbsp);/g,
    map = Object.setPrototypeOf({ amp: "&", gt: ">", lt: "<", nbsp: " " }, null) as EnsuredSafeDict<string>,
    unescapeCallback = (_0: string, s: string) => map[s];
    this.unescapeHTML_ = s => s.replace(escapedRe, unescapeCallback);
    return this.unescapeHTML_(str);
  },
  isJSUrl_ (s: string): boolean {
    return s.charCodeAt(10) === KnownKey.colon && s.substring(0, 11).toLowerCase() === "javascript:";
  },
  isRefusingIncognito_ (url: string): boolean {
    url = url.toLowerCase();
    // https://cs.chromium.org/chromium/src/url/url_constants.cc?type=cs&q=kAboutBlankWithHashPath&g=0&l=12
    return url.startsWith("about:") ? url !== "about:blank" && url !== "about:blank/"
      : url.startsWith("chrome://") ? !url.startsWith("chrome://downloads")
      : !url.startsWith(Settings.CONST_.NtpNewTab_) && url.startsWith(BrowserProtocol_);
  },
  _nonENTlds: ".\u4e2d\u4fe1.\u4e2d\u56fd.\u4e2d\u570b.\u4e2d\u6587\u7f51.\u4f01\u4e1a.\u4f5b\u5c71.\u4fe1\u606f\
.\u516c\u53f8.\u516c\u76ca.\u5546\u57ce.\u5546\u5e97.\u5546\u6807.\u5728\u7ebf.\u5a31\u4e50.\u5e7f\u4e1c\
.\u6211\u7231\u4f60.\u624b\u673a.\u62db\u8058.\u653f\u52a1.\u6e38\u620f.\u7f51\u5740.\u7f51\u5e97.\u7f51\u5e97\
.\u7f51\u7edc.\u8d2d\u7269.\u96c6\u56e2.\u9910\u5385",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.ao.aq.ar.as.at.au.aw.ax.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz\
.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cw.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.er.es.et.eu.fi.fj.fk.fm.fo.fr\
.ga.gb.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo\
.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms\
.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.rs\
.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.st.su.sv.sx\
.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tr.tt.tv.tw.tz.ua.ug.uk.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.za.zm.zw",
    ".abc.art.bid.biz.cat.com.dev.edu.fun.gov.ink.int.kim.law.lol.ltd.men.mil.moe.mom.mtn.net\
.new.one.org.pro.pub.red.ren.run.tel.top.vip.win.xin.xxx.xyz"
    , ".aero.arpa.asia.auto.band.beer.chat.city.club.cool.coop.date.fund.game.gift.gold.guru.help.info.jobs.life\
.link.live.loan.love.mobi.name.news.pics.plus.post.shop.show.site.sohu.team.tech.wang.wiki.work.zone"
    , ".citic.click.email.games.group.local.onion.party.photo.press.rocks.space.store.today.trade.video.world"
    , ".center.design.lawyer.market.museum.online.social.studio.travel"
    , ".company.science.website"
    , ".engineer.software"
  ] as ReadonlyArray<string>,
  domains_: Object.create<CompletersNS.Domain>(null),
  hostRe_: <RegExpOne & RegExpSearchable<4>> /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+])(:\d{2,5})?$/,
  _ipv4Re: <RegExpOne> /^\d{1,3}(?:\.\d{1,3}){3}$/,
  _ipv6Re: <RegExpOne> /^\[[\da-f]{0,4}(?::[\da-f]{0,4}){1,5}(?:(?::[\da-f]{0,4}){1,2}|:\d{0,3}(?:\.\d{0,3}){3})]$/,
  _lfSpacesRe: <RegExpG> /[\r\n]+[\t \xa0]*/g,
  spacesRe_: <RegExpG> /\s+/g,
  A0Re_: <RegExpG> /\xa0/g,
  _nonENTldRe: <RegExpOne> /[^a-z]/,
  protocolRe_: <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//,
  _nonENDoaminRe: <RegExpOne> /[^.\da-z\-]|^-/,
  _jsNotEscapeRe: <RegExpOne> /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  quotedStringRe_: <RegExpOne> /^"[^"]*"$|^'[^']*'$|^\u201c[^\u201d]*\u201d$/,
  filePathRe_: <RegExpOne> /^[A-Za-z]:(?:[\\/][^:*?"<>|]*)?$|^\/(?:Users|home|root)\/[^:*?"<>|]+$/,
  _backSlashRe: <RegExpG> /\\/g,
  lastUrlType_: Urls.Type.Default,
  convertToUrl_: function (this: {}, str: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url {
    type UtilsTy = typeof Utils;
    str = str.trim();
    (this as UtilsTy).lastUrlType_ = Urls.Type.Full;
    if ((this as UtilsTy).isJSUrl_(str)) {
      if (Build.MinCVer < BrowserVer.MinAutoDecodeJSURL && ChromeVer < BrowserVer.MinAutoDecodeJSURL
          && str.indexOf("%", 11) > 0
          && !(this as UtilsTy)._jsNotEscapeRe.test(str)) {
        str = (this as UtilsTy).DecodeURLPart_(str);
      }
      str = str.replace((this as UtilsTy).A0Re_, " ");
      (this as UtilsTy).resetRe_();
      return str;
    }
    let type: Urls.Type | Urls.TempType.Unspecified | Urls.TldType = Urls.TempType.Unspecified
      , expected: Urls.Type.Full | Urls.Type.NoProtocolName | Urls.Type.NoSchema = Urls.Type.Full
      , hasPath = false, index: number, index2: number, oldString: string
      , arr: [never, string | undefined, string | undefined, string, string | undefined] | null | undefined;
    // refer: https://cs.chromium.org/chromium/src/url/url_canon_etc.cc?type=cs&q=IsRemovableURLWhitespace&g=0&l=18
    // here's not its copy, but a more generalized strategy
    oldString = str.replace((this as UtilsTy)._lfSpacesRe, "").replace((this as UtilsTy).A0Re_, " ");
    str = oldString[0] === '"' && oldString.endsWith('"') ? oldString.slice(1, -1) : oldString;
    if ((this as UtilsTy).filePathRe_.test(str)) {
      str[1] === ":" && (str = str[0].toUpperCase() + ":/"
          + str.substring(3).replace((this as UtilsTy)._backSlashRe, "/"));
      (this as UtilsTy).resetRe_();
      return "file://" + (str[0] === "/" ? str : "/" + str);
    }
    if (str.startsWith("\\\\") && str.length > 3) {
      str = str.substring(2).replace((this as UtilsTy)._backSlashRe, "/");
      str.lastIndexOf("/") <= 0 && (str += "/");
      (this as UtilsTy).resetRe_();
      return "file://" + str;
    }
    str = oldString.toLowerCase();
    if ((index = str.indexOf(" ") + 1 || str.indexOf("\t") + 1) > 1) {
      str = str.substring(0, index - 1);
    }
    if ((index = str.indexOf(":")) === 0) { type = Urls.Type.Search; }
    else if (index === -1 || !(this as UtilsTy).protocolRe_.test(str)) {
      if (index !== -1 && str.lastIndexOf("/", index) < 0) {
        type = (this as UtilsTy).checkSpecialSchemes_(oldString, index, str.length % oldString.length);
      }
      expected = Urls.Type.NoSchema; index2 = oldString.length;
      if (type === Urls.TempType.Unspecified && str.startsWith("//")) {
        str = str.substring(2);
        expected = Urls.Type.NoProtocolName;
        index2 -= 2;
      }
      if (type !== Urls.TempType.Unspecified) { /* empty */ }
      else if ((index = str.indexOf("/")) <= 0) {
        if (index === 0 || str.length < index2) { type = Urls.Type.Search; }
      } else if (str.length >= index2 || str.charCodeAt(index + 1) > KnownKey.space) {
        hasPath = str.length > index + 1;
        str = str.substring(0, index);
      } else {
        type = Urls.Type.Search;
      }
    }
    else if (str.startsWith("vimium:")) {
      type = Urls.Type.PlainVimium;
      vimiumUrlWork = (vimiumUrlWork as number) | 0;
      if (vimiumUrlWork < Urls.WorkType.ConvertKnown || !(str = oldString.substring(9))) {
        oldString = "vimium://" + oldString.substring(9);
      }
      else if (vimiumUrlWork === Urls.WorkType.ConvertKnown
          || !(oldString = (this as UtilsTy).evalVimiumUrl_(str, vimiumUrlWork) as string)) {
        oldString = (this as UtilsTy).formatVimiumUrl_(str, false, vimiumUrlWork);
      } else if (typeof oldString !== "string") {
        type = Urls.Type.Functional;
      }
    }
    else if ((index2 = str.indexOf("/", index + 3)) === -1
        ? str.length < oldString.length : str.charCodeAt(index2 + 1) < KnownKey.minNotSpace
    ) {
      type = Urls.Type.Search;
    }
    else if ((this as UtilsTy)._nonENTldRe.test(str.substring(0, index))) {
      type = (index = str.charCodeAt(index + 3)) > KnownKey.space
        && index !== KnownKey.slash ? Urls.Type.Full : Urls.Type.Search;
    }
    else if (str.startsWith("file:")) { type = Urls.Type.Full; }
    else if (str.startsWith("chrome:")) {
      type = str.length < oldString.length && str.indexOf("/", 9) === -1 ? Urls.Type.Search : Urls.Type.Full;
    } else {
      str = str.substring(index + 3, index2 !== -1 ? index2 : undefined);
    }

    // Note: here `string` should be just a host, and can only become a hostname.
    //       Otherwise `type` must not be `NoSchema | NoProtocolName`
    if (type === Urls.TempType.Unspecified && str.indexOf("%") >= 0) {
      str = Utils.DecodeURLPart_(str);
      if (str.indexOf("/") >= 0) { type = Urls.Type.Search; }
    }
    if (type === Urls.TempType.Unspecified && str.startsWith(".")) { str = str.substring(1); }
    if (type !== Urls.TempType.Unspecified) { /* empty */ }
    else if (!(arr = (this as UtilsTy).hostRe_.exec(str) as typeof arr)) {
      type = Urls.Type.Search;
      if (str.length === oldString.length && (this as UtilsTy).isIPHost_(str = "[" + str + "]", 6)) {
        oldString = str;
        type = Urls.Type.NoSchema;
      }
    } else if ((str = arr[3]).endsWith("]")) {
      type = (this as UtilsTy).isIPHost_(str, 6) ? expected : Urls.Type.Search;
    } else if (str.endsWith("localhost") || (this as UtilsTy).isIPHost_(str, 4) || arr[4] && hasPath) {
      type = expected;
    } else if ((index = str.lastIndexOf(".")) < 0
        || (type = (this as UtilsTy).isTld_(str.substring(index + 1))) === Urls.TldType.NotTld) {
      index < 0 && str === "__proto__" && (str = "." + str);
      index2 = str.length - index - 1;
      // the new gTLDs allow long and notEnglish TLDs
      // https://en.wikipedia.org/wiki/Generic_top-level_domain#New_top-level_domains
      type = expected !== Urls.Type.NoSchema && (index < 0 || index2 >= 3 && index2 <= 5)
        || (this as UtilsTy).checkInDomain_(str, arr[4]) > 0 ? expected : Urls.Type.Search;
    } else if (str.length !== index + 3 && type === Urls.TldType.ENTld
        && (this as UtilsTy)._nonENDoaminRe.test(str)) {
      // `notEnglish-domain.English-notCC-TLD`
      type = Urls.Type.Search;
    } else if (expected !== Urls.Type.NoSchema || hasPath) {
      type = expected;
    } else if (str.endsWith(".so") && str.startsWith("lib") && str.indexOf(".") === str.length - 3) {
      type = Urls.Type.Search;
    // the below check the username field
    } else if (arr[2] || arr[4] || !arr[1] || str.startsWith("ftp")) {
      type = Urls.Type.NoSchema;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (str.startsWith("mail") || str.indexOf(".mail") > 0
        || (index2 = str.indexOf(".")) === index) {
      type = Urls.Type.Search;
    } else if (str.indexOf(".", ++index2) !== index) {
      type = Urls.Type.NoSchema;
    } else if (str.length === index + 3 && type === Urls.TldType.ENTld) { // treat as a ccTLD
      type = (this as UtilsTy).isTld_(str.substring(index2, index), true) ? Urls.Type.Search : Urls.Type.NoSchema;
    } else {
      type = Urls.Type.NoSchema;
    }
    (this as UtilsTy).resetRe_();
    (this as UtilsTy).lastUrlType_ = type;
    return type === Urls.Type.Full ? oldString
      : type === Urls.Type.Search ?
        (this as UtilsTy).createSearchUrl_(oldString.split((this as UtilsTy).spacesRe_), keyword || "~", vimiumUrlWork)
      : type <= Urls.Type.MaxOfInputIsPlainUrl ?
        ((this as UtilsTy).checkInDomain_(str, arr && arr[4]) === 2 ? "https:" : "http:")
        + (type === Urls.Type.NoSchema ? "//" : "") + oldString
      : oldString;
  } as Urls.Converter,
  checkInDomain_ (host: string, port?: string | null): 0 | 1 | 2 {
    const domain = port && this.domains_[host + port] || this.domains_[host];
    return domain ? domain.https ? 2 : 1 : 0;
  },
  checkSpecialSchemes_ (str: string, i: number, spacePos: number): Urls.Type | Urls.TempType.Unspecified {
    const isSlash = str[i + 1] === "/";
    switch (str.substring(0, i)) {
    case "about":
      return isSlash ? Urls.Type.Search : spacePos > 0 || str.indexOf("@", i) > 0
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "blob": case "view-source":
      str = str.substring(i + 1);
      if (str.startsWith("blob:") || str.startsWith("view-source:")) { return Urls.Type.Search; }
      this.convertToUrl_(str, null, Urls.WorkType.KeepAll);
      return this.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? Urls.Type.Full : Urls.Type.Search;
    case "data":
      return isSlash ? Urls.Type.Search : (i = str.indexOf(",", i)) < 0 || (spacePos > 0 && spacePos < i)
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "file": return Urls.Type.Full;
    case "filesystem":
      str = str.substring(i + 1);
      if (!this.protocolRe_.test(str)) { return Urls.Type.Search; }
      this.convertToUrl_(str, null, Urls.WorkType.KeepAll);
      return this.lastUrlType_ === Urls.Type.Full &&
          (<RegExpOne> /[^/]\/(?:persistent|temporary)(?:\/|$)/).test(str)
        ? Urls.Type.Full : Urls.Type.Search;
    case "magnet": return str[i + 1] !== "?" ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "mailto": return isSlash ? Urls.Type.Search
      : (i = str.indexOf("/", i)) > 0 && str.lastIndexOf("?", i) < 0
      ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "tel": return (<RegExpOne> /\d/).test(str) ? Urls.Type.Full : Urls.Type.Search;
    default: return isSlash ? Urls.Type.Search : Urls.TempType.Unspecified;
    }
  },
  removeComposedScheme_ (url: string): string {
    const i = url.startsWith("filesystem:") ? 11 : url.startsWith("view-source:") ? 12 : 0;
    return i ? url.substring(i) : url;
  },
  detectLinkDeclaration_ (str: string): string {
    let i = str.indexOf("\uff1a") + 1 || str.indexOf(":") + 1;
    if (!i || str[i] === "/") { return str; }
    let s = str.substring(0, i - 1).trim().toLowerCase();
    if (s !== "link" && s !== "\u94fe\u63a5") { return str; }
    let url = str.substring(i).trim();
    (i = url.indexOf(" ")) > 0 && (url = url.substring(0, i));
    ",.;\u3002\uff0c\uff1b".indexOf(url[url.length - 1]) >= 0 && (url = url.slice(0, -1));
    url = this.convertToUrl_(url, null, Urls.WorkType.KeepAll);
    return Utils.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl && !url.startsWith("vimium:") ? url : str;
  },
  isTld_ (tld: string, onlyEN?: boolean): Urls.TldType {
    return !onlyEN && this._nonENTldRe.test(tld) ? (this._nonENTlds.indexOf("." + tld + ".") !== -1
        ? Urls.TldType.NonENTld : Urls.TldType.NotTld)
      : tld.length < this._tlds.length && this._tlds[tld.length].indexOf(tld) > 0 ? Urls.TldType.ENTld
      : Urls.TldType.NotTld;
  },
  splitByPublicSuffix_ (host: string): [string[], /* partsNum */ 1 | 2 | 3] {
    const arr = host.toLowerCase().split("."), i = arr.length;
    return [arr, Utils.isTld_(arr[i - 1]) === Urls.TldType.NotTld ? 1
      : i > 2 && arr[i - 1].length === 2 && Utils.isTld_(arr[i - 2]) === Urls.TldType.ENTld ? 3 : 2];
  },
  /** type: 0=all */
  isIPHost_ (hostname: string, type: 0 | 4 | 6): boolean {
     if (type !== 6 && this._ipv4Re.test(hostname) || type !== 4 && this._ipv6Re.test(hostname)) {
       return this.safeParseURL_("http://" + hostname) != null;
     }
     return false;
  },
  safeParseURL_(url: string): URL | null { try { return new URL(url); } catch {} return null; },
  commonFileExtRe_: <RegExpOne> /\.[0-9A-Za-z]+$/,
  formatVimiumUrl_ (fullpath: string, partly: boolean, vimiumUrlWork: Urls.WorkType): string {
    let ind: number, subPath = "", query = "", tempStr: string | undefined, path = fullpath.trim();
    if (!path) { return partly ? "" : location.origin + "/pages/"; }
    if (ind = path.indexOf(" ") + 1) {
      query = path.substring(ind).trim();
      path = path.substring(0, ind - 1);
    }
    if (ind = path.indexOf("/") + 1 || path.search(this._queryRe) + 1) {
      subPath = path.substring(ind - 1).trim();
      path = path.substring(0, ind - 1);
    }
    if (!this.commonFileExtRe_.test(path)) {
      path = path.toLowerCase();
      if ((tempStr = Settings.CONST_.RedirectedUrls_[path]) != null) {
        tempStr = path = !tempStr || tempStr[0] === "/" || tempStr[0] === "#" ? Settings.CONST_.HomePage_ + tempStr
          : tempStr;
      } else if (path === "newtab") {
        return Settings.cache_.newTabUrl_f;
      } else if (path[0] === "/" || Settings.CONST_.KnownPages_.indexOf(path) >= 0) {
        path += ".html";
      } else if (vimiumUrlWork === Urls.WorkType.ActIfNoSideEffects  || vimiumUrlWork === Urls.WorkType.ConvertKnown) {
        return "vimium://" + fullpath.trim();
      } else {
        path = "show.html#!url vimium://" + path;
      }
    }
    if (!partly && (!tempStr || tempStr.indexOf("://") < 0)) {
      path = location.origin + (path[0] === "/" ? "" : "/pages/") + path;
    }
    subPath && (path += subPath);
    return path + (query && (path.indexOf("#") > 0 ? " " : "#!") + query);
  },
  _nestedEvalCounter: 0,
  _vimiumCmdRe: <RegExpI> /^[a-z][\da-z\-]*(?:\.[a-z][\da-z\-]*)*$/i,
  _vimiumFileExtRe: <RegExpI> /\.(?:css|html|js)$/i,
  _mathSpaceRe: <RegExpG> /[\s+,\uff0c]+/g,
  evalVimiumUrl_: function (this: {}, path: string, workType?: Urls.WorkType
      , onlyOnce?: boolean): Urls.Url | null {
    type UtilsTy = typeof Utils;
    let ind: number, cmd: string, arr: string[], obj: { u: string } | null, res: Urls.Url | string[];
    workType = (workType as Urls.WorkType) | 0;
    if (workType < Urls.WorkType.ValidNormal || !(cmd = path = path.trim()) || (ind = path.indexOf(" ")) <= 0 ||
        !(this as UtilsTy)._vimiumCmdRe.test(cmd = path.substring(0, ind).toLowerCase()) ||
        (this as UtilsTy)._vimiumFileExtRe.test(cmd)) {
      return null;
    }
    path = path.substring(ind + 1).trimLeft();
    if (!path) { return null; }
    if (workType === Urls.WorkType.ActIfNoSideEffects) { switch (cmd) {
    case "sum": case "mul":
      path = path.replace((this as UtilsTy)._mathSpaceRe, cmd === "sum" ? " + " : " * ");
      cmd = "e"; break;
    case "avg": case "average":
      arr = path.split((this as UtilsTy)._mathSpaceRe);
      path = "(" + arr.join(" + ") + ") / " + arr.length;
      cmd = "e"; break;
    } }
    if (workType === Urls.WorkType.ActIfNoSideEffects) { switch (cmd) {
    case "e": case "exec": case "eval": case "expr": case "calc": case "m": case "math":
      return (this as UtilsTy).require_<object>("MathParser").catch(() => null
      ).then<Urls.MathEvalResult>(function (MathParser): Urls.MathEvalResult {
        Utils.quotedStringRe_.test(path) && (path = path.slice(1, -1));
        path = path.replace(/\uff0c/g as RegExpG, " ");
        let result = Utils.tryEvalMath_(path, MathParser) || "";
        return [result, "math", path];
      });
    case "error":
      return [path, "ERROR"];
    } }
    else if (workType === Urls.WorkType.ActAnyway) { switch (cmd) {
    case "status": case "state":
      return [path.toLowerCase(), "status"] as Urls.StatusEvalResult;
    case "url-copy": case "search-copy": case "search.copy": case "copy-url":
      res = (this as UtilsTy).convertToUrl_(path, null, Urls.WorkType.ActIfNoSideEffects);
      if (res instanceof Promise) {
        return res.then(function (arr1): Urls.CopyEvalResult {
          let path2 = arr1[0] || (arr1[2] || "");
          path2 = path2 instanceof Array ? path2.join(" ") : path2;
          Utils.copy_(path2);
          return [path2, "copy"];
        });
      } else {
        res = (this as UtilsTy).lastUrlType_ === Urls.Type.Functional &&
          res instanceof Array ? (res as Urls.BaseEvalResult)[0] : res as string;
        path = res instanceof Array ? res.join(" ") : res;
      }
      // no break;
    case "c": case "cp": case "copy": // here `typeof path` must be `string`
      Utils.copy_(path);
      return [path, "copy"];
    } }
    switch (cmd) {
    case "p": case "parse": case "decode":
      cmd = path.split(" ", 1)[0];
      if (cmd.indexOf("/") < 0 && cmd.toLowerCase().indexOf("%2f") < 0) {
        path = path.substring(cmd.length + 1).trimLeft();
      } else {
        cmd = "~";
      }
      path = (this as UtilsTy).decodeEscapedURL_(path);
      arr = [path];
      path = (this as UtilsTy).convertToUrl_(path);
      if ((this as UtilsTy).lastUrlType_ !== Urls.Type.Search && (obj = Backend.parse_({ u: path }))) {
        if (obj.u === "") {
          arr = [cmd];
        } else {
          arr = obj.u.split(" ");
          arr.unshift(cmd);
        }
      } else {
        arr = arr[0].split((this as UtilsTy).spacesRe_);
      }
      break;
    case "u": case "url": case "search":
      // here path is not empty, and so `decodeEscapedURL(path).trim()` is also not empty
      arr = (this as UtilsTy).decodeEscapedURL_(path).split((this as UtilsTy).spacesRe_);
      break;
    default:
      return null;
    }
    if (onlyOnce) {
      return [arr, "search"];
    }
    ind = (this as UtilsTy)._nestedEvalCounter++;
    if (ind > 12) { return null; }
    if (ind === 12) { return (this as UtilsTy).createSearchUrl_(arr, "", Urls.WorkType.Default); }
    if (ind > 0) { return (this as UtilsTy).createSearchUrl_(arr, "", workType); }
    res = (this as UtilsTy).createSearchUrl_(arr, "", workType);
    (this as UtilsTy)._nestedEvalCounter = 0;
    return <Urls.Url> res;
  } as Urls.Executor,
  tryEvalMath_ (expr: string, mathParser: any): string | null {
    let result: any = null;
    if ((mathParser = mathParser || window.MathParser || {}).evaluate) {
      try {
        result = mathParser.evaluate(expr);
        if (typeof result === "function") {
          result = null;
        } else {
          result = "" + result;
        }
      } catch {}
      mathParser.expression = "";
    }
    return result;
  },
  copy_ (this: void, _s: string): void | Promise<void> { /* empty */ },
  require_<T extends object> (name: SettingsNS.DynamicFiles): Promise<T> {
    const p: Promise<T> | T | null | undefined = window[name];
    if (p) {
      return Promise.resolve(p);
    }
    return (window as { -readonly [K in keyof Window]?: any })[name] = new Promise<T>(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = Settings.CONST_[name];
      script.onerror = function (): void {
        this.remove();
        reject("ImportError: " + name);
      };
      script.onload = function (): void {
        this.remove();
        if (window[name] instanceof Promise) {
          reject("ImportError: " + name);
        } else {
          resolve(window[name]);
        }
      };
      (document.documentElement as HTMLHtmlElement).appendChild(script);
    });
  },
  searchWordRe_: <RegExpG & RegExpSearchable<2>> /\$([sS])(?:\{([^}]*)})?/g,
  searchWordRe2_: <RegExpG & RegExpSearchable<2>> /([^\\]|^)%([sS])/g,
  searchVariable_: <RegExpG & RegExpSearchable<1>> /\$([+-]?\d+)/g,
  createSearchUrl_: function (this: {}, query: string[], keyword: string, vimiumUrlWork: Urls.WorkType): Urls.Url {
    type UtilsTy = typeof Utils;
    let url: string, pattern: Search.Engine | undefined = Settings.cache_.searchEngineMap[keyword || query[0]];
    if (pattern) {
      if (!keyword) { keyword = query.shift() as string; }
      url = (this as UtilsTy).createSearch_(query, pattern.url, pattern.blank);
    } else {
      url = query.join(" ");
    }
    if (keyword !== "~") {
      return (this as UtilsTy).convertToUrl_(url, null, vimiumUrlWork);
    }
    (this as UtilsTy).lastUrlType_ = Urls.Type.Search;
    return url;
  } as Urls.Searcher,
  createSearch_: function (this: {}, query: string[], url: string, blank: string, indexes?: number[]
      ): string | Search.Result {
    type UtilsTy = typeof Utils;
    let q2: string[] | undefined, delta = 0;
    url = query.length === 0 && blank ? blank : url.replace((this as UtilsTy).searchWordRe_,
    function (_s: string, s1: string | undefined, s2: string, ind: number): string {
      let arr: string[];
      if (s1 === "S") {
        arr = query;
        s1 = " ";
      } else {
        arr = (q2 || (q2 = query.map(encodeURIComponent)));
        s1 = "+";
      }
      if (arr.length === 0) { return ""; }
      if (s2 && s2.indexOf("$") !== -1) {
        s2 = s2.replace(Utils.searchVariable_, function (_t: string, s3: string): string {
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
        delta += s2.length - _s.length;
      }
      return s2;
    });
    (this as UtilsTy).resetRe_();
    return indexes == null ? url : { url, indexes };
  } as Search.Executor,
  DecodeURLPart_ (this: void, url: string | undefined, func?: (this: void, url: string) => string): string {
    if (!url) { return ""; }
    try {
      url = (func || decodeURIComponent)(url);
    } catch {}
    return url;
  },
  escapedColonOrSlashRe_: <RegExpOne> /%(?:3[aA]|2[fF])/,
  decodeEscapedURL_ (url: string): string {
    return url.indexOf("://") < 0 && this.escapedColonOrSlashRe_.test(url) ? this.DecodeURLPart_(url).trim() : url;
  },
  unicodeDotRe_: <RegExpG> /\u3002/g,
  fixCharsInUrl_ (url: string): string {
    let type = (url.indexOf("\u3002") < 0 ? 0 : 1) + (url.indexOf("\uff1a") < 0 ? 0 : 2);
    if (type === 0) { return url; }
    let i = url.indexOf("//");
    i = url.indexOf("/", i >= 0 ? i + 2 : 0);
    if (i >= 0 && i < 4) { return url; }
    let str = url.substring(0, i > 0 ? i : url.length);
    if (type & 1) {
      str = str.replace(this.unicodeDotRe_, ".");
    }
    if (type & 2) {
      str = str.replace("\uff1a", ":").replace("\uff1a", ":");
    }
    i > 0 && (str += url.substring(i));
    this.convertToUrl_(str, null, Urls.WorkType.KeepAll);
    return this.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? str : url;
  },
  imageFileRe_: <RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|png|tiff?|webp)$/i, // SVG is not blocked by images CS
  showFileUrl_ (url: string): string {
    return this.imageFileRe_.test(url) ? this.formatVimiumUrl_("show image " + url, false, Urls.WorkType.Default)
      : url;
  },
  reformatURL_ (url: string): string {
    let ind = url.indexOf(":");
    if (ind <= 0) { return url; }
    if (url.substring(ind, ind + 3) === "://") {
      ind = url.indexOf("/", ind + 3);
      if (ind < 0) { return url.toLowerCase() + "/"; }
      if (ind === 7 && url.substring(0, 4).toLowerCase() === "file") {
        // file:///*
        ind = url[9] === ":" ? 3 : 0;
        return "file:///" + (ind ? url[8].toUpperCase() + ":/" : "") + url.substring(ind + 8);
      }
      // may be file://*/
    }
    const origin = url.substring(0, ind), o2 = origin.toLowerCase();
    return origin !== o2 ? o2 + url.substring(ind) : url;
  },
  parseSearchEngines_ (str: string, map: Search.EngineMap): Search.Rule[] {
    let ids: string[], tmpRule: Search.TmpRule | null, tmpKey: Search.Rule["delimiter"],
    key: string, obj: Search.RawEngine,
    ind: number, rSlash = <RegExpOne> /[^\\]\//, rules = [] as Search.Rule[],
    rEscapeSpace = <RegExpG & RegExpSearchable<0>> /\\\s/g, rSpace = <RegExpOne> /\s/,
    rEscapeS = <RegExpG & RegExpSearchable<0>> /\\s/g, rColon = <RegExpG & RegExpSearchable<0>> /\\:/g,
    rPercent = <RegExpG & RegExpSearchable<0>> /\\%/g, rRe = <RegExpI> /\sre=/i,
    rBlank = <RegExpI & RegExpSearchable<0>> /\sblank=/i,
    encodedSearchWordRe = <RegExpG & RegExpSearchable<1>> /%24([sS])/g, re = this.searchWordRe_,
    func = (function (k: string): boolean {
      return (k = k.trim()) && k !== "__proto__" && k.length < Consts.MinInvalidLengthOfSearchKey
        ? (map[k] = obj, true) : false;
    });
    for (let val of str.replace(<RegExpG> /\\\n/g, "").split("\n")) {
      val = val.trim();
      if (!(val && val.charCodeAt(0) > KnownKey.maxCommentHead)) { continue; } // mask: /[!"#]/
      ind = 0;
      do {
        ind = val.indexOf(":", ind + 1);
      } while (val.charCodeAt(ind - 1) === KnownKey.backslash);
      if (ind <= 0 || !(key = val.substring(0, ind).trimRight())) { continue; }
      ids = key.replace(rColon, ":").split("|");
      val = val.substring(ind + 1).trimLeft();
      if (!val) { continue; }
      key = val.replace(rEscapeSpace, "\\s");
      ind = key.search(rSpace);
      let blank = "";
      if (ind > 0) {
        str = val.substring(ind);
        val = key.substring(0, ind);
        ind = str.search(rBlank);
        if (ind >= 0) {
          let ind2 = str.substring(ind + 7).search(rSpace);
          ind2 = ind2 > 0 ? ind + 7 + ind2 : 0;
          blank = str.substring(ind + 7, ind2 || str.length);
          str = str.substring(0, ind) + (ind2 ? str.substring(ind2) : "");
        }
        ind = str.search(rRe);
      } else {
        val = key;
        str = "";
      }
      val = val.replace(rEscapeS, " ").trim().replace(this.searchWordRe2_, "$1$$$2"
        ).replace(rPercent, "%");
      obj = {
        name: "",
        blank,
        url: val
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
          val = this.convertToUrl_(val, null, Urls.WorkType.ConvertKnown);
          if (this.lastUrlType_ > Urls.Type.MaxOfInputIsPlainUrl) {
            val = val.replace(encodedSearchWordRe, "$$$1");
            ind = val.search(re as RegExp as RegExpOne) + 1;
          } else if (this.lastUrlType_ !== Urls.Type.Full) {
            ind += this.lastUrlType_ === Urls.Type.NoSchema ? 7 : 5;
          }
          if (tmpRule = this.reparseSearchUrl_(val.toLowerCase(), ind)) {
            if (key.indexOf("$") >= 0) {
              key = key.replace(this.searchVariable_, "(.*)");
              tmpKey = new RegExp("^" + key, this.alphaRe_.test(key) ? "i" as "" : ""
                ) as RegExpI | RegExpOne;
            } else {
              tmpKey = key.trim() || " ";
            }
            rules.push({prefix: tmpRule.prefix, matcher: tmpRule.matcher, name: ids[0].trimRight(), delimiter: tmpKey});
          }
        }
      } else if (str.charCodeAt(ind + 4) === KnownKey.slash) {
        key = ind > 1 ? str.substring(1, ind).trim() : "";
        str = str.substring(ind + 5);
        ind = str.search(rSlash) + 1;
        val = str.substring(0, ind);
        str = str.substring(ind + 1);
        ind = str.search(rSpace);
        const tmpKey2 = this.makeRegexp_(val, ind >= 0 ? str.substring(0, ind) : str);
        if (tmpKey2) {
          key = this.prepareReparsingPrefix_(key);
          rules.push({prefix: key, matcher: tmpKey2, name: ids[0].trimRight(),
             delimiter: obj.url.lastIndexOf("$S") >= 0 ? " " : "+"});
        }
        str = ind >= 0 ? str.substring(ind + 1) : "";
      } else {
        str = str.substring(ind + 4);
      }
      str = str.trimLeft();
      obj.name = str ? this.DecodeURLPart_(str) : ids[ids.length - 1].trimLeft();
    }
    return rules;
  },
  escapeAllRe_: <RegExpG & RegExpSearchable<0>> /[$()*+.?\[\\\]\^{|}]/g,
  _spaceOrPlusRe: <RegExpG> /\\\+|%20| /g,
  _queryRe: <RegExpOne> /[#?]/,
  alphaRe_: <RegExpI> /[a-z]/i,
  reparseSearchUrl_ (url: string, ind: number): Search.TmpRule | null {
    if (!this.protocolRe_.test(url)) { return null; }
    let prefix: string, str: string, str2: string, ind2: number;
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
    str2 = str2 && str2.replace(this.escapeAllRe_, "\\$&").replace(this._spaceOrPlusRe, "(?:\\+|%20| )");
    prefix = this.prepareReparsingPrefix_(prefix);
    return {
      prefix,
      matcher: new RegExp(str + str2 + url, this.alphaRe_.test(str2) ? "i" as "" : "") as RegExpI | RegExpOne
    };
  },
  IsURLHttp_ (this: void, url: string): ProtocolType {
    url = url.substring(0, 8).toLowerCase();
    return url.startsWith("http://") ? ProtocolType.http : url === "https://" ? ProtocolType.https
      : ProtocolType.others;
  },
  prepareReparsingPrefix_ (prefix: string): string {
    const head = prefix.substring(0, 9).toLowerCase();
    if (this.IsURLHttp_(head)) {
      prefix = prefix.substring(prefix.charCodeAt(4) === KnownKey.colon ? 7 : 8);
    } else if (head === "vimium://") {
      prefix = this.formatVimiumUrl_(prefix.substring(9), false, Urls.WorkType.ConvertKnown);
    }
    return prefix;
  },
  makeRegexp_ (pattern: string, suffix: string, logError?: boolean): RegExp | null {
    try {
      return new RegExp(pattern, suffix as "");
    } catch {
      logError === false || console.log("%c/%s/%s", "color:#c41a16", pattern, suffix, "is not a valid regexp.");
    }
    return null;
  },
  keyRe_: <RegExpG & RegExpSearchable<0>> /<(?!<)(?:.-){0,3}.\w*?>|./g, /* need to support "<<left>" */
  makeCommand_: (function (command: string, options?: CommandsNS.RawOptions | null, details?: CommandsNS.Description
      ): CommandsNS.Item {
    let opt: CommandsNS.Options | null, help: CommandsNS.CustomHelpInfo | null = null;
    if (!details) { details = CommandsData_.availableCommands_[command] as CommandsNS.Description; }
    opt = details.length < 5 ? null : Object.setPrototypeOf(details[4] as NonNullable<CommandsNS.Description[4]>, null);
    if (options) {
      if ("count" in options) {
        options.count = details[1] === 1 ? 1 : (parseFloat(options.count) || 1) * (opt && opt.count || 1);
      }
      if (options.$desc || options.$key || options.$desp) {
        help = { key: options.$key || "", desc: options.$desc || options.$desp || "" };
        delete options.$key;
        delete options.$desc;
        delete options.$desp;
      }
      if (opt) {
        Utils.extendIf_(options, opt);
      }
    } else {
      options = opt;
    }
    return {
      alias: details[3] as kBgCmd & number,
      background: details[2] as 1,
      command,
      help,
      options,
      repeat: details[1]
    };
  }),
  getNull_ (this: void): null { return null; },
  GC_ (this: void): void { /* empty */ },
  hasUpperCase_ (this: void, s: string): boolean { return s.toLowerCase() !== s; }
};

declare var browser: unknown;
var OnOther = !(Build.BTypes & ~BrowserType.Chrome)
    || typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
    || location.protocol.lastIndexOf("chrome", 0) >= 0 // in case Chrome also supports `browser` in the future
  ? BrowserType.Chrome
  : Build.BTypes & BrowserType.Edge && (!(Build.BTypes & ~BrowserType.Edge)
      || !!(window as {} as {StyleMedia: unknown}).StyleMedia)
  ? BrowserType.Edge
  : Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || (<RegExpOne> /\bFirefox\//).test(navigator.userAgent))
  ? BrowserType.Firefox
  : BrowserType.Unknown,
ChromeVer = 0 | (Build.BTypes & BrowserType.Chrome
  && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
  && navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/)
  || [0, BrowserVer.assumedVer])[1] as number
;
const BrowserProtocol_ = Build.BTypes & ~BrowserType.Chrome
    && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
  ? Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) ? "moz"
  : Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? "ms-browser" : "about"
  : "chrome"
;

if (!"".startsWith) {
String.prototype.startsWith = function (this: string, s: string): boolean {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
"".endsWith || (String.prototype.endsWith = function (this: string, s: string): boolean {
  const i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
  window.chrome = browser as typeof chrome;
}
