"use strict";
var _browser = {
	ua: window.navigator.userAgent,
	version: null,
	webkit: true,
	chrome: true,
	cssType: "webkit",
	protocol: "chrome",
}, oUrls = {
	"oDownloads": "chrome://downloads/",
	"oBookmarks": "chrome://bookmarks/#1",
	"oHistory": "chrome://history/",
	"oExtensions": "chrome://extensions",
	"oNewtab": "chrome-search://local-ntp/local-ntp.html"
};
_browser.version = _browser.ua.match(/WebKit\/([\d.]+)/)[1];
function truncate(str, ind, lng) {
	if (str) {
		if (str.length > lng) {
			return str.substring(ind, lng - 3) + '...'
		} else {
			return str.substring(ind, lng)
		}
	}
	return ''
}
function title_fix(text) {
	return text ? Utils.escapeHtml(text) : "";
}
var I18n = Lang['zh_CN'];
function getI18nMsg(msgname) {
	return I18n[msgname] || msgname;
}
function initChromeI18n(obj) {
	var _data, key, _mKey, arr = ['content', 'value', 'title', 'placeholder'];
	for (var i = arr.length, n, message, item, lang = I18n; 0 <= --i; ) {
		_mKey = arr[i];
		key = 'data-i18n-' + _mKey;
		if (typeof obj != 'undefined') {
			_data = obj.find('[' + key + ']')
		} else {
			_data = $('[' + key + ']')
		}
		if (!_data.length) { continue; }
		n = _data.length;
		switch (_mKey) {
		case 'content':
			while(0 <= --n) {
				message = _data[n].getAttribute(key);
				message = lang[message] || message;
				_data[n].innerHTML = message;
			}
			break;
		case 'value':
			while(0 <= --n) {
				message = _data[n].getAttribute(key);
				message = lang[message] || message;
				_data[n].value = message;
			}
			break;
		default:
			while(0 <= --n) {
				message = _data[n].getAttribute(key);
				message = lang[message] || message;
				_data[n].setAttribute(_mKey, message)
			}
			break;
		}
	}
}
function isMouseMoveContains(e, parent) {
	var child = e.relatedTarget || (e.type == 'mouseout' ? e.toElement : e.fromElement);
	return isContains(child, parent)
}
function isContains(child, parent) {
	while (child && child !== parent) {
		child = child.parentNode
	}
	return child ? true : false;
}
function isContainsClass(child, parentClass) {
	while (child && child.classList && !child.classList.contains(parentClass)) {
		child = child.parentNode
	}
	return child && child.classList ? true : false;
}
function loadScript(src, fn, efn, force) {
	fn = fn || function () {};
	if (force) {
		src += '?t=' + Date.now()
	}
	var obj = document.createElement("script");
	obj.type = "text/javascript";
	obj.src = src;
	obj.charset = 'utf-8';
	document.head.appendChild(obj);
	obj.onload = fn;
}
function loadCss(src, force) {
	if (force) {
		src += '?t=' + Date.now()
	}
	var obj = document.createElement('link');
	obj.rel = 'stylesheet';
	obj.type = 'text/css';
	obj.href = src;
	document.head.appendChild(obj);
}
function getMaxZindex(obj) {
	var maxZ = 0, objSiblings = obj.siblings(), i, temp;
	if (objSiblings.length > 0) {
		for (i = 0; i < objSiblings.length; i++) {
			temp = parseInt(objSiblings[i].style.zIndex);
			if (maxZ < temp) {
				maxZ = temp
			}
		}
	}
	return maxZ
};
function pad(num, n) {
	var len = num.toString().length;
	while (len < n) {
		num = "0" + num;
		len++
	}
	return num
}
function getRand(v_min, v_max) {
	return Math.floor(Math.random() * (v_max - v_min) + v_min)
}
function shuffle(aArr) {
	var iLength = aArr.length, i = iLength, mTemp, iRandom;
	while (i--) {
		if (i !== (iRandom = Math.floor(Math.random() * iLength))) {
			mTemp = aArr[i];
			aArr[i] = aArr[iRandom];
			aArr[iRandom] = mTemp
		}
	}
}
function openTab(targetSwitch, url, ctrlKey) {
	if (targetSwitch === true) {
		chrome.tabs.update({url: url});
		return;
	}
	chrome.tabs.getSelected(null, function (curTab) {
		var tab1 = {
			index: curTab.index + 1,
			openerTabId: curTab.id,
			selected: ctrlKey !== true,
			url: url
		};
		chrome.tabs.create(tab1);
	});
}
function isWhite(c1, c2, c3) {
	return (c1 >= 230 && c2 >= 230 && c3 >= 230) ? true : false;
}
var isUrl = /^(?:(?:https|http|ftp|rtsp|mms):\/\/)?[-0-9A-Z_a-z]+\.[^\.]/;
isUrl = new RegExp(isUrl);
isUrl = isUrl.test.bind(isUrl);
var urlRegEx = function(url) {
	return url ? url.match(this) : false;
}
urlRegEx = urlRegEx.bind(/(\w+):\/\/([^\:|\/]+)(\:\d*)?(.*\/?)([^#|\?|\n]+)?(#.*)?(\?.*)?/i);
function S2S(str) {
	return str.replace(/\x01/g, "");
}
function showNotice(msg, sec, fn1, fn2) {
	if (typeof notice == "undefined") {
		loadCss("app/notice/css/skin_0.css");
		loadScript("app/notice/notice.js", function () {
			notice.init(msg, sec, fn1, fn2)
		})
	} else {
		notice.init(msg, sec, fn1, fn2)
	}
}
function objClone(obj) {
	if (typeof(obj) !== 'object') {
		return obj
	}
	var re = (obj.constructor === Array ? [] : {});
	for (var i in obj) {
		re[i] = objClone(obj[i])
	}
	return re
}
var _normalizeUrl = function (url) {
	return url.trim().toLowerCase().replace(this, "$1");
}
_normalizeUrl = _normalizeUrl.bind(/^(?:http:\/\/)?(.*?)\/?$/);
function isLikeUrl(url1, url2) {
	if (url1) {
		if (url2) {
			if (_normalizeUrl(url1) === _normalizeUrl(url2)) {
				return true;
			}
		}
		return false;
	}
	return !url2;
}
function addZero(str, length) {
	return new Array(length - str.length + 1).join("0") + str
}
function getIframeDialboxUrl(url) {
	var iframeDialbox = PDI.get('iframeDialbox');
	if (iframeDialbox.length === 0) return false;
	if (url.match(/(.*?\.)?taobao\.com\/(.*)pid=mm_(.*)/)) {
		if (iframeDialbox.indexOf("taobao.com") > -1) {
			return "http://www.94994.com/myapp/iframeDialbox/index.html"
		}
	} else if (url.match(/(.*?\.)?amazon\.com\/(.*)tag=(.*)-20/)) {
		if (iframeDialbox.indexOf("amazon.com") > -1) {
			return "http://www.zomela.com/iframeDialbox/index.html"
		}
	}
	return false
}
function replaceMSiteDialboxs(_dialboxs, MSite) {
	var _save = false;
	if (!_dialboxs || !(_dialboxs.length > 0)) {
		return null;
	}
	$.each(_dialboxs, function (i) {
		var urli = _dialboxs[i]['url'];
		if (!urli) { return; }
		$.each(MSite, function (skey, svalue) {
			var isReplace = false, str = svalue.type, regex, flag1 = !str;
			if (flag1 || str.indexOf("all") > -1) {
				regex = new RegExp("^(http:\/\/)?" + skey + "\/?$", "i");
				if (urli.match(regex) != null) {
					isReplace = true
				}
			}
			if (!isReplace && (flag1 || str.indexOf("begin") > -1)) {
				regex = new RegExp("^(http:\/\/)?" + skey + "\/?[\\?&]", "i");
				if (urli.match(regex) != null) {
					isReplace = true
				}
			}
			if (!isReplace && (flag1 || str.indexOf("end") > -1)) {
				regex = new RegExp("[?&]([tul]|out|ulp|url)=(http:\/\/)?" + skey + "\/?$", "i");
				if (urli.match(regex) != null) {
					isReplace = true
				}
			}
			if (!isReplace) { return; }
			var diagi = _dialboxs[i];
			str = svalue.url;
			if (str && urli != str) {
				diagi.url = str;
				_save = true
			}
			str = svalue.title;
			if (str && diagi.title != str) {
				diagi.title = str;
				_save = true
			}
			str = svalue.html;
			if (str) {
				if (diagi.html != str) {
					diagi.html = str;
					_save = true
				}
			} else if (diagi.html) {
				delete diagi.html;
				_save = true
			}
			str = svalue.img;
			if (str) {
				if (diagi.img != str) {
					diagi.img = str;
					_save = true
				}
			} else if (diagi.img && diagi.img.indexOf("/rssData/") === -1) {
				delete diagi.img;
				_save = true
			}
			str = svalue.isApp;
			if (str) {
				if (diagi.isApp != str) {
					diagi.isApp = str;
					_save = true
				}
			} else if (diagi.isApp) {
				delete diagi.isApp;
				_save = true
			}
			return false
		});
	});
	return _save ? _dialboxs : null;
}
function replaceMSite(MSite, filters) {
	filters = typeof filters == "undefined" ? [] : filters;
	var _classificationsIds = [""];
	var _classifications = storage.get('classifications', true);
	if (_classifications && _classifications.length > 0) {
		$.each(_classifications, function (k, v) {
			if (filters.indexOf(v.id) == -1) {
				_classificationsIds.push("_" + v.id)
			}
		})
	}
	storage.relative = false;
	$.each(_classificationsIds, function (k, v) {
		var _dialBoxes = storage.get('dialBoxes' + v, true);
		if (!_dialBoxes) { return; }
		var boxes = _dialBoxes.normal;
		boxes = replaceMSiteDialboxs(boxes, MSite);
		if (boxes) {
			PDI.set("dialBoxes" + v, "normal", boxes)
		}
		boxes = _dialBoxes.quick;
		boxes = replaceMSiteDialboxs(boxes, MSite);
		if (boxes) {
			PDI.set("dialBoxes" + v, "quick", boxes)
		}
	});
	storage.relative = true
}
function replaceLocationDB() {
	var OTime = PDI.get('setup', 'OTime');
	if (OTime < 1402367000) {
		if (OTime < 1384826000) {
			storage.relative = true
		}
		if (OTime < 1401359000) {
			var _classifications = storage.get('classifications', true);
			var _classificationsIds = [""];
			storage.relative = false;
			if (_classifications && _classifications.length > 0) {
				$.each(_classifications, function (k, v) {
					_classificationsIds.push("_" + v.id);
					storage.clear(['weather_' + v.id])
				})
			}
			$.each(_classificationsIds, function (k, v) {
				var _dialBoxes = storage.get('dialBoxes' + v, true);
				if (_dialBoxes) {
					var _normalDialboxes = _dialBoxes['normal'];
					var _quickDialboxes = _dialBoxes['quick'];
					var _save = false;
					if (typeof _normalDialboxes != "undefined" && _normalDialboxes && _normalDialboxes.length > 0) {
						$.each(_normalDialboxes, function (i, n) {
							if (_normalDialboxes[i]['isApp'] == "weather") {
								delete _normalDialboxes[i];
								_save = true
							}
						})
					}
					if (_save) {
						PDI.set("dialBoxes" + v, "normal", _normalDialboxes)
					}
					_save = false;
					if (typeof _quickDialboxes != "undefined" && _quickDialboxes && _quickDialboxes.length > 0) {
						$.each(_quickDialboxes, function (i, n) {
							if (_quickDialboxes[i]['isApp'] == "weather") {
								delete _quickDialboxes[i];
								_save = true
							}
						})
					}
					if (_save) {
						PDI.set("dialBoxes" + v, "quick", _quickDialboxes)
					}
				}
			});
			storage.relative = true
		}
		PDI.set('setup', 'OTime', 1414992000)
	}
};

var hexcase = 0;
var b64pad = "";
function hex_md5(s){return rstr2hex(rstr_md5(str2rstr_utf8(s)))}
function b64_md5(s){return rstr2b64(rstr_md5(str2rstr_utf8(s)))}
function any_md5(s,e){return rstr2any(rstr_md5(str2rstr_utf8(s)),e)}
function hex_hmac_md5(k,d){return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k),str2rstr_utf8(d)))}
function b64_hmac_md5(k,d){return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k),str2rstr_utf8(d)))}
function any_hmac_md5(k,d,e){return rstr2any(rstr_hmac_md5(str2rstr_utf8(k),str2rstr_utf8(d)),e)}
function md5_vm_test(){return hex_md5("abc").toLowerCase()=="900150983cd24fb0d6963f7d28e17f72"}
function rstr_md5(s){return binl2rstr(binl_md5(rstr2binl(s),s.length*8))}
function rstr_hmac_md5(key,data){var bkey=rstr2binl(key);if(bkey.length>16)bkey=binl_md5(bkey,key.length*8);var ipad=Array(16),opad=Array(16),i=0;for(;i<16;i++){ipad[i]=bkey[i]^0x36363636;opad[i]=bkey[i]^0x5C5C5C5C}var hash=binl_md5(ipad.concat(rstr2binl(data)),512+data.length*8);return binl2rstr(binl_md5(opad.concat(hash),512+128))}
function rstr2hex(input){var hex_tab=hexcase?"0123456789ABCDEF":"0123456789abcdef",output="",x,i=0;for(;i<input.length;i++){x=input.charCodeAt(i);output+=hex_tab.charAt((x>>>4)&0x0F)+hex_tab.charAt(x&0x0F)}return output}
function rstr2b64(input){var tab="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",output="",len=input.length,i=0,j,triplet;for(;i<len;i+=3){triplet=(input.charCodeAt(i)<<16)|(i+1<len?input.charCodeAt(i+1)<<8:0)|(i+2<len?input.charCodeAt(i+2):0);for(j=0;j<4;j++){if(i*8+j*6>input.length*8)output+=b64pad;else output+=tab.charAt((triplet>>>6*(3-j))&0x3F)}}return output}
function rstr2any(input,encoding){var divisor=encoding.length,i,j,q,x,quotient,dividend=Array(Math.ceil(input.length/2));for(i=0;i<dividend.length;i++){dividend[i]=(input.charCodeAt(i*2)<<8)|input.charCodeAt(i*2+1)}
var full_length=Math.ceil(input.length*8/(Math.log(encoding.length)/Math.log(2))),remainders=Array(full_length);for(j=0;j<full_length;j++){quotient=Array();x=0;for(i=0;i<dividend.length;i++){x=(x<<16)+dividend[i];q=Math.floor(x/divisor);x-=q*divisor;if(quotient.length>0||q>0)quotient[quotient.length]=q}remainders[j]=x;dividend=quotient}
var output="";for(i=remainders.length-1;i>=0;i--)output+=encoding.charAt(remainders[i]);
return output}
function str2rstr_utf8(input){var output="",i=-1,x,y;while(++i<input.length){x=input.charCodeAt(i);y=i+1<input.length?input.charCodeAt(i+1):0;if(0xD800<=x&&x<=0xDBFF&&0xDC00<=y&&y<=0xDFFF){x=0x10000+((x&0x03FF)<<10)+(y&0x03FF);i++}if(x<=0x7F)output+=String.fromCharCode(x);else if(x<=0x7FF)output+=String.fromCharCode(0xC0|((x>>>6)&0x1F),0x80|(x&0x3F));else if(x<=0xFFFF)output+=String.fromCharCode(0xE0|((x>>>12)&0x0F),0x80|((x>>>6)&0x3F),0x80|(x&0x3F));else if(x<=0x1FFFFF)output+=String.fromCharCode(0xF0|((x>>>18)&0x07),0x80|((x>>>12)&0x3F),0x80|((x>>>6)&0x3F),0x80|(x&0x3F))}return output}
function str2rstr_utf16le(input){var output="",i=0;for(;i<input.length;i++)output+=String.fromCharCode(input.charCodeAt(i)&0xFF,(input.charCodeAt(i)>>>8)&0xFF);return output}
function str2rstr_utf16be(input){var output="",i=0;for(;i<input.length;i++)output+=String.fromCharCode((input.charCodeAt(i)>>>8)&0xFF,input.charCodeAt(i)&0xFF);return output}
function rstr2binl(input){var output=Array(input.length>>2),i=0;for(;i<output.length;i++)output[i]=0;for(i=0;i<input.length*8;i+=8)output[i>>5]|=(input.charCodeAt(i/8)&0xFF)<<(i%32);return output}
function binl2rstr(input){var output="",i=0;for(;i<input.length*32;i+=8)output+=String.fromCharCode((input[i>>5]>>>(i%32))&0xFF);return output}
function binl_md5(x,len){x[len>>5]|=0x80<<((len)%32);x[(((len+64)>>>9)<<4)+14]=len;var a=1732584193,b=-271733879,c=-1732584194,d=271733878,i=0,olda,oldb,oldc,oldd;
for(;i<x.length;i+=16){olda=a,oldb=b,oldc=c,oldd=d;a=md5_ff(a,b,c,d,x[i+0],7,-680876936);d=md5_ff(d,a,b,c,x[i+1],12,-389564586);c=md5_ff(c,d,a,b,x[i+2],17,606105819);b=md5_ff(b,c,d,a,x[i+3],22,-1044525330);a=md5_ff(a,b,c,d,x[i+4],7,-176418897);d=md5_ff(d,a,b,c,x[i+5],12,1200080426);c=md5_ff(c,d,a,b,x[i+6],17,-1473231341);b=md5_ff(b,c,d,a,x[i+7],22,-45705983);a=md5_ff(a,b,c,d,x[i+8],7,1770035416);d=md5_ff(d,a,b,c,x[i+9],12,-1958414417);c=md5_ff(c,d,a,b,x[i+10],17,-42063);b=md5_ff(b,c,d,a,x[i+11],22,-1990404162);a=md5_ff(a,b,c,d,x[i+12],7,1804603682);d=md5_ff(d,a,b,c,x[i+13],12,-40341101);c=md5_ff(c,d,a,b,x[i+14],17,-1502002290);b=md5_ff(b,c,d,a,x[i+15],22,1236535329);a=md5_gg(a,b,c,d,x[i+1],5,-165796510);d=md5_gg(d,a,b,c,x[i+6],9,-1069501632);c=md5_gg(c,d,a,b,x[i+11],14,643717713);b=md5_gg(b,c,d,a,x[i+0],20,-373897302);a=md5_gg(a,b,c,d,x[i+5],5,-701558691);d=md5_gg(d,a,b,c,x[i+10],9,38016083);c=md5_gg(c,d,a,b,x[i+15],14,-660478335);b=md5_gg(b,c,d,a,x[i+4],20,-405537848);a=md5_gg(a,b,c,d,x[i+9],5,568446438);d=md5_gg(d,a,b,c,x[i+14],9,-1019803690);c=md5_gg(c,d,a,b,x[i+3],14,-187363961);b=md5_gg(b,c,d,a,x[i+8],20,1163531501);a=md5_gg(a,b,c,d,x[i+13],5,-1444681467);d=md5_gg(d,a,b,c,x[i+2],9,-51403784);c=md5_gg(c,d,a,b,x[i+7],14,1735328473);b=md5_gg(b,c,d,a,x[i+12],20,-1926607734);a=md5_hh(a,b,c,d,x[i+5],4,-378558);d=md5_hh(d,a,b,c,x[i+8],11,-2022574463);c=md5_hh(c,d,a,b,x[i+11],16,1839030562);b=md5_hh(b,c,d,a,x[i+14],23,-35309556);a=md5_hh(a,b,c,d,x[i+1],4,-1530992060);d=md5_hh(d,a,b,c,x[i+4],11,1272893353);c=md5_hh(c,d,a,b,x[i+7],16,-155497632);b=md5_hh(b,c,d,a,x[i+10],23,-1094730640);a=md5_hh(a,b,c,d,x[i+13],4,681279174);d=md5_hh(d,a,b,c,x[i+0],11,-358537222);c=md5_hh(c,d,a,b,x[i+3],16,-722521979);b=md5_hh(b,c,d,a,x[i+6],23,76029189);a=md5_hh(a,b,c,d,x[i+9],4,-640364487);d=md5_hh(d,a,b,c,x[i+12],11,-421815835);c=md5_hh(c,d,a,b,x[i+15],16,530742520);b=md5_hh(b,c,d,a,x[i+2],23,-995338651);a=md5_ii(a,b,c,d,x[i+0],6,-198630844);d=md5_ii(d,a,b,c,x[i+7],10,1126891415);c=md5_ii(c,d,a,b,x[i+14],15,-1416354905);b=md5_ii(b,c,d,a,x[i+5],21,-57434055);a=md5_ii(a,b,c,d,x[i+12],6,1700485571);d=md5_ii(d,a,b,c,x[i+3],10,-1894986606);c=md5_ii(c,d,a,b,x[i+10],15,-1051523);b=md5_ii(b,c,d,a,x[i+1],21,-2054922799);a=md5_ii(a,b,c,d,x[i+8],6,1873313359);d=md5_ii(d,a,b,c,x[i+15],10,-30611744);c=md5_ii(c,d,a,b,x[i+6],15,-1560198380);b=md5_ii(b,c,d,a,x[i+13],21,1309151649);a=md5_ii(a,b,c,d,x[i+4],6,-145523070);d=md5_ii(d,a,b,c,x[i+11],10,-1120210379);c=md5_ii(c,d,a,b,x[i+2],15,718787259);b=md5_ii(b,c,d,a,x[i+9],21,-343485551);a=safe_add(a,olda);b=safe_add(b,oldb);c=safe_add(c,oldc);d=safe_add(d,oldd)}
return Array(a,b,c,d)}
function md5_cmn(q,a,b,x,s,t){return safe_add(bit_rol(safe_add(safe_add(a,q),safe_add(x,t)),s),b)}
function md5_ff(a,b,c,d,x,s,t){return md5_cmn((b&c)|((~b)&d),a,b,x,s,t)}
function md5_gg(a,b,c,d,x,s,t){return md5_cmn((b&d)|(c&(~d)),a,b,x,s,t)}
function md5_hh(a,b,c,d,x,s,t){return md5_cmn(b^c^d,a,b,x,s,t)}
function md5_ii(a,b,c,d,x,s,t){return md5_cmn(c^(b|(~d)),a,b,x,s,t)}
function safe_add(x,y){var lsw=(x&0xFFFF)+(y&0xFFFF),msw=(x>>16)+(y>>16)+(lsw>>16);return(msw<<16)|(lsw&0xFFFF)}
function bit_rol(num,cnt){return(num<<cnt)|(num>>>(32-cnt))};

