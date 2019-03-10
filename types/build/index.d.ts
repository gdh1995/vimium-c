/// <reference no-default-lib="true"/>
/// <reference path="../lib/index.d.ts" />

declare const enum Build {
  MinCVer = BrowserVer.MinSupported, // C35
  BTypes = BrowserType.Chrome | BrowserType.Firefox | BrowserType.Edge, // supported browser types
}
declare const enum BuildStr {
  Commit = "in-develop",
}
