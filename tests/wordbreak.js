"use strict";
/**
 * **C72**:
 * ex-stopped: (0)
 *   stopped-word: 49199 ; matched-non-white: 64240
 * strange chars: 1274
 * ex-skipped: (0)
 *   all-skipped: 21
 * others: 0
 * 
 * **C59**:
 * ex-stopped: (0)
 *   stopped-word: 48467 ; matched-non-white: 64259
 * strange chars: 1255
 * ex-skipped: (0)
 *   all-skipped: 21
 * others: 0
 * 
 * **C58**:
 * ex-stopped: (0)
 *   stopped-word: 48467 ; matched-non-white: 49115
 * strange chars: 4
 * ex-skipped: \u1885\u1886 (2)
 *   all-skipped: 16416
 *   strange-and-non-stopped: 0
 *   new-found-word: \u1885\u1886
 *   unknown-char-may-be-ws:
 * others: 0
 */
/* C50
ex-stopped: (0)
  stopped-word: 48470 ; matched-non-white: 48964
strange chars: 2
ex-skipped: \u005f (1)
  all-skipped: 16569
  strange-and-non-stopped: 0
  new-found-word: \u005f
others: 0
*/
/* C35
ex-stopped: (0)
  stopped-word: 48415 ; matched-non-white: 48765
strange chars: 2
ex-skipped: \u005f\u08a0\u08a2\u08a3\u08a4\u08a5\u08a6\u08a7\u08a8\u08a9\u08aa\u08ab\u08ac\u0ede\u0edf\u10c7\u10cd\u10fd\u10fe\u10ff\u1bba\u1bbb\u1bbc\u1bbd\u1bbe\u1bbf\u1cf5\u1cf6\u2cf2\u2cf3\u2d27\u2d2d\u2d66\u2d67\u9fcc\ua792\ua793\ua7aa\ua7f8\ua7f9\uaae0\uaae1\uaae2\uaae3\uaae4\uaae5\uaae6\uaae7\uaae8\uaae9\uaaea\uaaf2\uaaf3\uaaf4\ufa2e\ufa2f (56)
  all-skipped: 16768
  strange-and-non-stopped: 0
  new-found-word: \u005f
others: 0
*/
var words = "";
var wordsRe = null;
var oldBehavior = /\s/.test("\u180e");
var rightStopRe = oldBehavior ? /[^\s\x85]|\n/ : /[\S\n\u2029\u202f\ufeff]/;

function main() {
	var div = document.querySelector("#test");
	var sel = window.getSelection();
	var strange = 0, strangeAndNotStop = 0,
	stopped = "", stoppedWord = 0, matchedNonWhite = 0,
	skipped = "", allSkipped = 0, newFoundWord = "", unknownCharMayBeWS = "",
	others = 0;
	for (var i = 1; i <= 0xffff; i++) {
		var ch = String.fromCharCode(i);
		var uchar = '\\u' + (0x10000 + i).toString(16).slice(1);
		div.innerHTML = 'ab&#32;&#' + i + ';&#32;c';
		//div.innerText = 'ab ' + ch + ' c'; // note: when setting .innerText, '\r' would be translated into '\n'
		sel.collapse(div, 0);
		sel.modify("extend", "forward", "word");
		var len = (sel + "").length;
		if (len === 3) { // stop early
			if (i === 0x20 || ch === '\t') {
				allSkipped++;
				continue; // multiple HTML spaces are stripped into a single space
			}
			if (!rightStopRe.test(ch)) { // fail in recognizing a word
				stopped += uchar;
				if (stopped.length > 600) {
					break;
				}
			} else {
				matchedNonWhite++;
			}
			stoppedWord += wordsRe.test(ch) ? 1: 0;
		} else if (len === 4) { // strange
			if (!rightStopRe.test(ch)) {
				strangeAndNotStop++;
			}
			strange++;
			//console.log('strange: ', i, uchar, JSON.stringify(sel + ""));
			// if (strange > 100) { break; }
		}
		else if (len === 5) { // skipped
			allSkipped++;
			if ((oldBehavior ? wordsRe : rightStopRe).test(ch)) {
				skipped += uchar;
				if (skipped.length > 600) {
					break;
				}
				div.innerHTML = 'ab&#' + i + ';c';
				//div.innerText = 'ab ' + ch + ' c'; // note: when setting .innerText, '\r' would be translated into '\n'
				sel.collapse(div, 0);
				sel.modify("extend", "forward", "word");
				len = (sel + "").length;
				if (len === 3) { // pass
				} else if (len === 4) {
					newFoundWord += uchar;
				} else {
					unknownCharMayBeWS += uchar;
				}
			}
		} else {
			others++;
			console.log('others: ', i, uchar, ch, JSON.stringify(sel + ""));
			if (others > 100) {
				break;
			}
		}
		if (i % 1000 == 1 && i > 1) {
			console.log((Date.now() % 1e6) / 1e3, i - 1);
		}
	}
	div.innerText = ""
			+ "ex-stopped: " + stopped + " (" + (stopped.length / 6) + ")\n"
		 	+ "\xa0\xa0stopped-word: " + stoppedWord + " ; matched-non-white: " + matchedNonWhite + "\n"
			+ "strange chars: " + strange + "\n"
			+ "ex-skipped: " + skipped + " (" + (skipped.length / 6) + ")\n"
			+ "\xa0\xa0all-skipped: " + allSkipped + "\n"
			+ "\xa0\xa0strange-and-non-stopped: " + strangeAndNotStop + "\n"
			+ ("\xa0\xa0new-found-word: " + newFoundWord + "\n")
			+ ("\xa0\xa0unknown-char-may-be-ws: " + unknownCharMayBeWS + "\n")
			+ "others: " + others + "\n"
			;
}

function init() {
	try {
		wordsRe = new RegExp(words || "[\\p{L}\\p{Nd}_]", words ? "" : "u");
		if (wordsRe.test("a")) {
			return;
		}
	} catch (e) {}
	wordsRe = null;
	if (words) {
		return Promise.reject("no words");
	}
	return new Promise(function (resolve, reject) {
		var retry = 0;
		var req = new XMLHttpRequest();
		req.open("GET", "../front/words.txt", true);
		req.responseType = "text";
		req.onload = function () {
			if (this.status < 200 || this.status > 299) {
				return this.onerror("HTTP " + this.status);
			}
			words = this.responseText.replace(/\r?\n/g, "").replace("+", "");
			if (!words) {
				reject("can not get words re!");
			} else {
				resolve(init());
			}
		};
		req.onerror = function (e) {
			if (retry == 1) { reject(e); }
			retry++;
			req.open("GET", "words.txt", true);
			req.send();
		};
		req.send();
	});
}

function start() {
	Promise.resolve(init()).then(main).catch(function(err) {
		console.log(err);
		var div = document.querySelector("#test");
		div.innerText = err + "";
	});
}
setTimeout(start, 100);

