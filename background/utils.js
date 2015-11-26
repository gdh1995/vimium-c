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
  _escapeRe: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRe, this._escapeCallback);
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
  _nonENTlds: ".\u4e2d\u56fd.\u516c\u53f8.\u4f01\u4e1a",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.an.ao.aq.ar.as.at.au.aw.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.eh.er.es.et.eu.fi.fj.fk.fm.fo.fr.ga.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tp.tr.tt.tv.tw.tz.ua.ug.uk.um.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.yu.za.zm.zw",
    ".biz.cat.com.dev.edu.gov.int.mil.mtn.net.org.pro.tel.top.xxx.xyz",
    ".aero.arpa.asia.club.coop.info.jobs.mobi.name.post.wang",
    ".local",
    ".museum.travel"
  ],
  _hostRe: /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+\])(:\d{2,5})?$/,
  _ipRe: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  spacesRe: /[\s\u3000]+/g,
  _nonENTldRe: /[^a-z]/,
  _jsNotEscapeRe: /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  filePathRe: /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  convertToUrl: function(string, keyword) {
    if (string.substring(0, 11).toLowerCase() === "javascript:") {
      if (Settings.CONST.ChromeVersion < 46 && string.indexOf('%', 11) > 0
          && !this._jsNotEscapeRe.test(string)) {
        string = this.decodeURLPart(string);
      }
      return string;
    }
    var type = -1, expected = 1, index, index2, oldString, arr;
    // NOTE: here '\u3000' is changed to ' ', which may cause a 404 (for url)
    // NOTE: here a mulit-line string is be changed to single-line,
    //       which may be better
    oldString = string.replace(this.spacesRe, ' ').trim();
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
        expected = 3; index2 = 2;
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
    else if ((index2 = string.indexOf('/', index + 3)) === -1
        ? string.length < oldString.length
        : (expected = string.charCodeAt(index2 + 1), expected <= 32 || expected === 47 )
    ) {
      type = 2;
    }
    else if (this._nonENTldRe.test(string.substring(0, index))) {
      type = (string.substring(0, index) in this._chromePrefixes)
        && (index = string.charCodeAt(index + 3)) > 32 && index !== 47 ? 0 : 2;
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
    }
    else if (string.startsWith("vimium:")) {
      type = 0;
      oldString = chrome.runtime.getURL("/") + oldString.substring(9);
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
    } else if (!this.isTld(string.substring(index + 1))) {
      type = 2;
    } else if (expected !== 1 || string.length < oldString.length) {
      type = expected;
    } else if (arr[2] || arr[4] || !arr[1] || string.startsWith("ftp")) {
      type = 1;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0
        || (index2 = string.indexOf(".")) === index) {
      type = 2;
    } else if (string.indexOf(".", ++index2) !== index) {
      type = 1;
    } else {
      type = this.isTld(string.substring(index2, index)) ? 2 : 1;
    }
    // window.type = type;
    return type === 0 ? oldString : type === 1
      ? ("http://" + oldString) : type === 3 ? ("http:" + oldString)
      : this.createSearchUrl(oldString.split(' '), keyword || "~");
  },
  isTld: function(tld) {
    if (this._nonENTldRe.test(tld)) {
      return this._nonENTlds.indexOf(tld) !== -1;
    } else if (tld.length < this._tlds.length) {
      return this._tlds[tld.length].indexOf(tld) > 0;
    }
    return false;
  },
  searchWordRe: /%[sS]/g,
  createSearchUrl: function(query, keyword) {
    query = this.createSearch(query, Settings.get("searchEngineMap")[keyword]).url;
    if (keyword != "~") {
      query = this.convertToUrl(query);
    }
    return query;
  },
  createSearch: function(query, pattern, $S) {
    var queryStr;
    if ($S != null ? ($S === true) : pattern.$S) {
      $S = query.join(' ');
    }
    if (pattern.$s) {
      queryStr = query.map(encodeURIComponent).join('+');
    }
    return {
      url: pattern.url.replace(this.searchWordRe, function(s) {
        return (s === "%s") ? queryStr : $S;
      }),
      $s: queryStr,
      $S: $S
    };
  },
  decodeURLPart: function(url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
    return url;
  },
  parseSearchEngines: function(str, map) {
    var ids, pair, key, val, obj, _i, _len, ind, rSlash = /[^\\]\//, rules = [],
    rEscapeSpace = /\\\s/g, rSpace = /\s/, rEscapeS = /\\s/g, rColon = /\\:/g,
    rRe = /\sre=/i, a = str.replace(/\\\n/g, '').split('\n'),
    func = function(key) {
      return (key = key.trim()) && (map[key] = obj);
    };
    for (_i = 0, _len = a.length; _i < _len; _i++) {
      val = a[_i].trim();
      if (!(val.charCodeAt(0) > 35)) { continue; } // mask: /[ !"#]/
      ind = 0;
      do {
        ind = val.indexOf(":", ind + 1);
      } while (val.charCodeAt(ind - 1)  === 92);
      if (ind <= 0 || !(key = val.substring(0, ind).trimRight())) continue;
      val = val.substring(ind + 1).trimLeft();
      if (!val) continue;
      str = val.replace(rEscapeSpace, "\\s");
      ind = str.search(rSpace);
      if (ind > 0) {
        str = val.substring(ind);
        val = val.substring(0, ind);
        ind = str.search(rRe);
      } else {
        val = str;
        str = "";
      }
      val = val.replace(rEscapeS, " ");
      obj = {
        $S: val.indexOf("%S") + 1,
        $s: val.indexOf("%s") + 1,
        name: null,
        url: val
      };
      ids = key.replace(rColon, ":").split('|').filter(func);
      if (ids.length === 0) continue;
      if (ind === -1) {
        if (pair = this.reparseSearchUrl(obj)) {
          pair.push(ids[0].trimRight());
          rules.push(pair);
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
          rules.push([key, val, ids[0].trimRight()]);
        }
        str = ind >= 0 ? str.substring(ind + 1) : "";
      } else {
        str = str.substring(ind + 4);
      }
      str = str.trimLeft();
      obj.name = str ? this.decodeURLPart(str) : ids[ids.length - 1].trimLeft();
    }
    return rules;
  },
  reparseSearchUrl: function (pattern) {
    var url, ind = pattern.$s || pattern.$S, prefix, str, ind2;
    if (!ind) { return; }
    url = pattern.url.toLowerCase();
    if (!(this.hasOrdinaryUrlPrefix(url) || url.startsWith("chrome-"))) { return; }
    prefix = url.substring(0, ind - 1);
    if (ind = Math.max(prefix.lastIndexOf("?"), prefix.lastIndexOf("#")) + 1) {
      str = prefix.substring(ind);
      prefix = prefix.substring(0, Math.max(prefix.indexOf("?"), prefix.indexOf("#")));
      if (ind2 = str.lastIndexOf("&") + 1) {
        str = str.substring(ind2);
      }
      if (str && str.indexOf("=") >= 1) {
        return this.makeReparser(prefix, "[#&?]", str, "([^#&]*)");
      }
      url = url[ind - 1] === "?" ? "\\?" : "#";
      return this.makeReparser(prefix, url, str, "([^#&?]*)");
    }
    url = url.substring(prefix.length + 2);
    if (ind = Math.max(url.indexOf("?"), url.indexOf("#")) + 1) {
      url = url.substring(0, ind - 1);
    }
    return this.makeReparser(prefix, "^([^?#]*)", url, "");
  },
  escapeAllRe: /[\$\(\)\*\+\.\?\[\\\]\^\{\|\}]/g,
  _spaceOrPlusRe: /\\\+|%20| /g,
  makeReparser: function(head, prefix, matched_body, suffix) {
    matched_body = matched_body && matched_body.replace(this.escapeAllRe, "\\$&"
      ).replace(this._spaceOrPlusRe, "(?:\\+|%20)");
    if (head.startsWith("https://")) {
      head = "http" + head.substring(5);
    } else if (head.startsWith("vimium://")) {
      head = chrome.runtime.getURL("/") + head.substring(9);
    }
    return [head, new RegExp(prefix + matched_body + suffix, "i")];
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
