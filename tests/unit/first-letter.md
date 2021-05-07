# The influence of `::first-letter`

If using `::first-letter`, then JS code will be faster, but the below is performance data:

| item       | sub-item |   `.MC`   | `::1st-L` | unit    |
| :--------- | :------- | --------: | --------: | :------ |
| matchHints | self     |    0.26   |  **0.19** | ms      |
|            | total    |    0.52   |  **0.32** | ms      |
| recalc     | affected | **27**    |   61      | element |
|            | time     |  **0.66** |    2.27   | ms      |
| layout     | affected |  **0**    |  122      | node    |
|            | time     |  **0**    |    1.62   | ms      |
|            | root     | (none)    | #document |         |
| tree       |          |  **0.68** |    0.92   | ms      |
| paint      | whole    |    1.26   |    1.47   | ms      |
| compose    |          |    0.31   |    0.33   | ms      |
| **total**  |          |  **8.8**  |   10.1    | ms      |

Then, `::first-letter` is bad in this case.

## Testing code

``` diff
diff --git a/content/hint_filters.ts b/content/hint_filters.ts
index a56d7f69..0942531e 100644
--- a/content/hint_filters.ts
+++ b/content/hint_filters.ts
@@ -1,10 +1,10 @@
-import { chromeVer_, createRegExp, Lower, math, max_, OnChrome, OnEdge, OnFirefox } from "../lib/utils"
+import { chromeVer_, createRegExp, Lower, math, max_, OnChrome, OnEdge, OnFirefox, min_ } from "../lib/utils"
 import {
   createElement_, querySelector_unsafe_, getInputType, htmlTag_, docEl_unsafe_, ElementProto, removeEl_s, ALA, attr_s,
   contains_s, setClassName_s, setVisibility_s, toggleClass_s, textContent_s, appendNode_s
 } from "../lib/dom_utils"
 import {
-  HintItem, FilteredHintItem, MarkerElement, HintText, isHC_,
+  HintItem, FilteredHintItem, MarkerElement, HintText, isHC_, hint_box,
   hintMode_, useFilter_, coreHints, hintKeyStatus, KeyStatus, hintChars, allHints, setMode, resetMode, hintOptions
 } from "./link_hints"
 import { bZoom_, padClientRect_, getBoundingClientRect_, dimSize_ } from "../lib/rect"
@@ -400,8 +400,16 @@ export const renderMarkers = (hintItemArray: readonly HintItem[]): void => {
       toggleClass_s(marker, "TH", 1)
       right = ": " + right;
     } else {
-      right = hint.a.slice(-1);
-      for (const markerChar of hint.a.slice(0, -1)) {
+      right = hint.a
+      if (right.length > 2) {
+        if (OnChrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend && noAppend) {
+          appendNode_s(marker, new Text(right[0]))
+        } else {
+          marker.append!(right[0])
+        }
+        right = right.slice(-1)
+      }
+      for (const markerChar of hint.a.slice(1, -1)) {
         const node = createElement_("span")
         node.textContent = markerChar
         if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsured$ParentNode$$appendAndPrepend) {
@@ -502,7 +510,7 @@ export const matchHintsByKey = (keyStatus: KeyStatus
   } else {
     zIndexes_ = zIndexes_ && null;
     keyStatus.k = sequence;
-    const notDoSubCheck = !keyStatus.b, limit = sequence.length - keyStatus.b,
+    const notDoSubCheck = !keyStatus.b, limit = sequence.length - keyStatus.b, elLimit = limit && limit - 1,
     fewer = doesDetectMatchSingle > 0,
     wantedPrefix = sequence.slice(0, limit), lastChar = notDoSubCheck ? "" : sequence[limit]
     hintArray = keyStatus.c = (fewer ? hintArray : allHints!).filter(hint => {
@@ -511,15 +519,15 @@ export const matchHintsByKey = (keyStatus: KeyStatus
       return pass;
     });
     type MarkerElementChild = Exclude<MarkerElement["firstChild"], Text | null>;
-    for (const hint of hintArray) {
-      const ref = hint.m.childNodes, hintN = hint.i
+    for (const hint of maxPrefixLen_ ? hintArray : []) {
+      const ref = hint.m.children, hintN = hint.i
 // https://cs.chromium.org/chromium/src/third_party/blink/renderer/core/dom/dom_token_list.cc?q=DOMTokenList::setValue&g=0&l=258
 // shows that `.classList.add()` costs more
-      for (let j = limit > hintN ? hintN : limit, end = limit > hintN ? limit : hintN; j < end; j++) {
-        ((ref[j] as MarkerElementChild).className = j < limit ? "MC" : "");
+      for (let j = min_(elLimit, hintN), end = max_(elLimit, hintN); j < end; j++) {
+        ((ref[j] as MarkerElementChild).className = j < elLimit ? "MC" : "");
       }
-      hint.i = limit
+      hint.i = elLimit
     }
-    return hintArray.length ? (isHC_ && setMode(hintMode_), 2) : 0
+    return hintArray.length ? (isHC_ && setMode(hintMode_), hint_box!.classList.toggle("ML", limit > 0), 2) : 0
   }
 }
diff --git a/front/vimium-c.css b/front/vimium-c.css
index db895c9b..f1b99aa7 100644
--- a/front/vimium-c.css
+++ b/front/vimium-c.css
@@ -18,7 +18,7 @@ padding:4px 4px 1px;right:152px;text-overflow:ellipsis;white-space:nowrap}
 .Flash{box-shadow:0 0 4px 2px #4183c4;padding:1px}.AbsF{padding:0;position:absolute}.Sel{box-shadow:0 0 4px 2px #fa0}
 .Frame{border:5px solid #ff0}.Frame,.HUD:after{box-sizing:border-box;height:100%;left:0;top:0;width:100%}
 .Omnibar{left:calc(10vw - 12px);top:64px;width:calc(80vw + 24px)}.O2{left:calc(10% - 12px);width:calc(80% + 24px)}
-.BH{color:#902809}.MC,.MH{color:#d4ac3a}.One{border-color:#fa7}.UI,.DHM{pointer-events:all}
+.BH{color:#902809}.MC,.MH,.ML>.LH::first-letter{color:#d4ac3a}.One{border-color:#fa7}.UI,.DHM{pointer-events:all}
 .D>.LH{background:linear-gradient(#cb0,#c80)}.HUD.D{color:#ccc}.HUD.D:after{background:#222}
 @media(forced-colors:active){.R{border-radius:0}
 .HM>.LH,.HUD:after{background:#000;border-radius:0}.Flash{outline:4px solid #fff}}
```
