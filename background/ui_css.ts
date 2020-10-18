import { framesForTab } from "./ports"
import { findCSS_, innerCSS_, omniPayload, settings, set_findCSS_, set_innerCSS_ } from "./store"

declare const enum MergeAction {
  virtual = -1, readFromCache = 0, rebuildWhenInit = 1, rebuildAndBroadcast = 2,
  saveOption = "userDefinedCss",
}

interface ParsedSections {
  ui?: string; find?: string; "find:host"?: string; omni?: string
}

const StyleCacheId_ = settings.CONST_.VerCode_ + ","
    + ( !(Build.BTypes & ~BrowserType.Chrome) || Build.BTypes & BrowserType.Chrome && OnOther === BrowserType.Chrome
        ? CurCVer_ : Build.BTypes & BrowserType.Firefox ? CurFFVer_ : 0)
    + ( (!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox)
        ? ""
        : (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredUnprefixedShadowDOMV0
            ? window.ShadowRoot || document.body!.webkitCreateShadowRoot : window.ShadowRoot)
        ? "s" : "")
    + (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All ? ""
      : (Build.MinCVer >= BrowserVer.MinUsableCSS$All || CurCVer_ > BrowserVer.MinUsableCSS$All - 1)
        && (!(Build.BTypes & BrowserType.Edge) || Build.BTypes & ~BrowserType.Edge && OnOther !== BrowserType.Edge
          || "all" in (document.body as HTMLElement).style)
      ? "a" : "")
    + ";"

