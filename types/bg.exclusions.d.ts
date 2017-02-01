/// <reference path="bg.d.ts" />

declare namespace ExclusionsNS {
  interface Tester {
    (this: void, url: string): boolean;
  }
  type TesterDict = SafeDict<ExclusionsNS.Tester>;
  type Rules = Array<Tester | string>;

  class ExclusionsCls {
    testers: SafeDict<Tester> | null;
    getRe (pattern: string): Tester;
    _startsWith(this: string, url: string): boolean;
    _listening: boolean;
    _listeningHash: boolean;
    onlyFirstMatch: boolean;
    rules: Rules;
    setRules (newRules: StoredRule[]): void;
    GetPattern (this: void, url: string): string | null;
    getOnURLChange (): null | Listener;
    format (rules: StoredRule[]): Rules;
    getTemp (this: ExcCls, url: string, rules: StoredRule[]): string | null;
    RefreshStatus (this: void, old_is_empty: boolean): void;
  }
}
