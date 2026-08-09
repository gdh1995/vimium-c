<a name="readme"></a><h2 align="center">
  <img src="icons/icon128.png" width="32" height="32" alt="" />
  <span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span> - Všetko cez klávesnicu
</h2>

[![Verzia](https://img.shields.io/github/v/release/gdh1995/vimium-c?logo=GitHub&label=gdh1995%2Fvimium-c&color=critical
  )](https://github.com/gdh1995/vimium-c/releases)
[![Licencia Apache-2.0](https://img.shields.io/badge/licencia-Apache--2.0-blue)](LICENSE.txt)
[![Hviezdičky na GitHube](https://img.shields.io/github/stars/gdh1995/vimium-c?logo=GitHub&labelColor=181717&color=critical
  )](https://github.com/gdh1995/vimium-c/stargazers)
[![Hviezdička na Gitee](https://gitee.com/gdh1995/vimium-c/badge/star.svg?theme=dark
  )](https://gitee.com/gdh1995/vimium-c/stargazers)

[![Firefox 101+](https://img.shields.io/amo/v/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=Firefox%20101%2B&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![používatelia](https://img.shields.io/amo/users/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=users&labelColor=FF7139
  )](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme)
[![hodnotenie](https://img.shields.io/amo/rating/vimium-c@gdh1995.cn?logo=Firefox%20Browser&logoColor=white&label=rating&labelColor=FF7139&color=blue
  )](https://addons.mozilla.org/firefox/addon/vimium-c/reviews/?src=external-readme)
[![Edge 102+](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=Edge%20102%2B&prefix=v&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![používatelia](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=users&query=%24.activeInstallCount&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![hodnotenie](https://img.shields.io/badge/dynamic/json?logo=Microsoft%20Edge&label=rating&query=%24.averageRating&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Faibcglbfblnogfjhbcmmpobjhnomhcdo
  )](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo)
[![Chrome 102+](https://img.shields.io/chrome-web-store/v/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=Chrome%20102%2B&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
[![používatelia](https://img.shields.io/chrome-web-store/users/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=users&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)
[![hodnotenie](https://img.shields.io/chrome-web-store/rating/hfjbmagddngcpeloejdejnfgbamkjaeg?logo=Google%20Chrome&logoColor=white&label=rating&labelColor=4285F4&color=critical
  )](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg)

**Pozrite si na [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/vimium-c/?src=external-readme) /
[Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/aibcglbfblnogfjhbcmmpobjhnomhcdo) /
[Chrome Web Store](https://chrome.google.com/webstore/detail/vimium-c-all-by-keyboard/hfjbmagddngcpeloejdejnfgbamkjaeg
  )**

Vimium C je <span style="color: #a55e18;">C</span>ustomizovaná (prispôsobená) verzia
  [<span style="color: #2f508e;">Vim</span>ia](https://github.com/philc/vimium)
  (na klikanie na obsah webových stránok a ovládanie okien prehliadača iba pomocou klávesnice),
  ktorá pridáva [**k**ontextové mapovanie](https://github.com/gdh1995/vimium-c/wiki/Map-a-key-to-different-commands-on-different-websites),
  [globálne skrat**k**y](https://github.com/gdh1995/vimium-c/wiki/Trigger-commands-in-an-input-box#user-content-shortcut),
  [postupnosti **k**príkazov](https://github.com/gdh1995/vimium-c/wiki/Auto-run-a-tree-of-commands),
  podporu čínštiny
  a [funkciu vkladania (inje**k**cie)](https://github.com/gdh1995/vimium-c/wiki/Inject-into-other-extensions),
  v <span style="color: #a55e18;">**C**</span>-štýle kódu pre rýchlejšie akcie a nižšiu spotrebu zdrojov.

[阅读中文介绍 (popis v čínštine) 。](README-zh.md)

Tento projekt vyvíja a spravuje najmä [gdh1995](https://github.com/gdh1995) (Gong Dahan),
a je open-source pod licenciou [Apache-2.0](LICENSE.txt).

Podporuje novú Microsoft Edge, Google Chrome a ďalšie prehliadače založené na Chromiu
  s verziou jadra >= 102, a má výbornú podporu pre novšiu verziu Firefoxu (od verzie 101.0, desktop).
Dokáže bežať dokonca aj na Microsoft Edge (EdgeHTML), hoci sa tam stále vyskytujú niektoré chyby.
Ak sa skompiluje znova zo zdrojového kódu, Vimium C dokáže podporovať Chromium 32~108 a Firefox 63~100.

![Ukážka používania Vimium C](https://gdh1995.cn/vimium-c/demo.gif)

Tento projekt je hosťovaný na https://github.com/gdh1995/vimium-c a https://gitee.com/gdh1995/vimium-c .

Časť staršieho kódu Vimium C bola pod licenciou MIT,
a môžete ho získať na https://github.com/gdh1995/vimium-c/tree/MIT-licensed-v1 .

Starší názov tohto projektu bol "Vimium++", ktorý sa prestal používať 21. 8. 2018.


# Klávesové skratky

_Táto časť je upravená z [philc/vimium](https://github.com/philc/vimium#keyboard-bindings)._

Modifikačné klávesy sa zapisujú ako `<c-x>`, `<m-x>` a `<a-x>` pre Ctrl+x, Meta+x a Alt+x.
Pre Shift+X a Ctrl+Shift+X jednoducho napíšte `X` a `<c-s-x>`.
Ako si tieto skratky prispôsobiť, sa dozviete v ďalšej časti.

Po nainštalovaní Vimium C si tento zoznam klávesových skratiek môžete kedykoľvek zobraziť napísaním `?`.

Navigácia po aktuálnej stránke:

    ?       zobrazí dialógové okno pomocníka so zoznamom všetkých dostupných klávesov
    h       posun vľavo
    j       posun nadol
    k       posun nahor
    l       posun vpravo
    gg      posun na vrch stránky
    G       posun na spodok stránky
    d       posun nadol o pol stránky
    u       posun nahor o pol stránky
    f       zobrazí rady pre odkazy a tlačidlá na otvorenie v aktuálnej karte
    F       zobrazí rady pre odkazy a otvorí odkaz na novej karte
    r       znova načíta stránku
    gs      zobrazí zdrojový kód
    i       vstup do režimu vkladania -- všetky príkazy budú ignorované, kým nestlačíte Esc na ukončenie
    yy      skopíruje aktuálnu URL adresu do schránky
    yf      skopíruje URL adresu odkazu do schránky
    gf      prejde dopredu na nasledujúci rámec
    gF      zameria hlavný/vrchný rámec

Navigácia na nové stránky:

    o       otvorí URL adresu, záložku alebo položku histórie, na anglickom písmene "o"
    O       otvorí URL adresu, záložku alebo položku histórie na novej karte, na anglickom písmene "O"
    b       otvorí záložku
    B       otvorí záložku na novej karte

Používanie vyhľadávania:

    /       vstup do režimu vyhľadávania
              -- napíšte hľadaný výraz a stlačte enter na vyhľadanie, alebo Esc na zrušenie
    n       prejde dopredu na nasledujúcu zhodu vyhľadávania
    N       prejde dozadu na predchádzajúcu zhodu vyhľadávania

Pre pokročilé použitie si pozrite [regulárne výrazy](https://github.com/philc/vimium/wiki/Find-Mode) na wiki.

Navigácia v histórii:

    H       prejde späť v histórii
    L       prejde dopredu v histórii

Práca s kartami:

    J, gT   prejde o kartu vľavo
    K, gt   prejde o kartu vpravo
    g0      prejde na prvú kartu. Pomocou `ng0` prejdete na n-tú kartu, na `g` a číslicu `0`
    g$      prejde na poslednú kartu
    ^       navštívi predtým navštívenú kartu
    t       vytvorí kartu
    yt      duplikuje aktuálnu kartu
    x       zavrie aktuálnu kartu
    X       obnoví zatvorenú kartu (t. j. vráti príkaz `x`)
    T       vyhľadáva medzi otvorenými kartami
    W       presunie aktuálnu kartu do nového okna
    <a-p>   pripne/odopne aktuálnu kartu

Používanie značiek:

    ma, mA  nastaví miestnu značku "a" (globálnu značku "A")
    `a, `A  prejde na miestnu značku "a" (globálnu značku "A")
    ``      prejde späť na pozíciu pred predchádzajúcim skokom
              -- teda pred predchádzajúcim gg, G, n, N, / alebo `a

Ďalšie pokročilé príkazy pre prehliadanie:

    ]], [[  nasleduje odkaz označený "next" alebo ">" ("previous" alebo "<")
              - užitočné pri prehliadaní stránkovaných webov
    <a-f>   otvorí viacero odkazov na novej karte
    gi      zameria prvé (alebo n-té) textové pole na stránke. Pomocou <tab> prepínajte medzi možnosťami.
    gu      prejde o úroveň vyššie v hierarchii URL adresy
    gU      prejde na koreň hierarchie URL adresy
    ge      upraví aktuálnu URL adresu
    gE      upraví aktuálnu URL adresu a otvorí ju na novej karte
    zH      posunie úplne doľava
    zL      posunie úplne doprava
    v       vstup do vizuálneho režimu; p/P vloží a prejde, y skopíruje, v/c/V prepína vizuálny/riadkový/kurzorový režim
    V       vstup do vizuálneho riadkového režimu
    yc      vyberie prvé slovo vety a vstúpi do vizuálneho režimu

Vimium C podporuje opakovanie príkazov, takže napríklad stlačením `5t` rýchlo otvoríte 5 kariet. `<esc>`
(alebo `<c-[>`) vymaže akékoľvek čiastočné príkazy vo fronte a tiež ukončí režim vkladania a vyhľadávania.

Existuje aj niekoľko pokročilých príkazov, ktoré tu nie sú zdokumentované; úplný zoznam nájdete v dialógovom okne pomocníka (napíšte `?`).


# Vlastné mapovanie klávesov

_Táto časť je upravená z [philc/vimium](https://github.com/philc/vimium#custom-key-mappings)._

Po nainštalovaní Vimium C otvorí novú kartu so svojím predvoleným mapovaním klávesov,
a tiež si môžete otvoriť stránku nastavení Vimium C a stlačiť `?` (zvyčajne je to `Shift+/`), aby ste si toto mapovanie zobrazili znova.

V časti "Vlastné mapovanie klávesov" na stránke nastavení môžete ktorékoľvek z predvolených mapovaní zmeniť alebo zrušiť.

Na každý riadok napíšte jeden z nasledujúcich príkazov mapovania:

* `map <kláves> príkaz`: Namapuje _kláves_ na príkaz Vimium C. Preváži predvolené správanie webovej stránky (ak nejaké je).
* `mapKey <kláves> <iný_kláves>`: Vimium C bude považovať _kláves_ za _iný kláves_. Neovplyvňuje prehliadač ani webové stránky.
* `unmap <kláves>`: Zruší mapovanie klávesu a obnoví predvolené správanie (ak nejaké je).
* `unmapAll`: Zruší všetky mapovania. Je to užitočné, ak chcete úplne vymazať predvolené príkazy Vimium C a začať
  úplne od začiatku s vlastným nastavením.

Príklady:

* `map r reload` namapuje kláves r na znovunačítanie stránky.
* `map <c-d> scrollPageDown` namapuje Ctrl+D na posun stránky nadol.
* `unmap r` odstráni akékoľvek mapovanie klávesu r.
* `unmap <c-d>` odstráni akékoľvek mapovanie Ctrl+D a obnoví predvolené správanie webovej stránky alebo prehliadača.
* `unmap g0` odstráni akékoľvek mapovanie klávesu `g` a nasledujúceho klávesu `0`.

Dostupné príkazy Vimium C nájdete cez odkaz "Zobraziť dostupné príkazy" alebo kláves `?` na stránke nastavení.
Názov príkazu sa zobrazuje napravo od popisu v zátvorke.

Ku klávesovým mapovaniam môžete pridávať komentáre tak, že riadok začnete znakom `"` alebo `#`, prípadne medzerou a znakom `#` v riadku.

Nasledujúce špeciálne klávesy sú dostupné na mapovanie:

* `<c-*>`, `<a-*>`, `<s-*>`, `<m-*>` pre Ctrl, Alt, Shift a Meta (Command na macOS) s ľubovoľným klávesom.
  Nahraďte `*` názvom zvoleného klávesu.
* `<left>`, `<right>`, `<up>`, `<down>` pre klávesy so šípkami.
* `<f1>` až `<f12>` pre funkčné klávesy.
* `<space>` pre medzerník.
* `<tab>`, `<enter>`, `<delete>`, `<backspace>`, `<insert>`, `<home>` a `<end>` pre netlačiteľné klávesy

Tu sú niektoré pokročilé spôsoby použitia, ktoré sa líšia od philc/vimium:

* <kbd>Shift</kbd> sa zisťuje automaticky, takže `&` zodpovedá <kbd>Shift+7</kbd> na anglickej klávesnici QWERTY.
  * Ak je však jeden kláves dlhší než 1 znak, obaľte ho `<`+`>` a vložte `s-`
  * Ak chcete spustiť kláves pri stlačení viacerých modifikačných klávesov, zoraďte predpony `a/c/m/s-` podľa abecedy
  * Napríklad tieto názvy klávesov sú platné: `<s-left>`, `<c-j>`, `<a-s-k>`, `<a-#>` a `<a-?>`
* `mapKey <kláves:o> <iný_kláves>` spôsobí, že _kláves_ funguje ako iný kláves iba v špeciálnom režime nazvanom Vomnibar
  * Pravidlá `mapKey` sa vždy uplatnia skôr, než sa kláves porovná s pravidlami `map`
  * Niektoré ďalšie režimy sú uvedené na https://github.com/gdh1995/vimium-c/wiki/Use-in-another-keyboard-layout#per-mode-mapkey
* `map <kláves:i> príkaz` spôsobí, že _kláves_ spustí príkaz iba v režime vkladania, nie v predvolenom normálnom režime
* od verzie v1.99.98 `map! <jeden_kláves>` mapuje _kláves_ v normálnom aj v režime vkladania, pokiaľ nejde o dlhú postupnosť
  * Napríklad `map! jj` je neplatné, ale `map! <home>` a `map! <c-j>` sú vhodné
* `unmap` môže zrušiť iba ručne namapovaný kláves alebo predvolený kláves, takže druhý `unmap <kláves>` môže spôsobiť chybu
  * Ak si nie ste istí, či bol kláves už namapovaný, môžete použiť `unmap!`
* číselné klávesy (`0`-`9` a `-`) sú predvolene namapované na "predponu počtu opakovaní" príkazov, takže sa neposielajú webovým stránkam.
  * A aj po `unmapAll` sa automaticky pridajú späť pri ďalšom `map`
  * kláves `0` môžete zrušiť výslovne pomocou `unmap 0`


# Predstavenie projektu

__<span style="color: #2f508e;">Vim</span>ium <span style="color: #a55e18;">C</span>:__

* [中文介绍 (popis v čínštine)](README-zh.md)
* webové rozšírenie pre Firefox, Microsoft Edge a Google Chrome, ktoré poskytuje navigáciu a ovládanie webu
    pomocou klávesnice, v duchu editora Vim.
* pridáva niekoľko výkonných funkcií a poskytuje viac nastaviteľných detailov a pohodlia.
* tu je jeho [licencia Apache-2.0](LICENSE.txt) a [zásady ochrany osobných údajov](PRIVACY-POLICY.md)
* pôvodný kód je forknutý z [philc/vimium:master](https://github.com/philc/vimium) v roku 2014.
* prispôsobený po preložení z CoffeeScriptu do JavaScriptu a následne do TypeScriptu.

__Ďalšie rozšírenia podporujúce Vimium C:__

* PDF Viewer for Vimium C
  * postavený na (upravenom) [PDF.js](https://github.com/mozilla/pdf.js/),
    a je náhradou za rozšírenie s názvom [PDF Viewer](
      https://chrome.google.com/webstore/detail/pdf-viewer/oemmndcbldboiebfnladdacbdfmadadm)
  * dostupné na [Chrome Web Store](
      https://chrome.google.com/webstore/detail/pdf-viewer-for-vimium-c/nacjakoppgmdcpemlfnfegmlhipddanj)
  * domovská stránka projektu: [vimium-c-helpers/pdf-viewer](https://github.com/gdh1995/vimium-c-helpers/tree/master/pdf-viewer)
* NewTab Adapter
  * preberie nastavenia novej karty prehliadača a otvorí inú nastaviteľnú URL adresu
  * dostupné na [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/newtab-adapter/?src=external-vc-readme) /
    [Chrome Web Store](https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn)
  * domovská stránka projektu: [vimium-c-helpers/newtab](https://github.com/gdh1995/vimium-c-helpers/tree/master/newtab#readme)
* Shortcut Forwarding Tool
  * poskytuje 32 nastaviteľných skratiek a preposiela ich do iného rozšírenia, ako je Vimium C
  * dostupné na
    [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/shortcut-forwarding-tool/?src=external-vc-readme) /
    [Chrome Web Store](
      https://chrome.google.com/webstore/detail/shortcut-forwarding-tool/clnalilglegcjmlgenoppklmfppddien)
  * domovská stránka projektu: [vimium-c-helpers/shortcuts](https://github.com/gdh1995/vimium-c-helpers/tree/master/shortcuts#readme)
* Modified Weidu New Tab (微度新标签页修改版)
  * upravená a odľahčená verzia [www.weidunewtab.com](http://www.weidunewtab.com/) (alebo
      [www.newtabplus.com](http://www.newtabplus.com/) ), iba s čínskym prekladom
  * nepreberá nastavenia novej karty prehliadača; ak je to potrebné, odporúča sa [NewTab Adapter](
      https://chrome.google.com/webstore/detail/newtab-adapter/cglpcedifkgalfdklahhcchnjepcckfn)
  * dostupné na [Chrome Web Store](
      https://chrome.google.com/webstore/detail/微度新标签页修改版/hdnehngglnbnehkfcidabjckinphnief)


<a name="changelog"></a>

# Poznámky k vydaniu

Pozrite si [RELEASE-NOTES.md](RELEASE-NOTES.md).

#### Známe problémy

Existujú niektoré známe problémy v predchádzajúcich alebo najnovších verziách prehliadačov založených na Chromiu,
a viac informácií nájdete na https://github.com/gdh1995/vimium-c/wiki/Known-issues-on-various-versions-of-Chrome .


# Zostavovanie

Ak chcete tento projekt zostaviť manuálne, potrebujete Node.js 13+ a npm. Spustite:

``` bash
npm install typescript
npm install pngjs # potrebné iba pre prehliadače založené na Chromiu
node scripts/tsc
# ./scripts/make.sh vimium_c-debug.zip
```

`gulp local` dokáže zostaviť súbory aj priamo na mieste (pomocou nastaviteľných volieb zostavenia),
zatiaľ čo `gulp dist` zostaví a minimalizuje súbory do `dist/`.

Voľby vrátane `MinCVer` a `BTypes` v [gulp.tsconfig.json](scripts/gulp.tsconfig.json)
  slúžia na ovládanie podporovaných cieľových prehliadačov a nastavenie minimálnej verzie prehliadača.

<a name="donate"></a><a name="donating"></a><a name="donation"></a>

# Darovanie / 捐赠

Vimium C je open-source rozšírenie prehliadača a ktokoľvek si ho môže bezplatne nainštalovať a používať.
Ak naozaj chcete finančne podporiť jeho autora ([gdh1995@qq.com](https://github.com/gdh1995)),
môžete mu venovať akúkoľvek malú sumu peňazí prostredníctvom
  [Open Collective](https://opencollective.com/vimium-c), [PayPal](https://www.paypal.me/gdh1995),
  [Alipay](https://intl.alipay.com/) alebo [WeChat](https://www.wechat.com/). Ďakujeme veľmi pekne!

Čiastočný zoznam darcov nájdete na: https://github.com/gdh1995/vimium-c/wiki/Donation-List .

<img width="240" alt="QR kód Alipay používateľa gdh1995" src="https://gdh1995.cn/alipay-recv-money.png"
  /> <img width="240" alt="QR kód WeChat používateľa gdh1995" src="https://gdh1995.cn/wechat-recv-money.png"
  /> <img width="240" alt="QR kód PayPal používateľa gdh1995" src="https://gdh1995.cn/paypal-recv-money.png" />

# Poďakovanie a licencie

Vimium C: Copyright (c) Gong Dahan. Podrobnosti nájdete v licencii [Apache-2.0](LICENSE.txt).

Prekladové súbory v [_locales/](https://github.com/gdh1995/vimium-c/tree/master/_locales) patria pod licenciu
  [CC-BY-SA-4.0](https://creativecommons.org/licenses/by-sa/4.0/),
okrem tých anglických viet, ktoré sú zhodné s vetami z [philc/vimium](https://github.com/philc/vimium),
  ktoré sú pod licenciou MIT projektu Vimium.

* [Vimium](https://github.com/philc/vimium):
  Copyright (c) 2010 Phil Crosby, Ilya Sukhar.
  Licencované pod [licenciou MIT](https://github.com/philc/vimium/blob/master/MIT-LICENSE.txt).
* [TypeScript](https://github.com/Microsoft/TypeScript):
    a upravené `es.d.ts`, `es/*`, `dom.d.ts` a `chrome.d.ts` v `types/`:
  Copyright (c) Microsoft Corporation (všetky práva vyhradené).
  Licencované pod [licenciou Apache 2.0](https://github.com/microsoft/TypeScript/blob/master/LICENSE.txt).
  Viac na [www.typescriptlang.org](http://www.typescriptlang.org/).
* [Viewer.js](https://github.com/fengyuanchen/viewerjs)
  ([Upravené](https://github.com/gdh1995/viewerjs)):
  Copyright (c) 2015-present Chen Fengyuan.
  Licencované pod [licenciou MIT](https://github.com/fengyuanchen/viewerjs/blob/master/LICENSE).
* [JavaScript Expression Evaluator](https://github.com/silentmatt/expr-eval)
  ([Upravené](https://github.com/gdh1995/js-expression-eval)):
  Copyright (c) 2015 Matthew Crumley.
  Licencované pod [licenciou MIT](
    https://github.com/silentmatt/expr-eval/blob/4327f05412a3046a9b527b6ec3b50843cb0428e8/LICENSE.txt).
* Oranžový obrázok v ikone pochádza z https://pixabay.com/vectors/orange-fruit-mandarin-citrus-fruit-158258/
* [微度新标签页](http://www.weidunewtab.com/):
  Copyright (c) 2012 杭州佐拉网络有限公司 保留所有权利.
* [PDF.js](https://github.com/mozilla/pdf.js/):
  Copyright (c) Mozilla a jednotliví prispievatelia.
  Licencované pod [licenciou Apache 2.0](https://github.com/mozilla/pdf.js/blob/master/LICENSE).

# Vyhlásenie pre platné regióny

[Vimium C](https://microsoftedge.microsoft.com/addons/detail/vimium-c/aibcglbfblnogfjhbcmmpobjhnomhcdo)
    a ostatné rozšírenia zverejnené používateľom [gdh1995](https://github.com/gdh1995)
    sú dostupné pre všetkých ľudí vo *"všetkých regiónoch"*
    obchodov Microsoft Edge Add-ons, Chrome Web Store a niektorých ďalších.
Toto slúži iba na zjednodušenie používania týchto rozšírení, ale<br>
**NEVYJADRUJE**, či už priamo alebo nepriamo, že autor (gdh1995) "súhlasí alebo nemá námietky" voči tomu,
    že "Taiwan" môže byť postavený na roveň "Číne",
    čo bol **nevhodný** stav na (vývojárskych) stránkach obchodov k 3. 6. 2021.

Podľa [Ústavy Čínskej ľudovej republiky](
    http://www.npc.gov.cn/npc/c505/201803/e87e5cd7c1ce46ef866f4ec8e2d709ea.shtml)
    a medzinárodného konsenzu,
***je Taiwan neoddeliteľnou súčasťou posvätného územia Čínskej ľudovej republiky***.
