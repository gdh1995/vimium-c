"use strict";
var Utils = {
  makeNullProto: function() {
    return {__proto__: null};
  },
  _onXHR: function () {
    if (this.readyState === 4 && this.status === 200) {
      this.onsuccess(this.responseText);
    }
  },
  fetchHttpContents: function(url, success) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = this._onXHR;
    req.onsuccess = success;
    req.send();
    return req;
  },
  _escapeRe: /[&<]/g,
  _quoteRe: /"/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 38) ? "&amp;" : "&lt;";
  },
  escapeText: function(s) {
    return s.replace(this._escapeRe, this._escapeCallback);
  },
  escapeAttr: function(s) {
    return this.escapeText(s).replace(this._quoteRe, "&quot;");
  },
  // "javascript" should be treated specially
  _nonUrlPrefixes: { about: 1, blob: 1, data: 1, mailto: 1, "view-source": 1 },
  _chromePrefixes: { "chrome-extension": 1, "chrome-search": 1 },
  _urlPrefix: /^[a-z]{3,}:\/\//,
  hasOrdinaryUrlPrefix: function(url) {
    return this._urlPrefix.test(url);
  },
  // url: only accept real tab's
  isRefusingIncognito: function(url) {
    url = url.toLowerCase();
    if (url.startsWith('chrome://')) {
      return !url.startsWith("chrome://downloads");
    }
    return !url.startsWith(Settings.CONST.ChromeInnerNewTab) && url.startsWith('chrome');
  },
  _nonENTlds: ".\u4e2d\u56fd.\u516c\u53f8.\u7f51\u7edc.\u96c6\u56e2.\u4e2d\u570b.\u6211\u7231\u4f60.",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.an.ao.aq.ar.as.at.au.aw.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.eh.er.es.et.eu.fi.fj.fk.fm.fo.fr.ga.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tp.tr.tt.tv.tw.tz.ua.ug.uk.um.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.yu.za.zm.zw",
    ".biz.cat.com.dev.edu.gov.int.mil.mtn.net.org.pro.pub.ren.tel.top.win.xin.xxx.xyz",
    ".aero.arpa.asia.band.club.coop.date.gift.help.info.jobs.link.live.mobi.name.news.pics.post.site.tech.wang.wiki",
    ".click.local.party.photo.press.rocks.space.today.trade.video",
    ".design.lawyer.market.museum.online.social.studio.travel"
    , ".science.website"
    , ".engineer.software"
  ],
  _hostRe: /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+\])(:\d{2,5})?$/,
  _ipRe: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  spacesRe: /\s+/g,
  _nonENTldRe: /[^a-z]/,
  _nonProtocolRe: /[^0-9a-z\-]/,
  _nonENDoaminRe: /[^\.0-9a-z\-]|^\-/,
  _jsNotEscapeRe: /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  filePathRe: /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  lastUrlType: 0,
  convertToUrl: function(string, keyword, noCustomProtocol) {
    if (string.substring(0, 11).toLowerCase() === "javascript:") {
      if (Settings.CONST.ChromeVersion < 46 && string.indexOf('%', 11) > 0
          && !this._jsNotEscapeRe.test(string)) {
        string = this.DecodeURLPart(string);
      }
      this.lastUrlType = 0;
      return string;
    }
    var type = -1, expected = 1, index, index2, oldString, arr;
    // NOTE: here '\u3000' is changed to ' ', which may cause a 404 (for url)
    // NOTE: here a mulit-line string is be changed to single-line,
    //       which may be better
    oldString = string.trim().replace(this.spacesRe, ' ');
    string = oldString.toLowerCase();
    if ((index = string.indexOf(' ')) > 0) {
      string = string.substring(0, index);
    }
    if ((index = string.indexOf(':')) === 0) { type = 2; }
    else if (index === -1 || string.substring(index, index + 3) !== "://") {
      if (index !== -1 && string.substring(0, index) in this._nonUrlPrefixes) {
        index2 = string.length;
        type = index2 < oldString.length || index2 <= index
          || string.charCodeAt(index + 1) === 47 ? 2 : 0;
      } else if (string.startsWith("//")) {
        string = string.substring(2);
        expected = 4; index2 = 2;
      } else {
        index2 = 0;
      }
      if (type !== -1) {}
      else if ((index = string.indexOf('/')) <= 0) {
        if (index === 0 || string.length < oldString.length - index2) { type = 2; }
      } else if (string.length >= oldString.length - index2 ||
          ((index2 = string.charCodeAt(index + 1)) > 32 && index2 !== 47)) {
        string = string.substring(0, index);
      } else {
        type = 2;
      }
    }
    else if (string.startsWith("vimium:")) {
      if (!noCustomProtocol) {
        oldString = this.formatVimiumUrl(oldString.substring(9));
      }
      type = 3;
    }
    else if ((index2 = string.indexOf('/', index + 3)) === -1
        ? string.length < oldString.length
        : (expected = string.charCodeAt(index2 + 1), expected <= 32 || expected === 47 )
    ) {
      type = 2;
    }
    else if (this._nonENTldRe.test(string.substring(0, index))) {
      type = !this._nonProtocolRe.test(string.substring(0, index)) &&
        (index = string.charCodeAt(index + 3)) > 32 && index !== 47 ? 0 : 2;
    }
    else if (string.startsWith("file:")) {
      if (string.charCodeAt(7) !== 47) {
        type = 2;
      } else {
        index = string.charCodeAt(8);
        type = (index > 32 && index !== 47) ? 0 : 2; // `>32`: in case of NaN
      }
    }
    else if (string.startsWith("chrome:")) {
      type = string.length < oldString.length && string.indexOf('/', 9) === -1 ? 2 : 0;
    } else {
      string = string.substring(index + 3, index2 !== -1 ? index2 : undefined);
      expected = 0;
    }

    if (type !== -1) {
    } else if (!(arr = this._hostRe.exec(string))) {
      type = 2;
    } else if ((string = arr[3]).indexOf(':') !== -1 || string.endsWith("localhost")) {
      type = expected;
    } else if ((index = string.lastIndexOf('.')) <= 0) {
      type = expected !== 1 ? expected : 2;
    } else if (this._ipRe.test(string)) {
      type = expected;
    } else if ((type = this.isTld(string.substring(index + 1))) == 0) {
      type = 2;
    } else if ((string.length !== index + 3 && type === 1) && this._nonENDoaminRe.test(string)) {
      // `non-english.non-ccTld` AND NOT `non-english.non-english-tld`
      type = 2;
    } else if (expected !== 1 || arr[0].length < oldString.length) {
      type = expected;
    } else if (arr[2] || arr[4] || !arr[1] || string.startsWith("ftp")) {
      type = 1;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0
        || (index2 = string.indexOf(".")) === index) {
      type = 2;
    } else if (string.indexOf(".", ++index2) !== index) {
      type = 1;
    } else if (string.length === index + 3 && type == 1) { // treat as a ccTLD
      string = string.substring(index2, index);
      type = string.length < this._tlds.length &&
          this._tlds[string.length].indexOf(string) > 0 ? 2 : 1;
    } else {
      type = 1;
    }
    this.lastUrlType = type;
    return type === 0 ? oldString
      : type === 1 ? ("http://" + oldString)
      : type === 2 ? this.createSearchUrl(oldString.split(' '), keyword || "~")
      : type === 4 ? ("http:" + oldString)
      : oldString;
  },
  isTld: function(tld) {
    if (this._nonENTldRe.test(tld)) {
      return this._nonENTlds.indexOf("." + tld + ".") !== -1 ? 2 : 0;
    } else if (tld.length < this._tlds.length) {
      return this._tlds[tld.length].indexOf(tld) > 0 ? 1 : 0;
    }
    return 0;
  },
  _fileExtRe: /\.\w+$/,
  formatVimiumUrl: function(path, partly) {
    var ind, query;
    path = path.trim();
    if (!path) { return partly ? "" : chrome.runtime.getURL("/pages/"); }
    ind = path.indexOf(" ");
    if (ind > 0) {
      query = path.substring(ind + 1).trim();
      path = path.substring(0, ind);
    }
    if (!this._fileExtRe.test(path)) {
      path += ".html";
    }
    if (!partly) {
      path = chrome.runtime.getURL(path.startsWith("/") ? path : "/pages/" + path);
    }
    return path + (query ? ("#!" + query) : "");
  },
  searchWordRe: /\$([sS])(?:\{([^\}]*)\})?/g,
  searchWordRe2: /([^\\]|^)%([sS])/g,
  searchVariable: /\$([\d])/g,
  createSearchUrl: function(query, keyword) {
    var pattern = Settings.get("searchEngineMap")[keyword];
    if (pattern) {
      query = this.createSearch(query, pattern, null);
    }
    if (keyword != "~") {
      query = this.convertToUrl(query);
    }
    return query;
  },
  createSearch: function(query, pattern, indexes) {
    var q2, url, delta = 0;
    url = pattern.url.replace(this.searchWordRe, function(_s, s1, s2, ind) {
      var arr = s1 === "S" ? query : (q2 || (q2 = query.map(encodeURIComponent)));
      if (arr.length === 0) { return ""; }
      if (s2 && s2.indexOf('$') !== -1) {
        s2 = s2.replace(Utils.searchVariable, function(_s, s1) {
          return arr[s1 - 1] || "";
        });
      } else {
        s2 = arr.join(s2 != null ? s2 : s1 === "s" ? "+" : " ");
      }
      if (indexes !== null) {
        ind += delta;
        indexes.push(ind, ind + s2.length);
        delta += s2.length - _s.length;
      }
      return s2;
    });
    return indexes === null ? url : {
      url: url,
      indexes: indexes
    };
  },
  DecodeURLPart: function(url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
    return url;
  },
  parseSearchEngines: function(str, map) {
    var ids, pair, key, val, obj, _i, _len, ind, rSlash = /[^\\]\//, rules = [],
    rEscapeSpace = /\\\s/g, rSpace = /\s/, rEscapeS = /\\s/g, rColon = /\\:/g,
    rPercent = /\\%/g, rRe = /\sre=/i, a = str.replace(/\\\n/g, '').split('\n'),
    func = function(key) {
      return (key = key.trim()) && (map[key] = obj);
    }, encodedSearchWordRe = /%24([sS])/g, re = this.searchWordRe;
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!(val.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
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
      re.lastIndex = 0;
      pair = re.exec(val);
      obj = {
        ind: pair ? (pair.index + 1) : 0,
        name: null,
        url: val
      };
      ids = ids.filter(func);
      if (ids.length === 0) continue;
      if (ind === -1) {
        if (ind = obj.ind) {
          key = pair[2];
          if (key) {
            val = this.convertToUrl(val.replace(re, "$$$1"));
          } else {
            key = pair[1] === "s" ? "+" : " ";
          }
          if (this.lastUrlType === 2) {
            val = val.replace(encodedSearchWordRe, decodeURIComponent);
            ind = val.search(re) + 1;
          } else if (this.lastUrlType > 0) {
            ind += this.lastUrlType === 1 ? 7 : this.lastUrlType === 3 ? 43 : 5;
          }
          if (pair = this.reparseSearchUrl(val.toLowerCase(), ind)) {
            if (key.indexOf("$") >= 0) {
              key = new RegExp("^" + key.replace(this.searchVariable, "(.*)"), "i");
            }
            rules.push([pair[0], pair[1], ids[0].trimRight(), key]);
          }
        }
      } else if (str.charCodeAt(ind + 4) === 47) {
        key = ind > 1 ? str.substring(1, ind).trim() : "";
        str = str.substring(ind + 5);
        ind = str.search(rSlash) + 1;
        val = str.substring(0, ind);
        str = str.substring(ind + 1);
        ind = str.search(rSpace);
        val = this.makeRegexp(val, ind >= 0 ? str.substring(0, ind) : str);
        if (val) {
          if (key.startsWith("http://") || key.startsWith("https://")) {
            key = key.substring(key[4] === 's' ? 8 : 7);
          }
          rules.push([key, val, ids[0].trimRight(), pair && pair[1] === "S" ? " " : "+"]);
        }
        str = ind >= 0 ? str.substring(ind + 1) : "";
      } else {
        str = str.substring(ind + 4);
      }
      str = str.trimLeft();
      obj.name = str ? this.DecodeURLPart(str) : ids[ids.length - 1].trimLeft();
    }
    return rules;
  },
  escapeAllRe: /[\$\(\)\*\+\.\?\[\\\]\^\{\|\}]/g,
  _spaceOrPlusRe: /\\\+|%20| /g,
  _queryRe: /[#?]/,
  reparseSearchUrl: function (url, ind) {
    var prefix, str, str2, ind2;
    if (!(this.hasOrdinaryUrlPrefix(url) || url.startsWith("chrome-"))) { return; }
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
        str = url[ind - 1] === "#" ? "#" : str2 ? "[#\\?]" : "\\?";
      }
      url = "([^#&?]*)";
    } else {
      str = "^([^?#]*)";
      if (str2 = url.substring(prefix.length + 2)) {
        if (ind = str2.search(this._queryRe) + 1) {
          str2 = str2.substring(0, ind - 1);
        }
      }
      url = "";
    }
    str2 = str2 && str2.replace(this.escapeAllRe, "\\$&"
      ).replace(this._spaceOrPlusRe, "(?:\\+|%20)");
    if (prefix.startsWith("http://") || prefix.startsWith("https://")) {
      prefix = prefix.substring(prefix[4] === 's' ? 8 : 7);
    } else if (prefix.startsWith("vimium://")) {
      prefix = this.formatVimiumUrl(prefix.substring(9));
    }
    return [prefix, new RegExp(str + str2 + url, "i")];
  },
  makeRegexp: function(pattern, suffix) {
    try {
      return new RegExp(pattern, suffix);
    } catch (e) {
      console.log("%c/%s/%s%c %s", "color:#C41A16;"
        , pattern, suffix, "color:auto;", "is not a valid regexp.");
    }
    return null;
  },
  Decoder: null,
  upperRe: /[A-Z]/
};

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(s) {
  return this.length >= s.length && this.lastIndexOf(s, 0) === 0;
};
String.prototype.endsWith || (String.prototype.endsWith = function(s) {
  var i = this.length - s.length;
  return i >= 0 && this.indexOf(s, i) === i;
});
}
