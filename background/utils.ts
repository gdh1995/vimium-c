declare var OnOther: BrowserType;
if (Build.BTypes & ~BrowserType.Chrome && Build.BTypes & ~BrowserType.Firefox && Build.BTypes & ~BrowserType.Edge) {
  (window as Writable<Window>).OnOther = Build.BTypes & BrowserType.Chrome &&
    (typeof browser === "undefined" || (browser && (browser as typeof chrome).runtime) == null
    || location.protocol.lastIndexOf("chrome", 0) >= 0) // in case Chrome also supports `browser` in the future
  ? BrowserType.Chrome
  : Build.BTypes & BrowserType.Edge && !!(window as {} as {StyleMedia: unknown}).StyleMedia ? BrowserType.Edge
  : Build.BTypes & BrowserType.Firefox ? BrowserType.Firefox
  : /* an invalid state */ BrowserType.Unknown;
}
if (Build.BTypes & ~BrowserType.Chrome && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) {
  window.chrome = browser as typeof chrome;
}

var BgUtils_ = {
  /**
   * both b and a must extend SafeObject
   */
  extendIf_<T extends object, T2 extends object> (dest: T & Partial<T2>, a: T2): T & T2 {
    for (const i in a) {
      (i in dest) || ((dest as Partial<T2>)[i as keyof T2] = a[i as keyof T2]);
    }
    return dest as T & T2;
  },
  blank_ (this: void): void { /* empty */ },
  _reToReset: <RegExpOne> /a?/,
  resetRe_ (): true {
    return this._reToReset.test("") as true;
  },
  runtimeError_ (this: void): any { return chrome.runtime.lastError; },
  // start should in [0 .. length]; end should in [0 .. inf)
  unicodeSubstring_ (str: string, start: number, end: number): string {
    const charCode = end < str.length && end > start ? str.charCodeAt(end - 1) : 0;
    // Note: ZWJ is too hard to split correctly (https://en.wikipedia.org/wiki/Zero-width_joiner)
    // so just remove such a character (if any)
    // unicode surrogates: https://www.jianshu.com/p/7ae9005e0671
    end += charCode >= 0xD800 && charCode < 0xDC00 ? 1 : charCode === 0x200D && end > start + 1 ? -1 : 0;
    return str.slice(start, end);
  },
  unicodeLSubstring_ (str: string, start: number, end: number): string {
    const charCode = start > 0 && start < str.length ? str.charCodeAt(start) : 0;
    start += charCode >= 0xDC00 && charCode <= 0xDFFF ? -1
        : charCode === 0x200D && start < str.length - 1 && start < end - 1 ? 1 : 0;
    return str.slice(start, end);
  },
  escapeText_ (str: string): string {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === kCharCode.and ? "&amp;" : i === kCharCode.quote1 ? "&apos;"
        : i < kCharCode.quote1 ? "&quot;" : i === kCharCode.lt ? "&lt;" : "&gt;";
    }
    this.escapeText_ = function (s: string): string {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeText_(str);
  },
  isJSUrl_ (s: string): boolean {
    return s.charCodeAt(10) === kCharCode.colon && s.slice(0, 10).toLowerCase() === "javascript";
  },
  isRefusingIncognito_ (url: string): boolean {
    url = url.slice(0, 99).toLowerCase();
    // https://cs.chromium.org/chromium/src/url/url_constants.cc?type=cs&q=kAboutBlankWithHashPath&g=0&l=12
    return url.startsWith("about:") ? url !== "about:blank" && ((Build.BTypes & ~BrowserType.Chrome
          && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)) || url !== "about:blank/")
      : !(Build.BTypes & BrowserType.Chrome) ? url.startsWith(BrowserProtocol_)
      : url.startsWith("chrome:") ? !url.startsWith("chrome://downloads")
      : url.startsWith(BrowserProtocol_) && !url.startsWith(Settings_.CONST_.NtpNewTab_)
        || IsEdg_ && url.startsWith("edge");
  },
  _nonENTlds: ".\u4e2d\u4fe1.\u4e2d\u56fd.\u4e2d\u570b.\u4e2d\u6587\u7f51.\u4f01\u4e1a.\u4f5b\u5c71.\u4fe1\u606f\
.\u516c\u53f8.\u516c\u76ca.\u5546\u57ce.\u5546\u5e97.\u5546\u6807.\u5728\u7ebf.\u5a31\u4e50.\u5e7f\u4e1c\
.\u6211\u7231\u4f60.\u624b\u673a.\u62db\u8058.\u653f\u52a1.\u6e38\u620f.\u7f51\u5740.\u7f51\u5e97.\u7f51\u5e97\
.\u7f51\u7edc.\u8d2d\u7269.\u96c6\u56e2.\u9910\u5385.",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.ao.aq.ar.as.at.au.aw.ax.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz\
.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cw.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.er.es.et.eu.fi.fj.fk.fm.fo.fr\
.ga.gb.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo\
.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms\
.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.rs\
.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.st.su.sv.sx\
.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tr.tt.tv.tw.tz.ua.ug.uk.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.za.zm.zw",
    ".abc.art.bid.biz.cat.com.dev.edu.fit.fun.gov.ink.int.kim.law.lol.ltd.men.mil.moe.mom.mtn.net\
.new.one.org.pro.pub.red.ren.run.tel.top.vip.win.xin.xxx.xyz"
    , ".aero.arpa.asia.auto.band.beer.chat.city.club.cool.coop.date.fund.game.gift.gold.guru.help.info.jobs.life\
.link.live.loan.love.luxe.mobi.name.news.pics.plus.post.shop.show.site.sohu.team.tech.wang.wiki.work.yoga.zone"
    , ".citic.click.cloud.email.games.group.local.onion.party.photo.press.rocks.space.store.today.trade.video.world"
    , ".center.design.lawyer.market.museum.online.social.studio.travel"
    , ".company.fashion.science.website"
    , ".engineer.software"
  ] as ReadonlyArray<string>,
  safeObj_: (() => Object.create(null)) as { (): any; <T>(): SafeDict<T>; },
  safer_: (Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && Build.BTypes & BrowserType.Chrome
      && !Object.setPrototypeOf ? function <T extends object> (obj: T): T & SafeObject {
        (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as (<T extends object> (opt: T) => T & SafeObject),
  domains_: Object.create<CompletersNS.Domain>(null),
  hostRe_: <RegExpOne & RegExpSearchable<4>> /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+])(:\d{2,5})?$/,
  spacesRe_: <RegExpG> /\s+/g,
  A0Re_: <RegExpG> /\xa0/g,
  protocolRe_: <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//,
  quotedStringRe_: <RegExpOne> /^"[^"]*"$|^'[^']*'$|^\u201c[^\u201d]*\u201d$/,
  lastUrlType_: Urls.Type.Default,
  convertToUrl_: function (this: {}, str: string, keyword?: string | null, vimiumUrlWork?: Urls.WorkType): Urls.Url {
    const a = this as typeof BgUtils_;
    str = str.trim();
    a.lastUrlType_ = Urls.Type.Full;
    if (a.isJSUrl_(str)) {
      if (Build.MinCVer < BrowserVer.MinAutoDecodeJSURL && Build.BTypes & BrowserType.Chrome
          && CurCVer_ < BrowserVer.MinAutoDecodeJSURL
          && str.includes("%")
          && !(<RegExpOne> /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/).test(str)) {
        str = a.DecodeURLPart_(str);
      }
      str = str.replace(a.A0Re_, " ");
      a.resetRe_();
      return str;
    }
    let type: Urls.Type | Urls.TempType.Unspecified | Urls.TldType = Urls.TempType.Unspecified
      , expected: Urls.Type.Full | Urls.Type.NoProtocolName | Urls.Type.NoSchema = Urls.Type.Full
      , hasPath = false, index: number, index2: number, oldString: string
      , arr: [never, string | undefined, string | undefined, string, string | undefined] | null | undefined;
    // refer: https://cs.chromium.org/chromium/src/url/url_canon_etc.cc?type=cs&q=IsRemovableURLWhitespace&g=0&l=18
    // here's not its copy, but a more generalized strategy
    oldString = str.replace(<RegExpG> /[\n\r]+[\t \xa0]*/g, "").replace(a.A0Re_, " ");
    str = oldString[0] === '"' && oldString.endsWith('"') ? oldString.slice(1, -1) : oldString;
    if ((<RegExpOne> /^[A-Za-z]:(?:[\\/][^:*?"<>|]*)?$|^\/(?:Users|home|root)\/[^:*?"<>|]+$/).test(str)) {
      str[1] === ":" && (str = str[0].toUpperCase() + ":/"
          + str.slice(3).replace(<RegExpG> /\\/g, "/"));
      a.resetRe_();
      return "file://" + (str[0] === "/" ? str : "/" + str);
    }
    if (str.startsWith("\\\\") && str.length > 3) {
      str = str.slice(2).replace(<RegExpG> /\\/g, "/");
      str.lastIndexOf("/") <= 0 && (str += "/");
      a.resetRe_();
      return "file://" + str;
    }
    str = oldString.toLowerCase();
    if ((index = str.indexOf(" ") + 1 || str.indexOf("\t") + 1) > 1) {
      str = str.slice(0, index - 1);
    }
    if ((index = str.indexOf(":")) === 0) { type = Urls.Type.Search; }
    else if (index === -1 || !a.protocolRe_.test(str)) {
      if (index !== -1 && str.lastIndexOf("/", index) < 0) {
        type = a.checkSpecialSchemes_(oldString.toLowerCase(), index, str.length % oldString.length);
      }
      expected = Urls.Type.NoSchema; index2 = oldString.length;
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
      vimiumUrlWork = (vimiumUrlWork as number) | 0;
      if (vimiumUrlWork < Urls.WorkType.ConvertKnown || !(str = oldString.slice(9))) {
        oldString = "vimium://" + oldString.slice(9);
      }
      else if (vimiumUrlWork === Urls.WorkType.ConvertKnown
          || !(oldString = a.evalVimiumUrl_(str, vimiumUrlWork) as string)) {
        oldString = a.formatVimiumUrl_(str, false, vimiumUrlWork);
      } else if (typeof oldString !== "string") {
        type = Urls.Type.Functional;
      }
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
    } else {
      str = str.slice(index + 3, index2 >= 0 ? index2 : void 0);
    }

    // Note: here `string` should be just a host, and can only become a hostname.
    //       Otherwise `type` must not be `NoSchema | NoProtocolName`
    if (type === Urls.TempType.Unspecified && str.lastIndexOf("%") >= 0) {
      str = BgUtils_.DecodeURLPart_(str);
      if (str.includes("/")) { type = Urls.Type.Search; }
    }
    if (type === Urls.TempType.Unspecified && str.startsWith(".")) { str = str.slice(1); }
    if (type !== Urls.TempType.Unspecified) { /* empty */ }
    else if (!(arr = a.hostRe_.exec(str) as typeof arr)) {
      type = Urls.Type.Search;
      if (str.length === oldString.length && a.isIPHost_(str = `[${str}]`, 6)) {
        oldString = str;
        type = Urls.Type.NoSchema;
      }
    } else if ((str = arr[3]).endsWith("]")) {
      type = a.isIPHost_(str, 6) ? expected : Urls.Type.Search;
    } else if (str.endsWith("localhost") || a.isIPHost_(str, 4) || arr[4] && hasPath) {
      type = expected;
    } else if ((index = str.lastIndexOf(".")) < 0
        || (type = a.isTld_(str.slice(index + 1))) === Urls.TldType.NotTld) {
      index < 0 && str === "__proto__" && (str = "." + str);
      index2 = str.length - index - 1;
      // the new gTLDs allow long and notEnglish TLDs
      // https://en.wikipedia.org/wiki/Generic_top-level_domain#New_top-level_domains
      type = expected !== Urls.Type.NoSchema && (index < 0 || index2 >= 3 && index2 <= 5)
        || a.checkInDomain_(str, arr[4]) > 0 ? expected : Urls.Type.Search;
    } else if (str.length !== index + 3 && type === Urls.TldType.ENTld
        && (<RegExpOne> /[^.\da-z\-]|^-/).test(str)) {
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
      type = a.isTld_(str.slice(index2, index), true) ? Urls.Type.Search : Urls.Type.NoSchema;
    } else {
      type = Urls.Type.NoSchema;
    }
    a.resetRe_();
    a.lastUrlType_ = type;
    return type === Urls.Type.Full ? oldString
      : type === Urls.Type.Search ?
        a.createSearchUrl_(oldString.split(a.spacesRe_), keyword || "~", vimiumUrlWork)
      : type <= Urls.Type.MaxOfInputIsPlainUrl ?
        (a.checkInDomain_(str, arr && arr[4]) === 2 ? "https:" : "http:")
        + (type === Urls.Type.NoSchema ? "//" : "") + oldString
      : oldString;
  } as Urls.Converter,
  checkInDomain_ (host: string, port?: string | null): 0 | 1 | 2 {
    const domain = port && this.domains_[host + port] || this.domains_[host];
    return domain ? domain.https_ ? 2 : 1 : 0;
  },
  checkSpecialSchemes_ (str: string, i: number, spacePos: number): Urls.Type | Urls.TempType.Unspecified {
    const a = this;
    const isSlash = str.substr(i + 1, 1) === "/";
    switch (str.slice(0, i)) {
    case "about":
      return isSlash ? Urls.Type.Search : spacePos > 0 || str.includes("@", i)
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "blob": case "view-source":
      str = str.slice(i + 1);
      if (str.startsWith("blob:") || str.startsWith("view-source:")) { return Urls.Type.Search; }
      a.convertToUrl_(str, null, Urls.WorkType.KeepAll);
      return a.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? Urls.Type.Full : Urls.Type.Search;
    case "data":
      return isSlash ? Urls.Type.Search : (i = str.indexOf(",", i)) < 0 || (spacePos > 0 && spacePos < i)
        ? Urls.TempType.Unspecified : Urls.Type.Full;
    case "file": return Urls.Type.Full;
    case "filesystem":
      str = str.slice(i + 1);
      if (!a.protocolRe_.test(str)) { return Urls.Type.Search; }
      a.convertToUrl_(str, null, Urls.WorkType.KeepAll);
      return a.lastUrlType_ === Urls.Type.Full &&
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
    return i ? url.slice(i) : url;
  },
  detectLinkDeclaration_ (str: string): string {
    let i = str.indexOf("\uff1a") + 1 || str.indexOf(":") + 1;
    if (!i || str[i] === "/") { return str; }
    let s = str.slice(0, i - 1).trim().toLowerCase();
    if (s !== "link" && s !== "\u94fe\u63a5") { return str; }
    let url = str.slice(i).trim();
    url = url.split(" ", 1)[0];
    ",.;\u3002\uff0c\uff1b".includes(url.slice(-1)) && (url = url.slice(0, -1));
    url = this.convertToUrl_(url, null, Urls.WorkType.KeepAll);
    return BgUtils_.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl && !url.startsWith("vimium:") ? url : str;
  },
  isTld_ (tld: string, onlyEN?: boolean): Urls.TldType {
    return !onlyEN && (<RegExpOne> /[^a-z]/).test(tld) ? (this._nonENTlds.includes("." + tld + ".")
        ? Urls.TldType.NonENTld : Urls.TldType.NotTld)
      : tld.length < this._tlds.length && this._tlds[tld.length].includes(tld) ? Urls.TldType.ENTld
      : Urls.TldType.NotTld;
  },
  splitByPublicSuffix_ (host: string): [string[], /* partsNum */ 1 | 2 | 3] {
    const arr = host.toLowerCase().split("."), i = arr.length;
    return [arr, BgUtils_.isTld_(arr[i - 1]) === Urls.TldType.NotTld ? 1
      : i > 2 && arr[i - 1].length === 2 && BgUtils_.isTld_(arr[i - 2]) === Urls.TldType.ENTld ? 3 : 2];
  },
  /** type: 0=all */
  isIPHost_ (hostname: string, type: 0 | 4 | 6): boolean {
    if (type !== 6 && (<RegExpOne> /^\d{1,3}(?:\.\d{1,3}){3}$/).test(hostname)
        || type !== 4
            && (<RegExpOne> /^\[[\da-f]{0,4}(?::[\da-f]{0,4}){1,5}(?:(?::[\da-f]{0,4}){1,2}|:\d{0,3}(?:\.\d{0,3}){3})]$/
                ).test(hostname)) {
      return !!this.safeParseURL_("http://" + hostname);
    }
    return false;
  },
  safeParseURL_(url: string): URL | null { try { return new URL(url); } catch {} return null; },
  formatVimiumUrl_ (fullPath: string, partly: boolean, vimiumUrlWork: Urls.WorkType): string {
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
      if ((tempStr = (Settings_.CONST_.RedirectedUrls_ as SafeDict<string>)[path]) != null) {
        tempStr = path = !tempStr || tempStr[0] === "/" || tempStr[0] === "#"
          ? Settings_.CONST_.HomePage_ + (tempStr.includes(".") ? "/blob/master" + tempStr : tempStr)
          : tempStr;
      } else if (path === "newtab") {
        return Settings_.cache_.newTabUrl_f;
      } else if (path[0] === "/" || Settings_.CONST_.KnownPages_.indexOf(path) >= 0) {
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
  },
  _nestedEvalCounter: 0,
  evalVimiumUrl_: function (this: {}, path: string, workType?: Urls.WorkType
      , onlyOnce?: boolean): Urls.Url | null {
    const a = this as typeof BgUtils_;
    let ind: number, cmd: string, arr: string[], obj: { u: string } | null
      , res: Urls.Url | string[] | Promise<string | null> | null;
    workType = (workType as Urls.WorkType) | 0;
    if (path === "paste") {
      path += " .";
    }
    if (workType < Urls.WorkType.ValidNormal || !(cmd = path = path.trim()) || (ind = path.indexOf(" ")) <= 0
        || !(<RegExpI> /^[a-z][\da-z\-]*(?:\.[a-z][\da-z\-]*)*$/i).test(cmd = path.slice(0, ind).toLowerCase())
        || (<RegExpI> /\.(?:css|html|js)$/i).test(cmd)) {
      return null;
    }
    path = path.slice(ind + 1).trimLeft();
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
      return a.require_("MathParser").catch(() => null
      ).then<Urls.MathEvalResult>(function (MathParser): Urls.MathEvalResult {
        BgUtils_.quotedStringRe_.test(path) && (path = path.slice(1, -1));
        path = path.replace(/\uff0c/g as RegExpG, " ");
        let result = BgUtils_.tryEvalMath_(path, MathParser) || "";
        return [result, Urls.kEval.math, path];
      });
    case "error":
      return [path, Urls.kEval.ERROR];
    } }
    else if (workType >= Urls.WorkType.ActAnyway) { switch (cmd) {
    case "status": case "state":
      return [path.toLowerCase(), Urls.kEval.status] as Urls.StatusEvalResult;
    case "url-copy": case "search-copy": case "search.copy": case "copy-url":
      res = a.convertToUrl_(path, null, Urls.WorkType.ActIfNoSideEffects);
      if (res instanceof Promise) {
        return res.then(function (arr1): Urls.CopyEvalResult {
          let path2 = arr1[0] || (arr1[2] || "");
          path2 = path2 instanceof Array ? path2.join(" ") : path2;
          path2 = BgUtils_.copy_(path2);
          return [path2, Urls.kEval.copy];
        });
      } else {
        res = a.lastUrlType_ === Urls.Type.Functional &&
          res instanceof Array ? (res as Urls.BaseEvalResult)[0] : res as string;
        path = res instanceof Array ? res.join(" ") : res;
      }
      // no break;
    case "cp": case "copy": case "clip": // here `typeof path` must be `string`
      path = BgUtils_.copy_(path);
      return [path, Urls.kEval.copy];
    } }
    switch (cmd) {
    case "cd":
      arr = (path + "  ").split(" ");
      if (!arr[2]) {
        if (workType < Urls.WorkType.ActIfNoSideEffects) { return null; }
        return new Promise<Urls.BaseEvalResult>(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const err1 = !tabs || tabs.length < 1 ? "No current tab found" : 0,
            url = tabs[0].url,
            newPath = path.includes(" ") ? path + url : path + " . " + url,
            res1 = err1 || BgUtils_.evalVimiumUrl_("cd " + newPath, workType as Urls.WorkAllowEval, onlyOnce
                ) as string | Urls.BaseEvalResult | null;
            resolve(err1 || !res1 ? [err1 || "fail in parsing", Urls.kEval.ERROR]
                : typeof res1 === "string" ? [res1, Urls.kEval.plainUrl] : res1);
            return BgUtils_.runtimeError_();
          });
        });
      }
      cmd = arr[0];
      let startsWithSlash = cmd[0] === "/";
      ind = parseInt(cmd, 10);
      ind = !isNaN(ind) ? ind : cmd === "/" ? 1
          : startsWithSlash ? cmd.replace(<RegExpG> /(\.+)|./g, "$1").length + 1
          : -cmd.replace(<RegExpG> /\.(\.+)|./g, "$1").length || -1;
      let cdRes = Backend_.parse_({ u: arr[2], p: ind, t: null, f: 1, a: arr[1] !== "." ? arr[1] : "" });
      return cdRes && cdRes.u || [cdRes ? cdRes.e as string : "No upper path", Urls.kEval.ERROR];
    case "parse": case "decode":
      cmd = path.split(" ", 1)[0];
      if (cmd.search(<RegExpI> /\/|%2f/i) < 0) {
        path = path.slice(cmd.length + 1).trimLeft();
      } else {
        cmd = "~";
      }
      path = a.decodeEscapedURL_(path);
      arr = [path];
      path = a.convertToUrl_(path);
      if (a.lastUrlType_ !== Urls.Type.Search && (obj = Backend_.parse_({ u: path }))) {
        if (obj.u === "") {
          arr = [cmd];
        } else {
          arr = obj.u.split(" ");
          arr.unshift(cmd);
        }
      } else {
        arr = arr[0].split(a.spacesRe_);
      }
      break;
    case "u": case "url": case "search":
      // here path is not empty, and so `decodeEscapedURL(path).trim()` is also not empty
      arr = a.decodeEscapedURL_(path).split(a.spacesRe_);
      break;
    case "paste":
      if (workType > Urls.WorkType.ActIfNoSideEffects - 1) {
        res = BgUtils_.paste_(path.replace(<RegExpG> / (cp?|pc?|s)(?![a-zA-Z])/g, "\n$1"));
        return res instanceof Promise ? res.then<Urls.PasteEvalResult>(
            s => [s ? s.trim().replace(BgUtils_.spacesRe_, " ") : "", Urls.kEval.paste])
                  : [res ? res.trim().replace(BgUtils_.spacesRe_, " ") : "", Urls.kEval.paste];
      }
    default:
      return null;
    }
    if (onlyOnce) {
      return [arr, Urls.kEval.search];
    }
    ind = a._nestedEvalCounter++;
    if (ind > 12) { return null; }
    if (ind === 12) { return a.createSearchUrl_(arr, "", Urls.WorkType.Default); }
    if (ind > 0) { return a.createSearchUrl_(arr, "", workType); }
    res = a.createSearchUrl_(arr, "", workType);
    a._nestedEvalCounter = 0;
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
      mathParser.clean();
    }
    return result;
  },
  parseUpperLevel_ (str: string): number {
    let startsWithSlash = str[0] === "/", level: number | null = parseInt(str, 10);
    if (!isNaN(level)) { return level; }
    return startsWithSlash && str === "/" ? 1
        : str.split(<RegExpOne> (startsWithSlash ? /(\.+)/ : /\.(\.+)|./)).join(""
          ).length * (startsWithSlash ? 1 : -1);
  },
  copy_: (() => "") as (this: void, text: string | string[], join?: FgReq[kFgReq.copy]["j"], sed?: string) => string,
  paste_: (() => "") as (this: void, sed?: string) => string | Promise<string | null> | null,
  require_ <K extends SettingsNS.DynamicFiles> (name: K): Promise<NonNullable<Window[K]>> {
    type T = NonNullable<Window[K]>;
    type P = Promise<T>;
    const p: P | T | null | undefined = window[name] as P | Window[K] as P | T | null | undefined;
    if (p) {
      return Promise.resolve(p);
    }
    return (window as { -readonly [K2 in keyof Window]?: any })[name] = new Promise<T>(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = Settings_.CONST_[name];
      if (!Build.NDEBUG) {
        script.onerror = function (): void {
          this.remove();
          reject("ImportError: " + name);
        };
      }
      script.onload = function (): void {
        this.remove();
        if (!Build.NDEBUG && window[name] instanceof Promise) {
          reject("ImportError: " + name);
        } else {
          resolve(window[name] as Window[K] as T);
        }
      };
      (document.documentElement as HTMLHtmlElement).appendChild(script);
    });
  },
  searchWordRe_: <RegExpG & RegExpSearchable<2>> /\$([sS])(?:\{([^}]*)})?/g,
  searchVariable_: <RegExpG & RegExpSearchable<1>> /\$([+-]?\d+)/g,
  createSearchUrl_: function (this: {}, query: string[], keyword: string, vimiumUrlWork: Urls.WorkType): Urls.Url {
    const a = this as typeof BgUtils_;
    let url: string, pattern: Search.Engine | undefined = Settings_.cache_.searchEngineMap[keyword || query[0]];
    if (pattern) {
      if (!keyword) { keyword = query.shift() as string; }
      url = a.createSearch_(query, pattern.url_, pattern.blank_);
    } else {
      url = query.join(" ");
    }
    if (keyword !== "~") {
      return a.convertToUrl_(url, null, vimiumUrlWork);
    }
    a.lastUrlType_ = Urls.Type.Search;
    return url;
  } as Urls.Searcher,
  createSearch_: function (this: {}, query: string[], url: string, blank: string, indexes?: number[]
      ): string | Search.Result {
    const a = this as typeof BgUtils_;
    let q2: string[] | undefined, delta = 0;
    url = query.length === 0 && blank ? blank : url.replace(a.searchWordRe_,
    function (_s: string, s1: string | undefined, s2: string, ind: number): string {
      let arr: string[];
      if (s1 === "S") {
        arr = query;
        s1 = " ";
      } else {
        arr = (q2 || (q2 = query.map(encodeURIComponent)));
        s1 = BgUtils_.isJSUrl_(url) ? "%20" : "+";
      }
      if (arr.length === 0) { return ""; }
      if (s2 && s2.includes("$")) {
        s2 = s2.replace(BgUtils_.searchVariable_, function (_t: string, s3: string): string {
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
    a.resetRe_();
    return indexes == null ? url : { url_: url, indexes_: indexes };
  } as Search.Executor,
  DecodeURLPart_ (this: void, url: string | undefined, wholeURL?: 1): string {
    if (!url) { return ""; }
    try {
      url = (wholeURL ? decodeURI : decodeURIComponent)(url);
    } catch {}
    return url;
  },
  decodeEscapedURL_ (url: string): string {
    return !url.includes("://") && (<RegExpI> /%(?:3a|2f)/i).test(url) ? this.DecodeURLPart_(url).trim() : url;
  },
  fixCharsInUrl_ (url: string): string {
    let type = +url.includes("\u3002") + 2 * +url.includes("\uff1a");
    if (type === 0) { return url; }
    let i = url.indexOf("//");
    i = url.indexOf("/", i >= 0 ? i + 2 : 0);
    if (i >= 0 && i < 4) { return url; }
    let str = i > 0 ? url.slice(0, i) : url;
    if (type & 1) {
      str = str.replace(<RegExpG> /\u3002/g, ".");
    }
    if (type & 2) {
      str = str.replace("\uff1a", ":").replace("\uff1a", ":");
    }
    i > 0 && (str += url.slice(i));
    this.convertToUrl_(str, null, Urls.WorkType.KeepAll);
    return this.lastUrlType_ <= Urls.Type.MaxOfInputIsPlainUrl ? str : url;
  },
  showFileUrl_ (url: string): string {
    // SVG is not blocked by images CS
    return (<RegExpI & RegExpOne> /\.(?:bmp|gif|icon?|jpe?g|a?png|tiff?|webp)$/i).test(url)
      ? this.formatVimiumUrl_("show image " + url, false, Urls.WorkType.Default)
      : url;
  },
  reformatURL_ (url: string): string {
    let ind = url.indexOf(":"), ind2 = ind;
    if (ind <= 0) { return url; }
    if (url.substr(ind, 3) === "://") {
      ind = url.indexOf("/", ind + 3);
      if (ind < 0) {
        ind = ind2;
        ind2 = -1;
      } else if (ind === 7 && url.slice(0, 4).toLowerCase() === "file") {
        // file:///*
        ind = url.substr(9, 1) === ":" ? 3 : 0;
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
  },
  parseSearchEngines_ (str: string, map: Search.EngineMap): Search.Rule[] {
    const a = this;
    let ids: string[], tmpRule: Search.TmpRule | null, tmpKey: Search.Rule["delimiter_"],
    key: string, obj: Search.RawEngine,
    ind: number, rules = [] as Search.Rule[],
    rSpace = <RegExpOne> /\s/, re = a.searchWordRe_,
    func = (function (k: string): boolean {
      return (k = k.trim()) && k !== "__proto__" && k.length < Consts.MinInvalidLengthOfSearchKey
        ? (map[k] = obj, true) : false;
    });
    for (let val of str.replace(<RegExpSearchable<0>> /\\\\?\n/g, t => t.length === 3 ? "\\\n" : "").split("\n")) {
      val = val.trim();
      if (!(val && val.charCodeAt(0) > kCharCode.maxCommentHead)) { continue; } // mask: /[!"#]/
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
          val = a.convertToUrl_(val, null, Urls.WorkType.ConvertKnown);
          if (a.lastUrlType_ > Urls.Type.MaxOfInputIsPlainUrl) {
            val = val.replace(<RegExpG & RegExpSearchable<1>> /%24(s)/gi, "$$$1");
            ind = val.search(re as RegExp as RegExpOne) + 1;
          } else if (a.lastUrlType_ !== Urls.Type.Full) {
            ind += a.lastUrlType_ === Urls.Type.NoSchema ? 7 : 5;
          }
          if (tmpRule = a.reParseSearchUrl_(val.toLowerCase(), ind)) {
            if (key.includes("$")) {
              key = key.replace(a.searchVariable_, "(.*)");
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
        const tmpKey2 = a.makeRegexp_(val, ind >= 0 ? str.slice(0, ind) : str);
        if (tmpKey2) {
          key = a.prepareReParsingPrefix_(key);
          rules.push({prefix_: key, matcher_: tmpKey2, name_: ids[0].trimRight(),
             delimiter_: obj.url_.lastIndexOf("$S") >= 0 ? " " : "+"});
        }
        str = ind >= 0 ? str.slice(ind + 1) : "";
      } else {
        str = str.slice(ind + 4);
      }
      str = str.trimLeft();
      obj.name_ = str ? a.DecodeURLPart_(str) : ids[ids.length - 1].trimLeft();
    }
    return rules;
  },
  reParseSearchUrl_ (url: string, ind: number): Search.TmpRule | null {
    const a = this;
    if (ind < 1 || !a.protocolRe_.test(url)) { return null; }
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
      } else {
        str2 = str;
        str = url[ind - 1] === "#" ? "#" : str2 ? "[#?]" : "\\?";
      }
      url = "([^#&?]*)";
    } else {
      str = "^([^#?]*)";
      if (str2 = url.slice(prefix.length + 2)) {
        if (ind = str2.search(<RegExpOne> /[#?]/) + 1) {
          str2 = str2.slice(0, ind - 1);
        }
      }
      url = "";
    }
    str2 = str2 && str2.replace(<RegExpG & RegExpSearchable<0>> /[$()*+.?\[\\\]\^{|}]/g, "\\$&"
        ).replace(<RegExpG> /\\\+|%20| /g, "(?:\\+|%20| )");
    prefix = a.prepareReParsingPrefix_(prefix);
    return {
      prefix_: prefix,
      matcher_: new RegExp(str + str2 + url, (<RegExpI> /[a-z]/i).test(str2) ? "i" as "" : "") as RegExpI | RegExpOne
    };
  },
  IsURLHttp_ (this: void, url: string): ProtocolType {
    url = url.slice(0, 8).toLowerCase();
    return url.startsWith("http://") ? ProtocolType.http : url === "https://" ? ProtocolType.https
      : ProtocolType.others;
  },
  prepareReParsingPrefix_ (prefix: string): string {
    const head = prefix.slice(0, 9).toLowerCase();
    if (this.IsURLHttp_(head)) {
      prefix = prefix.slice(prefix.charCodeAt(4) === kCharCode.colon ? 7 : 8);
    } else if (head === "vimium://") {
      prefix = this.formatVimiumUrl_(prefix.slice(9), false, Urls.WorkType.ConvertKnown);
    }
    return prefix;
  },
  makeRegexp_ (pattern: string, suffix: string, logError?: 0): RegExp | null {
    try {
      return new RegExp(pattern, suffix as "");
    } catch {
      logError === 0 || console.log("%c/%s/%s", "color:#c41a16", pattern, suffix, "is not a valid regexp.");
    }
    return null;
  },
  keyRe_: <RegExpG & RegExpSearchable<0>> /<(?!<)(?:.-){0,4}.\w*?>|./g, /* need to support "<<left>" */
  onFormatKey_ (this: void, _0: string, modifiers: string, ch: string): string {
    const chLower = ch.toLowerCase();
    return ch !== chLower ? `<${modifiers}s-${chLower}>` : _0;
  },
  formatKeys_ (keys: string): string {
    return keys &&
        keys.replace(<RegExpG & RegExpSearchable<2>> /<(?!<)((?:[acm]-){0,3})([^a-z\d][\dA-Z]*)>/g, this.onFormatKey_);
  },
  getNull_ (this: void): null { return null; },
  timeout_ (timeout: number, callback: (this: void, fakeArgs?: TimerType.fake) => void): void {
    setTimeout(callback, timeout);
  },
  GC_: function (this: void): void { /* empty */ } as (this: void, inc?: number) => void,
  hasUpperCase_ (this: void, s: string): boolean { return s.toLowerCase() !== s; }
},
Backend_: BackendHandlersNS.BackendHandlers,
trans_ = chrome.i18n.getMessage,
CurCVer_: BrowserVer = Build.BTypes & BrowserType.Chrome ? 0 | (
  (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
  && navigator.appVersion.match(/\bChrom(?:e|ium)\/(\d+)/)
  || [0, BrowserVer.assumedVer])[1] as number : BrowserVer.assumedVer,
IsEdg_: boolean = Build.BTypes & BrowserType.Chrome
    && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
    ? (<RegExpOne> /\sEdg\//).test(navigator.appVersion) : false,
CurFFVer_: FirefoxBrowserVer = !(Build.BTypes & ~BrowserType.Firefox)
  || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox
  ? 0 | (navigator.userAgent.match(/\bFirefox\/(\d+)/) || [0, FirefoxBrowserVer.assumedVer])[1] as number
  : FirefoxBrowserVer.None,
BrowserProtocol_ = Build.BTypes & ~BrowserType.Chrome
    && (!(Build.BTypes & BrowserType.Chrome) || OnOther !== BrowserType.Chrome)
  ? Build.BTypes & BrowserType.Firefox
    && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) ? "moz"
  : Build.BTypes & BrowserType.Edge
    && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge) ? "ms-browser" : "about"
  : "chrome";

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinSafe$String$$StartsWith && !"".includes) {
(function (): void {
  const StringCls = String.prototype;
  /** startsWith may exist - {@see #BrowserVer.Min$String$$StartsWithEndsWithAndIncludes$ByDefault} */
  if (!"".startsWith) {
    StringCls.startsWith = function (this: string, s: string): boolean {
      return this.lastIndexOf(s, 0) === 0;
    };
    StringCls.endsWith = function (this: string, s: string): boolean {
      const i = this.length - s.length;
      return i >= 0 && this.indexOf(s, i) === i;
    };
  }
  StringCls.includes = function (this: string, s: string, pos?: number): boolean {
    return this.indexOf(s, pos) >= 0;
  };
})();
}
