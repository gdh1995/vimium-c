"use strict";
function decodeHash() {
  var shownNode, url, type;
  url = location.hash;
  if (url.startsWith("#?image=")) {
    url = url.substring(8);
    type = "image";
  }
  if (url) {
    try {
      url = decodeURIComponent(url);
    } catch (e) {}
  } else {
    return;
  }

  switch (type) {
  case "image":
    shownNode = document.getElementById("shownImage");
    shownNode.src = url;
    break;
  default: return;
  }

  if (shownNode) {
    shownNode.style.display = "";
  }
};

window.addEventListener("hashchange", decodeHash);
window.onload = decodeHash;
