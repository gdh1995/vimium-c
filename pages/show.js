"use strict";
var $ = document.getElementById.bind(document),
    shownNode, bgLink = $('bgLink'),
    url, type, file;

function decodeHash() {
  type = file = "";
  url = location.hash;
  if (url.lastIndexOf("#!image=", 0) === 0) {
    url = url.substring(8);
    type = "image";
  }
  var ind = url.lastIndexOf("&download=");
  if (ind > 0) {
    file = decodeURLPart(url.substring(ind + 10));
    url = url.substring(0, ind);
  }
  if (url.indexOf("://") === -1) {
    url = decodeURLPart(url);
    if (url.indexOf("://") === -1) {
      url = chrome.runtime.getURL(url);
    }
  }
  bgLink.setAttribute("data-vim-url", url);
  bgLink.setAttribute("data-vim-text", file);
  bgLink.download = file;

  shownNode = null;
  switch (type) {
  case "image":
    shownNode = $("shownImage");
    shownNode.src = url;
    shownNode.onclick = openByDefault;
    shownNode.onload = function() {
      bgLink.style.height = this.height + "px";
      bgLink.style.width = this.width + "px";
      bgLink.style.display = "";
    };
    shownNode.onerror = function() {
      setTimeout(function() {
        shownNode.onload();
      }, 34);
    };
    break;
  default:
    url = "";
    shownNode = $("shownImage");
    shownNode.src = "../icons/vimium.png";
    bgLink.style.display = "";
    break;
  }

  if (shownNode) {
    shownNode.setAttribute("download", file);
    shownNode.style.display = "";
    bgLink.onclick = function(event) {
      event.preventDefault();
      shownNode.onclick(event);
    };
  } else {
    bgLink.onclick = openByDefault;
  }
}

window.addEventListener("hashchange", decodeHash);
decodeHash();

window.addEventListener("keydown", function(event) {
  var str;
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || !url) { return; }
  str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    event.preventDefault();
    clickLink({
      download: file
    }, event);
  }
});

function clickLink(options, event) {
  var a = document.createElement('a'), i;
  for (i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = url;
  if (window.DomUtils) {
    DomUtils.simulateClick(a, event);
  } else {
    a.click();
  }
}

function decodeURLPart(url) {
  try {
    url = decodeURIComponent(url);
  } catch (e) {}
  return url;
}

function openByDefault(event) {
  clickLink(event.altKey ? {
    download: file
  } : {
    target: "_blank"
  }, event);  
}
