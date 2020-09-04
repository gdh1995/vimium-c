import {
  fgCache, doc, isEnabled_, VTr, isAlive_, timeout_, clearTimeout_, interval_, clearInterval_,
} from "../lib/utils"
import { ui_box, ensureBorder, addUIElement, adjustUI, getBoxTagName_cr_ } from "./dom_ui"
import { allHints, isHintsActive, hintManager, setMode as setHintMode, hintMode_ } from "./link_hints"
import { isHTML_, createElement_, HDN } from "../lib/dom_utils"
import { insert_global_ } from "./insert"
import { visual_mode, visual_mode_name } from "./visual"
import { find_box } from "./mode_find"

let tweenId = 0
let box: HTMLDivElement | null = null
let $text: Text = null as never
let text = ""
let opacity_: 0 | 0.25 | 0.5 | 0.75 | 1 = 0
let timer = TimerID.None
let style: CSSStyleDeclaration

export { box as hud_box, text as hud_text, opacity_ as hud_opacity, timer as hud_tipTimer }

export const hudTip = (tid: kTip | HintMode, duration?: number, args?: Array<string | number>): void => {
  hudShow(tid, args);
  text && (timer = timeout_(hudHide, duration || 1500));
}
export const hudShow = (tid: kTip | HintMode, args?: Array<string | number>
    , embed?: boolean | BOOL | TimerType.fake): void => {
  if (!isHTML_()) { return; }
  text = VTr(tid, args);
  opacity_ = 1;
  if (timer) { clearTimeout_(timer); timer = TimerID.None; }
  embed || tweenId || (tweenId = interval_(tween, 40));
  let el = box;
  if (el) {
    $text.data = text;
    embed && toggleOpacity("")
    return
  }
  el = createElement_(Build.BTypes & BrowserType.Chrome ? getBoxTagName_cr_() : "div")
  el.className = "R HUD" + fgCache.d;
  !(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinEnsured$ParentNode$$appendAndPrepend
    ? el.append!(text) : el.textContent = text
  $text = el.firstChild as Text;
  style = el.style;
  if (!embed) {
    toggleOpacity("0")
    if (Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor || Build.BTypes & ~BrowserType.Chrome) {
      ui_box || ensureBorder() // safe to skip `getZoom_`
    }
  }
  addUIElement(box = el, allHints ? AdjustType.NotAdjust : AdjustType.DEFAULT)
}

const tween = (fake?: TimerType.fake): void => { // safe-interval
  let opacity = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake
                && fake ? 0 : +(style.opacity || 1);
  if (opacity === opacity_) { /* empty */ }
  else if (opacity === 0) {
    $text.data = text;
    toggleOpacity(fgCache.m
        || Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake
        ? "" : "0.25")
    return adjustUI();
  } else if (!fgCache.m && doc.hasFocus()) {
    opacity += opacity < opacity_ ? 0.25 : -0.25;
  } else {
    opacity = opacity_;
  }
  if (opacity) {
    style.opacity = opacity < 1 ? "" + opacity : ""
  } else {
    toggleOpacity("0")
    $text.data = "";
  }
  if (opacity !== opacity_) { return }
  clearInterval_(tweenId);
  tweenId = 0;
}

export const hudHide = (info?: TimerType.fake | TimerType.noTimer): void => {
  if (timer) { clearTimeout_(timer); timer = TimerID.None; }
  if (!find_box) {
    if (isHintsActive && !hintManager) {
      setHintMode(hintMode_)
      return
    }
    if (visual_mode) {
      hudShow(kTip.inVisualMode, [visual_mode_name], info)
      return
    }
    if (insert_global_ && insert_global_.h) {
      hudShow(kTip.raw, insert_global_.h)
      return;
    }
  }
  opacity_ = 0; text = "";
  if (!box) { /* empty */ }
  else if (info === TimerType.noTimer || !isEnabled_) {
    toggleOpacity("0")
    $text.data = "";
  }
  else if (!tweenId && isAlive_) {
    tweenId = interval_(tween, 40);
  }
}

const toggleOpacity = (opacity: string) => {
  style.opacity = opacity
  style.visibility = opacity !== "0" ? "" : HDN
}
