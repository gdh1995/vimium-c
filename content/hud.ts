import {
  fgCache, doc, isEnabled_, VTr, isAlive_, timeout_, clearTimeout_, interval_, clearInterval_, isLocked_, OnChrome,
} from "../lib/utils"
import { isHTML_, createElement_, setClassName_s, appendNode_s, setVisibility_s } from "../lib/dom_utils"
import { ui_box, ensureBorder, addUIElement, adjustUI, getBoxTagName_cr_ } from "./dom_ui"
import { allHints, isHintsActive, hintManager, setMode as setHintMode, hintMode_ } from "./link_hints"
import { insert_global_ } from "./insert"
import { visual_mode, visual_mode_name } from "./visual"
import { find_box } from "./mode_find"

let tweenId: ValidIntervalID = TimerID.None
let box: HTMLDivElement | null = null
let $text: Text = null as never
let text = ""
let opacity_: 0 | 0.25 | 0.5 | 0.75 | 1 = 0
let timer: ValidTimeoutID = TimerID.None

export { box as hud_box, text as hud_text, opacity_ as hud_opacity, timer as hud_tipTimer }

export const hudTip = (tid: kTip | HintMode, duration?: number, args?: Array<string | number> | string): void => {
  hudShow(tid, args);
  text && (timer = timeout_(hudHide, duration || 1500));
}
export const hudShow = (tid: kTip | HintMode, args?: Array<string | number> | string
    , embed?: boolean | BOOL | TimerType.fake): void => {
  if (!isHTML_()) { return; }
  text = VTr(tid, args);
  opacity_ = 1;
  if (timer) { clearTimeout_(timer); timer = TimerID.None; }
  embed || tweenId || (tweenId = interval_(tween, 40));
  if (box) {
    $text.data = text;
    embed && toggleOpacity("")
    return
  }
  box = createElement_(OnChrome ? getBoxTagName_cr_() : "div")
  setClassName_s(box, "R HUD" + fgCache.d)
  appendNode_s(box, $text = new Text(text))
  if (!embed) {
    toggleOpacity("0")
    if (!OnChrome || Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor) {
      ui_box || ensureBorder() // safe to skip `getZoom_`
    }
  }
  addUIElement(box, allHints ? AdjustType.NotAdjust : AdjustType.DEFAULT)
}

const tween = (fake?: TimerType.fake): void => { // safe-interval
  let opacity = OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake ? 0 : +(box!.style.opacity || 1)
  if (opacity === opacity_) { /* empty */ }
  else if (opacity === 0) {
    $text.data = text;
    toggleOpacity(OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake || fgCache.m ? "" : "0.25")
    return adjustUI();
  } else if (!fgCache.m && doc.hasFocus()) {
    opacity += opacity < opacity_ ? 0.25 : -0.25;
  } else {
    opacity = opacity_;
  }
  if (opacity) {
    toggleOpacity(opacity < 1 ? <string> <number | string> opacity : "")
  } else {
    hudHide(TimerType.noTimer)
  }
  if (opacity !== opacity_) { return }
  clearInterval_(tweenId);
  tweenId = 0;
}

export const hudHide = (info?: TimerType.fake | TimerType.noTimer): void => {
  if (timer) { clearTimeout_(timer); timer = TimerID.None; }
  {
    if (!find_box && isHintsActive && !hintManager) {
      setHintMode(hintMode_)
      return
    }
    if (!find_box && visual_mode) {
      hudShow(kTip.inVisualMode, visual_mode_name, info)
      return
    }
    if (!find_box && insert_global_ && insert_global_.h) {
      hudShow(kTip.raw, insert_global_.h)
      return;
    }
  }
  opacity_ = 0; text = "";
  if (!box) { /* empty */ }
  else if (info === TimerType.noTimer || !isEnabled_) {
    toggleOpacity("0")
    $text.data = "";
    isEnabled_ && isLocked_ < 3 || adjustUI(2)
  }
  else if (!tweenId && isAlive_) {
    tweenId = interval_(tween, 40);
  }
}

export const toggleOpacity = (opacity: string, onlyOpacity?: 1) => {
  box!.style.opacity = opacity
  onlyOpacity || setVisibility_s(box!, opacity !== "0")
}
