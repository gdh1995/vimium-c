"use strict";
var $ = document.getElementById.bind(document),
    shownNode, bgLink = $('bgLink'),
    url, type, file;

function decodeHash() {
  var str, BG;
  type = file = "";
  if (shownNode) {
    shownNode.remove();
    shownNode = null;
  }

  url = location.hash;
  if (url.length < 3) {}
  else if (url.lastIndexOf("#!image=", 0) === 0) {
    url = url.substring(8);
    type = "image";
  } else if (url.lastIndexOf("#!url=", 0) === 0) {
    url = url.substring(6);
    type = "url";
  }
  var ind = url.lastIndexOf("&download=");
  if (ind > 0) {
    file = decodeURLPart(url.substring(ind + 10));
    url = url.substring(0, ind);
  }
  if (url.indexOf("://") === -1) {
    url = decodeURLPart(url);
  }

  switch (type) {
  case "image":
    shownNode = importBody("shownImage");
    shownNode.src = url;
    shownNode.onclick = openByDefault;
    shownNode.onload = showBgLink;
    shownNode.onerror = function() {
      setTimeout(showBgLink, 34);
    };
    break;
  case "url":
    shownNode = importBody("shownText");
    BG = chrome && chrome.extension && chrome.extension.getBackgroundPage();
    if (BG && BG.Utils && BG.Utils.convertToUrl) {
      ind = url.lastIndexOf("vimium://", 0) === 0 ? 1 : 0;
      str = BG.Utils.convertToUrl(url, null, ind);
      if (BG.Utils.lastUrlType !== 5) {}
      else if (str instanceof BG.Promise) {
        str.then(function(arr) {
          showText(arr[1], arr[0] || arr[2]);
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

  if (shownNode) {
    shownNode.setAttribute("download", file);
    bgLink.onclick = clickShownNode;
  } else {
    bgLink.onclick = openByDefault;
  }
  str = url && url.indexOf("://") === -1 ? chrome.runtime.getURL(url) : url;
  bgLink.setAttribute("data-vim-url", str);
  bgLink.setAttribute("data-vim-text", file);
  bgLink.download = file;
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

function showBgLink() {
  bgLink.style.height = shownNode.scrollHeight + "px";
  bgLink.style.width = shownNode.scrollWidth + "px";
  bgLink.style.display = "";
}

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

function importBody(id) {
  var template = $('bodyTemplate'),
      node = document.importNode(template.content.getElementById(id), true);
  document.body.insertBefore(node, $('bodyTemplate'));
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
  $("textBody").textContent = body;
  showBgLink();
}
