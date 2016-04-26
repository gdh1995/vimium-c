"use strict";
var $ = document.getElementById.bind(document),
    shownNode, bgLink = $('bgLink'), BG,
    url, type, file;

BG = window.chrome && chrome.extension && chrome.extension.getBackgroundPage();
if (!(BG && BG.Utils && BG.Utils.convertToUrl)) {
  BG = null;
}

window.onhashchange = function() {
  var str, ind;
  type = file = "";
  if (shownNode) {
    shownNode.remove();
    shownNode = null;
  }

  url = location.hash;
  if (url.length < 3) {}
  else if (url.startsWith("#!image")) {
    url = url.substring(8);
    type = "image";
  } else if (url.startsWith("#!url")) {
    url = url.substring(6);
    type = "url";
  }
  if (ind = url.indexOf("&") + 1) {
    if (url.startsWith("download=")) {
      file = decodeURLPart(url.substring(9, ind - 1));
      url = url.substring(ind);
    }
  }
  if (url.indexOf(":") <= 0) {
    url = decodeURLPart(url).trim();
  }
  if (!url && type == "image") {
    type = "";
  } else if (url.toLowerCase().startsWith("javascript:")) {
    type = url = file = "";
  }

  switch (type) {
  case "image":
    shownNode = importBody("shownImage");
    shownNode.onerror = function() {
      shownNode.classList.add("broken");
      setTimeout(showBgLink, 34);
    };
    if (url.indexOf(":") > 0 || url.lastIndexOf(".") > 0) {
      shownNode.src = url;
      shownNode.onclick = openByDefault;
      shownNode.onload = showBgLink;
    } else {
      url = "";
      shownNode.setAttribute("alt", "\xa0(null)\xa0");
      shownNode.onerror();
    }
    file && shownNode.setAttribute("download", file);
    break;
  case "url":
    shownNode = importBody("shownText");
    if (url && BG) {
      ind = url.startsWith("vimium://") ? 1 : 0;
      str = BG.Utils.convertToUrl(url, null, ind + 0.5);
      if (BG.Utils.lastUrlType !== 5) {}
      else if (str instanceof BG.Promise) {
        str.then(function(arr) {
          showText(arr[1], arr[0] || (arr[2] || ""));
        });
        break;
      } else if (str instanceof BG.Array) {
        showText(str[1], str[0]);
        break;
      }
      url = str;
    }
    showText(type, url);
    break;
  default:
    url = "";
    shownNode = importBody("shownImage");
    shownNode.src = "../icons/vimium.png";
    bgLink.style.display = "none";
    break;
  }

  bgLink.setAttribute("data-vim-url", url);
  if (file) {
    bgLink.setAttribute("data-vim-text", file);
    bgLink.download = file;
  } else {
    bgLink.removeAttribute("data-vim-text");
    bgLink.removeAttribute("download");
  }
  bgLink.onclick = shownNode ? clickShownNode : openByDefault;

  str = document.querySelector('title').getAttribute('data-title');
  str = BG ? BG.Utils.createSearch(file ? file.split(/\s+/) : [], { url: str })
    :str.replace(/\$[sS](?:\{[^\}]*\})?/, file && (file + " | "));
  document.title = str;
}

if (!String.prototype.startsWith) {
String.prototype.startsWith = function(s) {
  return this.lastIndexOf(s, 0) === 0;
};
}
window.onhashchange();

window.addEventListener("keydown", function(event) {
  var str;
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || event.repeat) { return; }
  str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    clickLink({
      download: file
    }, event);
  } else if (str === "C") {
    window.getSelection().type !== "Range" && copyThing(event);
  } else if (str === "A") {
    toggleInvert();
  }
});

function showBgLink() {
  var height = shownNode.scrollHeight, width = shownNode.scrollWidth;
  bgLink.style.height = height + "px";
  bgLink.style.width = width + "px";
  bgLink.style.marginLeft = -width + "px";
  bgLink.style.display = "";
}

function clickLink(options, event) {
  event.preventDefault();
  if (!url) { return; }
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

function importBody(id) {
  var node = document.importNode($('bodyTemplate').content.getElementById(id), true);
  document.body.insertBefore(node, bgLink);
  return node;
}

function openByDefault(event) {
  clickLink(event.altKey ? {
    download: file
  } : {
    target: "_blank"
  }, event);
}

function clickShownNode(event) {
  event.preventDefault();
  if (shownNode.onclick) {
    shownNode.onclick(event);
  }
}

function showText(tip, body) {
  $("textTip").setAttribute("data-tip", tip);
  if (body) {
    $("textBody").textContent = body;
    shownNode.onclick = copyThing;
  } else {
    $("textBody").classList.add("null");
  }
  showBgLink();
}

function copyThing(event) {
  event.preventDefault();
  var str = url;
  if (type == "url") {
    str = $("textBody").textContent;
  }
  if (!(str && window.MainPort)) { return; }
  MainPort.sendMessage({
    handler: "copyToClipboard",
    data: url
  }, function() {
    VHUD.showCopied(url);
  });
}

function toggleInvert(event) {
  if (type === "image") {
    shownNode.classList.toggle("invert");
  }
}
