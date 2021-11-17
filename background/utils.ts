import { CurCVer_, CurFFVer_, framesForTab_, OnChrome, OnEdge, OnFirefox } from "./store"

export const spacesRe_ = <RegExpG & RegExpSearchable<0>> /\s+/g
export const protocolRe_ = <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//

  /**
   * both b and a must extend SafeObject
   */
export const extendIf_ = <T extends object, T2 extends object> (dest: T & Partial<T2>, a: T2): T & T2 => {
    for (const i in a) {
      (i in dest) || ((dest as Partial<T2>)[i as keyof T2] = a[i as keyof T2]);
    }
    return dest as T & T2;
}

export const keys_ = ((map: ReadonlyMap<string, any> | Frames.FramesMap | ReadonlySet<string>): string[] | number[] => {
    let iter_i: IteratorResult<string>
    if (!OnChrome || Build.MinCVer >= BrowserVer.Min$Array$$From || CurCVer_ >= BrowserVer.Min$Array$$From) {
      return Array.from((map as IterableMap<string, any>).keys())
    } else if (Build.MinCVer >= BrowserVer.BuildMinForOf) {
      const arr: string[] = []
      for (const val of (map as IterableMap<string, any>).keys()) { arr.push(val) }
      return arr
    } else if (Build.MinCVer >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol
        || CurCVer_ >= BrowserVer.MinEnsuredES6$ForOf$Map$SetAnd$Symbol) {
      const arr: string[] = []
      for (const iterator = (map as IterableMap<string, any>).keys(); iter_i = iterator.next(), !iter_i.done; ) {
        arr.push(iter_i.value)
      }
      return arr
    } else {
      const keys = Object.keys((map as any as SimulatedMap).map_)
      return map !== framesForTab_ ? keys : keys.map(i => +i)
    }
}) as {
  (map: Frames.FramesMap): number[]
  (map: ReadonlyMap<string, any> | ReadonlySet<string>): string[]
}

const _reToReset = <RegExpOne> /a?/

export const resetRe_ = (): true => _reToReset.test("") as true

    // start should in [0 .. length]; end should in [0 .. inf)
export const unicodeRSubstring_ = (str: string, start: number, end: number): string => {
    const charCode = end < str.length && end > start ? str.charCodeAt(end - 1) : 0;
    // Note: ZWJ is too hard to split correctly (https://en.wikipedia.org/wiki/Zero-width_joiner)
    // so just remove such a character (if any)
    // unicode surrogates: https://www.jianshu.com/p/7ae9005e0671
    end += charCode >= 0xD800 && charCode < 0xDC00 ? 1 : charCode === 0x200D && end > start + 1 ? -1 : 0;
    return str.slice(start, end);
}

export const unicodeLSubstring_ = (str: string, start: number, end: number): string => {
    const charCode = start > 0 && start < str.length ? str.charCodeAt(start) : 0;
    start += charCode >= 0xDC00 && charCode <= 0xDFFF ? -1
        : charCode === 0x200D && start < str.length - 1 && start < end - 1 ? 1 : 0;
    return str.slice(start, end);
}

