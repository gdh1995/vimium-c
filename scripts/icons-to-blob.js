#!/usr/bin/env node
// @ts-check
"use strict";

var allIcons = [
  { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
  { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
  { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
];

/**
 * ===========================
 * This section is for Node.js
 * ===========================
 */

 /** @type {import("./dependencies").FileSystem} */
// @ts-ignore
var fs = require("fs");
/** @type {import("./dependencies").ProcessType} */
// @ts-ignore
var process = require("process");
// @ts-ignore
var PNG = require("pngjs").PNG;
try {
  var lib = require("./dependencies");
} catch (ex) { lib = null; }
var destRoot = +(process.env["BUILD_NDEBUG"] || 0) > 0 ? "dist/" : process.env["LOCAL_DIST"] || "";

/**
 * Convert a single image
 * @typedef {import("./dependencies").Buffer} Buffer
 * @param {string} src - path of image source file
 * @param {string} [dest] - path of binary target file, default to "nul" and then call back with imageData
 * @param {(imageDataOrDestFileSize: {data: Buffer, width: number, height: number} | number) => any} callback
 */
function convertPngToBinary(src, dest, callback) {
  fs.createReadStream(src).pipe(new PNG({
      filterType: 6
  })).on('parsed', dest && dest != "nul" && dest != "/dev/null" ? function () {
    var len = this.data.length;
    fs.writeFile(dest, this.data, function () { callback && callback(len) });
  } : function () {
    callback && callback(this);
  });
}

/**
 * Convert all image files
 * @param {((error?: any) => any) | null} [callback]
 * @param {Object} [options]
 * @param {Array<{ [size: string]: string }>} [options.icons = allIcons]
 * @param {(src: string) => string} [options.getDest]
 * @param {(src: string, dest: string) => boolean} [options.checkLatest]
 * @param {(message: string, ...params: any[]) => void} [options.print = console.log]
 */
function main(callback = null
    , {
      icons = allIcons,
      getDest,
      checkLatest = lib && lib.compareFileTime,
      print = console.log
    } = {}) {
  /** @type {string[]} */
  let total = [], toUpdate = 0, consumed = 0, end = false;
  const iter = (item) => {
    if (item instanceof Array) { item.forEach(iter); }
    else if (typeof item === "object") { for (var key of Object.keys(item)) { iter(item[key]); } }
    else if (typeof item === "string") { total.push(item); }
    else { throw Error("Unknown item: " + JSON.stringify(item)); }
  }, does_finish = () => {
    if (end && consumed === toUpdate) {
      let local_cb = callback;
      callback = null;
      local_cb ? local_cb()
      // @ts-ignore
      : consumed <= 0 && typeof require === "function" && require && require.main === module
        && process.argv.indexOf("-q") > 0 ? void 0
      : print("All %d new icons in %d converted.", consumed, totalCount);
    }
  };
  iter(icons);
  destRoot = destRoot.replace(/\\/g, "/");
  destRoot && destRoot.slice(-1) != "/" && (destRoot += "/");
  const totalCount = total.length;
  for (let filePath of total) {
    filePath = filePath.replace(/^\//, "");
    const dest = getDest ? getDest(filePath) : destRoot + filePath.replace(".png", ".bin");
    if (checkLatest && checkLatest(filePath, dest)) { continue; }
    toUpdate++;
    convertPngToBinary(filePath, dest, function (len) {
      print("Convert: %s => %s", filePath, dest, ", byte[", len, "]");
      consumed++;
      does_finish();
    });
  }
  end = true;
  does_finish();
  return total;
}

if (typeof module !== "undefined") {
  module.exports = {
    allIcons: allIcons,
    convertPngToBinary: convertPngToBinary,
    main: main,
    ToBlobURL: ToBlobURL,
    setDestRoot: function (newRoot) {
      destRoot = newRoot;
    }
  };
}
// @ts-ignore
if (typeof require === "function" && require && require.main === module) {
  main();
}


/**
 * ===========================
 * This section is for browser
 * ===========================
 */

/**
 * Convert all images to blob: URLs
 * @typedef { {data: Uint8ClampedArray; readonly height: number; readonly width: number;} } ImageData
 * @typedef { {[size: number]: ImageData | string | undefined;} } IconBufferEx
 * @param { ImageData | string | IconBufferEx | IconBufferEx[] } images
 * @param {string} [key] - id to locate the image item and its children
 * @param {Array<[string, string, ...any[]?]>} [out] - buffer of output array; out[1] is blob URL or error message
 */
function ToBlobURL(images, key, out) {
  out = out || [];
  if (images instanceof Array) {
    images.forEach(function (i, ind) { ToBlobURL(i, (key || "") + "[" + ind + "]", out); });
    return out;
  } else if (typeof images === "object" && images && !("data" in images)) {
    for (var sub_key in images) {
      Object.prototype.hasOwnProperty.call(images, sub_key) && images[sub_key] &&
      ToBlobURL(images[sub_key], key ? key + "." + sub_key : sub_key, out);
    }
    return out;
  }
  /** @type {[string, string, ...any[]?]} */
  var out_item = [key || "()", "(loading)"];
  if (typeof images === "string") {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = canvas.height = 48;
      var ctx = canvas.getContext("2d");
      var w = this.width, h = this.height;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(this, 0, 0, w, h);
      var imageData = ctx.getImageData(0, 0, w, h);
      imageDataToBlobURL(imageData);
    };
    img.onerror = function (ev) {
      out_item[1] = "(error)";
      out_item.push(ev);
    }
    img.crossOrigin = "anonymous";
    img.src = images;
  } else if ("data" in images) {
    imageDataToBlobURL(images);
  } else {
    out_item[1] = "(unknown)";
    out_item.push(images);
  }
  out.push(out_item);
  return out;

  /**
   * @param { ImageData } imageData
   */
  function imageDataToBlobURL(imageData) {
    var blob = new Blob([imageData.data], {type: "application/octet-stream"});
    var url = URL.createObjectURL(blob);
    out_item[1] = url;
  }
}

if (typeof window === "object" && typeof document === "object") {
  var blobURLs = ToBlobURL(allIcons);
  setTimeout(function () {
    console.log(blobURLs.map(function (i) { i.join(" ") }).join("\n"));
  }, 400);
}