var storage = {
	setId: function (id) {
		if (id !== "undefined" && id !== "") {
			this.id = "_" + id
		}
		this.db = localStorage;
		this.privateKeys = ['privateSetup', 'dialBoxes', 'skins'];
		this.relative = true;
	},
	id: '',
	db: localStorage,
	privateKeys: ['privateSetup', 'dialBoxes', 'skins'],
	relative: true,
	get: function (key, isJson) {
		key = (this.relative && this.privateKeys.indexOf(key) > -1) ? key + this.id : key;
		try {
			return isJson === true ? JSON.parse(this.db.getItem(key)) : this.db.getItem(key)
		} catch (err) {
			return null
		}
	},
	set: function (key, value, isJson) {
		key = (this.relative && this.privateKeys.indexOf(key) > -1) ? key + this.id : key;
		try {
			if (isJson === true) {
				this.db.setItem(key, JSON.stringify(value))
			} else {
				this.db.setItem(key, value)
			}
		} catch (err) {
			console.log(err)
		}
	},
	remove: function (key) {
		key = (this.relative && this.privateKeys.indexOf(key) > -1) ? key + this.id : key;
		try {
			this.db.removeItem(key)
		} catch (err) {
			console.log(err)
		}
	},
	clear: function (keylist) {
		var self = this;
		try {
			if (keylist instanceof Array) {
				$.each(keylist, function (i, n) {
					self.remove(n)
				})
			}
		} catch (err) {
			console.log(err)
		}
	}
};

var ui_locale = "zh_CN";
var officialDomain = "weidunewtab.com";
var iframeDomain = "www.94994.com";
var urlImg = "http://hao." + officialDomain + "/";
var _langPre = ui_locale;
var isApp = false;
var _config = {
version:'4.7.9',
dataVersion:"4.0",
lang:"zh_CN",
oauthType:['sina','qqwb','qq','taobao','google','facebook','twitter'],
cacheKeys:['dialBoxes','privateSetup','skins','setup','classifications','usedWallpaper','iframeDialbox','version','dataVersion'],
dialBoxes:{
normal:[{
"title":getI18nMsg('quickSearchAppTitle'),
"img":"app/quickSearch/img/logo.png",
"isApp":"quickSearch"
},{
"title":"百度",
"url":"www.baidu.com"
},{
"title":"淘宝",
"url":"www.taobao.com"
},{
"title":"京东",
"url":"www.jd.com"
},{
"title":"爱淘宝",
"url":"ai.taobao.com"
},{
"title":"亚马逊",
"url":"www.amazon.cn"
},{
"title":"天猫",
"url":"www.tmall.com"
},{
"title":"当当",
"url":"www.dangdang.com"
},{
"title":"携程",
"url":"www.ctrip.com"
},{
"title":"1号店",
"url":"www.yhd.com"
},{
"title":"5336.com",
"url":"www.5336.com"
},{
"title":"QQ空间",
"url":"qzone.qq.com"
},{
"title":"新浪微博",
"url":"weibo.com"
},{
"title":"易迅",
"url":"www.yixun.com"
},{
"title":"优酷",
"url":"www.youku.com"
},{
"title":"苏宁易购",
"url":"www.suning.com"
},{
"title":"网易",
"url":"www.163.com"
},{
"title":"唯品会",
"url":"www.vip.com"
},{
"title":"凤凰网",
"url":"www.ifeng.com"
},{
"title":"人人网",
"url":"www.renren.com"
},{
"title":"聚美优品",
"url":"www.jumei.com"
},{
"title":"Webstore",
"url":"chrome.google.com/webstore/?t=http://webstore.google.com"
},{
"title":getI18nMsg('cloudAppTitle'),
"img":"js/plugin/cloud/img/logo.png",
"isApp":"cloud",
"isFixed":true
}
],
quick:[{
"title":getI18nMsg('classificationAppTitle'),
"img":"js/plugin/classification/img/logo.png",
"isApp":"classification"
},{
"title":getI18nMsg('siteNavAppTitle'),
"img":"app/siteNav/img/logo.png",
"isApp":"siteNav"
},{
"title":getI18nMsg('skinsAppTitle'),
"img":"js/plugin/skins/img/logo.png",
"isApp":"skins"
},{
"title":getI18nMsg('oNewtabTitle'),
"img":"js/plugin/app/img/skin_0/oNewtab.png",
"isApp":"oNewtab"
},{
"title":getI18nMsg('extensionsAppTitle'),
"img":"js/plugin/extensions/img/logo.png",
"isApp":"extensions"
},{
"title":getI18nMsg('bookmarksAppTitle'),
"img":"js/plugin/bookmarks/img/logo.png",
"isApp":"bookmarks"
},{
"title":getI18nMsg('setupAppTitle'),
"img":"js/plugin/setup/img/logo.png",
"isApp":"setup",
"isFixed":true
}
]
},
apps:[{
"id":"quickSearch",
"title":getI18nMsg('quickSearchAppTitle'),
"img":"app/quickSearch/img/logo.png"
},{
"id":"skins",
"title":getI18nMsg('skinsAppTitle'),
"img":"js/plugin/skins/img/logo.png"
},{
"id":"classification",
"title":getI18nMsg('classificationAppTitle'),
"img":"js/plugin/classification/img/logo.png"
},{
"id":"cloud",
"title":getI18nMsg('cloudAppTitle'),
"img":"js/plugin/cloud/img/logo.png",
"isFixed":true
},{
"id":"setup",
"title":getI18nMsg('setupAppTitle'),
"img":"js/plugin/setup/img/logo.png",
"isFixed":true
},{
"id":"bookmarks",
"title":getI18nMsg('bookmarksAppTitle'),
"img":"js/plugin/bookmarks/img/logo.png"
},{
"id":"lastVisited",
"title":getI18nMsg('lastVisitedAppTitle'),
"img":"js/plugin/lastVisited/img/logo.png"
},{
"id":"extensions",
"title":getI18nMsg('extensionsAppTitle'),
"img":"js/plugin/extensions/img/logo.png"
},{
"id":"siteNav",
"title":getI18nMsg('siteNavAppTitle'),
"img":"app/siteNav/img/logo.png"
},{
"id":"tools",
"title":getI18nMsg('toolsAppTitle'),
"img":"app/tools/img/logo.png"
},{
"id":"oDownloads",
"title":getI18nMsg('oDownloadsTitle'),
"img":"js/plugin/app/img/skin_0/oDownloads.png"
},{
"id":"oBookmarks",
"title":getI18nMsg('oBookmarksTitle'),
"img":"js/plugin/app/img/skin_0/oBookmarks.png"
},{
"id":"oExtensions",
"title":getI18nMsg('oExtensionsTitle'),
"img":"js/plugin/app/img/skin_0/oExtensions.png"
},{
"id":"oHistory",
"title":getI18nMsg('oHistoryTitle'),
"img":"js/plugin/app/img/skin_0/oHistory.png"
},{
"id":"oNewtab",
"title":getI18nMsg('oNewtabTitle'),
"img":"js/plugin/app/img/skin_0/oNewtab.png"
}
],
skins:{
skin_cloud:{
style:{
"background":{
"backgroundColor":"#0866A4",
"backgroundImage":"url(img/skin_0/defaultBg.svg)"
}
}
}
},
weather:{
city:'',
cityID:'',
isAuto:false,
weather:'',
calendar:'',
tempUnit:ui_locale == 'zh_CN' ? 'C' :'F',
message:'',
messageID:0,
dateline:''
},
oauthData:{},
oauthId:"",
oauthKey:"",
oauthCode:"",
oauthSource:"",
msgid:0,
openSwitch:true,
contextMenusSwitch:true,
noticeID:0,
notificationID:0,
OTime:0,
STime:0,
MTime:0,
code:'',
ip:'',
lunarCalendar:'',
bookMarksOpenQueue:[],
wallpaper:{},
usedWallpaper:[],
iframeDialbox:[],
cId:'',
classifications:[{
"id":"shopping",
"title":getI18nMsg("classificationShopping"),
"logo":urlImg + "classification/images/4.png",
"dataUrl":urlImg + "rssData/index.php?ui_locale=" + ui_locale + "&name=shopping",
"LTime":0
},{
"id":"game",
"title":getI18nMsg("classificationGame"),
"logo":urlImg + "classification/images/1.png",
"dataUrl":urlImg + "rssData/index.php?ui_locale=" + ui_locale + "&name=game",
"LTime":0
}
],
dialBoxPage:1,
privateSetup:{
dialBoxNum:12,
dialBoxOpacity:1,
dialBoxSpacing:30,
dialBoxWidth:240,
dialBoxHeight:135,
dialBoxRadius:4,
dialBoxMaxTop:'auto',
dialBoxQBCWidth:1000,
dialBoxTitleSwitch:false,
dialBoxCloudBoxSwitch:true,
dialBoxPageSwitcher:false,
dialBoxPage3DSwitcher:false,
dialBoxQuickSwitcher:false,
targetSwitch:true,
style:{
background:{
"backgroundRepeat":"no-repeat",
"backgroundPosition":"center",
"backgroundSize":"100% 100%"
}
},
skin:"skin_cloud",
searchSite:ui_locale == "zh_CN" ? 'baidu' :'google',
BgAutoTime:0,
BgChangeTime:0
}
};

var screenDialboxOptions = {
"default":{
"spacing":30,
"width":240,
"height":135,
"maxTop":'auto',
"QBContainerWidth":1000
},
"800*600":{
"spacing":20,
"width":130,
"height":70,
"maxTop":30,
"QBContainerWidth":800
},
"1024*768":{
"spacing":20,
"width":195,
"height":110,
"maxTop":80,
"QBContainerWidth":940
},
"1152*864":{
"spacing":30,
"width":195,
"height":110,
"maxTop":90,
"QBContainerWidth":1040
},
"1280*600":{
"spacing":20,
"width":200,
"height":90,
"maxTop":40,
"QBContainerWidth":1040
},
"1280*720":{
"spacing":30,
"width":215,
"height":120,
"maxTop":60,
"QBContainerWidth":1040
},
"1280*768":{
"spacing":30,
"width":215,
"height":120,
"maxTop":70,
"QBContainerWidth":1040
},
"1280*800":{
"spacing":30,
"width":215,
"height":120,
"maxTop":70,
"QBContainerWidth":1040
},
"1280*960":{
"spacing":30,
"width":215,
"height":140,
"maxTop":80,
"QBContainerWidth":1040
},
"1280*1024":{
"spacing":34,
"width":215,
"height":140,
"maxTop":110,
"QBContainerWidth":1040
},
"1360*768":{
"spacing":30,
"width":215,
"height":120,
"maxTop":60,
"QBContainerWidth":1040
},
"1366*768":{
"spacing":30,
"width":215,
"height":120,
"maxTop":60,
"QBContainerWidth":1040
},
"1440*900":{
"spacing":30,
"width":240,
"height":135,
"maxTop":110,
"QBContainerWidth":1000
},
"1400*1050":{
"spacing":40,
"width":240,
"height":140,
"maxTop":110,
"QBContainerWidth":1040
},
"1600*900":{
"spacing":30,
"width":240,
"height":135,
"maxTop":160,
"QBContainerWidth":1040
},
"1680*1050":{
"spacing":30,
"width":260,
"height":145,
"maxTop":130,
"QBContainerWidth":1040
},
"1920*1080":{
"spacing":40,
"width":285,
"height":160,
"maxTop":160,
"QBContainerWidth":1240
}
};

var screenWidth = window.screen.width, screenHeight = window.screen.height, temp1, temp2;
temp1 = screenDialboxOptions[screenWidth + "*" + screenHeight];
if (temp1) {
	temp2 = _config.privateSetup;
	if (temp1.num) {
		temp2.dialBoxNum = temp1.num
	}
	temp2.dialBoxWidth = temp1.width;
	temp2.dialBoxHeight = temp1.height;
	temp2.dialBoxMaxTop = temp1.maxTop;
	temp2.dialBoxSpacing = temp1.spacing;
	temp2.dialBoxQBCWidth = temp1.QBContainerWidth
}

var PDI = {
	get: function (part, key) {
		var config = storage.get(part, true);
		if (config == null || config.length == 0 || (key && typeof config[key] == 'undefined')) {
			if (part in _config) {
				config = _config[part]
			} else {
				config = _config
			}
		}
		if (!key) {
			return config
		}
		return config[key]
	},
	set: function (part, key, value, data) {
		if (!data) {
			data = storage.get(part, true) || {}
		}
		if (key) {
			data[key] = value
		} else {
			data = value
		}
		storage.set(part, data, true)
	},
	length: function (data) {
		if (!data || !(data.length > 0)) {
			return 0
		}
		return data.length
	},
	getSkins: function () {
		var skins = PDI.get('skins');
		return {skin_cloud: skins.skin_cloud || objClone(_config.skins.skin_cloud)}
	},
	getSkin: function (part, key) {
		var data = this.getSkins(), p = data[part];
		if (!p) {
			return ''
		}
		if (!(key in p)) {
			p = _config.skins[part];
			return (key in p) ? p[key] : ''
		}
		return p[key]
	},
	setSkin: function (part, key, value, data) {
		if (part === 'skin_cloud') {
			if (!data) {
				data = storage.get('skins', true) || {}
			}
			(data[part] || (data[part] = {}))[key] = value;
			storage.set("skins", data, true)
		}
	},
	getStyle: function (part, key) {
		var data = PDI.get('privateSetup', 'style');
		if (!key) {
			return data[part] || _config.privateSetup.style[part]
		}
		if ((data = data[part]) && typeof (data = data[key]) !== 'undefined') {
			return data
		}
		return _config.privateSetup.style[part][key]
	},
	setStyle: function (part, key, value, data) {
		if (!data) {
			data = storage.get('privateSetup', true) || {}
		}
		var data2 = data.style;
		if (!data2) {
			data2 = (data.style = {})[part] = {}
		} else if (!data2[part]) {
			data2 = data2[part] = {}
		}
		data2[key] = value;
		storage.set('privateSetup', data, true)
	},
	insertDialbox: function (type, value, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		data.push(value);
		PDI.set('dialBoxes', type, data);
		oauth.updateMsgId();
		oauth.synchronize()
	},
	updateDialbox: function (type, index, value, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		data[index] = value;
		PDI.set('dialBoxes', type, data)
	},
	removeDialbox: function (type, index, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		if (index < this.length(data)) {
			data[index].isDel = true;
			PDI.set('dialBoxes', type, data);
			oauth.updateMsgId();
			oauth.synchronize()
		}
	},
	destoryDialbox: function (type, index, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		if (index < this.length(data)) {
			data.splice(index, 1)
		}
		PDI.set('dialBoxes', type, data)
	},
	changeDialbox: function (type, fromIndex, toIndex, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		if (fromIndex < 0 || fromIndex >= this.length(data) || toIndex < 0 || toIndex >= this.length(data)) {
			return false
		}
		var tmp = data[toIndex];
		data[toIndex] = data[fromIndex];
		data[fromIndex] = tmp;
		PDI.set('dialBoxes', type, data)
	},
	moveDialbox: function (fromType, toType, fromIndex, toIndex, data) {
		if (fromType == toType) {
			var type = fromType, tmp;
			if (!data) {
				data = PDI.get('dialBoxes', type)
			}
			tmp = data[fromIndex];
			if (!tmp || toIndex < 0 || toIndex >= this.length(data)) {
				return false
			}
			this.destoryDialbox(type, fromIndex, data);
			data.splice(toIndex, 0, tmp);
			PDI.set('dialBoxes', type, data)
		} else {
			if (!data) {
				data = PDI.get('dialBoxes');
			}
			var fromData = data[fromType], toData = data[toType], tmp;
			tmp = fromData[fromIndex];
			if (!tmp || toIndex < 0) {
				return false
			}
			this.destoryDialbox(fromType, fromIndex, fromData);
			toData.splice(toIndex, 0, tmp);
			PDI.set('dialBoxes', toType, toData)
		}
		oauth.updateMsgId();
		oauth.synchronize()
	},
	appendDialbox: function (type, toIndex, value, data) {
		if (!data) {
			data = PDI.get('dialBoxes', type)
		}
		data.splice(toIndex, 0, value);
		PDI.set('dialBoxes', type, data);
		oauth.updateMsgId();
		oauth.synchronize()
	}
};