export let escapeText_ = (str: string): string => {
    const escapeRe = <RegExpG & RegExpSearchable<0>> /["&'<>]/g;
    function escapeCallback(c: string): string {
      const i = c.charCodeAt(0);
      return i === kCharCode.and ? "&amp;" : i === kCharCode.quote1 ? "&apos;"
        : i < kCharCode.quote1 ? "&quot;" : i === kCharCode.lt ? "&lt;" : "&gt;";
    }
    escapeText_ = (s: string): string => s.replace(escapeRe, escapeCallback)
    return escapeText_(str)
}

export const isJSUrl_ = (s: string): boolean => {
    return s.charCodeAt(10) === kCharCode.colon && s.slice(0, 10).toLowerCase() === "javascript";
}

const _nonENTlds = ".\u4e2d\u4fe1.\u4e2d\u56fd.\u4e2d\u570b.\u4e2d\u6587\u7f51.\u4f01\u4e1a.\u4f5b\u5c71.\u4fe1\u606f\
.\u516c\u53f8.\u516c\u76ca.\u5546\u57ce.\u5546\u5e97.\u5546\u6807.\u5728\u7ebf.\u5a31\u4e50.\u5e7f\u4e1c\
.\u6211\u7231\u4f60.\u624b\u673a.\u62db\u8058.\u653f\u52a1.\u6e38\u620f.\u7f51\u5740.\u7f51\u5e97.\u7f51\u5e97\
.\u7f51\u7edc.\u8d2d\u7269.\u96c6\u56e2.\u9910\u5385."

const _tlds = ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.ao.aq.ar.as.at.au.aw.ax.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz\
.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cw.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.er.es.et.eu.fi.fj.fk.fm.fo.fr\
.ga.gb.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo\
.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms\
.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.rs\
.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sx.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tr.tt.tv\
.tw.tz.ua.ug.uk.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.za.zm.zw",
    ".aaa.abb.abc.aco.ads.aeg.afl.aig.anz.aol.app.art.aws.axa.bar.bbc.bbt.bcg.bcn.bet.bid.bio.biz.bms.bmw.bnl.bom.boo\
.bot.box.buy.bzh.cab.cal.cam.car.cat.cba.cbn.cbs.ceb.ceo.cfa.cfd.com.cpa.crs.csc.dad.day.dds.dev.dhl.diy.dnp.dog.dot\
.dtv.dvr.eat.eco.edu.esq.eus.fan.fit.fly.foo.fox.frl.ftr.fun.fyi.gal.gap.gdn.gea.gle.gmo.gmx.goo.gop.got.gov\
.hbo.hiv.hkt.hot.how.ibm.ice.icu.ifm.inc.ing.ink.int.ist.itv.iwc.jcb.jcp.jio.jlc.jll.jmp.jnj.jot.joy.kfh.kia.kim.kpn\
.krd.lat\
.law.lds.llc.llp.lol.lpl.ltd.man.map.mba.med.men.mil.mit.mlb.mls.mma.moe.moi.mom.mov.msd.mtn.mtr.nab.nba.nec.net\
.new.nfl.ngo.nhk.now.nra.nrw.ntt.nyc.obi.off.one.ong.onl.ooo.org.ott.ovh.pay.pet.phd.pid.pin.pnc.pro.pru.pub.pwc\
.qvc.red.ren.ril.rio.rip.run.rwe.sap.sas.sbi.sbs.sca.scb.ses.sew.sex.sfr.ski.sky.soy.spa.srl.srt.stc.tab.tax.tci.tdk\
.tel.thd.tjx.top.trv.tui.tvs.ubs.uno.uol.ups.vet.vig.vin.vip.wed.win.wme.wow.wtc.wtf.xin.xxx.xyz.you.yun"
    , ".aero.arpa.asia.auto.band.beer.chat.city.club.cool.coop.date.fans.fund.game.gift.gold.guru.help.host.info.jobs\
.life.link.live.loan.love.luxe.mobi.name.news.pics.plus.shop.show.site.sohu.team.tech.wang.wiki.work.yoga.zone"
    , ".citic.cloud.email.games.group.local.onion.party.photo.press.rocks.space.store.today.trade.video.world"
    , ".center.design.lawyer.market.museum.online.social.studio.travel"
    , ".company.fashion.science.website"
    , ".engineer.software"
] as readonly string[]

export const safeObj_ = (() => Object.create(null)) as { (): SafeObject; <T>(): SafeDict<T> }

