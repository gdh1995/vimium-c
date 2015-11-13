"use strict";
var $ = document.getElementById.bind(document), shownNode, bgLink;
function decodeHash() {
  var url, type;
  url = location.hash;
  if (url.lastIndexOf("#!image=", 0) === 0) {
    url = url.substring(8);
    type = "image";
  } else {
    return;
  }
  try {
    url = decodeURIComponent(url);
  } catch (e) {}

  switch (type) {
  case "image":
    shownNode = $("shownImage");
    shownNode.src = url;
    shownNode.onclick = function() {
      clickLink(this.src, {
        target: "_blank"
      });
    };
    bgLink = $('bgLink');
    bgLink.setAttribute('data-vim-url', url);
    bgLink.style.display = "none";
    shownNode.onload = function() {
      bgLink.style.height = this.height + "px";
      bgLink.style.width = this.width + "px";
      bgLink.style.display = "";
      bgLink.onclick = function() {
        shownNode.click();
      };
    };
    shownNode.onerror = function() {
      setTimeout(function(){
        shownNode.onload();
      }, 34);
    }
    break;
  }

  if (shownNode) {
    shownNode.style.display = "";
  }
}

window.addEventListener("hashchange", decodeHash);
decodeHash();

window.addEventListener("keydown", function(event) {
  var str;
  if (!(event.ctrlKey || event.metaKey) || event.altKey
    || event.shiftKey || !shownNode) { return; }
  str = String.fromCharCode(event.keyCode);
  if (str === 'S') {
    if (str = shownNode.src) {
      event.preventDefault();
      clickLink(str, {
        download: ""
      });
    }
  }
});

function clickLink(url, options) {
  var a = document.createElement('a'), i;
  for (i in options) {
    a.setAttribute(i, options[i]);
  }
  a.href = url;
  a.click();
}
