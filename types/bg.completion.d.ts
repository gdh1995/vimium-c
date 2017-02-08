/// <reference path="../background/bg.d.ts" />

import Domain = CompletersNS.Domain;
import MatchType = CompletersNS.MatchType;

type MatchRange = [number, number];

interface DecodedItem {
  readonly url: string;
  text: string;
}

interface Bookmark extends DecodedItem {
  readonly url: string;
  readonly text: string;
  readonly path: string;
  readonly title: string;
}
interface JSBookmark extends Bookmark {
  readonly jsUrl: string;
  readonly jsText: string;
}
interface PureHistoryItem {
  lastVisitTime: number;
  title: string;
  readonly url: string;
}
interface HistoryItem extends DecodedItem, PureHistoryItem {
}
interface UrlItem {
  url: string;
  title: string;
  sessionId?: string | number;
}

interface TextTab extends chrome.tabs.Tab {
  text: string;  
}

interface Completer {
  filter(query: CompletersNS.QueryStatus, index: number): void;
}
interface PreCompleter extends Completer {
  preFilter(query: CompletersNS.QueryStatus, failIfNull: true): void | true;
  preFilter(query: CompletersNS.QueryStatus): void;
}
interface QueryTerms extends Array<string> {
  more?: string;
}

declare const enum FirstQuery {
  nothing = 0,
  waitFirst = 1,
  searchEngines = 2,
  history = 3,
  tabs = 4,

  QueryTypeMask = 63,
  historyIncluded = 67,

}

interface SuggestionConstructor {
  new (type: string, url: string, text: string, title: string,
        computeRelevancy: (this: void, sug: CompletersNS.CoreSuggestion, data?: number) => number,
        extraData?: number): Suggestion;
}

declare const enum RegExpCacheIndex {
  word = 0, start = 1, part = 2
}
type CachedRegExp = (RegExpOne | RegExpI) & RegExpSearchable<0>;
type RegExpCacheDict = [SafeDict<CachedRegExp>, SafeDict<CachedRegExp>, SafeDict<CachedRegExp>];

type HistoryCallback = (history: ReadonlyArray<HistoryItem>) => any;

interface UrlToDecode extends String {
  url?: void;
}
type ItemToDecode = UrlToDecode | DecodedItem;

type CompletersMap = {
    [P in CompletersNS.ValidTypes]: ReadonlyArray<Completer>;
}

interface Window {
  Completers: CompletersMap & GlobalCompletersConstructor;
}
