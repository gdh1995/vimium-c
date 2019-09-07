"use strict";
function doTest(step, encoder, repeat) {
  var step = step || 20;
  var repeat = repeat || 1;
  var encoder = encoder != null ? +encoder : 1;
  var key = 'keyMappings';
  var BG_ = window.BG_ || window;
  var bgSettings_ = BG_.Settings_ || Settings_;
  var d = bgSettings_.get_(key, true);
  repeat > 1 && (d = d.repeat(repeat));
  var err = [];
  err.push(BG_.deserializeSync(key, BG_.serializeSync(key, d, encoder)) !== d);
  for (let i = 0; i < d.length; i += step) {
    for (let j = i + step; j < d.length; j += step * 2) {
      err.push(BG_.deserializeSync(key, BG_.serializeSync(key, d.substring(i, j), encoder)) !== d.substring(i, j));
    }
  }
  key = 'exclusionRules';
  for (let i = 0; i < d.length; i += step) {
    for (let j = i + step; j < d.length; j += step * 2) {
      err.push(BG_.deserializeSync(key, BG_.serializeSync(key, d.substring(i, j), encoder)) !== d.substring(i, j));
      err.push(BG_.deserializeSync(key, BG_.serializeSync(key, {d: d.substring(i, j)}, encoder)).d !== d.substring(i, j));
    }
  }
  d = bgSettings_.get_("searchEngines", true);
  repeat > 1 && (d = d.repeat(repeat));
  for (let i = 0; i < d.length; i += step) {
    for (let j = i + step; j < d.length; j += step * 2) {
      err.push(BG_.deserializeSync(key, BG_.serializeSync(key, d.substring(i, j), encoder)) !== d.substring(i, j));
      err.push(BG_.deserializeSync(key, BG_.serializeSync(key, {d: d.substring(i, j)}, encoder)).d !== d.substring(i, j));
    }
  }
  console.log("err", err.map(i=>+i).reduce((i,j) => i + j, 0));
  return err.map((i, ind) => i ? ind : -1).filter(ind => ind >= 0);
}