export const safer_ = (OnChrome && Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf
      && !Object.setPrototypeOf ? function <T extends object> (obj: T): T & SafeObject {
        (obj as any).__proto__ = null; return obj as T & SafeObject; }
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as (<T extends object> (opt: T) => T & SafeObject)

export const isTld_ = (tld: string, onlyEN?: boolean): Urls.TldType =>
    !onlyEN && (<RegExpOne> /[^a-z]/).test(tld) ? ((<RegExpOne> /^xn--[\x20-\x7f]+/).test(tld)
        || _nonENTlds.includes("." + tld + ".") ? Urls.TldType.NonENTld : Urls.TldType.NotTld)
      : tld && tld.length < _tlds.length && _tlds[tld.length].includes(tld) ? Urls.TldType.ENTld
      : Urls.TldType.NotTld;

export const splitByPublicSuffix_ = (host: string): [string[], /* partsNum */ 1 | 2 | 3] => {
  const arr = host.toLowerCase().split("."), i = arr.length
  return [arr, isTld_(arr[i - 1]) === Urls.TldType.NotTld ? 1
    : i > 2 && arr[i - 1].length === 2 && isTld_(arr[i - 2]) === Urls.TldType.ENTld ? 3 : 2]
}

/** type: 0=all */

export const isIPHost_ = (hostname: string, type: 0 | 4 | 6): boolean => {
    if (type !== 6 && (<RegExpOne> /^\d{1,3}(?:\.\d{1,3}){3}$/).test(hostname)
        || type !== 4
            && (<RegExpOne> /^\[[\da-f]{0,4}(?::[\da-f]{0,4}){1,5}(?:(?::[\da-f]{0,4}){1,2}|:\d{0,3}(?:\.\d{0,3}){3})]$/
                ).test(hostname)) {
      return !!safeParseURL_("http://" + hostname)
    }
    return false;
}

export const safeParseURL_ = (url: string): URL | null => { try { return new URL(url) } catch { return null } }

export const DecodeURLPart_ = (url: string | undefined, wholeURL?: 1 | "atob"): string => {
    if (!url) { return ""; }
    try {
      url = (wholeURL ? wholeURL === "atob" ? atob : decodeURI : decodeURIComponent)(url);
    } catch {}
    return url;
}

export const decodeUrlForCopy_ = (url: string, allowSpace?: boolean): string => {
    const ori = url.replace(<RegExpG> /%25/g, "%2525").replace(<RegExpG> /%(?![\da-zA-Z]{2})/g, "%25")
    let str = DecodeURLPart_(ori, 1)
    str = str.length !== ori.length ? str : url
    if (!allowSpace
        && (protocolRe_.test(str) || str.startsWith("data:") || str.startsWith("about:") || isJSUrl_(str))) {
      str = str.trim().replace(spacesRe_, encodeURIComponent)
    }
    return str
}

export const decodeEscapedURL_ = (url: string, allowSpace?: boolean): string => {
    url = !url.includes("://") && (<RegExpI> /%(?:2[36f]|3[adf])/i).test(url)
        ? DecodeURLPart_(url).trim() : url
    return decodeUrlForCopy_(url, allowSpace)
}

export const encodeAsciiURI_ = (url: string, encoded?: 1): string =>
    (encoded ? url : encodeURI(url)).replace(<RegExpG & RegExpSearchable<0>> /%(?:[CD].%..|E.%..%..)/g, (s): string => {
      const t = decodeURIComponent(s)
      const re = OnEdge
          || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          ? <RegExpOne> /[\u0391-\u03c9\u4e00-\u9fa5]/ // Greek letters / CJK
          : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
              || !(Build.BTypes & BrowserType.Chrome))
            && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
                || !(Build.BTypes & BrowserType.Firefox))
            && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
          ? <RegExpOne> /[\p{L}\p{N}]/u
          : <RegExpOne> new RegExp("[\\p{L}\\p{N}]", "u")
      return re.test(t) ? t : s
    })

