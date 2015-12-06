"use strict";var $=function(){
function u(a){return a in s?s[a]:s[a]=RegExp("(^|\\s)"+a+"(\\s|$)")}
function o(a){for(var c=0;c<a.length;c++)a.indexOf(a[c])!=c&&(a.splice(c,1),c--);return a}
function v(a,c){var b=[];if(a==f)return b;for(;a;a=a.nextSibling)a.nodeType==1&&a!==c&&b.push(a);return b}
function A(a,c,b,e){c=x(c);if(c.ns)var d=RegExp("(?:^| )"+c.ns.replace(" "," .* ?")+"(?: |$)");return(p[a._jqmid||(a._jqmid=t++)]||[]).filter(function(a){return a&&(!c.e||a.e==c.e)&&(!c.ns||d.test(a.ns))&&(!b||a.fn==b||typeof a.fn==="function"&&typeof b==="function"&&""+a.fn===""+b)&&(!e||a.sel==e)})}
function x(a){a=(""+a).split(".");return{e:a[0],ns:a.slice(1).sort().join(" ")}}
function y(a,c,b){d.isObject(a)?d.each(a,b):a.split(/\s/).forEach(function(a){b(a,c)})}
function q(a,c,b,e,f){var i=a._jqmid||(a._jqmid=t++),g=p[i]||(p[i]=[]);y(c,b,function(b,c){var i=f&&f(c,b),j=i||c,k=function(b){var c=j.apply(a,[b].concat(b.data));c===!1&&b.preventDefault();return c},i=d.extend(x(b),{fn:c,proxy:k,sel:e,del:i,i:g.length});g.push(i);a.addEventListener(i.e,k,!1)})}
function r(a,c,b,e){var d=a._jqmid||(a._jqmid=t++);y(c||"",b,function(b,c){A(a,b,c,e).forEach(function(b){delete p[d][b.i];a.removeEventListener(b.e,b.proxy,!1)})})}
function m(a,c){this.length=0;if(a)if(a instanceof m&&c==f)return a;else if(d.isArray(a)&&a.length!=f){for(var b=0;b<a.length;b++)this[this.length++]=a[b];return this}else if(d.isObject(a)&&d.isObject(c)){if(a.length==f)a.parentNode==c&&(this[this.length++]=a);else for(b=0;b<a.length;b++)a[b].parentNode==c&&(this[this.length++]=a[b]);return this}else if(d.isObject(a)&&c==f)return this[this.length++]=a,this;else if(c!==f){if(c instanceof m)return c.find(a)}else c=j;else return this;if(b=this.selector(a,c))if(d.isArray(b))for(var e=0;e<b.length;e++)this[this.length++]=b[e];else this[this.length++]=b;return this}
var f,g=window,j=document,l=[].__proto__,s=[],H=/^\s*<(\w+)[^>]*>/,k={},p={},t=1,
d=function (a,c){return new m(a,c)},n=function(){},
z={type:"GET",beforeSend:n,success:n,error:n,complete:n,context:f,timeout:0,crossDomain:!1};

d.each=function(a,c){var b;if(d.isArray(a))for(b=0;b<a.length;b++){if(c(b,a[b])===!1)break}else if(d.isObject(a))for(b in a)if(a.hasOwnProperty(b)&&c(b,a[b])===!1)break;return a};
d.extend=function(a){a==f&&(a=this);if(arguments.length===1){for(var c in a)this[c]=a[c];return this}else l.slice.call(arguments,1).forEach(function(b){for(var c in b)a[c]=b[c]});return a};
d.isArray=function(a){return a instanceof Array&&a.push!=f};
d.isFunction=function(a){return typeof a==="function"};
d.isObject=function(a){return typeof a==="object"};

d.fn=m.prototype={
__proto__:l,
constructor:m,push:l.push,indexOf:l.indexOf,concat:l.concat,oldElement:f,
selector:function(a,c){var b;if(a[0]==="#"&&a.indexOf(" ")===-1&&a.indexOf(">")===-1)return b=c==j?c.getElementById(a.replace("#","")):l.slice.call(c.querySelectorAll(a));a=a.trim();a[0]==="<"&&a[a.length-1]===">"?(b=j.createElement("div"),b.innerHTML=a.trim(),b=l.slice.call(b.childNodes)):b=l.slice.call(c.querySelectorAll(a));return b},
setupOld:function(a){if(a==f)return d();a.oldElement=this;return a},
each:function(a){l.forEach.call(this, function(c,b){a(b,c)});return this},
find:function(a){if(this.length===0)return f;for(var c=[],b,e=0;e<this.length;e++){b=d(a,this[e]);for(var h=0;h<b.length;h++)c.push(b[h])}return d(o(c))},
html:function(a){if(this.length===0)return f;if(a===f)return this[0].innerHTML;for(var c=0;c<this.length;c++)this[c].innerHTML=a;return this},
text:function(a){if(this.length===0)return f;if(a===f)return this[0].textContent;for(var c=0;c<this.length;c++)this[c].textContent=a;return this},
css:function(a,c,b){if(this.length===0)return f;if(c==f&&typeof a==="string"){b=b!=f?b:this[0];return b.style[a]||g.getComputedStyle(b)[a]}for(b=0;b<this.length;b++)if(d.isObject(a))for(var e in a)this[b].style[e]=a[e];else this[b].style[a]=c;return this},
empty:function(){for(var a=0;a<this.length;a++)this[a].innerHTML="";return this},
hide:function(){if(this.length===0)return this;for(var a=0;a<this.length;a++)if(this.css("display",null,this[a])!="none")this[a].setAttribute("jqmOldStyle",this.css("display",null,this[a])),this[a].style.display="none";return this},
show:function(){if(this.length===0)return this;for(var a=0;a<this.length;a++)if(this.css("display",null,this[a])=="none")this[a].style.display=this[a].getAttribute("jqmOldStyle")?this[a].getAttribute("jqmOldStyle"):"block",this[a].removeAttribute("jqmOldStyle");return this},
toggle:function(a){for(var c=a===!0?!0:!1,b=0;b<this.length;b++)g.getComputedStyle(this[b]).display!=="none"||a!==f&&c===!1?(this[b].setAttribute("jqmOldStyle",this[b].style.display),this[b].style.display="none"):(this[b].style.display=this[b].getAttribute("jqmOldStyle")!=f?this[b].getAttribute("jqmOldStyle"):"block",this[b].removeAttribute("jqmOldStyle"));return this},
val:function(a){if(this.length===0)return f;if(a==f)return this[0].value;for(var c=0;c<this.length;c++)this[c].value=a;return this},
attr:function(a,c){if(this.length===0)return f;if(c===f&&!d.isObject(a))return this[0].jqmCacheId&&k[this[0].jqmCacheId][a]?this[0].jqmCacheId&&k[this[0].jqmCacheId][a]:this[0].getAttribute(a);for(var b=0;b<this.length;b++)if(d.isObject(a))for(var e in a)d(this[b]).attr(e,a[e]);else if(d.isArray(c)||d.isObject(c)||d.isFunction(c)){if(!this[b].jqmCacheId)this[b].jqmCacheId=d.uuid();k[this[b].jqmCacheId]||(k[this[b].jqmCacheId]={});k[this[b].jqmCacheId][a]=c}else c==null&&c!==f?(this[b].removeAttribute(a),this[b].jqmCacheId&&k[this[b].jqmCacheId][a]&&delete k[this[b].jqmCacheId][a]):this[b].setAttribute(a,c);return this},
removeAttr:function(a){for(var c=this,b=0;b<this.length;b++)a.split(/\s+/g).forEach(function(e){c[b].removeAttribute(e);c[b].jqmCacheId&&k[c[b].jqmCacheId][a]&&delete k[c[b].jqmCacheId][a]});return this},
remove:function(a){a=d(this).filter(a);if(a==f)return this;for(var c=0;c<a.length;c++)a[c].remove();return this},
addClass:function(a){for(var c=0;c<this.length;c++){var b=this[c].className,e=[],d=this;a.split(/\s+/g).forEach(function(a){d.hasClass(a,d[c])||e.push(a)});this[c].className+=(b?" ":"")+e.join(" ");this[c].className=this[c].className.trim()}return this},
removeClass:function(a){for(var c=0;c<this.length;c++){if(a==f){this[c].className="";break}var b=this[c].className;a.split(/\s+/g).forEach(function(a){b=b.replace(u(a)," ")});this[c].className=b.length>0?b.trim():""}return this},
hasClass:function(a,c){if(this.length===0)return!1;c||(c=this[0]);return u(a).test(c.className)},
append:function(a,c){if(a&&a.length!=f&&a.length===0)return this;if(d.isArray(a)||d.isObject(a))a=d(a);var b;for(b=0;b<this.length;b++)if(a.length&&typeof a!="string")for(var a=d(a),e=0;e<a.length;e++)c!=f?this[b].insertBefore(a[e],this[b].firstChild):this[b].appendChild(a[e]);else{e=H.test(a)?d(a):f;if(e==f||e.length==0)e=j.createTextNode(a);if(e instanceof m)for(var h=0;h<e.length;h++)c!=f?this[b].insertBefore(e[h],this[b].firstChild):this[b].appendChild(e[h]);else c!=f?this[b].insertBefore(e,this[b].firstChild):this[b].appendChild(e)}return this},
prepend:function(a){return this.append(a,1)},
insertBefore:function(a,c){if(this.length==0)return this;a=d(a).get(0);if(!a||a.length==0)return this;for(var b=0;b<this.length;b++)a.parentNode.insertBefore(this[b],c?a.nextSibling:a);return this},
insertAfter:function(a){this.insertBefore(a,!0)},
get:function(a){a=a==f?0:a;a<0&&(a+=this.length);return this[a]?this[a]:f},
offset:function(){if(this.length===0)return f;var a=this[0].getBoundingClientRect();return{left:a.left+g.pageXOffset,top:a.top+g.pageYOffset,width:parseInt(this[0].style.width),height:parseInt(this[0].style.height)}},
parent:function(a){if(this.length==0)return f;for(var c=[],b=0;b<this.length;b++)this[b].parentNode&&c.push(this[b].parentNode);return this.setupOld(d(o(c)).filter(a))},
children:function(a){if(this.length==0)return f;for(var c=[],b=0;b<this.length;b++)c=c.concat(v(this[b].firstChild));return this.setupOld(d(c).filter(a))},
siblings:function(a){if(this.length==0)return f;for(var c=[],b=0;b<this.length;b++)this[b].parentNode&&(c=c.concat(v(this[b].parentNode.firstChild,this[b])));return this.setupOld(d(c).filter(a))},
filter:function(a){if(this.length==0)return f;if(a==f)return this;for(var c=[],b=0;b<this.length;b++){var e=this[b];e.parentNode&&d(a,e.parentNode).indexOf(e)>=0&&c.push(e)}return this.setupOld(d(o(c)))},
not:function(a){if(this.length==0)return f;for(var c=[],b=0;b<this.length;b++){var e=this[b];e.parentNode&&d(a,e.parentNode).indexOf(e)==-1&&c.push(e)}return this.setupOld(d(o(c)))},
data:function(a,c){return this.attr("data-"+a,c)},
end:function(){return this.oldElement!=f?this.oldElement:d()},
clone:function(a){a=a===!1?!1:!0;if(this.length==0)return f;for(var c=[],b=0;b<this.length;b++)c.push(this[b].cloneNode(a));return d(c)}
};

d.ajax=function(a){var c;try{c=new g.XMLHttpRequest;var b=a||{},e;for(e in z)b[e]||(b[e]=z[e]);if(!b.url)b.url=g.location;if(!b.contentType)b.contentType="application/x-www-form-urlencoded";if(!b.headers)b.headers={};if(b.dataType)switch(b.dataType){case"json":b.dataType="application/json";break;case"xml":b.dataType="application/xml, text/xml";break;case"text":b.dataType="text/plain";break;case"html":default:b.dataType="text/html"}else b.dataType="text/html";if(d.isObject(b.data))b.data=d.param(b.data);b.type.toLowerCase()==="get"&&b.data&&(b.url+=b.url.indexOf("?")===-1?"?"+b.data:"&"+b.data);if(!b.crossDomain)b.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(b.url)&&RegExp.$2!=g.location.host;if(!b.crossDomain)b.headers=d.extend({"X-Requested-With":"XMLHttpRequest"},b.headers);var f,i=b.context,j=/^([\w-]+:)\/\//.test(b.url)?RegExp.$1:g.location.protocol;c.onreadystatechange=function(){var a=b.dataType;if(c.readyState===4){clearTimeout(f);var d,e=!1;if(c.status>=200&&c.status<300||c.status===0&&j=="file:"){if(a==="application/json"&&!/^\s*$/.test(c.responseText))try{d=JSON.parse(c.responseText)}catch(g){e=g}else d=c.responseText;c.status===0&&d.length===0&&(e=!0);e?b.error.call(i,c,"parsererror",e):b.success.call(i,d,"success",c)}else e=!0,b.error.call(i,c,"error");b.complete.call(i,c,e?"error":"success")}};c.open(b.type,b.url,!0);if(b.contentType)b.headers["Content-Type"]=b.contentType;for(var k in b.headers)c.setRequestHeader(k,b.headers[k]);if(b.beforeSend.call(i,c,b)===!1)return c.abort(),!1;b.timeout>0&&(f=setTimeout(function(){c.onreadystatechange=n;c.abort();b.error.call(i,c,"timeout")},b.timeout));c.send(b.data)}catch(l){console.log(l)}return c};
d.get=function(a,c){return this.ajax({url:a,success:c})};
d.post=function(a,c,b,d){typeof c==="function"&&(b=c,c={});d===f&&(d="html");return this.ajax({url:a,type:"POST",data:c,dataType:d,success:b})};
d.getJSON=function(a,c,b){typeof c==="function"&&(b=c,c={});return this.ajax({url:a,data:c,success:b,dataType:"json"})};
d.param=function(a,c){var b=[];if(a instanceof m)a.each(function(){b.push((c?c+"[]":this.id)+"="+encodeURIComponent(this.value))});else for(var e in a){var f=c?c+"["+e+"]":e,g=a[e];b.push(d.isObject(g)?d.param(g,f):f+"="+encodeURIComponent(g))}return b.join("&")};
d.uuid=function(){var a=function(){return((1+Math.random())*65536|0).toString(16).substring(1)};return a()+a()+"-"+a()+"-"+a()+"-"+a()+"-"+a()+a()+a()};

d.fn.bind=function(a,c){for(var b=0;b<this.length;b++)q(this[b],a,c);return this};
d.fn.unbind=function(a,c){for(var b=0;b<this.length;b++)r(this[b],a,c);return this};

return d}();