var oauth = {
	oauthId: false,
	oauthKey: '',
	oauthCode: false,
	oauthSource: false,
	oauthApiUrl: urlImg + 'oauth/ajax.php?rnd=' + Date.now(),
	synDataApiUrl: urlImg + 'weidu/wc.json.php',
	synDataKey: 'oauthData',
	init: function (syn) {
		var self = this;
		self.oauthKey = PDI.get('setup', 'oauthKey');
		if (!(self.oauthId && self.oauthCode && self.oauthSource)) { return; }
		self.oauthApiUrl = self.oauthApiUrl + "&oauthKey=" + self.oauthKey;
		syn = (syn === true);
		$.get(self.oauthApiUrl, function (data) {
			self.oauthId = '';
			self.oauthCode = '';
			self.oauthSource = '';
			if (data) {
				data = JSON.parse(data);
				self.oauthId = data.sign + data.uid;
				self.oauthCode = data.name;
				self.oauthSource = data.sign == '' ? 'google' : data.sign
			} else if (PDI.get('setup', 'oauthId') != "") {
				showNotice(getI18nMsg('loggedOut'))
			}
			PDI.set('setup', 'oauthId', self.oauthId);
			PDI.set('setup', 'oauthCode', self.oauthCode);
			PDI.set('setup', 'oauthSource', self.oauthSource);
			if (!self.oauthId || !self.oauthCode) {
			} else if (syn) {
				self.download()
			} else {
				self.compareMsgId(function () {
					setTimeout(function () {
						window.location.hash = "#synchronize";
						window.location.reload(true)
					}, 200)
				})
			}
		});
	},
	download: function () {
		var self = this;
		var url = self.synDataApiUrl + '?e=' + self.oauthId + '&ver=' + ver + '&dataVersion=' + _config.dataVersion;
		$.post(url, function (result) {
			if (typeof(result) == 'string') {
				if (result.substring(0, 5) == 'ERROR') {
					if (result.indexOf('ERROR_FILE_MSGID_') == 0) {
						PDI.set('setup', 'msgid', parseInt(result.replace('ERROR_FILE_MSGID_', '')))
					}
					if (window.location.href != window.location.protocol + '//' + window.location.hostname + window.location.pathname) {
						window.location.hash = "";
						window.location.href = window.location.protocol + '//' + window.location.hostname + window.location.pathname
					}
					setTimeout(function () {
						window.location.reload(true)
					}, 200);
					return
				}
			}
			if (!self.save(result)) {
				alert(getI18nMsg('oauthDownDataVersionError'))
			}
			if (window.location.href != window.location.protocol + '//' + window.location.hostname + window.location.pathname) {
				window.location.hash = "";
				window.location.href = window.location.protocol + '//' + window.location.hostname + window.location.pathname
			}
			setTimeout(function () {
				window.location.reload(true)
			}, 200)
		})
	},
	save: function (result) {
		var returnStatus = true;
		if (typeof result == 'object') {
			var self = this;
			var urlImgList = ['http://hao.weidunewtab.com/', 'http://hao.newtabplus.com/', 'http://www.94994.com/', 'http://en.94994.com/'];
			var curMsgId = PDI.get('setup', 'msgid');
			var curOauthKey = PDI.get('setup', 'oauthKey');
			if (result.dataVersion && JSON.parse(result.dataVersion) && _config.dataVersion < JSON.parse(result.dataVersion)) {
				returnStatus = false
			} else {
				var curOTime = PDI.get('setup', 'OTime');
				var curMTime = PDI.get('setup', 'MTime');
				var classifications = PDI.get("classifications");
				storage.relative = false;
				storage.clear(['dialBoxes', 'setup', 'privateSetup', 'skins', 'weather', 'classifications', 'oauthData', 'usedWallpaper', 'iframeDialbox']);
				$.each(classifications, function (i, n) {
					storage.clear(['privateSetup_' + n.id, 'dialBoxes_' + n.id, 'weather_' + n.id, 'skins_' + n.id])
				});
				$.each(result, function (k, v) {
					if (k == "cache" || k == "usedWallpaper" || k == "iframeDialbox" || k == "setup" || k == "classifications" || k.indexOf("privateSetup") > -1) {
						PDI.set(k, '', JSON.parse(v))
					} else if (k.indexOf('dialBoxes') > -1 || k.indexOf('skins') > -1) {
						$.each(urlImgList, function (i, n) {
							if (urlImg != n) {
								v = v.replace(new RegExp(n, 'g'), urlImg)
							}
						});
						var v = JSON.parse(v);
						PDI.set(k, '', v)
					}
				});
				storage.relative = true;
				PDI.set('setup', 'openSwitch', true);
				if (PDI.get('setup', 'OTime') == 0) {
					PDI.set('setup', 'OTime', curOTime)
				}
				returnStatus = true
			}
			result['msgid'] = result['msgid'] != null ? parseInt(result['msgid']) : curMsgId;
			result['msgid'] = result['msgid'] >= curMsgId ? result['msgid'] : curMsgId;
			PDI.set('setup', 'msgid', result['msgid']);
			PDI.set('setup', 'oauthKey', curOauthKey)
		} else {
			showNotice(getI18nMsg('downError'));
			returnStatus = false
		}
		return returnStatus
	},
	compareMsgId: function (gt, lt) {
		var self = this;
		var url = self.synDataApiUrl + '?e=' + self.oauthId;
		if ((gt || lt) || self.oauthId && self.oauthCode) {
			$.post(url, function (result) {
				if (typeof(result) == 'string' && result.substring(0, 5) != 'ERROR') {
					var msgid = parseInt(PDI.get('setup', 'msgid'));
					result = JSON.parse(result);
					if (result.msgid > msgid) {
						if (gt)	gt()
					} else if (lt) {
						lt()
					}
				}
			})
		} else if (lt) {
			lt()
		}
	},
	upload: function (fn) {
		var self = this;
		fn = typeof fn == 'function' ? fn : null;
		fn = fn || function () {};
		if (self.backup()) {
			var oauthData = PDI.get(self.synDataKey);
			var data = oauthData[self.oauthId];
			data['email'] = self.oauthId;
			data['msgid'] = parseInt(PDI.get('setup', 'msgid'));
			data['ver'] = _config.version;
			$.post(self.synDataApiUrl, data, function (result) {
				if (result.substring(0, 5) != 'ERROR') {}
				else if (result == "ERROR_MSGID") {
					if (parseInt(Math.random() * (100 - 1) + 1) % 3 == 1) {
						showNotice(getI18nMsg('oauthSynMsgidError'))
					}
				} else if (result == "ERROR_DATAVERSION" || result == "ERROR_DATAVERSIONISNULL") {
					showNotice(getI18nMsg('oauthSynDataVersionError'))
				}
				fn()
			})
		}
	},
	backup: function () {
		if (!(oauth.oauthId && oauth.oauthCode)) {
			showNotice(getI18nMsg('logining'));
			return false
		}
		var self = this, oauthData = PDI.get(self.synDataKey);
		oauthData[self.oauthId] = {};
		var _cacheKeys = [], _classifications = PDI.get("classifications");
		$.each(_config.cacheKeys, function (k, v) {
			if (storage.privateKeys.indexOf(v) > -1) {
				$.each(_classifications, function (p, q) {
					if (storage.get(v + "_" + q.id, true)) {
						_cacheKeys.push(v + "_" + q.id)
					}
				})
			}
			_cacheKeys.push(v)
		});
		storage.relative = false;
		for (var i = 0, k, skinsStorage; i < _cacheKeys.length; i++) {
			k = _cacheKeys[i];
			if (!k.startsWith('skins')) {
				oauthData[self.oauthId][k] = JSON.stringify(PDI.get(k));
				continue
			} else if (skinsStorage = storage.get(k, true)) {
				var skinCloud = skinsStorage.skin_cloud, skinsJson = {};
				if (skinCloud) {
					skinsJson.skin_cloud = skinCloud
				}
				oauthData[self.oauthId][k] = JSON.stringify(skinsJson)
			}
		}
		storage.relative = true;
		PDI.set(self.synDataKey, '', oauthData)
		return true
	},
	updateMsgId: function (msgid) {
		if (typeof msgid == 'undefined') {
			msgid = parseInt(PDI.get('setup', 'msgid')) + 1
		}
		PDI.set('setup', 'msgid', msgid)
	},
	synchronize: function (fn) {
		var self = this;
		if (self.oauthId && self.oauthCode) {
			self.upload(fn)
		}
	},
	clear: function () {
		var self = this;
		var msgid = PDI.get("setup", "msgid") + 1;
		var oauthKey = PDI.get("setup", "oauthKey");
		var noticeID = PDI.get("setup", "noticeID");
		var OTime = PDI.get('setup', 'OTime');
		var MTime = PDI.get('setup', 'MTime');
		var classifications = PDI.get("classifications");
		if (self.oauthId && self.oauthCode) {
			var data = {};
			data['email'] = self.oauthId;
			data['msgid'] = msgid;
			$.post(self.synDataApiUrl, data, function (result) {
				if (result.substring(0, 5) == 'ERROR') {
					return;
				}
				storage.relative = false;
				storage.clear(['dialBoxes', 'setup', 'privateSetup', 'skins', 'weather', 'classifications', 'oauthData', 'usedWallpaper', 'iframeDialbox']);
				PDI.set('setup', 'msgid', msgid);
				PDI.set('setup', 'oauthKey', oauthKey);
				PDI.set('setup', 'noticeID', noticeID);
				PDI.set('setup', 'OTime', OTime);
				PDI.set('setup', 'MTime', MTime);
				$.each(classifications, function (i, n) {
					storage.clear(['privateSetup_' + n.id, 'dialBoxes_' + n.id, 'weather_' + n.id, 'skins_' + n.id])
				});
				storage.relative = true;
				window.location.reload(true)
			})
		} else {
			storage.relative = false;
			storage.clear(['dialBoxes', 'setup', 'privateSetup', 'skins', 'weather', 'classifications', 'oauthData', 'usedWallpaper', 'iframeDialbox']);
			PDI.set('setup', 'msgid', msgid);
			PDI.set('setup', 'oauthKey', oauthKey);
			PDI.set('setup', 'noticeID', noticeID);
			PDI.set('setup', 'OTime', OTime);
			PDI.set('setup', 'MTime', MTime);
			$.each(classifications, function (i, n) {
				storage.clear(['privateSetup_' + n.id, 'dialBoxes_' + n.id, 'weather_' + n.id, 'skins_' + n.id])
			});
			storage.relative = true;
			window.location.reload(true)
		}
	}
};

var _dialogDown = false, _dialogX = 0, _dialogY = 0, _dialogCx = 0, _dialogCy = 0;
$(document).unbind("keyup.dialogEsc").bind('keyup.dialogEsc', function (e) {
	if (e.keyCode == 27) {
		if ($('.dialog-visible').length > 0) {
			$('.dialog-visible').find('.close').get(0).click()
		}
	}
});
$(document).bind('contextmenu', function (e) {
	if (!isContainsClass(e.target, 'dialog')) {
		if ($('.dialog-visible').length > 0) {
			$('.dialog-visible').find('.close').get(0).click()
		}
		if (typeof _minSearchForce == "undefined" || _minSearchForce == false) {
			return false
		}
	}
});
$.dialog = function (opt) {
	return new _Dialog('', opt)
};
var _Dialog = function Dialog(el, opt) {
	var self = this;
	$.each(opt, function (i, n) {
		self[i] = n
	});
	if (el == '') {
		if (typeof self.callback.initialize == 'function') {
			self.callback.initialize.call(self)
		}
	} else {
		self.eventObj = el;
		self.eventObj.unbind(self.eventName).bind(self.eventName, function () {
			if (typeof self.callback.initialize == 'function') {
				self.callback.initialize.call(self, $(this))
			}
		})
	}
};
_Dialog.prototype = {
	id: "",
	caption: "",
	content: "",
	eventObj: "",
	eventName: "click",
	callback: {},
	isLock: false,
	isDestory: false,
	isFollow: false,
	followObj: "",
	animate: "",
	style: "",
	bottom: 45,
	hideClose: false,
	zIndex: 100,
	lock: function () {
		var self = this;
		if (!self.isLock) {
			return
		}
		var maskdiv = $('<div class="dialogMask"></div>').css({
				"zIndex": self.zIndex
			});
		$("body").append(maskdiv);
		DBOX.container.css("opacity", "0.2")
	},
	unlock: function () {
		$("body").find(".dialogMask").remove();
		DBOX.container.css("opacity", "")
	},
	position: function () {
		var self = this;
		var dbox = $("#" + self.id);
		if (!self.isFollow) {
			if (self.style != '') {
				dbox.css(this.style)
			} else {
				dbox.css({
					"left": parseInt((document.body.offsetWidth - dbox[0].offsetWidth) / 2) + "px",
					"top": parseInt((document.body.offsetHeight - self.bottom - dbox[0].offsetHeight) / 2) + "px"
				})
			}
		}
		dbox.css({
			"zIndex": this.zIndex + 1
		})
	},
	follow: function () {
		var self = this;
		if (!self.isFollow || (self.eventObj == '' && self.followObj == '')) {
			return
		}
		if (self.followObj == "") {
			var coffset = self.eventObj.offset();
			var width = parseInt(self.eventObj.get(0).offsetWidth / 2)
		} else {
			var coffset = self.followObj.offset();
			var width = parseInt(self.followObj.get(0).offsetWidth / 2)
		}
		var dialogCoffset = {};
		dialogCoffset['left'] = coffset.left - 30;
		dialogCoffset['top'] = coffset.top + 40;
		dialogCoffset['right'] = document.body.offsetWidth - coffset.left - width - 42;
		dialogCoffset['bottom'] = document.body.offsetHeight - coffset.top + 10;
		var _tmpFollow = self.isFollow.split(' ');
		$.each(_tmpFollow, function (i, n) {
			$("#" + self.id).css(n, dialogCoffset[n] + 'px')
		})
	},
	drag: function (dbox) {
		var self = this;
		if (dbox.find(".dragArea").length > 0) {
			dbox.find(".dragArea").unbind('mousedown.dialog').bind('mousedown.dialog', function (e) {
				if (_dialogDown == false && e.button != 2) {
					_dialogDown = true;
					if (_dialogDown) {
						_dialogX = e.pageX;
						_dialogY = e.pageY;
						var coffset = dbox.offset();
						_dialogCx = coffset.left;
						_dialogCy = coffset.top;
						dbox.find(".dragArea").css("cursor", "move")
					}
				}
			});
			$(document).unbind("mousemove.dialog").bind("mousemove.dialog", function (e) {
				if (_dialogDown) {
					var cLeft = _dialogCx - (_dialogX - e.pageX);
					var cTop = _dialogCy - (_dialogY - e.pageY);
					cTop = cTop < 0 ? 0 : cTop;
					dbox.css({
						"left": cLeft + "px",
						"top": cTop + "px"
					})
				}
			}).unbind("mouseup.dialog").bind("mouseup.dialog", function () {
				_dialogDown = false;
				dbox.find(".dragArea").css("cursor", "pointer")
			})
		}
	},
	undrag: function (dbox) {
		var self = this;
		if (dbox.find(".dragArea").length > 0) {
			_dialogDown = false;
			_dialogX = 0;
			_dialogY = 0;
			_dialogCx = 0;
			_dialogCy = 0;
			dbox.find(".dragArea").unbind('mousedown.dialog');
			$(document).unbind("mousemove.dialog").unbind("mouseup.dialog")
		}
	},
	show: function () {
		var self = this;
		if ($("#" + self.id).hasClass('dialog-visible')) {
			self.remove();
			return
		}
		var isCloseNum = self.closeAll();
		if ($("#" + self.id).length == 0) {
			if (this.caption == "") {
				var dbox = $('<div><button class="close' + (self.hideClose == true ? ' hide' : '') + '"></button><div class="main"></div></div>')
			} else {
				var dbox = $('<div><div class="head"><div class="title">' + this.caption + '</div><button class="close' + (self.hideClose == true ? ' hide' : '') + '"></button></div><div class="main"></div></div>')
			}
			dbox.find(".main").append(this.content);
			var iframe = dbox.find('iframe');
			var iframeUrl = iframe.attr('src');
			if (iframe.length > 0) {
				for (var i; i < iframe.length; i++) {
					$(iframe[i]).attr('src', 'about:blank');
					setTimeout(function () {
						$(iframe[i]).attr('src', iframeUrl)
					}, 0)
				}
			}
			dbox.addClass('dialog').attr('id', this.id);
			$("body").append(dbox);
			self.position();
			self.follow();
			dbox.find(".close").bind("click", function () {
				self.remove();
				return false
			})
		} else {
			var dbox = $("#" + this.id);
			self.position()
		}
		if (self.animate != "") {
			if (self.animate == "opacity") {
				dbox.css({
					"WebkitTransition": "opacity .2s ease-out"
				})
			} else {
				dbox.css({
					"WebkitTransition": "-webkit-transform .2s ease-out,opacity .2s ease-out",
					"WebkitTransformOrigin": self.animate
				})
			}
		}
		setTimeout(function () {
			self.lock();
			self.drag(dbox)
		}, 0);
		window.setTimeout(function () {
			dbox.addClass('dialog-visible');
			dbox.find('.close').get(0).focus()
		}, isCloseNum > 0 ? 210 : 10);
		window.setTimeout(function () {
			$(document).unbind('click').bind('click', function (e) {
				var targetObj = $(e.target);
				if (!isContains(e.target, dbox.get(0)) && !isContainsClass(e.target, "notice")) {
					self.remove();
					return false
				}
			})
		}, 0)
	},
	changeContent: function (content) {
		var self = this;
		var dbox = $("#" + self.id);
		if (dbox.length > 0) {
			self.content = content;
			dbox.find(".main").empty();
			dbox.find(".main").append(content);
			self.position();
			self.drag(dbox)
		}
	},
	remove: function () {
		var self = this;
		var dbox = $("#" + self.id);
		if (typeof self.callback.dialogClose == 'function') {
			self.callback.dialogClose.call(self)
		}
		self.undrag(dbox);
		dbox.removeClass('dialog-visible');
		setTimeout(function () {
			self.unlock()
		}, 0);
		$(document).unbind('click');
		if (self.isDestory) {
			setTimeout(function () {
				self.destory()
			}, 200)
		}
	},
	destory: function () {
		var self = this;
		var dbox = $("#" + self.id);
		dbox.remove()
	},
	closeAll: function () {
		var self = this;
		var dialogs = $('.dialog');
		var isCloseNum = 0;
		if (dialogs.length > 0) {
			for (var i = 0; i < dialogs.length; i++) {
				if ($(dialogs[i]).hasClass('dialog-visible')) {
					$(dialogs[i]).find('.close').get(0).click();
					isCloseNum++
				}
			}
		}
		return isCloseNum
	}
};

