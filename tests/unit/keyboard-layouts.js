#!/usr/bin/env node

let layouts = [
`# French

&é"'(-è_çà)=
azertyuiop^$*
qsdfghjklmù
wxcvbn,;:!
`,

`# German (German (IBM) is the same)

1234567890ß
qwertzuiopü+#
asdfghjklöä
yxcvbnm,.-
`,

`# Spanish

1234567890'¡
qwertyuiop+ç
asdfghjklñ
zxcvbnm,.-

## ESV

1234567890-
qwertyuiop÷
asdfghjklñç
zxcvbnm,.=
`,

`# Português

1234567890'«
qwertyuiop+´~
asdfghjklçº
zxcvbnm,.-

## PTB

1234567890-=
qwertyuiop´[]
asdfghjklç~~
zxcvbnm,.;
`,

`# Russian

1234567890-=
йцукенгшщзхъ\
фывапролджэ
ячсмитьбю.
`,

`# Cyrillic

1234567890'+
љњертзуиопшђж
асдфгхјклчћ
ѕџцвбнм,.-
`,

`# Arabic

1234567890-=
ضصثقفغعهخحجد\
شسيبلاتنمكط
ئءؤرلاىةوزظ
`,

`# Korean

1234567890-=
qwertyuiop[]\
asdfghjkl;'
zxcvbnm,./

# Turkish
1234567890*-
qwertyuıopğü,
asdfghjklşi
zxcvbnmöç.

!'^+%&/()=?_
QWERTYUIOPĞÜ;
ASDFGHJKLŞİ
ZXCVBNMÖÇ:
`
    ].join("\n").split("\n").filter(
    line => !(line[0] === "#" || line[0] === "(" && line.slice(-1) === ")")
    ).join("");
const getRe = name => name instanceof RegExp ? name : new RegExp(`[\\p{${name}}]`, "ug");
const filter = (text, re) => [...new Set(text.match(re, ""))].sort();
const parse = arr => [
    arr,
    arr.map(i=>i.codePointAt()).filter(i => i >= 128),
    arr.length
    ];
const print = (category, text) => console.log(`${category}:`, ...parse(filter(text, getRe(category))));
print("Ll", layouts);
print("Lo", layouts);
print("Lu", layouts);
print("Lt", layouts);
print("Lm", layouts);

const range = (start, end, conv=String.fromCharCode) => {
  const arr = [];
  for (let i = start, end2 = end || start + 1; i < end2; i++) { arr.push(i); }
  return conv ? conv(...arr) : arr;
};
const hex = (start, end) => range(start, end, null).map(i => i.toString(16));

print("Ll", range(1070, 1120));
print("Lo", range(1569, 1614));

var hasConsole = 1;
// hasConsole = 0;
if (typeof require === "function" && hasConsole) {
  Object.assign(require('repl').start("node> ").context, {
    hex, range, print, filter, parse, getRe, layouts
  });
}
