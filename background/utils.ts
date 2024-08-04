import {
  contentConfVer_, CurCVer_, CurFFVer_, framesForTab_, omniConfVer_, OnChrome, OnEdge, OnFirefox, set_contentConfVer_,
  set_omniConfVer_, os_
} from "./store"

export const spacesRe_ = <RegExpG & RegExpSearchable<0>> /\s+/g
export const protocolRe_ = <RegExpOne> /^[a-z][\+\-\.\da-z]+:\/\//

  /**
   * both b and a must extend SafeObject
   */
export const extendIf_ = <T extends object, T2 extends object> (dest: T & Partial<T2>, a: T2): T & T2 => {
    for (const i in a) {
      dest[i] !== void 0 || ((dest as Partial<T2>)[i as keyof T2] = a[i as keyof T2]);
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
    end += charCode >= 0xD800 && charCode < 0xDC00 || charCode === 0x200D && end > start + 1 ? -1 : 0
    return str.slice(start, end);
}

export const unicodeLSubstring_ = (str: string, start: number, end: number): string => {
    const charCode = start > 0 && start < str.length && start < end ? str.charCodeAt(start) : 0
    start += charCode >= 0xDC00 && charCode <= 0xDFFF
        || charCode === 0x200D && start < str.length - 1 && start < end - 1 ? 1 : 0
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
.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.qa.re.ro.rs\
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

export const safer_ = (OnChrome && Build.MinCVer < BrowserVer.Min$Object$$setPrototypeOf && !Object.setPrototypeOf
      ? <T extends object> (obj: T) => ("__proto__" in obj && ((obj as any).__proto__ = null), obj as T & SafeObject)
      : <T extends object> (opt: T): T & SafeObject => Object.setPrototypeOf(opt, null)
    ) as <T extends object> (opt: T) => T & SafeObject

export const isTld_ = (tld: string, onlyEN?: boolean, wholeHost?: string): Urls.TldType =>
    !onlyEN && (<RegExpOne> /[^a-z]/).test(tld) ? ((<RegExpOne> /^xn--[\x20-\x7f]+/).test(tld)
        || _nonENTlds.includes("." + tld + ".") ? Urls.TldType.NonENTld : Urls.TldType.NotTld)
      : tld.length === 2 && wholeHost && ("cc.cu.in.rs.sh".includes(tld) ? wholeHost.includes("_")
          : tld === "so" && wholeHost.startsWith("lib")) ? Urls.TldType.NotTld
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
    if (!url || wholeURL !== "atob" && !url.includes("%")) { return url || "" }
    try {
      url = (wholeURL ? wholeURL === "atob" ? atob : decodeURI : decodeURIComponent)(url);
    } catch {}
    return url;
}

export const decodeUrlForCopy_ = (url: string, __allowSpace?: boolean): string => {
    if (!url.includes("%")) { return url }
    if (!protocolRe_.test(url) && !(<RegExpI> /^(about|data|javascript|vimium)/i).test(url)) { return url }
    const ori = url.replace(<RegExpG> /%(2[356f]|3[adf]|40)/gi, "%25$1"
        ).replace(<RegExpG> /%(?![\da-fA-F]{2})/g, "%25")
    let str = DecodeURLPart_(ori, 1)
    str = str.length !== ori.length ? str : encodeAsciiURI_(url, 1)
    const noSpace = !__allowSpace && (protocolRe_.test(str) ? !str.startsWith("vimium:")
        : str.startsWith("data:") || str.startsWith("about:"))
    str = str.replace(noSpace ? spacesRe_ : <RegExpG & RegExpSearchable<0>> /[\r\n]+/g, encodeURIComponent)
  let ch = str && str.charAt(str.length - 1)
  if (ch && !(<RegExpI> /[a-z\d\ud800-\udfff]/i).test(ch)) {
    ch = ch < "\x7f" ? "%" + (ch.charCodeAt(0) + 256).toString(16).slice(1) : encodeAsciiComponent_(ch)
    ch.length > 1 && (str = str.slice(0, str.length - 1) + ch)
  }
  return str
}

export const decodeEscapedURL_ = (url: string, allowSpace?: boolean): string => {
    url = !url.includes("://") && (<RegExpI> /%(?:2[36f]|3[adf])/i).test(url)
        ? DecodeURLPart_(url).trim() : url
    return decodeUrlForCopy_(url, allowSpace)
}

export const encodeAsciiURI_ = (url: string, encoded?: 1): string =>
    (encoded ? url : encodeURI(url)).replace(<RegExpG & RegExpSearchable<0>>/(?:%[\da-f]{2})+/gi, (s): string => {
      const t = DecodeURLPart_(s)
      return t.length < s.length ? encodeAsciiComponent_(t) : s
    })

export const encodeAsciiComponent_ = (url: string): string => url.replace(
      OnEdge
        || OnChrome && Build.MinCVer < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          && CurCVer_ < BrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
        || OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
          && CurFFVer_ < FirefoxBrowserVer.MinEnsuredUnicodePropertyEscapesInRegExp
      ? <RegExpG & RegExpSearchable<0>> /[\x00-\u0390\u03ca-\u4dff\u9fa6-\uffff\s]+/g // Greek letters / CJK
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
    e && [e[0], e[1], normalizeClassesToMatch_(e[2] || "")] || 0

export const makeRegexp_ = (pattern: string, suffix: string, logError?: 0): RegExp | null => {
    try {
      return new RegExp(pattern, suffix as "");
    } catch {
      logError === 0 || console.log("%c/%s/%s", "color:#c41a16", pattern, suffix, "is not a valid regexp.");
    }
    return null;
}

export const makePattern_ = !(OnChrome && Build.MinCVer >= BrowserVer.MinEnsuredURLPattern)
    && (typeof URLPattern === "undefined" || !URLPattern) ? (): null => null
    : (pattern: string, logError?: 0): URLPattern | null => {
  if (!pattern.endsWith("*")) {
    const ind = pattern.indexOf("://")
    const ind2 = ind > 0 ? pattern.indexOf("/", ind + 3) : -1
    pattern += ind > 0 && (ind2 === pattern.length - 1 || ind2 < 0) ? (ind2 > 0 ? "" : "/") + "*\\?*#*" : ""
  }
  try {
    if (OnChrome && Build.MinCVer < BrowserVer.MinURLPatternWith$ignoreCase
        && CurCVer_ < BrowserVer.MinURLPatternWith$ignoreCase) {
      return new URLPattern!(pattern)
    }
    return new URLPattern!(pattern, "http://localhost", { ignoreCase: true })
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
    && (!OnFirefox || Build.MinFFVer >= FirefoxBrowserVer.Min$queueMicrotask || globalThis.queueMicrotask)
    ? (callback: () => void): void => { queueMicrotask(callback) }
    : (callback: () => void): void => { void Promise.resolve().then(callback) }

export const asyncIter_ = <T> (arr: T[], callback: (item: T) => number, doesContinue?: () => boolean | void): void => {
  const MAX_ITER_STEPS = 32, MIN_ASYNC_ITER = 10, ASYNC_INTERVAL = 150
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

/** should only fetch files in the `[ROOT]/{_locales,front,i18n}` folder */
export const fetchFile_ = ((filePath: string, format?: "blob" | "arraybuffer"): Promise<string | {}> => {
  if (!Build.NDEBUG && !filePath) { throw Error("unknown file: " + filePath) } // just for debugging
  const json = !format && filePath.endsWith(".json")
  filePath = !format && !filePath.includes("/") ? "/front/" + filePath : filePath
  if (!OnChrome || (format ? Build.MinCVer >= BrowserVer.MinFetchDataURL || CurCVer_ >= BrowserVer.MinFetchDataURL
      : Build.MinCVer >= BrowserVer.MinFetchExtensionFiles || CurCVer_ >= BrowserVer.MinFetchExtensionFiles)) {
    return fetch(filePath as `/${string}`).then(r =>
        json ? r.json<Dict<string>>().then((res): Map<string, any> => new Map<string, any>(Object.entries!(res)))
        : format ? format === "blob" ? r.blob() : r.arrayBuffer() : r.text())
  }
  const req = new XMLHttpRequest() as TextXHR | JSONXHR | BlobXHR | ArrayXHR
  req.open("GET", filePath, true)
  req.responseType = json ? "json" : format || "text"
  return new Promise<string | {}>((resolve, reject): void => {
    req.onload = function (): void {
      const res = this.response as string | Dict<any> | ArrayBuffer
      if (typeof res === "string" || format) {
        resolve(res)
      } else {
        safer_(res)
        const map = new Map<string, any>()
        for (let key in res) { map.set(key, (res as Exclude<typeof res, ArrayBuffer>)[key]) }
        resolve(map)
      }
    }
    if (!Build.NDEBUG) { req.onerror = reject }
    req.send()
  })
}) as {
  <T extends `/_locales/${string}/messages.json` | `/i18n/${string}.json`
        | "words.txt" | "vimium-c.css" | "help_dialog.html"> (file: T, format?: undefined
  ): Promise<T extends `${string}.json` ? Map<string, any> : string>
  <F extends "blob" | "arraybuffer"> (file: `data:${string}`, format: F): Promise<F extends "blob" ? Blob : ArrayBuffer>
}

declare var AbortController: new () => { signal: object, abort(): void }
declare var AbortSignal: { timeout? (timeout: number): object }

export const fetchOnlineResources_ = (url: string, timeout?: number): Promise<[Blob | null, string] | null | 0> => {
  let timer1 = 0, p: Promise<Response> | Promise<Blob | null | 0>
  timeout = timeout || 10_000
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinAbortController
      || CurCVer_ > BrowserVer.MinAbortController - 1) {
    if (!(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.Min$AbortSignal$$timeout)
        && (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.Min$AbortSignal$$timeout)) {
      p = (fetch as GlobalFetch)(url, { cache: "force-cache", signal: AbortSignal.timeout!(timeout) })
    } else {
      const abortCtrl = new AbortController()
      timer1 = setTimeout(abortCtrl.abort.bind(abortCtrl), timeout)
      p = (fetch as GlobalFetch)(url, { cache: "force-cache", signal: abortCtrl.signal })
    }
    p = p.then<Blob | 0 | null, null>(res => res.status >= 300 || res.status < 200 ? null
          : res.blob().catch((e) => (console.log("on reading response:", e), 0 as const))
        , (e) => (console.log("on requesting", e), null))
  } else {
    const req = new XMLHttpRequest() as BlobXHR, defer = deferPromise_<Blob | null | 0>()
    req.open("GET", url, true)
    req.responseType = "blob"
    req.onload = (): void => { defer.resolve_(req.status < 300 && req.status >= 200 ? req.response : null) }
    req.onerror = (e): void => { Build.NDEBUG || console.log("on requesting", e); defer.resolve_(null) }
    timer1 = setTimeout((): void => {
      req.onload = req.onerror = null as never
      defer.resolve_(0)
      req.abort()
    }, timeout)
    req.send()
    p = defer.promise_
  }
  timer1 && p.then((): void => { clearTimeout(timer1) })
  return p.then(blob => {
    if (!blob) {
      Build.NDEBUG && console.clear()
      return blob
    }
    return convertToDataURL_(Build.MV3 ? blob : blob.slice(0, Math.min(16, blob.size), blob.type))
        .then(dataUrl => [Build.MV3 ? null : blob, dataUrl])
  })
}

export const convertToDataURL_ = (blob: Blob): Promise<"data:"> => {
  const reader = new FileReader(), defer = deferPromise_<"data:">()
  reader.onload = (ev): void => { defer.resolve_(ev.target.result) }
  reader.readAsDataURL(blob)
  return defer.promise_
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

export const normalizeXY_ = (xy: HintsNS.Options["xy"] | null): HintsNS.StdXY | void => {
  if (xy != null && xy !== false) {
    xy = typeof xy !== "string" ? typeof xy === "number" ? [xy, 0.5] : xy === true ? [0.5, 0.5]
          : xy instanceof Array ? xy : [+xy.x || 0, +xy.y || 0, +xy.s! || 0]
        : xy.trim().split(<RegExpOne> /[\s,]+/).map((i, ind) => i === "count" && ind < 2 ? i
            : !isNaN(+i) ? +i : ind < 2 ? 0.5 : 0) as [number | "count", number, number?]
    while (xy.length < 2) { xy.push(0.5) }
    while (xy.length < 3) { xy.push(0) }
    const useCount = xy[0] === "count" || xy[1] === "count"
    return { x: xy[0], y: xy[1], n: useCount ? 0 : 1, s: useCount ? +xy[2]! || 0.01 : 0 }
  }
}

export const dedupChars_ = (chars: string) => {
  let out = ""
  for (let i = 0, end = chars.length - 1; i < end; i++) {
    const ch = chars[i];
    if (ch.trimRight() && chars.indexOf(ch, i + 1) < 0) {
      out += ch
    }
  }
  return out
}

export const base64_ = (text: string, decode?: 1, hasEncoder?: boolean) => {
  let WithTextDecoder = !OnEdge && (Build.MinCVer >= BrowserVer.MinEnsuredTextEncoderAndDecoder || !OnChrome
      || CurCVer_ > BrowserVer.MinEnsuredTextEncoderAndDecoder - 1 || !!globalThis.TextDecoder)
  WithTextDecoder = hasEncoder ?? false
  let text2 = decode ? DecodeURLPart_(text, "atob") : text
  if (!decode) {
    let arr: ArrayLike<number>
    if (WithTextDecoder) {
      arr = new TextEncoder().encode(text)
    } else {
      text2 = encodeURIComponent(text).replace(<RegExpG & RegExpSearchable<0>> /%..|[^]/g
          , (s): string => s.length === 1 ? s : String.fromCharCode(parseInt(s.slice(1), 16)))
      arr = ([] as string[]).map.call<string[], [(ch: string) => number], number[]>(
          text2 as string | string[] as string[], (ch: string): number => ch.charCodeAt(0))
    }
    text2 = btoa(String.fromCharCode.apply(String, arr as number[]))
  } else if (text2 != text) {
    const kPairRe = /(?:\xed(?:[\xa1-\xbf][\x80-\xbf]|\xa0[\x80-\xbf])){2}/g
    const kUtf8Re = /([\xc0-\xdf][\x80-\xbf]|[\xe0-\xef][\x80-\xbf]{2}|[\xf0-\xf7][\x80-\xbf]{3})+/g
    try {
      text2 = text2.replace(<RegExpG & RegExpSearchable<0>> kPairRe, (s): string => {
        if (s[1] > "\xb0" || s[1] == "\xb0" && s[2] >= "\x80" || s[4] < "\xb0" || s[4] == "\xb0" && s[4] < "\x80") {
          return s
        }
        const x = ([] as string[]).map.call<string[], [(ch: string) => number], number[]>(
              s as string | string[] as string[], (ch: string): number => ch.charCodeAt(0))
        return String.fromCharCode(((x[0] & 0xf) << 12) | ((x[1] & 0x3f) << 6) | (x[2] & 0x3f)
            , ((x[3] & 0xf) << 12) | ((x[4] & 0x3f) << 6) | (x[5] & 0x3f))
      }).replace(<RegExpG & RegExpSearchable<0>> kUtf8Re, (utf8): string => {
        if (WithTextDecoder) {
          const charCodes = ([] as string[]).map.call<string[], [(ch: string) => number], number[]>(
                utf8 as string | string[] as string[], (ch: string): number => ch.charCodeAt(0))
          utf8 = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(charCodes))
        } else {
          const encoded = ([] as string[]).map.call<string[], [(ch: string) => string], string[]>(
                utf8 as unknown as string[], (ch: string) => "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2))
          utf8 = decodeURIComponent(encoded.join(""))
        }
        return utf8
      })
    } catch { /* empty */ }
  }
  return text2
}

export const encodeUnicode_ = (s: string): string => "\\u" + (s.charCodeAt(0) + 0x10000).toString(16).slice(1)

export const now = (): string => {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 1000 * 60).toJSON().slice(0, -5).replace("T", " ")
}

export const getImageExtRe_ = (): RegExpI & RegExpOne & RegExpSearchable<0> =>
    (<RegExpI & RegExpOne & RegExpSearchable<0>> /\.(?:avif|bmp|gif|icon?|jpe?g|a?png|svg|tiff?|webp)$/i)

export const isNotPriviledged = (port: WSender): boolean => {
  const url = port.s.url_
  return !(OnChrome ? url.startsWith("chrome") || url.startsWith("edge") : url.startsWith(location.protocol))
}

const detectSubExpressions_ = (expression_: string, singleCmd?: 1): [pairs: [number, number][], end: number] => {
  const pairs: [number, number][] = []
  let pos_ = 0, lastStart = -1, curlyBraces = 0, end = expression_.length
  for (; pos_ < end; pos_++) {
    switch (expression_[pos_]) {
    case "#": case "&":
      if (expression_.charAt(pos_ + 1) === "#") {
        pairs.push([pos_ + 1, end])
        pos_ = expression_.length
      }
      break
    case "(": case ")": case "?": case "+": singleCmd && (end = pos_); break
    case ":": curlyBraces || singleCmd && (end = pos_); break
    case "{": case "[": curlyBraces++ || (lastStart = pos_); break
    case "]": case "}": --curlyBraces || pairs.push([lastStart, pos_ + 1]); break
    case '"': {
      const literal = (<RegExpOne> /^"([^"\\]|\\[^])*"/).exec(expression_.slice(pos_))
      curlyBraces || literal && pairs.push([pos_, pos_ + literal[0].length])
      pos_ += literal ? literal[0].length - 1 : 0
      break
    }
    default: {
      const literal = (<RegExpOne> /^(?:[$a-zA-Z_][$\w]*|\d[\d.eE+-]|,?\s+)/).exec(expression_.slice(pos_))
      pos_ += literal ? literal[0].length - 1 : 0
      // no break;
    }
    }
  }
  return [pairs, end]
}

export const tryParse = <T = object>(slice: string): T | string => {
    try { return JSON.parse(slice) }
    catch { return slice }
}

export const extractComplexOptions_ = (expression_: string): [options: string, endInSource: number] => {
  const [pairs, end] = detectSubExpressions_(expression_, 1)
  let output = "", lastRight = 0
  for (const [left, right] of pairs) {
    if (expression_[left] === '#') { break }
    if (expression_[left - 1] !== "=" || expression_[right] && expression_[right] !== "&") { continue }
    output += expression_.slice(lastRight, left)
    lastRight = right
    const parsed = tryParse(expression_.slice(left, right))
    const correct = typeof parsed !== "string" || parsed.length !== right - left
    if (!correct) {
      output += parsed.replace(<RegExpG & RegExpSearchable<0>> /&/g, "%26")
      continue
    }
    const str = JSON.stringify(parsed)
    output += str.replace(<RegExpG & RegExpSearchable<0>> /[%\s&]/g, encodeUnicode_)
  }
  output += expression_.slice(lastRight, end)
  return [output, end]
}

export const splitWhenKeepExpressions = (src: string, sep: string): string[] => {
  const pairs = detectSubExpressions_(src)[0]
  let ind = -1, ind2 = 0, lastInd = 0, results: string[] = []
  while ((ind = src.indexOf(sep, ind + 1)) >= 0) {
    while (ind2 < pairs.length && ind >= pairs[ind2][1]) { ind2++ }
    if (ind2 < pairs.length && ind >= pairs[ind2][0]) {
      ind = pairs[ind2][1] - 1
    } else {
      results.push(src.slice(lastInd, ind))
      lastInd = ind + 1
    }
  }
  results.push(src.slice(lastInd))
  return results
}

export const nextConfUpdate = (useOmni: 0 | 1): number => {
  let version = useOmni ? omniConfVer_ : contentConfVer_
  version = ((version + 1) & 0xfff) || 1
  return useOmni ? set_omniConfVer_(version) : set_contentConfVer_(version)
}

export const recencyBase_ = (): number => {
  return (OnChrome || OnFirefox) && Build.OS & kBOS.LINUX_LIKE
      && (Build.OS === kBOS.LINUX_LIKE as number || os_ === kOS.linuxLike) ? 0
      : OnChrome && Build.MinCVer < BrowserVer.Min$performance$$timeOrigin
        && CurCVer_ < BrowserVer.Min$performance$$timeOrigin
      ? Date.now() - performance.now() : performance.timeOrigin!
}