var _bookmarksDialogFun = "";
var app = {
	apps: {
		"weather": {
			"type": "immediate",
			"js": "app/weather/weather.js",
			"css": "app/weather/css/skin_0.css",
			"langVers": {
				"zh_CN": {
					"js": "app/weather/zh_CN/weather.js"
				}
			}
		},
		"classification": {
			"type": "immediate",
			"separate": true,
			"js": "js/plugin/classification/classification.js",
			"css": "js/plugin/classification/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				if (classification && classification.minClassificationSwitch == true) {
					classification.hideMinClassification(true)
				}
				dialogObj.changeContent(classification.init(true))
			},
			"init": function (targetObj, self, first) {
				if (typeof classification != "undefined") {
					classification.initClassificationApp(targetObj)
				}
				if (first) {
					$(document).unbind("keyup.classification").bind("keyup.classification", function (e) {
						if (typeof self.runedAppObjects.classification != "undefined") {
							if (e.keyCode == 192 && (typeof _minSearchForce == 'undefined' || !_minSearchForce)) {
								if ($('.dialog.dialog-visible').length == 0 && _edit === false) {
									self.runApp(targetObj, "classification")
								}
							}
						}
					})
				}
			},
			"run": function () {
				var classificationDialog = $.dialog({
						id: "classificationDialog",
						hideClose: true,
						style: {
							"position": "relative",
							"width": "100%",
							"height": "100%",
							"background": "rgba(0,0,0,0.8)",
							"boxShadow": "none",
							"borderRadius": "0"
						},
						content: '',
						animate: "opacity",
						callback: {
							dialogClose: function () {
								classification.isClear(3, true)
							}
						}
					});
				return classificationDialog
			}
		},
		"setup": {
			"js": "js/plugin/setup/setup.js",
			"css": "js/plugin/setup/css/skin_0.css",
			"run": function () {
				var setupDialog = $.dialog({
						id: "setupDialog",
						isLock: true,
						content: setup.init(),
						animate: "center center"
					});
				return setupDialog
			},
			"loadData": function (dialogObj, targetObj) {
				dialogObj.changeContent(setup.init(true))
			}
		},
		"lastVisited": {
			"js": "js/plugin/lastVisited/lastVisited.js",
			"css": "js/plugin/lastVisited/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				if (typeof chrome.history != "undefined") {
					chrome.history.search({
						text: '',
						maxResults: 100,
						startTime: (new Date()).getTime() - (4 * 24 * 3600 * 1000),
						endTime: (new Date()).getTime()
					}, function (data) {
						var lastVisitedContent = lastVisited.visitedTemplate(data);
						lastVisited.template(lastVisitedContent);
						if (typeof dialogObj != 'undefined') {
							dialogObj.changeContent(lastVisited.content)
						}
					})
				}
			},
			"run": function () {
				var lastVisitedDialog = $.dialog({
						id: "lastVisitedDialog",
						isLock: true,
						animate: "center center",
						content: '<div class="emptyLoading"><img src="/img/skin_0/loading.gif"></div>'
					});
				return lastVisitedDialog
			}
		},
		"bookmarks": {
			"js": "js/plugin/bookmarks/bookmarks.js",
			"css": "js/plugin/bookmarks/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				chrome.bookmarks.getTree(function (tree) {
					chrome.bookmarks.getRecent(30, function (recentTree) {
						bookmarks.template(tree, recentTree);
						if (typeof dialogObj != 'undefined') {
							dialogObj.changeContent(bookmarks.content);
							if (_bookmarksDialogFun) {
								clearTimeout(_bookmarksDialogFun)
							}
							try {
								$(".bookmarksContainer .bookMarksFolderItem a").each(function (i, n) {
									var itemUrl = $(n).attr("href");
									var faviconPath = 'chrome://favicon/size/16/' + itemUrl;
									var faviconImg = new Image();
									if (itemUrl) {
										faviconImg.onload = function () {
											$(n).css("backgroundImage", "url(" + faviconPath + ")")
										};
										faviconImg.src = faviconPath
									}
								})
							} catch (e) {}
						}
					})
				});
				_bookmarksDialogFun = setTimeout(function () {
						showNotice(getI18nMsg('loadingTimeout').replace('%s', getI18nMsg('360Error')));
						dialogObj.remove()
					}, 5000)
			},
			"run": function () {
				var bookmarksDialog = $.dialog({
						id: "bookmarksDialog",
						isLock: true,
						animate: "center center",
						content: '<div class="emptyLoading"><img src="/img/skin_0/loading.gif"></div>'
					});
				return bookmarksDialog
			}
		},
		"extensions": {
			"js": "js/plugin/extensions/extensions.js",
			"css": "js/plugin/extensions/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				chrome.management.getAll(function (_extensions) {
					extensions.template(_extensions);
					if (typeof dialogObj != 'undefined') {
						dialogObj.changeContent(extensions.content)
					}
				})
			},
			"run": function () {
				var extensionsDialog = $.dialog({
						id: "extensionsDialog",
						isLock: true,
						animate: "center center",
						content: '<div class="emptyLoading"><img src="/img/skin_0/loading.gif"></div>',
						callback: {
							dialogClose: function () {
								if (_isRefresh != false) {
									DBOX.getBoxes();
									DBOX.loadBoxes(DBOX.totalPage);
									_isRefresh = false
								}
							}
						}
					});
				return extensionsDialog
			}
		},
		"skins": {
			"js": "js/plugin/skins/skins.js",
			"css": "js/plugin/skins/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				if (typeof cloudWallpaper == 'undefined') {
					loadScript('js/plugin/skins/cloudWallpaper.js')
				}
				$(".skinsContainer").find(".bgAutoTime[automin]").removeClass("selected");
				if (PDI.get("privateSetup", "BgAutoTime") != "0") {
					$(".skinsContainer").find(".bgAutoTime[automin='" + PDI.get("privateSetup", "BgAutoTime") + "']").addClass("selected")
				} else {
					$(".skinsContainer").find(".bgAutoTime[automin='0']").addClass("selected")
				}
				$(".skinsContainer .moreSettingsContainer").hide()
			},
			"run": function () {
				var skinsDialog = $.dialog({
						id: "skinsDialog",
						isLock: true,
						animate: "center center",
						content: skins.init()
					});
				return skinsDialog
			}
		},
		"cloud": {
			"js": "js/plugin/cloud/cloud.js",
			"css": "js/plugin/cloud/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				if (typeof cloudApp == 'undefined') {
					loadScript('js/plugin/cloud/cloudApp.js')
				} else {
					cloudApp.init()
				}
				if (typeof cloudWebsite == 'undefined') {
					loadScript('js/plugin/cloud/cloudWebsite.js')
				} else {
					cloudWebsite.init()
				}
				if (typeof createWebsite == 'undefined') {
					loadScript('js/plugin/cloud/createWebsite.js', function () {
						if (targetObj.attr('url') != null && targetObj.attr('url') != "") {
							$('.cloudBody .menu').removeClass('hide').addClass('hide');
							$(".cloudHeader .cloudSwitch").text(getI18nMsg('cloudAppTitle'));
							$('.cloudBody .container').removeClass("show");
							$('.cloudBody .container.createWebsite').addClass("show");
							$('.cloudBody .aboutContainer').hide();
							$('.cloudBody .classificationsContainer').show();
							createWebsite.initClassificationsContainer();
							createWebsite.initWebsite(targetObj.attr('url'), targetObj.find('.boxTitle').text()
								, targetObj.find('.boxLogo').css('backgroundImage').replace("url(", "").replace(")", "").replace(/\"/g, "")
								, targetObj.hasClass('quick') ? 'quick' : 'normal', targetObj.attr('id'))
						} else {
							$('.cloudBody .menu').removeClass('hide');
							$(".cloudHeader .cloudSwitch").text(getI18nMsg('websiteAdd'));
							$('.cloudBody .container').removeClass("show");
							if ($('.cloudBody .navItem.selected').attr('category') != "myApps") {
								$('.cloudBody .container.websiteList').addClass("show")
							} else {
								$('.cloudBody .container.appList').addClass("show")
							}
							$('.cloudBody .aboutContainer').show();
							$('.cloudBody .classificationsContainer').hide();
							createWebsite.initClassificationsContainer();
							createWebsite.initWebsite()
						}
					})
				} else {
					if (targetObj.attr('url') != null && targetObj.attr('url') != "") {
						$('.cloudBody .menu').removeClass('hide').addClass('hide');
						$(".cloudHeader .cloudSwitch").text(getI18nMsg('cloudAppTitle'));
						$('.cloudBody .container').removeClass("show");
						$('.cloudBody .container.createWebsite').addClass("show");
						$('.cloudBody .aboutContainer').hide();
						$('.cloudBody .classificationsContainer').show();
						createWebsite.initClassificationsContainer();
						createWebsite.initWebsite(targetObj.attr('url'), targetObj.find('.boxTitle').text()
							, targetObj.find('.boxLogo').css('backgroundImage').replace("url(", "").replace(")", "").replace(/\"/g, "")
							, targetObj.hasClass('quick') ? 'quick' : 'normal', targetObj.attr('id'))
					} else {
						$('.cloudBody .menu').removeClass('hide');
						$(".cloudHeader .cloudSwitch").text(getI18nMsg('websiteAdd'));
						$('.cloudBody .container').removeClass("show");
						if ($('.cloudBody .navItem.selected').attr('category') != "myApps") {
							$('.cloudBody .container.websiteList').addClass("show")
						} else {
							$('.cloudBody .container.appList').addClass("show")
						}
						$('.cloudBody .aboutContainer').show();
						$('.cloudBody .classificationsContainer').hide();
						createWebsite.initClassificationsContainer();
						createWebsite.initWebsite()
					}
				}
			},
			"run": function () {
				var cloudDialog = $.dialog({
						id: "cloudDialog",
						isLock: true,
						animate: "center center",
						content: cloud.init(),
						callback: {
							dialogClose: function () {
								if (_isRefresh != false) {
									if (_isRefresh == "lastPage") {
										DBOX.getBoxes();
										DBOX.loadBoxes(DBOX.totalPage)
									} else if (_isRefresh == "curPage") {
										DBOX.init()
									} else if (_isRefresh == "remove") {
										setTimeout(function () {
											var updateOptions = createWebsite.isUpdate.split("_");
											if (updateOptions.length > 1) {
												$("." + updateOptions[0] + "Dialbox").find("#" + updateOptions[1] + "_" + updateOptions[2]).find('.boxClose').get(0).click()
											}
										}, 200)
									}
									_isRefresh = false
								}
							}
						}
					});
				return cloudDialog
			}
		},
		"quickSearch": {
			"type": "immediate",
			"js": "app/quickSearch/quickSearch.js",
			"css": "app/quickSearch/css/skin_0.css",
			"loadData": function (dialogObj, targetObj) {
				dialogObj.changeContent(quickSearch.init(true))
			},
			"init": function (targetObj, self, first) {
				quickSearch.initQuickSearchApp(targetObj)
			},
			"run": function () {
				var quickSearchDialog = $.dialog({
						id: "quickSearchDialog",
						isLock: true,
						animate: "center center",
						content: quickSearch.init(),
						callback: {
							dialogClose: function () {
								if ($('.appBox[appid="quickSearch"]').length > 0) {
									quickSearch.initQuickSearchApp($('.appBox[appid="quickSearch"]'))
								}
							}
						}
					});
				return quickSearchDialog
			}
		},
		"siteNav": {
			"js": "app/siteNav/siteNav.js",
			"css": "app/siteNav/css/skin_0.css",
			"run": function () {
				var siteNavDialog = $.dialog({
						id: "siteNavDialog",
						isLock: true,
						animate: "center center",
						content: siteNav.init()
					});
				return siteNavDialog
			}
		},
		"tools": {
			"js": "app/tools/tools.js",
			"css": "app/tools/css/skin_0.css",
			"run": function () {
				var toolsDialog = $.dialog({
						id: "toolsDialog",
						isLock: true,
						animate: "center center",
						content: tools.init()
					});
				return toolsDialog
			}
		}
	},
	loadedApps: [],
	loadedAppsReady: [],
	runedAppObjects: {},
	getAppConfigValue: function (appId, key) {
		var self = this;
		if ( typeof self.apps[appId]['langVers'] != "undefined"
			&& typeof self.apps[appId]['langVers'][ui_locale] != "undefined"
			&& typeof self.apps[appId]['langVers'][ui_locale][key] != "undefined") {
			return self.apps[appId]['langVers'][ui_locale][key]
		} else if (typeof self.apps[appId][key] != "undefined") {
			return self.apps[appId][key]
		}
		return false
	},
	loadJs: function (appId, fn) {
		var self = this;
		fn = fn || function () {};
		var jsUrl = self.getAppConfigValue(appId, 'js');
		if (jsUrl) {
			loadScript(jsUrl, function () {
				fn()
			})
		}
	},
	loadCss: function (appId) {
		var self = this;
		var cssUrl = self.getAppConfigValue(appId, 'css');
		if (cssUrl) {
			loadCss(cssUrl)
		}
	},
	loadApp: function (targetObj, appId) {
		var self = this;
		if (typeof self.apps[appId] != "undefined") {
			if (self.apps[appId]['type'] == 'immediate') {
				self.loadAppContent(targetObj, appId)
			} else {
				targetObj.unbind('mouseover').bind('mouseover', function () {
					self.loadAppContent(targetObj, appId)
				})
			}
		}
	},
	loadAppContent: function (targetObj, appId) {
		var self = this;
		if (self.loadedApps.indexOf(appId) == -1) {
			self.loadedApps.push(appId);
			self.loadCss(appId);
			setTimeout(function () {
				self.loadJs(appId, function () {
					self.loadedAppsReady.push(appId);
					self.runApp(targetObj, appId);
					if (typeof self.apps[appId]['init'] == "function") {
						self.apps[appId]['init'](targetObj, self, true)
					}
				})
			}, 0)
		} else {
			if (self.loadedAppsReady.indexOf(appId) > -1) {
				if (typeof self.apps[appId]['init'] == "function") {
					self.apps[appId]['init'](targetObj, self)
				}
			} else {
				setTimeout(function () {
					self.loadAppContent(targetObj, appId)
				}, 350)
			}
		}
	},
	runApp: function (targetObj, appId, event) {
		var self = this;
		if (typeof self.apps[appId] !== "undefined") {
			if (self.loadedApps.indexOf(appId) == -1) {
				self.loadAppContent(targetObj, appId);
			} else if (!(self.apps[appId]['separate'] !== true
				|| DBOX.getDialboxIndex("quick", appId) > -1
				|| DBOX.getDialboxIndex("normal", appId) > -1))
			{
			} else if (typeof self.runedAppObjects[appId] == "undefined") {
				if (typeof self.apps[appId]['run'] == "function") {
					if (self.loadedAppsReady.indexOf(appId) > -1) {
						var appObject = self.apps[appId]['run']();
						self.runedAppObjects[appId] = appObject
					} else {
						setTimeout(function () {
							self.runApp(targetObj, appId)
						}, 350)
					}
				} else {
					self.runedAppObjects[appId] = appId
				}
			} else if (self.runedAppObjects[appId] == appId) {
				if (targetObj != "" && targetObj.attr('url') != null && targetObj.attr('url') != '') {
					var targetUrl = targetObj.attr('url');
					if (typeof self.apps[appId]['openRun'] == "function") {
						targetUrl = self.apps[appId]['openRun'](targetUrl)
					}
					if (typeof event != "undefined" && event.button == 1) {
						openTab(targetSwitch, targetUrl, true)
					} else {
						openTab(targetSwitch, targetUrl, event.ctrlKey || event.metaKey);
					}
				}
			} else {
				self.runedAppObjects[appId].show();
				var loadData = self.getAppConfigValue(appId, 'loadData');
				if (loadData) {
					loadData(self.runedAppObjects[appId], targetObj)
				}
			}
		} else if (targetObj.attr('appType') == "packaged_app") {
			chrome.management.launchApp(appId)
		} else if (targetObj != "" && targetObj.attr('url') != null && targetObj.attr('url') != '') {
			if (typeof event != "undefined" && event.button == 1) {
				openTab(targetSwitch, eventObj.attr('url'), true)
			} else {
				openTab(targetSwitch, eventObj.attr('url'), event.ctrlKey || event.metaKey);
			}
		} else {
			if (appId.indexOf("classification_") === 0) {
				if (self.loadedApps.indexOf("classification") == -1) {
					self.loadAppContent(targetObj, "classification")
				} else {
					classification.change(appId.replace("classification_", ""))
				}
			}
			if ((/^o[A-Z]\w+/).test(appId)) {
				var _chromeVer = window.navigator.userAgent.match(/chrome\/([\d.]+)/i);
				var chromeVer = _chromeVer != null ? _chromeVer[1] : _chromeVer;
				var oUrls = {
					"oDownloads": _browser.protocol + "://downloads/",
					"oBookmarks": _browser.protocol + "://bookmarks/#1",
					"oHistory": _browser.protocol + "://history/",
					"oExtensions": _browser.protocol + "://extensions",
					"oNewtab": ((chromeVer >= '33') ? "chrome-search://local-ntp/local-ntp.html" : "chrome-internal://newtab/")
				};
				var oUrl = oUrls[appId] || "";
				if (oUrl != "") {
					if (typeof event != "undefined" && event.button == 1) {
						openTab(targetSwitch, oUrl, true)
					} else {
						openTab(targetSwitch, oUrl, event.ctrlKey || event.metaKey);
					}
				}
			}
		}
	}
};

