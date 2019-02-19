"use strict";
/**
 * **C72**:
 * ex-stopped: (0)
 *   stopped-word: 49199 ; matched-non-white: 64240
 * strange chars: 1274
 * ex-skipped: (0)
 *   strange-and-non-stopped: 0
 * others: 0
 * 
 * **C59**:
 * ex-stopped: (0)
 *   stopped-word: 48467 ; matched-non-white: 64259
 * strange chars: 1255
 * ex-skipped: (0)
 *   strange-and-non-stopped: 0
 * others: 0
 * 
 * **C58**:
 * ex-stopped: (0)
 *   stopped-word: 48467 ; matched-non-white: 49115
 * strange chars: 4
 * ex-skipped: \u1885\u1886 (2)
 *   strange-and-non-stopped: 0
 * others: 0
 */

var words = "";
var wordsRe = null;
var oldBehavior = /\s/.test("\u180e");
var rightStopRe = oldBehavior ? null : /[\S\n\u2029\u202f\ufeff]/;

function main() {
	var div = document.querySelector("#test");
	var sel = window.getSelection();
	var skipped = "",
	strange = 0,
	strangeAndNotStop = 0,
	stopped = "",
	stoppedWord = 0,
	matchedNonWhite = 0,
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
			if ((oldBehavior ? wordsRe : rightStopRe).test(ch)) {
				skipped += uchar;
				if (skipped.length > 600) {
					break;
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
			console.log(Date.now() % 1e6, i - 1);
		}
	}
	div.innerText = ""
			+ "ex-stopped: " + stopped + " (" + (stopped.length / 6) + ")\n"
		 	+ "\xa0\xa0stopped-word: " + stoppedWord + " ; matched-non-white: " + matchedNonWhite + "\n"
			+ "strange chars: " + strange + "\n"
			+ "ex-skipped: " + skipped + " (" + (skipped.length / 6) + ")\n"
			+ "\xa0\xa0strange-and-non-stopped: " + strangeAndNotStop + "\n"
			+ "others: " + others + "\n"
			;
}

function init() {
	try {
		wordsRe = new RegExp(words || "[\\p{L}\\p{Nd}_]", words ? "" : "u");
		if (wordsRe.test("a")) {
			return;
		}
	} catch (e) {
		wordsRe = null;
	}
	if (words) {
		return Promise.reject("no words");
	}
	return new Promise(function (resolve, reject) {
		var req = new XMLHttpRequest();
		req.open("GET", "words.txt", true);
		req.responseType = "text";
		req.onload = function () {
			words = this.responseText.replace(/\r?\n/g, "").replace("+", "");
			if (!words) {
				reject("can not get words re!");
			} else {
				resolve(init());
			}
		};
		req.onerror = reject;
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

