#!/usr/bin/env node
// @ts-check
"use strict";
/**
 * @typedef {import("./dependencies").Buffer} Buffer
 * @typedef { {
 *    data: Buffer; width: number; height: number;
 * } } PNGImage
 */

 var allIcons = [
  { 19: "/icons/enabled_19.png", 38: "/icons/enabled_38.png" },
  { 19: "/icons/partial_19.png", 38: "/icons/partial_38.png" },
  { 19: "/icons/disabled_19.png", 38: "/icons/disabled_38.png" }
];
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
 * @param {string} src - path of image source file
 * @returns {Promise<PNGImage>}
 */
function readPNGImage(src) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(src).pipe(new PNG({
      filterType: 6
    })).on('parsed', function () {
      resolve(this);
    }).on('error', function (err) {
      reject(err);
    })
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
 * @returns {Promise<void>}
 */
function main(callback = null
    , {
      icons = allIcons,
      getDest,
      checkLatest = lib && lib.compareFileTime,
      print = console.log
    } = {}) {
  let consumed = 0;
  const didFinish = () => {
      let local_cb = callback;
      callback = null;
      local_cb ? local_cb()
      // @ts-ignore
      : consumed <= 0 && typeof require === "function" && require && require.main === module
        && process.argv.indexOf("-q") > 0 ? void 0
      : print("All %d new icons in %d converted.", consumed, totalCount);
  };
  destRoot = destRoot.replace(/\\/g, "/");
  destRoot && destRoot.slice(-1) != "/" && (destRoot += "/");
  const totalCount = icons.length, allPromises = [];
  for (let i = 0; i < totalCount; i++) {
    const submap = icons[i],
    sublist = Object.keys(submap).sort().map(i => submap[i].replace(/^\//, ""));
    let dest = getDest ? getDest(sublist[0]) : destRoot + sublist[0].split("_", 1)[0] + ".bin"
      , islatest = 0;
    checkLatest && sublist.forEach(filePath => checkLatest(filePath, dest) && islatest++);
    if (islatest === sublist.length) { continue; }
    const destFolder = dest.split("/").slice(0, -1).join("/");
    if (destFolder && !fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, {recursive: true});
    }
    allPromises.push(Promise.all(sublist.map(readPNGImage)).then(([img1, img2]) => {
      const imagesData = [img1.data, img2.data];
      // @ts-ignore
      const allBuffer = Buffer.concat(imagesData);
      return new Promise((resolve, reject) => {
        fs.writeFile(dest, allBuffer, (err) => {
          if (err) { return reject(err); }
          consumed++;
          print("Write binary image data to %s", dest, ", byte[", img1.data.length, "+", img2.data.length, "]");
          resolve(dest);
        })
      })
    }));
  }
  if (allPromises.length <= 0) {
    return Promise.resolve(didFinish());
  } else {
    return Promise.all(allPromises).then(didFinish);
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    allIcons: allIcons,
    readPNGImage: readPNGImage,
    main: main,
    /**
     * setup dest root
     * @param {string} newRoot - new root of dest files
     */
    setDestRoot: function (newRoot) {
      destRoot = newRoot;
    }
  };
}
// @ts-ignore
if (typeof require === "function" && require && require.main === module) {
  main();
}
