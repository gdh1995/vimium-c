import {
  fgCache, isEnabled_, VTr, isAlive_, timeout_, clearTimeout_, interval_, clearInterval_, isLocked_, OnChrome,
  esc
} from "../lib/utils"
import {
  isHTML_, createElement_, setClassName_s, appendNode_s, setVisibility_s, docHasFocus_, toggleClass_s
} from "../lib/dom_utils"
import { ui_box, ensureBorder, addUIElement, adjustUI, getBoxTagName_old_cr } from "./dom_ui"
import { allHints, isHintsActive, hintManager, setMode as setHintMode, hintMode_ } from "./link_hints"
import { insert_global_, passAsNormal } from "./insert"
import { visual_mode_name } from "./visual"
import { find_box } from "./mode_find"
import { wdZoom_ } from "../lib/rect"

let tweenId: ValidIntervalID = TimerID.None
let box: HTMLDivElement | HTMLBodyElement | null = null
let $text: Text = null as never
let text = ""
let opacity_: 0 | 0.25 | 0.5 | 0.75 | 1 = 0
let timer: ValidTimeoutID = TimerID.None

export { box as hud_box, text as hud_text, opacity_ as hud_opacity, timer as hud_tipTimer }

export const hudTip = (tid: kTip | HintMode, duration?: 0 | 1 | 2, args?: Array<string | number> | string
    , embed?: 1): void => {
  hudShow(tid, args, embed)
  text && (timer = timeout_(hudHide, (duration || 1.5) * 1000))
}
export const hudShow = (tid: kTip | HintMode, args?: Array<string | number> | string
    , embed?: boolean | BOOL | TimerType.fake): void => {
  if (!isHTML_()) { return; }
  text = VTr(tid, args);
  opacity_ = 1;
  if (timer) { clearTimeout_(timer); timer = TimerID.None; }
  embed || tweenId || (tweenId = interval_(tween, 40), tweenStart = getTime())
  if (box) {
    $text.data = text;
    toggleClass_s(box, "HL", 0)
    embed && toggleOpacity(1)
    return
  }
  box = createElement_(OnChrome && Build.MinCVer < BrowserVer.MinForcedColorsMode ? getBoxTagName_old_cr() : "div")
  setClassName_s(box, "R HUD" + fgCache.d)
  appendNode_s(box, $text = new Text(text))
  if (!embed) {
    toggleOpacity(0)
    ui_box || ensureBorder(wdZoom_) // safe to skip `getZoom_`
  }
  addUIElement(box, allHints ? AdjustType.NotAdjust : AdjustType.DEFAULT)
}

const tween = (fake?: TimerType.fake): void => { // safe-interval
  let opacity = OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake ? 0 : +(box!.style.opacity || 1)
  if (opacity === opacity_) { /* empty */ }
  else if (opacity === 0) {
    $text.data = text;
    toggleOpacity(OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake && fake || fgCache.m ? 1 : 0.25)
    fake && (tweenId = 0)
    return adjustUI();
  } else if (!fgCache.m && docHasFocus_()) {
    opacity += opacity < opacity_ ? 0.25 : -0.25;
  } else {
    opacity = opacity_;
  }
  if (opacity) {
    toggleOpacity(opacity)
  } else {
    hudHide(TimerType.noTimer)
  }
  if (opacity !== opacity_) { return }
  clearInterval_(tweenId);
  tweenId = 0;
}

export const hudHide = (info?: TimerType.fake | TimerType.noTimer): void => {
  if (timer) {
    clearTimeout_(timer); timer = TimerID.None
  }
  opacity_ = 0; text = ""
  if (!box) { /* empty */ }
  else if (!find_box && isHintsActive && !hintManager) {
      setHintMode(hintMode_)
  } else if (!find_box && visual_mode_name) {
      hudShow(kTip.inVisualMode, visual_mode_name, info)
  } else if (!find_box && insert_global_ && insert_global_.h) {
      hudShow(kTip.raw, insert_global_.h)
  } else if (passAsNormal) {
      esc!(HandlerResult.RefreshPassAsNormal)
  }
  else if ((OnChrome && Build.MinCVer < BrowserVer.MinNo$TimerType$$Fake ? info === TimerType.noTimer : info)
      || !isEnabled_) {
    toggleOpacity(0)
    $text.data = "";
    toggleClass_s(box, "HL", 0)
    isEnabled_ && isLocked_ < 3 || adjustUI(2)
  }
  else if (!tweenId && isAlive_) {
    tweenId = interval_(tween, 40);
  }
}

export const toggleOpacity = (opacity: number): void => {
  box!.style.opacity = opacity < 1 ? opacity as number | string as string : ""
  setVisibility_s(box!, !!opacity)
}