const loadCSS = (action: MergeAction, cssStr?: string): SettingsNS.MergedCustomCSS | void => {
  if (action === MergeAction.virtual) {
    mergeCSS(cssStr!, MergeAction.virtual)
    return
  }
  {
    let findCSSStr: string | null | false
    if (findCSSStr = action === MergeAction.readFromCache && settings.storage_.getItem("findCSS")) {
      // Note: The lines below are allowed as a special use case
      set_findCSS_(parseFindCSS_(findCSSStr))
      set_innerCSS_(cssStr!.slice(StyleCacheId_.length))
      omniPayload.c = settings.storage_.getItem("omniCSS") || ""
      return
    }
  }
  settings.fetchFile_("baseCSS", (css: string): void => {
    const browserInfo = StyleCacheId_.slice(StyleCacheId_.indexOf(",") + 1),
    hasAll = !(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All
        || browserInfo.includes("a")
    if (!(Build.NDEBUG || css.startsWith(":host{"))) {
      console.log('Assert error: `css.startsWith(":host{")` in settings.updateHooks_.baseCSS')
    }
    if (Build.BTypes & BrowserType.Firefox && Build.MinFFVer < FirefoxBrowserVer.MinUnprefixedUserSelect
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        ? CurFFVer_ < FirefoxBrowserVer.MinUnprefixedUserSelect
        : Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinUnprefixedUserSelect
          && (!(Build.BTypes & ~BrowserType.Chrome) || OnOther === BrowserType.Chrome)
        ? CurCVer_ < BrowserVer.MinUnprefixedUserSelect
        : false) {
      // on Firefox, the `-webkit` prefix is in the control of `layout.css.prefixes.webkit`
      css = css.replace(<RegExpG> /user-select\b/g, Build.BTypes & BrowserType.Firefox
          && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox) ? "-moz-$&" : "-webkit-$&")
    }
    if (!Build.NDEBUG) {
      css = css.replace(<RegExpG> /\r\n?/g, "\n")
    }
    const cssFile = parseSections_(css)
    const isHighContrast_ff = !!(Build.BTypes & BrowserType.Firefox)
        && (!(Build.BTypes & ~BrowserType.Firefox) || OnOther === BrowserType.Firefox)
        && settings.storage_.getItem(GlobalConsts.kIsHighContrast) == "1"
    css = cssFile.ui!
    if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All || hasAll) {
      // Note: must not move "all:" into ":host" even when "s" and >= MinSelector$deep$InDynamicCssMeansNothing
      // in case that ":host" is set [style="all:unset"]
      const ind2 = css.indexOf("all:"), ind1 = css.lastIndexOf("{", ind2),
      ind3 = Build.MinCVer >= BrowserVer.MinEnsuredSafeInnerCSS || !(Build.BTypes & BrowserType.Chrome)
            || CurCVer_ >= BrowserVer.MinEnsuredSafeInnerCSS
        ? css.indexOf(";", ind2) : css.length
      css = css.slice(0, ind1 + 1) + css.slice(ind2, ind3 + 1)
          + css.slice(css.indexOf("\n", ind3) + 1 || css.length)
    } else {
      css = css.replace(<RegExpOne> /all:\s?\w+;?/, "")
    }
    if ((Build.MinCVer >= BrowserVer.MinEnsuredDisplayContents || !(Build.BTypes & BrowserType.Chrome)
          || CurCVer_ >= BrowserVer.MinEnsuredDisplayContents)
        && !(Build.BTypes & BrowserType.Edge
              && (!(Build.BTypes & ~BrowserType.Edge) || OnOther === BrowserType.Edge))) {
      const ind2 = css.indexOf("display:"), ind1 = css.lastIndexOf("{", ind2)
      css = css.slice(0, ind1 + 1) + css.slice(ind2)
    } else {
      css = css.replace("contents", "block")
    }
    if (Build.MinCVer < BrowserVer.MinSpecCompliantShadowBlurRadius
        && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinSpecCompliantShadowBlurRadius) {
      css = css.replace("3px 5px", "3px 7px")
    }
    if ((Build.BTypes & (BrowserType.Chrome | BrowserType.Edge) && Build.MinCVer < BrowserVer.MinCSS$Color$$RRGGBBAA
        && ((!(Build.BTypes & ~BrowserType.Edge) || Build.BTypes & BrowserType.Edge && OnOther === BrowserType.Edge)
          || CurCVer_ < BrowserVer.MinCSS$Color$$RRGGBBAA
        ))) {
      css = css.replace(<RegExpG & RegExpSearchable<0>> /#[\da-f]{4}([\da-f]{4})?\b/gi, (s: string): string => {
        s = s.length === 5 ? "#" + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4] : s
        const color = parseInt(s.slice(1), 16),
        r = color >>> 24, g = (color >> 16) & 0xff, b = (color >> 8) & 0xff, alpha = (color & 0xff) / 255 + ""
        return `rgba(${r},${g},${b},${alpha.slice(0, 4)})`
      })
    }
    if (!(Build.BTypes & BrowserType.Chrome) || Build.BTypes & ~BrowserType.Chrome && OnOther !== BrowserType.Chrome
        || (Build.MinCVer < BrowserVer.MinAbsolutePositionNotCauseScrollbar
            && CurCVer_ < BrowserVer.MinAbsolutePositionNotCauseScrollbar)) {
      css = css.replace(".LH{", ".LH{box-sizing:border-box;")
    }
    if (!(Build.BTypes & ~BrowserType.Firefox)
        || Build.BTypes & BrowserType.Firefox && OnOther === BrowserType.Firefox) {
      const ind1 = css.indexOf(".LH{") + 4, ind2 = css.indexOf("}", ind1)
      let items = css.slice(ind1, ind2).replace("2.5px 3px 2px", "3px").replace("0.5px", "1px")
      if (isHighContrast_ff) {
        items = items.replace(<RegExpOne> /\bbackground:[^;}]+/, "background:#000")
      }
      css = css.slice(0, ind1) + items + css.slice(ind2)
    }
    if (!((!(Build.BTypes & BrowserType.Chrome) || Build.MinCVer >= BrowserVer.MinShadowDOMV0)
          && (!(Build.BTypes & BrowserType.Firefox) || Build.MinFFVer >= FirefoxBrowserVer.MinEnsuredShadowDOMV1)
          && !(Build.BTypes & ~BrowserType.ChromeOrFirefox))
        && !browserInfo.includes("s")) {
      /** Note: {@link ../front/vimium-c.css}: this requires `:host{` is at the beginning */
      const hostEnd = css.indexOf("}") + 1, secondEnd = css.indexOf("}", hostEnd) + 1,
      prefix = "#VimiumUI"
      let body = css.slice(secondEnd)
      if (!(Build.BTypes & ~BrowserType.Chrome) && Build.MinCVer >= BrowserVer.MinUsableCSS$All || hasAll) {
        body = body.replace(<RegExpG> /\b[IL]H\s?\{/g, "$&all:inherit;")
      }
      body += `${prefix}:before,${prefix}:after,.R:before,.R:not(.HUD):after{display:none!important}`
      css = prefix + css.slice(5, hostEnd) +
          /** Note: {@link ../front/vimium-c.css}: this requires no ID/attr selectors in "ui" styles */
          body.replace(<RegExpG> /\.[A-Z][^,{]*/g, prefix + " $&")
    }
    if (Build.BTypes & BrowserType.Firefox && isHighContrast_ff) {
      css = css.split("\n.D", 1)[0]
    } else if (!(Build.BTypes & BrowserType.Chrome) || !IsEdg_) {
      css = css.split("\nbody", 1)[0]
    }
    css = css.replace(<RegExpG> /\n/g, "")
    if (Build.MinCVer < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinEnsuredBorderWidthWithoutDeviceInfo) {
      css = css.replace(<RegExpG> /0\.01px|\/\*!DPI\*\/ ?[\w.]+/g, "/*!DPI*/1px")
    } else if (Build.MinCVer < BrowserVer.MinBorderWidth$Ensure1$Or$Floor && Build.BTypes & BrowserType.Chrome
        && CurCVer_ < BrowserVer.MinBorderWidth$Ensure1$Or$Floor) {
      css = css.replace(<RegExpG> /0\.01px|\/\*!DPI\*\/ ?[\w.]+/g, "0.5px")
    }
    settings.storage_.setItem("innerCSS", StyleCacheId_ + css)
    let findCSS = cssFile.find!
    if (!(Build.BTypes & BrowserType.Chrome) || !IsEdg_) {
      findCSS = findCSS.replace("@media(-ms-high-contrast:active){", "").slice(0, -1)
    }
    if (Build.BTypes & BrowserType.ChromeOrFirefox) {
      findCSS = findCSS.replace((Build.BTypes & BrowserType.Firefox
            ? isHighContrast_ff || Build.BTypes & BrowserType.Chrome && IsEdg_ : IsEdg_)
          ? <RegExpG> /\.HC\b/g : <RegExpG> /\.HC\b[^]+?}\s?/g, "").trim()
    }
    settings.storage_.setItem("findCSS", findCSS.length + "\n" + findCSS)
    const O = "omniCSS"
    if (Build.BTypes & BrowserType.Firefox && isHighContrast_ff) {
      settings.storage_.setItem(O, cssFile.omni!.replace(<RegExpG> /\n/g, ""))
    } else {
      settings.storage_.removeItem(O)
    }
    mergeCSS(settings.get_("userDefinedCss"), action)
  })
}