var _move = false, _down = false, _realMove = false, _edit = false, _flip = true, _wheelEvent = false, _wheelFun = "", _resize = false, _destory = false, _downfun = "", _editfun = "", _flipfun = "", _noticeFun = "", _quickDialBox = false, _moveQuickDialBox = false, _removeLastDialBox = false, _isRefresh = false, _classificationOpen = false, _x = 0, _y = 0, _dx = 0, _dy = 0, eventObj = '', eclone = '', ecloneCss = '', onDragID = '', onTargetID = '', onSelectedID = '', trends = [], onSeizeID = '', dialboxType = '', _cx = 0, _cy = 0, _cw = 0, _ch = 0;
var dragExcludeClassList = ['boxClose', 'boxEdit', 'searchCenter', 'searchItem'];
$.box = function (id, dbox, type) {
	return new _Box(id, dbox, type)
};
var _Box = function Box(id, dbox, type) {
	var self = this;
	self.boxOptions = {
		id: id,
		type: type,
		title: '',
		img: '',
		url: '',
		desc: '',
		html: '',
		color: '',
		fit: '',
		isApp: false,
		isDel: false,
		isCreate: false,
		isFixed: false,
		isVirtual: false,
		isNew: false
	};
	self.set(null, dbox);
	self.init()
};
_Box.prototype = {
	boxObject: '',
	set: function (key, value) {
		var self = this;
		if (key == '' || key == null) {
			$.each(value, function (i, n) {
				self.boxOptions[i] = n
			})
		} else {
			self.boxOptions[key] = value
		}
	},
	getImg: function () {
		var self = this;
		if (self.boxOptions.img != "") {
			return self.boxOptions.img.trim()
		}
		var img = self.boxOptions.url.trim();
		if (img == '') {
			return 'img/skin_0/ie_logo.png'
		}
		img = img.toLowerCase().replace(/%3a%2f%2f/ig, '://');
		var imgMatch = img.match(/:\/\/[^\/]+/g);
		if (imgMatch == null) {
			img = "http://" + img;
			imgMatch = img.match(/:\/\/[^\/]+/g)
		}
		img = imgMatch.pop();
		img = img.substring(3, img.length);
		img = img.replace(/^www\./, '');
		if (img == '' || img.indexOf('.') == -1 || img.indexOf('.') == img.length - 1) {
			return 'img/skin_0/ie_logo.png'
		}
		return urlImg + 'm/' + img + '.png'
	},
	getUrl: function () {
		var self = this,
		url = self.boxOptions.url.trim();
		if (url == '') {
			return ''
		}
		url = url.replace(/%3a%2f%2f/ig, '://').trim();
		var index = url.indexOf("://");
		if (index > 0 && index < 20) {
			return url
		}
		if (url.substring(0, 4) !== "http") {
			return "http://" + url
		}
	},
	init: function () {
		var self = this, boxItem;
		if (self.boxOptions.isApp) {
			boxItem = $('<div class="appBox ' + self.boxOptions.type + (self.boxOptions.isNew ? ' new' : '')
				+ (self.boxOptions.isFixed ? ' boxFixed' : '') + (self.boxOptions.isApp.length == 32 ? ' chromeApp' : '')
				+ '" id="appBox_' + self.boxOptions.id + '" appType="' + (self.boxOptions.appType || '')
				+ '" url="' + self.getUrl() + '" appId="' + self.boxOptions.isApp + '">'
				+ '<div class="boxLogo" notes="' + self.boxOptions.title + '"></div>'
				+ (!self.boxOptions.title ? '' : '<div class="boxTitle"><a data-vim-url="' + self.getUrl()
					+ '">' + self.boxOptions.title + '</a></div>')
				+ '<button class="boxClose' + (self.boxOptions.isFixed ? ' hide' : '') + '"></button>'
				+ '</div>');
		} else {
			boxItem = $('<div class="appBox ' + self.boxOptions.type + (self.boxOptions.isNew ? ' new' : '')
				+ (self.boxOptions.isFixed ? ' boxFixed' : '')
				+ '" id="appBox_' + self.boxOptions.id + '" url="' + self.getUrl() + '">'
				+ '<div class="boxLogo" notes="' + self.boxOptions.title + '"></div>'
				+ (!self.boxOptions.title ? '' : '<div class="boxTitle"><a data-vim-url="' + self.getUrl()
					+ '">' + self.boxOptions.title + '</a></div>')
				+ '<button class="boxClose' + (self.boxOptions.isFixed ? ' hide' : '') + '"></button>'
				+ '<button class="boxEdit ' + (self.boxOptions.isFixed ? ' hide' : '') + '" title="' + getI18nMsg('editDialbox') + '"></button>'
				+'</div>');
		}
		if (self.boxOptions.html != "") {
			boxItem.append($('<div class="boxHtml"></div>').html(self.boxOptions.html))
		}
		self.boxObject = boxItem
	}
};

