/// <reference path="../background/bg.d.ts" />

declare namespace ExclusionsNS {
  type Tester = RegExpOne | string;
  type TesterDict = SafeDict<ExclusionsNS.Tester>;
  type Rules = Array<Tester | string>;

  interface ExclusionsCls {
    testers: SafeDict<Tester> | null;
    getRe (pattern: string): Tester;
    _listening: boolean;
    _listeningHash: boolean;
    onlyFirstMatch_: boolean;
    rules: Rules;
    setRules_ (newRules: StoredRule[]): void;
    GetPattern_ (this: void, url: string): string | null;
    getOnURLChange_ (): null | Listener;
    format_ (rules: StoredRule[]): Rules;
    getTemp (this: ExclusionsNS.ExclusionsCls, url: string, rules: StoredRule[]): string | null;
    RefreshStatus_ (this: void, old_is_empty: boolean): void;
    destroy_ (): void;
  }
}