const parseSections_ = (css: string): ParsedSections => {
  const arr = css ? css.split(<RegExpG & RegExpSearchable<1>> /^\/\*\s?#!?([A-Za-z:]+)\s?\*\//m) : [""]
  const sections: ParsedSections = { ui: arr[0].trim() }
  for (let i = 1; i < arr.length; i += 2) {
    let key = arr[i].toLowerCase() as "ui" | "find" | "find:host" | "omni"
    sections[key] = (sections[key] || "") + arr[i + 1].trim()
  }
  return sections
}

const parseFindCSS_ = (find2: string): FindCSS => {
  find2 = find2.slice(find2.indexOf("\n") + 1)
  let idx = find2.indexOf("\n") + 1, endFH = find2.indexOf("\n", idx)
  return { c: find2.slice(0, idx - 1), s: find2.slice(idx, endFH).replace("  ", "\n"),
    i: find2.slice(endFH + 1) }
}

const mergeCSS = (css2Str: string, action: MergeAction | "userDefinedCss"): SettingsNS.MergedCustomCSS | void => {
  let css = settings.storage_.getItem("innerCSS")!, idx = css.indexOf("\n")
  css = idx > 0 ? css.slice(0, idx) : css
  const css2 = parseSections_(css2Str)
  let newInnerCSS = css2.ui ? css + "\n" + css2.ui : css
  let findh = css2["find:host"], find2 = css2.find, omni2 = css2.omni, F = "findCSS", O = "omniCSS"
  css = settings.storage_.getItem(F)!
  idx = css.indexOf("\n")
  css = css.slice(0, idx + 1 + +css.slice(0, idx))
  let endFH = css.indexOf("\n", css.indexOf("\n", idx + 1) + 1), offsetFH = css.lastIndexOf("  ", endFH)
  findh = findh ? "  " + findh.replace(<RegExpG> /\n/g, " ") : ""
  if (offsetFH > 0 ? css.slice(offsetFH, endFH) !== findh : findh) {
    css = css.slice(idx + 1, offsetFH > 0 ? offsetFH : endFH) + findh + css.slice(endFH)
    css = css.length + "\n" + css
  }
  find2 = find2 ? css + "\n" + find2 : css
  css = (settings.storage_.getItem(O) || "").split("\n", 1)[0]
  omni2 = omni2 ? css + "\n" + omni2 : css
  if (action === MergeAction.virtual) {
    return { ui: newInnerCSS.slice(StyleCacheId_.length), find: parseFindCSS_(find2), omni: omni2 }
  }

  settings.storage_.setItem("innerCSS", newInnerCSS)
  settings.storage_.setItem(F, find2)
  omni2 ? settings.storage_.setItem(O, omni2) : settings.storage_.removeItem(O)
  loadCSS(MergeAction.readFromCache, newInnerCSS)
  if (action !== MergeAction.readFromCache && action !== MergeAction.rebuildWhenInit) {
    const request: Req.bg<kBgReq.showHUD> = { N: kBgReq.showHUD, H: innerCSS_, f: findCSS_ }
    for (const tabId in framesForTab) {
      const frames = framesForTab[+tabId]!
      for (let i = frames.length; 0 < --i; ) {
        const status = frames[i].s
        if (status.f & Frames.Flags.hasCSS) {
          frames[i].postMessage(request)
          status.f |= Frames.Flags.hasFindCSS
        }
      }
    }
    settings.broadcastOmni_({ N: kBgReq.omni_updateOptions, d: { c: omniPayload.c } })
  }
}

settings.updateHooks_.userDefinedCss = mergeCSS
settings.reloadCSS_ = loadCSS

set_innerCSS_(settings.storage_.getItem("innerCSS") || "")
if (innerCSS_ && innerCSS_.startsWith(StyleCacheId_)) {
  settings.storage_.removeItem("vomnibarPage_f")
  loadCSS(MergeAction.rebuildWhenInit, innerCSS_)
} else {
  loadCSS(MergeAction.readFromCache, innerCSS_)
}