DBOX = {
	__init__: function (opt) {
		var self = this;
		$.each(opt, function (i, n) {
			self[i] = n
		});
		if (self.height === false) {
			self.height = Math.round(self.width * 0.56)
		} else {
			self.height = self.height
		}
		self.init();
		self.pageNotice();
		_classificationOpen = false;
		$(document).unbind('keyup.dialboxEsc').bind('keyup.dialboxEsc', function (e) {
			if ($('.dialog-visible').length == 0 && e.keyCode == 27) {
				_edit = false;
				setTimeout(function () {
					self.container.parent().removeClass('edit');
					if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
						self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
					}
					self.container.addClass('op_' + self.opacity * 10)
				}, 0)
			}
			if ($('.dialog-visible').length == 0 && (typeof _minSearchForce == 'undefined' || !_minSearchForce)) {
				if (e.keyCode == 37) {
					self.loadBoxes('pre')
				}
				if (e.keyCode == 39) {
					self.loadBoxes('next')
				}
			}
		});
		$(window).bind('resize', function () {
			if (!_resize || document.body.offsetWidth > 100) {
				_resize = true;
				self.position();
				window.setTimeout(function () {
					_resize = false
				}, 300)
			}
		});
		window.onmousewheel = function (event) {
			if (_wheelEvent) return;
			if (_wheelFun) {
				clearTimeout(_wheelFun)
			}
			_wheelEvent = true;
			self.pageNotice();
			if ($('.dialog-visible').length === 0) {
				var _page = self.page;
				var delta = 0;
				if (!event)
					event = window.event;
				if (event.wheelDelta) {
					delta = delta + event.wheelDelta
				} else if (event.detail) {
					delta = delta + (-event.detail * 40)
				}
				if (delta > 0) {
					if (self.container.parent().get(0).scrollTop <= 0) {
						self.loadBoxes('pre')
					} else {
						_page = false
					}
				} else if (delta < 0) {
					if (self.container.parent().get(0).offsetHeight + self.container.parent().get(0).scrollTop >= self.container.parent().get(0).scrollHeight) {
						self.loadBoxes('next')
					} else {
						_page = false
					}
				}
				if (_page !== false && _page == self.page && _edit === false) {
					if (_classificationOpen) {
						_classificationOpen = false;
						app.runApp($('.appBox[appId=classification]'), 'classification')
					} else {
						if (self.getDialboxIndex("quick", "classification") > -1 || self.getDialboxIndex("normal", "classification") > -1) {
							_classificationOpen = true;
							if (delta < 0) {
								self.pageNotice(getI18nMsg("classificationShowNotice_next"))
							} else {
								self.pageNotice(getI18nMsg("classificationShowNotice_pre"))
							}
						}
					}
				} else {
					_classificationOpen = false
				}
			} else if ($('#classificationDialog').hasClass("dialog-visible")) {
				_classificationOpen = false;
				$('#classificationDialog').find(".close").get(0).click()
			}
			if (event.preventDefault) {
				event.preventDefault()
			} else {
				event.returnValue = true
			}
			_wheelFun = setTimeout(function () {
				_wheelEvent = false
			}, self.page3DSwitcherOpen == true ? 400 : 460);
		};
		window.onmessage = function (e) {
			_down = false
		};
	},
	container: "",
	containerWidth: 0,
	containerHeight: 0,
	containerLeft: 0,
	containerTop: 0,
	QContainer: "",
	QBContainer: "",
	QBContainerWidth: 0,
	QBContainerLeft: 0,
	pageSwitcher: "",
	pageIndexSwitcher: "",
	pageSwitcherShow: false,
	page3DSwitcherOpen: false,
	dialBoxQuickHide: false,
	titleShow: true,
	cloudBoxShow: true,
	cols: 4,
	rows: 3,
	num: 12,
	Qnum: 10,
	page: 1,
	totalnum: 0,
	QTotalnum: 0,
	totalPage: 1,
	opacity: 0.8,
	spacing: 15,
	QSpacing: 0,
	QMaxSpacing: 4,
	QMinSpacing: 0,
	border: 1,
	width: 214,
	height: 166,
	maxTop: "auto",
	QWidth: 74,
	QHeight: 74,
	radius: 2,
	appDialboxs: [],
	update: false,
	init: function (update) {
		var self = this;
		self.update = typeof update == "undefined" ? false : update;
		self.container.empty();
		self.QContainer.empty();
		var _boxTypes = ["normal", "quick"];
		$.each(_boxTypes, function (i, n) {
			var _boxes = PDI.get('dialBoxes', n);
			var _realBoxs = [];
			var hasDel = false;
			$.each(_boxes, function (k, v) {
				if (v == null || v.isDel == true) {
					hasDel = true
				} else {
					_realBoxs.push(v)
				}
			});
			if (hasDel) {
				PDI.set('dialBoxes', n, _realBoxs)
			}
		});
		self.addBoxes();
		self.addQBoxes();
		self.position()
	},
	addBoxes: function (order) {
		var self = this, existNum = $(self.container.find('.appBox').not('.boxDrag')).length;
		var boxes = self.getBoxes(), page = self.page, start = (page - 1) * self.num,
				end = start + (self.num * 1) - existNum, p = 0, q = 0,
		boxQueue = [];
		$.each(boxes, function (i, n) {
			if (!self.isDialboxShow(n)) return;
			if (typeof order != 'undefined' && order == 'pre') {
				if (q == end) {
					onSeizeID = i
				}
			} else if (q == start) {
				onSeizeID = i
			}
			q++;
			if (('appBox_' + i) != onDragID) {
				if (p >= start && p < end) {
					boxQueue.push({
						"id": i,
						"box": n
					})
				}
				p++
			}
		});
		if (order === 'pre') {
			for (var i = boxQueue.length - 1; i >= 0; i--) {
				self.addBox(boxQueue[i]['id'], boxQueue[i]['box'], 'normal', order)
			}
		} else {
			for (var i = 0; i < boxQueue.length; i++) {
				self.addBox(boxQueue[i]['id'], boxQueue[i]['box'], 'normal', order)
			}
		}
	},
	getBoxes: function () {
		var self = this,
		sum = 0;
		var _boxes = PDI.get('dialBoxes', 'normal');
		$.each(_boxes, function (i, n) {
			if (self.isDialboxShow(n)) {
				sum++
			}
		});
		self.totalnum = sum;
		if (sum > 0) {
			self.totalPage = ((self.totalnum % self.num) == 0) ? (self.totalnum / self.num) : parseInt(self.totalnum / self.num) + 1;
			self.page = self.page > self.totalPage ? self.totalPage : self.page
		}
		PDI.set('dialBoxPage', null, self.page);
		self.pageIndex();
		return _boxes
	},
	addQBoxes: function () {
		var self = this;
		var boxQueue = self.getQBoxes();
		$.each(boxQueue, function (i, n) {
			self.addBox(n['id'], n['box'], 'quick')
		})
	},
	getQBoxes: function () {
		var self = this,
		sum = 0;
		var boxQueue = [];
		$.each(PDI.get('dialBoxes', 'quick'), function (i, n) {
			if (self.isDialboxShow(n)) {
				boxQueue.push({
					"id": i,
					"box": n
				});
				sum++
			}
		});
		self.QTotalnum = sum;
		return boxQueue
	},
	addBox: function (id, boxObj, type, order) {
		type = type || "normal";
		var self = this,
		ignoreLogoList = [],
		thisBox = $.box(id, boxObj, type),
		boxLogo = thisBox.boxObject.find('.boxLogo'),
		logoBoxHeight = self.titleShow == true ? (self.height + 32) : self.height,
		logoBoxWidth = self.width,
		boxLogoColor = '191,0,0',
		logoImgUrl = thisBox.getImg();
		if (logoImgUrl.indexOf(urlImg) == 0) {
			if (type == 'quick' && logoImgUrl.indexOf('/m/') > -1) {
				logoImgUrl = logoImgUrl.replace('/m/', '/s/')
			} else if (type == 'normal' && logoImgUrl.indexOf('/s/') > -1) {
				logoImgUrl = logoImgUrl.replace('/s/', '/m/')
			}
		}
		if (thisBox.boxOptions.color == "" || self.update) {
			var logoImg = new Image();
			if (isApp) {
				logoImg.crossOrigin = "*"
			}
			logoImg.onerror = logoImg.onload = function () {
				logoImg.onload = null;
				boxLogo.removeClass("cw").removeClass("ch").removeClass("lh");
				boxObj.fit = "";
				try {
					if (logoImg.width > logoBoxWidth || logoImg.height > logoBoxHeight) {
						if (logoImg.width / logoImg.height > logoBoxWidth / logoBoxHeight) {
							boxObj.fit = "cw"
						} else {
							boxObj.fit = "ch"
						}
						boxLogo.addClass(boxObj.fit);
					}
				} catch (e) {}

				var logoImgArray = urlRegEx(logoImgUrl);
				if (!isApp || (isApp && (logoImgArray == null || logoImgArray[2] == "hao." + officialDomain))) {
					try {
						var notColorList = new Array('0,0,0', '255,255,255');
						var boxLogoCanvas = $('<canvas width="' + logoImg.width + '" height="' + logoImg.height + '"></canvas>').get(0);
						boxLogoCanvas = boxLogoCanvas.getContext("2d");
						boxLogoCanvas.drawImage(logoImg, 0, 0);
						var imageData = boxLogoCanvas.getImageData(parseInt(logoImg.width / 3), parseInt(logoImg.height / 2), 1, 1).data;
						var imageDataRgba = imageData[0] + ',' + imageData[1] + ',' + imageData[2];
						if (notColorList.indexOf(imageDataRgba) > -1 || isWhite(imageData[0], imageData[1], imageData[2])) {
							imageData = boxLogoCanvas.getImageData(parseInt(logoImg.width / 2), parseInt(logoImg.height / 2), 1, 1).data;
							imageDataRgba = imageData[0] + ',' + imageData[1] + ',' + imageData[2]
						}
						if (notColorList.indexOf(imageDataRgba) == -1 && !isWhite(imageData[0], imageData[1], imageData[2])) {
							boxLogoColor = imageDataRgba
						}
					} catch (err) {}
				}
				boxObj.color = boxLogoColor;
				if (self.radius < 30 && type != 'quick') {
					boxLogo.css('borderBottomColor', 'rgba(' + boxLogoColor + ',.6)');
					if (!self.titleShow) {
						thisBox.boxObject.find('.boxTitle').css('backgroundColor', 'rgba(' + boxLogoColor + ',.4)')
					}
				}
				if (ignoreLogoList.indexOf(boxObj.isApp) > -1) {
					boxLogo.attr("bgHidden", "true");
					if (type != 'quick') {
						boxLogo.addClass("hidden");
						if (self.radius < 30) {
							boxLogo.css('borderBottomColor', 'rgba(150, 150, 150, .6)');
							if (!self.titleShow) {
								thisBox.boxObject.find('.boxTitle').css('backgroundColor', 'rgba(150, 150, 150, .4)')
							}
						}
					} else {
						boxLogo.removeClass("hidden")
					}
				}
				PDI.updateDialbox(type, id, boxObj)
			};
			logoImg.src = logoImgUrl
		} else {
			boxLogo.removeClass("cw").removeClass("ch").removeClass("lh");
			if (thisBox.boxOptions.fit != "") {
				boxLogo.addClass(thisBox.boxOptions.fit)
			}
			if (self.radius < 30 && type != 'quick') {
				boxLogo.css('borderBottomColor', 'rgba(' + thisBox.boxOptions.color + ',.6)');
				if (!self.titleShow) {
					thisBox.boxObject.find('.boxTitle').css('backgroundColor', 'rgba(' + thisBox.boxOptions.color + ',.4)')
				}
			}
			if (ignoreLogoList.indexOf(boxObj.isApp) > -1) {
				boxLogo.attr("bgHidden", "true");
				if (type != 'quick') {
					boxLogo.addClass("hidden");
					if (self.radius < 30) {
						boxLogo.css('borderBottomColor', 'rgba(150, 150, 150, .6)');
						if (!self.titleShow) {
							thisBox.boxObject.find('.boxTitle').css('backgroundColor', 'rgba(150, 150, 150, .4)')
						}
					}
				} else {
					boxLogo.removeClass("hidden")
				}
			}
		}
		boxLogo.css('backgroundImage', 'url(' + logoImgUrl + ')');
		var iframeDialboxUrl = getIframeDialboxUrl(thisBox.boxOptions.url);
		if (iframeDialboxUrl) {
			var iframeOptions = "target=" + (targetSwitch ? "top" : "blank");
			if (typeof thisBox.boxOptions.img != "undefined" && thisBox.boxOptions.img != "") {
				iframeOptions += "&img=" + escape(thisBox.boxOptions.img)
			}
			if (!self.update && typeof thisBox.boxOptions.fit != "undefined" && thisBox.boxOptions.fit != "") {
				iframeOptions += "&fit=" + escape(thisBox.boxOptions.fit)
			}
			if (typeof thisBox.boxOptions.url != "undefined" && thisBox.boxOptions.url != "") {
				iframeOptions += "&url=" + escape(thisBox.boxOptions.url)
			}
			if (typeof thisBox.boxOptions.html != "undefined" && thisBox.boxOptions.html != "") {
				iframeOptions += "&html=" + escape(thisBox.boxOptions.html)
			}
			if (type == 'quick') {
				iframeOptions += "&isQuickDialbox=true"
			}
			var iframeSrc = iframeDialboxUrl + "?" + iframeOptions;
			boxLogo.append($("<iframe class='iframeDialbox' frameborder='no' border='0' marginwidth='0' marginheight='0' scrolling='no' src='" + iframeSrc + "'></iframe><div class='iframeDialboxMask'></div>"));
			boxLogo.addClass('empty')
		}
		if (type == 'quick') {
			self.QContainer.append(thisBox.boxObject)
		} else {
			if (typeof order != 'undefined' && order == "pre") {
				self.container.prepend(thisBox.boxObject)
			} else {
				self.container.append(thisBox.boxObject)
			}
		}
		self.dragBox(thisBox);
		self.removeBox(thisBox);
		self.editBox(thisBox);
		if (thisBox.boxOptions.isApp) {
			setTimeout(function () {
				app.loadApp(thisBox.boxObject, thisBox.boxOptions.isApp)
			}, 0)
		}
		if (thisBox.boxOptions.isNew == true) {
			boxObj.isNew = false;
			setTimeout(function () {
				PDI.updateDialbox(type, id, boxObj);
				thisBox.boxObject.removeClass("new");
				oauth.updateMsgId();
				oauth.synchronize()
			}, 1100)
		}
		return thisBox
	},
	position: function () {
		var self = this;
		if (self.page3DSwitcherOpen == true) {
			self.container.parent().removeClass("visual3D").addClass("visual3D")
		} else {
			self.container.parent().removeClass("visual3D")
		}
		self.measurement();
		self.container.css({
			"width": self.containerWidth + "px",
			"left": self.containerLeft + "px",
			"height": self.containerHeight + "px",
			"top": self.containerTop + "px"
		});
		if (self.pageIndexSwitcher != '') {
			var spaceBlank = self.spacing == 0 ? 40 : 20;
			if ((self.containerTop + self.containerHeight + spaceBlank) <= (document.body.offsetHeight - 100)) {
				self.pageIndexSwitcher.css("bottom", (document.body.offsetHeight - (self.containerTop + self.containerHeight + spaceBlank)) + "px")
			} else {
				self.pageIndexSwitcher.css("bottom", "100px")
			}
		}
		self.positionBox();
		self.positionQBox()
	},
	measurement: function () {
		var self = this;
		var bodyWidth = document.body.offsetWidth,
		bodyHeight = document.body.offsetHeight;
		if (bodyWidth > 0 && bodyHeight > 0) {
			self.container.show();
			var maxCols = parseInt((bodyWidth - self.spacing) / (self.width + self.spacing + 2 * self.border)),
			matrix = {};
			for (var cols = 1; cols <= maxCols; cols++) {
				if (self.num % cols == 0) {
					matrix[cols] = {
						"rows": self.num / cols,
						"cols": cols
					}
				}
			}
			var minDiff = '';
			$.each(matrix, function (i, n) {
				var itemWidth = self.width + self.spacing + 2 * self.border,
				itemHeight = (self.titleShow == true ? (self.height + 32) : self.height) + self.spacing + 2 * self.border,
				curDiff = Math.abs((bodyWidth - n.cols * itemWidth - self.spacing) / 2 - (bodyHeight - 100 - n.rows * itemHeight - self.spacing));
				if (curDiff < minDiff || minDiff == '') {
					minDiff = curDiff;
					self.containerWidth = n.cols * itemWidth + self.spacing;
					self.containerHeight = n.rows * itemHeight + self.spacing;
					self.containerLeft = parseInt((bodyWidth - self.containerWidth) / 2);
					if (self.dialBoxQuickHide) {
						if (bodyHeight > self.containerHeight) {
							self.containerTop = parseInt((bodyHeight - self.containerHeight - 60) / 2)
						} else {
							self.containerTop = 0
						}
					} else {
						if (self.maxTop == 'auto' || (bodyHeight - 90 - self.containerHeight + 2 * self.spacing) < 2 * self.maxTop || (bodyHeight - 90 - self.containerHeight + 2 * self.spacing) > 3 * self.maxTop) {
							if (bodyHeight > self.containerHeight) {
								self.containerTop = parseInt((bodyHeight - self.containerHeight - 90) * 0.8 / 2)
							} else {
								self.containerTop = 0
							}
						} else {
							self.containerTop = (self.maxTop - self.spacing) > 0 ? (self.maxTop - self.spacing) : 0
						}
					}
					self.cols = n.cols;
					self.rows = n.rows
				}
			});
			var _spaceWidth = 240;
			if (screenWidth <= 1024) {
				_spaceWidth = 120
			} else if (screenWidth <= 1366) {
				_spaceWidth = 200
			}
			self.Qnum = parseInt((self.QBContainerWidth - _spaceWidth) / parseInt(self.QMinSpacing + self.QWidth))
		}
		if (self.dialBoxQuickHide) {
			self.QContainer.addClass("hide");
			self.QBContainer.addClass("hide")
		} else if (self.QContainer.hasClass("hide")) {
			self.QContainer.removeClass("hide");
			self.QBContainer.removeClass("hide")
		}
	},
	positionBox: function () {
		var self = this;
		var boxList = self.container.find('.appBox'),
		not_boxDrag = boxList.not('.boxDrag');
		if (self.titleShow) {
			self.container.find('.boxLogo').removeClass('noTitle')
		} else {
			self.container.find('.boxLogo').addClass('noTitle');
			if (self.radius > 30) {
				self.container.find('.boxTitle').removeClass('middle').addClass('middle')
			} else {
				self.container.find('.boxTitle').removeClass('middle')
			}
		}
		self.container.find('.boxLogo').css('borderRadius', self.radius + 'px');
		if (self.radius <= 30 && !self.titleShow) {
			self.container.find('.boxTitle').css('borderRadius', '0 0 ' + self.radius + 'px ' + self.radius + 'px')
		}
		if (self.spacing == 0 || self.radius > 30) {
			self.container.find('.boxLogo').css('borderBottomWidth', '0px')
		} else {
			self.container.find('.boxLogo').css('borderBottomWidth', '2px')
		}
		setTimeout(function () {
			if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
				self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
			}
			self.container.addClass('op_' + self.opacity * 10);
			if (typeof not_boxDrag != "undefined" && not_boxDrag.length > 0) {
				for (var i = 0; i < not_boxDrag.length; i++) {
					if (self.page3DSwitcherOpen == true) {
						if (self.cols % 2 == 0) {
							var midIndex = parseInt(self.cols / 2);
							if (i % self.cols < midIndex) {
								$(not_boxDrag[i]).css({
									"WebkitTransform": "rotateY(" + ((midIndex - i % self.cols) * 2.5) + "deg)",
									"WebkitTransformOrigin": ((midIndex - i % self.cols + 1) * 50) + "% 0%"
								})
							} else {
								$(not_boxDrag[i]).css({
									"WebkitTransform": "rotateY(" + ((midIndex - i % self.cols - 1) * 2.5) + "deg)",
									"WebkitTransformOrigin": ((midIndex - i % self.cols) * 50) + "% 0%"
								})
							}
						} else {
							var midIndex = parseInt(self.cols / 2);
							if (i % self.cols != midIndex) {
								$(not_boxDrag[i]).css({
									"WebkitTransform": "rotateY(" + ((midIndex - i % self.cols) * 2.5) + "deg)",
									"WebkitTransformOrigin": ((midIndex - i % self.cols + 1) * 50) + "% 0%"
								})
							} else {
								$(not_boxDrag[i]).css({
									"WebkitTransform": "rotateY(0deg)",
									"WebkitTransformOrigin": "0% 0%"
								})
							}
						}
					}
					$(not_boxDrag[i]).css({
						"width": self.width + "px",
						"height": (self.titleShow == true ? (self.height + 32) : self.height) + "px",
						"left": self.spacing + (i % self.cols) * (self.spacing + self.width + 2 * self.border) + 'px',
						"top": self.spacing + parseInt(i / self.cols) * (self.spacing + (self.titleShow == true ? (self.height + 32) : self.height) + 2 * self.border) + 'px',
						"display": "block"
					})
				}
			}
		}, 0);
		if (not_boxDrag) {
			not_boxDrag.css({
				"WebkitTransition": "left .2s ease-in, top .2s ease-in, opacity .2s ease-in"
			})
		}
		setTimeout(function () {
			boxList.removeClass("new")
		}, 800)
	},
	positionQBox: function () {
		var self = this;
		var quickBoxList = self.QContainer.find('.appBox'),
		not_boxDrag = quickBoxList.not('.boxDrag');
		self.QContainer.find('.boxLogo').removeClass('noTitle');
		self.QContainer.find('.boxTitle').css('backgroundColor', 'transparent');
		if (!self.dialBoxQuickHide) {
			if (self.QTotalnum <= 0) {
				self.QBContainer.css("visibility", "hidden")
			} else {
				self.QBContainer.css("visibility", "visible")
			}
		}
		self.QBContainer.css("width", self.QBContainerWidth + "px");
		self.QBContainer.find('.center').css("width", (self.QBContainerWidth - 156) + "px");
		var _spaceWidth = 240;
		if (screenWidth <= 1024) {
			_spaceWidth = 120
		} else if (screenWidth <= 1366) {
			_spaceWidth = 200
		}
		self.QSpacing = parseInt((self.QBContainerWidth - _spaceWidth - self.QTotalnum * self.QWidth) / (self.QTotalnum + 1));
		if (self.QSpacing > self.QMaxSpacing) {
			self.QSpacing = self.QMaxSpacing
		}
		self.QBContainerLeft = parseInt((self.QContainer.get(0).offsetWidth - (self.QTotalnum + 1) * self.QSpacing - self.QTotalnum * self.QWidth) / 2);
		window.setTimeout(function () {
			if (typeof not_boxDrag != 'undefined' && not_boxDrag.length > 0) {
				for (var i = 0; i < not_boxDrag.length; i++) {
					$(not_boxDrag[i]).css({
						"width": self.QWidth + "px",
						"height": self.QHeight + "px",
						"left": (self.QBContainerLeft + self.QSpacing + i * (self.QSpacing + self.QWidth)) + 'px',
						"top": "-29px",
						"display": "block"
					})
				}
			}
		}, 0);
		if (not_boxDrag) {
			not_boxDrag.css({
				"WebkitTransition": "left .2s ease-in, top .2s ease-in, opacity .2s ease-in"
			})
		}
	},
	dragBox: function (box) {
		var self = this;
		box.boxObject.unbind('mousedown.dialbox').bind('mousedown.dialbox', function (e) {
			var selfWidth = $(this).hasClass('quick') ? self.QWidth : self.width;
			if (_down == false && e.button != 2 && Math.abs(this.offsetWidth - selfWidth) < parseInt(selfWidth / 2)) {
				if (!_edit) {
					box.boxObject.find(".iframeDialboxMask").hide()
				}
				_down = true;
				_move = false;
				_dx = e.pageX;
				_dy = e.pageY;
				$.each(dragExcludeClassList, function (i, n) {
					if (isContainsClass(e.target, n)) {
						_down = false;
						return false
					}
				});
				if (_down) {
					eventObj = $(this);
					var coffset = eventObj.offset();
					_cx = coffset.left;
					_cy = coffset.top;
					_cw = parseInt(eventObj.css('width'));
					_ch = parseInt(eventObj.css('height'));
					_downfun = setTimeout(function () {
							box.boxObject.find(".iframeDialboxMask").show();
							if (_down == true) {
								if (classification && classification.minClassificationSwitch == true) {
									classification.hideMinClassification(true)
								}
								onDragID = eventObj.attr("id");
								onTargetID = "";
								_removeLastDialBox = false;
								if (e.pageY >= (self.QContainer.offset().top - self.QHeight)) {
									_quickDialBox = _moveQuickDialBox = true;
									_y = e.pageY - self.QContainer.offset().top - parseInt(eventObj.css("top"));
									_x = e.pageX - parseInt(eventObj.css("left"))
								} else {
									_quickDialBox = _moveQuickDialBox = false;
									_y = e.pageY - self.container.offset().top - parseInt(eventObj.css("top"));
									_x = e.pageX - self.container.offset().left - parseInt(eventObj.css("left"))
								}
								eclone = eventObj.clone();
								eclone.empty();
								eclone.addClass("boxClone");
								eclone.css("visibility", "hidden");
								eclone.insertAfter(eventObj);
								eventObj.css({
									"opacity": 0.5,
									"zIndex": getMaxZindex(eventObj) + 1,
									"WebkitTransition": ""
								});
								eventObj.parent().parent().append(eventObj);
								eventObj.css({
									top: (e.pageY + self.container.parent().get(0).scrollTop - _y) + 'px',
									left: (e.pageX - _x) + 'px'
								});
								eventObj.children().css("cursor", "move");
								eventObj.addClass('boxDrag');
								if (e.button != 2) {
									_move = true
								}
								_editfun = setTimeout(function () {
										_edit = true;
										_move = true;
										_down = false;
										_realMove = true;
										setTimeout(function () {
											self.container.parent().removeClass('edit').addClass('edit');
											if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
												self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
											}
											app.loadAppContent(eventObj, 'cloud')
										}, 0)
									}, 500)
							}
						}, 120)
				}
			}
		});
		$(document).unbind("mousemove.dialbox").bind("mousemove.dialbox", function (e) {
			if (_down == true && _move == true && _editfun) {
				if (Math.abs(e.pageX - _dx) > 5 || Math.abs(e.pageY - _dy) > 5) {
					clearTimeout(_editfun)
				}
			}
			if (_down == true) {
				if (Math.abs(e.pageX - _dx) > 5 || Math.abs(e.pageY - _dy) > 5) {
					_realMove = true;
					if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
						self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
					}
				}
			}
			if (self.dialBoxQuickHide) {
				var containerOffset = self.container.offset();
				var QContainerOffset = self.QContainer.offset();
				if (e.pageY >= (QContainerOffset.top - self.QHeight)) {
					self.QContainer.removeClass("hide");
					self.QBContainer.removeClass("hide")
				} else {
					if (typeof classification == "undefined" || classification.minClassificationSwitch == false) {
						self.QContainer.addClass("hide");
						self.QBContainer.addClass("hide")
					}
				}
			}
			if (_move && _realMove) {
				_down = false;
				if (!self.dialBoxQuickHide) {
					var containerOffset = self.container.offset();
					var QContainerOffset = self.QContainer.offset()
				}
				if (e.pageY >= (QContainerOffset.top - self.QHeight) && _moveQuickDialBox == false && self.QTotalnum < self.Qnum) {
					_moveQuickDialBox = true;
					if (eventObj.find('.iframeDialbox').length > 0) {
						eventObj.find('.iframeDialbox').hide()
					}
					eventObj.removeClass('normal').addClass('quick');
					eventObj.css({
						"width": self.QWidth + 'px',
						"height": self.QHeight + 'px'
					});
					eventObj.find('.boxTitle').css('backgroundColor', 'transparent');
					eventObj.find('.boxLogo').removeClass('noTitle');
					eventObj.find('.boxLogo').css({
						"borderBottomWidth": '0px',
						"borderRadius": 0
					});
					var eventObjLogoBgImage = eventObj.find('.boxLogo').css("backgroundImage").replace(/\"/g, "");
					if (eventObjLogoBgImage.indexOf(urlImg) == 4 && eventObjLogoBgImage.indexOf('/m/') > -1) {
						eventObj.find('.boxLogo').css("backgroundImage", eventObjLogoBgImage.replace("/m/", "/s/"))
					}
					if (eventObj.find('.iframeDialbox').length > 0) {
						eventObj.find('.iframeDialbox').attr("src", eventObj.find('.iframeDialbox').attr("src").replace(/&isQuickDialbox=true/ig, "") + "&isQuickDialbox=true");
						setTimeout(function () {
							eventObj.find('.iframeDialbox').show()
						}, 300)
					}
					eventObj.find('.boxLogo').removeClass("hidden");
					var curBoxList = self.container.find('.appBox').not('.boxDrag');
					var curNotCloneBoxList = curBoxList.not('.boxClone');
					if (typeof curNotCloneBoxList != "undefined" && curNotCloneBoxList.length > 0) {
						var i = curNotCloneBoxList.length - 1;
						self.changePosition(curBoxList, curNotCloneBoxList, eclone, i, [i + 1])
					}
					var normalBoxlist = self.container.find(".appBox");
					var l = normalBoxlist.length;
					if (ecloneCss) {
						eclone.css(ecloneCss);
						ecloneCss = ''
					} else {
						ecloneCss = {
							"width": eclone.css("width"),
							"height": eclone.css("height"),
							"top": eclone.css("top"),
							"left": eclone.css("left"),
						};
						eclone.css({
							"width": self.QWidth + 'px',
							"height": self.QHeight + 'px',
							"top": "-" + (parseInt(self.QHeight / 2)) + "px",
							"left": (self.QBContainerLeft + self.QSpacing + self.QContainer.find('.appBox').length * (self.QSpacing + self.QWidth)) + 'px',
						})
					}
					if (l >= self.num) {
						_removeLastDialBox = true
					}
					var quickDialboxes = PDI.get('dialBoxes', 'quick');
					onTargetID = 'appBox_' + quickDialboxes.length;
					eclone.attr('id', onTargetID);
					self.QContainer.append(eclone);
					self.QTotalnum++;
					self.positionQBox()
				} else if (e.pageY < (QContainerOffset.top - self.QHeight) && _moveQuickDialBox == true) {
					_moveQuickDialBox = false;
					if (eventObj.find('.iframeDialbox').length > 0) {
						eventObj.find('.iframeDialbox').hide()
					}
					eventObj.removeClass('quick').addClass('normal');
					eventObj.css({
						"width": self.width + 'px',
						"height": (self.titleShow == true ? (self.height + 32) : self.height) + "px"
					});
					eventObj.find('.boxLogo').css({
						"borderBottomWidth": (self.spacing == 0 || self.radius > 30) ? '0px' : '2px',
						"borderRadius": self.radius + 'px'
					});
					var icolor = eventObj.find('.boxTitle').attr('icolor');
					if (self.radius <= 30) {
						if (icolor != null) {
							eventObj.find('.boxTitle').css('backgroundColor', "rgba(" + icolor + ")")
						} else {
							eventObj.find('.boxTitle').css('backgroundColor', "rgba(191, 0, 0, 0.4)")
						}
					} else {
						eventObj.find('.boxTitle').css('backgroundColor', "transparent")
					}
					if (self.titleShow) {
						eventObj.find('.boxLogo').removeClass('noTitle');
						eventObj.find('.boxTitle').css('backgroundColor', 'transparent')
					} else {
						eventObj.find('.boxLogo').removeClass('noTitle').addClass('noTitle')
					}
					var eventObjLogoBgImage = eventObj.find('.boxLogo').css("backgroundImage").replace(/\"/g, "");
					if (eventObjLogoBgImage.indexOf(urlImg) == 4 && eventObjLogoBgImage.indexOf('/s/') > -1) {
						eventObj.find('.boxLogo').css("backgroundImage", eventObjLogoBgImage.replace("/s/", "/m/"))
					}
					if (eventObj.find('.iframeDialbox').length > 0) {
						eventObj.find('.iframeDialbox').attr("src", eventObj.find('.iframeDialbox').attr("src").replace(/&isQuickDialbox=true/ig, ""));
						setTimeout(function () {
							eventObj.find('.iframeDialbox').show()
						}, 300)
					}
					if (eventObj.find('.boxLogo').attr("bgHidden") == "true") {
						eventObj.find('.boxLogo').removeClass("hidden").addClass("hidden")
					}
					var curBoxList = self.QContainer.find('.appBox').not('.boxDrag');
					var curNotCloneBoxList = curBoxList.not('.boxClone');
					if (typeof curNotCloneBoxList != "undefined" && curNotCloneBoxList.length > 0) {
						var i = curNotCloneBoxList.length - 1;
						self.changePosition(curBoxList, curNotCloneBoxList, eclone, i, [i + 1])
					}
					var normalBoxlist = self.container.find(".appBox");
					var l = normalBoxlist.length;
					if (ecloneCss) {
						eclone.css(ecloneCss);
						ecloneCss = ''
					} else {
						ecloneCss = {
							"width": eclone.css("width"),
							"height": eclone.css("height"),
							"top": eclone.css("top"),
							"left": eclone.css("left"),
						};
						if (l >= self.num) {
							l = l - 1;
							$(normalBoxlist[l]).remove();
							_removeLastDialBox = true
						}
						eclone.css({
							"width": self.width + 'px',
							"height": (self.titleShow == true ? (self.height + 32) : self.height) + "px",
							"left": self.spacing + (l % self.cols) * (self.spacing + self.width + 2 * self.border) + 'px',
							"top": self.spacing + parseInt(l / self.cols) * (self.spacing + (self.titleShow == true ? (self.height + 32) : self.height) + 2 * self.border) + 'px',
						});
						if (self.page3DSwitcherOpen == true) {
							if (self.cols % 2 == 0) {
								var midIndex = parseInt(self.cols / 2);
								if (l % self.cols < midIndex) {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols + 1) * 50) + "% 0%"
								} else {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols - 1) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols) * 50) + "% 0%"
								}
							} else {
								var midIndex = parseInt(self.cols / 2);
								if (l % self.cols != midIndex) {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols + 1) * 50) + "% 0%"
								}
							}
							eclone.css({
								"WebkitTransform": lastTransform,
								"WebkitTransformOrigin": lastTransformOrigin
							})
						}
					}
					if (l == 0) {
						var normalDialboxes = PDI.get('dialBoxes', 'normal');
						onTargetID = 'appBox_' + normalDialboxes.length
					} else {
						onTargetID = 'appBox_' + (parseInt($(normalBoxlist[l - 1]).attr("id").replace("appBox_", "")) + 1)
					}
					eclone.attr('id', onTargetID);
					self.container.append(eclone);
					self.QTotalnum--;
					self.positionQBox()
				}
				if (!_moveQuickDialBox && (e.pageX > (parseInt(self.containerLeft) + parseInt(self.containerWidth)) || e.pageX < parseInt(self.containerLeft))) {
					if (_flip) {
						_flip = false;
						if (dialboxType == '' && _quickDialBox != _moveQuickDialBox) {
							var fromType = _quickDialBox ? 'quick' : 'normal';
							var toType = _moveQuickDialBox ? 'quick' : 'normal';
							PDI.moveDialbox(fromType, toType, parseInt(onDragID.replace('appBox_', '')), parseInt(onTargetID.replace('appBox_', '')));
							onDragID = onTargetID;
							dialboxType = 'normal'
						}
						if (e.pageX > (parseInt(self.containerLeft) + parseInt(self.containerWidth))) {
							self.loadBoxes('next')
						} else {
							self.loadBoxes('pre')
						}
						eclone.attr('id', 'appBox_' + onSeizeID);
						onTargetID = 'appBox_' + onSeizeID;
						if (onTargetID != '') {
							PDI.moveDialbox('normal', 'normal', parseInt(onDragID.replace('appBox_', '')), parseInt(onTargetID.replace('appBox_', '')))
						}
						onDragID = 'appBox_' + onSeizeID;
						var coffset = eclone.offset();
						_cx = coffset.left;
						_cy = coffset.top;
						_cw = parseInt(eclone.css('width'));
						_ch = parseInt(eclone.css('height'));
						var _flipfun = setTimeout(function () {
								_flip = true
							}, 1500)
					}
				} else if (_flipfun != '') {
					clearTimeout(_flipfun)
				}
				if (_moveQuickDialBox == _quickDialBox) {
					eventObj.css({
						top: (e.pageY + self.container.parent().get(0).scrollTop - _y) + 'px',
						left: (e.pageX - _x) + 'px'
					})
				} else {
					if (_moveQuickDialBox == false) {
						eventObj.css({
							top: (e.pageY + self.container.parent().get(0).scrollTop - parseInt(_y * (self.height / self.QHeight))) + 'px',
							left: (e.pageX - parseInt(_x * (self.width / self.QWidth))) + 'px'
						})
					} else {
						eventObj.css({
							top: (e.pageY + self.container.parent().get(0).scrollTop - parseInt(_y * (self.QHeight / self.height))) + 'px',
							left: (e.pageX - parseInt(_x * (self.QWidth / self.width))) + 'px'
						})
					}
				}
				if (e.pageX < _cx || e.pageX > (_cx + _cw) || e.pageY < _cy || e.pageY > (_cy + _ch)) {
					if (e.pageY >= (self.QContainer.offset().top - self.QHeight)) {
						var offsetPageX = e.pageX;
						var offsetPageY = e.pageY - QContainerOffset.top;
						if (_moveQuickDialBox) {
							var boxlist = self.QContainer.find('.appBox').not('.boxDrag')
						}
					} else {
						var offsetPageX = e.pageX - parseInt(self.containerLeft);
						var offsetPageY = e.pageY + self.container.parent().get(0).scrollTop - parseInt(self.containerTop);
						var boxlist = self.container.find('.appBox').not('.boxDrag')
					}
					if (typeof boxlist != "undefined") {
						var eventObjSiblings = boxlist.not('.boxClone');
						if (typeof eventObjSiblings != "undefined" && eventObjSiblings.length > 0) {
							var boxtop, boxleft, boxwidth, boxheight;
							for (var i = 0; i < eventObjSiblings.length; i++) {
								boxtop = parseInt($(eventObjSiblings[i]).css("top"));
								boxleft = parseInt($(eventObjSiblings[i]).css("left"));
								boxwidth = parseInt($(eventObjSiblings[i]).css("width"));
								boxheight = parseInt($(eventObjSiblings[i]).css("height"));
								if (offsetPageX > boxleft && offsetPageX < (boxleft + boxwidth) && offsetPageY > boxtop && offsetPageY < (boxtop + boxheight)) {
									self.changePosition(boxlist, eventObjSiblings, eclone, i)
								}
							}
						}
					}
				}
			}
		}).unbind("mouseup.dialbox").bind("mouseup.dialbox", function (e) {
			if (_downfun) {
				clearTimeout(_downfun)
			}
			if (_editfun) {
				clearTimeout(_editfun)
			}
			_realMove = false;
			if (!_move) {
				if ($('.dialog-visible').length == 0) {
					if (self.container.parent().hasClass('edit')) {
						if (e.button == 2 || !isContainsClass(e.target, 'appBox')) {
							_edit = false;
							setTimeout(function () {
								self.container.parent().removeClass('edit');
								if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
									self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
								}
								self.container.addClass('op_' + self.opacity * 10)
							}, 0)
						}
					} else {
						if (e.button == 2 && (typeof _minSearchForce == "undefined" || _minSearchForce == false)) {
							if (classification && classification.minClassificationSwitch == true) {
								classification.hideMinClassification(true)
							}
							_edit = true;
							setTimeout(function () {
								self.container.parent().removeClass('edit').addClass('edit');
								if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
									self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
								}
								app.loadAppContent(eventObj, 'cloud')
							}, 0)
						}
					}
				}
			}
			if (e.button != 2 && eventObj != '') {
				if (_move) {
					eventObj.css({
						"opacity": 1,
						"zIndex": ''
					});
					eventObj.children().css("cursor", "pointer");
					if (self.page3DSwitcherOpen == true && !eventObj.hasClass('quick')) {
						eventObj.css({
							"WebkitTransform": eclone.css('WebkitTransform'),
							"WebkitTransformOrigin": eclone.css('WebkitTransformOrigin')
						})
					}
					eventObj.css({
						"top": eclone.css('top'),
						"left": eclone.css('left'),
						"WebkitTransition": "left .2s ease-in, top .2s ease-in, opacity .2s ease-in"
					});
					eventObj.attr('id', eclone.attr('id'));
					eventObj.insertAfter(eclone);
					if (onTargetID != '') {
						var fromType = _quickDialBox ? 'quick' : 'normal';
						fromType = dialboxType == "" ? fromType : dialboxType;
						var toType = _moveQuickDialBox ? 'quick' : 'normal';
						PDI.moveDialbox(fromType, toType, parseInt(onDragID.replace('appBox_', '')), parseInt(onTargetID.replace('appBox_', '')));
						dialboxType = ''
					}
					_move = false;
					onDragID = '';
					onTargetID = '';
					ecloneCss = '';
					eventObj.removeClass("boxDrag");
					eclone.remove();
					var normalBoxlist = self.container.find(".appBox");
					var l = normalBoxlist.length;
					if (_moveQuickDialBox && _removeLastDialBox) {
						var lastLeft = self.spacing + (l % self.cols) * (self.spacing + self.width + 2 * self.border) + 'px',
						lastTop = self.spacing + parseInt(l / self.cols) * (self.spacing + (self.titleShow == true ? (self.height + 32) : self.height) + 2 * self.border) + 'px';
						if (self.page3DSwitcherOpen == true) {
							if (self.cols % 2 == 0) {
								var midIndex = parseInt(self.cols / 2);
								if (l % self.cols < midIndex) {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols + 1) * 50) + "% 0%"
								} else {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols - 1) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols) * 50) + "% 0%"
								}
							} else {
								var midIndex = parseInt(self.cols / 2);
								if (l % self.cols != midIndex) {
									var lastTransform = "rotateY(" + ((midIndex - l % self.cols) * 2.5) + "deg)",
									lastTransformOrigin = ((midIndex - l % self.cols + 1) * 50) + "% 0%"
								}
							}
						}
						window.setTimeout(function () {
							self.appendBox(l, lastTop, lastLeft, lastTransform, lastTransformOrigin)
						}, 0)
					}
					if (l == 0) {
						self.loadBoxes("pre")
					}
					self.getBoxes();
					if (eventObj.hasClass('quick')) {
						eventObj.css({
							"height": self.QHeight + "px",
							"WebkitTransform": "",
							"WebkitTransformOrigin": ""
						});
						eventObj.find('.boxTitle').css('backgroundColor', 'transparent');
						eventObj.find('.boxLogo').removeClass('noTitle')
					}
					if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
						self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
					}
					self.container.addClass('op_' + self.opacity * 10)
				}
				if (_down) {
					if (_edit) {
						if (eventObj.attr('appId') == "cloud") {
							app.runApp(eventObj, eventObj.attr('appId'), e)
						} else {
							if (typeof eventObj.find('.boxEdit').get(0) != 'undefined') {
								eventObj.find('.boxEdit').get(0).click()
							}
						}
					} else {
						if (eventObj.attr('appId') != '' && eventObj.attr('appId') != null) {
							app.runApp(eventObj, eventObj.attr('appId'), e)
						} else if (eventObj.attr('url') != '' && eventObj.attr('url') != null) {
							if (e.button == 1 || self.container.parent().hasClass('edit')) {
								openTab(targetSwitch, eventObj.attr('url'), true)
							} else {
								openTab(targetSwitch, eventObj.attr('url'), e.ctrlKey || e.metaKey);
							}
						}
					}
					_down = false
				}
			}
		})
	},
	changePosition: function (curBoxList, curNotCloneBoxList, obj, i, ignore) {
		var self = this;
		var coffset = $(curNotCloneBoxList[i]).offset();
		onTargetID = $(curNotCloneBoxList[i]).attr('id');
		_cx = coffset.left;
		_cy = coffset.top;
		_cw = parseInt($(curNotCloneBoxList[i]).css('width'));
		_ch = parseInt($(curNotCloneBoxList[i]).css('height'));
		var cloneindex = curBoxList.indexOf(obj.get(0));
		var nindex = curBoxList.indexOf($(curNotCloneBoxList[i]).get(0));
		if (cloneindex > -1 && (!(ignore instanceof Array) || ((ignore instanceof Array) && ignore.indexOf(cloneindex) == -1))) {
			var objTop = obj.css('top'),
			objLeft = obj.css('left'),
			objID = obj.attr('id'),
			targetTop = $(curNotCloneBoxList[i]).css('top'),
			targetLeft = $(curNotCloneBoxList[i]).css('left'),
			targetTransform = "",
			targetTransformOrigin = "";
			if (self.page3DSwitcherOpen == true && !$(curNotCloneBoxList[i]).hasClass("quick")) {
				targetTransform = $(curNotCloneBoxList[i]).css('WebkitTransform');
				targetTransformOrigin = $(curNotCloneBoxList[i]).css('WebkitTransformOrigin')
			}
			if (cloneindex < nindex) {
				for (var index = nindex; index > cloneindex; index--) {
					if (self.page3DSwitcherOpen == true && !$(curNotCloneBoxList[i]).hasClass("quick")) {
						$(curBoxList[index]).css({
							"WebkitTransform": $(curBoxList[index - 1]).css('WebkitTransform'),
							"WebkitTransformOrigin": $(curBoxList[index - 1]).css('WebkitTransformOrigin')
						})
					}
					$(curBoxList[index]).css({
						"top": $(curBoxList[index - 1]).css('top'),
						"left": $(curBoxList[index - 1]).css('left')
					});
					$(curBoxList[index]).attr('id', "appBox_" + (parseInt($(curBoxList[index]).attr('id').replace("appBox_", "")) - 1))
				}
			} else {
				for (var index = nindex; index < cloneindex; index++) {
					if (self.page3DSwitcherOpen == true && !$(curNotCloneBoxList[i]).hasClass("quick")) {
						$(curBoxList[index]).css({
							"WebkitTransform": $(curBoxList[index + 1]).css('WebkitTransform'),
							"WebkitTransformOrigin": $(curBoxList[index + 1]).css('WebkitTransformOrigin')
						})
					}
					$(curBoxList[index]).css({
						"top": $(curBoxList[index + 1]).css('top'),
						"left": $(curBoxList[index + 1]).css('left')
					});
					$(curBoxList[index]).attr('id', "appBox_" + (parseInt($(curBoxList[index]).attr('id').replace("appBox_", "")) + 1))
				}
			}
			if (targetTransform != "" && targetTransformOrigin != "") {
				obj.css({
					"WebkitTransform": targetTransform,
					"WebkitTransformOrigin": targetTransformOrigin
				})
			}
			obj.css({
				"top": targetTop,
				"left": targetLeft
			});
			obj.attr('id', onTargetID);
			if (cloneindex < nindex) {
				obj.insertAfter($(curNotCloneBoxList[i]))
			} else {
				obj.insertBefore($(curNotCloneBoxList[i]))
			}
		}
	},
	pageIndex: function () {
		var self = this;
		if (self.totalPage > 1) {
			if (self.pageSwitcher == '') {
				self.container.parent().siblings(".pageSwitcher").remove();
				self.pageSwitcher = $('<div class="pageSwitcher up" pageSwitch="pre"><a><div></div></a></div><div class="pageSwitcher down" pageSwitch="next"><a><div></div></a></div>');
				self.pageSwitcher.bind('click', function () {
					self.loadBoxes($(this).attr('pageSwitch'))
				}).insertBefore(self.container.parent())
			}
			self.container.parent().siblings(".pageSwitcher").css("display", self.pageSwitcherShow != false ? "block" : "none");
			if (self.page == 1) {
				self.container.parent().siblings('.pageSwitcher.up').css("display", "none")
			} else if (self.page == self.totalPage) {
				self.container.parent().siblings('.pageSwitcher.down').css("display", "none")
			}
			if (self.pageIndexSwitcher == '') {
				self.container.parent().find(".pageIndex").remove();
				self.pageIndexSwitcher = $('<div class="pageIndex"><div></div></div>');
				self.pageIndexSwitcher.insertAfter(self.container)
			}
			self.container.parent().find(".pageIndex div").empty();
			for (var i = 1; i <= self.totalPage; i++) {
				self.container.parent().find(".pageIndex div").append($('<a index="' + i + '"></a>').bind('click', function () {
						self.loadBoxes($(this).attr('index'))
					}))
			}
			self.container.parent().find(".pageIndex div").css("width", (self.totalPage * 18 + 4) + "px");
			self.container.parent().find(".pageIndex a").removeClass('selected');
			self.container.parent().find(".pageIndex a[index='" + self.page + "']").addClass('selected')
		} else {
			self.container.parent().siblings(".pageSwitcher").remove();
			self.container.parent().find(".pageIndex").remove();
			self.pageSwitcher = '';
			self.pageIndexSwitcher = ''
		}
	},
	pageNotice: function (message) {
		var self = this;
		if (_noticeFun) {
			clearTimeout(_noticeFun)
		}
		if (typeof message == "undefined") {
			if (self.container.parent().find(".pageNotice").length > 0) {
				self.container.parent().find(".pageNotice").remove()
			}
		} else {
			self.container.parent().append('<div class="pageNotice">' + message + '</div>');
			setTimeout(function () {
				var spaceBlank = self.spacing == 0 ? 40 : 20;
				if ((self.containerTop + self.containerHeight + spaceBlank) <= (document.body.offsetHeight - 100)) {
					self.container.parent().find('.pageNotice').css("bottom", (document.body.offsetHeight - (self.containerTop + self.containerHeight + spaceBlank + 15)) + "px")
				} else {
					self.container.parent().find('.pageNotice').css("bottom", "85px")
				}
				self.container.parent().find('.pageNotice').addClass("show");
				_noticeFun = setTimeout(function () {
						self.pageNotice()
					}, 3000)
			}, 0)
		}
	},
	loadBoxes: function (pageSwitch) {
		var self = this;
		if (typeof pageSwitch == 'undefined' || (parseInt(pageSwitch) == pageSwitch && pageSwitch == self.page)) {
			onDragID = '';
			self.container.empty();
			self.addBoxes();
			self.positionBox();
			return false
		}
		if (parseInt(pageSwitch) == pageSwitch) {
			if (pageSwitch == self.page) {
				return false
			}
			var _pageSwitch = pageSwitch > self.page ? 'next' : 'pre';
			var _page = parseInt(pageSwitch);
			pageSwitch = _pageSwitch
		} else {
			var _page = pageSwitch == "next" ? (self.page * 1) + 1 : (self.page * 1) - 1
		}
		if (_page >= 1 && _page <= self.totalPage) {
			self.page = _page;
			if (self.page3DSwitcherOpen == true) {
				var direction = pageSwitch == "next" ? "right" : "left";
				var containerClone = self.container.clone();
				containerClone.find('.boxLogo').removeClass('empty');
				containerClone.insertAfter(self.container);
				self.container.css({
					"display": "none"
				});
				if (self.opacity == 0) {
					if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
						self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
					}
					self.container.addClass('op_2')
				}
				var removeBoxList = self.container.find('.appBox').not('.boxClone,.boxDrag');
				if (typeof removeBoxList != "undefined") {
					removeBoxList.remove()
				}
				self.addBoxes(pageSwitch);
				self.positionBox();
				if (self.opacity == 0) {
					containerClone.css({
						"opacity": 0.2
					})
				}
				window.setTimeout(function () {
					containerClone.addClass(direction + "FlipFir")
				}, 0);
				window.setTimeout(function () {
					containerClone.remove();
					self.container.css({
						"display": "block"
					});
					if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
						self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
					}
					self.container.addClass('op_' + self.opacity * 10);
					self.container.addClass(direction + "FlipSec")
				}, 180);
				window.setTimeout(function () {
					self.container.removeClass(direction + "FlipSec")
				}, 360)
			} else {
				var distance = pageSwitch == "next" ? parseInt(self.containerWidth + self.containerLeft) : 0 - parseInt(self.containerWidth) - self.containerLeft;
				var allDistance = pageSwitch == "next" ? distance + self.containerLeft : distance - self.containerLeft;
				var containerClone = self.container.clone();
				containerClone.find('.boxLogo').removeClass('empty');
				containerClone.insertAfter(self.container);
				containerClone.css({
					"WebkitTransition": "all .18s ease-in",
				});
				self.container.css({
					"display": "none",
					"left": (self.containerLeft + distance * 1) + "px",
				});
				var removeBoxList = self.container.find('.appBox').not('.boxClone,.boxDrag');
				if (typeof removeBoxList != "undefined") {
					removeBoxList.remove()
				}
				self.addBoxes(pageSwitch);
				self.positionBox();
				window.setTimeout(function () {
					self.container.css({
						"display": "block"
					});
					if (self.opacity == 0) {
						containerClone.css({
							"opacity": 0.2
						})
					}
				}, 10);
				window.setTimeout(function () {
					containerClone.css({
						"left": (self.containerLeft - 1 * distance) + "px"
					});
					self.container.css({
						"WebkitTransition": "all .1s ease-out",
					})
				}, 10);
				window.setTimeout(function () {
					if (self.opacity == 0) {
						self.container.css({
							"left": self.containerLeft + "px"
						});
						if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
							self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
						}
						self.container.addClass('op_2')
					} else {
						self.container.css({
							"left": self.containerLeft + "px"
						})
					}
				}, 40);
				window.setTimeout(function () {
					if (self.opacity == 0) {
						if (self.container.attr('class').indexOf('normalDialbox op_') > -1) {
							self.container.removeClass(self.container.attr('class').replace('normalDialbox ', ''))
						}
						self.container.addClass('op_' + self.opacity * 10)
					}
					self.container.css({
						"WebkitTransition": ""
					});
					containerClone.remove()
				}, 320)
			}
		}
	},
	editBox: function (box) {
		var self = this;
		box.boxObject.find(".boxEdit").unbind("click").bind("click", function () {
			app.runApp(box.boxObject, 'cloud')
		})
	},
	removeBox: function (box) {
		var self = this;
		box.boxObject.find('.boxClose').unbind('click').bind('click', function () {
			if (box.boxObject.hasClass("quick")) {
				PDI.removeDialbox('quick', box.boxObject.attr('id').replace('appBox_', ''));
				box.boxObject.remove();
				self.QTotalnum--;
				self.positionQBox();
				return false
			}
			PDI.removeDialbox('normal', box.boxObject.attr('id').replace('appBox_', ''));
			self.totalnum = self.totalnum - 1;
			if (self.totalnum % self.num == 0 && self.totalPage > 1) {
				self.totalPage = self.totalPage - 1
			}
			self.pageIndex();
			var boxlist = self.container.find('.appBox');
			var thisIndex = boxlist.indexOf(box.boxObject.get(0));
			if (self.page3DSwitcherOpen == true) {
				var lastTransform = $(boxlist[boxlist.length - 1]).css('WebkitTransform'),
				lastTransformOrigin = $(boxlist[boxlist.length - 1]).css('WebkitTransformOrigin')
			}
			var lastTop = $(boxlist[boxlist.length - 1]).css('top'),
			lastLeft = $(boxlist[boxlist.length - 1]).css('left');
			box.boxObject.css({
				"WebkitTransition": "all .2s ease-out",
				"WebkitTransformOrigin": "middle center"
			}).empty();
			window.setTimeout(function () {
				box.boxObject.css({
					"background": "-webkit-linear-gradient(top, rgba(0,0,0,0.2), rgba(0,0,0,1), rgba(0,0,0,0.2))",
					"height": "0px",
					"marginTop": parseInt((self.titleShow == true ? (self.height + 32) : self.height) / 2) + "px",
					"borderRadius": "8px"
				})
			}, 0);
			window.setTimeout(function () {
				box.boxObject.remove();
				if (thisIndex == 0 && boxlist.length == 1) {
					self.loadBoxes("pre")
				} else {
					for (var index = boxlist.length - 1; index > thisIndex; index--) {
						if (self.page3DSwitcherOpen == true) {
							$(boxlist[index]).css({
								"WebkitTransform": $(boxlist[index - 1]).css('WebkitTransform'),
								"WebkitTransformOrigin": $(boxlist[index - 1]).css('WebkitTransformOrigin')
							})
						}
						$(boxlist[index]).css({
							"top": $(boxlist[index - 1]).css('top'),
							"left": $(boxlist[index - 1]).css('left')
						})
					}
					window.setTimeout(function () {
						self.appendBox(boxlist.length - 1, lastTop, lastLeft, lastTransform, lastTransformOrigin)
					}, 200)
				}
			}, 220)
		})
	},
	appendBox: function (startIndex, top, left, transform, transformOrigin) {
		var self = this;
		var page = self.page;
		var existNum = $(self.container.find('.appBox').not('.boxDrag')).length;
		var boxes = self.getBoxes(),
		start = (page - 1) * self.num + startIndex,
		end = start + (self.num * 1) - existNum,
		index = 0,
		iBox = '';
		if (start > self.totalnum - 1) {
			return false
		}
		$.each(boxes, function (i, n) {
			if (self.isDialboxShow(n) && ('appBox_' + i) != onDragID) {
				if (index >= start && index < end) {
					iBox = {
						"id": i,
						"box": n
					};
					return false
				}
				index++
			}
		});
		var thisBox = self.addBox(iBox['id'], iBox['box']);
		if (!self.titleShow) {
			thisBox.boxObject.find('.boxLogo').addClass('noTitle')
		}
		if (self.radius > 30) {
			if (!self.titleShow) {
				thisBox.boxObject.find('.boxTitle').css('backgroundColor', 'transparent');
				thisBox.boxObject.find('.boxTitle').removeClass('middle').addClass('middle')
			}
		}
		thisBox.boxObject.find('.boxLogo').css('borderRadius', self.radius + 'px');
		if (self.radius <= 30 && !self.titleShow) {
			self.container.find('.boxTitle').css('borderRadius', '0 0 ' + self.radius + 'px ' + self.radius + 'px')
		}
		if (self.spacing == 0 || self.radius > 30) {
			thisBox.boxObject.find('.boxLogo').css('borderBottomWidth', '0px')
		}
		if (self.page3DSwitcherOpen == true) {
			if (typeof transform != "undefined" && typeof transformOrigin != "undefined") {
				thisBox.boxObject.css({
					"WebkitTransform": transform,
					"WebkitTransformOrigin": transformOrigin,
				})
			}
		}
		thisBox.boxObject.css({
			"width": self.width + "px",
			"height": (self.titleShow == true ? (self.height + 32) : self.height) + "px",
			"top": top,
			"left": left,
			"display": "block",
			"WebkitTransition": "left .2s ease-in, top .2s ease-in, opacity .2s ease-in"
		})
	},
	isDialboxShow: function (dialbox, type) {
		var self = this;
		var ignoreAppDialboxs = [];
		if (type == 'web') {
			ignoreAppDialboxs.push('bookmarks');
			ignoreAppDialboxs.push('lastVisited');
			if (typeof _config['apps'] != "undefined" && _config['apps'].length > 0 && self.appDialboxs.length == 0) {
				$.each(_config['apps'], function (i, n) {
					self.appDialboxs.push(n.id)
				})
			}
		}
		if (typeof dialbox.isApp != "undefined" && dialbox.isApp) {
			if (ignoreAppDialboxs.indexOf(dialbox.isApp) > -1) {
				return false
			}
			if (type == "web") {
				if (self.appDialboxs.indexOf(dialbox.isApp) == -1) {
					if (dialbox.isApp.indexOf('classification_') !== 0) {
						return false
					}
				}
			}
		}
		if (dialbox.isApp == "cloud") {
			return PDI.get('privateSetup', 'dialBoxCloudBoxSwitch')
		}
		return !dialbox.isDel
	},
	getLastDialbox: function (type) {
		var self = this;
		var boxQueue = [];
		if (type == "quick") {
			var boxQueue = self.getQBoxes()
		} else {
			var _boxes = PDI.get('dialBoxes', 'normal');
			$.each(_boxes, function (i, n) {
				if (self.isDialboxShow(n)) {
					boxQueue.push({
						"id": i,
						"box": n
					})
				}
			})
		}
		if (boxQueue.length == 0) {
			return 0
		}
		return typeof boxQueue[boxQueue.length - 1].box.url != 'undefined' ? boxQueue[boxQueue.length - 1].box.url : boxQueue[boxQueue.length - 1].box.isApp
	},
	getDialboxIndex: function (type, value) {
		var self = this;
		type = (typeof type == 'undefined' || type != 'quick') ? 'normal' : 'quick';
		var _dialboxes = PDI.get('dialBoxes', type);
		var _index = -1;
		$.each(_dialboxes, function (i, n) {
			if (typeof n.url != "undefined" && n.url == value && n.isDel != true) {
				_index = i;
				return false
			} else if (typeof n.isApp != 'undefined' && n.isApp == value && n.isDel != true) {
				_index = i;
				return false
			}
		});
		return _index
	}
};