export const encodeAsciiComponent_ = (url: string): string => url.replace(
      OnEdge
        || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      ? <RegExpG & RegExpSearchable<0>> /[\x00-`{-\u0390\u03ca-\u4dff\u9fa6-\uffff\s]+/g // Greek letters / CJK
      : (Build.MinCVer >= BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp || !(Build.BTypes & BrowserType.Chrome))
        && (Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
            || !(Build.BTypes & BrowserType.Firefox))
        && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
      ? <RegExpG & RegExpSearchable<0>> /[^\p{L}\p{N}]+/ug
      : <RegExpG & RegExpSearchable<0>> new RegExp("[^\\p{L}\\p{N}]+", "ug" as "g"),
      encodeURIComponent)

export const IsURLHttp_ = (url: string): ProtocolType => {
    url = url.slice(0, 8).toLowerCase();
    return url.startsWith("http://") ? ProtocolType.http : url === "https://" ? ProtocolType.https
      : ProtocolType.others;
}

export const normalizeClassesToMatch_ = (s: string): string[] =>
    s.trim() ? s.trim().split(<RegExpG> /[.\s]+/g).sort().filter(i => !!i) : []

export const normalizeElDesc_ = (e: FgReq[kFgReq.respondForRunKey]["e"]): CurrentEnvCache["element"] =>
    e && [e[0], e[1], normalizeClassesToMatch_(e[2])] || 0

export const makeRegexp_ = (pattern: string, suffix: string, logError?: 0): RegExp | null => {
    try {
      return new RegExp(pattern, suffix as "");
    } catch {
      logError === 0 || console.log("%c/%s/%s", "color:#c41a16", pattern, suffix, "is not a valid regexp.");
    }
    return null;
}

export const makePattern_ = typeof URLPattern === "undefined" || !URLPattern ? (): null => null
    : (pattern: string, logError?: 0): URLPattern | null => {
  if (!pattern.endsWith("*")) {
    const ind = pattern.indexOf("://")
    const ind2 = ind > 0 ? pattern.indexOf("/", ind + 3) : -1
    pattern += ind > 0 && (ind2 === pattern.length - 1 || ind2 < 0) ? (ind2 > 0 ? "" : "/") + "*\\?*#*" : ""
  }
  try {
    return new URLPattern!(pattern)
  } catch {
    logError === 0 || console.log("%c/%s/%s", "color:#c41a16", pattern, "is not a valid URLPattern.")
  }
  return null;
}

let _tmpResolve: ((arg?: any) => void) | null = null
const _exposeResolve = (newResolve: (arg: any) => void): void => { _tmpResolve = newResolve }
export const deferPromise_ = <T> (): { promise_: Promise<T>, resolve_ (result: T): unknown } => {
  const promise = new Promise<any>(/*#__NOINLINE__*/ _exposeResolve)
  const newResolve = _tmpResolve!
  _tmpResolve = null
  return {
    promise_: promise,
    resolve_: OnChrome && Build.MinCVer < BrowserVer.Min$resolve$Promise$MeansThen
        && CurCVer_ < BrowserVer.Min$resolve$Promise$MeansThen
      ? (i: T): void => { void Promise.resolve(i).then(newResolve) } : newResolve
  }
}

export const nextTick_ = !OnEdge
    && (!OnChrome || Build.MinCVer >= BrowserVer.Min$queueMicrotask || CurCVer_ > BrowserVer.Min$queueMicrotask - 1)
    && (!OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask
        || CurFFVer_ > FirefoxBrowserVer.Min$queueMicrotask - 1)
    ? (callback: () => void): void => { queueMicrotask(callback) }
    : (callback: () => void): void => { void Promise.resolve().then(callback) }

export const asyncIter_ = <T> (arr: T[], callback: (item: T) => number, doesContinue?: () => boolean | void): void => {
  const MAX_ITER_STEPS = 128, MIN_ASYNC_ITER = 50, ASYNC_INTERVAL = 150
  const iter = (): void => {
    if (doesContinue && doesContinue() === false) { end = 0 }
    for (let i = 0, j = 0; i < MAX_ITER_STEPS && j < MAX_ITER_STEPS * 4 && end > 0; ) {
      const cost = callback(arr[--end])
      if (cost > 0) { i++, j += cost }
      else if (cost < 0) { break }
    }
    if (end > 0) {
      arr.length = end
      setTimeout(iter, ASYNC_INTERVAL)
    }
  }
  let end = arr.length
  if (end >= MIN_ASYNC_ITER) {
    setTimeout(iter, 17)
  } else if (arr.length > 0) {
    iter()
  }
}

/** should only fetch files in the `[ROOT]/{front,i18n}` folder */
export const fetchFile_ = ((filePath: string): Promise<string | {}> => {
  if (!Build.NDEBUG && !filePath) { throw Error("unknown file: " + filePath) } // just for debugging
  const json = filePath.endsWith(".json")
  filePath = !filePath.includes("/") ? "/front/" + filePath : filePath
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinFetchExtensionFiles
      || CurCVer_ >= BrowserVer.MinFetchExtensionFiles) {
    return fetch(filePath).then(r => json ? r.json<Dict<string>>().then((res): Map<string, any> => {
      safer_(res)
      const map = new Map<string, any>()
      for (let key in res) { map.set(key, res[key]) }
      return map
    }) : r.text())
  }
  const req = new XMLHttpRequest() as TextXHR | JSONXHR
  req.open("GET", filePath, true)
  req.responseType = json ? "json" : "text"
  return new Promise<string | {}>((resolve): void => {
    req.onload = function (): void {
      const res = this.response as string | Dict<any>
      if (typeof res === "string") {
        resolve(res)
      } else {
        safer_(res)
        const map = new Map<string, any>()
        for (let key in res) { map.set(key, res[key]) }
        resolve(map)
      }
    }
    req.send()
  })
}) as {
  <T extends string> (file: T): Promise<T extends `${string}.json` ? Map<string, any> : string>
}

export const escapeAllForRe_ = (s: string): string =>
    s.replace(<RegExpG & RegExpSearchable<0>> /[$()*+.?\[\\\]\^{|}]/g, "\\$&")

let  _secret = "", _secretTimestamp = 0

export const getOmniSecret_ = (mayRefresh: boolean): string => {
  const now = Date.now() // safe for time changes
  if (now - _secretTimestamp > GlobalConsts.VomnibarSecretTimeout) {
    if (!mayRefresh) { return "" } // see https://github.com/philc/vimium/issues/3832
    const rnd_arr = new Uint8Array(GlobalConsts.VomnibarSecretLength / 2)
    crypto.getRandomValues(rnd_arr)
    _secret = (OnChrome && Build.MinCVer < BrowserVer.Min$TypedArray$reduce && !rnd_arr.reduce
        ? [].slice.call(rnd_arr) as never : rnd_arr).reduce((s, a) => s + (a < 16 ? "0" : "") + a.toString(16), "")
  }
  _secretTimestamp = now
  return _secret
}
