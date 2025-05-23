/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved. 
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0  
 
THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE, 
MERCHANTABLITY OR NON-INFRINGEMENT. 
 
See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.

Modified by gdh1995 (github).
***************************************************************************** */



/// <reference no-default-lib="true"/>


interface Algorithm {
    name: string;
}

interface AnimationEventInit extends EventInit {
    animationName?: string;
    elapsedTime?: number;
}

interface CloseEventInit extends EventInit {
    wasClean?: boolean;
    code?: number;
    reason?: string;
}

interface CompositionEventInit extends UIEventInit {
    data?: string;
}

interface ConfirmSiteSpecificExceptionsInformation extends ExceptionInformation {
    arrayOfDomainStrings?: string[];
}

interface ConstrainBooleanParameters {
    exact?: boolean;
    ideal?: boolean;
}

interface ConstrainDOMStringParameters {
    exact?: string | string[];
    ideal?: string | string[];
}

interface ConstrainDoubleRange extends DoubleRange {
    exact?: number;
    ideal?: number;
}

interface ConstrainLongRange extends LongRange {
    exact?: number;
    ideal?: number;
}

interface ConstrainVideoFacingModeParameters {
    exact?: string | string[];
    ideal?: string | string[];
}

interface CustomEventInit extends EventInit {
    detail?: any;
}

interface DeviceAccelerationDict {
    x?: number;
    y?: number;
    z?: number;
}

interface DeviceLightEventInit extends EventInit {
    value?: number;
}

interface DeviceRotationRateDict {
    alpha?: number;
    beta?: number;
    gamma?: number;
}

interface DoubleRange {
    max?: number;
    min?: number;
}

interface EventInit {
    // scoped?: boolean;
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
}

interface EventModifierInit extends UIEventInit {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    // modifierAltGraph?: boolean;
    // modifierCapsLock?: boolean;
    // modifierFn?: boolean;
    // modifierFnLock?: boolean;
    // modifierHyper?: boolean;
    // modifierNumLock?: boolean;
    // modifierOS?: boolean;
    // modifierScrollLock?: boolean;
    // modifierSuper?: boolean;
    // modifierSymbol?: boolean;
    // modifierSymbolLock?: boolean;
}

interface ExceptionInformation {
    domain?: string;
}

interface FocusEventInit extends UIEventInit {
    relatedTarget?: EventTarget | null;
}

interface HashChangeEventInit extends EventInit {
    newURL?: string;
    oldURL?: string;
}

interface IDBIndexParameters {
    multiEntry?: boolean;
    unique?: boolean;
}

interface IDBObjectStoreParameters {
    autoIncrement?: boolean;
    keyPath?: IDBKeyPath;
}

interface KeyAlgorithm {
    name?: string;
}

interface KeyboardEventInit extends EventModifierInit {
    code?: string;
    key?: string;
    location?: number;
    repeat?: boolean;
}

interface LongRange {
    max?: number;
    min?: number;
}

interface MessageEventInit extends EventInit {
    lastEventId?: string;
    channel?: string;
    data?: any;
    origin?: string;
    source?: Window;
    ports?: MessagePort[];
}

interface MouseEventInit extends EventModifierInit {
    screenX?: number;
    screenY?: number;
    clientX?: number;
    clientY?: number;
    /** 0: main-pressed; 2: second pressed */ button?: 0 | 2 | 1;
    /** 0: not-mousedown; 1: primary; 2: second */ buttons?: 0 | 1 | 2 | 4;
    relatedTarget?: EventTarget | null;
}

interface MutationObserverInit {
    childList?: boolean;
    attributes?: boolean;
    characterData?: boolean;
    subtree?: boolean;
    attributeOldValue?: boolean;
    characterDataOldValue?: boolean;
    attributeFilter?: string[];
}

interface ObjectURLOptions {
    oneTimeOnly?: boolean;
}

interface PeriodicWaveConstraints {
    disableNormalization?: boolean;
}

interface PointerEventInit extends MouseEventInit {
    pointerId?: number;
    width?: number;
    height?: number;
    pressure?: number;
    tiltX?: number;
    tiltY?: number;
    pointerType?: string;
    isPrimary?: boolean;
}

interface PositionOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
}

interface StoreExceptionsInformation extends ExceptionInformation {
    siteName?: string;
    explanationString?: string;
    detailURI?: string;
}

interface StoreSiteSpecificExceptionsInformation extends StoreExceptionsInformation {
    arrayOfDomainStrings?: string[];
}

interface InputDeviceCapabilities {
    fireTouchEvents: boolean;
}

type InputDeviceCapabilitiesVar = {
    prototype: InputDeviceCapabilities;
    new (init?: Partial<InputDeviceCapabilities>): InputDeviceCapabilities;
};
declare var InputDeviceCapabilities: InputDeviceCapabilitiesVar | undefined;

interface UIEventInit extends EventInit {
    view?: Window;
    detail?: 0 | 1 | 2;
    sourceCapabilities?: InputDeviceCapabilities | null;
}

interface WheelEventInit extends MouseEventInit {
    deltaX?: number;
    deltaY?: number;
    deltaZ?: number;
    deltaMode?: number;
}

type ELRet = void;
interface EventListener {
    (evt: EventToPrevent): ELRet;
}

interface ANGLE_instanced_arrays {
    drawArraysInstancedANGLE(mode: number, first: number, count: number, primcount: number): void;
    drawElementsInstancedANGLE(mode: number, count: number, type: number, offset: number, primcount: number): void;
    vertexAttribDivisorANGLE(index: number, divisor: number): void;
    readonly VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: number;
}

declare var ANGLE_instanced_arrays: {
    prototype: ANGLE_instanced_arrays;
    new(): ANGLE_instanced_arrays;
    readonly VERTEX_ATTRIB_ARRAY_DIVISOR_ANGLE: number;
}

interface AnimationEvent extends Event {
    readonly animationName: string;
    readonly elapsedTime: number;
    initAnimationEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, animationNameArg: string, elapsedTimeArg: number): void;
}

declare var AnimationEvent: {
    prototype: AnimationEvent;
    new(typeArg: string, eventInitDict?: AnimationEventInit): AnimationEvent;
}

interface ApplicationCacheEventMap {
    "cached": Event;
    "checking": Event;
    "downloading": Event;
    "error": Event;
    "noupdate": Event;
    "obsolete": Event;
    "progress": ProgressEvent;
    "updateready": Event;
}

