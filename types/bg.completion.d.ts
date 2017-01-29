/// <reference path="bg.d.ts" />

import Domain = CompletersNS.Domain;
import Callback = CompletersNS.Callback;
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
  filter(query: QueryStatus, index: number): void;
}
interface PreCompleter extends Completer {
  preFilter(query: QueryStatus, failIfNull: true): void | true;
  preFilter(query: QueryStatus): void;
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


declare interface WritableCoreSuggestion {
  type: string;
  url: string;
  title: string;
  text: string;
}

declare type CoreSuggestion = Readonly<WritableCoreSuggestion>;

declare class Suggestion implements CoreSuggestion {
  readonly type: string;
  readonly url: string;
  text: string;
  readonly title: string;
  relevancy: number;

  textSplit?: string;
  titleSplit?: string;
  sessionId?: string | number;
}
interface SuggestionConstructor {
  new (type: string, url: string, text: string, title: string,
        computeRelevancy: (this: void, sug: CoreSuggestion, data?: number) => number,
        extraData?: number): Suggestion;
}

declare const enum RegExpCacheIndex {
  word = 0, start = 1, part = 2
}
type CachedRegExp = RegExpOne | RegExpI;
type RegExpCacheDict = [SafeDict<CachedRegExp>, SafeDict<CachedRegExp>, SafeDict<CachedRegExp>];

type HistoryCallback = (history: ReadonlyArray<HistoryItem>) => any;

interface UrlToDecode extends String {
  url?: void;
}
type ItemToDecode = UrlToDecode | DecodedItem;

type CompletersMap<T> = {
    [P in keyof T]: ReadonlyArray<Completer>;
}

interface Window {
  Completers: CompletersMap<CompletersNS.ValidTypes> & GlobalCompletersConstructor;
}