var DBOX, cId = "", targetSwitch = true, serverValue = [], updateNotification = false;
if (cId = PDI.get("setup", "cId")) {
	storage.setId(cId);
}
if (window.location.hash == "#synchronize") {
	window.location.hash = '';
	document.write('<div class="synLoading"><img src="/img/skin_0/loading.gif"></div>');
	setTimeout(function () {
		oauth.init(true);
	}, 500)
} else {
var code = PDI.get("setup", "code");
if (typeof code == "undefined" || code == "") {
	code = parseInt(Date.now() / 1000) + '' + parseInt(1000 + Math.round(Math.random() * 8999));
	PDI.set("setup", "code", code)
}
var lastVersion = storage.get("version", true);
if (lastVersion == null || lastVersion.length > 12 || parseInt(lastVersion) > 1000000000 || _config.version > lastVersion) {
	PDI.set("version", '', _config.version);
	updateNotification = true
}
replaceLocationDB();
PDI.set('setup', 'openSwitch', true);
oauth.init();

$(function () {
initChromeI18n();
targetSwitch = PDI.get('privateSetup', 'targetSwitch');
$('#baseTarget').attr('target', targetSwitch ? "_self" : "_blank");
$('#searchForm').attr('target', targetSwitch ? "_self" : "_blank");
DBOX.__init__({
		container: $('.normalDialbox'),
		QContainer: $('.quickDialbox'),
		QBContainer: $('.QBannerContainer'),
		num: PDI.get('privateSetup', 'dialBoxNum'),
		page: PDI.get('dialBoxPage') || PDI.get('privateSetup', 'dialBoxPage'),
		opacity: PDI.get('privateSetup', 'dialBoxOpacity'),
		spacing: PDI.get('privateSetup', 'dialBoxSpacing'),
		titleShow: PDI.get('privateSetup', 'dialBoxTitleSwitch'),
		cloudBoxShow: PDI.get('privateSetup', 'dialBoxCloudBoxSwitch'),
		pageSwitcherShow: PDI.get('privateSetup', 'dialBoxPageSwitcher'),
		page3DSwitcherOpen: PDI.get('privateSetup', 'dialBoxPage3DSwitcher'),
		dialBoxQuickHide: PDI.get('privateSetup', 'dialBoxQuickSwitcher'),
		width: PDI.get('privateSetup', 'dialBoxWidth'),
		height: PDI.get('privateSetup', 'dialBoxHeight'),
		radius: PDI.get('privateSetup', 'dialBoxRadius'),
		maxTop: PDI.get('privateSetup', 'dialBoxMaxTop'),
		QBContainerWidth: PDI.get('privateSetup', 'dialBoxQBCWidth')
	});
var skin = PDI.get('privateSetup', 'skin');
if (skin && PDI.getSkin(skin, 'style')) {
var _wallpaperUrl = "", dtime = parseInt(Date.now() / 1000) - PDI.get("privateSetup", "BgChangeTime"),
	unit = parseInt(PDI.get("privateSetup", "BgAutoTime") * 60), _wallpaper;
if (!(skin == "skin_cloud" && unit > 0 && PDI.get('usedWallpaper').length > 0 && dtime >= unit)) {
} else if (!(_wallpaper = PDI.get("wallpaper"))) {
	$.getJSON(urlImg + 'cloudWallpaper/index.json', function (data) {
		if (data) {
			PDI.set("wallpaper", "", data)
		}
	})
} else {
	var _usedWallpaper = PDI.get('usedWallpaper'), _wallpaperId = _usedWallpaper[getRand(0, _usedWallpaper.length)];
	if (parseInt(_wallpaperId) == _wallpaperId) {
		_wallpaperId = parseInt(_wallpaperId);
		$.each(_wallpaper, function (i, n) {
			var _wallpaperLimit = n.split('-');
			if (_wallpaperLimit.length == 2) {
				if (_wallpaperId >= _wallpaperLimit[1] && _wallpaperId <= _wallpaperLimit[0]) {
					_wallpaperUrl = urlImg + 'cloudWallpaper/' + i + '/' + _wallpaperId + '.jpg';
					return false
				}
			}
		});
	} else {
		_wallpaperUrl = _wallpaperId;
	}
	if (_wallpaperUrl) {
		var _style = PDI.getSkin(skin, 'style');
		_style.background.backgroundImage = "url(" + _wallpaperUrl + ")";
		PDI.setSkin(skin, 'style', _style);
		PDI.set("privateSetup", "BgChangeTime", parseInt(Date.now() / 1000) - dtime + parseInt(dtime / unit) * unit);
	}
}

var wall = $('.wallpaper').css('backgroundColor', PDI.getSkin(skin, 'style').background.backgroundColor);
if (!_wallpaperUrl) {
	_wallpaperUrl = PDI.getSkin(skin, 'style').background.backgroundImage.match(/url\((.*)\)/)[1];
}
var st = PDI.getStyle('background');
if (_wallpaperUrl && st.backgroundSize == 'auto 100%' && st.backgroundPosition == '50% 50%') {
	var bgImg = new Image();
	bgImg.onload = function () {
	var w = this.width, h = this.height, oldW = -1, oldH = -1;
	wall.css(PDI.getSkin(skin, 'style').background);
	skin = null;
if (w > h) {
	(window.onresize = function () {
		if (document.body.clientWidth == oldW && document.body.clientHeight <= oldH + 45) return;
		oldW = document.body.clientWidth;
		oldH = document.body.clientHeight;
		if (w / h <= (oldW / oldH)) {
			var mod = 0;
			if (st.backgroundSize != '100% auto') {
				st.backgroundSize = '100% auto';
				mod = 1;
			}
			var newPos = '50% ' + parseInt((oldH - oldW / w * h) / 2) + 'px';
			if (st.backgroundPosition != newPos) {
				st.backgroundPosition = newPos;
				mod = 1;
			}
			if (mod === 1) {
				wall.css(st);
			}
		} else if (st.backgroundSize != 'auto 100%' || st.backgroundPosition != '50% 0px') {
			st.backgroundSize = 'auto 100%';
			st.backgroundPosition = '50% 0px';
			wall.css(st);
		}
	})();
	wall.css(st);
} else {
	st.backgroundPosition = '50% 0px';
	wall.css(st);
	st = w = h = null;
	(window.onresize = function () {
		if (document.body.clientWidth == oldW && document.body.clientHeight <= oldH) return;
		oldW = document.body.clientWidth;
		oldH = document.body.clientHeight;
		wall.css({
			"backgroundSize": 'auto ' + oldH + 'px'
		});
	})();
}
	};
	bgImg.src = _wallpaperUrl;
	_wallpaperUrl = null;
	bgImg = null;
} else {
	wall.css(PDI.getSkin(skin, 'style').background).css(st);
	st = null;
}
}
app.loadApp($('.appBox[appId=classification]'), 'classification');
if (window.location.hash == "#setting") {
	window.location.hash = "";
	setTimeout(function () {
		app.runApp($('.appBox[appId=setup]'), 'setup');
		setTimeout(function () {
			app.runedAppObjects['setup'].show()
		}, 300)
	}, 300)
}
var mset = PDI.get('myset');
if (!mset || mset === _config || mset.weather !== false) {
	app.loadApp('', 'weather');
}
mset = null;
})
};