interface ApplicationCache extends EventTarget {
    oncached: (this: ApplicationCache, ev: Event) => any;
    onchecking: (this: ApplicationCache, ev: Event) => any;
    ondownloading: (this: ApplicationCache, ev: Event) => any;
    onerror: (this: ApplicationCache, ev: Event) => any;
    onnoupdate: (this: ApplicationCache, ev: Event) => any;
    onobsolete: (this: ApplicationCache, ev: Event) => any;
    onprogress: (this: ApplicationCache, ev: ProgressEvent) => any;
    onupdateready: (this: ApplicationCache, ev: Event) => any;
    readonly status: number;
    abort(): void;
    swapCache(): void;
    update(): void;
    readonly CHECKING: number;
    readonly DOWNLOADING: number;
    readonly IDLE: number;
    readonly OBSOLETE: number;
    readonly UNCACHED: number;
    readonly UPDATEREADY: number;
    addEventListener<K extends keyof ApplicationCacheEventMap>(type: K, listener: (this: ApplicationCache, ev: ApplicationCacheEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var ApplicationCache: {
    prototype: ApplicationCache;
    new(): ApplicationCache;
    readonly CHECKING: number;
    readonly DOWNLOADING: number;
    readonly IDLE: number;
    readonly OBSOLETE: number;
    readonly UNCACHED: number;
    readonly UPDATEREADY: number;
}

interface Attr extends Node {
    readonly name: string;
    readonly ownerElement: Element;
    readonly prefix: string | null;
    readonly specified: boolean;
    value: string;
}

declare var Attr: {
    prototype: Attr;
    new(): Attr;
}

interface BarProp {
    readonly visible: boolean;
}

declare var BarProp: {
    prototype: BarProp;
    new(): BarProp;
}

interface BeforeUnloadEvent extends Event {
    returnValue: any;
}

declare var BeforeUnloadEvent: {
    prototype: BeforeUnloadEvent;
    new(): BeforeUnloadEvent;
}

interface Blob {
    readonly size: number;
    readonly type: string;
    slice(start?: number, end?: number, contentType?: string): Blob;
    arrayBuffer(): Promise<ArrayBuffer>;
}

declare var Blob: {
    prototype: Blob;
    new (blobParts?: any[], options?: BlobPropertyBag): Blob;
}

interface CDATASection extends Text {
}

declare var CDATASection: {
    prototype: CDATASection;
    new(): CDATASection;
}

interface CSS {
    supports(property: string, value?: string): boolean;
}
declare var CSS: CSS;

interface CSSConditionRule extends CSSGroupingRule {
    conditionText: string;
}

declare var CSSConditionRule: {
    prototype: CSSConditionRule;
    new(): CSSConditionRule;
}

interface CSSFontFaceRule extends CSSRule {
    readonly style: CSSStyleDeclaration;
}

declare var CSSFontFaceRule: {
    prototype: CSSFontFaceRule;
    new(): CSSFontFaceRule;
}

interface CSSGroupingRule extends CSSRule {
    readonly cssRules: CSSRuleList;
    deleteRule(index: number): void;
    insertRule(rule: string, index: number): number;
}

declare var CSSGroupingRule: {
    prototype: CSSGroupingRule;
    new(): CSSGroupingRule;
}

interface CSSImportRule extends CSSRule {
    readonly href: string;
    readonly media: MediaList;
    readonly styleSheet: CSSStyleSheet;
}

declare var CSSImportRule: {
    prototype: CSSImportRule;
    new(): CSSImportRule;
}

interface CSSKeyframeRule extends CSSRule {
    keyText: string;
    readonly style: CSSStyleDeclaration;
}

declare var CSSKeyframeRule: {
    prototype: CSSKeyframeRule;
    new(): CSSKeyframeRule;
}

interface CSSKeyframesRule extends CSSRule {
    readonly cssRules: CSSRuleList;
    name: string;
    appendRule(rule: string): void;
    deleteRule(rule: string): void;
    findRule(rule: string): CSSKeyframeRule;
}

declare var CSSKeyframesRule: {
    prototype: CSSKeyframesRule;
    new(): CSSKeyframesRule;
}

interface CSSMediaRule extends CSSConditionRule {
    readonly media: MediaList;
}

declare var CSSMediaRule: {
    prototype: CSSMediaRule;
    new(): CSSMediaRule;
}

interface CSSNamespaceRule extends CSSRule {
    readonly namespaceURI: string;
    readonly prefix: string;
}

declare var CSSNamespaceRule: {
    prototype: CSSNamespaceRule;
    new(): CSSNamespaceRule;
}

interface CSSPageRule extends CSSRule {
    readonly pseudoClass: string;
    readonly selector: string;
    selectorText: string;
    readonly style: CSSStyleDeclaration;
}

declare var CSSPageRule: {
    prototype: CSSPageRule;
    new(): CSSPageRule;
}

interface CSSRule {
    cssText: string;
    readonly parentRule: CSSRule;
    readonly parentStyleSheet: CSSStyleSheet;
    readonly type: number;
    readonly CHARSET_RULE: number;
    readonly FONT_FACE_RULE: number;
    readonly IMPORT_RULE: number;
    readonly KEYFRAMES_RULE: number;
    readonly KEYFRAME_RULE: number;
    readonly MEDIA_RULE: number;
    readonly NAMESPACE_RULE: number;
    readonly PAGE_RULE: number;
    readonly STYLE_RULE: number;
    readonly SUPPORTS_RULE: number;
    readonly UNKNOWN_RULE: number;
    readonly VIEWPORT_RULE: number;
}

declare var CSSRule: {
    prototype: CSSRule;
    new(): CSSRule;
    readonly CHARSET_RULE: number;
    readonly FONT_FACE_RULE: number;
    readonly IMPORT_RULE: number;
    readonly KEYFRAMES_RULE: number;
    readonly KEYFRAME_RULE: number;
    readonly MEDIA_RULE: number;
    readonly NAMESPACE_RULE: number;
    readonly PAGE_RULE: number;
    readonly STYLE_RULE: number;
    readonly SUPPORTS_RULE: number;
    readonly UNKNOWN_RULE: number;
    readonly VIEWPORT_RULE: number;
}

interface CSSRuleList {
    readonly length: number;
    item(index: number): CSSRule;
    [index: number]: CSSRule;
}

declare var CSSRuleList: {
    prototype: CSSRuleList;
    new(): CSSRuleList;
}

interface CSSStyleDeclaration {
    alignContent: string | null;
    alignItems: string | null;
    alignSelf: string | null;
    alignmentBaseline: string | null;
    animation: string | null;
    animationDelay: string | null;
    animationDirection: string | null;
    animationDuration: string | null;
    animationFillMode: string | null;
    animationIterationCount: string | null;
    animationName: string | null;
    animationPlayState: string | null;
    animationTimingFunction: string | null;
    backfaceVisibility: string | null;
    background: string | null;
    backgroundAttachment: string | null;
    backgroundClip: string | null;
    backgroundColor: string | null;
    backgroundImage: string | null;
    backgroundOrigin: string | null;
    backgroundPosition: string | null;
    backgroundPositionX: string | null;
    backgroundPositionY: string | null;
    backgroundRepeat: string | null;
    backgroundSize: string | null;
    baselineShift: string | null;
    border: string | null;
    borderBottom: string | null;
    borderBottomColor: string | null;
    borderBottomLeftRadius: string | null;
    borderBottomRightRadius: string | null;
    borderBottomStyle: string | null;
    borderBottomWidth: string;
    borderCollapse: string | null;
    borderColor: string | null;
    borderImage: string | null;
    borderImageOutset: string | null;
    borderImageRepeat: string | null;
    borderImageSlice: string | null;
    borderImageSource: string | null;
    borderImageWidth: string | null;
    borderLeft: string | null;
    borderLeftColor: string | null;
    borderLeftStyle: string | null;
    borderLeftWidth: string;
    borderRadius: string | null;
    borderRight: string | null;
    borderRightColor: string | null;
    borderRightStyle: string | null;
    borderRightWidth: string;
    borderSpacing: string | null;
    borderStyle: string | null;
    borderTop: string | null;
    borderTopColor: string | null;
    borderTopLeftRadius: string | null;
    borderTopRightRadius: string | null;
    borderTopStyle: string | null;
    borderTopWidth: string;
    borderWidth: string | null;
    bottom: string | null;
    boxShadow: string | null;
    boxSizing: string | null;
    breakAfter: string | null;
    breakBefore: string | null;
    breakInside: string | null;
    captionSide: string | null;
    clear: string | null;
    clip: string | null;
    clipPath: string | null;
    clipRule: string | null;
    color: string | null;
    colorInterpolationFilters: string | null;
    columnCount: any;
    columnFill: string | null;
    columnGap: any;
    columnRule: string | null;
    columnRuleColor: any;
    columnRuleStyle: string | null;
    columnRuleWidth: any;
    columnSpan: string | null;
    columnWidth: any;
    columns: string | null;
    contain?: "layout" | "paint" | "size" | "style" | "layout size style" | "layout style" | "content" | "strict" | "";
    content: string | null;
    counterIncrement: string | null;
    counterReset: string | null;
    cssFloat: string | null;
    cssText: string;
    cursor: string | null;
    d?: string;
    direction: string | null;
    display: string;
    dominantBaseline: string | null;
    emptyCells: string | null;
    enableBackground: string | null;
    fill: string | null;
    fillOpacity: string | null;
    fillRule: string | null;
    filter: string | null;
    flex: string | null;
    flexBasis: string | null;
    flexDirection: string | null;
    flexFlow: string | null;
    flexGrow: string | null;
    flexShrink: string | null;
    flexWrap: string | null;
    float: string;
    floodColor: string | null;
    floodOpacity: string | null;
    font: string | null;
    fontFamily: string | null;
    fontFeatureSettings: string | null;
    fontSize: string | null;
    fontSizeAdjust: string | null;
    fontStretch: string | null;
    fontStyle: string | null;
    fontVariant: string | null;
    fontWeight: string | null;
    glyphOrientationHorizontal: string | null;
    glyphOrientationVertical: string | null;
    height: string;
    imeMode: string | null;
    justifyContent: string | null;
    kerning: string | null;
    layoutGrid: string | null;
    layoutGridChar: string | null;
    layoutGridLine: string | null;
    layoutGridMode: string | null;
    layoutGridType: string | null;
    left: string | null;
    readonly length: number;
    letterSpacing: string | null;
    lightingColor: string | null;
    lineBreak: string | null;
    lineHeight: string | null;
    listStyle: string | null;
    listStyleImage: string | null;
    listStylePosition: string | null;
    listStyleType: string | null;
    margin: string | null;
    marginBottom: string | null;
    marginLeft: string;
    marginRight: string | null;
    marginTop: string;
    marker: string | null;
    markerEnd: string | null;
    markerMid: string | null;
    markerStart: string | null;
    mask: string | null;
    maxHeight: string | null;
    maxWidth: string | null;
    minHeight: string | null;
    minWidth: string | null;
    opacity: string | null;
    order: string | null;
    orphans: string | null;
    outline: string | null;
    outlineColor: string | null;
    outlineOffset: string | null;
    outlineStyle: string | null;
    outlineWidth: string | null;
    overflow: string | null;
    overflowX: string | null;
    overflowY: string | null;
    padding: string | null;
    paddingBottom: string | null;
    paddingLeft: string | null;
    paddingRight: string | null;
    paddingTop: string | null;
    pageBreakAfter: string | null;
    pageBreakBefore: string | null;
    pageBreakInside: string | null;
    readonly parentRule: CSSRule;
    perspective: string | null;
    perspectiveOrigin: string | null;
    pointerEvents: string | null;
    position: string;
    quotes: string | null;
    right: string | null;
    rotate: string | null;
    rubyAlign: string | null;
    rubyOverhang: string | null;
    rubyPosition: string | null;
    scale: string | null;
    scrollBehavior?: "smooth" | "auto" | "inherit" | "initial" | "unset" | "";
    // https://developer.mozilla.org/en-US/docs/Web/CSS/scroll-snap-type
    scrollSnapType?: "none" | "mandatory" | "proximity" | "y mandatory" | "inherit" | "initial" | "unset";
    stopColor: string | null;
    stopOpacity: string | null;
    stroke: string | null;
    strokeDasharray: string | null;
    strokeDashoffset: string | null;
    strokeLinecap: string | null;
    strokeLinejoin: string | null;
    strokeMiterlimit: string | null;
    strokeOpacity: string | null;
    strokeWidth: string | null;
    tableLayout: string | null;
    textAlign: string | null;
    textAlignLast: string | null;
    textAnchor: string | null;
    textDecoration: string | null;
    textIndent: string | null;
    textJustify: string | null;
    textKashida: string | null;
    textKashidaSpace: string | null;
    textOverflow: string | null;
    textShadow: string | null;
    textTransform: string | null;
    textUnderlinePosition: string | null;
    top: string | null;
    touchAction: string | null;
    transform: string | null;
    transformOrigin: string | null;
    transformStyle: string | null;
    transition: string | null;
    transitionDelay: string | null;
    transitionDuration: string | null;
    transitionProperty: string | null;
    transitionTimingFunction: string | null;
    translate: string | null;
    unicodeBidi: string | null;
    verticalAlign: string | null;
    visibility: "hidden" | "visible" | "collapse" | "" | "inherit" | "initial" | "unset";
    webkitAlignContent: string | null;
    webkitAlignItems: string | null;
    webkitAlignSelf: string | null;
    webkitAnimation: string | null;
    webkitAnimationDelay: string | null;
    webkitAnimationDirection: string | null;
    webkitAnimationDuration: string | null;
    webkitAnimationFillMode: string | null;
    webkitAnimationIterationCount: string | null;
    webkitAnimationName: string | null;
    webkitAnimationPlayState: string | null;
    webkitAnimationTimingFunction: string | null;
    webkitAppearance: string | null;
    webkitBackfaceVisibility: string | null;
    webkitBackgroundClip: string | null;
    webkitBackgroundOrigin: string | null;
    webkitBackgroundSize: string | null;
    webkitBorderBottomLeftRadius: string | null;
    webkitBorderBottomRightRadius: string | null;
    webkitBorderImage: string | null;
    webkitBorderRadius: string | null;
    webkitBorderTopLeftRadius: string | null;
    webkitBorderTopRightRadius: string | null;
    webkitBoxAlign: string | null;
    webkitBoxDirection: string | null;
    webkitBoxFlex: string | null;
    webkitBoxOrdinalGroup: string | null;
    webkitBoxOrient: string | null;
    webkitBoxPack: string | null;
    webkitBoxSizing: string | null;
    webkitColumnBreakAfter: string | null;
    webkitColumnBreakBefore: string | null;
    webkitColumnBreakInside: string | null;
    webkitColumnCount: any;
    webkitColumnGap: any;
    webkitColumnRule: string | null;
    webkitColumnRuleColor: any;
    webkitColumnRuleStyle: string | null;
    webkitColumnRuleWidth: any;
    webkitColumnSpan: string | null;
    webkitColumnWidth: any;
    webkitColumns: string | null;
    webkitFilter: string | null;
    webkitFlex: string | null;
    webkitFlexBasis: string | null;
    webkitFlexDirection: string | null;
    webkitFlexFlow: string | null;
    webkitFlexGrow: string | null;
    webkitFlexShrink: string | null;
    webkitFlexWrap: string | null;
    webkitJustifyContent: string | null;
    webkitOrder: string | null;
    webkitPerspective: string | null;
    webkitPerspectiveOrigin: string | null;
    webkitTapHighlightColor: string | null;
    webkitTextFillColor: string | null;
    webkitTextSizeAdjust: any;
    webkitTextStroke: string | null;
    webkitTextStrokeColor: string | null;
    webkitTextStrokeWidth: string | null;
    webkitTransform: string | null;
    webkitTransformOrigin: string | null;
    webkitTransformStyle: string | null;
    webkitTransition: string | null;
    webkitTransitionDelay: string | null;
    webkitTransitionDuration: string | null;
    webkitTransitionProperty: string | null;
    webkitTransitionTimingFunction: string | null;
    webkitUserModify: string | null;
    webkitUserSelect: string | null;
    webkitWritingMode: string | null;
    whiteSpace: string | null;
    widows: string | null;
    width: string;
    // willChange: string | null;
    wordBreak: string | null;
    wordSpacing: string | null;
    wordWrap: string | null;
    writingMode: string | null;
    zIndex: string | null;
    zoom: string;
    resize: string | null;
    userSelect: string | null;
    getPropertyPriority(propertyName: string): string;
    getPropertyValue(propertyName: string): string;
    item(index: number): string;
    removeProperty(propertyName: string): string;
    setProperty(propertyName: string, value: string | null, priority?: string): void;
    [index: number]: string;
}

// useless on Firefox - it has CSS2Properties
// declare var CSSStyleDeclaration: {
//     prototype: CSSStyleDeclaration;
//     new(): CSSStyleDeclaration;
// }

interface CSSStyleRule extends CSSRule {
    readonly readOnly: boolean;
    selectorText: string;
    readonly style: CSSStyleDeclaration;
}

declare var CSSStyleRule: {
    prototype: CSSStyleRule;
    new(): CSSStyleRule;
}

interface CSSStyleSheet extends StyleSheet {
    readonly cssRules: CSSRuleList;
    cssText: string;
    readonly href: string;
    readonly id: string;
    readonly imports: StyleSheetList;
    readonly isAlternate: boolean;
    readonly isPrefAlternate: boolean;
    readonly ownerRule: CSSRule;
    readonly owningElement: Element;
    readonly pages: StyleSheetPageList;
    readonly readOnly: boolean;
    readonly rules: CSSRuleList;
    addImport(bstrURL: string, lIndex?: number): number;
    addPageRule(bstrSelector: string, bstrStyle: string, lIndex?: number): number;
    addRule(bstrSelector: string, bstrStyle?: string, lIndex?: number): number;
    deleteRule(index?: number): void;
    insertRule(rule: string, index?: number): number;
    removeImport(lIndex: number): void;
    removeRule(lIndex: number): void;
}

declare var CSSStyleSheet: {
    prototype: CSSStyleSheet;
    new(): CSSStyleSheet;
}

interface CSSSupportsRule extends CSSConditionRule {
}

declare var CSSSupportsRule: {
    prototype: CSSSupportsRule;
    new(): CSSSupportsRule;
}

interface CanvasGradient {
    addColorStop(offset: number, color: string): void;
}

declare var CanvasGradient: {
    prototype: CanvasGradient;
    new(): CanvasGradient;
}

interface CanvasPattern {
    setTransform(matrix: SVGMatrix): void;
}

declare var CanvasPattern: {
    prototype: CanvasPattern;
    new(): CanvasPattern;
}

interface CanvasRenderingContext2D extends Object, CanvasPathMethods {
    readonly canvas: HTMLCanvasElement;
    fillStyle: string | CanvasGradient | CanvasPattern;
    font: string;
    globalAlpha: number;
    globalCompositeOperation: string;
    imageSmoothingEnabled: boolean;
    lineCap: string;
    lineDashOffset: number;
    lineJoin: string;
    lineWidth: number;
    miterLimit: number;
    shadowBlur: number;
    shadowColor: string;
    shadowOffsetX: number;
    shadowOffsetY: number;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    textAlign: string;
    textBaseline: string;
    mozImageSmoothingEnabled: boolean;
    webkitImageSmoothingEnabled: boolean;
    oImageSmoothingEnabled: boolean;
    beginPath(): void;
    clearRect(x: number, y: number, w: number, h: number): void;
    clip(fillRule?: string): void;
    createImageData(imageDataOrSw: number | ImageData, sh?: number): ImageData;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
    createPattern(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement, repetition: string): CanvasPattern;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
    drawFocusIfNeeded(element: Element): void;
    drawImage(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap, dstX: number, dstY: number): void;
    drawImage(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap, dstX: number, dstY: number, dstW: number, dstH: number): void;
    drawImage(image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | ImageBitmap, srcX: number, srcY: number, srcW: number, srcH: number
        , dstX: number, dstY: number, dstW: number, dstH: number): void;
    fill(fillRule?: string): void;
    fillRect(x: number, y: number, w: number, h: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    getImageData(sx: number, sy: number, sw: number, sh: number): ImageData;
    getLineDash(): number[];
    isPointInPath(x: number, y: number, fillRule?: string): boolean;
    measureText(text: string): TextMetrics;
    putImageData(imagedata: ImageData, dx: number, dy: number, dirtyX?: number, dirtyY?: number, dirtyWidth?: number, dirtyHeight?: number): void;
    restore(): void;
    rotate(angle: number): void;
    save(): void;
    scale(x: number, y: number): void;
    setLineDash(segments: number[]): void;
    setTransform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
    stroke(path?: Path2D): void;
    strokeRect(x: number, y: number, w: number, h: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    transform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
    translate(x: number, y: number): void;
}

declare var CanvasRenderingContext2D: {
    prototype: CanvasRenderingContext2D;
    new(): CanvasRenderingContext2D;
}

interface CharacterData extends Node, ChildNode {
    data: string;
    readonly length: number;
    appendData(arg: string): void;
    deleteData(offset: number, count: number): void;
    insertData(offset: number, arg: string): void;
    replaceData(offset: number, count: number, arg: string): void;
    substringData(offset: number, count: number): string;
}

declare var CharacterData: {
    prototype: CharacterData;
    new(): CharacterData;
}

interface ClientRect {
    bottom: number;
    readonly height: number;
    left: number;
    right: number;
    top: number;
    readonly width: number;
}

declare var ClientRect: {
    prototype: ClientRect;
    new(): ClientRect;
}

interface ClientRectList {
    readonly length: number;
    item(index: number): ClientRect;
    [index: number]: ClientRect;
}

declare var ClientRectList: {
    prototype: ClientRectList;
    new(): ClientRectList;
}

interface ClipboardEvent extends Event {
    readonly clipboardData: DataTransfer;
}

declare var ClipboardEvent: {
    prototype: ClipboardEvent;
    new(type: string, eventInitDict?: ClipboardEventInit): ClipboardEvent;
}

interface CloseEvent extends Event {
    readonly code: number;
    readonly reason: string;
    readonly wasClean: boolean;
    initCloseEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, wasCleanArg: boolean, codeArg: number, reasonArg: string): void;
}

declare var CloseEvent: {
    prototype: CloseEvent;
    new(typeArg: string, eventInitDict?: CloseEventInit): CloseEvent;
}

interface Comment extends CharacterData {
    text: string;
}

declare var Comment: {
    prototype: Comment;
    new(): Comment;
}

interface CompositionEvent extends UIEvent {
    readonly type: "compositionstart" | "compositionend";
    readonly data: string;
    readonly locale: string;
    initCompositionEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, dataArg: string, locale: string): void;
}

declare var CompositionEvent: {
    prototype: CompositionEvent;
    new(typeArg: string, eventInitDict?: CompositionEventInit): CompositionEvent;
}

interface Console {
    assert(test?: boolean, message?: string, ...optionalParams: any[]): void;
    clear(): void;
    count(countTitle?: string): void;
    debug(message?: any, ...optionalParams: any[]): void;
    dir(value?: any, ...optionalParams: any[]): void;
    dirxml(value: any): void;
    error(message?: any, ...optionalParams: any[]): void;
    exception(message?: string, ...optionalParams: any[]): void;
    group(groupTitle?: string): void;
    groupCollapsed(groupTitle?: string): void;
    groupEnd(): void;
    info(message?: any, ...optionalParams: any[]): void;
    log(message?: any, ...optionalParams: any[]): void;
    profile(reportName?: string): void;
    profileEnd(): void;
    select(element: Element): void;
    table(...data: any[]): void;
    time(timerName?: string): void;
    timeEnd(timerName?: string): void;
    trace(message?: any, ...optionalParams: any[]): void;
    warn(message?: any, ...optionalParams: any[]): void;
}

declare var Console: {
    prototype: Console;
    new(): Console;
}

interface Coordinates {
    readonly accuracy: number;
    readonly altitude: number | null;
    readonly altitudeAccuracy: number | null;
    readonly heading: number | null;
    readonly latitude: number;
    readonly longitude: number;
    readonly speed: number | null;
}

declare var Coordinates: {
    prototype: Coordinates;
    new(): Coordinates;
}

interface CustomEvent extends Event {
    readonly detail: any;
    initCustomEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, detailArg: any): void;
}

declare var CustomEvent: {
    prototype: CustomEvent;
    new(typeArg: string, eventInitDict?: CustomEventInit): CustomEvent;
}

interface DOMError {
    readonly name: string;
    toString(): string;
}

declare var DOMError: {
    prototype: DOMError;
    new(): DOMError;
}

interface DOMException {
    readonly code: number;
    readonly message: string;
    readonly name: string;
    toString(): string;
    readonly ABORT_ERR: number;
    readonly DATA_CLONE_ERR: number;
    readonly DOMSTRING_SIZE_ERR: number;
    readonly HIERARCHY_REQUEST_ERR: number;
    readonly INDEX_SIZE_ERR: number;
    readonly INUSE_ATTRIBUTE_ERR: number;
    readonly INVALID_ACCESS_ERR: number;
    readonly INVALID_CHARACTER_ERR: number;
    readonly INVALID_MODIFICATION_ERR: number;
    readonly INVALID_NODE_TYPE_ERR: number;
    readonly INVALID_STATE_ERR: number;
    readonly NAMESPACE_ERR: number;
    readonly NETWORK_ERR: number;
    readonly NOT_FOUND_ERR: number;
    readonly NOT_SUPPORTED_ERR: number;
    readonly NO_DATA_ALLOWED_ERR: number;
    readonly NO_MODIFICATION_ALLOWED_ERR: number;
    readonly PARSE_ERR: number;
    readonly QUOTA_EXCEEDED_ERR: number;
    readonly SECURITY_ERR: number;
    readonly SERIALIZE_ERR: number;
    readonly SYNTAX_ERR: number;
    readonly TIMEOUT_ERR: number;
    readonly TYPE_MISMATCH_ERR: number;
    readonly URL_MISMATCH_ERR: number;
    readonly VALIDATION_ERR: number;
    readonly WRONG_DOCUMENT_ERR: number;
}

declare var DOMException: {
    prototype: DOMException;
    new(): DOMException;
    readonly ABORT_ERR: number;
    readonly DATA_CLONE_ERR: number;
    readonly DOMSTRING_SIZE_ERR: number;
    readonly HIERARCHY_REQUEST_ERR: number;
    readonly INDEX_SIZE_ERR: number;
    readonly INUSE_ATTRIBUTE_ERR: number;
    readonly INVALID_ACCESS_ERR: number;
    readonly INVALID_CHARACTER_ERR: number;
    readonly INVALID_MODIFICATION_ERR: number;
    readonly INVALID_NODE_TYPE_ERR: number;
    readonly INVALID_STATE_ERR: number;
    readonly NAMESPACE_ERR: number;
    readonly NETWORK_ERR: number;
    readonly NOT_FOUND_ERR: number;
    readonly NOT_SUPPORTED_ERR: number;
    readonly NO_DATA_ALLOWED_ERR: number;
    readonly NO_MODIFICATION_ALLOWED_ERR: number;
    readonly PARSE_ERR: number;
    readonly QUOTA_EXCEEDED_ERR: number;
    readonly SECURITY_ERR: number;
    readonly SERIALIZE_ERR: number;
    readonly SYNTAX_ERR: number;
    readonly TIMEOUT_ERR: number;
    readonly TYPE_MISMATCH_ERR: number;
    readonly URL_MISMATCH_ERR: number;
    readonly VALIDATION_ERR: number;
    readonly WRONG_DOCUMENT_ERR: number;
}

interface DOMImplementation {
    createDocument(namespaceURI: string | null, qualifiedName: string | null, doctype: DocumentType | null): Document;
    createDocumentType(qualifiedName: string, publicId: string, systemId: string): DocumentType;
    createHTMLDocument(title: string): Document;
    hasFeature(feature: string | null, version: string | null): boolean;
}

declare var DOMImplementation: {
    prototype: DOMImplementation;
    new(): DOMImplementation;
}

interface DOMParser {
    parseFromString(source: string, mimeType: string): Document & { body: HTMLBodyElement; };
}

declare var DOMParser: {
    prototype: DOMParser;
    new(): DOMParser;
}

interface DOMSettableTokenList extends DOMTokenList {
    value: string;
}

declare var DOMSettableTokenList: {
    prototype: DOMSettableTokenList;
    new(): DOMSettableTokenList;
}

interface DOMStringList {
    readonly length: number;
    contains(str: string): boolean;
    item(index: number): string | null;
    // [index: number]: string;
}

declare var DOMStringList: {
    prototype: DOMStringList;
    new(): DOMStringList;
}

interface DOMStringMap {
    [name: string]: string | undefined;
}

declare var DOMStringMap: {
    prototype: DOMStringMap;
    new(): DOMStringMap;
}

interface DOMTokenList {
    readonly length: number;
    add(...token: string[]): void;
    contains(token: string): boolean;
    item(index: number): string;
    remove(...token: string[]): void;
    // toString(): string;
    toggle(token: string, force?: boolean): boolean;
    // [index: number]: string;
}

declare var DOMTokenList: {
    prototype: DOMTokenList;
    new(): DOMTokenList;
}

interface DataCue extends TextTrackCue {
    data: ArrayBuffer;
    addEventListener<K extends keyof TextTrackCueEventMap>(type: K, listener: (this: DataCue, ev: TextTrackCueEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var DataCue: {
    prototype: DataCue;
    new(): DataCue;
}

interface DataTransfer {
    dropEffect: string;
    effectAllowed: string;
    readonly files: FileList;
    readonly items: DataTransferItemList;
    readonly types: string[];
    clearData(format?: string): boolean;
    getData(format: string): string;
    setData(format: string, data: string): boolean;
}

declare var DataTransfer: {
    prototype: DataTransfer;
    new(): DataTransfer;
}

interface DataTransferItem {
    readonly kind: string;
    readonly type: string;
    getAsFile(): File | null;
    getAsString(_callback: FunctionStringCallback | null): void;
    webkitGetAsEntry(): any;
}

declare var DataTransferItem: {
    prototype: DataTransferItem;
    new(): DataTransferItem;
}

interface DataTransferItemList {
    readonly length: number;
    add(data: File): DataTransferItem | null;
    clear(): void;
    remove(index: number): void;
    [index: number]: DataTransferItem;
}

declare var DataTransferItemList: {
    prototype: DataTransferItemList;
    new(): DataTransferItemList;
}

interface DeferredPermissionRequest {
    readonly id: number;
    readonly type: string;
    readonly uri: string;
    allow(): void;
    deny(): void;
}

declare var DeferredPermissionRequest: {
    prototype: DeferredPermissionRequest;
    new(): DeferredPermissionRequest;
}

interface DocumentEventMap extends GlobalEventHandlersEventMap {
    "abort": UIEvent;
    "activate": UIEvent;
    "beforeactivate": UIEvent;
    "beforedeactivate": UIEvent;
    "blur": Event;
    "canplay": Event;
    "canplaythrough": Event;
    "change": Event;
    "click": MouseEvent;
    "contextmenu": PointerEvent;
    "dblclick": MouseEvent;
    "deactivate": UIEvent;
    "drag": DragEvent;
    "dragend": DragEvent;
    "dragenter": DragEvent;
    "dragleave": DragEvent;
    "dragover": DragEvent;
    "dragstart": DragEvent;
    "drop": DragEvent;
    "durationchange": Event;
    "emptied": Event;
    "error": ErrorEvent;
    "focus": Event;
    "fullscreenchange": Event;
    "fullscreenerror": Event;
    "input": Event;
    "invalid": Event;
    "keydown": KeyboardEventToPrevent;
    "keypress": KeyboardEventToPrevent;
    "keyup": KeyboardEventToPrevent;
    "load": Event;
    "loadeddata": Event;
    "loadedmetadata": Event;
    "loadstart": Event;
    "mousedown": MouseEvent;
    "mousemove": MouseEvent;
    "mouseout": MouseEvent;
    "mouseover": MouseEvent;
    "mouseup": MouseEvent;
    "mousewheel": WheelEvent;
    "pause": Event;
    "play": Event;
    "playing": Event;
    "pointerlockchange": Event;
    "pointerlockerror": Event;
    "progress": ProgressEvent;
    "ratechange": Event;
    "readystatechange": Event;
    "reset": Event;
    "scroll": UIEvent;
    "seeked": Event;
    "seeking": Event;
    "select": UIEvent;
    "selectionchange": Event;
    "selectstart": Event;
    "stalled": Event;
    "stop": Event;
    "submit": Event;
    "suspend": Event;
    "timeupdate": Event;
    "touchcancel": TouchEvent;
    "touchend": TouchEvent;
    "touchmove": TouchEvent;
    "touchstart": TouchEvent;
    "volumechange": Event;
    "waiting": Event;
    "webkitfullscreenchange": Event;
    "webkitfullscreenerror": Event;
}

interface DocumentAttrsDefault {
    /**
      * Specifies the beginning and end of the document body.
      */
    readonly body: HTMLBodyElement | HTMLFrameSetElement;
    /**
      * Gets a reference to the root node of the document. 
      */
    readonly documentElement: HTMLHtmlElement; // | SVGSVGElement; // | Element | null;
    readonly head: HTMLHeadElement;
    readonly currentScript: HTMLScriptElement | null;
}
interface DocumentAttrsToBeDetected {
    /**
      * Specifies the beginning and end of the document body.
      */
    readonly body: HTMLBodyElement | HTMLFrameSetElement | null;
    /**
      * Gets a reference to the root node of the document. 
      */
    readonly documentElement: Element | null; // | Element | null;
    readonly head: HTMLHeadElement | null;
    readonly currentScript: HTMLScriptElement | SVGScriptElement | null;
}

interface Document extends Node, GlobalEventHandlers, NodeSelector, DocumentEvent, ParentNode, DocumentOrShadowRoot {
    readonly nodeType: kNode.DOCUMENT_NODE | Element | HTMLCollection | Window;
    readonly parentNode: null;
    /**
      * Sets or gets the URL for the current document. 
      */
    readonly URL: string;
    /**
      * Gets the URL for the document, stripped of any character encoding.
      */
    readonly URLUnencoded: string;
    /**
      * Gets the object that has the focus when the parent document has focus.
      */
    readonly activeElement: Element | null;
    /**
      * Sets or gets the color of all active links in the document.
      */
    alinkColor: string;
    /**
      * Returns a reference to the collection of elements contained by the object.
      * Is a readonly HTMLAllCollection only since Chrome 65
      */
    all: HTMLAllCollection | object | null | undefined;
    /**
      * Retrieves a collection of all a objects that have a name and/or id property. Objects in this collection are in HTML source order.
      */
    anchors: HTMLCollectionOf<HTMLAnchorElement>;
    /**
      * Retrieves a collection of all applet objects in the document.
      */
    applets: HTMLCollectionOf<HTMLAppletElement>;
    /**
      * Deprecated. Sets or retrieves a value that indicates the background color behind the object. 
      */
    bgColor: string;
    readonly characterSet: string;
    /**
      * Gets or sets the character set used to encode the object.
      */
    charset: string;
    /**
      * Gets a value that indicates whether standards-compliant mode is switched on for the object.
      */
    readonly compatMode: string;
    cookie: string;
    /**
      * Gets the default character set from the current regional language settings.
      */
    readonly defaultCharset: string;
    readonly defaultView: Window;
    /**
      * Sets or gets a value that indicates whether the document can be edited.
      */
    designMode: string;
    /**
      * Sets or retrieves a value that indicates the reading order of the object. 
      */
    dir: string;
    /**
      * Gets an object representing the document type declaration associated with the current document. 
      */
    readonly doctype: DocumentType;
    /**
      * Sets or gets the security domain of the document. 
      */
    domain: string;
    /**
      * Retrieves a collection of all embed objects in the document.
      */
    embeds: HTMLCollectionOf<HTMLEmbedElement>;
    /**
      * Sets or gets the foreground (text) color of the document.
      */
    fgColor: string;
    /**
      * Retrieves a collection, in source order, of all form objects in the document.
      */
    forms: HTMLCollectionOf<HTMLFormElement>;
    readonly fullscreenElement: Element | null;
    readonly fullscreenEnabled: boolean;
    readonly hidden: boolean;
    readonly webkitHidden?: boolean; // replaced by .hidden since C33
    /**
      * Retrieves a collection, in source order, of img objects in the document.
      */
    images: HTMLCollectionOf<HTMLImageElement>;
    /**
      * Gets the implementation object of the current document. 
      */
    readonly implementation: DOMImplementation;
    /**
      * Returns the character encoding used to create the webpage that is loaded into the document object.
      */
    readonly inputEncoding: string | null;
    /**
      * Gets the date that the page was last modified, if the page supplies one. 
      */
    readonly lastModified: string;
    /**
      * Sets or gets the color of the document links. 
      */
    linkColor: string;
    /**
      * Retrieves a collection of all a objects that specify the href property and all area objects in the document.
      */
    links: HTMLCollectionOf<HTMLAnchorElement | HTMLAreaElement>;
    /**
      * Contains information about the current URL. 
      */
    readonly location: Location;
    /**
      * Fires when the user aborts the download.
      * @param ev The event.
      */
    onabort: (this: Document, ev: UIEvent) => any;
    /**
      * Fires when the object is set as the active element.
      * @param ev The event.
      */
    onactivate: (this: Document, ev: UIEvent) => any;
    /**
      * Fires immediately before the object is set as the active element.
      * @param ev The event.
      */
    onbeforeactivate: (this: Document, ev: UIEvent) => any;
    /**
      * Fires immediately before the activeElement is changed from the current object to another object in the parent document.
      * @param ev The event.
      */
    onbeforedeactivate: (this: Document, ev: UIEvent) => any;
    /** 
      * Fires when the object loses the input focus. 
      * @param ev The focus event.
      */
    onblur: (this: Document, ev: FocusEvent) => any;
    /**
      * Occurs when playback is possible, but would require further buffering. 
      * @param ev The event.
      */
    oncanplay: (this: Document, ev: Event) => any;
    oncanplaythrough: (this: Document, ev: Event) => any;
    /**
      * Fires when the contents of the object or selection have changed. 
      * @param ev The event.
      */
    onchange: (this: Document, ev: Event) => any;
    /**
      * Fires when the user clicks the left mouse button on the object
      * @param ev The mouse event.
      */
    onclick: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the user clicks the right mouse button in the client area, opening the context menu. 
      * @param ev The mouse event.
      */
    oncontextmenu: (this: Document, ev: PointerEvent) => any;
    /**
      * Fires when the user double-clicks the object.
      * @param ev The mouse event.
      */
    ondblclick: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the activeElement is changed from the current object to another object in the parent document.
      * @param ev The UI Event
      */
    ondeactivate: (this: Document, ev: UIEvent) => any;
    /**
      * Fires on the source object continuously during a drag operation.
      * @param ev The event.
      */
    ondrag: (this: Document, ev: DragEvent) => any;
    /**
      * Fires on the source object when the user releases the mouse at the close of a drag operation.
      * @param ev The event.
      */
    ondragend: (this: Document, ev: DragEvent) => any;
    /** 
      * Fires on the target element when the user drags the object to a valid drop target.
      * @param ev The drag event.
      */
    ondragenter: (this: Document, ev: DragEvent) => any;
    /** 
      * Fires on the target object when the user moves the mouse out of a valid drop target during a drag operation.
      * @param ev The drag event.
      */
    ondragleave: (this: Document, ev: DragEvent) => any;
    /**
      * Fires on the target element continuously while the user drags the object over a valid drop target.
      * @param ev The event.
      */
    ondragover: (this: Document, ev: DragEvent) => any;
    /**
      * Fires on the source object when the user starts to drag a text selection or selected object. 
      * @param ev The event.
      */
    ondragstart: (this: Document, ev: DragEvent) => any;
    ondrop: (this: Document, ev: DragEvent) => any;
    /**
      * Occurs when the duration attribute is updated. 
      * @param ev The event.
      */
    ondurationchange: (this: Document, ev: Event) => any;
    /**
      * Occurs when the media element is reset to its initial state. 
      * @param ev The event.
      */
    onemptied: (this: Document, ev: Event) => any;
    /**
      * Fires when an error occurs during object loading.
      * @param ev The event.
      */
    onerror: (this: Document, ev: ErrorEvent) => any;
    /**
      * Fires when the object receives focus. 
      * @param ev The event.
      */
    onfocus: (this: Document, ev: FocusEvent) => any;
    onfullscreenchange: (this: Document, ev: Event) => any;
    onfullscreenerror: (this: Document, ev: Event) => any;
    oninput: (this: Document, ev: Event) => any;
    oninvalid: (this: Document, ev: Event) => any;
    /**
      * Fires when the user presses a key.
      * @param ev The keyboard event
      */
    onkeydown: (this: Document, ev: KeyboardEvent) => any;
    /**
      * Fires when the user presses an alphanumeric key.
      * @param ev The event.
      */
    onkeypress: (this: Document, ev: KeyboardEvent) => any;
    /**
      * Fires when the user releases a key.
      * @param ev The keyboard event
      */
    onkeyup: (this: Document, ev: KeyboardEvent) => any;
    /**
      * Fires immediately after the browser loads the object. 
      * @param ev The event.
      */
    onload: (this: Document, ev: Event) => any;
    /**
      * Occurs when media data is loaded at the current playback position. 
      * @param ev The event.
      */
    onloadeddata: (this: Document, ev: Event) => any;
    /**
      * Occurs when the duration and dimensions of the media have been determined.
      * @param ev The event.
      */
    onloadedmetadata: (this: Document, ev: Event) => any;
    /**
      * Occurs when Internet Explorer begins looking for media data. 
      * @param ev The event.
      */
    onloadstart: (this: Document, ev: Event) => any;
    /**
      * Fires when the user clicks the object with either mouse button. 
      * @param ev The mouse event.
      */
    onmousedown: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the user moves the mouse over the object. 
      * @param ev The mouse event.
      */
    onmousemove: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the user moves the mouse pointer outside the boundaries of the object. 
      * @param ev The mouse event.
      */
    onmouseout: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the user moves the mouse pointer into the object.
      * @param ev The mouse event.
      */
    onmouseover: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the user releases a mouse button while the mouse is over the object. 
      * @param ev The mouse event.
      */
    onmouseup: (this: Document, ev: MouseEvent) => any;
    /**
      * Fires when the wheel button is rotated. 
      * @param ev The mouse event
      */
    onmousewheel: (this: Document, ev: WheelEvent) => any;
    onmscontentzoom: (this: Document, ev: UIEvent) => any;
    /**
      * Occurs when playback is paused.
      * @param ev The event.
      */
    onpause: (this: Document, ev: Event) => any;
    /**
      * Occurs when the play method is requested. 
      * @param ev The event.
      */
    onplay: (this: Document, ev: Event) => any;
    /**
      * Occurs when the audio or video has started playing. 
      * @param ev The event.
      */
    onplaying: (this: Document, ev: Event) => any;
    onpointerlockchange: (this: Document, ev: Event) => any;
    onpointerlockerror: (this: Document, ev: Event) => any;
    /**
      * Occurs to indicate progress while downloading media data. 
      * @param ev The event.
      */
    onprogress: (this: Document, ev: ProgressEvent) => any;
    /**
      * Occurs when the playback rate is increased or decreased. 
      * @param ev The event.
      */
    onratechange: (this: Document, ev: Event) => any;
    /**
      * Fires when the state of the object has changed.
      * @param ev The event
      */
    onreadystatechange: (this: Document, ev: Event) => any;
    /**
      * Fires when the user resets a form. 
      * @param ev The event.
      */
    onreset: (this: Document, ev: Event) => any;
    /**
      * Fires when the user repositions the scroll box in the scroll bar on the object. 
      * @param ev The event.
      */
    onscroll: (this: Document, ev: UIEvent) => any;
    /**
      * Occurs when the seek operation ends. 
      * @param ev The event.
      */
    onseeked: (this: Document, ev: Event) => any;
    /**
      * Occurs when the current playback position is moved. 
      * @param ev The event.
      */
    onseeking: (this: Document, ev: Event) => any;
    /**
      * Fires when the current selection changes.
      * @param ev The event.
      */
    onselect: (this: Document, ev: UIEvent) => any;
    /**
      * Fires when the selection state of a document changes.
      * @param ev The event.
      */
    onselectionchange: (this: Document, ev: Event) => any;
    onselectstart: (this: Document, ev: Event) => any;
    /**
      * Occurs when the download has stopped. 
      * @param ev The event.
      */
    onstalled: (this: Document, ev: Event) => any;
    /**
      * Fires when the user clicks the Stop button or leaves the Web page.
      * @param ev The event.
      */
    onstop: (this: Document, ev: Event) => any;
    onsubmit: (this: Document, ev: Event) => any;
    /**
      * Occurs if the load operation has been intentionally halted. 
      * @param ev The event.
      */
    onsuspend: (this: Document, ev: Event) => any;
    /**
      * Occurs to indicate the current playback position.
      * @param ev The event.
      */
    ontimeupdate: (this: Document, ev: Event) => any;
    ontouchcancel: (ev: TouchEvent) => any;
    ontouchend: (ev: TouchEvent) => any;
    ontouchmove: (ev: TouchEvent) => any;
    ontouchstart: (ev: TouchEvent) => any;
    /**
      * Occurs when the volume is changed, or playback is muted or unmuted.
      * @param ev The event.
      */
    onvolumechange: (this: Document, ev: Event) => any;
    /**
      * Occurs when playback stops because the next frame of a video resource is not available. 
      * @param ev The event.
      */
    onwaiting: (this: Document, ev: Event) => any;
    onwebkitfullscreenchange: (this: Document, ev: Event) => any;
    onwebkitfullscreenerror: (this: Document, ev: Event) => any;
    plugins: HTMLCollectionOf<HTMLEmbedElement>;
    readonly pointerLockElement: Element;
    /**
      * Retrieves a value that indicates the current state of the object.
      */
    readonly readyState: "loading" | "interactive" | "complete";
    /**
      * Gets the URL of the location that referred the user to the current page.
      */
    readonly referrer: string;
    /**
      * Gets the root svg element in the document hierarchy.
      */
    readonly rootElement: SVGSVGElement | null;
    /**
      * Retrieves a collection of all script objects in the document.
      */
    scripts: HTMLCollectionOf<HTMLScriptElement>;
    /**
     * `scrollingElement: HTMLFrameSetElement` may be:
     *  * the result of a bug on Chrome before 61
     *  * a page removes the standard documentElement and move a `<frameset>` to the position
     */
    readonly scrollingElement?: Element | null;
    /**
      * Retrieves a collection of styleSheet objects representing the style sheets that correspond to each instance of a link or style object in the document.
      */
    readonly styleSheets: StyleSheetList;
    /**
      * Contains the title of the document.
      */
    title: string;
    readonly visibilityState: string;
    /** 
      * Sets or gets the color of the links that the user has visited.
      */
    vlinkColor: string;
    readonly webkitCurrentFullScreenElement: Element | null;
    readonly webkitFullscreenElement: Element | null;
    // readonly webkitFullscreenEnabled: boolean;
    readonly webkitIsFullScreen: boolean;
    readonly mozFullScreenElement: Element | null;
    readonly xmlEncoding: string | null;
    xmlStandalone: boolean;
    /**
      * Gets or sets the version attribute specified in the declaration of an XML document.
      */
    xmlVersion: string | null;
    adoptNode(source: Node): Node;
    captureEvents(): void;
    // caretRangeFromPoint(x: number, y: number): Range;
    clear(): void;
    /**
      * Closes an output stream and forces the sent data to display.
      */
    // close(): void;
    /**
      * Creates an attribute object with a specified name.
      * @param name String that sets the attribute object's name.
      */
    createAttribute(name: string): Attr;
    createAttributeNS(namespaceURI: string | null, qualifiedName: string): Attr;
    createCDATASection(data: string): CDATASection;
    /**
      * Creates a comment object with the specified data.
      * @param data Sets the comment object's data.
      */
    createComment(data: string): Comment;
    /**
      * Creates a new document.
      */
    createDocumentFragment(): DocumentFragment;
    /**
      * Creates an instance of the element for the specified tag.
      * @param tagName The name of an element.
      */
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K];
    createElement(tagName: string): HTMLElement;
    createElementNS(namespaceURI: "http://www.w3.org/1999/xhtml", qualifiedName: string): HTMLElement
    // createElementNS(namespaceURI: "http://www.w3.org/2000/svg", qualifiedName: string): SVGElement
    // createElementNS(namespaceURI: string | null, qualifiedName: string): Element;
    /**
      * Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document. 
      * @param root The root element or node to start traversing on.
      * @param whatToShow The type of nodes or elements to appear in the node list
      * @param filter A custom NodeFilter function to use. For more information, see filter. Use null for no filter.
      * @param entityReferenceExpansion A flag that specifies whether entity reference nodes are expanded.
      */
    createNodeIterator(root: Node, whatToShow?: number, filter?: NodeFilter, entityReferenceExpansion?: boolean): NodeIterator;
    createProcessingInstruction(target: string, data: string): ProcessingInstruction;
    /**
      *  Returns an empty range object that has both of its boundary points positioned at the beginning of the document. 
      */
    createRange(): Range;
    /**
      * Creates a text string from the specified value. 
      * @param data String that specifies the nodeValue property of the text node.
      */
    createTextNode(data: string): Text;
    createTouch(view: Window, target: EventTarget, identifier: number, pageX: number, pageY: number, screenX: number, screenY: number): Touch;
    createTouchList(...touches: Touch[]): TouchList;
    /**
      * Creates a TreeWalker object that you can use to traverse filtered lists of nodes or elements in a document.
      * @param root The root element or node to start traversing on.
      * @param whatToShow The type of nodes or elements to appear in the node list. For more information, see whatToShow.
      * @param filter A custom NodeFilter function to use.
      * @param entityReferenceExpansion A flag that specifies whether entity reference nodes are expanded.
      */
    createTreeWalker(root: Node, whatToShow?: number, filter?: NodeFilter, entityReferenceExpansion?: boolean): TreeWalker;
    /**
      * Returns the element for the specified x coordinate and the specified y coordinate. 
      * @param x The x-offset
      * @param y The y-offset
      */
    elementFromPoint(x: number, y: number): Element | null;
    /**
      * Executes a command on the current document, current selection, or the given range.
      * @param commandId String that specifies the command to execute. This command can be any of the command identifiers that can be executed in script.
      * @param showUI Display the user interface, defaults to false.
      * @param value Value to assign.
      */
    execCommand(commandId: string, showUI?: boolean, value?: any): boolean;
    /**
      * Displays help information for the given command identifier.
      * @param commandId Displays help information for the given command identifier.
      */
    execCommandShowHelp(commandId: string): boolean;
    exitFullscreen(): void;
    exitPointerLock(): void;
    /**
      * Causes the element to receive the focus and executes the code specified by the onfocus event.
      */
    focus(): void;
    /**
      * Returns a reference to the first object with the specified value of the ID or NAME attribute.
      * @param elementId String that specifies the ID value. Case-insensitive.
      */
    getElementById(elementId: string): HTMLElement | null;
    getElementsByClassName(classNames: string): HTMLCollectionOf<Element>;
    /**
      * Gets a collection of objects based on the value of the NAME or ID attribute.
      * @param elementName Gets a collection of objects based on the value of the NAME or ID attribute.
      */
    getElementsByName(elementName: string): NodeListOf<HTMLElement>;
    /**
      * Retrieves a collection of objects based on the specified element name.
      * @param name Specifies the name of an element.
      */
    getElementsByTagName<K extends keyof ElementTagNameMap>(tagname: K): HTMLCollectionOf<ElementTagNameMap[K]>;
    getElementsByTagName(tagname: string): HTMLCollectionOf<Element>;
    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/1999/xhtml", localName: string): HTMLCollectionOf<HTMLElement>;
    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/2000/svg", localName: string): HTMLCollectionOf<SVGElement>;
    getElementsByTagNameNS(namespaceURI: string, localName: string): HTMLCollectionOf<Element>;
    /**
      * Returns an object representing the current selection of the document that is loaded into the object displaying a webpage.
      */
    getSelection(): Selection;
    /**
      * Gets a value indicating whether the object currently has focus.
      * Not work well during handling focus/blur events on Chrome 64.
      */
    hasFocus(): boolean;
    importNode<T extends Node>(importedNode: T, deep: true): T;
    /**
      * Opens a new window and loads a document specified by a given URL.
      * Also, opens a new window that uses the url parameter and the name parameter to collect the output of the write method and the writeln method.
      * @param url Specifies a MIME type for the document.
      * @param name Specifies the name of the window. This name is used as the value for the TARGET attribute on a form or an anchor element.
      * @param features Contains a list of items separated by commas. Each item consists of an option and a value,
      * separated by an equals sign (for example, "fullscreen=yes, toolbar=yes"). The following values are supported.
      * @param replace Specifies whether the existing entry for the document is replaced in the history list.
      */
    // open(url?: string, name?: string, features?: string, replace?: boolean): Document;
    /** 
      * Returns a Boolean value that indicates whether a specified command can be successfully executed using execCommand, given the current state of the document.
      * @param commandId Specifies a command identifier.
      */
    queryCommandEnabled(commandId: string): boolean;
    /**
      * Returns a Boolean value that indicates whether the specified command is in the indeterminate state.
      * @param commandId String that specifies a command identifier.
      */
    queryCommandIndeterm(commandId: string): boolean;
    /**
      * Returns a Boolean value that indicates the current state of the command.
      * @param commandId String that specifies a command identifier.
      */
    queryCommandState(commandId: string): boolean;
    /**
      * Returns a Boolean value that indicates whether the current command is supported on the current range.
      * @param commandId Specifies a command identifier.
      */
    queryCommandSupported(commandId: string): boolean;
    /**
      * Retrieves the string associated with a command.
      * @param commandId String that contains the identifier of a command. This can be any command identifier given in the list of Command Identifiers. 
      */
    queryCommandText(commandId: string): string;
    /**
      * Returns the current value of the document, range, or current selection for the given command.
      * @param commandId String that specifies a command identifier.
      */
    queryCommandValue(commandId: string): string;
    releaseEvents(): void;
    /**
      * Allows updating the print settings for the page.
      */
    updateSettings(): void;
    webkitCancelFullScreen(): void;
    webkitExitFullscreen(): void;
    /**
      * Writes one or more HTML expressions to a document in the specified window. 
      * @param content Specifies the text and HTML tags to write.
      */
    // write(...content: string[]): void;
    /**
      * Writes one or more HTML expressions, followed by a carriage return, to a document in the specified window. 
      * @param content The text and HTML tags to write.
      */
    // writeln(...content: string[]): void;
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: Document, ev: DocumentEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var Document: {
    prototype: Document;
    new(): Document;
}

interface DocumentFragment extends Node, NodeSelector, ParentNode {
    readonly nodeType: kNode.DOCUMENT_FRAGMENT_NODE;
    getElementById?(elementId: string): Element | null;
}

declare var DocumentFragment: {
    prototype: DocumentFragment;
    new(): DocumentFragment;
}

interface DocumentType extends Node, ChildNode {
    readonly entities: NamedNodeMap;
    readonly internalSubset: string | null;
    readonly name: string;
    readonly notations: NamedNodeMap;
    readonly publicId: string;
    readonly systemId: string;
}

declare var DocumentType: {
    prototype: DocumentType;
    new(): DocumentType;
}

interface DragEvent extends MouseEvent {
    readonly dataTransfer: DataTransfer;
    initDragEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , detailArg: NonNullable<UIEventInit["detail"]>
        , screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number
        , ctrlKeyArg: boolean, altKeyArg: boolean, shiftKeyArg: boolean, metaKeyArg: boolean
        , buttonArg: NonNullable<MouseEventInit["button"]>, relatedTargetArg: EventTarget
        , dataTransferArg: DataTransfer): void;
}

declare var DragEvent: {
    prototype: DragEvent;
    new(): DragEvent;
}

interface ElementEventMap extends GlobalEventHandlersEventMap {
    "gotpointercapture": PointerEvent;
    "lostpointercapture": PointerEvent;
    "touchcancel": TouchEvent;
    "touchend": TouchEvent;
    "touchmove": TouchEvent;
    "touchstart": TouchEvent;
    "webkitfullscreenchange": Event;
    "webkitfullscreenerror": Event;
}

interface ScrollToOptions extends ScrollOptions {
    left?: number;
    top?: number;
}

interface AttachShadow {
    attachShadow(shadowRootInitDict: ShadowRootInit): ShadowRoot;
}
interface Element extends Node, GlobalEventHandlers, ElementTraversal, NodeSelector, ChildNode, ParentNode
        , Partial<AttachShadow> {
    readonly nodeType: kNode.ELEMENT_NODE | Element | RadioNodeList | Window;
    readonly childNodes: NodeList | Element | RadioNodeList | Window;
    readonly nodeName: string | Element | RadioNodeList | Window;
    readonly localName: string | Element | RadioNodeList | Window;
    readonly ownerDocument: Document | RadioNodeList | Window;
    readonly parentElement: Element | RadioNodeList | Window | null;
    readonly parentNode: Node | RadioNodeList | Window | null;

    readonly classList: DOMTokenList;
    className: string | SVGAnimatedString
    readonly clientHeight: number;
    readonly clientLeft: number;
    readonly clientTop: number;
    readonly clientWidth: number;
    getDestinationInsertionPoints?(): Element[];
    id: string;
    innerHTML: string;
    ongotpointercapture: (this: Element, ev: PointerEvent) => any;
    onlostpointercapture: (this: Element, ev: PointerEvent) => any;
    ontouchcancel: (ev: TouchEvent) => any;
    ontouchend: (ev: TouchEvent) => any;
    ontouchmove: (ev: TouchEvent) => any;
    ontouchstart: (ev: TouchEvent) => any;
    onwebkitfullscreenchange: (this: Element, ev: Event) => any;
    onwebkitfullscreenerror: (this: Element, ev: Event) => any;
    outerHTML: string;
    readonly prefix: string | null;
    readonly scrollHeight: number;
    scrollLeft: number;
    scrollTop: number;
    readonly scrollWidth: number;
    readonly tagName: string | Element | RadioNodeList | Window;
    readonly assignedSlot: HTMLSlotElement | null;
    slot: string;
    readonly shadowRoot?: ShadowRoot | Element | RadioNodeList | Window | null;
    readonly webkitShadowRoot?: ShadowRoot | Element | RadioNodeList | Window | null;
    textContent: string;
    focus?(): void;
    blur?(): void;
    getAttribute(name: string): string | null;
    getAttributeNS(namespaceURI: string, localName: string): string;
    getAttributeNode(name: string): Attr;
    getAttributeNodeNS(namespaceURI: string, localName: string): Attr;
    getBoundingClientRect(): ClientRect;
    getClientRects(): ClientRectList;
    getElementsByTagName<K extends keyof ElementListTagNameMap>(name: K): HTMLCollectionOf<ElementTagNameMap[K]>;
    getElementsByTagName(name: string): HTMLCollectionOf<Element>;
    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/1999/xhtml", localName: string): HTMLCollectionOf<HTMLElement>;
    getElementsByTagNameNS(namespaceURI: "http://www.w3.org/2000/svg", localName: string): HTMLCollectionOf<SVGElement>;
    getElementsByTagNameNS(namespaceURI: string, localName: string): HTMLCollectionOf<Element>;
    hasAttribute(name: string): boolean;
    hasAttributeNS(namespaceURI: string, localName: string): boolean;
    releasePointerCapture(pointerId: number): void;
    removeAttribute(qualifiedName: string): void;
    removeAttributeNS(namespaceURI: string, localName: string): void;
    removeAttributeNode(oldAttr: Attr): Attr;
    requestFullscreen(): void;
    requestPointerLock(): void;
    setAttribute(name: string, value: string): void;
    setAttributeNS(namespaceURI: string, qualifiedName: string, value: string): void;
    setAttributeNode(newAttr: Attr): Attr;
    setAttributeNodeNS(newAttr: Attr): Attr;
    setPointerCapture(pointerId: number): void;
    webkitMatchesSelector(selectors: string): boolean;
    webkitRequestFullScreen(): void;
    webkitRequestFullscreen(): void;
    getElementsByClassName<T extends Element>(classNames: string): NodeListOf<T>;
    getElementsByClassName(classNames: string): NodeListOf<Element>;
    matches? (selector: string): boolean; // maybe since C34
    closest? (selector: string): Element | null;
    /** default to true  */
    scrollIntoView(alignToTop?: boolean | ScrollIntoViewOptions): void;
    scrollIntoViewIfNeeded? (alignToTop?: boolean): void;
    scroll(x: number, y: number): void;
    scrollTo(options?: ScrollToOptions): void;
    scrollTo(x: number, y: number): void;
    scrollBy(options?: ScrollToOptions): void;
    scrollBy(x: number, y: number): void;
    insertAdjacentElement(position: 'afterbegin' | 'beforeend', insertedElement: Element): Element | null;
    insertAdjacentHTML(where: 'afterbegin' | 'beforeend', html: string): void;
    insertAdjacentText(where: 'afterbegin' | 'beforeend', text: string): void;
    createShadowRoot?(): ShadowRoot;
    webkitCreateShadowRoot?(): ShadowRoot;
    addEventListener<K extends keyof ElementEventMap>(type: K, listener: (this: Element, ev: ElementEventMap[K]) => ELRet, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface ElementConstructor {
    prototype: Element;
    new(): Element;
}
declare var Element: ElementConstructor;

interface SafeElement extends Element {
  readonly tagName: string;
  readonly nodeName: string;
  readonly localName: string;
}
type BaseSafeHTMLElement = HTMLElement & SafeElement;
interface SafeHTMLElement extends BaseSafeHTMLElement {
  className: string
  innerText: string;
  readonly parentElement: Element | null;
  readonly parentNode: Node | null;
  readonly localName: Exclude<keyof HTMLElementTagNameMap, "form" | "frameset">
}

interface ErrorEvent extends Event {
    readonly type: "error";
    readonly colno: number;
    readonly error: any;
    readonly filename: string;
    readonly lineno: number;
    readonly message: string;
    initErrorEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, messageArg: string, filenameArg: string, linenoArg: number): void;
}

declare var ErrorEvent: {
    prototype: ErrorEvent;
    new(): ErrorEvent;
}

type EventPath = NodeList | EventTarget[];

interface Event {
    readonly bubbles: boolean;
    cancelBubble: boolean;
    readonly cancelable: boolean;
    readonly currentTarget: EventTarget;
    readonly defaultPrevented: boolean;
    readonly eventPhase: number;
    readonly isTrusted?: boolean;
    // returnValue: boolean;
    // readonly srcElement: Element | null;
    readonly target: EventTarget;
    readonly timeStamp: number;
    readonly type: string;
    readonly scoped: boolean;
    initEvent(eventTypeArg: string, canBubbleArg: boolean, cancelableArg: boolean): void;
    // preventDefault?(): void;
    stopImmediatePropagation(): void;
    stopPropagation(): void;
    composedPath?(): EventTarget[];
    path?: EventPath;
    readonly AT_TARGET: number;
    readonly BUBBLING_PHASE: number;
    readonly CAPTURING_PHASE: number;
}

interface ToPrevent {
  preventDefault(): void;
  stopImmediatePropagation(): void;
}
interface EventToPrevent extends Event, ToPrevent {}
type __KeyboardEventToPrevent = KeyboardEvent & ToPrevent;
interface KeyboardEventToPrevent extends KeyboardEvent, ToPrevent {}
type __MouseEventToPrevent = MouseEvent & ToPrevent;
interface MouseEventToPrevent extends MouseEvent, ToPrevent {}

interface TypedEvent<T extends string> extends Event {
    readonly type: T;
}

declare var Event: {
    prototype: Event;
    new(typeArg: string, eventInitDict?: EventInit): Event;
    readonly AT_TARGET: number;
    readonly BUBBLING_PHASE: number;
    readonly CAPTURING_PHASE: number;
}

interface EventTarget {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject
        , useCapture?: EventListenerOptions | boolean): void;
    dispatchEvent(evt: Event): boolean;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject
        , useCapture?: EventListenerOptions | boolean): void;
}

declare var EventTarget: {
    prototype: EventTarget;
    new(): EventTarget;
}

interface External {
}

declare var External: {
    prototype: External;
    new(): External;
}

interface File extends Blob {
    readonly lastModifiedDate?: Date;
    readonly lastModified?: number;
    readonly name: string;
    readonly webkitRelativePath: string;
}

declare var File: {
    prototype: File;
    new (parts: (ArrayBuffer | ArrayBufferView | Blob | string)[], filename: string, properties?: FilePropertyBag): File;
}

interface FileList {
    readonly length: number;
    item(index: number): File;
    [index: number]: File;
}

declare var FileList: {
    prototype: FileList;
    new(): FileList;
}

interface FileReader extends EventTarget {
    readonly error: DOMError;
    readonly result: any;
    onload: ((ev: Event & { target: FileReader }) => void) | null
    readAsArrayBuffer(blob: Blob): void;
    readAsBinaryString(blob: Blob): void;
    readAsDataURL(blob: Blob): void;
    readAsText(blob: Blob, encoding?: string): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var FileReader: {
    prototype: FileReader;
    new(): FileReader;
}

interface FocusEvent extends UIEvent {
    readonly relatedTarget: EventTarget;
    initFocusEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, detailArg: number, relatedTargetArg: EventTarget): void;
}

declare var FocusEvent: {
    prototype: FocusEvent;
    new(typeArg: string, eventInitDict?: FocusEventInit): FocusEvent;
}

interface FormData {
    append(name: any, value: any, blobName?: string): void;
}

declare var FormData: {
    prototype: FormData;
    new (form?: HTMLFormElement): FormData;
}

interface HTMLAllCollection {
    readonly length: number;
    namedItem(name: string): Element;
    // [index: number]: Element;
}

declare var HTMLAllCollection: {
    prototype: HTMLAllCollection;
    new(): HTMLAllCollection;
}

interface HTMLAnchorElement extends SafeHTMLElement {
    readonly tagName: "A";
    readonly nodeName: "A";
    readonly localName: "a";
    readonly innerText: string;
    readonly parentElement: Element | null;
    readonly parentNode: Node | null;
    Methods: string;
    /**
      * Sets or retrieves the character set used to encode the object.
      */
    charset: string;
    /**
      * Sets or retrieves the coordinates of the object.
      */
    coords: string;
    download: string;
    /**
      * Contains the anchor portion of the URL including the hash sign (#).
      */
    hash: string;
    /**
      * Contains the hostname and port values of the URL.
      */
    host: string;
    /**
      * Contains the hostname of a URL.
      */
    hostname: string;
    /**
      * Sets or retrieves a destination URL or an anchor point.
      */
    href: string;
    /**
      * Sets or retrieves the language code of the object.
      */
    hreflang: string;
    readonly mimeType: string;
    /**
      * Sets or retrieves the shape of the object.
      */
    name: string;
    readonly nameProp: string;
    /**
      * Contains the pathname of the URL.
      */
    pathname: string;
    /** is only ensured on Chrome */
    ping?: string;
    /**
      * Sets or retrieves the port number associated with a URL.
      */
    port: string;
    /**
      * Contains the protocol of the URL.
      */
    protocol: string;
    readonly protocolLong: string;
    /**
      * Sets or retrieves the relationship between the object and the destination of the link.
      */
    rel: string;
    /**
      * Sets or retrieves the relationship between the object and the destination of the link.
      */
    rev: string;
    /**
      * Sets or retrieves the substring of the href property that follows the question mark.
      */
    search: string;
    /**
      * Sets or retrieves the shape of the object.
      */
    shape: string;
    /**
      * Sets or retrieves the window or frame at which to target content.
      */
    target: string;
    /**
      * Retrieves or sets the text of the object as a string. 
      */
    text: string;
    type: string;
    urn: string;
    /** 
      * Returns a string representation of an object.
      */
    // toString(): string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLAnchorElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLAnchorElement: {
    prototype: HTMLAnchorElement;
    new(): HTMLAnchorElement;
}

interface HTMLAppletElement extends SafeHTMLElement {
    /**
      * Retrieves a string of the URL where the object tag can be found. This is often the href of the document that the object is in, or the value set by a base element.
      */
    readonly BaseHref: string;
    align: string;
    /**
      * Sets or retrieves a text alternative to the graphic.
      */
    alt: string;
    /**
      * Gets or sets the optional alternative HTML script to execute if the object fails to load.
      */
    altHtml: string;
    /**
      * Sets or retrieves a character string that can be used to implement your own archive functionality for the object.
      */
    archive: string;
    border: string;
    code: string;
    /**
      * Sets or retrieves the URL of the component.
      */
    codeBase: string;
    /**
      * Sets or retrieves the Internet media type for the code associated with the object.
      */
    codeType: string;
    /**
      * Address of a pointer to the document this page or frame contains. If there is no document, then null will be returned.
      */
    readonly contentDocument: Document;
    /**
      * Sets or retrieves the URL that references the data of the object.
      */
    data: string;
    /**
      * Sets or retrieves a character string that can be used to implement your own declare functionality for the object.
      */
    declare: boolean;
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the height of the object.
      */
    height: string;
    hspace: number;
    /**
      * Sets or retrieves the shape of the object.
      */
    name: string;
    object: string | null;
    /**
      * Sets or retrieves a message to be displayed while an object is loading.
      */
    standby: string;
    /**
      * Returns the content type of the object.
      */
    type: string;
    /**
      * Sets or retrieves the URL, often with a bookmark extension (#name), to use as a client-side image map.
      */
    useMap: string;
    vspace: number;
    width: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLAppletElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLAppletElement: {
    prototype: HTMLAppletElement;
    new(): HTMLAppletElement;
}

interface HTMLAreaElement extends SafeHTMLElement {
    readonly tagName: "AREA";
    readonly nodeName: "AREA";
    readonly localName: "area";
    readonly innerText: string;
    readonly parentElement: Element | null;
    readonly parentNode: Node | null;
    /**
      * Sets or retrieves a text alternative to the graphic.
      */
    alt: string;
    /**
      * Sets or retrieves the coordinates of the object.
      */
    coords: string;
    download: string;
    /**
      * Sets or retrieves the subsection of the href property that follows the number sign (#).
      */
    hash: string;
    /**
      * Sets or retrieves the hostname and port number of the location or URL.
      */
    host: string;
    /**
      * Sets or retrieves the host name part of the location or URL. 
      */
    hostname: string;
    /**
      * Sets or retrieves a destination URL or an anchor point.
      */
    href: string;
    /**
      * Sets or gets whether clicks in this region cause action.
      */
    noHref: boolean;
    /**
      * Sets or retrieves the file name or path specified by the object.
      */
    pathname: string;
    /**
      * Sets or retrieves the port number associated with a URL.
      */
    port: string;
    /**
      * Sets or retrieves the protocol portion of a URL.
      */
    protocol: string;
    rel: string;
    /**
      * Sets or retrieves the substring of the href property that follows the question mark.
      */
    search: string;
    /**
      * Sets or retrieves the shape of the object.
      */
    shape: string;
    /**
      * Sets or retrieves the window or frame at which to target content.
      */
    target: string;
    /** 
      * Returns a string representation of an object.
      */
    // toString(): string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLAreaElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLAreaElement: {
    prototype: HTMLAreaElement;
    new(): HTMLAreaElement;
}

interface HTMLAreasCollection extends HTMLCollectionBase {
}

declare var HTMLAreasCollection: {
    prototype: HTMLAreasCollection;
    new(): HTMLAreasCollection;
}

interface HTMLAudioElement extends HTMLMediaElement {
    addEventListener<K extends keyof HTMLMediaElementEventMap>(type: K, listener: (this: HTMLAudioElement, ev: HTMLMediaElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLAudioElement: {
    prototype: HTMLAudioElement;
    new(): HTMLAudioElement;
}

interface HTMLBRElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the side on which floating objects are not to be positioned when any IHTMLBlockElement is inserted into the document.
      */
    clear: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLBRElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLBRElement: {
    prototype: HTMLBRElement;
    new(): HTMLBRElement;
}

interface HTMLBaseElement extends SafeHTMLElement {
    /**
      * Gets or sets the baseline URL on which relative links are based.
      */
    href: string;
    /**
      * Sets or retrieves the window or frame at which to target content.
      */
    target: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLBaseElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLBaseElement: {
    prototype: HTMLBaseElement;
    new(): HTMLBaseElement;
}

interface HTMLBaseFontElement extends SafeHTMLElement, DOML2DeprecatedColorProperty {
    /**
      * Sets or retrieves the current typeface family.
      */
    face: string;
    /**
      * Sets or retrieves the font size of the object.
      */
    size: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLBaseFontElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLBaseFontElement: {
    prototype: HTMLBaseFontElement;
    new(): HTMLBaseFontElement;
}

interface HTMLBodyElementEventMap extends HTMLElementEventMap {
    "afterprint": Event;
    "beforeprint": Event;
    "beforeunload": BeforeUnloadEvent;
    "blur": FocusEvent;
    "error": ErrorEvent;
    "focus": FocusEvent;
    "hashchange": HashChangeEvent;
    "load": Event;
    "message": MessageEvent;
    "offline": Event;
    "online": Event;
    "orientationchange": Event;
    "pagehide": PageTransitionEvent;
    "pageshow": PageTransitionEvent;
    "popstate": PopStateEvent;
    "resize": UIEvent;
    "scroll": UIEvent;
    "storage": StorageEvent;
    "unload": Event;
}

interface HTMLBodyElement extends SafeHTMLElement {
    readonly tagName: "BODY";
    readonly nodeName: "BODY";
    readonly localName: "body";
    innerText: string;
    aLink: any;
    background: string;
    bgColor: any;
    bgProperties: string;
    link: any;
    noWrap: boolean;
    onafterprint: (this: HTMLBodyElement, ev: Event) => any;
    onbeforeprint: (this: HTMLBodyElement, ev: Event) => any;
    onbeforeunload: (this: HTMLBodyElement, ev: BeforeUnloadEvent) => any;
    onblur: (this: HTMLBodyElement, ev: FocusEvent) => any;
    onerror: (this: HTMLBodyElement, ev: ErrorEvent) => any;
    onfocus: (this: HTMLBodyElement, ev: FocusEvent) => any;
    onhashchange: (this: HTMLBodyElement, ev: HashChangeEvent) => any;
    onload: (this: HTMLBodyElement, ev: Event) => any;
    onmessage: (this: HTMLBodyElement, ev: MessageEvent) => any;
    onoffline: (this: HTMLBodyElement, ev: Event) => any;
    ononline: (this: HTMLBodyElement, ev: Event) => any;
    onorientationchange: (this: HTMLBodyElement, ev: Event) => any;
    onpagehide: (this: HTMLBodyElement, ev: PageTransitionEvent) => any;
    onpageshow: (this: HTMLBodyElement, ev: PageTransitionEvent) => any;
    onpopstate: (this: HTMLBodyElement, ev: PopStateEvent) => any;
    onresize: (this: HTMLBodyElement, ev: UIEvent) => any;
    onscroll: (this: HTMLBodyElement, ev: UIEvent) => any;
    onstorage: (this: HTMLBodyElement, ev: StorageEvent) => any;
    onunload: (this: HTMLBodyElement, ev: Event) => any;
    text: any;
    vLink: any;
    addEventListener<K extends keyof HTMLBodyElementEventMap>(type: K, listener: (this: HTMLBodyElement, ev: HTMLBodyElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLBodyElement: {
    prototype: HTMLBodyElement;
    new(): HTMLBodyElement;
}

interface HTMLButtonElement extends SafeHTMLElement {
    /**
      * Provides a way to direct a user to a specific field when a document loads. This can provide both direction and convenience for a user,
      * reducing the need to click or tab to a field when a page opens. This attribute is true when present on an element, and false when missing.
      */
    autofocus: boolean;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Overrides the action attribute (where the data on a form is sent) on the parent form element.
      */
    formAction: string;
    /**
      * Used to override the encoding (formEnctype attribute) specified on the form element.
      */
    formEnctype: string;
    /**
      * Overrides the submit method attribute previously specified on a form element.
      */
    formMethod: string;
    /**
      * Overrides any validation or required attributes on a form or form elements to allow it to be submitted without validation.
      * This can be used to create a "save draft"-type submit option.
      */
    formNoValidate: string;
    /**
      * Overrides the target attribute on a form element.
      */
    formTarget: string;
    /** 
      * Sets or retrieves the name of the object.
      */
    name: string;
    status: any;
    /**
      * Gets the classification and default behavior of the button.
      */
    type: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field". The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    /** 
      * Sets or retrieves the default or selected value of the control.
      */
    value: string;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLButtonElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLButtonElement: {
    prototype: HTMLButtonElement;
    new(): HTMLButtonElement;
}

interface HTMLCanvasElement extends SafeHTMLElement {
    /**
      * Gets or sets the height of a canvas element on a document.
      */
    height: number;
    /**
      * Gets or sets the width of a canvas element on a document.
      */
    width: number;
    /**
      * Returns an object that provides methods and properties for drawing and manipulating images and graphics on a canvas element in a document.
      * A context object includes information about colors, line widths, fonts, and other graphic parameters that can be drawn on a canvas.
      * @param contextId The identifier (ID) of the type of canvas to create.
      * Internet Explorer 9 and Internet Explorer 10 support only a 2-D context using canvas.getContext("2d");
      * IE11 Preview also supports 3-D or WebGL context using canvas.getContext("experimental-webgl");
      */
    getContext(contextId: "2d", contextAttributes?: Canvas2DContextAttributes): CanvasRenderingContext2D | null;
    getContext(contextId: string, contextAttributes?: {}): CanvasRenderingContext2D | null;
    /**
      * Returns the content of the current canvas as an image that you can use as a source for another canvas or an HTML element.
      * @param type The standard MIME type for the image format to return. If you do not specify this parameter, the default value is a PNG format image.
      */
    toDataURL(type?: string, ...args: any[]): string;
    toBlob(callback: (result: Blob | null) => void, type?: string, ...arguments: any[]): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLCanvasElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLCanvasElement: {
    prototype: HTMLCanvasElement;
    new(): HTMLCanvasElement;
}

interface HTMLCollectionBase {
    /**
      * Sets or retrieves the number of objects in a collection.
      */
    readonly length: number;
    /**
      * Retrieves an object from various collections.
      */
    item(index: number): Element;
    [index: number]: Element;
}

interface HTMLCollection extends HTMLCollectionBase {
    readonly nodeType: undefined;
    /**
      * Retrieves a select object or an object from an options collection.
      */
    namedItem(name: string): Element | null;
}

declare var HTMLCollection: {
    prototype: HTMLCollection;
    new(): HTMLCollection;
}

interface HTMLDListElement extends SafeHTMLElement {
    compact: boolean;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLDListElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLDListElement: {
    prototype: HTMLDListElement;
    new(): HTMLDListElement;
}

interface HTMLDataListElement extends SafeHTMLElement {
    options: HTMLCollectionOf<HTMLOptionElement>;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLDataListElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLDataListElement: {
    prototype: HTMLDataListElement;
    new(): HTMLDataListElement;
}

interface HTMLDetailsElement extends SafeHTMLElement {
    open: boolean;
}

declare var HTMLDetailsElement: {
    prototype: HTMLDetailsElement;
    new(): HTMLDetailsElement;
};

interface Window {
    HTMLDetailsElement?: typeof HTMLDetailsElement | Element | RadioNodeList | Window;
}

interface HTMLDialogElement extends SafeHTMLElement {
    open: boolean;
    returnValue: string;
    close(returnValue?: string): void;
    show(): void;
    showModal(): void;
}

declare var HTMLDialogElement: {
    prototype: HTMLDialogElement;
    new(): HTMLDialogElement;
};

interface HTMLDirectoryElement extends SafeHTMLElement {
    compact: boolean;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLDirectoryElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLDirectoryElement: {
    prototype: HTMLDirectoryElement;
    new(): HTMLDirectoryElement;
}

interface HTMLDivElement extends SafeHTMLElement {
    /**
      * Sets or retrieves how the object is aligned with adjacent text. 
      */
    align: string;
    /**
      * Sets or retrieves whether the browser automatically performs wordwrap.
      */
    noWrap: boolean;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLDivElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLDivElement: {
    prototype: HTMLDivElement;
    new(): HTMLDivElement;
}

interface HTMLDocument extends Document {
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: HTMLDocument, ev: DocumentEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLDocument: {
    prototype: HTMLDocument;
    new(): HTMLDocument;
}

interface HTMLElementEventMap extends ElementEventMap {
    "abort": UIEvent;
    "activate": UIEvent;
    "beforeactivate": UIEvent;
    "beforecopy": ClipboardEvent;
    "beforecut": ClipboardEvent;
    "beforedeactivate": UIEvent;
    "beforepaste": ClipboardEvent;
    "blur": FocusEvent;
    "canplay": Event;
    "canplaythrough": Event;
    "change": Event;
    "click": MouseEvent;
    "contextmenu": PointerEvent;
    "copy": ClipboardEvent;
    "cuechange": Event;
    "cut": ClipboardEvent;
    "dblclick": MouseEvent;
    "deactivate": UIEvent;
    "drag": DragEvent;
    "dragend": DragEvent;
    "dragenter": DragEvent;
    "dragleave": DragEvent;
    "dragover": DragEvent;
    "dragstart": DragEvent;
    "drop": DragEvent;
    "durationchange": Event;
    "emptied": Event;
    "error": ErrorEvent;
    "focus": FocusEvent;
    "input": Event;
    "invalid": Event;
    "keydown": KeyboardEventToPrevent;
    "keypress": KeyboardEvent;
    "keyup": KeyboardEvent;
    "load": Event;
    "loadeddata": Event;
    "loadedmetadata": Event;
    "loadstart": Event;
    "mousedown": MouseEvent;
    "mouseenter": MouseEvent;
    "mouseleave": MouseEvent;
    "mousemove": MouseEvent;
    "mouseout": MouseEvent;
    "mouseover": MouseEvent;
    "mouseup": MouseEvent;
    "mousewheel": WheelEvent;
    "paste": ClipboardEvent;
    "pause": Event;
    "play": Event;
    "playing": Event;
    "progress": ProgressEvent;
    "ratechange": Event;
    "reset": Event;
    "scroll": UIEvent;
    "seeked": Event;
    "seeking": Event;
    "select": UIEvent;
    "selectstart": Event;
    "stalled": Event;
    "submit": Event;
    "suspend": Event;
    "timeupdate": Event;
    "volumechange": Event;
    "waiting": Event;
}

interface KnownDataset {}

interface HTMLElement extends Element {
    accessKey: string;
    readonly children: HTMLCollection;
    contentEditable: "true" | "false" | "inherit" | "plaintext-only";
    readonly dataset: Partial<KnownDataset>;
    dir: string;
    draggable: boolean;
    hidden: boolean;
    hideFocus: boolean;
    innerText: string | Element | RadioNodeList | Window;
    readonly isContentEditable: boolean;
    /** replaced with a narrower value - for easier debugging */ lang: "";
    readonly offsetHeight: number;
    readonly offsetLeft: number;
    readonly offsetParent: Element;
    readonly offsetTop: number;
    readonly offsetWidth: number;
    onabort: (ev: UIEvent) => any;
    onactivate: (ev: UIEvent) => any;
    onbeforeactivate: (ev: UIEvent) => any;
    onbeforecopy: (ev: ClipboardEvent) => any;
    onbeforecut: (ev: ClipboardEvent) => any;
    onbeforedeactivate: (ev: UIEvent) => any;
    onbeforepaste: (ev: ClipboardEvent) => any;
    onblur: (ev: FocusEvent) => any;
    oncanplay: (ev: Event) => any;
    oncanplaythrough: (ev: Event) => any;
    onchange: (ev: Event) => any;
    onclick?: (ev: MouseEventToPrevent) => any;
    oncontextmenu: (ev: PointerEvent) => any;
    oncopy: (ev: ClipboardEvent) => any;
    oncuechange: (ev: Event) => any;
    oncut: (ev: ClipboardEvent) => any;
    ondblclick: (ev: MouseEvent) => any;
    ondeactivate: (ev: UIEvent) => any;
    ondrag: (ev: DragEvent) => any;
    ondragend: (ev: DragEvent) => any;
    ondragenter: (ev: DragEvent) => any;
    ondragleave: (ev: DragEvent) => any;
    ondragover: (ev: DragEvent & ToPrevent) => any;
    ondragstart: (ev: DragEvent) => any;
    ondrop: (ev: DragEvent & ToPrevent) => any;
    ondurationchange: (ev: Event) => any;
    onemptied: (ev: Event) => any;
    onerror: (ev: ErrorEvent) => any;
    onfocus: (ev: FocusEvent) => any;
    oninput: (ev: Event) => any;
    oninvalid: (ev: Event) => any;
    onkeydown: (ev: KeyboardEvent) => any;
    onkeypress: (ev: KeyboardEvent) => any;
    onkeyup: (ev: KeyboardEvent) => any;
    onload: (ev: Event) => any;
    onloadeddata: (ev: Event) => any;
    onloadedmetadata: (ev: Event) => any;
    onloadstart: (ev: Event) => any;
    onmousedown: (ev: MouseEventToPrevent) => any;
    onmouseenter: (ev: MouseEvent) => any;
    onmouseleave: (ev: MouseEvent) => any;
    onmousemove: (ev: MouseEvent) => any;
    onmouseout: (ev: MouseEvent) => any;
    onmouseover: (ev: MouseEvent) => any;
    onmouseup: (ev: MouseEvent) => any;
    onmousewheel: (ev: WheelEvent) => any;
    onmscontentzoom: (ev: UIEvent) => any;
    onpaste: (ev: ClipboardEvent) => any;
    onpause: (ev: Event) => any;
    onplay: (ev: Event) => any;
    onplaying: (ev: Event) => any;
    onprogress: (ev: ProgressEvent) => any;
    onratechange: (ev: Event) => any;
    onreset: (ev: Event) => any;
    onscroll: (ev: UIEvent) => any;
    onseeked: (ev: Event) => any;
    onseeking: (ev: Event) => any;
    onselect(ev: UIEvent): any;
    onselectstart: (ev: Event) => any;
    onstalled: (ev: Event) => any;
    onsubmit: (ev: Event) => any;
    onsuspend: (ev: Event) => any;
    ontimeupdate: (ev: Event) => any;
    onvolumechange: (ev: Event) => any;
    onwaiting: (ev: Event) => any;
    outerText?: string; // not exist on Firefox
    spellcheck: boolean;
    readonly style: CSSStyleDeclaration;
    tabIndex: number;
    title: string;
    blur(): void;
    click(): void;
    dragDrop(): boolean;
    focus(): void;
    setActive(): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K
        , listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => ELRet
        , useCapture?: EventListenerOptions): void;
    removeEventListener<K extends keyof HTMLElementEventMap>(type: K
        , listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => ELRet
        , useCapture?: EventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject
        , useCapture?: EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject
        , useCapture?: EventListenerOptions): void;
}

declare var HTMLElement: {
    prototype: HTMLElement;
    new(): HTMLElement;
}

interface HTMLEmbedElement extends SafeHTMLElement, GetSVGDocument {
    /**
      * Sets or retrieves the height of the object.
      */
    height: string;
    hidden: any;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    /**
      * Retrieves the palette used for the embedded document.
      */
    readonly palette: string;
    /**
      * Retrieves the URL of the plug-in used to view an embedded document.
      */
    readonly pluginspage: string;
    readonly readyState: string;
    /**
      * Sets or retrieves a URL to be loaded by the object.
      */
    src: string;
    type: string;
    /**
      * Sets or retrieves the height and width units of the embed object.
      */
    units: string;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLEmbedElement: {
    prototype: HTMLEmbedElement;
    new(): HTMLEmbedElement;
}

interface HTMLFieldSetElement extends SafeHTMLElement {
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    name: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field". The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLFieldSetElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLFieldSetElement: {
    prototype: HTMLFieldSetElement;
    new(): HTMLFieldSetElement;
}

interface HTMLFontElement extends SafeHTMLElement, DOML2DeprecatedColorProperty, DOML2DeprecatedSizeProperty {
    /**
      * Sets or retrieves the current typeface family.
      */
    face: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLFontElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLFontElement: {
    prototype: HTMLFontElement;
    new(): HTMLFontElement;
}

interface HTMLFormElement extends HTMLElement {
    /**
      * Sets or retrieves a list of character encodings for input data that must be accepted by the server processing the form.
      */
    acceptCharset: string;
    /**
      * Sets or retrieves the URL to which the form content is sent for processing.
      */
    action: string;
    /**
      * Specifies whether autocomplete is applied to an editable text field.
      */
    autocomplete: string;
    /**
      * Retrieves a collection, in source order, of all controls in a given form.
      */
    readonly elements: HTMLCollection;
    /**
      * Sets or retrieves the MIME encoding for the form.
      */
    encoding: string;
    /**
      * Sets or retrieves the encoding type for the form.
      */
    enctype: string;
    /**
      * Sets or retrieves the number of objects in a collection.
      */
    readonly length: number;
    /**
      * Sets or retrieves how to send the form data to the server.
      */
    method: string;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    /**
      * Designates a form that is not validated when submitted.
      */
    noValidate: boolean;
    /**
      * Sets or retrieves the window or frame at which to target content.
      */
    target: string;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Retrieves a form object or an object from an elements collection.
      * @param name Variant of type Number or String that specifies the object or collection to retrieve. If this parameter is a Number,
      * it is the zero-based index of the object. If this parameter is a string, all objects with matching name or id properties are retrieved,
      * and a collection is returned if more than one match is made.
      * @param index Variant of type Number that specifies the zero-based index of the object to retrieve when a collection is returned.
      */
    item(name?: any, index?: any): any;
    /**
      * Retrieves a form object or an object from an elements collection.
      */
    namedItem(name: string): any;
    /**
      * Fires when the user resets a form.
      */
    reset(): void;
    /**
      * Fires when a FORM is about to be submitted.
      */
    submit(): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLFormElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
    // [name: string]: any; // not use it
}

declare var HTMLFormElement: {
    prototype: HTMLFormElement;
    new(): HTMLFormElement;
}

interface HTMLFrameElementEventMap extends HTMLElementEventMap {
    "load": Event;
}


interface HTMLFrameElement extends SafeHTMLElement, GetSVGDocument {
    /**
      * Specifies the properties of a border drawn around an object.
      */
    border: string;
    /**
      * Sets or retrieves the border color of the object.
      */
    borderColor: any;
    /**
      * Retrieves the document object of the page or frame.
      */
    readonly contentDocument: Document;
    /**
      * Retrieves the object of the specified.
      */
    readonly contentWindow: Window;
    /**
      * Sets or retrieves whether to display a border for the frame.
      */
    frameBorder: string;
    /**
      * Sets or retrieves the amount of additional space between the frames.
      */
    frameSpacing: any;
    /**
      * Sets or retrieves the height of the object.
      */
    height: string | number;
    /**
      * Sets or retrieves a URI to a long description of the object.
      */
    longDesc: string;
    /**
      * Sets or retrieves the top and bottom margin heights before displaying the text in a frame.
      */
    marginHeight: string;
    /**
      * Sets or retrieves the left and right margin widths before displaying the text in a frame.
      */
    marginWidth: string;
    /**
      * Sets or retrieves the frame name.
      */
    name: string;
    /**
      * Sets or retrieves whether the user can resize the frame.
      */
    noResize: boolean;
    /**
      * Raised when the object has been completely received from the server.
      */
    onload: (this: HTMLFrameElement, ev: Event) => any;
    /**
      * Sets or retrieves whether the frame can be scrolled.
      */
    scrolling: string;
    /**
      * Sets or retrieves a URL to be loaded by the object.
      */
    src: string;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string | number;
    addEventListener<K extends keyof HTMLFrameElementEventMap>(type: K, listener: (this: HTMLFrameElement, ev: HTMLFrameElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLFrameElement: {
    prototype: HTMLFrameElement;
    new(): HTMLFrameElement;
}

interface HTMLFencedFrameElement extends SafeHTMLElement {
    config: object | null
}

declare var HTMLFencedFrameElement: {
    prototype: HTMLFencedFrameElement;
    new(): HTMLFencedFrameElement;
}

interface HTMLFrameSetElementEventMap extends HTMLElementEventMap {
    "beforeprint": Event;
    "beforeunload": BeforeUnloadEvent;
    "blur": FocusEvent;
    "error": ErrorEvent;
    "focus": FocusEvent;
    "hashchange": HashChangeEvent;
    "load": Event;
    "message": MessageEvent;
    "offline": Event;
    "online": Event;
    "orientationchange": Event;
    "pagehide": PageTransitionEvent;
    "pageshow": PageTransitionEvent;
    "resize": UIEvent;
    "scroll": UIEvent;
    "storage": StorageEvent;
    "unload": Event;
}

interface HTMLFrameSetElement extends HTMLElement {
    border: string;
    /**
      * Sets or retrieves the border color of the object.
      */
    borderColor: any;
    /**
      * Sets or retrieves the frame widths of the object.
      */
    cols: string;
    /**
      * Sets or retrieves whether to display a border for the frame.
      */
    frameBorder: string;
    /**
      * Sets or retrieves the amount of additional space between the frames.
      */
    frameSpacing: any;
    name: string;
    onafterprint: (this: HTMLFrameSetElement, ev: Event) => any;
    onbeforeprint: (this: HTMLFrameSetElement, ev: Event) => any;
    onbeforeunload: (this: HTMLFrameSetElement, ev: BeforeUnloadEvent) => any;
    /**
      * Fires when the object loses the input focus.
      */
    onblur: (this: HTMLFrameSetElement, ev: FocusEvent) => any;
    onerror: (this: HTMLFrameSetElement, ev: ErrorEvent) => any;
    /**
      * Fires when the object receives focus.
      */
    onfocus: (this: HTMLFrameSetElement, ev: FocusEvent) => any;
    onhashchange: (this: HTMLFrameSetElement, ev: HashChangeEvent) => any;
    onload: (this: HTMLFrameSetElement, ev: Event) => any;
    onmessage: (this: HTMLFrameSetElement, ev: MessageEvent) => any;
    onoffline: (this: HTMLFrameSetElement, ev: Event) => any;
    ononline: (this: HTMLFrameSetElement, ev: Event) => any;
    onorientationchange: (this: HTMLFrameSetElement, ev: Event) => any;
    onpagehide: (this: HTMLFrameSetElement, ev: PageTransitionEvent) => any;
    onpageshow: (this: HTMLFrameSetElement, ev: PageTransitionEvent) => any;
    onpopstate: (this: HTMLFrameSetElement, ev: PopStateEvent) => any;
    onresize: (this: HTMLFrameSetElement, ev: UIEvent) => any;
    onscroll: (this: HTMLFrameSetElement, ev: UIEvent) => any;
    onstorage: (this: HTMLFrameSetElement, ev: StorageEvent) => any;
    onunload: (this: HTMLFrameSetElement, ev: Event) => any;
    /**
      * Sets or retrieves the frame heights of the object.
      */
    rows: string;
    addEventListener<K extends keyof HTMLFrameSetElementEventMap>(
        type: K, listener: (this: HTMLFrameSetElement, ev: HTMLFrameSetElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLFrameSetElement: {
    prototype: HTMLFrameSetElement;
    new(): HTMLFrameSetElement;
}

interface HTMLHRElement extends SafeHTMLElement, DOML2DeprecatedColorProperty, DOML2DeprecatedSizeProperty {
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    /**
      * Sets or retrieves whether the horizontal rule is drawn with 3-D shading.
      */
    noShade: boolean;
    /**
      * Sets or retrieves the width of the object.
      */
    width: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLHRElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLHRElement: {
    prototype: HTMLHRElement;
    new(): HTMLHRElement;
}

interface HTMLHeadElement extends SafeHTMLElement {
    profile: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLHeadElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLHeadElement: {
    prototype: HTMLHeadElement;
    new(): HTMLHeadElement;
}

interface HTMLHeadingElement extends SafeHTMLElement {
    /**
      * Sets or retrieves a value that indicates the table alignment.
      */
    align: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLHeadingElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLHeadingElement: {
    prototype: HTMLHeadingElement;
    new(): HTMLHeadingElement;
}

interface HTMLHtmlElement extends SafeHTMLElement {
    readonly tagName: "HTML";
    readonly nodeName: "HTML";
    readonly localName: "html";
    /**
      * Sets or retrieves the DTD version that governs the current document.
      */
    version: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLHtmlElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLHtmlElement: {
    prototype: HTMLHtmlElement;
    new(): HTMLHtmlElement;
}

interface HTMLIFrameElementEventMap extends HTMLElementEventMap {
    "load": Event;
}

interface HTMLIFrameElement extends SafeHTMLElement, GetSVGDocument {
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    allowFullscreen: boolean;
    /**
      * Specifies the properties of a border drawn around an object.
      */
    border: string;
    /**
      * Retrieves the document object of the page or frame.
      */
    readonly contentDocument: Document | null;
    /**
      * Retrieves the object of the specified.
      */
    readonly contentWindow: Window;
    /**
      * Sets or retrieves whether to display a border for the frame.
      */
    frameBorder: string;
    /**
      * Sets or retrieves the amount of additional space between the frames.
      */
    frameSpacing: any;
    /**
      * Sets or retrieves the height of the object.
      */
    height: string;
    /**
      * Sets or retrieves the horizontal margin for the object.
      */
    hspace: number;
    /**
      * Sets or retrieves a URI to a long description of the object.
      */
    longDesc: string;
    /**
      * Sets or retrieves the top and bottom margin heights before displaying the text in a frame.
      */
    marginHeight: string;
    /**
      * Sets or retrieves the left and right margin widths before displaying the text in a frame.
      */
    marginWidth: string;
    /**
      * Sets or retrieves the frame name.
      */
    name: string;
    /**
      * Sets or retrieves whether the user can resize the frame.
      */
    noResize: boolean;
    /**
      * Raised when the object has been completely received from the server.
      */
    onload: (this: HTMLIFrameElement, ev: Event) => any;
    referrerPolicy?: string;
    sandbox: DOMSettableTokenList | string;
    /**
      * Sets or retrieves whether the frame can be scrolled.
      */
    scrolling: string;
    /**
      * Sets or retrieves a URL to be loaded by the object.
      */
    src: string;
    /**
      * Sets or retrieves the vertical margin for the object.
      */
    vspace: number;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    addEventListener<K extends keyof HTMLIFrameElementEventMap>(type: K, listener: (this: HTMLIFrameElement, ev: HTMLIFrameElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLIFrameElement: {
    prototype: HTMLIFrameElement;
    new(): HTMLIFrameElement;
}

interface HTMLImageElement extends SafeHTMLElement {
    readonly tagName: "IMG";
    readonly nodeName: "IMG";
    readonly localName: "img";
    readonly innerText: string;
    readonly parentElement: Element | null;
    readonly parentNode: Node | null;
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    /**
      * Sets or retrieves a text alternative to the graphic.
      */
    alt: string;
    /**
      * Specifies the properties of a border drawn around an object.
      */
    border: string;
    /**
      * Retrieves whether the object is fully loaded.
      */
    readonly complete: boolean;
    crossOrigin: "anonymous" | "use-credentials" | null;
    readonly currentSrc: string;
    /**
      * Sets or retrieves the height of the object.
      */
    height: number;
    /**
      * Sets or retrieves the width of the border to draw around the object.
      */
    hspace: number;
    /**
      * Sets or retrieves whether the image is a server-side image map.
      */
    isMap: boolean;
    /**
      * Sets or retrieves a Uniform Resource Identifier (URI) to a long description of the object.
      */
    longDesc: string;
    lowsrc: string;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    /**
      * The original height of the image resource before sizing.
      */
    readonly naturalHeight: number;
    /**
      * The original width of the image resource before sizing.
      */
    readonly naturalWidth: number;
    sizes: string;
    /**
      * The address or URL of the a media resource that is to be considered.
      */
    src: string;
    srcset: string;
    /**
      * Sets or retrieves the URL, often with a bookmark extension (#name), to use as a client-side image map.
      */
    useMap: string;
    /**
      * Sets or retrieves the vertical margin for the object.
      */
    vspace: number;
    /**
      * Sets or retrieves the width of the object.
      */
    width: number;
    readonly x: number;
    readonly y: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLImageElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLImageElement: {
    prototype: HTMLImageElement;
    new(): HTMLImageElement;
}

interface HTMLInputElement extends SafeHTMLElement {
    readonly tagName: "INPUT";
    readonly nodeName: "INPUT";
    readonly localName: "input";
    readonly innerText: string;
    readonly parentElement: Element | null;
    readonly parentNode: Node | null;
    readonly labels: NodeListOf<HTMLLabelElement>;
    /**
      * Sets or retrieves a comma-separated list of content types.
      */
    accept: string;
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    /**
      * Sets or retrieves a text alternative to the graphic.
      */
    alt: string;
    /**
      * Specifies whether autocomplete is applied to an editable text field.
      */
    autocomplete: string;
    /**
      * Provides a way to direct a user to a specific field when a document loads. This can provide both direction and convenience for a user,
      * reducing the need to click or tab to a field when a page opens. This attribute is true when present on an element, and false when missing.
      */
    autofocus: boolean;
    /**
      * Sets or retrieves the width of the border to draw around the object.
      */
    border: string;
    /**
      * Sets or retrieves the state of the check box or radio button.
      */
    checked: boolean;
    /**
      * Retrieves whether the object is fully loaded.
      */
    readonly complete: boolean;
    /**
      * Sets or retrieves the state of the check box or radio button.
      */
    defaultChecked: boolean;
    /**
      * Sets or retrieves the initial contents of the object.
      */
    defaultValue: string;
    disabled: boolean;
    /**
      * Returns a FileList object on a file type input object.
      */
    readonly files: FileList | null;
    /**
      * Retrieves a reference to the form that the object is embedded in. 
      */
    readonly form: HTMLFormElement;
    /**
      * Overrides the action attribute (where the data on a form is sent) on the parent form element.
      */
    formAction: string;
    /**
      * Used to override the encoding (formEnctype attribute) specified on the form element.
      */
    formEnctype: string;
    /**
      * Overrides the submit method attribute previously specified on a form element.
      */
    formMethod: string;
    /**
      * Overrides any validation or required attributes on a form or form elements to allow it to be submitted without validation.
      * This can be used to create a "save draft"-type submit option.
      */
    formNoValidate: string;
    /**
      * Overrides the target attribute on a form element.
      */
    formTarget: string;
    /**
      * Sets or retrieves the height of the object.
      */
    height: string;
    /**
      * Sets or retrieves the width of the border to draw around the object.
      */
    hspace: number;
    indeterminate: boolean;
    /**
      * Specifies the ID of a pre-defined datalist of options for an input element.
      */
    readonly list: HTMLElement;
    /**
      * Defines the maximum acceptable value for an input element with type="number".When used with the min and step attributes,
      * lets you control the range and increment (such as only even numbers) that the user can enter into an input field.
      */
    max: string;
    /**
      * Sets or retrieves the maximum number of characters that the user can enter in a text control.
      */
    maxLength: number;
    /**
      * Defines the minimum acceptable value for an input element with type="number". When used with the max and step attributes,
      * lets you control the range and increment (such as even numbers only) that the user can enter into an input field.
      */
    min: string;
    /**
      * Sets or retrieves the Boolean value indicating whether multiple items can be selected from a list.
      */
    multiple: boolean;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    /**
      * Gets or sets a string containing a regular expression that the user's input must match.
      */
    pattern: string;
    /**
      * Gets or sets a text string that is displayed in an input field as a hint or prompt to users as the format or type of information they need to enter.
      * The text appears in an input field until the user puts focus on the field.
      */
    placeholder: string;
    readOnly: boolean;
    /**
      * When present, marks an element that can't be submitted without a value.
      */
    required: boolean;
    selectionDirection: "backward" | "forward" | "none" | null;
    /**
      * Gets or sets the end position or offset of a text selection.
      */
    selectionEnd: number | null;
    /**
      * Gets or sets the starting position or offset of a text selection.
      */
    selectionStart: number | null;
    size: number;
    /**
      * The address or URL of the a media resource that is to be considered.
      */
    src: string;
    status: boolean;
    /**
      * Defines an increment or jump between values that you want to allow the user to enter. When used with the max and min attributes,
      * lets you control the range and increment (for example, allow only even numbers) that the user can enter into an input field.
      */
    step: string;
    /**
      * Returns the content type of the object.
      */
    type: string;
    /**
      * Sets or retrieves the URL, often with a bookmark extension (#name), to use as a client-side image map.
      */
    useMap: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field". The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    /**
      * Returns the value of the data at the cursor's current position.
      */
    value: string;
    valueAsDate: Date;
    /**
      * Returns the input field value as a number.
      */
    valueAsNumber: number;
    /**
      * Sets or retrieves the vertical margin for the object.
      */
    vspace: number;
    webkitdirectory: boolean;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    minLength: number;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Makes the selection equal to the current object.
      */
    select(): void;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    /**
      * Sets the start and end positions of a selection in a text field.
      * @param start The offset into the text field for the start of the selection.
      * @param end The offset into the text field for the end of the selection.
      */
    setSelectionRange(start: number, end: number, direction?: string): void;
    /**
      * Decrements a range input control's value by the value given by the Step attribute.
      * If the optional parameter is used, it will decrement the input control's step value multiplied by the parameter's value.
      * @param n Value to decrement the value by.
      */
    stepDown(n?: number): void;
    /**
      * Increments a range input control's value by the value given by the Step attribute.
      * If the optional parameter is used, will increment the input control's value by that value.
      * @param n Value to increment the value by.
      */
    stepUp(n?: number): void;
    addEventListener<K extends CompositionEvent["type"]>(type: K
        , listener: (this: HTMLInputElement, ev: CompositionEvent & { type: K }) => ELRet
        , useCapture?: EventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K
        , listener: (this: HTMLInputElement, ev: HTMLElementEventMap[K]) => ELRet
        , useCapture?: EventListenerOptions): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K
        , listener: ((this: HTMLInputElement, ev: HTMLElementEventMap[K]) => ELRet) | null
        , useCapture?: EventListenerOptions): void;
}

declare var HTMLInputElement: {
    prototype: HTMLInputElement;
    new(): HTMLInputElement;
}

interface HTMLLIElement extends SafeHTMLElement {
    type: string;
    /**
      * Sets or retrieves the value of a list item.
      */
    value: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLLIElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLLIElement: {
    prototype: HTMLLIElement;
    new(): HTMLLIElement;
}

interface HTMLLabelElement extends SafeHTMLElement {
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement | null;
    readonly control: HTMLElement | null;
    /**
      * Sets or retrieves the object to which the given label object is assigned.
      */
    htmlFor: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLLabelElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLLabelElement: {
    prototype: HTMLLabelElement;
    new(): HTMLLabelElement;
}

interface HTMLLegendElement extends SafeHTMLElement {
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    align: string;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLLegendElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLLegendElement: {
    prototype: HTMLLegendElement;
    new(): HTMLLegendElement;
}

interface HTMLLinkElement extends SafeHTMLElement, LinkStyle {
    /**
      * Sets or retrieves the character set used to encode the object.
      */
    charset: string;
    disabled: boolean;
    /**
      * Sets or retrieves a destination URL or an anchor point.
      */
    href: string;
    /**
      * Sets or retrieves the language code of the object.
      */
    hreflang: string;
    /**
      * Sets or retrieves the media type.
      */
    media: string;
    /**
      * Sets or retrieves the relationship between the object and the destination of the link.
      */
    rel: string;
    /**
      * Sets or retrieves the relationship between the object and the destination of the link.
      */
    rev: string;
    /**
      * Sets or retrieves the window or frame at which to target content.
      */
    target: string;
    /**
      * Sets or retrieves the MIME type of the object.
      */
    type: string;
    import?: Document;
    integrity: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLLinkElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLLinkElement: {
    prototype: HTMLLinkElement;
    new(): HTMLLinkElement;
}

interface HTMLMapElement extends SafeHTMLElement {
    /**
      * Retrieves a collection of the area objects defined for the given map object.
      */
    readonly areas: HTMLAreasCollection;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLMapElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLMapElement: {
    prototype: HTMLMapElement;
    new(): HTMLMapElement;
}

interface HTMLMarqueeElementEventMap extends HTMLElementEventMap {
    "bounce": Event;
    "finish": Event;
    "start": Event;
}

interface HTMLMarqueeElement extends SafeHTMLElement {
    behavior: string;
    bgColor: any;
    direction: string;
    height: string;
    hspace: number;
    loop: number;
    onbounce: (this: HTMLMarqueeElement, ev: Event) => any;
    onfinish: (this: HTMLMarqueeElement, ev: Event) => any;
    onstart: (this: HTMLMarqueeElement, ev: Event) => any;
    scrollAmount: number;
    scrollDelay: number;
    trueSpeed: boolean;
    vspace: number;
    width: string;
    start(): void;
    stop(): void;
    addEventListener<K extends keyof HTMLMarqueeElementEventMap>(
        type: K, listener: (this: HTMLMarqueeElement, ev: HTMLMarqueeElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLMarqueeElement: {
    prototype: HTMLMarqueeElement;
    new(): HTMLMarqueeElement;
}

interface HTMLMediaElementEventMap extends HTMLElementEventMap {
}

interface HTMLMediaElement extends SafeHTMLElement {
}

declare var HTMLMediaElement: {
    prototype: HTMLMediaElement;
    new(): HTMLMediaElement;
    readonly HAVE_CURRENT_DATA: number;
    readonly HAVE_ENOUGH_DATA: number;
    readonly HAVE_FUTURE_DATA: number;
    readonly HAVE_METADATA: number;
    readonly HAVE_NOTHING: number;
    readonly NETWORK_EMPTY: number;
    readonly NETWORK_IDLE: number;
    readonly NETWORK_LOADING: number;
    readonly NETWORK_NO_SOURCE: number;
}

interface HTMLMenuElement extends SafeHTMLElement {
    compact: boolean;
    type: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLMenuElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLMenuElement: {
    prototype: HTMLMenuElement;
    new(): HTMLMenuElement;
}

interface HTMLMetaElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the character set used to encode the object.
      */
    charset: string;
    /**
      * Gets or sets meta-information to associate with httpEquiv or name.
      */
    content: string;
    /**
      * Gets or sets information used to bind the value of a content attribute of a meta element to an HTTP response header.
      */
    httpEquiv: string;
    /**
      * Sets or retrieves the value specified in the content attribute of the meta object.
      */
    name: string;
    /**
      * Sets or retrieves a scheme to be used in interpreting the value of a property specified for the object.
      */
    scheme: string;
    /**
      * Sets or retrieves the URL property that will be loaded after the specified time has elapsed. 
      */
    url: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLMetaElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLMetaElement: {
    prototype: HTMLMetaElement;
    new(): HTMLMetaElement;
}

interface HTMLMeterElement extends SafeHTMLElement {
    high: number;
    low: number;
    max: number;
    min: number;
    optimum: number;
    value: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLMeterElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLMeterElement: {
    prototype: HTMLMeterElement;
    new(): HTMLMeterElement;
}

interface HTMLModElement extends SafeHTMLElement {
    /**
      * Sets or retrieves reference information about the object.
      */
    cite: string;
    /**
      * Sets or retrieves the date and time of a modification to the object.
      */
    dateTime: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLModElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLModElement: {
    prototype: HTMLModElement;
    new(): HTMLModElement;
}

interface HTMLOListElement extends SafeHTMLElement {
    compact: boolean;
    /**
      * The starting number.
      */
    start: number;
    type: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLOListElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLOListElement: {
    prototype: HTMLOListElement;
    new(): HTMLOListElement;
}

interface HTMLObjectElement extends SafeHTMLElement, GetSVGDocument {
    /**
      * Retrieves a string of the URL where the object tag can be found. This is often the href of the document that the object is in, or the value set by a base element.
      */
    readonly BaseHref: string;
    align: string;
    /**
      * Sets or retrieves a text alternative to the graphic.
      */
    alt: string;
    /**
      * Gets or sets the optional alternative HTML script to execute if the object fails to load.
      */
    altHtml: string;
    /**
      * Sets or retrieves a character string that can be used to implement your own archive functionality for the object.
      */
    archive: string;
    border: string;
    /**
      * Sets or retrieves the URL of the file containing the compiled Java class.
      */
    code: string;
    /**
      * Sets or retrieves the URL of the component.
      */
    codeBase: string;
    /**
      * Sets or retrieves the Internet media type for the code associated with the object.
      */
    codeType: string;
    /**
      * Retrieves the document object of the page or frame.
      */
    readonly contentDocument: Document;
    /**
      * Sets or retrieves the URL that references the data of the object.
      */
    data: string;
    declare: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the height of the object.
      */
    height: string;
    hspace: number;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    readonly readyState: number;
    /**
      * Sets or retrieves a message to be displayed while an object is loading.
      */
    standby: string;
    /**
      * Sets or retrieves the MIME type of the object.
      */
    type: string;
    /**
      * Sets or retrieves the URL, often with a bookmark extension (#name), to use as a client-side image map.
      */
    useMap: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field". The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    vspace: number;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLObjectElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLObjectElement: {
    prototype: HTMLObjectElement;
    new(): HTMLObjectElement;
}

interface HTMLOptGroupElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the status of an option.
      */
    defaultSelected: boolean;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the ordinal position of an option in a list box.
      */
    readonly index: number;
    /**
      * Sets or retrieves a value that you can use to implement your own label functionality for the object.
      */
    label: string;
    /**
      * Sets or retrieves whether the option in the list box is the default item.
      */
    selected: boolean;
    /**
      * Sets or retrieves the text string specified by the option tag.
      */
    readonly text: string;
    /**
      * Sets or retrieves the value which is returned to the server when the form control is submitted.
      */
    value: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLOptGroupElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLOptGroupElement: {
    prototype: HTMLOptGroupElement;
    new(): HTMLOptGroupElement;
}

interface HTMLOptionElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the status of an option.
      */
    defaultSelected: boolean;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the ordinal position of an option in a list box.
      */
    readonly index: number;
    /**
      * Sets or retrieves a value that you can use to implement your own label functionality for the object.
      */
    label: string;
    /**
      * Sets or retrieves whether the option in the list box is the default item.
      */
    selected: boolean;
    /**
      * Sets or retrieves the text string specified by the option tag.
      */
    text: string;
    /**
      * Sets or retrieves the value which is returned to the server when the form control is submitted.
      */
    value: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLOptionElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLOptionElement: {
    prototype: HTMLOptionElement;
    new(): HTMLOptionElement;
}

interface HTMLOptionsCollection extends HTMLCollectionOf<HTMLOptionElement> {
    length: number;
    selectedIndex: number;
    add(element: HTMLOptionElement | HTMLOptGroupElement, before?: HTMLElement | number): void;
    remove(index: number): void;
}

declare var HTMLOptionsCollection: {
    prototype: HTMLOptionsCollection;
    new(): HTMLOptionsCollection;
}

interface HTMLOutputElement extends SafeHTMLElement {
    defaultValue: string;
    readonly form: HTMLFormElement;
    readonly htmlFor: DOMSettableTokenList;
    name: string;
    readonly type: string;
    readonly validationMessage: string;
    readonly validity: ValidityState;
    value: string;
    readonly willValidate: boolean;
    checkValidity(): boolean;
    reportValidity(): boolean;
    setCustomValidity(error: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLOutputElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLOutputElement: {
    prototype: HTMLOutputElement;
    new(): HTMLOutputElement;
}

interface HTMLParagraphElement extends SafeHTMLElement {
    /**
      * Sets or retrieves how the object is aligned with adjacent text. 
      */
    align: string;
    clear: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLParagraphElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLParagraphElement: {
    prototype: HTMLParagraphElement;
    new(): HTMLParagraphElement;
}

interface HTMLParamElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the name of an input parameter for an element.
      */
    name: string;
    /**
      * Sets or retrieves the content type of the resource designated by the value attribute.
      */
    type: string;
    /**
      * Sets or retrieves the value of an input parameter for an element.
      */
    value: string;
    /**
      * Sets or retrieves the data type of the value attribute.
      */
    valueType: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLParamElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLParamElement: {
    prototype: HTMLParamElement;
    new(): HTMLParamElement;
}

interface HTMLPictureElement extends SafeHTMLElement {
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLPictureElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLPictureElement: {
    prototype: HTMLPictureElement;
    new(): HTMLPictureElement;
}

interface HTMLPreElement extends SafeHTMLElement {
    /**
      * Sets or gets a value that you can use to implement your own width functionality for the object.
      */
    width: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLPreElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLPreElement: {
    prototype: HTMLPreElement;
    new(): HTMLPreElement;
}

interface HTMLProgressElement extends SafeHTMLElement {
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Defines the maximum, or "done" value for a progress element.
      */
    max: number;
    /**
      * Returns the quotient of value/max when the value attribute is set (determinate progress bar), or -1 when the value attribute is missing (indeterminate progress bar).
      */
    readonly position: number;
    /**
      * Sets or gets the current value of a progress element. The value must be a non-negative number between 0 and the max value.
      */
    value: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLProgressElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLProgressElement: {
    prototype: HTMLProgressElement;
    new(): HTMLProgressElement;
}

interface HTMLQuoteElement extends SafeHTMLElement {
    /**
      * Sets or retrieves reference information about the object.
      */
    cite: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLQuoteElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLQuoteElement: {
    prototype: HTMLQuoteElement;
    new(): HTMLQuoteElement;
}

interface HTMLScriptElement extends SafeHTMLElement {
    async: boolean;
    /**
      * Sets or retrieves the character set used to encode the object.
      */
    charset: string;
    crossOrigin: string | null;
    /**
      * Sets or retrieves the status of the script.
      */
    defer: boolean;
    /**
      * Sets or retrieves the event for which the script is written. 
      */
    event: string;
    /** 
      * Sets or retrieves the object that is bound to the event script.
      */
    htmlFor: string;
    /**
      * Retrieves the URL to an external file that contains the source code or data.
      */
    src: string;
    /**
      * Retrieves or sets the text of the object as a string. 
      */
    text: string;
    /**
      * Sets or retrieves the MIME type for the associated scripting engine.
      */
    type: string;
    integrity: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLScriptElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLScriptElement: {
    prototype: HTMLScriptElement;
    new(): HTMLScriptElement;
}

interface HTMLSelectElement extends SafeHTMLElement {
    readonly labels: NodeListOf<HTMLLabelElement>;
    /**
      * Provides a way to direct a user to a specific field when a document loads.
      * This can provide both direction and convenience for a user, reducing the need to click or tab to a field when a page opens.
      * This attribute is true when present on an element, and false when missing.
      */
    autofocus: boolean;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in. 
      */
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the number of objects in a collection.
      */
    length: number;
    /**
      * Sets or retrieves the Boolean value indicating whether multiple items can be selected from a list.
      */
    multiple: boolean;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    readonly options: HTMLOptionsCollection;
    /**
      * When present, marks an element that can't be submitted without a value.
      */
    required: boolean;
    /**
      * Sets or retrieves the index of the selected option in a select object.
      */
    selectedIndex: number;
    selectedOptions: HTMLCollectionOf<HTMLOptionElement>;
    /**
      * Sets or retrieves the number of rows in the list box. 
      */
    size: number;
    /**
      * Retrieves the type of select control based on the value of the MULTIPLE attribute.
      */
    readonly type: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field". The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    /**
      * Sets or retrieves the value which is returned to the server when the form control is submitted.
      */
    value: string;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    /**
      * Adds an element to the areas, controlRange, or options collection.
      * @param element Variant of type Number that specifies the index position in the collection where the element is placed.
      * If no value is given, the method places the element at the end of the collection.
      * @param before Variant of type Object that specifies an element to insert before, or null to append the object to the collection. 
      */
    add(element: HTMLElement, before?: HTMLElement | number): void;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Retrieves a select object or an object from an options collection.
      * @param name Variant of type Number or String that specifies the object or collection to retrieve.
      * If this parameter is an integer, it is the zero-based index of the object.
      * If this parameter is a string, all objects with matching name or id properties are retrieved, and a collection is returned if more than one match is made.
      * @param index Variant of type Number that specifies the zero-based index of the object to retrieve when a collection is returned.
      */
    item(name?: any, index?: any): any;
    /**
      * Retrieves a select object or an object from an options collection.
      * @param namedItem A String that specifies the name or id property of the object to retrieve. A collection is returned if more than one match is made.
      */
    namedItem(name: string): any;
    /**
      * Removes an element from the collection.
      * @param index Number that specifies the zero-based index of the element to remove from the collection.
      */
    remove(index?: number): void;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLSelectElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLSelectElement: {
    prototype: HTMLSelectElement;
    new(): HTMLSelectElement;
}

interface HTMLSourceElement extends SafeHTMLElement {
    /**
      * Gets or sets the intended media type of the media source.
     */
    media: string;
    sizes: string;
    /**
      * The address or URL of the a media resource that is to be considered.
      */
    src: string;
    srcset: string;
    /**
     * Gets or sets the MIME type of a media resource.
     */
    type: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLSourceElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLSourceElement: {
    prototype: HTMLSourceElement;
    new(): HTMLSourceElement;
}

interface HTMLSpanElement extends SafeHTMLElement {
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLSpanElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLSpanElement: {
    prototype: HTMLSpanElement;
    new(): HTMLSpanElement;
}

interface HTMLStyleElement extends SafeHTMLElement, LinkStyle {
    /**
     * not exist in https://html.spec.whatwg.org/multipage/semantics.html#the-style-element
     * https://www.w3.org/Bugs/Public/show_bug.cgi?id=14703
     */
    disabled?: boolean;

    /**
      * Sets or retrieves the media type.
      */
    media: string;
    /**
      * Retrieves the CSS language in which the style sheet is written.
      */
    type: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLStyleElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLStyleElement: {
    prototype: HTMLStyleElement;
    new(): HTMLStyleElement;
}

interface HTMLTableCaptionElement extends SafeHTMLElement {
    /**
      * Sets or retrieves the alignment of the caption or legend.
      */
    align: string;
    /**
      * Sets or retrieves whether the caption appears at the top or bottom of the table.
      */
    vAlign: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTableCaptionElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableCaptionElement: {
    prototype: HTMLTableCaptionElement;
    new(): HTMLTableCaptionElement;
}

interface HTMLTableCellElement extends SafeHTMLElement, HTMLTableAlignment {
    /**
      * Sets or retrieves abbreviated text for the object.
      */
    abbr: string;
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    /**
      * Sets or retrieves a comma-delimited list of conceptual categories associated with the object.
      */
    axis: string;
    bgColor: any;
    /**
      * Retrieves the position of the object in the cells collection of a row.
      */
    readonly cellIndex: number;
    /**
      * Sets or retrieves the number columns in the table that the object should span.
      */
    colSpan: number;
    /**
      * Sets or retrieves a list of header cells that provide information for the object.
      */
    headers: string;
    /**
      * Sets or retrieves the height of the object.
      */
    height: any;
    /**
      * Sets or retrieves whether the browser automatically performs wordwrap.
      */
    noWrap: boolean;
    /**
      * Sets or retrieves how many rows in a table the cell should span.
      */
    rowSpan: number;
    /**
      * Sets or retrieves the group of cells in a table to which the object's information applies.
      */
    scope: string;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTableCellElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableCellElement: {
    prototype: HTMLTableCellElement;
    new(): HTMLTableCellElement;
}

interface HTMLTableColElement extends SafeHTMLElement, HTMLTableAlignment {
    /**
      * Sets or retrieves the alignment of the object relative to the display or table.
      */
    align: string;
    /**
      * Sets or retrieves the number of columns in the group.
      */
    span: number;
    /**
      * Sets or retrieves the width of the object.
      */
    width: any;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTableColElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableColElement: {
    prototype: HTMLTableColElement;
    new(): HTMLTableColElement;
}

interface HTMLTableDataCellElement extends HTMLTableCellElement {
}

declare var HTMLTableDataCellElement: {
    prototype: HTMLTableDataCellElement;
    new(): HTMLTableDataCellElement;
}

interface HTMLTableElement extends SafeHTMLElement {
    /**
      * Sets or retrieves a value that indicates the table alignment.
      */
    align: string;
    bgColor: any;
    /**
      * Sets or retrieves the width of the border to draw around the object.
      */
    border: string;
    /**
      * Sets or retrieves the border color of the object. 
      */
    borderColor: any;
    /**
      * Retrieves the caption object of a table.
      */
    caption: HTMLTableCaptionElement;
    /**
      * Sets or retrieves the amount of space between the border of the cell and the content of the cell.
      */
    cellPadding: string;
    /**
      * Sets or retrieves the amount of space between cells in a table.
      */
    cellSpacing: string;
    /**
      * Sets or retrieves the number of columns in the table.
      */
    cols: number;
    /**
      * Sets or retrieves the way the border frame around the table is displayed.
      */
    frame: string;
    /**
      * Sets or retrieves the height of the object.
      */
    height: any;
    /**
      * Sets or retrieves the number of horizontal rows contained in the object.
      */
    rows: HTMLCollectionOf<HTMLTableRowElement>;
    /**
      * Sets or retrieves which dividing lines (inner borders) are displayed.
      */
    rules: string;
    /**
      * Sets or retrieves a description and/or structure of the object.
      */
    summary: string;
    /**
      * Retrieves a collection of all tBody objects in the table. Objects in this collection are in source order.
      */
    tBodies: HTMLCollectionOf<HTMLTableSectionElement>;
    /**
      * Retrieves the tFoot object of the table.
      */
    tFoot: HTMLTableSectionElement;
    /**
      * Retrieves the tHead object of the table.
      */
    tHead: HTMLTableSectionElement;
    /**
      * Sets or retrieves the width of the object.
      */
    width: string;
    /**
      * Creates an empty caption element in the table.
      */
    createCaption(): HTMLTableCaptionElement;
    /**
      * Creates an empty tBody element in the table.
      */
    createTBody(): HTMLTableSectionElement;
    /**
      * Creates an empty tFoot element in the table.
      */
    createTFoot(): HTMLTableSectionElement;
    /**
      * Returns the tHead element object if successful, or null otherwise.
      */
    createTHead(): HTMLTableSectionElement;
    /**
      * Deletes the caption element and its contents from the table.
      */
    deleteCaption(): void;
    /**
      * Removes the specified row (tr) from the element and from the rows collection.
      * @param index Number that specifies the zero-based position in the rows collection of the row to remove.
      */
    deleteRow(index?: number): void;
    /**
      * Deletes the tFoot element and its contents from the table.
      */
    deleteTFoot(): void;
    /**
      * Deletes the tHead element and its contents from the table.
      */
    deleteTHead(): void;
    /**
      * Creates a new row (tr) in the table, and adds the row to the rows collection.
      * @param index Number that specifies where to insert the row in the rows collection. The default value is -1, which appends the new row to the end of the rows collection.
      */
    insertRow(index?: number): HTMLTableRowElement;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableElement: {
    prototype: HTMLTableElement;
    new(): HTMLTableElement;
}

interface HTMLTableHeaderCellElement extends HTMLTableCellElement {
    /**
      * Sets or retrieves the group of cells in a table to which the object's information applies.
      */
    scope: string;
}

declare var HTMLTableHeaderCellElement: {
    prototype: HTMLTableHeaderCellElement;
    new(): HTMLTableHeaderCellElement;
}

interface HTMLTableRowElement extends SafeHTMLElement, HTMLTableAlignment {
    /**
      * Sets or retrieves how the object is aligned with adjacent text.
      */
    align: string;
    bgColor: any;
    /**
      * Retrieves a collection of all cells in the table row.
      */
    cells: HTMLCollectionOf<HTMLTableDataCellElement | HTMLTableHeaderCellElement>;
    /**
      * Sets or retrieves the height of the object.
      */
    height: any;
    /**
      * Retrieves the position of the object in the rows collection for the table.
      */
    readonly rowIndex: number;
    /**
      * Retrieves the position of the object in the collection.
      */
    readonly sectionRowIndex: number;
    /**
      * Removes the specified cell from the table row, as well as from the cells collection.
      * @param index Number that specifies the zero-based position of the cell to remove from the table row.
      * If no value is provided, the last cell in the cells collection is deleted.
      */
    deleteCell(index?: number): void;
    /**
      * Creates a new cell in the table row, and adds the cell to the cells collection.
      * @param index Number that specifies where to insert the cell in the tr. The default value is -1, which appends the new cell to the end of the cells collection.
      */
    insertCell(index?: number): HTMLTableDataCellElement;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTableRowElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableRowElement: {
    prototype: HTMLTableRowElement;
    new(): HTMLTableRowElement;
}

interface HTMLTableSectionElement extends SafeHTMLElement, HTMLTableAlignment {
    innerText: never;
    /**
      * Sets or retrieves a value that indicates the table alignment.
      */
    align: string;
    /**
      * Sets or retrieves the number of horizontal rows contained in the object.
      */
    rows: HTMLCollectionOf<HTMLTableRowElement>;
    /**
      * Removes the specified row (tr) from the element and from the rows collection.
      * @param index Number that specifies the zero-based position in the rows collection of the row to remove.
      */
    deleteRow(index?: number): void;
    /**
      * Creates a new row (tr) in the table, and adds the row to the rows collection.
      * @param index Number that specifies where to insert the row in the rows collection. The default value is -1, which appends the new row to the end of the rows collection.
      */
    insertRow(index?: number): HTMLTableRowElement;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTableSectionElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTableSectionElement: {
    prototype: HTMLTableSectionElement;
    new(): HTMLTableSectionElement;
}

interface HTMLTemplateElement extends SafeHTMLElement {
    readonly content: DocumentFragment;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTemplateElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTemplateElement: {
    prototype: HTMLTemplateElement;
    new(): HTMLTemplateElement;
}

interface HTMLTextAreaElement extends SafeHTMLElement {
    readonly tagName: "TEXTAREA";
    readonly nodeName: "TEXTAREA";
    readonly localName: "textarea";
    readonly innerText: string;
    readonly parentElement: Element | null;
    readonly parentNode: Node | null;
    readonly labels: NodeListOf<HTMLLabelElement>;
    /**
      * Provides a way to direct a user to a specific field when a document loads.
      * This can provide both direction and convenience for a user, reducing the need to click or tab to a field when a page opens.
      * This attribute is true when present on an element, and false when missing.
      */
    autofocus: boolean;
    /**
      * Sets or retrieves the width of the object.
      */
    cols: number;
    /**
      * Sets or retrieves the initial contents of the object.
      */
    defaultValue: string;
    disabled: boolean;
    /**
      * Retrieves a reference to the form that the object is embedded in.
      */
    readonly form: HTMLFormElement;
    /**
      * Sets or retrieves the maximum number of characters that the user can enter in a text control.
      */
    maxLength: number;
    /**
      * Sets or retrieves the name of the object.
      */
    name: string;
    /**
      * Gets or sets a text string that is displayed in an input field as a hint or prompt to users as the format or type of information they need to enter.
      * The text appears in an input field until the user puts focus on the field.
      */
    placeholder: string;
    /**
      * Sets or retrieves the value indicated whether the content of the object is read-only.
      */
    readOnly: boolean;
    /**
      * When present, marks an element that can't be submitted without a value.
      */
    required: boolean;
    /**
      * Sets or retrieves the number of horizontal rows contained in the object.
      */
    rows: number;
    /**
      * Gets or sets the end position or offset of a text selection.
      */
    selectionEnd: number;
    /**
      * Gets or sets the starting position or offset of a text selection.
      */
    selectionStart: number;
    selectionDirection: "backward" | "forward" | "none";
    /**
      * Sets or retrieves the value indicating whether the control is selected.
      */
    status: any;
    /**
      * Retrieves the type of control.
      */
    readonly type: string;
    /**
      * Returns the error message that would be displayed if the user submits the form, or an empty string if no error message.
      * It also triggers the standard error message, such as "this is a required field".
      * The result is that the user sees validation messages without actually submitting.
      */
    readonly validationMessage: string;
    /**
      * Returns a  ValidityState object that represents the validity states of an element.
      */
    readonly validity: ValidityState;
    /**
      * Retrieves or sets the text in the entry field of the textArea element.
      */
    value: string;
    /**
      * Returns whether an element will successfully validate based on forms validation rules and constraints.
      */
    readonly willValidate: boolean;
    /**
      * Sets or retrieves how to handle wordwrapping in the object.
      */
    wrap: string;
    minLength: number;
    /**
      * Returns whether a form will validate when it is submitted, without having to submit it.
      */
    checkValidity(): boolean;
    /**
      * Highlights the input area of a form element.
      */
    select(): void;
    /**
      * Sets a custom error message that is displayed when a form is submitted.
      * @param error Sets a custom error message that is displayed when a form is submitted.
      */
    setCustomValidity(error: string): void;
    /**
      * Sets the start and end positions of a selection in a text field.
      * @param start The offset into the text field for the start of the selection.
      * @param end The offset into the text field for the end of the selection.
      */
    setSelectionRange(start: number, end: number, direction?: string): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTextAreaElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTextAreaElement: {
    prototype: HTMLTextAreaElement;
    new(): HTMLTextAreaElement;
}

interface HTMLTimeElement extends SafeHTMLElement {
    dateTime: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTimeElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTimeElement: {
    prototype: HTMLTimeElement;
    new(): HTMLTimeElement;
}

interface HTMLTitleElement extends SafeHTMLElement {
    /**
      * Retrieves or sets the text of the object as a string. 
      */
    text: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTitleElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTitleElement: {
    prototype: HTMLTitleElement;
    new(): HTMLTitleElement;
}

interface HTMLTrackElement extends SafeHTMLElement {
    default: boolean;
    kind: string;
    label: string;
    readonly readyState: number;
    src: string;
    srclang: string;
    readonly track: TextTrack;
    readonly ERROR: number;
    readonly LOADED: number;
    readonly LOADING: number;
    readonly NONE: number;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLTrackElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLTrackElement: {
    prototype: HTMLTrackElement;
    new(): HTMLTrackElement;
    readonly ERROR: number;
    readonly LOADED: number;
    readonly LOADING: number;
    readonly NONE: number;
}

interface HTMLUListElement extends SafeHTMLElement {
    compact: boolean;
    type: string;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLUListElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLUListElement: {
    prototype: HTMLUListElement;
    new(): HTMLUListElement;
}

interface HTMLUnknownElement extends SafeHTMLElement {
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLUnknownElement, ev: HTMLElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLUnknownElement: {
    prototype: HTMLUnknownElement;
    new(): HTMLUnknownElement;
}

interface HTMLVideoElement extends HTMLMediaElement {
    /**
      * Gets or sets the height of the video element.
      */
    height: number;
    onMSVideoFormatChanged: (this: HTMLVideoElement, ev: Event) => any;
    onMSVideoFrameStepCompleted: (this: HTMLVideoElement, ev: Event) => any;
    onMSVideoOptimalLayoutChanged: (this: HTMLVideoElement, ev: Event) => any;
    /**
      * Gets or sets a URL of an image to display, for example, like a movie poster. This can be a still frame from the video, or another image if no video data is available.
      */
    poster: string;
    /**
      * Gets the intrinsic height of a video in CSS pixels, or zero if the dimensions are not known.
      */
    readonly videoHeight: number;
    /**
      * Gets the intrinsic width of a video in CSS pixels, or zero if the dimensions are not known.
      */
    readonly videoWidth: number;
    readonly webkitDisplayingFullscreen: boolean;
    readonly webkitSupportsFullscreen: boolean;
    /**
      * Gets or sets the width of the video element.
      */
    width: number;
    getVideoPlaybackQuality(): VideoPlaybackQuality;
    webkitEnterFullScreen(): void;
    webkitEnterFullscreen(): void;
    webkitExitFullScreen(): void;
    webkitExitFullscreen(): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var HTMLVideoElement: {
    prototype: HTMLVideoElement;
    new(): HTMLVideoElement;
}

interface HashChangeEvent extends Event {
    readonly newURL: string | null;
    readonly oldURL: string | null;
}

declare var HashChangeEvent: {
    prototype: HashChangeEvent;
    new(typeArg: string, eventInitDict?: HashChangeEventInit): HashChangeEvent;
}

interface History {
    readonly length: number;
    readonly state: any;
    scrollRestoration?: ScrollRestoration;
    back(): void;
    forward(): void;
    go(delta?: number): void;
    pushState(data: any, title: string, url?: string | null): void;
    replaceState(data: any, title: string, url?: string | null): void;
}

declare var History: {
    prototype: History;
    new(): History;
}

interface ImageData {
    data: Uint8ClampedArray;
    readonly height: number;
    readonly width: number;
}

declare var ImageData: {
    prototype: ImageData;
    new(width: number, height: number): ImageData;
    new(array: Uint8ClampedArray, width: number, height: number): ImageData;
}

interface InputEvent extends UIEvent {
    readonly isComposing?: boolean;
    readonly inputType?: string; // not on Firefox
}

declare var InputEvent: {
    prototype: InputEvent;
    new(typeArg: string, init: EventInit & { inputType?: string, data?: string }): InputEvent;
} | undefined;

interface KeyboardEvent extends UIEvent {
    readonly altKey: boolean;
    readonly char: string | null;
    readonly charCode: number;
    readonly ctrlKey: boolean;
    readonly key?: string;
    readonly keyCode: kKeyCode;
    readonly keyIdentifier: unknown;
    readonly locale: string;
    readonly location: 0 | 1 | 2 | 3;
    readonly metaKey: boolean;
    readonly repeat: boolean;
    readonly shiftKey: boolean;
    readonly which: number;
    readonly code?: string;
    getModifierState(keyArg: string): boolean;
    initKeyboardEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , keyArg: string, locationArg: number, modifiersListArg: string, repeat: boolean, locale: string): void;
    readonly DOM_KEY_LOCATION_JOYSTICK: number;
    readonly DOM_KEY_LOCATION_LEFT: number;
    readonly DOM_KEY_LOCATION_MOBILE: number;
    readonly DOM_KEY_LOCATION_NUMPAD: number;
    readonly DOM_KEY_LOCATION_RIGHT: number;
    readonly DOM_KEY_LOCATION_STANDARD: number;
    readonly isComposing?: boolean;
}
interface OldKeyboardEvent extends KeyboardEvent {
    readonly keyIdentifier: string;
    readonly code: undefined;
    readonly key: undefined;
}

declare var KeyboardEvent: {
    prototype: KeyboardEvent;
    new(typeArg: string, eventInitDict?: KeyboardEventInit): KeyboardEvent;
    readonly DOM_KEY_LOCATION_JOYSTICK: number;
    readonly DOM_KEY_LOCATION_LEFT: number;
    readonly DOM_KEY_LOCATION_MOBILE: number;
    readonly DOM_KEY_LOCATION_NUMPAD: number;
    readonly DOM_KEY_LOCATION_RIGHT: number;
    readonly DOM_KEY_LOCATION_STANDARD: number;
}

interface ListeningStateChangedEvent extends Event {
    readonly label: string;
    readonly state: string;
}

declare var ListeningStateChangedEvent: {
    prototype: ListeningStateChangedEvent;
    new(): ListeningStateChangedEvent;
}

interface Location {
    hash: string;
    host: string;
    hostname: string;
    href: string;
    readonly origin: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
    assign(url: string): void;
    reload(forcedReload?: boolean): void;
    replace(url: string): void;
    toString(): string;
}

declare var Location: {
    prototype: Location;
    new(): Location;
}

interface LongRunningScriptDetectedEvent extends Event {
    readonly executionTime: number;
    stopPageScriptExecution: boolean;
}

declare var LongRunningScriptDetectedEvent: {
    prototype: LongRunningScriptDetectedEvent;
    new(): LongRunningScriptDetectedEvent;
}


interface MediaList {
    readonly length: number;
    mediaText: string;
    appendMedium(newMedium: string): void;
    deleteMedium(oldMedium: string): void;
    item(index: number): string;
    // toString(): string;
    [index: number]: string;
}

declare var MediaList: {
    prototype: MediaList;
    new(): MediaList;
}

interface MediaQueryList extends EventTarget {
    readonly matches: boolean;
    readonly media: string;
    onchange: null | MediaQueryListListener;
    // addListener(listener: MediaQueryListListener): void;
    // removeListener(listener: MediaQueryListListener): void;
}

declare var MediaQueryList: {
    prototype: MediaQueryList;
    new(): MediaQueryList;
}
interface MessageChannel {
    readonly port1: MessagePort;
    readonly port2: MessagePort;
}

declare var MessageChannel: {
    prototype: MessageChannel;
    new(): MessageChannel;
}

interface MessageEvent extends Event {
    readonly data: any;
    readonly origin: string;
    readonly ports: any;
    readonly source: Window;
    initMessageEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, dataArg: any, originArg: string, lastEventIdArg: string, sourceArg: Window): void;
}

declare var MessageEvent: {
    prototype: MessageEvent;
    new(type: string, eventInitDict?: MessageEventInit): MessageEvent;
}

interface MessagePortEventMap {
    "message": MessageEvent;
}

interface MessagePort extends EventTarget {
    onmessage: (this: MessagePort, ev: MessageEvent) => any;
    close(): void;
    postMessage(message?: any, transfer?: any[]): void;
    start(): void;
    addEventListener<K extends keyof MessagePortEventMap>(type: K, listener: (this: MessagePort, ev: MessagePortEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var MessagePort: {
    prototype: MessagePort;
    new(): MessagePort;
}

interface MimeType {
    readonly description: string;
    readonly enabledPlugin: Plugin;
    readonly suffixes: string;
    readonly type: string;
}

declare var MimeType: {
    prototype: MimeType;
    new(): MimeType;
}

interface MimeTypeArray {
    readonly length: number;
    item(index: number): Plugin;
    namedItem(type: string): Plugin;
    [index: number]: Plugin;
}

declare var MimeTypeArray: {
    prototype: MimeTypeArray;
    new(): MimeTypeArray;
}

interface MouseEvent extends UIEvent {
    readonly altKey: boolean;
    readonly button: number;
    readonly buttons: number;
    readonly clientX: number;
    readonly clientY: number;
    readonly ctrlKey: boolean;
    readonly fromElement: Element;
    readonly layerX: number;
    readonly layerY: number;
    readonly metaKey: boolean;
    readonly movementX: number;
    readonly movementY: number;
    readonly offsetX: number;
    readonly offsetY: number;
    readonly pageX: number;
    readonly pageY: number;
    readonly relatedTarget: EventTarget;
    readonly screenX: number;
    readonly screenY: number;
    readonly shiftKey: boolean;
    readonly toElement: Element;
    readonly which: number;
    readonly x: number;
    readonly y: number;
    getModifierState(keyArg: string): boolean;
    initMouseEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , detailArg: NonNullable<UIEventInit["detail"]>
        , screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number
        , ctrlKeyArg: boolean, altKeyArg: boolean, shiftKeyArg: boolean, metaKeyArg: boolean
        , buttonArg: NonNullable<MouseEventInit["button"]>, relatedTargetArg: EventTarget | null): void;
}

type OptionalMouseEventInitKeys = "sourceCapabilities" | keyof EventInit
type ValidMouseEventInit = WithoutUndef<MouseEventInit, Exclude<keyof MouseEventInit, OptionalMouseEventInitKeys>>
declare var MouseEvent: {
    prototype: MouseEvent;
    new(typeArg: string, eventInitDict?: ValidMouseEventInit): MouseEvent;
}

interface NamedNodeMap {
    readonly length: number;
    getNamedItem(name: string): Attr;
    getNamedItemNS(namespaceURI: string | null, localName: string | null): Attr;
    item(index: number): Attr;
    removeNamedItem(name: string): Attr;
    removeNamedItemNS(namespaceURI: string | null, localName: string | null): Attr;
    setNamedItem(arg: Attr): Attr;
    setNamedItemNS(arg: Attr): Attr;
    [index: number]: Attr;
}

declare var NamedNodeMap: {
    prototype: NamedNodeMap;
    new(): NamedNodeMap;
}

interface Navigator extends Object, NavigatorID, NavigatorOnLine, NavigatorContentUtils, NavigatorStorageUtils {
    readonly cookieEnabled: boolean;
    readonly language: unknown; // by intent
    readonly maxTouchPoints: number;
    readonly mimeTypes: MimeTypeArray;
    readonly plugins: PluginArray;
    readonly pointerEnabled: boolean;
    readonly webdriver: boolean;
    readonly hardwareConcurrency: number;
    readonly clipboard?: {
        readText?(): Promise<string>;
        writeText?(data: string): Promise<void>;
        write?(data: object[]): Promise<void>;
    };
    javaEnabled(): boolean;
    vibrate(pattern: number | number[]): boolean;
}
declare var ClipboardItem: {
  prototype: any;
  new(data: { [mime: string]: Blob }): any;
}

declare var Navigator: {
    prototype: Navigator;
    new(): Navigator;
}

declare const enum kNode {
    ELEMENT_NODE = 1,
    TEXT_NODE = 3,
    DOCUMENT_NODE = 9,
    DOCUMENT_FRAGMENT_NODE = 11,

    DOCUMENT_POSITION_PRECEDING = 2,
    DOCUMENT_POSITION_FOLLOWING = 4,
    DOCUMENT_POSITION_CONTAINS = 8,
    DOCUMENT_POSITION_CONTAINED_BY = 16,

    _mask = 0,
}

interface Node extends EventTarget {
    readonly attributes: NamedNodeMap;
    readonly baseURI: string | null;
    // Element: <form> -> `[name]` or `[id]`
    // HTMLCollection: on document / window
    // RadioNodeList: <form> -> `[name]`
    // Window: <frameset> -> `frame[name]` or window -> `frame[name], iframe[name]`
    readonly childNodes: NodeList | Element | HTMLCollection | RadioNodeList | Window;
    readonly firstChild: Node | null;
    readonly lastChild: Node | null;
    readonly namespaceURI: string | null;
    readonly nextSibling: Node | null;
    readonly nodeName: string | Element | HTMLCollection | RadioNodeList | Window;
    readonly nodeType: kNode | Element | HTMLCollection | RadioNodeList | Window;
    nodeValue: string | null;
    readonly ownerDocument: Document | HTMLCollection | RadioNodeList | Window;
    readonly parentElement: Element | HTMLCollection | RadioNodeList | Window | null;
    readonly parentNode: Node | HTMLCollection | RadioNodeList | Window | null;
    readonly previousSibling: Node | null;
    readonly isConnected?: boolean;
    textContent: string | null;
    appendChild<T extends Node>(newChild: T): void; // force it to be compatible with `.append`
    cloneNode(deep?: boolean): Node;
    compareDocumentPosition(other: Node): kNode;
    contains(this: Node, child: Node): boolean;
    getRootNode?(options?: { composed?: boolean }): Node;
    hasAttributes(): boolean;
    hasChildNodes(): boolean;
    insertBefore<T extends Node>(newChild: T, refChild: Node | null): T;
    isDefaultNamespace(namespaceURI: string | null): boolean;
    isEqualNode(arg: Node): boolean;
    isSameNode(other: Node): boolean;
    lookupNamespaceURI(prefix: string | null): string | null;
    lookupPrefix(namespaceURI: string | null): string | null;
    normalize(): void;
    removeChild(oldChild: Node): Node;
    replaceChild(newChild: Node, oldChild: Node): Node;
}

declare var Node: {
    prototype: Node;
    new(): Node;
}

interface NodeFilter {
    acceptNode(n: Node): number;
}

declare var NodeFilter: {
    readonly FILTER_ACCEPT: number;
    readonly FILTER_REJECT: number;
    readonly FILTER_SKIP: number;
    readonly SHOW_ALL: number;
    readonly SHOW_ATTRIBUTE: number;
    readonly SHOW_CDATA_SECTION: number;
    readonly SHOW_COMMENT: number;
    readonly SHOW_DOCUMENT: number;
    readonly SHOW_DOCUMENT_FRAGMENT: number;
    readonly SHOW_DOCUMENT_TYPE: number;
    readonly SHOW_ELEMENT: number;
    readonly SHOW_ENTITY: number;
    readonly SHOW_ENTITY_REFERENCE: number;
    readonly SHOW_NOTATION: number;
    readonly SHOW_PROCESSING_INSTRUCTION: number;
    readonly SHOW_TEXT: number;
}

interface NodeIterator {
    readonly expandEntityReferences: boolean;
    readonly filter: NodeFilter;
    readonly root: Node;
    readonly whatToShow: number;
    detach(): void;
    nextNode(): Node;
    previousNode(): Node;
}

declare var NodeIterator: {
    prototype: NodeIterator;
    new(): NodeIterator;
}

interface NodeList {
    readonly length: number;
    item(index: number): Node;
    [index: number]: Node;
}

interface RadioNodeList /* extends NodeList */ {
  readonly length: number;
  value: string;
  item(index: number): HTMLInputElement & { type: "radio" };
  [index: number]: HTMLInputElement & { type: "radio" };
  nodeType?: undefined;
}

declare var NodeList: {
    prototype: NodeList;
    new(): NodeList;
}

interface OverflowEvent extends UIEvent {
    readonly horizontalOverflow: boolean;
    readonly orient: number;
    readonly verticalOverflow: boolean;
    readonly BOTH: number;
    readonly HORIZONTAL: number;
    readonly VERTICAL: number;
}

declare var OverflowEvent: {
    prototype: OverflowEvent;
    new(): OverflowEvent;
    readonly BOTH: number;
    readonly HORIZONTAL: number;
    readonly VERTICAL: number;
}

interface PageTransitionEvent extends Event {
    readonly persisted: boolean;
}

declare var PageTransitionEvent: {
    prototype: PageTransitionEvent;
    new(): PageTransitionEvent;
}

interface Path2D extends Object, CanvasPathMethods {
}

interface Performance extends EventTarget {
    now(): number;
}

declare var Performance: {
    prototype: Performance;
    new(): Performance;
};
interface PermissionRequest extends DeferredPermissionRequest {
    readonly state: string;
    defer(): void;
}

declare var PermissionRequest: {
    prototype: PermissionRequest;
    new(): PermissionRequest;
}

interface PermissionRequestedEvent extends Event {
    readonly permissionRequest: PermissionRequest;
}

declare var PermissionRequestedEvent: {
    prototype: PermissionRequestedEvent;
    new(): PermissionRequestedEvent;
}

interface Plugin {
    readonly description: string;
    readonly filename: string;
    readonly length: number;
    readonly name: string;
    readonly version: string;
    item(index: number): MimeType;
    namedItem(type: string): MimeType;
    [index: number]: MimeType;
}

declare var Plugin: {
    prototype: Plugin;
    new(): Plugin;
}

interface PluginArray {
    readonly length: number;
    item(index: number): Plugin;
    namedItem(name: string): Plugin;
    refresh(reload?: boolean): void;
    [index: number]: Plugin;
}

declare var PluginArray: {
    prototype: PluginArray;
    new(): PluginArray;
}

interface PointerEvent extends MouseEvent {
    readonly currentPoint: any;
    readonly height: number;
    readonly hwTimestamp: number;
    readonly intermediatePoints: any;
    readonly isPrimary: boolean;
    readonly pointerId: number;
    readonly pointerType: any;
    readonly pressure: number;
    readonly rotation: number;
    readonly tiltX: number;
    readonly tiltY: number;
    readonly width: number;
    getCurrentPoint(element: Element): void;
    getIntermediatePoints(element: Element): void;
    initPointerEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , detailArg: number, screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number
        , ctrlKeyArg: boolean, altKeyArg: boolean, shiftKeyArg: boolean, metaKeyArg: boolean
        , buttonArg: number, relatedTargetArg: EventTarget, offsetXArg: number, offsetYArg: number
        , widthArg: number, heightArg: number, pressure: number, rotation: number, tiltX: number, tiltY: number
        , pointerIdArg: number, pointerType: any, hwTimestampArg: number, isPrimary: boolean): void;
}

declare var PointerEvent: {
    prototype: PointerEvent;
    new(typeArg: string, eventInitDict?: PointerEventInit): PointerEvent;
}

interface PopStateEvent extends Event {
    readonly state: any;
    initPopStateEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, stateArg: any): void;
}

declare var PopStateEvent: {
    prototype: PopStateEvent;
    new(): PopStateEvent;
}

interface Position {
    readonly coords: Coordinates;
    readonly timestamp: number;
}

declare var Position: {
    prototype: Position;
    new(): Position;
}

interface PositionError {
    readonly code: number;
    readonly message: string;
    toString(): string;
    readonly PERMISSION_DENIED: number;
    readonly POSITION_UNAVAILABLE: number;
    readonly TIMEOUT: number;
}

declare var PositionError: {
    prototype: PositionError;
    new(): PositionError;
    readonly PERMISSION_DENIED: number;
    readonly POSITION_UNAVAILABLE: number;
    readonly TIMEOUT: number;
}

interface ProcessingInstruction extends CharacterData {
    readonly target: string;
}

declare var ProcessingInstruction: {
    prototype: ProcessingInstruction;
    new(): ProcessingInstruction;
}

interface ProgressEvent extends Event {
    readonly lengthComputable: boolean;
    readonly loaded: number;
    readonly total: number;
    initProgressEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, lengthComputableArg: boolean, loadedArg: number, totalArg: number): void;
}

declare var ProgressEvent: {
    prototype: ProgressEvent;
    new(type: string, eventInitDict?: ProgressEventInit): ProgressEvent;
}

interface Range {
    readonly collapsed: boolean;
    readonly commonAncestorContainer: Node;
    readonly endContainer: Node;
    readonly endOffset: number;
    readonly startContainer: Node;
    readonly startOffset: number;
    cloneContents(): DocumentFragment;
    cloneRange(): Range;
    collapse(toStart: boolean): void;
    compareBoundaryPoints(how: number, sourceRange: Range): number;
    createContextualFragment(fragment: string): DocumentFragment;
    deleteContents(): void;
    detach(): void;
    expand(Unit: string): boolean;
    extractContents(): DocumentFragment;
    getBoundingClientRect(): ClientRect;
    getClientRects(): ClientRectList;
    insertNode(newNode: Node): void;
    selectNode(refNode: Node): void;
    selectNodeContents(refNode: Node): void;
    setEnd(refNode: Node, offset: number): void;
    setEndAfter(refNode: Node): void;
    setEndBefore(refNode: Node): void;
    setStart(refNode: Node, offset: number): void;
    setStartAfter(refNode: Node): void;
    setStartBefore(refNode: Node): void;
    surroundContents(newParent: Node): void;
    // toString(): string;
    readonly END_TO_END: number;
    readonly END_TO_START: number;
    readonly START_TO_END: number;
    readonly START_TO_START: number;
}

declare var Range: {
    prototype: Range;
    new(): Range;
    readonly END_TO_END: number;
    readonly END_TO_START: number;
    readonly START_TO_END: number;
    readonly START_TO_START: number;
}

interface SVGAElement extends SVGGraphicsElement, SVGURIReference {
    readonly target: SVGAnimatedString;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGAElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGAElement: {
    prototype: SVGAElement;
    new(): SVGAElement;
}

interface SVGAngle {
    readonly unitType: number;
    value: number;
    valueAsString: string;
    valueInSpecifiedUnits: number;
    convertToSpecifiedUnits(unitType: number): void;
    newValueSpecifiedUnits(unitType: number, valueInSpecifiedUnits: number): void;
    readonly SVG_ANGLETYPE_DEG: number;
    readonly SVG_ANGLETYPE_GRAD: number;
    readonly SVG_ANGLETYPE_RAD: number;
    readonly SVG_ANGLETYPE_UNKNOWN: number;
    readonly SVG_ANGLETYPE_UNSPECIFIED: number;
}

declare var SVGAngle: {
    prototype: SVGAngle;
    new(): SVGAngle;
    readonly SVG_ANGLETYPE_DEG: number;
    readonly SVG_ANGLETYPE_GRAD: number;
    readonly SVG_ANGLETYPE_RAD: number;
    readonly SVG_ANGLETYPE_UNKNOWN: number;
    readonly SVG_ANGLETYPE_UNSPECIFIED: number;
}

interface SVGAnimatedAngle {
    readonly animVal: SVGAngle;
    readonly baseVal: SVGAngle;
}

declare var SVGAnimatedAngle: {
    prototype: SVGAnimatedAngle;
    new(): SVGAnimatedAngle;
}

interface SVGAnimatedBoolean {
    readonly animVal: boolean;
    baseVal: boolean;
}

declare var SVGAnimatedBoolean: {
    prototype: SVGAnimatedBoolean;
    new(): SVGAnimatedBoolean;
}

interface SVGAnimatedEnumeration {
    readonly animVal: number;
    baseVal: number;
}

declare var SVGAnimatedEnumeration: {
    prototype: SVGAnimatedEnumeration;
    new(): SVGAnimatedEnumeration;
}

interface SVGAnimatedInteger {
    readonly animVal: number;
    baseVal: number;
}

declare var SVGAnimatedInteger: {
    prototype: SVGAnimatedInteger;
    new(): SVGAnimatedInteger;
}

interface SVGAnimatedLength {
    readonly animVal: SVGLength;
    readonly baseVal: SVGLength;
}

declare var SVGAnimatedLength: {
    prototype: SVGAnimatedLength;
    new(): SVGAnimatedLength;
}

interface SVGAnimatedLengthList {
    readonly animVal: SVGLengthList;
    readonly baseVal: SVGLengthList;
}

declare var SVGAnimatedLengthList: {
    prototype: SVGAnimatedLengthList;
    new(): SVGAnimatedLengthList;
}

interface SVGAnimatedNumber {
    readonly animVal: number;
    baseVal: number;
}

declare var SVGAnimatedNumber: {
    prototype: SVGAnimatedNumber;
    new(): SVGAnimatedNumber;
}

interface SVGAnimatedNumberList {
    readonly animVal: SVGNumberList;
    readonly baseVal: SVGNumberList;
}

declare var SVGAnimatedNumberList: {
    prototype: SVGAnimatedNumberList;
    new(): SVGAnimatedNumberList;
}

interface SVGAnimatedPreserveAspectRatio {
    readonly animVal: SVGPreserveAspectRatio;
    readonly baseVal: SVGPreserveAspectRatio;
}

declare var SVGAnimatedPreserveAspectRatio: {
    prototype: SVGAnimatedPreserveAspectRatio;
    new(): SVGAnimatedPreserveAspectRatio;
}

interface SVGAnimatedRect {
    readonly animVal: SVGRect;
    readonly baseVal: SVGRect;
}

declare var SVGAnimatedRect: {
    prototype: SVGAnimatedRect;
    new(): SVGAnimatedRect;
}

interface SVGAnimatedString {
    readonly animVal: string;
    baseVal: string;
}

declare var SVGAnimatedString: {
    prototype: SVGAnimatedString;
    new(): SVGAnimatedString;
}

interface SVGAnimatedTransformList {
    readonly animVal: SVGTransformList;
    readonly baseVal: SVGTransformList;
}

declare var SVGAnimatedTransformList: {
    prototype: SVGAnimatedTransformList;
    new(): SVGAnimatedTransformList;
}

interface SVGCircleElement extends SVGGraphicsElement {
    readonly cx: SVGAnimatedLength;
    readonly cy: SVGAnimatedLength;
    readonly r: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGCircleElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGCircleElement: {
    prototype: SVGCircleElement;
    new(): SVGCircleElement;
}

interface SVGClipPathElement extends SVGGraphicsElement, SVGUnitTypes {
    readonly clipPathUnits: SVGAnimatedEnumeration;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGClipPathElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGClipPathElement: {
    prototype: SVGClipPathElement;
    new(): SVGClipPathElement;
}

interface SVGComponentTransferFunctionElement extends SVGElement {
    readonly amplitude: SVGAnimatedNumber;
    readonly exponent: SVGAnimatedNumber;
    readonly intercept: SVGAnimatedNumber;
    readonly offset: SVGAnimatedNumber;
    readonly slope: SVGAnimatedNumber;
    readonly tableValues: SVGAnimatedNumberList;
    readonly type: SVGAnimatedEnumeration;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_DISCRETE: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_GAMMA: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_IDENTITY: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_LINEAR: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_TABLE: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(
        type: K, listener: (this: SVGComponentTransferFunctionElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGComponentTransferFunctionElement: {
    prototype: SVGComponentTransferFunctionElement;
    new(): SVGComponentTransferFunctionElement;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_DISCRETE: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_GAMMA: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_IDENTITY: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_LINEAR: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_TABLE: number;
    readonly SVG_FECOMPONENTTRANSFER_TYPE_UNKNOWN: number;
}

interface SVGDefsElement extends SVGGraphicsElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGDefsElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGDefsElement: {
    prototype: SVGDefsElement;
    new(): SVGDefsElement;
}

interface SVGDescElement extends SVGElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGDescElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGDescElement: {
    prototype: SVGDescElement;
    new(): SVGDescElement;
}

interface SVGElementEventMap extends ElementEventMap {
    "click": MouseEvent;
    "dblclick": MouseEvent;
    "focusin": FocusEvent;
    "focusout": FocusEvent;
    "load": Event;
    "mousedown": MouseEvent;
    "mousemove": MouseEvent;
    "mouseout": MouseEvent;
    "mouseover": MouseEvent;
    "mouseup": MouseEvent;
}

interface SVGElement extends Element {
    readonly tagName: string;
    readonly nodeName: string;
    readonly localName: string;
    readonly dataset? : DOMStringMap; // since C55
    className: any;
    focus(): void;
    blur(): void;
    onclick: (this: SVGElement, ev: MouseEvent) => any;
    ondblclick: (this: SVGElement, ev: MouseEvent) => any;
    onfocusin: (this: SVGElement, ev: FocusEvent) => any;
    onfocusout: (this: SVGElement, ev: FocusEvent) => any;
    onload: (this: SVGElement, ev: Event) => any;
    onmousedown: (this: SVGElement, ev: MouseEvent) => any;
    onmousemove: (this: SVGElement, ev: MouseEvent) => any;
    onmouseout: (this: SVGElement, ev: MouseEvent) => any;
    onmouseover: (this: SVGElement, ev: MouseEvent) => any;
    onmouseup: (this: SVGElement, ev: MouseEvent) => any;
    readonly ownerSVGElement: SVGSVGElement;
    readonly style: CSSStyleDeclaration;
    readonly viewportElement: SVGElement;
    xmlbase: string;
    /** on Chrome, it exists */
    tabIndex: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGElement: {
    prototype: SVGElement;
    new(): SVGElement;
}

interface SVGElementInstance extends EventTarget {
    readonly childNodes: SVGElementInstanceList;
    readonly correspondingElement: SVGElement;
    readonly correspondingUseElement: SVGUseElement;
    readonly firstChild: SVGElementInstance;
    readonly lastChild: SVGElementInstance;
    readonly nextSibling: SVGElementInstance;
    readonly parentNode: SVGElementInstance;
    readonly previousSibling: SVGElementInstance;
}

declare var SVGElementInstance: {
    prototype: SVGElementInstance;
    new(): SVGElementInstance;
}

interface SVGElementInstanceList {
    readonly length: number;
    item(index: number): SVGElementInstance;
}

declare var SVGElementInstanceList: {
    prototype: SVGElementInstanceList;
    new(): SVGElementInstanceList;
}

interface SVGEllipseElement extends SVGGraphicsElement {
    readonly cx: SVGAnimatedLength;
    readonly cy: SVGAnimatedLength;
    readonly rx: SVGAnimatedLength;
    readonly ry: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGEllipseElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGEllipseElement: {
    prototype: SVGEllipseElement;
    new(): SVGEllipseElement;
}

interface SVGFEBlendElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly in2: SVGAnimatedString;
    readonly mode: SVGAnimatedEnumeration;
    readonly SVG_FEBLEND_MODE_COLOR: number;
    readonly SVG_FEBLEND_MODE_COLOR_BURN: number;
    readonly SVG_FEBLEND_MODE_COLOR_DODGE: number;
    readonly SVG_FEBLEND_MODE_DARKEN: number;
    readonly SVG_FEBLEND_MODE_DIFFERENCE: number;
    readonly SVG_FEBLEND_MODE_EXCLUSION: number;
    readonly SVG_FEBLEND_MODE_HARD_LIGHT: number;
    readonly SVG_FEBLEND_MODE_HUE: number;
    readonly SVG_FEBLEND_MODE_LIGHTEN: number;
    readonly SVG_FEBLEND_MODE_LUMINOSITY: number;
    readonly SVG_FEBLEND_MODE_MULTIPLY: number;
    readonly SVG_FEBLEND_MODE_NORMAL: number;
    readonly SVG_FEBLEND_MODE_OVERLAY: number;
    readonly SVG_FEBLEND_MODE_SATURATION: number;
    readonly SVG_FEBLEND_MODE_SCREEN: number;
    readonly SVG_FEBLEND_MODE_SOFT_LIGHT: number;
    readonly SVG_FEBLEND_MODE_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEBlendElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEBlendElement: {
    prototype: SVGFEBlendElement;
    new(): SVGFEBlendElement;
    readonly SVG_FEBLEND_MODE_COLOR: number;
    readonly SVG_FEBLEND_MODE_COLOR_BURN: number;
    readonly SVG_FEBLEND_MODE_COLOR_DODGE: number;
    readonly SVG_FEBLEND_MODE_DARKEN: number;
    readonly SVG_FEBLEND_MODE_DIFFERENCE: number;
    readonly SVG_FEBLEND_MODE_EXCLUSION: number;
    readonly SVG_FEBLEND_MODE_HARD_LIGHT: number;
    readonly SVG_FEBLEND_MODE_HUE: number;
    readonly SVG_FEBLEND_MODE_LIGHTEN: number;
    readonly SVG_FEBLEND_MODE_LUMINOSITY: number;
    readonly SVG_FEBLEND_MODE_MULTIPLY: number;
    readonly SVG_FEBLEND_MODE_NORMAL: number;
    readonly SVG_FEBLEND_MODE_OVERLAY: number;
    readonly SVG_FEBLEND_MODE_SATURATION: number;
    readonly SVG_FEBLEND_MODE_SCREEN: number;
    readonly SVG_FEBLEND_MODE_SOFT_LIGHT: number;
    readonly SVG_FEBLEND_MODE_UNKNOWN: number;
}

interface SVGFEColorMatrixElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly type: SVGAnimatedEnumeration;
    readonly values: SVGAnimatedNumberList;
    readonly SVG_FECOLORMATRIX_TYPE_HUEROTATE: number;
    readonly SVG_FECOLORMATRIX_TYPE_LUMINANCETOALPHA: number;
    readonly SVG_FECOLORMATRIX_TYPE_MATRIX: number;
    readonly SVG_FECOLORMATRIX_TYPE_SATURATE: number;
    readonly SVG_FECOLORMATRIX_TYPE_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEColorMatrixElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEColorMatrixElement: {
    prototype: SVGFEColorMatrixElement;
    new(): SVGFEColorMatrixElement;
    readonly SVG_FECOLORMATRIX_TYPE_HUEROTATE: number;
    readonly SVG_FECOLORMATRIX_TYPE_LUMINANCETOALPHA: number;
    readonly SVG_FECOLORMATRIX_TYPE_MATRIX: number;
    readonly SVG_FECOLORMATRIX_TYPE_SATURATE: number;
    readonly SVG_FECOLORMATRIX_TYPE_UNKNOWN: number;
}

interface SVGFEComponentTransferElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEComponentTransferElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEComponentTransferElement: {
    prototype: SVGFEComponentTransferElement;
    new(): SVGFEComponentTransferElement;
}

interface SVGFECompositeElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly in2: SVGAnimatedString;
    readonly k1: SVGAnimatedNumber;
    readonly k2: SVGAnimatedNumber;
    readonly k3: SVGAnimatedNumber;
    readonly k4: SVGAnimatedNumber;
    readonly operator: SVGAnimatedEnumeration;
    readonly SVG_FECOMPOSITE_OPERATOR_ARITHMETIC: number;
    readonly SVG_FECOMPOSITE_OPERATOR_ATOP: number;
    readonly SVG_FECOMPOSITE_OPERATOR_IN: number;
    readonly SVG_FECOMPOSITE_OPERATOR_OUT: number;
    readonly SVG_FECOMPOSITE_OPERATOR_OVER: number;
    readonly SVG_FECOMPOSITE_OPERATOR_UNKNOWN: number;
    readonly SVG_FECOMPOSITE_OPERATOR_XOR: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFECompositeElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFECompositeElement: {
    prototype: SVGFECompositeElement;
    new(): SVGFECompositeElement;
    readonly SVG_FECOMPOSITE_OPERATOR_ARITHMETIC: number;
    readonly SVG_FECOMPOSITE_OPERATOR_ATOP: number;
    readonly SVG_FECOMPOSITE_OPERATOR_IN: number;
    readonly SVG_FECOMPOSITE_OPERATOR_OUT: number;
    readonly SVG_FECOMPOSITE_OPERATOR_OVER: number;
    readonly SVG_FECOMPOSITE_OPERATOR_UNKNOWN: number;
    readonly SVG_FECOMPOSITE_OPERATOR_XOR: number;
}

interface SVGFEConvolveMatrixElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly bias: SVGAnimatedNumber;
    readonly divisor: SVGAnimatedNumber;
    readonly edgeMode: SVGAnimatedEnumeration;
    readonly in1: SVGAnimatedString;
    readonly kernelMatrix: SVGAnimatedNumberList;
    readonly kernelUnitLengthX: SVGAnimatedNumber;
    readonly kernelUnitLengthY: SVGAnimatedNumber;
    readonly orderX: SVGAnimatedInteger;
    readonly orderY: SVGAnimatedInteger;
    readonly preserveAlpha: SVGAnimatedBoolean;
    readonly targetX: SVGAnimatedInteger;
    readonly targetY: SVGAnimatedInteger;
    readonly SVG_EDGEMODE_DUPLICATE: number;
    readonly SVG_EDGEMODE_NONE: number;
    readonly SVG_EDGEMODE_UNKNOWN: number;
    readonly SVG_EDGEMODE_WRAP: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEConvolveMatrixElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEConvolveMatrixElement: {
    prototype: SVGFEConvolveMatrixElement;
    new(): SVGFEConvolveMatrixElement;
    readonly SVG_EDGEMODE_DUPLICATE: number;
    readonly SVG_EDGEMODE_NONE: number;
    readonly SVG_EDGEMODE_UNKNOWN: number;
    readonly SVG_EDGEMODE_WRAP: number;
}

interface SVGFEDiffuseLightingElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly diffuseConstant: SVGAnimatedNumber;
    readonly in1: SVGAnimatedString;
    readonly kernelUnitLengthX: SVGAnimatedNumber;
    readonly kernelUnitLengthY: SVGAnimatedNumber;
    readonly surfaceScale: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEDiffuseLightingElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEDiffuseLightingElement: {
    prototype: SVGFEDiffuseLightingElement;
    new(): SVGFEDiffuseLightingElement;
}

interface SVGFEDisplacementMapElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly in2: SVGAnimatedString;
    readonly scale: SVGAnimatedNumber;
    readonly xChannelSelector: SVGAnimatedEnumeration;
    readonly yChannelSelector: SVGAnimatedEnumeration;
    readonly SVG_CHANNEL_A: number;
    readonly SVG_CHANNEL_B: number;
    readonly SVG_CHANNEL_G: number;
    readonly SVG_CHANNEL_R: number;
    readonly SVG_CHANNEL_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEDisplacementMapElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEDisplacementMapElement: {
    prototype: SVGFEDisplacementMapElement;
    new(): SVGFEDisplacementMapElement;
    readonly SVG_CHANNEL_A: number;
    readonly SVG_CHANNEL_B: number;
    readonly SVG_CHANNEL_G: number;
    readonly SVG_CHANNEL_R: number;
    readonly SVG_CHANNEL_UNKNOWN: number;
}

interface SVGFEDistantLightElement extends SVGElement {
    readonly azimuth: SVGAnimatedNumber;
    readonly elevation: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEDistantLightElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEDistantLightElement: {
    prototype: SVGFEDistantLightElement;
    new(): SVGFEDistantLightElement;
}

interface SVGFEFloodElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEFloodElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEFloodElement: {
    prototype: SVGFEFloodElement;
    new(): SVGFEFloodElement;
}

interface SVGFEFuncAElement extends SVGComponentTransferFunctionElement {
}

declare var SVGFEFuncAElement: {
    prototype: SVGFEFuncAElement;
    new(): SVGFEFuncAElement;
}

interface SVGFEFuncBElement extends SVGComponentTransferFunctionElement {
}

declare var SVGFEFuncBElement: {
    prototype: SVGFEFuncBElement;
    new(): SVGFEFuncBElement;
}

interface SVGFEFuncGElement extends SVGComponentTransferFunctionElement {
}

declare var SVGFEFuncGElement: {
    prototype: SVGFEFuncGElement;
    new(): SVGFEFuncGElement;
}

interface SVGFEFuncRElement extends SVGComponentTransferFunctionElement {
}

declare var SVGFEFuncRElement: {
    prototype: SVGFEFuncRElement;
    new(): SVGFEFuncRElement;
}

interface SVGFEGaussianBlurElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly stdDeviationX: SVGAnimatedNumber;
    readonly stdDeviationY: SVGAnimatedNumber;
    setStdDeviation(stdDeviationX: number, stdDeviationY: number): void;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEGaussianBlurElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEGaussianBlurElement: {
    prototype: SVGFEGaussianBlurElement;
    new(): SVGFEGaussianBlurElement;
}

interface SVGFEImageElement extends SVGElement, SVGFilterPrimitiveStandardAttributes, SVGURIReference {
    readonly preserveAspectRatio: SVGAnimatedPreserveAspectRatio;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEImageElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEImageElement: {
    prototype: SVGFEImageElement;
    new(): SVGFEImageElement;
}

interface SVGFEMergeElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEMergeElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEMergeElement: {
    prototype: SVGFEMergeElement;
    new(): SVGFEMergeElement;
}

interface SVGFEMergeNodeElement extends SVGElement {
    readonly in1: SVGAnimatedString;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEMergeNodeElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEMergeNodeElement: {
    prototype: SVGFEMergeNodeElement;
    new(): SVGFEMergeNodeElement;
}

interface SVGFEMorphologyElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly operator: SVGAnimatedEnumeration;
    readonly radiusX: SVGAnimatedNumber;
    readonly radiusY: SVGAnimatedNumber;
    readonly SVG_MORPHOLOGY_OPERATOR_DILATE: number;
    readonly SVG_MORPHOLOGY_OPERATOR_ERODE: number;
    readonly SVG_MORPHOLOGY_OPERATOR_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEMorphologyElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEMorphologyElement: {
    prototype: SVGFEMorphologyElement;
    new(): SVGFEMorphologyElement;
    readonly SVG_MORPHOLOGY_OPERATOR_DILATE: number;
    readonly SVG_MORPHOLOGY_OPERATOR_ERODE: number;
    readonly SVG_MORPHOLOGY_OPERATOR_UNKNOWN: number;
}

interface SVGFEOffsetElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly dx: SVGAnimatedNumber;
    readonly dy: SVGAnimatedNumber;
    readonly in1: SVGAnimatedString;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEOffsetElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEOffsetElement: {
    prototype: SVGFEOffsetElement;
    new(): SVGFEOffsetElement;
}

interface SVGFEPointLightElement extends SVGElement {
    readonly x: SVGAnimatedNumber;
    readonly y: SVGAnimatedNumber;
    readonly z: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFEPointLightElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFEPointLightElement: {
    prototype: SVGFEPointLightElement;
    new(): SVGFEPointLightElement;
}

interface SVGFESpecularLightingElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    readonly kernelUnitLengthX: SVGAnimatedNumber;
    readonly kernelUnitLengthY: SVGAnimatedNumber;
    readonly specularConstant: SVGAnimatedNumber;
    readonly specularExponent: SVGAnimatedNumber;
    readonly surfaceScale: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFESpecularLightingElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFESpecularLightingElement: {
    prototype: SVGFESpecularLightingElement;
    new(): SVGFESpecularLightingElement;
}

interface SVGFESpotLightElement extends SVGElement {
    readonly limitingConeAngle: SVGAnimatedNumber;
    readonly pointsAtX: SVGAnimatedNumber;
    readonly pointsAtY: SVGAnimatedNumber;
    readonly pointsAtZ: SVGAnimatedNumber;
    readonly specularExponent: SVGAnimatedNumber;
    readonly x: SVGAnimatedNumber;
    readonly y: SVGAnimatedNumber;
    readonly z: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFESpotLightElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFESpotLightElement: {
    prototype: SVGFESpotLightElement;
    new(): SVGFESpotLightElement;
}

interface SVGFETileElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly in1: SVGAnimatedString;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFETileElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFETileElement: {
    prototype: SVGFETileElement;
    new(): SVGFETileElement;
}

interface SVGFETurbulenceElement extends SVGElement, SVGFilterPrimitiveStandardAttributes {
    readonly baseFrequencyX: SVGAnimatedNumber;
    readonly baseFrequencyY: SVGAnimatedNumber;
    readonly numOctaves: SVGAnimatedInteger;
    readonly seed: SVGAnimatedNumber;
    readonly stitchTiles: SVGAnimatedEnumeration;
    readonly type: SVGAnimatedEnumeration;
    readonly SVG_STITCHTYPE_NOSTITCH: number;
    readonly SVG_STITCHTYPE_STITCH: number;
    readonly SVG_STITCHTYPE_UNKNOWN: number;
    readonly SVG_TURBULENCE_TYPE_FRACTALNOISE: number;
    readonly SVG_TURBULENCE_TYPE_TURBULENCE: number;
    readonly SVG_TURBULENCE_TYPE_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFETurbulenceElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFETurbulenceElement: {
    prototype: SVGFETurbulenceElement;
    new(): SVGFETurbulenceElement;
    readonly SVG_STITCHTYPE_NOSTITCH: number;
    readonly SVG_STITCHTYPE_STITCH: number;
    readonly SVG_STITCHTYPE_UNKNOWN: number;
    readonly SVG_TURBULENCE_TYPE_FRACTALNOISE: number;
    readonly SVG_TURBULENCE_TYPE_TURBULENCE: number;
    readonly SVG_TURBULENCE_TYPE_UNKNOWN: number;
}

interface SVGFilterElement extends SVGElement, SVGUnitTypes, SVGURIReference {
    readonly filterResX: SVGAnimatedInteger;
    readonly filterResY: SVGAnimatedInteger;
    readonly filterUnits: SVGAnimatedEnumeration;
    readonly height: SVGAnimatedLength;
    readonly primitiveUnits: SVGAnimatedEnumeration;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    setFilterRes(filterResX: number, filterResY: number): void;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGFilterElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGFilterElement: {
    prototype: SVGFilterElement;
    new(): SVGFilterElement;
}

interface SVGForeignObjectElement extends SVGGraphicsElement {
    readonly height: SVGAnimatedLength;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGForeignObjectElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGForeignObjectElement: {
    prototype: SVGForeignObjectElement;
    new(): SVGForeignObjectElement;
}

interface SVGGElement extends SVGGraphicsElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGGElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGGElement: {
    prototype: SVGGElement;
    new(): SVGGElement;
}

interface SVGGradientElement extends SVGElement, SVGUnitTypes, SVGURIReference {
    readonly gradientTransform: SVGAnimatedTransformList;
    readonly gradientUnits: SVGAnimatedEnumeration;
    readonly spreadMethod: SVGAnimatedEnumeration;
    readonly SVG_SPREADMETHOD_PAD: number;
    readonly SVG_SPREADMETHOD_REFLECT: number;
    readonly SVG_SPREADMETHOD_REPEAT: number;
    readonly SVG_SPREADMETHOD_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGGradientElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGGradientElement: {
    prototype: SVGGradientElement;
    new(): SVGGradientElement;
    readonly SVG_SPREADMETHOD_PAD: number;
    readonly SVG_SPREADMETHOD_REFLECT: number;
    readonly SVG_SPREADMETHOD_REPEAT: number;
    readonly SVG_SPREADMETHOD_UNKNOWN: number;
}

interface SVGGraphicsElement extends SVGElement, SVGTests {
    readonly farthestViewportElement: SVGElement;
    readonly nearestViewportElement: SVGElement;
    readonly transform: SVGAnimatedTransformList;
    getBBox(): SVGRect;
    getCTM(): SVGMatrix;
    getScreenCTM(): SVGMatrix;
    getTransformToElement(element: SVGElement): SVGMatrix;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGGraphicsElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGGraphicsElement: {
    prototype: SVGGraphicsElement;
    new(): SVGGraphicsElement;
}

interface SVGImageElement extends SVGGraphicsElement, SVGURIReference {
    readonly height: SVGAnimatedLength;
    readonly preserveAspectRatio: SVGAnimatedPreserveAspectRatio;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGImageElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGImageElement: {
    prototype: SVGImageElement;
    new(): SVGImageElement;
}

interface SVGLength {
    readonly unitType: number;
    value: number;
    valueAsString: string;
    valueInSpecifiedUnits: number;
    convertToSpecifiedUnits(unitType: number): void;
    newValueSpecifiedUnits(unitType: number, valueInSpecifiedUnits: number): void;
    readonly SVG_LENGTHTYPE_CM: number;
    readonly SVG_LENGTHTYPE_EMS: number;
    readonly SVG_LENGTHTYPE_EXS: number;
    readonly SVG_LENGTHTYPE_IN: number;
    readonly SVG_LENGTHTYPE_MM: number;
    readonly SVG_LENGTHTYPE_NUMBER: number;
    readonly SVG_LENGTHTYPE_PC: number;
    readonly SVG_LENGTHTYPE_PERCENTAGE: number;
    readonly SVG_LENGTHTYPE_PT: number;
    readonly SVG_LENGTHTYPE_PX: number;
    readonly SVG_LENGTHTYPE_UNKNOWN: number;
}

declare var SVGLength: {
    prototype: SVGLength;
    new(): SVGLength;
    readonly SVG_LENGTHTYPE_CM: number;
    readonly SVG_LENGTHTYPE_EMS: number;
    readonly SVG_LENGTHTYPE_EXS: number;
    readonly SVG_LENGTHTYPE_IN: number;
    readonly SVG_LENGTHTYPE_MM: number;
    readonly SVG_LENGTHTYPE_NUMBER: number;
    readonly SVG_LENGTHTYPE_PC: number;
    readonly SVG_LENGTHTYPE_PERCENTAGE: number;
    readonly SVG_LENGTHTYPE_PT: number;
    readonly SVG_LENGTHTYPE_PX: number;
    readonly SVG_LENGTHTYPE_UNKNOWN: number;
}

interface SVGLengthList {
    readonly numberOfItems: number;
    appendItem(newItem: SVGLength): SVGLength;
    clear(): void;
    getItem(index: number): SVGLength;
    initialize(newItem: SVGLength): SVGLength;
    insertItemBefore(newItem: SVGLength, index: number): SVGLength;
    removeItem(index: number): SVGLength;
    replaceItem(newItem: SVGLength, index: number): SVGLength;
}

declare var SVGLengthList: {
    prototype: SVGLengthList;
    new(): SVGLengthList;
}

interface SVGLineElement extends SVGGraphicsElement {
    readonly x1: SVGAnimatedLength;
    readonly x2: SVGAnimatedLength;
    readonly y1: SVGAnimatedLength;
    readonly y2: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGLineElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGLineElement: {
    prototype: SVGLineElement;
    new(): SVGLineElement;
}

interface SVGLinearGradientElement extends SVGGradientElement {
    readonly x1: SVGAnimatedLength;
    readonly x2: SVGAnimatedLength;
    readonly y1: SVGAnimatedLength;
    readonly y2: SVGAnimatedLength;
}

declare var SVGLinearGradientElement: {
    prototype: SVGLinearGradientElement;
    new(): SVGLinearGradientElement;
}

interface SVGMarkerElement extends SVGElement, SVGFitToViewBox {
    readonly markerHeight: SVGAnimatedLength;
    readonly markerUnits: SVGAnimatedEnumeration;
    readonly markerWidth: SVGAnimatedLength;
    readonly orientAngle: SVGAnimatedAngle;
    readonly orientType: SVGAnimatedEnumeration;
    readonly refX: SVGAnimatedLength;
    readonly refY: SVGAnimatedLength;
    setOrientToAngle(angle: SVGAngle): void;
    setOrientToAuto(): void;
    readonly SVG_MARKERUNITS_STROKEWIDTH: number;
    readonly SVG_MARKERUNITS_UNKNOWN: number;
    readonly SVG_MARKERUNITS_USERSPACEONUSE: number;
    readonly SVG_MARKER_ORIENT_ANGLE: number;
    readonly SVG_MARKER_ORIENT_AUTO: number;
    readonly SVG_MARKER_ORIENT_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGMarkerElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGMarkerElement: {
    prototype: SVGMarkerElement;
    new(): SVGMarkerElement;
    readonly SVG_MARKERUNITS_STROKEWIDTH: number;
    readonly SVG_MARKERUNITS_UNKNOWN: number;
    readonly SVG_MARKERUNITS_USERSPACEONUSE: number;
    readonly SVG_MARKER_ORIENT_ANGLE: number;
    readonly SVG_MARKER_ORIENT_AUTO: number;
    readonly SVG_MARKER_ORIENT_UNKNOWN: number;
}

interface SVGMaskElement extends SVGElement, SVGTests, SVGUnitTypes {
    readonly height: SVGAnimatedLength;
    readonly maskContentUnits: SVGAnimatedEnumeration;
    readonly maskUnits: SVGAnimatedEnumeration;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGMaskElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGMaskElement: {
    prototype: SVGMaskElement;
    new(): SVGMaskElement;
}

interface SVGMatrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    flipX(): SVGMatrix;
    flipY(): SVGMatrix;
    inverse(): SVGMatrix;
    multiply(secondMatrix: SVGMatrix): SVGMatrix;
    rotate(angle: number): SVGMatrix;
    rotateFromVector(x: number, y: number): SVGMatrix;
    scale(scaleFactor: number): SVGMatrix;
    scaleNonUniform(scaleFactorX: number, scaleFactorY: number): SVGMatrix;
    skewX(angle: number): SVGMatrix;
    skewY(angle: number): SVGMatrix;
    translate(x: number, y: number): SVGMatrix;
}

declare var SVGMatrix: {
    prototype: SVGMatrix;
    new(): SVGMatrix;
}

interface SVGMetadataElement extends SVGElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGMetadataElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGMetadataElement: {
    prototype: SVGMetadataElement;
    new(): SVGMetadataElement;
}

interface SVGNumber {
    value: number;
}

declare var SVGNumber: {
    prototype: SVGNumber;
    new(): SVGNumber;
}

interface SVGNumberList {
    readonly numberOfItems: number;
    appendItem(newItem: SVGNumber): SVGNumber;
    clear(): void;
    getItem(index: number): SVGNumber;
    initialize(newItem: SVGNumber): SVGNumber;
    insertItemBefore(newItem: SVGNumber, index: number): SVGNumber;
    removeItem(index: number): SVGNumber;
    replaceItem(newItem: SVGNumber, index: number): SVGNumber;
}

declare var SVGNumberList: {
    prototype: SVGNumberList;
    new(): SVGNumberList;
}

interface SVGPathElement extends SVGGraphicsElement {
    readonly pathSegList: SVGPathSegList;
    createSVGPathSegArcAbs(x: number, y: number, r1: number, r2: number, angle: number, largeArcFlag: boolean, sweepFlag: boolean): SVGPathSegArcAbs;
    createSVGPathSegArcRel(x: number, y: number, r1: number, r2: number, angle: number, largeArcFlag: boolean, sweepFlag: boolean): SVGPathSegArcRel;
    createSVGPathSegClosePath(): SVGPathSegClosePath;
    createSVGPathSegCurvetoCubicAbs(x: number, y: number, x1: number, y1: number, x2: number, y2: number): SVGPathSegCurvetoCubicAbs;
    createSVGPathSegCurvetoCubicRel(x: number, y: number, x1: number, y1: number, x2: number, y2: number): SVGPathSegCurvetoCubicRel;
    createSVGPathSegCurvetoCubicSmoothAbs(x: number, y: number, x2: number, y2: number): SVGPathSegCurvetoCubicSmoothAbs;
    createSVGPathSegCurvetoCubicSmoothRel(x: number, y: number, x2: number, y2: number): SVGPathSegCurvetoCubicSmoothRel;
    createSVGPathSegCurvetoQuadraticAbs(x: number, y: number, x1: number, y1: number): SVGPathSegCurvetoQuadraticAbs;
    createSVGPathSegCurvetoQuadraticRel(x: number, y: number, x1: number, y1: number): SVGPathSegCurvetoQuadraticRel;
    createSVGPathSegCurvetoQuadraticSmoothAbs(x: number, y: number): SVGPathSegCurvetoQuadraticSmoothAbs;
    createSVGPathSegCurvetoQuadraticSmoothRel(x: number, y: number): SVGPathSegCurvetoQuadraticSmoothRel;
    createSVGPathSegLinetoAbs(x: number, y: number): SVGPathSegLinetoAbs;
    createSVGPathSegLinetoHorizontalAbs(x: number): SVGPathSegLinetoHorizontalAbs;
    createSVGPathSegLinetoHorizontalRel(x: number): SVGPathSegLinetoHorizontalRel;
    createSVGPathSegLinetoRel(x: number, y: number): SVGPathSegLinetoRel;
    createSVGPathSegLinetoVerticalAbs(y: number): SVGPathSegLinetoVerticalAbs;
    createSVGPathSegLinetoVerticalRel(y: number): SVGPathSegLinetoVerticalRel;
    createSVGPathSegMovetoAbs(x: number, y: number): SVGPathSegMovetoAbs;
    createSVGPathSegMovetoRel(x: number, y: number): SVGPathSegMovetoRel;
    getPathSegAtLength(distance: number): number;
    getPointAtLength(distance: number): SVGPoint;
    getTotalLength(): number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGPathElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGPathElement: {
    prototype: SVGPathElement;
    new(): SVGPathElement;
}

interface SVGPathSeg {
    readonly pathSegType: number;
    readonly pathSegTypeAsLetter: string;
    readonly PATHSEG_ARC_ABS: number;
    readonly PATHSEG_ARC_REL: number;
    readonly PATHSEG_CLOSEPATH: number;
    readonly PATHSEG_CURVETO_CUBIC_ABS: number;
    readonly PATHSEG_CURVETO_CUBIC_REL: number;
    readonly PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: number;
    readonly PATHSEG_CURVETO_CUBIC_SMOOTH_REL: number;
    readonly PATHSEG_CURVETO_QUADRATIC_ABS: number;
    readonly PATHSEG_CURVETO_QUADRATIC_REL: number;
    readonly PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: number;
    readonly PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL: number;
    readonly PATHSEG_LINETO_ABS: number;
    readonly PATHSEG_LINETO_HORIZONTAL_ABS: number;
    readonly PATHSEG_LINETO_HORIZONTAL_REL: number;
    readonly PATHSEG_LINETO_REL: number;
    readonly PATHSEG_LINETO_VERTICAL_ABS: number;
    readonly PATHSEG_LINETO_VERTICAL_REL: number;
    readonly PATHSEG_MOVETO_ABS: number;
    readonly PATHSEG_MOVETO_REL: number;
    readonly PATHSEG_UNKNOWN: number;
}

declare var SVGPathSeg: {
    prototype: SVGPathSeg;
    new(): SVGPathSeg;
    readonly PATHSEG_ARC_ABS: number;
    readonly PATHSEG_ARC_REL: number;
    readonly PATHSEG_CLOSEPATH: number;
    readonly PATHSEG_CURVETO_CUBIC_ABS: number;
    readonly PATHSEG_CURVETO_CUBIC_REL: number;
    readonly PATHSEG_CURVETO_CUBIC_SMOOTH_ABS: number;
    readonly PATHSEG_CURVETO_CUBIC_SMOOTH_REL: number;
    readonly PATHSEG_CURVETO_QUADRATIC_ABS: number;
    readonly PATHSEG_CURVETO_QUADRATIC_REL: number;
    readonly PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS: number;
    readonly PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL: number;
    readonly PATHSEG_LINETO_ABS: number;
    readonly PATHSEG_LINETO_HORIZONTAL_ABS: number;
    readonly PATHSEG_LINETO_HORIZONTAL_REL: number;
    readonly PATHSEG_LINETO_REL: number;
    readonly PATHSEG_LINETO_VERTICAL_ABS: number;
    readonly PATHSEG_LINETO_VERTICAL_REL: number;
    readonly PATHSEG_MOVETO_ABS: number;
    readonly PATHSEG_MOVETO_REL: number;
    readonly PATHSEG_UNKNOWN: number;
}

interface SVGPathSegArcAbs extends SVGPathSeg {
    angle: number;
    largeArcFlag: boolean;
    r1: number;
    r2: number;
    sweepFlag: boolean;
    x: number;
    y: number;
}

declare var SVGPathSegArcAbs: {
    prototype: SVGPathSegArcAbs;
    new(): SVGPathSegArcAbs;
}

interface SVGPathSegArcRel extends SVGPathSeg {
    angle: number;
    largeArcFlag: boolean;
    r1: number;
    r2: number;
    sweepFlag: boolean;
    x: number;
    y: number;
}

declare var SVGPathSegArcRel: {
    prototype: SVGPathSegArcRel;
    new(): SVGPathSegArcRel;
}

interface SVGPathSegClosePath extends SVGPathSeg {
}

declare var SVGPathSegClosePath: {
    prototype: SVGPathSegClosePath;
    new(): SVGPathSegClosePath;
}

interface SVGPathSegCurvetoCubicAbs extends SVGPathSeg {
    x: number;
    x1: number;
    x2: number;
    y: number;
    y1: number;
    y2: number;
}

declare var SVGPathSegCurvetoCubicAbs: {
    prototype: SVGPathSegCurvetoCubicAbs;
    new(): SVGPathSegCurvetoCubicAbs;
}

interface SVGPathSegCurvetoCubicRel extends SVGPathSeg {
    x: number;
    x1: number;
    x2: number;
    y: number;
    y1: number;
    y2: number;
}

declare var SVGPathSegCurvetoCubicRel: {
    prototype: SVGPathSegCurvetoCubicRel;
    new(): SVGPathSegCurvetoCubicRel;
}

interface SVGPathSegCurvetoCubicSmoothAbs extends SVGPathSeg {
    x: number;
    x2: number;
    y: number;
    y2: number;
}

declare var SVGPathSegCurvetoCubicSmoothAbs: {
    prototype: SVGPathSegCurvetoCubicSmoothAbs;
    new(): SVGPathSegCurvetoCubicSmoothAbs;
}

interface SVGPathSegCurvetoCubicSmoothRel extends SVGPathSeg {
    x: number;
    x2: number;
    y: number;
    y2: number;
}

declare var SVGPathSegCurvetoCubicSmoothRel: {
    prototype: SVGPathSegCurvetoCubicSmoothRel;
    new(): SVGPathSegCurvetoCubicSmoothRel;
}

interface SVGPathSegCurvetoQuadraticAbs extends SVGPathSeg {
    x: number;
    x1: number;
    y: number;
    y1: number;
}

declare var SVGPathSegCurvetoQuadraticAbs: {
    prototype: SVGPathSegCurvetoQuadraticAbs;
    new(): SVGPathSegCurvetoQuadraticAbs;
}

interface SVGPathSegCurvetoQuadraticRel extends SVGPathSeg {
    x: number;
    x1: number;
    y: number;
    y1: number;
}

declare var SVGPathSegCurvetoQuadraticRel: {
    prototype: SVGPathSegCurvetoQuadraticRel;
    new(): SVGPathSegCurvetoQuadraticRel;
}

interface SVGPathSegCurvetoQuadraticSmoothAbs extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegCurvetoQuadraticSmoothAbs: {
    prototype: SVGPathSegCurvetoQuadraticSmoothAbs;
    new(): SVGPathSegCurvetoQuadraticSmoothAbs;
}

interface SVGPathSegCurvetoQuadraticSmoothRel extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegCurvetoQuadraticSmoothRel: {
    prototype: SVGPathSegCurvetoQuadraticSmoothRel;
    new(): SVGPathSegCurvetoQuadraticSmoothRel;
}

interface SVGPathSegLinetoAbs extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegLinetoAbs: {
    prototype: SVGPathSegLinetoAbs;
    new(): SVGPathSegLinetoAbs;
}

interface SVGPathSegLinetoHorizontalAbs extends SVGPathSeg {
    x: number;
}

declare var SVGPathSegLinetoHorizontalAbs: {
    prototype: SVGPathSegLinetoHorizontalAbs;
    new(): SVGPathSegLinetoHorizontalAbs;
}

interface SVGPathSegLinetoHorizontalRel extends SVGPathSeg {
    x: number;
}

declare var SVGPathSegLinetoHorizontalRel: {
    prototype: SVGPathSegLinetoHorizontalRel;
    new(): SVGPathSegLinetoHorizontalRel;
}

interface SVGPathSegLinetoRel extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegLinetoRel: {
    prototype: SVGPathSegLinetoRel;
    new(): SVGPathSegLinetoRel;
}

interface SVGPathSegLinetoVerticalAbs extends SVGPathSeg {
    y: number;
}

declare var SVGPathSegLinetoVerticalAbs: {
    prototype: SVGPathSegLinetoVerticalAbs;
    new(): SVGPathSegLinetoVerticalAbs;
}

interface SVGPathSegLinetoVerticalRel extends SVGPathSeg {
    y: number;
}

declare var SVGPathSegLinetoVerticalRel: {
    prototype: SVGPathSegLinetoVerticalRel;
    new(): SVGPathSegLinetoVerticalRel;
}

interface SVGPathSegList {
    readonly numberOfItems: number;
    appendItem(newItem: SVGPathSeg): SVGPathSeg;
    clear(): void;
    getItem(index: number): SVGPathSeg;
    initialize(newItem: SVGPathSeg): SVGPathSeg;
    insertItemBefore(newItem: SVGPathSeg, index: number): SVGPathSeg;
    removeItem(index: number): SVGPathSeg;
    replaceItem(newItem: SVGPathSeg, index: number): SVGPathSeg;
}

declare var SVGPathSegList: {
    prototype: SVGPathSegList;
    new(): SVGPathSegList;
}

interface SVGPathSegMovetoAbs extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegMovetoAbs: {
    prototype: SVGPathSegMovetoAbs;
    new(): SVGPathSegMovetoAbs;
}

interface SVGPathSegMovetoRel extends SVGPathSeg {
    x: number;
    y: number;
}

declare var SVGPathSegMovetoRel: {
    prototype: SVGPathSegMovetoRel;
    new(): SVGPathSegMovetoRel;
}

interface SVGPatternElement extends SVGElement, SVGTests, SVGUnitTypes, SVGFitToViewBox, SVGURIReference {
    readonly height: SVGAnimatedLength;
    readonly patternContentUnits: SVGAnimatedEnumeration;
    readonly patternTransform: SVGAnimatedTransformList;
    readonly patternUnits: SVGAnimatedEnumeration;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGPatternElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGPatternElement: {
    prototype: SVGPatternElement;
    new(): SVGPatternElement;
}

interface SVGPoint {
    x: number;
    y: number;
    matrixTransform(matrix: SVGMatrix): SVGPoint;
}

declare var SVGPoint: {
    prototype: SVGPoint;
    new(): SVGPoint;
}

interface SVGPointList {
    readonly numberOfItems: number;
    appendItem(newItem: SVGPoint): SVGPoint;
    clear(): void;
    getItem(index: number): SVGPoint;
    initialize(newItem: SVGPoint): SVGPoint;
    insertItemBefore(newItem: SVGPoint, index: number): SVGPoint;
    removeItem(index: number): SVGPoint;
    replaceItem(newItem: SVGPoint, index: number): SVGPoint;
}

declare var SVGPointList: {
    prototype: SVGPointList;
    new(): SVGPointList;
}

interface SVGPolygonElement extends SVGGraphicsElement, SVGAnimatedPoints {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGPolygonElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGPolygonElement: {
    prototype: SVGPolygonElement;
    new(): SVGPolygonElement;
}

interface SVGPolylineElement extends SVGGraphicsElement, SVGAnimatedPoints {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGPolylineElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGPolylineElement: {
    prototype: SVGPolylineElement;
    new(): SVGPolylineElement;
}

interface SVGPreserveAspectRatio {
    align: number;
    meetOrSlice: number;
    readonly SVG_MEETORSLICE_MEET: number;
    readonly SVG_MEETORSLICE_SLICE: number;
    readonly SVG_MEETORSLICE_UNKNOWN: number;
    readonly SVG_PRESERVEASPECTRATIO_NONE: number;
    readonly SVG_PRESERVEASPECTRATIO_UNKNOWN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMIN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMIN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMIN: number;
}

declare var SVGPreserveAspectRatio: {
    prototype: SVGPreserveAspectRatio;
    new(): SVGPreserveAspectRatio;
    readonly SVG_MEETORSLICE_MEET: number;
    readonly SVG_MEETORSLICE_SLICE: number;
    readonly SVG_MEETORSLICE_UNKNOWN: number;
    readonly SVG_PRESERVEASPECTRATIO_NONE: number;
    readonly SVG_PRESERVEASPECTRATIO_UNKNOWN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMAXYMIN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMIDYMIN: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMAX: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMID: number;
    readonly SVG_PRESERVEASPECTRATIO_XMINYMIN: number;
}

interface SVGRadialGradientElement extends SVGGradientElement {
    readonly cx: SVGAnimatedLength;
    readonly cy: SVGAnimatedLength;
    readonly fx: SVGAnimatedLength;
    readonly fy: SVGAnimatedLength;
    readonly r: SVGAnimatedLength;
}

declare var SVGRadialGradientElement: {
    prototype: SVGRadialGradientElement;
    new(): SVGRadialGradientElement;
}

interface SVGRect {
    height: number;
    width: number;
    x: number;
    y: number;
}

declare var SVGRect: {
    prototype: SVGRect;
    new(): SVGRect;
}

interface SVGRectElement extends SVGGraphicsElement {
    readonly height: SVGAnimatedLength;
    readonly rx: SVGAnimatedLength;
    readonly ry: SVGAnimatedLength;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGRectElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGRectElement: {
    prototype: SVGRectElement;
    new(): SVGRectElement;
}

interface SVGSVGElementEventMap extends SVGElementEventMap {
    "SVGAbort": Event;
    "SVGError": Event;
    "resize": UIEvent;
    "scroll": UIEvent;
    "SVGUnload": Event;
    "SVGZoom": SVGZoomEvent;
}

type __SVGIntersectElements1 = SVGCircleElement | SVGEllipseElement | SVGImageElement | SVGLineElement | SVGPathElement
type __SVGIntersectElements2 = SVGPolygonElement | SVGPolylineElement | SVGRectElement | SVGTextElement | SVGUseElement;
type __SVGIntersectElements = __SVGIntersectElements1 | __SVGIntersectElements2;

interface SVGSVGElement extends SVGGraphicsElement, DocumentEvent, SVGFitToViewBox, SVGZoomAndPan {
    readonly tagName: "SVG";
    readonly nodeName: "SVG";
    readonly localName: "svg";
    contentScriptType: string;
    contentStyleType: string;
    currentScale: number;
    readonly currentTranslate: SVGPoint;
    readonly height: SVGAnimatedLength;
    onabort: (this: SVGSVGElement, ev: Event) => any;
    onerror: (this: SVGSVGElement, ev: Event) => any;
    onresize: (this: SVGSVGElement, ev: UIEvent) => any;
    onscroll: (this: SVGSVGElement, ev: UIEvent) => any;
    onunload: (this: SVGSVGElement, ev: Event) => any;
    onzoom: (this: SVGSVGElement, ev: SVGZoomEvent) => any;
    readonly pixelUnitToMillimeterX: number;
    readonly pixelUnitToMillimeterY: number;
    readonly screenPixelToMillimeterX: number;
    readonly screenPixelToMillimeterY: number;
    readonly viewport: SVGRect;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    checkEnclosure(element: SVGElement, rect: SVGRect): boolean;
    checkIntersection(element: SVGElement, rect: SVGRect): boolean;
    createSVGAngle(): SVGAngle;
    createSVGLength(): SVGLength;
    createSVGMatrix(): SVGMatrix;
    createSVGNumber(): SVGNumber;
    createSVGPoint(): SVGPoint;
    createSVGRect(): SVGRect;
    createSVGTransform(): SVGTransform;
    createSVGTransformFromMatrix(matrix: SVGMatrix): SVGTransform;
    deselectAll(): void;
    forceRedraw(): void;
    getComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;
    getCurrentTime(): number;
    getElementById(elementId: string): Element;
    getEnclosureList(rect: SVGRect, referenceElement: SVGElement): NodeListOf<__SVGIntersectElements>;
    getIntersectionList(rect: SVGRect, referenceElement: SVGElement): NodeListOf<__SVGIntersectElements>;
    pauseAnimations(): void;
    setCurrentTime(seconds: number): void;
    suspendRedraw(maxWaitMilliseconds: number): number;
    unpauseAnimations(): void;
    unsuspendRedraw(suspendHandleID: number): void;
    unsuspendRedrawAll(): void;
    addEventListener<K extends keyof SVGSVGElementEventMap>(type: K, listener: (this: SVGSVGElement, ev: SVGSVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGSVGElement: {
    prototype: SVGSVGElement;
    new(): SVGSVGElement;
}

interface SVGScriptElement extends SVGElement, SVGURIReference {
    type: string;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGScriptElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGScriptElement: {
    prototype: SVGScriptElement;
    new(): SVGScriptElement;
}

interface SVGStopElement extends SVGElement {
    readonly offset: SVGAnimatedNumber;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGStopElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGStopElement: {
    prototype: SVGStopElement;
    new(): SVGStopElement;
}

interface SVGStringList {
    readonly numberOfItems: number;
    appendItem(newItem: string): string;
    clear(): void;
    getItem(index: number): string;
    initialize(newItem: string): string;
    insertItemBefore(newItem: string, index: number): string;
    removeItem(index: number): string;
    replaceItem(newItem: string, index: number): string;
}

declare var SVGStringList: {
    prototype: SVGStringList;
    new(): SVGStringList;
}

interface SVGStyleElement extends SVGElement {
    disabled: boolean;
    media: string;
    title: string;
    type: string;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGStyleElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGStyleElement: {
    prototype: SVGStyleElement;
    new(): SVGStyleElement;
}

interface SVGSwitchElement extends SVGGraphicsElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGSwitchElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGSwitchElement: {
    prototype: SVGSwitchElement;
    new(): SVGSwitchElement;
}

interface SVGSymbolElement extends SVGElement, SVGFitToViewBox {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGSymbolElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGSymbolElement: {
    prototype: SVGSymbolElement;
    new(): SVGSymbolElement;
}

interface SVGTSpanElement extends SVGTextPositioningElement {
}

declare var SVGTSpanElement: {
    prototype: SVGTSpanElement;
    new(): SVGTSpanElement;
}

interface SVGTextContentElement extends SVGGraphicsElement {
    readonly lengthAdjust: SVGAnimatedEnumeration;
    readonly textLength: SVGAnimatedLength;
    getCharNumAtPosition(point: SVGPoint): number;
    getComputedTextLength(): number;
    getEndPositionOfChar(charnum: number): SVGPoint;
    getExtentOfChar(charnum: number): SVGRect;
    getNumberOfChars(): number;
    getRotationOfChar(charnum: number): number;
    getStartPositionOfChar(charnum: number): SVGPoint;
    getSubStringLength(charnum: number, nchars: number): number;
    selectSubString(charnum: number, nchars: number): void;
    readonly LENGTHADJUST_SPACING: number;
    readonly LENGTHADJUST_SPACINGANDGLYPHS: number;
    readonly LENGTHADJUST_UNKNOWN: number;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGTextContentElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGTextContentElement: {
    prototype: SVGTextContentElement;
    new(): SVGTextContentElement;
    readonly LENGTHADJUST_SPACING: number;
    readonly LENGTHADJUST_SPACINGANDGLYPHS: number;
    readonly LENGTHADJUST_UNKNOWN: number;
}

interface SVGTextElement extends SVGTextPositioningElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGTextElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGTextElement: {
    prototype: SVGTextElement;
    new(): SVGTextElement;
}

interface SVGTextPathElement extends SVGTextContentElement, SVGURIReference {
    readonly method: SVGAnimatedEnumeration;
    readonly spacing: SVGAnimatedEnumeration;
    readonly startOffset: SVGAnimatedLength;
    readonly TEXTPATH_METHODTYPE_ALIGN: number;
    readonly TEXTPATH_METHODTYPE_STRETCH: number;
    readonly TEXTPATH_METHODTYPE_UNKNOWN: number;
    readonly TEXTPATH_SPACINGTYPE_AUTO: number;
    readonly TEXTPATH_SPACINGTYPE_EXACT: number;
    readonly TEXTPATH_SPACINGTYPE_UNKNOWN: number;
}

declare var SVGTextPathElement: {
    prototype: SVGTextPathElement;
    new(): SVGTextPathElement;
    readonly TEXTPATH_METHODTYPE_ALIGN: number;
    readonly TEXTPATH_METHODTYPE_STRETCH: number;
    readonly TEXTPATH_METHODTYPE_UNKNOWN: number;
    readonly TEXTPATH_SPACINGTYPE_AUTO: number;
    readonly TEXTPATH_SPACINGTYPE_EXACT: number;
    readonly TEXTPATH_SPACINGTYPE_UNKNOWN: number;
}

interface SVGTextPositioningElement extends SVGTextContentElement {
    readonly dx: SVGAnimatedLengthList;
    readonly dy: SVGAnimatedLengthList;
    readonly rotate: SVGAnimatedNumberList;
    readonly x: SVGAnimatedLengthList;
    readonly y: SVGAnimatedLengthList;
}

declare var SVGTextPositioningElement: {
    prototype: SVGTextPositioningElement;
    new(): SVGTextPositioningElement;
}

interface SVGTitleElement extends SVGElement {
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGTitleElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGTitleElement: {
    prototype: SVGTitleElement;
    new(): SVGTitleElement;
}

interface SVGTransform {
    readonly angle: number;
    readonly matrix: SVGMatrix;
    readonly type: number;
    setMatrix(matrix: SVGMatrix): void;
    setRotate(angle: number, cx: number, cy: number): void;
    setScale(sx: number, sy: number): void;
    setSkewX(angle: number): void;
    setSkewY(angle: number): void;
    setTranslate(tx: number, ty: number): void;
    readonly SVG_TRANSFORM_MATRIX: number;
    readonly SVG_TRANSFORM_ROTATE: number;
    readonly SVG_TRANSFORM_SCALE: number;
    readonly SVG_TRANSFORM_SKEWX: number;
    readonly SVG_TRANSFORM_SKEWY: number;
    readonly SVG_TRANSFORM_TRANSLATE: number;
    readonly SVG_TRANSFORM_UNKNOWN: number;
}

declare var SVGTransform: {
    prototype: SVGTransform;
    new(): SVGTransform;
    readonly SVG_TRANSFORM_MATRIX: number;
    readonly SVG_TRANSFORM_ROTATE: number;
    readonly SVG_TRANSFORM_SCALE: number;
    readonly SVG_TRANSFORM_SKEWX: number;
    readonly SVG_TRANSFORM_SKEWY: number;
    readonly SVG_TRANSFORM_TRANSLATE: number;
    readonly SVG_TRANSFORM_UNKNOWN: number;
}

interface SVGTransformList {
    readonly numberOfItems: number;
    appendItem(newItem: SVGTransform): SVGTransform;
    clear(): void;
    consolidate(): SVGTransform;
    createSVGTransformFromMatrix(matrix: SVGMatrix): SVGTransform;
    getItem(index: number): SVGTransform;
    initialize(newItem: SVGTransform): SVGTransform;
    insertItemBefore(newItem: SVGTransform, index: number): SVGTransform;
    removeItem(index: number): SVGTransform;
    replaceItem(newItem: SVGTransform, index: number): SVGTransform;
}

declare var SVGTransformList: {
    prototype: SVGTransformList;
    new(): SVGTransformList;
}

interface SVGUnitTypes {
    readonly SVG_UNIT_TYPE_OBJECTBOUNDINGBOX: number;
    readonly SVG_UNIT_TYPE_UNKNOWN: number;
    readonly SVG_UNIT_TYPE_USERSPACEONUSE: number;
}
declare var SVGUnitTypes: SVGUnitTypes;

interface SVGUseElement extends SVGGraphicsElement, SVGURIReference {
    readonly animatedInstanceRoot: SVGElementInstance;
    readonly height: SVGAnimatedLength;
    readonly instanceRoot: SVGElementInstance;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGUseElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGUseElement: {
    prototype: SVGUseElement;
    new(): SVGUseElement;
}

interface SVGViewElement extends SVGElement, SVGZoomAndPan, SVGFitToViewBox {
    readonly viewTarget: SVGStringList;
    addEventListener<K extends keyof SVGElementEventMap>(type: K, listener: (this: SVGViewElement, ev: SVGElementEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var SVGViewElement: {
    prototype: SVGViewElement;
    new(): SVGViewElement;
}

interface SVGZoomAndPan {
    readonly zoomAndPan: number;
}

declare var SVGZoomAndPan: {
    readonly SVG_ZOOMANDPAN_DISABLE: number;
    readonly SVG_ZOOMANDPAN_MAGNIFY: number;
    readonly SVG_ZOOMANDPAN_UNKNOWN: number;
}

interface SVGZoomEvent extends UIEvent {
    readonly newScale: number;
    readonly newTranslate: SVGPoint;
    readonly previousScale: number;
    readonly previousTranslate: SVGPoint;
    readonly zoomRectScreen: SVGRect;
}

declare var SVGZoomEvent: {
    prototype: SVGZoomEvent;
    new(): SVGZoomEvent;
}

interface ScreenEventMap {
}

interface Screen extends EventTarget {
    readonly availHeight: number;
    readonly availWidth: number;
    bufferDepth: number;
    readonly colorDepth: number;
    readonly deviceXDPI: number;
    readonly deviceYDPI: number;
    readonly fontSmoothingEnabled: boolean;
    readonly height: number;
    readonly logicalXDPI: number;
    readonly logicalYDPI: number;
    onmsorientationchange: (this: Screen, ev: Event) => any;
    readonly pixelDepth: number;
    readonly systemXDPI: number;
    readonly systemYDPI: number;
    readonly width: number;
    addEventListener<K extends keyof ScreenEventMap>(type: K, listener: (this: Screen, ev: ScreenEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var Screen: {
    prototype: Screen;
    new(): Screen;
}

interface ScriptNotifyEvent extends Event {
    readonly callingUri: string;
    readonly value: string;
}

declare var ScriptNotifyEvent: {
    prototype: ScriptNotifyEvent;
    new(): ScriptNotifyEvent;
}

interface Selection {
    readonly anchorNode: Node | null;
    readonly anchorOffset: number;
    readonly focusNode: Node | null;
    readonly focusOffset: number;
    readonly isCollapsed: boolean;
    readonly rangeCount: number;
    readonly type: "Range" | "Caret" | "None";
    addRange(range: Range): void;
    collapse(parentNode: Node, offset: number): void;
    collapseToEnd(): void;
    collapseToStart(): void;
    containsNode(node: Node, partlyContained?: boolean): boolean;
    deleteFromDocument(): void;
    empty(): void;
    extend(newNode: Node, offset: number): void;
    getRangeAt(index: number): Range;
    removeAllRanges(): void;
    removeRange(range: Range): void;
    selectAllChildren(parentNode: Node): void;
    setBaseAndExtent(baseNode: Node, baseOffset: number, extentNode: Node, extentOffset: number): void;
    // toString(): string;
}

declare var Selection: {
    prototype: Selection;
    new(): Selection;
}

interface Storage {
    readonly length: number;
    clear(): void;
    getItem(key: string): string | null;
    key(index: number): string | null;
    removeItem(key: string): void;
    setItem(key: string, data: string): void;
    // [key: string]: any;
    // [index: number]: string;
}

declare var Storage: {
    prototype: Storage;
    new(): Storage;
}

interface StorageEvent extends Event {
    readonly url: string;
    key?: string;
    oldValue?: string;
    newValue?: string;
    storageArea?: Storage;
}

declare var StorageEvent: {
    prototype: StorageEvent;
    new (type: string, eventInitDict?: StorageEventInit): StorageEvent;
}

interface StyleMedia {
    readonly type: string;
    matchMedium(mediaquery: string): boolean;
}

declare var StyleMedia: {
    prototype: StyleMedia;
    new(): StyleMedia;
}

interface StyleSheet {
    disabled: boolean;
    readonly href: string;
    readonly media: MediaList;
    readonly ownerNode: Node;
    readonly parentStyleSheet: StyleSheet;
    readonly title: string;
    readonly type: string;
}

declare var StyleSheet: {
    prototype: StyleSheet;
    new(): StyleSheet;
}

interface StyleSheetList {
    readonly length: number;
    item(index?: number): StyleSheet;
    [index: number]: StyleSheet;
}

declare var StyleSheetList: {
    prototype: StyleSheetList;
    new(): StyleSheetList;
}

interface StyleSheetPageList {
    readonly length: number;
    item(index: number): CSSPageRule;
    [index: number]: CSSPageRule;
}

declare var StyleSheetPageList: {
    prototype: StyleSheetPageList;
    new(): StyleSheetPageList;
}

interface Text extends CharacterData {
    readonly nodeType: kNode.TEXT_NODE;
    readonly wholeText: string;
    readonly assignedSlot?: HTMLSlotElement | null;
    readonly parentElement: Element | null;
    splitText(offset: number): Text;
}

declare var Text: {
    prototype: Text;
    new(data?: string): Text;
}

interface TextDecodeOptions {
  stream?: boolean;
}

interface TextDecoderOptions {
  fatal?: boolean;
  ignoreBOM?: boolean;
}

interface TextEncoderEncodeIntoResult {
  read?: number;
  written?: number;
}

interface TextEncoderEncodeIntoResult {
  read?: number;
  written?: number;
}

/**
 * A decoder for a specific method, that is a specific character encoding, like utf-8, iso-8859-2, koi8, cp1261, gbk, etc.
 * A decoder takes a stream of bytes as input and emits a stream of code points.
 * For a more scalable, non-native library, see StringView – a C-like representation of strings based on typed arrays.
 */
interface TextDecoder extends TextDecoderCommon {
  /**
   * Returns the result of running encoding's decoder.
   * The method can be invoked zero or more times with options's stream set to
   * true, and then once without options's stream (or set to false), to process
   * a fragmented stream. If the invocation without options's stream (or set to
   * false) has no input, it's clearest to omit both arguments.
   * var string = "", decoder = new TextDecoder(encoding), buffer;
   * while(buffer = next_chunk()) {
   * string += decoder.decode(buffer, {stream:true});
   * }
   * string += decoder.decode(); // end-of-stream
   * If the error mode is "fatal" and encoding's decoder returns error, throws a TypeError.
   */
  decode(input?: BufferSource, options?: TextDecodeOptions): string;
}

declare var TextDecoder: {
  prototype: TextDecoder;
  new(label?: string, options?: TextDecoderOptions): TextDecoder;
};

interface TextDecoderCommon {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
}

/**
 * TextEncoder takes a stream of code points as input and emits a stream of bytes.
 * For a more scalable, non-native library, see StringView – a C-like representation of strings based on typed arrays.
 */
interface TextEncoder extends TextEncoderCommon {
  /**
   * Returns the result of running UTF-8's encoder.
   */
  encode(input?: string): Uint8Array;
  /**
   * Runs the UTF-8 encoder on source, stores the result of that operation into destination,
   * and returns the progress made as a dictionary whereby read is the number of converted code units of source and written is the number of bytes modified in destination.
   */
  encodeInto(source: string, destination: Uint8Array): TextEncoderEncodeIntoResult;
}

declare var TextEncoder: {
  prototype: TextEncoder;
  new(encoding?: "utf-8"): TextEncoder;
};

interface TextEncoderCommon {
  readonly encoding: string;
}

interface TextEvent extends UIEvent {
    readonly data: string;
    readonly inputMethod: number;
    readonly locale: string;
    initTextEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window, dataArg: string, inputMethod: number, locale: string): void;
    readonly DOM_INPUT_METHOD_DROP: number;
    readonly DOM_INPUT_METHOD_HANDWRITING: number;
    readonly DOM_INPUT_METHOD_IME: number;
    readonly DOM_INPUT_METHOD_KEYBOARD: number;
    readonly DOM_INPUT_METHOD_MULTIMODAL: number;
    readonly DOM_INPUT_METHOD_OPTION: number;
    readonly DOM_INPUT_METHOD_PASTE: number;
    readonly DOM_INPUT_METHOD_SCRIPT: number;
    readonly DOM_INPUT_METHOD_UNKNOWN: number;
    readonly DOM_INPUT_METHOD_VOICE: number;
}

declare var TextEvent: {
    prototype: TextEvent;
    new(): TextEvent;
    readonly DOM_INPUT_METHOD_DROP: number;
    readonly DOM_INPUT_METHOD_HANDWRITING: number;
    readonly DOM_INPUT_METHOD_IME: number;
    readonly DOM_INPUT_METHOD_KEYBOARD: number;
    readonly DOM_INPUT_METHOD_MULTIMODAL: number;
    readonly DOM_INPUT_METHOD_OPTION: number;
    readonly DOM_INPUT_METHOD_PASTE: number;
    readonly DOM_INPUT_METHOD_SCRIPT: number;
    readonly DOM_INPUT_METHOD_UNKNOWN: number;
    readonly DOM_INPUT_METHOD_VOICE: number;
}

interface TextMetrics {
    readonly width: number;
}

declare var TextMetrics: {
    prototype: TextMetrics;
    new(): TextMetrics;
}

interface TextTrackEventMap {
    "cuechange": Event;
    "error": Event;
    "load": Event;
}

interface TextTrack extends EventTarget {
    readonly activeCues: TextTrackCueList;
    readonly cues: TextTrackCueList;
    readonly inBandMetadataTrackDispatchType: string;
    readonly kind: string;
    readonly label: string;
    readonly language: string;
    mode: any;
    oncuechange: (this: TextTrack, ev: Event) => any;
    onerror: (this: TextTrack, ev: Event) => any;
    onload: (this: TextTrack, ev: Event) => any;
    readonly readyState: number;
    addCue(cue: TextTrackCue): void;
    removeCue(cue: TextTrackCue): void;
    readonly DISABLED: number;
    readonly ERROR: number;
    readonly HIDDEN: number;
    readonly LOADED: number;
    readonly LOADING: number;
    readonly NONE: number;
    readonly SHOWING: number;
    addEventListener<K extends keyof TextTrackEventMap>(type: K, listener: (this: TextTrack, ev: TextTrackEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var TextTrack: {
    prototype: TextTrack;
    new(): TextTrack;
    readonly DISABLED: number;
    readonly ERROR: number;
    readonly HIDDEN: number;
    readonly LOADED: number;
    readonly LOADING: number;
    readonly NONE: number;
    readonly SHOWING: number;
}

interface TextTrackCueEventMap {
    "enter": Event;
    "exit": Event;
}

interface TextTrackCue extends EventTarget {
    endTime: number;
    id: string;
    onenter: (this: TextTrackCue, ev: Event) => any;
    onexit: (this: TextTrackCue, ev: Event) => any;
    pauseOnExit: boolean;
    startTime: number;
    text: string;
    readonly track: TextTrack;
    getCueAsHTML(): DocumentFragment;
    addEventListener<K extends keyof TextTrackCueEventMap>(type: K, listener: (this: TextTrackCue, ev: TextTrackCueEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var TextTrackCue: {
    prototype: TextTrackCue;
    new(startTime: number, endTime: number, text: string): TextTrackCue;
}

interface TextTrackCueList {
    readonly length: number;
    getCueById(id: string): TextTrackCue;
    item(index: number): TextTrackCue;
    [index: number]: TextTrackCue;
}

declare var TextTrackCueList: {
    prototype: TextTrackCueList;
    new(): TextTrackCueList;
}

interface TextTrackListEventMap {
    "addtrack": TrackEvent;
}

interface TextTrackList extends EventTarget {
    readonly length: number;
    onaddtrack: ((this: TextTrackList, ev: TrackEvent) => any) | null;
    item(index: number): TextTrack;
    addEventListener<K extends keyof TextTrackListEventMap>(type: K, listener: (this: TextTrackList, ev: TextTrackListEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
    [index: number]: TextTrack;
}

declare var TextTrackList: {
    prototype: TextTrackList;
    new(): TextTrackList;
}

interface TimeRanges {
    readonly length: number;
    end(index: number): number;
    start(index: number): number;
}

declare var TimeRanges: {
    prototype: TimeRanges;
    new(): TimeRanges;
}

interface Touch {
    readonly clientX: number;
    readonly clientY: number;
    readonly identifier: number;
    readonly pageX: number;
    readonly pageY: number;
    readonly screenX: number;
    readonly screenY: number;
    readonly target: EventTarget;
}

declare var Touch: {
    prototype: Touch;
    new (touchInit: {
      identifier: number;
      target: Element;
      clientX?: number;
      clientY?: number;
      screenX?: number;
      screenY?: number;
      pageX?: number;
      pageY?: number;
      radiusX?: number;
      radiusY?: number;
      force?: number;
    }): Touch;
}

interface TouchEvent extends UIEvent {
    readonly altKey: boolean;
    readonly changedTouches: TouchList;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
    readonly targetTouches: TouchList;
    readonly touches: TouchList;
}
interface TouchEventInit extends EventInit {
  touches?: Touch[];
  targetTouches?: Touch[];
  changedTouches?: Touch[];
}
declare var TouchEvent: {
    prototype: TouchEvent;
    new (type: "touchstart" | "touchend", touchEventInit: TouchEventInit): TouchEvent;
}

interface TouchList {
    readonly length: number;
    item(index: number): Touch | null;
    [index: number]: Touch;
}

declare var TouchList: {
    prototype: TouchList;
    new(): TouchList;
}

interface TrackEvent extends Event {
    readonly track: any;
}

declare var TrackEvent: {
    prototype: TrackEvent;
    new(): TrackEvent;
}

interface TransitionEvent extends Event {
    readonly elapsedTime: number;
    readonly propertyName: string;
    initTransitionEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, propertyNameArg: string, elapsedTimeArg: number): void;
}

declare var TransitionEvent: {
    prototype: TransitionEvent;
    new(): TransitionEvent;
}

interface TreeWalker {
    currentNode: Node;
    readonly expandEntityReferences: boolean;
    readonly filter: NodeFilter;
    readonly root: Node;
    readonly whatToShow: number;
    firstChild(): Node;
    lastChild(): Node;
    nextNode(): Node;
    nextSibling(): Node;
    parentNode(): Node;
    previousNode(): Node;
    previousSibling(): Node;
}

declare var TreeWalker: {
    prototype: TreeWalker;
    new(): TreeWalker;
}

interface UIEvent extends Event {
    readonly detail: number;
    readonly view: Window;
    initUIEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , detailArg: NonNullable<UIEventInit["detail"]>): void;
}

declare var UIEvent: {
    prototype: UIEvent;
    new(typeArg: string, eventInitDict?: UIEventInit): UIEvent;
}

interface URL {
    hash: string;
    host: string;
    hostname?: string; // exists since C32
    href: string;
    readonly origin: string;
    password: string;
    pathname: string;
    port: string;
    protocol: string;
    search: string;
    username: string;
    // toString(): string;
}

declare var URL: {
    prototype: URL;
    // since C32
    new(url: string, base?: string): URL;
    createObjectURL(object: any, options?: ObjectURLOptions): string;
    revokeObjectURL(url: string): void;
    parse(url: string, base?: string): URL | null
}

interface ValidityState {
    readonly badInput: boolean;
    readonly customError: boolean;
    readonly patternMismatch: boolean;
    readonly rangeOverflow: boolean;
    readonly rangeUnderflow: boolean;
    readonly stepMismatch: boolean;
    readonly tooLong: boolean;
    readonly typeMismatch: boolean;
    readonly valid: boolean;
    readonly valueMissing: boolean;
}

declare var ValidityState: {
    prototype: ValidityState;
    new(): ValidityState;
}

interface VideoPlaybackQuality {
    readonly corruptedVideoFrames: number;
    readonly creationTime: number;
    readonly droppedVideoFrames: number;
    readonly totalFrameDelay: number;
    readonly totalVideoFrames: number;
}

declare var VideoPlaybackQuality: {
    prototype: VideoPlaybackQuality;
    new(): VideoPlaybackQuality;
}

interface VideoTrackListEventMap {
    "addtrack": TrackEvent;
    "change": Event;
    "removetrack": TrackEvent;
}

interface WebKitCSSMatrix {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
    m11: number;
    m12: number;
    m13: number;
    m14: number;
    m21: number;
    m22: number;
    m23: number;
    m24: number;
    m31: number;
    m32: number;
    m33: number;
    m34: number;
    m41: number;
    m42: number;
    m43: number;
    m44: number;
    inverse(): WebKitCSSMatrix;
    multiply(secondMatrix: WebKitCSSMatrix): WebKitCSSMatrix;
    rotate(angleX: number, angleY?: number, angleZ?: number): WebKitCSSMatrix;
    rotateAxisAngle(x: number, y: number, z: number, angle: number): WebKitCSSMatrix;
    scale(scaleX: number, scaleY?: number, scaleZ?: number): WebKitCSSMatrix;
    setMatrixValue(value: string): void;
    skewX(angle: number): WebKitCSSMatrix;
    skewY(angle: number): WebKitCSSMatrix;
    // toString(): string;
    translate(x: number, y: number, z?: number): WebKitCSSMatrix;
}

declare var WebKitCSSMatrix: {
    prototype: WebKitCSSMatrix;
    new(text?: string): WebKitCSSMatrix;
}

interface WebKitPoint {
    x: number;
    y: number;
}

declare var WebKitPoint: {
    prototype: WebKitPoint;
    new(x?: number, y?: number): WebKitPoint;
}

interface WebSocketEventMap {
    "close": CloseEvent;
    "error": Event;
    "message": MessageEvent;
    "open": Event;
}

interface WebSocket extends EventTarget {
    binaryType: string;
    readonly bufferedAmount: number;
    readonly extensions: string;
    onclose: (this: WebSocket, ev: CloseEvent) => any;
    onerror: (this: WebSocket, ev: Event) => any;
    onmessage: (this: WebSocket, ev: MessageEvent) => any;
    onopen: (this: WebSocket, ev: Event) => any;
    readonly protocol: string;
    readonly readyState: number;
    readonly url: string;
    close(code?: number, reason?: string): void;
    send(data: any): void;
    readonly CLOSED: number;
    readonly CLOSING: number;
    readonly CONNECTING: number;
    readonly OPEN: number;
    addEventListener<K extends keyof WebSocketEventMap>(type: K, listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var WebSocket: {
    prototype: WebSocket;
    new(url: string, protocols?: string | string[]): WebSocket;
    readonly CLOSED: number;
    readonly CLOSING: number;
    readonly CONNECTING: number;
    readonly OPEN: number;
}

interface WheelEvent extends MouseEvent {
    readonly deltaMode: number;
    readonly deltaX: number;
    readonly deltaY: number;
    readonly deltaZ: number;
    /* @deprecated */
    // readonly wheelDelta: number;
    // readonly wheelDeltaX: number;
    // readonly wheelDeltaY: number;
    getCurrentPoint(element: Element): void;
    initWheelEvent(typeArg: string, canBubbleArg: boolean, cancelableArg: boolean, viewArg: Window
        , detailArg: NonNullable<UIEventInit["detail"]>
        , screenXArg: number, screenYArg: number, clientXArg: number, clientYArg: number
        , buttonArg: NonNullable<MouseEventInit["button"]>, relatedTargetArg: EventTarget
        , modifiersListArg: string, deltaXArg: number, deltaYArg: number, deltaZArg: number, deltaMode: number): void;
    readonly DOM_DELTA_LINE: number;
    readonly DOM_DELTA_PAGE: number;
    readonly DOM_DELTA_PIXEL: number;
}

declare var WheelEvent: {
    prototype: WheelEvent;
    new(typeArg: string, eventInitDict?: WheelEventInit): WheelEvent;
    readonly DOM_DELTA_LINE: number;
    readonly DOM_DELTA_PAGE: number;
    readonly DOM_DELTA_PIXEL: number;
}

interface WindowEventMap extends GlobalEventHandlersEventMap {
    "abort": UIEvent;
    "afterprint": Event;
    "beforeprint": Event;
    "beforeunload": BeforeUnloadEvent;
    "blur": FocusEvent;
    "canplay": Event;
    "canplaythrough": Event;
    "change": Event;
    "click": MouseEvent;
    "compassneedscalibration": Event;
    "contextmenu": PointerEvent;
    "dblclick": MouseEvent;
    "drag": DragEvent;
    "dragend": DragEvent;
    "dragenter": DragEvent;
    "dragleave": DragEvent;
    "dragover": DragEvent;
    "dragstart": DragEvent;
    "drop": DragEvent;
    "durationchange": Event;
    "emptied": Event;
    "focus": FocusEvent;
    "hashchange": HashChangeEvent;
    "input": Event;
    "invalid": Event;
    "keydown": KeyboardEventToPrevent;
    "keypress": KeyboardEvent;
    "keyup": KeyboardEvent;
    "load": Event;
    "loadeddata": Event;
    "loadedmetadata": Event;
    "loadstart": Event;
    "message": MessageEvent;
    "mousedown": MouseEvent;
    "mouseenter": MouseEvent;
    "mouseleave": MouseEvent;
    "mousemove": MouseEvent;
    "mouseout": MouseEvent;
    "mouseover": MouseEvent;
    "mouseup": MouseEvent;
    "mousewheel": WheelEvent;
    "offline": Event;
    "online": Event;
    "orientationchange": Event;
    "pagehide": PageTransitionEvent;
    "pageshow": PageTransitionEvent;
    "paste": ClipboardEvent;
    "pause": Event;
    "play": Event;
    "playing": Event;
    "popstate": PopStateEvent;
    "progress": ProgressEvent;
    "ratechange": Event;
    "readystatechange": ProgressEvent;
    "reset": Event;
    "resize": UIEvent;
    "scroll": UIEvent;
    "seeked": Event;
    "seeking": Event;
    "select": UIEvent;
    "stalled": Event;
    "storage": StorageEvent;
    "submit": Event;
    "suspend": Event;
    "timeupdate": Event;
    "unload": Event;
    "volumechange": Event;
    "waiting": Event;
}

interface Window extends EventTarget, WindowSessionStorage, WindowLocalStorage, WindowConsole, GlobalEventHandlers, WindowBase64 {
    readonly applicationCache: ApplicationCache;
    readonly clientInformation: Navigator;
    readonly closed: boolean;
    defaultStatus: string;
    readonly devicePixelRatio: number;
    readonly doNotTrack: string;
    readonly document: Document;
    // event: Event | undefined; // NOT use window.event
    readonly external: External;
    readonly frameElement: Element | null;
    readonly frames: Window[] | object | null | undefined;
    readonly history: History;
    readonly innerHeight: number;
    readonly innerWidth: number;
    readonly length: number;
    readonly location: Location;
    readonly locationbar: BarProp;
    readonly menubar: BarProp;
    name: string;
    readonly navigator: Navigator;
    offscreenBuffering: string | boolean;
    onabort: (this: Window, ev: UIEvent) => any;
    onafterprint: (this: Window, ev: Event) => any;
    onbeforeprint: (this: Window, ev: Event) => any;
    onbeforeunload: (this: Window, ev: BeforeUnloadEvent) => any;
    onblur: (this: Window, ev: FocusEvent) => any;
    oncanplay: (this: Window, ev: Event) => any;
    oncanplaythrough: (this: Window, ev: Event) => any;
    onchange: (this: Window, ev: Event) => any;
    onclick: (this: Window, ev: MouseEventToPrevent) => any;
    oncompassneedscalibration: (this: Window, ev: Event) => any;
    oncontextmenu: (this: Window, ev: PointerEvent) => any;
    ondblclick: (this: Window, ev: MouseEvent) => any;
    ondrag: (this: Window, ev: DragEvent) => any;
    ondragend: (this: Window, ev: DragEvent) => any;
    ondragenter: (this: Window, ev: DragEvent) => any;
    ondragleave: (this: Window, ev: DragEvent) => any;
    ondragover: (this: Window, ev: DragEvent) => any;
    ondragstart: (this: Window, ev: DragEvent) => any;
    ondrop: (this: Window, ev: DragEvent) => any;
    ondurationchange: (this: Window, ev: Event) => any;
    onemptied: (this: Window, ev: Event) => any;
    onerror: ErrorEventHandler;
    onfocus: (this: Window, ev: FocusEvent) => any;
    onhashchange: (this: Window, ev: HashChangeEvent) => any;
    oninput: (this: Window, ev: Event) => any;
    oninvalid: (this: Window, ev: Event) => any;
    onkeydown: (this: Window, ev: KeyboardEventToPrevent) => any;
    onkeypress: (this: Window, ev: KeyboardEvent) => any;
    onkeyup: (this: Window, ev: KeyboardEventToPrevent) => any;
    onload: (this: Window, ev: Event) => any;
    onloadeddata: (this: Window, ev: Event) => any;
    onloadedmetadata: (this: Window, ev: Event) => any;
    onloadstart: (this: Window, ev: Event) => any;
    onmessage: (this: Window, ev: MessageEvent) => any;
    onmousedown: (this: Window, ev: MouseEvent) => any;
    onmouseenter: (this: Window, ev: MouseEvent) => any;
    onmouseleave: (this: Window, ev: MouseEvent) => any;
    onmousemove: (this: Window, ev: MouseEvent) => any;
    onmouseout: (this: Window, ev: MouseEvent) => any;
    onmouseover: (this: Window, ev: MouseEvent) => any;
    onmouseup: (this: Window, ev: MouseEvent) => any;
    onmousewheel: (this: Window, ev: WheelEvent) => any;
    onoffline: (this: Window, ev: Event) => any;
    ononline: (this: Window, ev: Event) => any;
    onorientationchange: (this: Window, ev: Event) => any;
    onpagehide: (this: Window, ev: PageTransitionEvent) => any;
    onpageshow: (this: Window, ev: PageTransitionEvent) => any;
    onpause: (this: Window, ev: Event) => any;
    onplay: (this: Window, ev: Event) => any;
    onplaying: (this: Window, ev: Event) => any;
    onpopstate: (this: Window, ev: PopStateEvent) => any;
    onprogress: (this: Window, ev: ProgressEvent) => any;
    onratechange: (this: Window, ev: Event) => any;
    onreadystatechange: (this: Window, ev: ProgressEvent) => any;
    onreset: (this: Window, ev: Event) => any;
    onresize: (this: Window, ev: UIEvent) => any;
    onscroll: (this: Window, ev: UIEvent) => any;
    onseeked: (this: Window, ev: Event) => any;
    onseeking: (this: Window, ev: Event) => any;
    onselect: (this: Window, ev: UIEvent) => any;
    onstalled: (this: Window, ev: Event) => any;
    onstorage: (this: Window, ev: StorageEvent) => any;
    onsubmit: (this: Window, ev: Event) => any;
    onsuspend: (this: Window, ev: Event) => any;
    ontimeupdate: (this: Window, ev: Event) => any;
    ontouchcancel: (ev: TouchEvent) => any;
    ontouchend: (ev: TouchEvent) => any;
    ontouchmove: (ev: TouchEvent) => any;
    ontouchstart: (ev: TouchEvent) => any;
    onunload: (this: Window, ev: Event) => any;
    onvolumechange: (this: Window, ev: Event) => any;
    onwaiting: (this: Window, ev: Event) => any;
    opener: any;
    orientation: string | number;
    readonly outerHeight: number;
    readonly outerWidth: number;
    readonly pageXOffset: number;
    readonly pageYOffset: number;
    // readonly parent: Window | object | null | undefined;
    readonly personalbar: BarProp;
    readonly screen: Screen;
    readonly screenLeft: number;
    readonly screenTop: number;
    readonly screenX: number;
    readonly screenY: number;
    readonly scrollX: number;
    readonly scrollY: number;
    readonly scrollbars: BarProp;
    readonly self: Window;
    // status: string;
    // readonly statusbar: BarProp;
    // readonly styleMedia: StyleMedia;
    // readonly toolbar: BarProp;
    // readonly top: Window;
    readonly window: Window;
    URL: typeof URL;
    Blob: typeof Blob;
    alert(message?: any): void;
    blur(): void;
    cancelAnimationFrame(handle: number): void;
    captureEvents(): void;
    close(): void;
    confirm(message?: string): boolean;
    find(string: string, caseSensitive: boolean, backwards: boolean, wrapAround: boolean, wholeWord: boolean,
         searchInFrames: boolean, showDialog: boolean): boolean;
    focus(): void;
    getComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;
    //getMatchedCSSRules(elt: Element, pseudoElt?: string): CSSRuleList;
    getSelection(): Selection;
    moveBy(x?: number, y?: number): void;
    moveTo(x?: number, y?: number): void;
    open(url?: string, target?: string, features?: string, replace?: boolean): Window;
    postMessage(message: any, targetOrigin: string, transfer?: any[]): void;
    print(): void;
    prompt(message?: string, _default?: string): string | null;
    releaseEvents(): void;
    requestAnimationFrame(callback: FrameRequestCallback): number;
    resizeBy(x?: number, y?: number): void;
    resizeTo(x?: number, y?: number): void;
    scroll(x?: number, y?: number): void;
    scrollBy(x?: number, y?: number): void;
    scrollTo(x?: number, y?: number): void;
    webkitCancelAnimationFrame(handle: number): void;
    webkitConvertPointFromNodeToPage(node: Node, pt: WebKitPoint): WebKitPoint;
    webkitConvertPointFromPageToNode(node: Node, pt: WebKitPoint): WebKitPoint;
    webkitRequestAnimationFrame(callback: FrameRequestCallback): number;
    addEventListener<K extends keyof WindowEventMap>(type: K, listener: (this: Window, ev: WindowEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;

    ShadowRoot?: ShadowRootConstructor | Element | HTMLCollection | Window;
    requestIdleCallback?: RequestIdleCallback | Element | HTMLCollection | Window;
}

// declare var Window: {
//     prototype: Window;
//     new(): Window;
// }

interface XMLDocument extends Document {
    addEventListener<K extends keyof DocumentEventMap>(type: K, listener: (this: XMLDocument, ev: DocumentEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var XMLDocument: {
    prototype: XMLDocument;
    new(): XMLDocument;
}

interface XMLHttpRequestEventMap extends XMLHttpRequestEventTargetEventMap {
    "readystatechange": Event;
}

interface XMLHttpRequest extends EventTarget, XMLHttpRequestEventTarget {
    onreadystatechange: (this: XMLHttpRequest, ev: Event) => any;
    readonly readyState: number;
    readonly response: any;
    readonly responseText: string;
    responseType: string;
    readonly responseXML: Document | null;
    readonly status: number;
    readonly statusText: string;
    timeout: number;
    readonly upload: XMLHttpRequestUpload;
    withCredentials: boolean;
    readonly responseURL: string;
    abort(): void;
    getAllResponseHeaders(): string;
    getResponseHeader(header: string): string | null;
    open(method: "GET", url: string, async: true, user?: string, password?: string): void;
    overrideMimeType(mime: string): void;
    send(): void;
    setRequestHeader(header: string, value: string): void;
    readonly DONE: number;
    readonly HEADERS_RECEIVED: number;
    readonly LOADING: number;
    readonly OPENED: number;
    readonly UNSENT: number;
    onload: (ev: Event & TypedEvent<"load">) => void;
    addEventListener<K extends keyof XMLHttpRequestEventMap>(type: K, listener: (this: XMLHttpRequest, ev: XMLHttpRequestEventMap[K]) => void, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface BlobXHR extends XMLHttpRequest {
  readonly response: Blob;
  readonly responseText: never;
  readonly responseXML: never;
  responseType: "blob";
}

interface TextXHR extends XMLHttpRequest {
    readonly response: string;
    readonly responseText: string;
    readonly responseXML: never;
    responseType: "text";
}

interface JSONXHR extends XMLHttpRequest {
    readonly response: null | boolean | number | object | string;
    readonly responseText: never;
    readonly responseXML: never;
    responseType: "json";
}

interface ArrayXHR extends XMLHttpRequest {
    readonly response: ArrayBuffer;
    readonly responseText: never;
    readonly responseXML: never;
    responseType: "arraybuffer";
    onload: (ev: Event & TypedEvent<"load">) => void;
}

declare var XMLHttpRequest: {
    prototype: XMLHttpRequest;
    new(): XMLHttpRequest;
    readonly DONE: number;
    readonly HEADERS_RECEIVED: number;
    readonly LOADING: number;
    readonly OPENED: number;
    readonly UNSENT: number;
}

interface XMLHttpRequestUpload extends EventTarget, XMLHttpRequestEventTarget {
    addEventListener<K extends keyof XMLHttpRequestEventTargetEventMap>(
        type: K, listener: (this: XMLHttpRequestUpload, ev: XMLHttpRequestEventTargetEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

declare var XMLHttpRequestUpload: {
    prototype: XMLHttpRequestUpload;
    new(): XMLHttpRequestUpload;
}

interface XMLSerializer {
    serializeToString(target: Node): string;
}

declare var XMLSerializer: {
    prototype: XMLSerializer;
    new(): XMLSerializer;
}

interface CanvasPathMethods {
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
    closePath(): void;
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
    lineTo(x: number, y: number): void;
    moveTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    rect(x: number, y: number, w: number, h: number): void;
}

interface ChildNode {
    remove(): void;
}

interface DOML2DeprecatedColorProperty {
    color: string;
}

interface DOML2DeprecatedSizeProperty {
    size: number;
}

interface DocumentEvent {
    createEvent(eventInterface:"AnimationEvent"): AnimationEvent;
    createEvent(eventInterface:"BeforeUnloadEvent"): BeforeUnloadEvent;
    createEvent(eventInterface:"ClipboardEvent"): ClipboardEvent;
    createEvent(eventInterface:"CloseEvent"): CloseEvent;
    createEvent(eventInterface:"CompositionEvent"): CompositionEvent;
    createEvent(eventInterface:"CustomEvent"): CustomEvent;
    createEvent(eventInterface:"DragEvent"): DragEvent;
    createEvent(eventInterface:"ErrorEvent"): ErrorEvent;
    createEvent(eventInterface:"Event"): Event;
    createEvent(eventInterface:"Events"): Event;
    createEvent(eventInterface:"FocusEvent"): FocusEvent;
    createEvent(eventInterface:"HashChangeEvent"): HashChangeEvent;
    createEvent(eventInterface:"KeyboardEvent"): KeyboardEvent;
    createEvent(eventInterface:"ListeningStateChangedEvent"): ListeningStateChangedEvent;
    createEvent(eventInterface:"LongRunningScriptDetectedEvent"): LongRunningScriptDetectedEvent;
    createEvent(eventInterface:"MessageEvent"): MessageEvent;
    createEvent(eventInterface:"MouseEvent"): MouseEvent;
    createEvent(eventInterface:"MouseEvents"): MouseEvent;
    createEvent(eventInterface:"OverflowEvent"): OverflowEvent;
    createEvent(eventInterface:"PageTransitionEvent"): PageTransitionEvent;
    createEvent(eventInterface:"PermissionRequestedEvent"): PermissionRequestedEvent;
    createEvent(eventInterface:"PointerEvent"): PointerEvent;
    createEvent(eventInterface:"PopStateEvent"): PopStateEvent;
    createEvent(eventInterface:"ProgressEvent"): ProgressEvent;
    createEvent(eventInterface:"ScriptNotifyEvent"): ScriptNotifyEvent;
    createEvent(eventInterface:"StorageEvent"): StorageEvent;
    createEvent(eventInterface:"TextEvent"): TextEvent;
    createEvent(eventInterface:"TouchEvent"): TouchEvent;
    createEvent(eventInterface:"TrackEvent"): TrackEvent;
    createEvent(eventInterface:"TransitionEvent"): TransitionEvent;
    createEvent(eventInterface:"UIEvent"): UIEvent;
    createEvent(eventInterface:"UIEvents"): UIEvent;
    createEvent(eventInterface:"WheelEvent"): WheelEvent;
    createEvent(eventInterface: string): Event;
}

interface ElementTraversal {
    readonly childElementCount: number;
    readonly firstElementChild: Element | RadioNodeList | Window | null;
    readonly lastElementChild: Element | RadioNodeList | Window | null;
    readonly nextElementSibling: Element | RadioNodeList | Window | null;
    readonly previousElementSibling: Element | RadioNodeList | Window | null;
}

interface GetSVGDocument {
    getSVGDocument(): Document;
}

interface GlobalEventHandlersEventMap {
    "pointercancel": PointerEvent;
    "pointerdown": PointerEvent;
    "pointerenter": PointerEvent;
    "pointerleave": PointerEvent;
    "pointermove": PointerEvent;
    "pointerout": PointerEvent;
    "pointerover": PointerEvent;
    "pointerup": PointerEvent;
    "wheel": WheelEvent;
}

interface GlobalEventHandlers {
    onpointercancel: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerdown: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerenter: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerleave: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointermove: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerout: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerover: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onpointerup: (this: GlobalEventHandlers, ev: PointerEvent) => any;
    onwheel: (this: GlobalEventHandlers, ev: WheelEvent) => any;
    addEventListener<K extends keyof GlobalEventHandlersEventMap>(
        type: K, listener: (this: GlobalEventHandlers, ev: GlobalEventHandlersEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface HTMLTableAlignment {
    /**
      * Sets or retrieves a value that you can use to implement your own ch functionality for the object.
      */
    ch: string;
    /**
      * Sets or retrieves a value that you can use to implement your own chOff functionality for the object.
      */
    chOff: string;
    /**
      * Sets or retrieves how text and other content are vertically aligned within the object that contains them.
      */
    vAlign: string;
}

interface LinkStyle {
    /**
     * Note: `sheet` may be null if the element is not connected
     */
    readonly sheet: StyleSheet | null;
}

interface NavigatorContentUtils {
}

interface NavigatorOnLine {
    readonly onLine: boolean;
}

interface NavigatorStorageUtils {
}

interface NodeSelector {
    querySelector<K extends keyof ElementTagNameMap>(selectors: K): ElementTagNameMap[K] | null;
    querySelector(selectors: string): Element | null;
    querySelectorAll<K extends keyof ElementListTagNameMap>(selectors: K): ElementListTagNameMap[K];
    querySelectorAll(selectors: string): NodeListOf<Element>;
}

interface RandomSource {
    getRandomValues(array: ArrayBufferView): ArrayBufferView;
}

interface SVGAnimatedPoints {
    readonly animatedPoints: SVGPointList;
    readonly points: SVGPointList;
}

interface SVGFilterPrimitiveStandardAttributes {
    readonly height: SVGAnimatedLength;
    readonly result: SVGAnimatedString;
    readonly width: SVGAnimatedLength;
    readonly x: SVGAnimatedLength;
    readonly y: SVGAnimatedLength;
}

interface SVGFitToViewBox {
    readonly preserveAspectRatio: SVGAnimatedPreserveAspectRatio;
    readonly viewBox: SVGAnimatedRect;
}

interface SVGTests {
    readonly requiredExtensions: SVGStringList;
    readonly requiredFeatures: SVGStringList;
    readonly systemLanguage: SVGStringList;
    hasExtension(extension: string): boolean;
}

interface SVGURIReference {
    readonly href: SVGAnimatedString;
}

interface WindowBase64 {
    atob(encodedString: string): string;
    btoa(rawString: string): string;
}

interface WindowConsole {
    readonly console: Console;
}

interface WindowLocalStorage {
    readonly localStorage: Storage;
}

interface WindowSessionStorage {
    readonly sessionStorage: Storage;
}

interface XMLHttpRequestEventTargetEventMap {
    "abort": Event;
    "error": ErrorEvent;
    "load": Event;
    "loadend": ProgressEvent;
    "loadstart": Event;
    "progress": ProgressEvent;
    "timeout": ProgressEvent;
}

interface XMLHttpRequestEventTarget {
    onabort: (this: XMLHttpRequestEventTarget, ev: Event) => any;
    onerror: (ev: ErrorEvent) => any;
    onload: (ev: TypedEvent<"load">) => any;
    onloadend: (this: XMLHttpRequestEventTarget, ev: ProgressEvent) => any;
    onloadstart: (this: XMLHttpRequestEventTarget, ev: Event) => any;
    onprogress: (this: XMLHttpRequestEventTarget, ev: ProgressEvent) => any;
    ontimeout: (this: XMLHttpRequestEventTarget, ev: ProgressEvent) => any;
    addEventListener<K extends keyof XMLHttpRequestEventTargetEventMap>(
        type: K, listener: (this: XMLHttpRequestEventTarget, ev: XMLHttpRequestEventTargetEventMap[K]) => any, useCapture?: boolean): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
}

interface ErrorEventInit {
    message?: string;
    filename?: string;
    lineno?: number;
    conlno?: number;
    error?: any;
}

interface StorageEventInit extends EventInit {
    key?: string;
    oldValue?: string;
    newValue?: string;
    url: string;
    storageArea?: Storage;
}

interface Canvas2DContextAttributes {
    alpha?: boolean;
    willReadFrequently?: boolean;
    storage?: boolean;
    [attribute: string]: boolean | string | undefined;
}

interface ImageBitmap {
    readonly width: number;
    readonly height: number;
    close(): void;
}

interface NodeListOf<TNode extends Node> extends NodeList {
    length: number;
    item(index: number): TNode;
    [index: number]: TNode;
}

interface HTMLCollectionOf<T extends Element> extends HTMLCollection {
    item(index: number): T;
    namedItem(name: string): T;
    [index: number]: T;
}

interface BlobPropertyBag {
    type?: string;
    endings?: string;
}

interface FilePropertyBag {
    type?: string;
    lastModified?: number;
}

interface ProgressEventInit extends EventInit {
    lengthComputable?: boolean;
    loaded?: number;
    total?: number;
}

interface ScrollOptions {
    behavior?: ScrollBehavior;
}

interface ScrollIntoViewOptions extends ScrollOptions {
    /* if "nearest", work as scrollIntoViewIfNeeded */
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
}

interface ClipboardEventInit extends EventInit {
    data?: string;
    dataType?: string;
}

interface IDBArrayKey extends Array<IDBValidKey> {
}

interface JsonWebKey {
    kty: string;
    use?: string;
    key_ops?: string[];
    alg?: string;
    kid?: string;
    x5u?: string;
    x5c?: string;
    x5t?: string;
    ext?: boolean;
    crv?: string;
    x?: string;
    y?: string;
    d?: string;
    n?: string;
    e?: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
    oth?: null; // RsaOtherPrimesInfo[];
    k?: string;
}

interface ParentNode extends Node {
    readonly children: HTMLCollection;
    readonly firstElementChild: Element | RadioNodeList | Window | null;
    readonly lastElementChild: Element | RadioNodeList | Window | null;
    readonly childElementCount: number;
    append?(...nodeOrText: Array<Node | string>): void;
    prepend?(...nodeOrText: Array<Node | string>): void;
}

interface DocumentOrShadowRootMixin {
    readonly activeElement: Element | null;
    readonly stylesheets: StyleSheetList;
    /** on Firefox, `getSelection` may be undefined */
    getSelection?(): Selection | null;
    elementFromPoint(x: number, y: number): Element | null;
    elementsFromPoint(x: number, y: number): Element[];
}
interface DocumentOrShadowRoot extends Node, DocumentOrShadowRootMixin {}

interface ShadowRoot extends DocumentFragment, DocumentOrShadowRootMixin {
    readonly mode?: 'open'|'closed';
    readonly host: Element;
    innerHTML: string;
    getElementById(elementId: string): Element | null;
}
interface ShadowRootConstructor {
    prototype: ShadowRoot;
    new(): never;
}
declare var ShadowRoot: ShadowRootConstructor | undefined | Element | HTMLCollection | Window;

interface ShadowRootInit {
    mode: 'open'|'closed';
    delegatesFocus?: boolean;
}

interface HTMLSlotElement extends SafeHTMLElement {
    name: string;
    assignedNodes(options?: AssignedNodesOptions): Node[];
}

interface AssignedNodesOptions {
    flatten?: boolean;
}

interface EventListenerObject {
  handleEvent (evt: EventToPrevent): ELRet;
}
declare type EventListenerOrEventListenerObject = EventListener | null | EventListenerObject;
declare type EventListenerOptions = boolean | {
    capture?: true;
    once?: true;
    passive?: boolean;
};

interface ErrorEventHandler {
    (message: string, filename?: string, lineno?: number, colno?: number, error?:Error): void;
}
interface PositionCallback {
    (position: Position): void;
}
interface PositionErrorCallback {
    (error: PositionError): void;
}
interface MediaQueryListListener {
    (this: MediaQueryList, event: Event): void;
}
interface FrameRequestCallback {
    (time: number): void;
}
interface DecodeErrorCallback {
    (error: DOMException): void;
}
interface FunctionStringCallback {
    (data: string): void;
}
interface ForEachCallback {
    (keyId: any, status: string): void;
}
interface HTMLElementTagNameMap {
    "a": HTMLAnchorElement;
    "applet": HTMLAppletElement;
    "area": HTMLAreaElement;
    "audio": HTMLAudioElement;
    "base": HTMLBaseElement;
    "basefont": HTMLBaseFontElement;
    "blockquote": HTMLQuoteElement;
    "body": HTMLBodyElement;
    "br": HTMLBRElement;
    "button": HTMLButtonElement;
    "canvas": HTMLCanvasElement;
    "caption": HTMLTableCaptionElement;
    "code": HTMLElement;
    "col": HTMLTableColElement;
    "colgroup": HTMLTableColElement;
    "details": HTMLDetailsElement;
    "datalist": HTMLDataListElement;
    "del": HTMLModElement;
    "dialog": HTMLDialogElement;
    "dir": HTMLDirectoryElement;
    "div": HTMLDivElement;
    "dl": HTMLDListElement;
    "embed": HTMLEmbedElement;
    "fieldset": HTMLFieldSetElement;
    "font": HTMLFontElement;
    "form": HTMLFormElement;
    "frame": HTMLFrameElement;
    "frameset": HTMLFrameSetElement;
    "fencedframe": HTMLFencedFrameElement;
    "h1": HTMLHeadingElement;
    "h2": HTMLHeadingElement;
    "h3": HTMLHeadingElement;
    "h4": HTMLHeadingElement;
    "h5": HTMLHeadingElement;
    "h6": HTMLHeadingElement;
    "head": HTMLHeadElement;
    "hr": HTMLHRElement;
    "html": HTMLHtmlElement;
    "iframe": HTMLIFrameElement;
    "img": HTMLImageElement;
    "input": HTMLInputElement;
    "ins": HTMLModElement;
    "isindex": HTMLUnknownElement;
    "label": HTMLLabelElement;
    "legend": HTMLLegendElement;
    "li": HTMLLIElement;
    "link": HTMLLinkElement;
    "listing": HTMLPreElement;
    "map": HTMLMapElement;
    "marquee": HTMLMarqueeElement;
    "menu": HTMLMenuElement;
    "meta": HTMLMetaElement;
    "meter": HTMLMeterElement;
    "nextid": HTMLUnknownElement;
    "object": HTMLObjectElement;
    "ol": HTMLOListElement;
    "optgroup": HTMLOptGroupElement;
    "option": HTMLOptionElement;
    "output": HTMLOutputElement;
    "p": HTMLParagraphElement;
    "param": HTMLParamElement;
    "picture": HTMLPictureElement;
    "pre": HTMLPreElement;
    "progress": HTMLProgressElement;
    "q": HTMLQuoteElement;
    "script": HTMLScriptElement;
    "select": HTMLSelectElement;
    "source": HTMLSourceElement;
    "span": HTMLSpanElement;
    "style": HTMLStyleElement;
    "summary": HTMLElement;
    "table": HTMLTableElement;
    "tbody": HTMLTableSectionElement;
    "td": HTMLTableDataCellElement;
    "template": HTMLTemplateElement;
    "textarea": HTMLTextAreaElement;
    "tfoot": HTMLTableSectionElement;
    "th": HTMLTableHeaderCellElement;
    "thead": HTMLTableSectionElement;
    "time": HTMLTimeElement;
    "title": HTMLTitleElement;
    "tr": HTMLTableRowElement;
    "track": HTMLTrackElement;
    "ul": HTMLUListElement;
    "video": HTMLVideoElement;
    "xmp": HTMLPreElement;
}

interface ElementTagNameMap {
    "a": HTMLAnchorElement;
    "abbr": HTMLElement;
    "acronym": HTMLElement;
    "address": HTMLElement;
    "applet": HTMLAppletElement;
    "area": HTMLAreaElement;
    "article": HTMLElement;
    "aside": HTMLElement;
    "audio": HTMLAudioElement;
    "b": HTMLElement;
    "base": HTMLBaseElement;
    "basefont": HTMLBaseFontElement;
    "bdo": HTMLElement;
    "big": HTMLElement;
    "blockquote": HTMLQuoteElement;
    "body": HTMLBodyElement;
    "br": HTMLBRElement;
    "button": HTMLButtonElement;
    "canvas": HTMLCanvasElement;
    "caption": HTMLTableCaptionElement;
    "center": HTMLElement;
    "circle": SVGCircleElement;
    "cite": HTMLElement;
    "clippath": SVGClipPathElement;
    "code": HTMLElement;
    "col": HTMLTableColElement;
    "colgroup": HTMLTableColElement;
    "datalist": HTMLDataListElement;
    "dd": HTMLElement;
    "defs": SVGDefsElement;
    "del": HTMLModElement;
    "desc": SVGDescElement;
    "dfn": HTMLElement;
    "dialog": HTMLDialogElement;
    "dir": HTMLDirectoryElement;
    "div": HTMLDivElement;
    "dl": HTMLDListElement;
    "dt": HTMLElement;
    "ellipse": SVGEllipseElement;
    "em": HTMLElement;
    "embed": HTMLEmbedElement;
    "feblend": SVGFEBlendElement;
    "fecolormatrix": SVGFEColorMatrixElement;
    "fecomponenttransfer": SVGFEComponentTransferElement;
    "fecomposite": SVGFECompositeElement;
    "feconvolvematrix": SVGFEConvolveMatrixElement;
    "fediffuselighting": SVGFEDiffuseLightingElement;
    "fedisplacementmap": SVGFEDisplacementMapElement;
    "fedistantlight": SVGFEDistantLightElement;
    "feflood": SVGFEFloodElement;
    "fefunca": SVGFEFuncAElement;
    "fefuncb": SVGFEFuncBElement;
    "fefuncg": SVGFEFuncGElement;
    "fefuncr": SVGFEFuncRElement;
    "fegaussianblur": SVGFEGaussianBlurElement;
    "feimage": SVGFEImageElement;
    "femerge": SVGFEMergeElement;
    "femergenode": SVGFEMergeNodeElement;
    "femorphology": SVGFEMorphologyElement;
    "feoffset": SVGFEOffsetElement;
    "fepointlight": SVGFEPointLightElement;
    "fespecularlighting": SVGFESpecularLightingElement;
    "fespotlight": SVGFESpotLightElement;
    "fetile": SVGFETileElement;
    "feturbulence": SVGFETurbulenceElement;
    "fieldset": HTMLFieldSetElement;
    "figcaption": HTMLElement;
    "figure": HTMLElement;
    "filter": SVGFilterElement;
    "font": HTMLFontElement;
    "footer": HTMLElement;
    "foreignobject": SVGForeignObjectElement;
    "form": HTMLFormElement;
    "frame": HTMLFrameElement;
    "frameset": HTMLFrameSetElement;
    "g": SVGGElement;
    "h1": HTMLHeadingElement;
    "h2": HTMLHeadingElement;
    "h3": HTMLHeadingElement;
    "h4": HTMLHeadingElement;
    "h5": HTMLHeadingElement;
    "h6": HTMLHeadingElement;
    "head": HTMLHeadElement;
    "header": HTMLElement;
    "hgroup": HTMLElement;
    "hr": HTMLHRElement;
    "html": HTMLHtmlElement;
    "i": HTMLElement;
    "iframe": HTMLIFrameElement;
    "image": SVGImageElement;
    "img": HTMLImageElement;
    "input": HTMLInputElement;
    "ins": HTMLModElement;
    "isindex": HTMLUnknownElement;
    "kbd": HTMLElement;
    "keygen": HTMLElement;
    "label": HTMLLabelElement;
    "legend": HTMLLegendElement;
    "li": HTMLLIElement;
    "line": SVGLineElement;
    "lineargradient": SVGLinearGradientElement;
    "link": HTMLLinkElement;
    "listing": HTMLPreElement;
    "map": HTMLMapElement;
    "mark": HTMLElement;
    "marker": SVGMarkerElement;
    "marquee": HTMLMarqueeElement;
    "mask": SVGMaskElement;
    "menu": HTMLMenuElement;
    "meta": HTMLMetaElement;
    "metadata": SVGMetadataElement;
    "meter": HTMLMeterElement;
    "nav": HTMLElement;
    "nextid": HTMLUnknownElement;
    "nobr": HTMLElement;
    "noframes": HTMLElement;
    "noscript": HTMLElement;
    "object": HTMLObjectElement;
    "ol": HTMLOListElement;
    "optgroup": HTMLOptGroupElement;
    "option": HTMLOptionElement;
    "output": HTMLOutputElement;
    "p": HTMLParagraphElement;
    "param": HTMLParamElement;
    "path": SVGPathElement;
    "pattern": SVGPatternElement;
    "picture": HTMLPictureElement;
    "plaintext": HTMLElement;
    "polygon": SVGPolygonElement;
    "polyline": SVGPolylineElement;
    "pre": HTMLPreElement;
    "progress": HTMLProgressElement;
    "q": HTMLQuoteElement;
    "radialgradient": SVGRadialGradientElement;
    "rect": SVGRectElement;
    "rt": HTMLElement;
    "ruby": HTMLElement;
    "s": HTMLElement;
    "samp": HTMLElement;
    "script": HTMLScriptElement;
    "section": HTMLElement;
    "select": HTMLSelectElement;
    "small": HTMLElement;
    "source": HTMLSourceElement;
    "span": HTMLSpanElement;
    "stop": SVGStopElement;
    "strike": HTMLElement;
    "strong": HTMLElement;
    "style": HTMLStyleElement;
    "sub": HTMLElement;
    "summary": HTMLElement;
    "sup": HTMLElement;
    "svg": SVGSVGElement;
    "switch": SVGSwitchElement;
    "symbol": SVGSymbolElement;
    "table": HTMLTableElement;
    "tbody": HTMLTableSectionElement;
    "td": HTMLTableDataCellElement;
    "template": HTMLTemplateElement;
    "text": SVGTextElement;
    "textpath": SVGTextPathElement;
    "textarea": HTMLTextAreaElement;
    "tfoot": HTMLTableSectionElement;
    "th": HTMLTableHeaderCellElement;
    "thead": HTMLTableSectionElement;
    "time": HTMLTimeElement;
    "title": HTMLTitleElement;
    "tr": HTMLTableRowElement;
    "track": HTMLTrackElement;
    "tspan": SVGTSpanElement;
    "tt": HTMLElement;
    "u": HTMLElement;
    "ul": HTMLUListElement;
    "use": SVGUseElement;
    "var": HTMLElement;
    "video": HTMLVideoElement;
    "view": SVGViewElement;
    "wbr": HTMLElement;
    "xmp": HTMLPreElement;
}

interface ElementListTagNameMap {
    "a": NodeListOf<HTMLAnchorElement>;
    "abbr": NodeListOf<HTMLElement>;
    "acronym": NodeListOf<HTMLElement>;
    "address": NodeListOf<HTMLElement>;
    "applet": NodeListOf<HTMLAppletElement>;
    "area": NodeListOf<HTMLAreaElement>;
    "article": NodeListOf<HTMLElement>;
    "aside": NodeListOf<HTMLElement>;
    "audio": NodeListOf<HTMLAudioElement>;
    "b": NodeListOf<HTMLElement>;
    "base": NodeListOf<HTMLBaseElement>;
    "basefont": NodeListOf<HTMLBaseFontElement>;
    "bdo": NodeListOf<HTMLElement>;
    "big": NodeListOf<HTMLElement>;
    "blockquote": NodeListOf<HTMLQuoteElement>;
    "body": NodeListOf<HTMLBodyElement>;
    "br": NodeListOf<HTMLBRElement>;
    "button": NodeListOf<HTMLButtonElement>;
    "canvas": NodeListOf<HTMLCanvasElement>;
    "caption": NodeListOf<HTMLTableCaptionElement>;
    "center": NodeListOf<HTMLElement>;
    "circle": NodeListOf<SVGCircleElement>;
    "cite": NodeListOf<HTMLElement>;
    "clippath": NodeListOf<SVGClipPathElement>;
    "code": NodeListOf<HTMLElement>;
    "col": NodeListOf<HTMLTableColElement>;
    "colgroup": NodeListOf<HTMLTableColElement>;
    "datalist": NodeListOf<HTMLDataListElement>;
    "dd": NodeListOf<HTMLElement>;
    "defs": NodeListOf<SVGDefsElement>;
    "del": NodeListOf<HTMLModElement>;
    "desc": NodeListOf<SVGDescElement>;
    "dfn": NodeListOf<HTMLElement>;
    "dir": NodeListOf<HTMLDirectoryElement>;
    "div": NodeListOf<HTMLDivElement>;
    "dl": NodeListOf<HTMLDListElement>;
    "dt": NodeListOf<HTMLElement>;
    "ellipse": NodeListOf<SVGEllipseElement>;
    "em": NodeListOf<HTMLElement>;
    "embed": NodeListOf<HTMLEmbedElement>;
    "feblend": NodeListOf<SVGFEBlendElement>;
    "fecolormatrix": NodeListOf<SVGFEColorMatrixElement>;
    "fecomponenttransfer": NodeListOf<SVGFEComponentTransferElement>;
    "fecomposite": NodeListOf<SVGFECompositeElement>;
    "feconvolvematrix": NodeListOf<SVGFEConvolveMatrixElement>;
    "fediffuselighting": NodeListOf<SVGFEDiffuseLightingElement>;
    "fedisplacementmap": NodeListOf<SVGFEDisplacementMapElement>;
    "fedistantlight": NodeListOf<SVGFEDistantLightElement>;
    "feflood": NodeListOf<SVGFEFloodElement>;
    "fefunca": NodeListOf<SVGFEFuncAElement>;
    "fefuncb": NodeListOf<SVGFEFuncBElement>;
    "fefuncg": NodeListOf<SVGFEFuncGElement>;
    "fefuncr": NodeListOf<SVGFEFuncRElement>;
    "fegaussianblur": NodeListOf<SVGFEGaussianBlurElement>;
    "feimage": NodeListOf<SVGFEImageElement>;
    "femerge": NodeListOf<SVGFEMergeElement>;
    "femergenode": NodeListOf<SVGFEMergeNodeElement>;
    "femorphology": NodeListOf<SVGFEMorphologyElement>;
    "feoffset": NodeListOf<SVGFEOffsetElement>;
    "fepointlight": NodeListOf<SVGFEPointLightElement>;
    "fespecularlighting": NodeListOf<SVGFESpecularLightingElement>;
    "fespotlight": NodeListOf<SVGFESpotLightElement>;
    "fetile": NodeListOf<SVGFETileElement>;
    "feturbulence": NodeListOf<SVGFETurbulenceElement>;
    "fieldset": NodeListOf<HTMLFieldSetElement>;
    "figcaption": NodeListOf<HTMLElement>;
    "figure": NodeListOf<HTMLElement>;
    "filter": NodeListOf<SVGFilterElement>;
    "font": NodeListOf<HTMLFontElement>;
    "footer": NodeListOf<HTMLElement>;
    "foreignobject": NodeListOf<SVGForeignObjectElement>;
    "form": NodeListOf<HTMLFormElement>;
    "frame": NodeListOf<HTMLFrameElement>;
    "frameset": NodeListOf<HTMLFrameSetElement>;
    "g": NodeListOf<SVGGElement>;
    "h1": NodeListOf<HTMLHeadingElement>;
    "h2": NodeListOf<HTMLHeadingElement>;
    "h3": NodeListOf<HTMLHeadingElement>;
    "h4": NodeListOf<HTMLHeadingElement>;
    "h5": NodeListOf<HTMLHeadingElement>;
    "h6": NodeListOf<HTMLHeadingElement>;
    "head": NodeListOf<HTMLHeadElement>;
    "header": NodeListOf<HTMLElement>;
    "hgroup": NodeListOf<HTMLElement>;
    "hr": NodeListOf<HTMLHRElement>;
    "html": NodeListOf<HTMLHtmlElement>;
    "i": NodeListOf<HTMLElement>;
    "iframe": NodeListOf<HTMLIFrameElement>;
    "image": NodeListOf<SVGImageElement>;
    "img": NodeListOf<HTMLImageElement>;
    "input": NodeListOf<HTMLInputElement>;
    "ins": NodeListOf<HTMLModElement>;
    "isindex": NodeListOf<HTMLUnknownElement>;
    "kbd": NodeListOf<HTMLElement>;
    "keygen": NodeListOf<HTMLElement>;
    "label": NodeListOf<HTMLLabelElement>;
    "legend": NodeListOf<HTMLLegendElement>;
    "li": NodeListOf<HTMLLIElement>;
    "line": NodeListOf<SVGLineElement>;
    "lineargradient": NodeListOf<SVGLinearGradientElement>;
    "link": NodeListOf<HTMLLinkElement>;
    "listing": NodeListOf<HTMLPreElement>;
    "map": NodeListOf<HTMLMapElement>;
    "mark": NodeListOf<HTMLElement>;
    "marker": NodeListOf<SVGMarkerElement>;
    "marquee": NodeListOf<HTMLMarqueeElement>;
    "mask": NodeListOf<SVGMaskElement>;
    "menu": NodeListOf<HTMLMenuElement>;
    "meta": NodeListOf<HTMLMetaElement>;
    "metadata": NodeListOf<SVGMetadataElement>;
    "meter": NodeListOf<HTMLMeterElement>;
    "nav": NodeListOf<HTMLElement>;
    "nextid": NodeListOf<HTMLUnknownElement>;
    "nobr": NodeListOf<HTMLElement>;
    "noframes": NodeListOf<HTMLElement>;
    "noscript": NodeListOf<HTMLElement>;
    "object": NodeListOf<HTMLObjectElement>;
    "ol": NodeListOf<HTMLOListElement>;
    "optgroup": NodeListOf<HTMLOptGroupElement>;
    "option": NodeListOf<HTMLOptionElement>;
    "output": NodeListOf<HTMLOutputElement>;
    "p": NodeListOf<HTMLParagraphElement>;
    "param": NodeListOf<HTMLParamElement>;
    "path": NodeListOf<SVGPathElement>;
    "pattern": NodeListOf<SVGPatternElement>;
    "picture": NodeListOf<HTMLPictureElement>;
    "plaintext": NodeListOf<HTMLElement>;
    "polygon": NodeListOf<SVGPolygonElement>;
    "polyline": NodeListOf<SVGPolylineElement>;
    "pre": NodeListOf<HTMLPreElement>;
    "progress": NodeListOf<HTMLProgressElement>;
    "q": NodeListOf<HTMLQuoteElement>;
    "radialgradient": NodeListOf<SVGRadialGradientElement>;
    "rect": NodeListOf<SVGRectElement>;
    "rt": NodeListOf<HTMLElement>;
    "ruby": NodeListOf<HTMLElement>;
    "s": NodeListOf<HTMLElement>;
    "samp": NodeListOf<HTMLElement>;
    "script": NodeListOf<HTMLScriptElement>;
    "section": NodeListOf<HTMLElement>;
    "select": NodeListOf<HTMLSelectElement>;
    "small": NodeListOf<HTMLElement>;
    "source": NodeListOf<HTMLSourceElement>;
    "span": NodeListOf<HTMLSpanElement>;
    "stop": NodeListOf<SVGStopElement>;
    "strike": NodeListOf<HTMLElement>;
    "strong": NodeListOf<HTMLElement>;
    "style": NodeListOf<HTMLStyleElement>;
    "sub": NodeListOf<HTMLElement>;
    "summary": NodeListOf<HTMLElement>;
    "sup": NodeListOf<HTMLElement>;
    "svg": NodeListOf<SVGSVGElement>;
    "switch": NodeListOf<SVGSwitchElement>;
    "symbol": NodeListOf<SVGSymbolElement>;
    "table": NodeListOf<HTMLTableElement>;
    "tbody": NodeListOf<HTMLTableSectionElement>;
    "td": NodeListOf<HTMLTableDataCellElement>;
    "template": NodeListOf<HTMLTemplateElement>;
    "text": NodeListOf<SVGTextElement>;
    "textpath": NodeListOf<SVGTextPathElement>;
    "textarea": NodeListOf<HTMLTextAreaElement>;
    "tfoot": NodeListOf<HTMLTableSectionElement>;
    "th": NodeListOf<HTMLTableHeaderCellElement>;
    "thead": NodeListOf<HTMLTableSectionElement>;
    "time": NodeListOf<HTMLTimeElement>;
    "title": NodeListOf<HTMLTitleElement>;
    "tr": NodeListOf<HTMLTableRowElement>;
    "track": NodeListOf<HTMLTrackElement>;
    "tspan": NodeListOf<SVGTSpanElement>;
    "tt": NodeListOf<HTMLElement>;
    "u": NodeListOf<HTMLElement>;
    "ul": NodeListOf<HTMLUListElement>;
    "use": NodeListOf<SVGUseElement>;
    "var": NodeListOf<HTMLElement>;
    "video": NodeListOf<HTMLVideoElement>;
    "view": NodeListOf<SVGViewElement>;
    "wbr": NodeListOf<HTMLElement>;
    "xmp": NodeListOf<HTMLPreElement>;
}

declare var Audio: {new(src?: string): HTMLAudioElement; };
declare var Image: {new(width?: number, height?: number): HTMLImageElement; };
declare var applicationCache: ApplicationCache;
declare var clientInformation: Navigator;
// declare var closed: boolean;
declare var defaultStatus: string;
declare var devicePixelRatio: number;
declare var doNotTrack: string;
// only exist on Firefox: https://developer.mozilla.org/en-US/docs/Web/API/Window/fullScreen
// declare var fullScreen: boolean | undefined;
// On Firefox: only 63, 64 and 66+: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/66#DOM_events
// declare var event: -42;
/*
declare var external: External;
*/
declare var frameElement: Element | null;
declare var frames: Window[];
declare var history: History;
declare var innerHeight: unknown;
declare var innerWidth: number;
// declare var length: number;
declare var location: Location;
declare var locationbar: BarProp;
declare var menubar: BarProp;
// declare const name: never;
declare var navigator: Navigator;
declare var offscreenBuffering: string | boolean;
declare var onabort: (this: Window, ev: UIEvent) => any;
declare var onafterprint: (this: Window, ev: Event) => any;
declare var onbeforeprint: (this: Window, ev: Event) => any;
declare var onbeforeunload: (this: Window, ev: BeforeUnloadEvent) => any;
declare var onblur: (this: Window, ev: FocusEvent) => any;
declare var oncanplay: (this: Window, ev: Event) => any;
declare var oncanplaythrough: (this: Window, ev: Event) => any;
declare var onchange: (this: Window, ev: Event) => any;
declare var onclick: (this: Window, ev: MouseEvent) => any;
declare var oncompassneedscalibration: (this: Window, ev: Event) => any;
declare var oncontextmenu: (this: Window, ev: PointerEvent) => any;
declare var ondblclick: (this: Window, ev: MouseEvent) => any;
declare var ondrag: (this: Window, ev: DragEvent) => any;
declare var ondragend: (this: Window, ev: DragEvent) => any;
declare var ondragenter: (this: Window, ev: DragEvent) => any;
declare var ondragleave: (this: Window, ev: DragEvent) => any;
declare var ondragover: (this: Window, ev: DragEvent) => any;
declare var ondragstart: (this: Window, ev: DragEvent) => any;
declare var ondrop: (this: Window, ev: DragEvent) => any;
declare var ondurationchange: (this: Window, ev: Event) => any;
declare var onemptied: (this: Window, ev: Event) => any;
declare var onerror: ErrorEventHandler;
declare var onfocus: (this: Window, ev: FocusEvent) => any;
declare var onhashchange: (this: Window, ev: HashChangeEvent) => any;
declare var oninput: (this: Window, ev: Event) => any;
declare var oninvalid: (this: Window, ev: Event) => any;
declare var onkeydown: (this: Window, ev: KeyboardEvent) => any;
declare var onkeypress: (this: Window, ev: KeyboardEvent) => any;
declare var onkeyup: (this: Window, ev: KeyboardEvent) => any;
declare var onload: (this: Window, ev: Event) => any;
declare var onloadeddata: (this: Window, ev: Event) => any;
declare var onloadedmetadata: (this: Window, ev: Event) => any;
declare var onloadstart: (this: Window, ev: Event) => any;
declare var onmessage: (this: Window, ev: MessageEvent) => any;
declare var onmousedown: (this: Window, ev: MouseEvent) => any;
declare var onmouseenter: (this: Window, ev: MouseEvent) => any;
declare var onmouseleave: (this: Window, ev: MouseEvent) => any;
declare var onmousemove: (this: Window, ev: MouseEvent) => any;
declare var onmouseout: (this: Window, ev: MouseEvent) => any;
declare var onmouseover: (this: Window, ev: MouseEvent) => any;
declare var onmouseup: (this: Window, ev: MouseEvent) => any;
declare var onmousewheel: (this: Window, ev: WheelEvent) => any;
declare var onoffline: (this: Window, ev: Event) => any;
declare var ononline: (this: Window, ev: Event) => any;
declare var onorientationchange: (this: Window, ev: Event) => any;
declare var onpagehide: (this: Window, ev: PageTransitionEvent) => any;
declare var onpageshow: (this: Window, ev: PageTransitionEvent) => any;
declare var onpause: (this: Window, ev: Event) => any;
declare var onplay: (this: Window, ev: Event) => any;
declare var onplaying: (this: Window, ev: Event) => any;
declare var onpopstate: (this: Window, ev: PopStateEvent) => any;
declare var onprogress: (this: Window, ev: ProgressEvent) => any;
declare var onratechange: (this: Window, ev: Event) => any;
declare var onreadystatechange: (this: Window, ev: ProgressEvent) => any;
declare var onreset: (this: Window, ev: Event) => any;
declare var onresize: (this: Window, ev: UIEvent) => any;
declare var onscroll: (this: Window, ev: UIEvent) => any;
declare var onseeked: (this: Window, ev: Event) => any;
declare var onseeking: (this: Window, ev: Event) => any;
declare var onselect: (this: Window, ev: UIEvent) => any;
declare var onstalled: (this: Window, ev: Event) => any;
declare var onstorage: (this: Window, ev: StorageEvent) => any;
declare var onsubmit: (this: Window, ev: Event) => any;
declare var onsuspend: (this: Window, ev: Event) => any;
declare var ontimeupdate: (this: Window, ev: Event) => any;
declare var ontouchcancel: (ev: TouchEvent) => any;
declare var ontouchend: (ev: TouchEvent) => any;
declare var ontouchmove: (ev: TouchEvent) => any;
declare var ontouchstart: (ev: TouchEvent) => any;
declare var onunload: (this: Window, ev: Event) => any;
declare var onvolumechange: (this: Window, ev: Event) => any;
declare var onwaiting: (this: Window, ev: Event) => any;
/*
declare var opener: any;
declare var orientation: string | number;
declare var outerHeight: number;
declare var outerWidth: number;
declare var pageXOffset: number;
declare var pageYOffset: number;
declare var personalbar: BarProp;
declare var screen: Screen;
declare var screenLeft: number;
declare var screenTop: number;
declare var screenX: number;
declare var screenY: number;
declare var scrollbars: BarProp;
declare var self: Window;
// declare var status: string;
declare var statusbar: BarProp;
declare var styleMedia: StyleMedia;
declare var toolbar: BarProp;
*/
declare var top: Window;
declare var scrollX: number;
declare var scrollY: number;
declare function alert(message?: any): void;
// declare function blur(): void;
declare function cancelAnimationFrame(handle: number): void;
declare function captureEvents(): void;
// declare function close(): void;
declare function confirm(message?: string): boolean;
declare function focus(): void;
declare function getComputedStyle(elt: Element, pseudoElt?: string): CSSStyleDeclaration;
// removed since Chrome 64
//declare function getMatchedCSSRules(elt: Element, pseudoElt?: string): CSSRuleList;
declare function getSelection(): Selection;
declare function matchMedia(mediaQuery: string): MediaQueryList;
declare function moveBy(x?: number, y?: number): void;
declare function moveTo(x?: number, y?: number): void;
declare function open(url?: string, target?: string, features?: string, replace?: boolean): Window;
declare function postMessage(message: any, targetOrigin: string, transfer?: any[]): void;
// declare function print(): void;
declare function prompt(message?: string, _default?: string): string | null;
declare function releaseEvents(): void;
declare function requestAnimationFrame(callback: FrameRequestCallback): number;
declare function resizeBy(x?: number, y?: number): void;
declare function resizeTo(x?: number, y?: number): void;
declare function scroll(x?: number, y?: number): void;
declare function scrollBy(x?: number, y?: number): void;
declare function scrollBy(options?: ScrollToOptions): void;
declare function scrollTo(x?: number, y?: number): void;
declare function webkitCancelAnimationFrame(handle: number): void;
declare function webkitConvertPointFromNodeToPage(node: Node, pt: WebKitPoint): WebKitPoint;
declare function webkitConvertPointFromPageToNode(node: Node, pt: WebKitPoint): WebKitPoint;
declare function webkitRequestAnimationFrame(callback: FrameRequestCallback): number;
// declare function toString(): string;
declare function dispatchEvent(evt: Event): boolean;
declare function removeEventListener<K extends keyof WindowEventMap>(type: K,
  listener: (this: Window, ev: WindowEventMap[K] & ToPrevent) => ELRet,
  useCapture?: EventListenerOptions
  ): void;
declare function removeEventListener(type: string, listener: EventListenerOrEventListenerObject,
  useCapture?: EventListenerOptions | boolean): void;
declare var sessionStorage: Storage;
declare var localStorage: Storage;
declare var console: Console;
declare var onpointercancel: (this: Window, ev: PointerEvent) => any;
declare var onpointerdown: (this: Window, ev: PointerEvent) => any;
declare var onpointerenter: (this: Window, ev: PointerEvent) => any;
declare var onpointerleave: (this: Window, ev: PointerEvent) => any;
declare var onpointermove: (this: Window, ev: PointerEvent) => any;
declare var onpointerout: (this: Window, ev: PointerEvent) => any;
declare var onpointerover: (this: Window, ev: PointerEvent) => any;
declare var onpointerup: (this: Window, ev: PointerEvent) => any;
declare var onwheel: (this: Window, ev: WheelEvent) => any;
interface Body {
  readonly bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}
type ResponseType = "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect";
interface Response extends Body {
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
  readonly headers: Map<string, string>
  clone(): Response;
}
interface Request {
  cache: string;
  referrer: string;
}
declare var Request: {
  new (_invalidArg: "should never call this"): Request
  prototype: Request;
}
declare function clearInterval(handle: number): void;
declare function clearTimeout(handle: number): void;
declare function atob(encodedString: string): string;
declare function btoa(rawString: string): string;
declare var performance: Performance;
declare function addEventListener<K extends keyof WindowEventMap>(type: K,
  listener: (this: Window, ev: WindowEventMap[K] & ToPrevent) => ELRet,
  useCapture?: EventListenerOptions
  ): void;
declare var close: unknown;
declare function addEventListener(type: string, listener: EventListenerOrEventListenerObject,
  useCapture?: EventListenerOptions | boolean): void;
interface RequestIdleCallback {
  (callback: (idleDeadline: { didTimeout: boolean }) => void, options?: { timeout?: number }): number;
}
declare var requestIdleCallback: RequestIdleCallback | undefined;
type AAGUID = string;
type AlgorithmIdentifier = string | Algorithm;
type ConstrainBoolean = boolean | ConstrainBooleanParameters;
type ConstrainDOMString = string | string[] | ConstrainDOMStringParameters;
type ConstrainDouble = number | ConstrainDoubleRange;
type ConstrainLong = number | ConstrainLongRange;
type IDBKeyPath = string;
type KeyFormat = string;
type KeyType = string;
type KeyUsage = string;
type payloadtype = number;
type ScrollBehavior = "auto" | "instant" | "smooth";
type ScrollLogicalPosition = "start" | "center" | "end" | "nearest";
type IDBValidKey = number | string | Date | IDBArrayKey;
type BufferSource = ArrayBuffer | ArrayBufferView;
type MouseWheelEvent = WheelEvent;
type ScrollRestoration = "auto" | "manual";
