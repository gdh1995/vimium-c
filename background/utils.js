"use strict";
var Utils = {
  fetchHttpContents: function(url, success, onerror) {
    var req = new XMLHttpRequest();
    req.open("GET", url, true);
    req.onreadystatechange = function () {
      if(req.readyState === 4) {
        var text = req.responseText, status = req.status;
        req = null;
        if (status === 200) {
          success(text);
        } else if (onerror) {
          onerror(text, status);
        }
      }
    };
    req.send();
    return req;
  },
  _escapeRegex: /[&<>]/g,
  _escapeCallback: function(c, n) {
    n = c.charCodeAt(0);
    return (n === 60) ? "&lt;" : (n === 62) ? "&gt;" : "&amp;";
  },
  escapeHtml: function(s) {
    return s.replace(this._escapeRegex, this._escapeCallback);
  },
  // "javascript" should be treated specially
  _chromePrefixes: {
    "about": true, "blob": true, "chrome-extension": true,
    "chrome-search": true, "data": true, "view-source": true
  },
  _urlPrefix: /^[a-z]{3,}:\/\/./,
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
  _hostRegex: /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+\])(:\d+)?$/,
  _nonENTlds: ".\u4e2d\u56fd",
  _tlds: ["", "",
    ".ac.ad.ae.af.ag.ai.al.am.an.ao.aq.ar.as.at.au.aw.az.ba.bb.bd.be.bf.bg.bh.bi.bj.bm.bn.bo.br.bs.bt.bv.bw.by.bz.ca.cc.cd.cf.cg.ch.ci.ck.cl.cm.cn.co.cr.cu.cv.cx.cy.cz.de.dj.dk.dm.do.dz.ec.ee.eg.eh.er.es.et.eu.fi.fj.fk.fm.fo.fr.ga.gd.ge.gf.gg.gh.gi.gl.gm.gn.gp.gq.gr.gs.gt.gu.gw.gy.hk.hm.hn.hr.ht.hu.id.ie.il.im.in.io.iq.ir.is.it.je.jm.jo.jp.ke.kg.kh.ki.km.kn.kp.kr.kw.ky.kz.la.lb.lc.li.lk.lr.ls.lt.lu.lv.ly.ma.mc.md.me.mg.mh.mk.ml.mm.mn.mo.mp.mq.mr.ms.mt.mu.mv.mw.mx.my.mz.na.nc.ne.nf.ng.ni.nl.no.np.nr.nu.nz.om.pa.pe.pf.pg.ph.pk.pl.pm.pn.pr.ps.pt.pw.py.qa.re.ro.ru.rw.sa.sb.sc.sd.se.sg.sh.si.sj.sk.sl.sm.sn.so.sr.ss.st.su.sv.sy.sz.tc.td.tf.tg.th.tj.tk.tl.tm.tn.to.tp.tr.tt.tv.tw.tz.ua.ug.uk.um.us.uy.uz.va.vc.ve.vg.vi.vn.vu.wf.ws.ye.yt.yu.za.zm.zw",
    ".biz.cat.com.edu.gov.int.mil.mtn.net.org.pro.tel.xxx",
    ".aero.arpa.asia.club.coop.info.jobs.mobi.name.post",
    "",
    ".museum.travel"
  ],
  _ipRegex: /^(\d{1,3}\.){3}\d{1,3}$/,
  spacesRegex: /[\s\u3000]+/g,
  _nonENTldRegex: /[^a-z]/,
  _jsNotEscapeRegex: /["\[\]{}\u00ff-\uffff]|%(?![\dA-Fa-f]{2})/,
  filePathRegex: /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  convertToUrl: function(string) {
    if (string.substring(0, 11).toLowerCase() === "javascript:") {
      if (string.indexOf('%', 11) > 0 && !this._jsNotEscapeRegex.test(string)) {
        string = this.decodeEachURLPart(string);
      }
      return string;
    }
    var type = -1, expected = 1, index, index0, oldString, arr;
    // NOTE: here '\u3000' is changed to ' ', which may cause a 404 (for url)
    // NOTE: here a mulit-line string is be changed to single-line,
    //       which may be better
    oldString = string.replace(this.spacesRegex, ' ').trim();
    string = oldString.toLowerCase();
    if ((index = string.indexOf(' ')) > 0) {
      string = string.substring(0, index);
      if ((index = string.indexOf('/')) <= 0 || (index0 = string.indexOf(':')) === 0) {
        type = 2;
      }
      else if (index0 === -1) {}
      else if (string.substring(index0, index0 + 3) !== "://") {
        if (string.substring(0, index0) in this._chromePrefixes) {
          type = 2;
        } else {
          index0 = -1;
        }
      }
      else if (this._urlPrefix.test(string)) {
        expected = 0;
        if (string.startsWith("file:///")) {
          index0 = string.charCodeAt(8);
          type = (index0 > 32 && index0 !== 47) ? 0 : 2;
        }
      } else if (!string.startsWith("chrome")) {
        type = 2;
      }
      if (type < 0) {
        if (index0 > 0) {
          index0 += 3;
          index = string.indexOf('/', index0);
        } else {
          index0 = 0;
        }
        if (index > index0 && (type = string.charCodeAt(index + 1)) > 32 && type !== 47) {
          string = string.substring(index0, index);
          type = -1;
        } else {
          type = 2;
        }
      }
    }
    else if (this._urlPrefix.test(string)) {
      if (string.startsWith("file:") || string.startsWith("chrome:")) {
        type = 0;
      } else {
        index0 = string.indexOf(':') + 3;
        index = string.indexOf('/', index0);
        string = string.substring(index0, index !== -1 ? index : undefined);
        expected = 0;
      }
    }
    else if ((index = string.indexOf(':')) > 3 && index < 17 &&
        (string.substring(0, index) in this._chromePrefixes)) {
      type = 0;
    } else {
      string = (index = string.indexOf('/')) !== -1 ? string.substring(0, index) : string;
    }
    if (type !== -1) {
    } else if (!(arr = this._hostRegex.exec(string))) {
      type = 2;
    } else if ((string = arr[3]).indexOf(':') !== -1 || string.endsWith("localhost")) {
      type = expected;
    } else if ((index = string.lastIndexOf('.')) <= 0) {
      type = 2;
    } else if (this._ipRegex.test(string)) {
      type = expected;
    } else if (!this.isTld(string.substring(index + 1))) {
      type = 2;
    } else if (expected === 0) {
      type = 0;
    } else if (arr[2] || arr[4] || !arr[1]) {
      type = 1;
    // the below means string is like "abc@(uvw.)*xyz.tld"
    } else if (string.startsWith("ftp.")) {
      type = 1;
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0) {
      type = 2;
    } else if ((index0 = string.indexOf(".")) === index) {
      type = 2;
    } else if (string.indexOf(".", ++index0) !== index) {
      type = 1;
    } else {
      type = this.isTld(string.substring(index0, index)) ? 2 : 1;
    }
    return type === 0 ? oldString : type === 1 ? ("http://" + oldString)
      : this.createSearchUrl(Settings.get("searchEnginesMap")["~"], oldString.split(' ')).url;
  },
  isTld: function(tld) {
    if (this._nonENTldRegex.test(tld)) {
      return this._nonENTlds.indexOf(tld) !== -1;
    } else if (tld.length < this._tlds.length) {
      return this._tlds[tld.length].indexOf(tld) > 0;
    }
    return false;
  },
  _searchWordRegex: /%[sS]/g,
  createSearchUrl: function(pattern, query, $S) {
    if ($S != null ? ($S === true) : pattern.$S) {
      $S = query.join(' ');
    }
    if (pattern.$s) {
      query = query.map(encodeURIComponent).join('+');
    }
    query = pattern.url.replace(this._searchWordRegex, function(s) {
      return (s === "%s") ? query : $S;
    });
    return {
      url: query,
      $S: $S
    };
  },
  decodeURLPart: function(url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {
    }
    return url;
  },
  _urlEscapeRegex: /((?:%[\dA-Fa-f]{2})+)/g,
  decodeEachURLPart: function(url) {
    var arr = url.split(this._urlEscapeRegex), i = arr.length, e, decode;
    decode = decodeURIComponent;
    for (; ; ) {
      try {
        while (0 < (i -= 2)) {
          arr[i] = decode(arr[i]);
        };
        break;
      } catch (e) {
      }
    }
    return arr.join("");
  }
};
Utils.__proto__ = null;
