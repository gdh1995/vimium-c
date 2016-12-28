"use strict";
var exports = {}, Utils = {
  fetchHttpContents: function(url, success, req) {
    req = req || new XMLHttpRequest();
    req.open("GET", url, true);
    req.responseType = "text";
    req.onload = success;
    req.send();
    return req;
  },
  extendIf: function(b, a) {
    var i, u;
    for (i in a) {
      b[i] === u && (b[i] = a[i]);
    }
    return b;
  },
  escapeText: function(s) {
    var escapeRe = /[&<]/g, escapeCallback = function(c) {
      return c.charCodeAt(0) === 38 ? "&amp;" : "&lt;";
    };
    this.escapeText = function(s) {
      return s.replace(escapeRe, escapeCallback);
    };
    return this.escapeText(s);
  },
  _chromePrefixes: { "chrome-extension": 1, "chrome-search": 1, __proto__: null  },
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
    ".biz.cat.com.dev.edu.gov.int.mil.mtn.net.new.org.pro.pub.ren.tel.top.win.xin.xxx.xyz",
    ".aero.arpa.asia.band.club.coop.date.gift.help.info.jobs.link.live.mobi.name.news.pics.post.site.tech.wang.wiki",
    ".click.local.onion.party.photo.press.rocks.space.today.trade.video",
    ".design.lawyer.market.museum.online.social.studio.travel"
    , ".science.website"
    , ".engineer.software"
  ],
  domains: Object.create(null),
  _hostRe: /^([^:]+(:[^:]+)?@)?([^:]+|\[[^\]]+])(:\d{2,5})?$/,
  _ipRe: /^(?:\d{1,3}\.){3}\d{1,3}$/,
  _ipv6Re: /^\[[\da-f]{0,4}(?::[\da-f]{0,4}){1,5}(?:(?::[\da-f]{0,4}){1,2}|:\d{0,3}(?:\.\d{0,3}){3})]$/,
  lfRe: /[\r\n]+/g,
  spacesRe: /\s+/g,
  A0Re: /\xa0/g,
  _nonENTldRe: /[^a-z]/,
  protocolRe: /^[a-z][\+\-\.\da-z]+:\/\//,
  _nonENDoaminRe: /[^.\da-z\-]|^-/,
  _jsNotEscapeRe: /["\[\]{}\u00ff-\uffff]|%(?![\dA-F]{2}|[\da-f]{2})/,
  filePathRe: /^['"]?((?:[A-Za-z]:[\\/]|\/(?:Users|home|root)\/)[^'"]*)['"]?$/,
  lastUrlType: 0,
  convertToUrl: function(string, keyword, vimiumUrlWork) {
    string = string.trim();
    if (string.charCodeAt(10) === 58 && string.substring(0, 11).toLowerCase() === "javascript:") {
      if (Settings.CONST.ChromeVersion < 46 && string.indexOf('%', 11) > 0
          && !this._jsNotEscapeRe.test(string)) {
        string = this.DecodeURLPart(string);
      }
      this.lastUrlType = 0;
      return string.replace(this.A0Re, ' ');
    }
    var type = -1, expected = 0, hasPath = false, index, index2, oldString, arr;
    oldString = string.replace(this.lfRe, '').replace(this.spacesRe, ' ');
    string = oldString.toLowerCase();
    if ((index = string.indexOf(' ')) > 0) {
      string = string.substring(0, index);
    }
    if ((index = string.indexOf(':')) === 0) { type = 4; }
    else if (index === -1 || !this.protocolRe.test(string)) {
      if (index !== -1 && string.lastIndexOf('/', index) < 0) {
        type = this.checkSpecialSchemes(oldString, index, string.length % oldString.length);
      }
      expected = 1; index2 = 0;
      if (type === -1 && string.startsWith("//")) {
        string = string.substring(2);
        expected = 2; index2 = 2;
      }
      if (type !== -1) {}
      else if ((index = string.indexOf('/')) <= 0) {
        if (index === 0 || string.length < oldString.length - index2) { type = 4; }
      } else if (string.length >= oldString.length - index2 || string.charCodeAt(index + 1) > 32) {
        hasPath = string.length > index + 1;
        string = string.substring(0, index);
      } else {
        type = 4;
      }
    }
    else if (string.startsWith("vimium:")) {
      type = 3;
      vimiumUrlWork = vimiumUrlWork | 0;
      if (vimiumUrlWork < -1 || !(string = oldString.substring(9))) {}
      else if (vimiumUrlWork === -1
          || !(oldString = this.evalVimiumUrl(string, vimiumUrlWork))) {
        oldString = this.formatVimiumUrl(string, null, vimiumUrlWork);
      } else if (typeof oldString !== "string") {
        type = 5;
      }
    }
    else if ((index2 = string.indexOf('/', index + 3)) === -1
        ? string.length < oldString.length : string.charCodeAt(index2 + 1) <= 32
    ) {
      type = 4;
    }
    else if (this._nonENTldRe.test(string.substring(0, index))) {
      type = (index = string.charCodeAt(index + 3)) > 32 && index !== 47 ? 0 : 4;
    }
    else if (string.startsWith("file:")) { type = 0; }
    else if (string.startsWith("chrome:")) {
      type = string.length < oldString.length && string.indexOf('/', 9) === -1 ? 4 : 0;
    } else {
      string = string.substring(index + 3, index2 !== -1 ? index2 : undefined);
    }

    if (type === -1 && string.indexOf("%") >= 0) {
      string = Utils.DecodeURLPart(string);
      if (string.indexOf('/') >= 0) { type = 4; }
    }
    if (type === -1 && string.startsWith(".")) { string = string.substring(1); }
    if (type !== -1) {
    } else if (!(arr = this._hostRe.exec(string))) {
      type = 4;
      if (string.length === oldString.length && this._ipv6Re.test(string = "[" + string + "]")) {
        oldString = string;
        type = 1;
      }
    } else if ((string = arr[3]).endsWith(']')) {
      type = this._ipv6Re.test(string) ? expected : 4;
    } else if (string.endsWith("localhost")) {
      type = expected;
    } else if ((index = string.lastIndexOf('.')) < 0) {
      string === "__proto__" && (string = ".__proto__");
      type = expected !== 1 || arr[4] && hasPath || (string in this.domains) ? expected : 4;
    } else if (this._ipRe.test(string)) {
      type = expected;
    } else if ((type = this.isTld(string.substring(index + 1))) === 0) {
      type = (string in this.domains) ? expected : 4;
    } else if (string.length !== index + 3 && type === 1 && this._nonENDoaminRe.test(string)) {
      // `non-english.non-ccTld` AND NOT `non-english.non-english-tld`
      type = 4;
    } else if (expected !== 1 || hasPath) {
      type = expected;
    } else if (arr[2] || arr[4] || !arr[1] || string.startsWith("ftp")) {
      type = 1;
    // the below means string is like "(?<=abc@)(uvw.)*xyz.tld"
    } else if (string.startsWith("mail") || string.indexOf(".mail") > 0
        || (index2 = string.indexOf(".")) === index) {
      type = 4;
    } else if (string.indexOf(".", ++index2) !== index) {
      type = 1;
    } else if (string.length === index + 3 && type == 1) { // treat as a ccTLD
      string = string.substring(index2, index);
      type = string.length < this._tlds.length &&
          this._tlds[string.length].indexOf(string) > 0 ? 4 : 1;
    } else {
      type = 1;
    }
    this.lastUrlType = type;
    return type === 0 ? oldString
      : type === 4 ? this.createSearchUrl(oldString.split(' '), keyword || "~"
        , vimiumUrlWork === 1 ? 0 : vimiumUrlWork)
      : type === 1 ? ("http://" + oldString)
      : type === 2 ? ("http:" + oldString)
      : oldString;
  },
  checkSpecialSchemes: function(string, i, spacePos) {
    var isSlash = string[i + 1] === "/";
    switch (string.substring(0, i)) {
    case "about": return isSlash ? 4 : -(spacePos > 0 || string.indexOf('@', i) > 0);
    case "blob": case "view-source":
      string = string.substring(i + 1);
      if (string.startsWith("blob:") || string.startsWith("view-source:")) { return 4; }
      this.convertToUrl(string, null, -2);
      return this.lastUrlType <= 2 ? 0 : 4;
    case "data": return isSlash ? 4 : -((i = string.indexOf(',', i)) < 0 || (spacePos > 0 && spacePos < i));
    case "file": return 0;
    case "filesystem":
      string = string.substring(i + 1);
      if (!this.protocolRe.test(string)) { return 4; }
      this.convertToUrl(string, null, -2);
      return this.lastUrlType === 0 && /[^/]\/(?:persistent|temporary)(?:\/|$)/.test(string) ? 0 : 4;
    case "magnet": return -(string[i + 1] !== '?');
    case "mailto": return isSlash ? 4 : -((i = string.indexOf('/', i)) > 0 && string.lastIndexOf('?', i) < 0);
    default: return isSlash ? 4 : -1;
    }
  },
  removeComposedScheme: function(url) {
    var i = url.startsWith("filesystem:") ? 11 : url.startsWith("view-source:") ? 12 : 0;
    return i ? url.substring(i) : url;
  },
  isTld: function(tld) {
    return this._nonENTldRe.test(tld) ? (this._nonENTlds.indexOf("." + tld + ".") !== -1 ? 2 : 0)
      : tld.length < this._tlds.length && this._tlds[tld.length].indexOf(tld) > 0 ? 1
      : 0;
  },
  _fileExtRe: /\.\w+$/,
  formatVimiumUrl: function(path, partly, vimiumUrlWork) {
    var ind, query, tempStr;
    path = path.trim();
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
      } else if (vimiumUrlWork === 1 || vimiumUrlWork === -1) {
        return "vimium://" + arguments[0].trim();
      } else {
        path = "show.html#!url vimium://" + path;
      }
    }
    if (!partly && (!tempStr || tempStr.indexOf("://") < 0)) {
      path = location.origin + (path.charCodeAt(0) === 47 ? "" : "/pages/") + path;
    }
    return path + (!query ? "" : (path.indexOf("#") > 0 ? " " : "#!") + query);
  },
  _nestedEvalCounter: 0,
  _vimiumCmdRe: /^[a-z][\da-z\-]*(?:\.[a-z][\da-z\-]*)*$/i,
  evalVimiumUrl: function(path, workType) {
    var ind, cmd, arr, obj;
    path = path.trim();
    workType |= 0;
    if (!path || workType < 0 || (ind = path.indexOf(" ")) <= 0 ||
        !this._vimiumCmdRe.test(cmd = path.substring(0, ind).toLowerCase()) ||
        cmd.endsWith(".html") || cmd.endsWith(".js") || cmd.endsWith(".css")) {
      return null;
    }
    path = path.substring(ind + 1).trimLeft();
    if (!path) { return null; }
    if (workType === 1) switch (cmd) {
    case "e": case "exec": case "eval": case "expr": case "calc": case "m": case "math":
      return this.require("MathParser").catch(function() { return null;
      }).then(function(MathParser) {
        var result = Utils.tryEvalMath(path, MathParser) || "";
        return [result, "math", path];
      });
    }
    else if (workType === 2) switch (cmd) {
    case "url-copy": case "search-copy": case "search.copy": case "copy-url":
      path = this.convertToUrl(path, null, 1);
      if (this.lastUrlType !== 5) {}
      else if (path instanceof Array) {
        path = path[0];
      } else if (path instanceof Promise) {
        return path.then(function(arr) {
          var path = arr[0] || arr[2];
          Clipboard.copy(path);
          return [path, "copy"];
        });
      }
      // no break;
    case "c": case "cp": case "copy":
      Clipboard.copy(path);
      return [path, "copy"];
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
      return [path, "ERROR"];
    default:
      return null;
    }
    if (workType === 1) {
      return [arr, "search"];
    }
    ind = this._nestedEvalCounter++, obj;
    if (ind > 12) { return null; }
    if (ind === 12) { return this.createSearchUrl(arr, "", 0); }
    if (ind > 0) { return this.createSearchUrl(arr, "", workType); }
    obj = this.createSearchUrl(arr, "", workType);
    this._nestedEvalCounter = 0;
    return obj;
  },
  tryEvalMath: function(expr, mathParser) {
    var result = null;
    if ((mathParser = mathParser || exports.MathParser).evaluate) {
      try {
        result = "" + mathParser.evaluate(expr);
      } catch (e) {}
      mathParser.expression = "";
    }
    return result;
  },
  jsLoadingTimeout: 300,
  require: function(name) {
    var p = exports[name];
    if (p) {
      return p instanceof Promise ? p : Promise.resolve(p);
    }
    return exports[name] = new Promise(function(resolve, reject) {
      var script = document.createElement("script");
      script.src = Settings.CONST[name];
      script.onerror = function() {
        reject("ImportError: " + name);
      };
      script.onload = function() {
        if (exports[name] instanceof Promise) {
          reject("ImportError: " + name);
        } else {
          resolve(exports[name]);
        }
      };
      document.documentElement.appendChild(script).remove();
    });
  },
  searchWordRe: /\$([sS])(?:\{([^}]*)})?/g,
  searchWordRe2: /([^\\]|^)%([sS])/g,
  searchVariable: /\$([+-]?\d+)/g,
  createSearchUrl: function(query, keyword, vimiumUrlWork) {
    var url, pattern = Settings.cache.searchEngineMap[keyword || query[0]];
    if (pattern) {
      if (!keyword) { keyword = query.shift(); }
      url = this.createSearch(query, pattern.url);
    } else {
      url = query.join(" ");
    }
    if (keyword !== "~") {
      return this.convertToUrl(url, null, vimiumUrlWork);
    }
    return url;
  },
  createSearch: function(query, url, indexes) {
    var q2, delta = 0;
    url = url.replace(this.searchWordRe, function(_s, s1, s2, ind) {
      var arr;
      if (s1 === "S") {
        arr = query;
        s1 = " ";
      } else {
        arr = (q2 || (q2 = query.map(encodeURIComponent)));
        s1 = "+";
      }
      if (arr.length === 0) { return ""; }
      if (s2 && s2.indexOf('$') !== -1) {
        s2 = s2.replace(Utils.searchVariable, function(_s, s3) {
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
    return indexes == null ? url : {
      url: url,
      indexes: indexes
    };
  },
  DecodeURLPart: function(url) {
    url || (url = "");
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
      return (key = key.trim()) && key !== "__proto__" && (map[key] = obj);
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
      obj = {
        name: null,
        url: val
      };
      ids = ids.filter(func);
      if (ids.length === 0) continue;
      if (ind === -1) {
        re.lastIndex = 0;
        pair = re.exec(val);
        if (ind = pair ? (pair.index + 1) : 0) {
          key = pair[2];
          if (key) {
            val = val.replace(re, "$$$1");
          } else {
            key = pair[1] === "s" ? "+" : " ";
          }
          val = this.convertToUrl(val, null, -1);
          if (this.lastUrlType >= 3) {
            val = val.replace(encodedSearchWordRe, "$$$1");
            ind = val.search(re) + 1;
          } else if (this.lastUrlType > 0) {
            ind += this.lastUrlType === 1 ? 7 : 5;
          }
          if (pair = this.reparseSearchUrl(val.toLowerCase(), ind)) {
            if (key.indexOf("$") >= 0) {
              key = key.replace(this.searchVariable, "(.*)");
              key = new RegExp("^" + key, this.alphaRe.test(key) ? "i" : "");
            } else {
              key = key.trim() || " ";
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
          key = this.prepareReparsingPrefix(key);
          rules.push([key, val, ids[0].trimRight(), obj.url.lastIndexOf("$S") >= 0 ? " " : "+"]);
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
  escapeAllRe: /[$()*+.?\[\\\]\^{|}]/g,
  _spaceOrPlusRe: /\\\+|%20| /g,
  _queryRe: /[#?]/,
  alphaRe: /[a-z]/i,
  reparseSearchUrl: function (url, ind) {
    var prefix, str, str2, ind2;
    if (!this.protocolRe.test(url)) { return; }
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
    return [prefix, new RegExp(str + str2 + url, this.alphaRe.test(str2) ? "i" : "")];
  },
  prepareReparsingPrefix: function(prefix) {
    if (prefix.startsWith("http://") || prefix.startsWith("https://")) {
      prefix = prefix.substring(prefix[4] === 's' ? 8 : 7);
    } else if (prefix.startsWith("vimium://")) {
      prefix = this.formatVimiumUrl(prefix.substring(9), null, -1);
    }
    return prefix;
  },
  makeRegexp: function(pattern, suffix, logError) {
    try {
      return new RegExp(pattern, suffix);
    } catch (e) {
      logError === false || console.log("%c/%s/%s%c %s", "color:#C41A16;"
        , pattern, suffix, "color:auto;", "is not a valid regexp.");
    }
    return null;
  },
  hasUpperCase: function(s) { return s.toLowerCase() !== s; }
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
