"use strict";
/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)
 Released under the MIT license.

 Modified again by Gong Dahan (gdh1995@qq.com), in order to support Vimium C and add functions and operators.

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/
(function () {
	var TNUMBER = 0,
		TOP1 = 1,
		TOP2 = 2,
		TVAR = 3,
		TFUNCALL = 4;

	function Token(type_, index_, prio_, number_) {
		this.type_ = type_;
		this.index_ = index_ || 0;
		this.prio_ = prio_ || 0;
		this.number_ = (number_ !== undefined && number_ !== null) ? number_ : 0;
	}

	function Expression(tokens, scope) {
		this.tokens_ = tokens;
		this.ops1_ = scope.ops1_;
		this.ops2_ = scope.ops2_;
		this.functions_ = scope.functions_;
	}

	function hasValue(values, index) {
		var parts = index.split(/\./);
		var value = values;
		var part;
		while (part = parts.shift()) {
			if (!(part in value)) {
				return false;
			}
			value = value[part];
		}
		return true;
	}

	function getValue(values, index) {
		var parts = index.split(/\./);
		var value = values;
		var part;
		while (part = parts.shift()) {
			value = value[part];
		}
		return value;
	}

	Expression.prototype = {
		constructor: Expression,

		evaluate: function (values) {
			values = values || {};
			var nstack = [],
				n1,
				n2,
				f,
				L = this.tokens_.length,
				item,
				i;
			for (i = 0; i < L; i++) {
				item = this.tokens_[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item.number_);
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2_[item.index_];
					nstack.push(f(n1, n2));
				}
				else if (type_ === TVAR) {
					if (hasValue(values, item.index_)) {
						nstack.push(getValue(values, item.index_));
					} else if (hasValue(this.functions_, item.index_)) {
						nstack.push(getValue(this.functions_, item.index_));
					} else {
						throw new Error("undefined variable: " + item.index_);
					}
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = this.ops1_[item.index_];
					nstack.push(f(n1));
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					if (f.apply && f.call) {
						if (Object.prototype.toString.call(n1) == "[object Array]") {
							nstack.push(f.apply(undefined, n1));
						}
						else {
							nstack.push(f.call(undefined, n1));
						}
					}
					else {
						throw new Error(f + " is not a function");
					}
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		}
	};

	function add(a, b) {
		return Number(a) + Number(b);
	}
	function sub(a, b) {
		return a - b;
	}
	function mul(a, b) {
		return a * b;
	}
	function div(a, b) {
		return a / b;
	}
	function divInt(a, b) {
		return ((a | 0) / (b | 0)) | 0;
	}
	function mod(a, b) {
		return a % b;
	}
	function concat(a, b) {
		return "" + a + b;
	}
	function equal(a, b) {
		return a === b;
	}
	function notEqual(a, b) {
		return a !== b;
	}
	function greaterThan(a, b) {
		return a > b;
	}
	function lessThan(a, b) {
		return a < b;
	}
	function greaterThanEqual(a, b) {
		return a >= b;
	}
	function lessThanEqual(a, b) {
		return a <= b;
	}
	function bitAnd(a, b) {
		return a & b;
	}
	function bitOr(a, b) {
		return a | b;
	}
	function bitXor(a, b) {
		return a ^ b;
	}
	function bitMoveLeft(a, b) {
		return a << b;
	}
	function bitMoveRight(a, b) {
		return a >> b;
	}
	function bitPositiveMoveRight(a, b) {
		return a >>> b;
	}
	function andOperator(a, b) {
		return a && b;
	}
	function orOperator(a, b) {
		return a || b;
	}
	function sinh(a) {
		return Math.sinh ? Math.sinh(a) : ((Math.exp(a) - Math.exp(-a)) / 2);
	}
	function cosh(a) {
		return Math.cosh ? Math.cosh(a) : ((Math.exp(a) + Math.exp(-a)) / 2);
	}
	function tanh(a) {
		if (Math.tanh) return Math.tanh(a);
		if(a === Infinity) return 1;
		if(a === -Infinity) return -1;
		return (Math.exp(a) - Math.exp(-a)) / (Math.exp(a) + Math.exp(-a));
	}
	function asinh(a) {
		if (Math.asinh) return Math.asinh(a);
		if(a === -Infinity) return a;
		return Math.log(a + Math.sqrt(a * a + 1));
	}
	function acosh(a) {
		return Math.acosh ? Math.acosh(a) : Math.log(a + Math.sqrt(a * a - 1));
	}
	function atanh(a) {
		return Math.atanh ? Math.atanh(a) : (Math.log((1+a)/(1-a)) / 2);
	}
	function log10(a) {
		return Math.log(a) * Math.LOG10E;
	}
	function neg(a) {
		return -a;
	}
	function not(a) {
		return !a;
	}
	function bitNot(a) {
		return ~a;
	}
	var trunc = Math.trunc || function (a) {
		return a < 0 ? Math.ceil(a) : Math.floor(a);
	};
	function random(a) {
		return Math.random() * (a || 1);
	}
	function fac(a) { //a!
		a = Math.floor(a);
		var b = a;
		while (a > 1) {
			b = b * (--a);
		}
		return b;
	}

	var hypot = Math.hypot || function() { // Math.hypot is from Chrome 38
		var y = 0;
		var length = arguments.length;
		for (var i = 0, j; i < length; i++) {
			j = arguments[i];
			j = j * j;
			if (j === Infinity) { return j; }
			y += j;
		}
		return Math.sqrt(y);
	};

	function condition(cond, yep, nope) {
		return cond ? yep : nope;
	}

	function append(a, b) {
		if (Object.prototype.toString.call(a) != "[object Array]") {
			return [a, b];
		}
		a = a.slice();
		a.push(b);
		return a;
	}

	function MathParser() {
		this.success = false;
		this.errormsg = "";
		this.expression_ = "";

		this.pos_ = 0;

		this.tokennumber_ = 0;
		this.tokenprio_ = 0;
		this.tokenindex_ = 0;
		this.tmpprio_ = 0;

		this.ops1_ = {
			__proto__: null,
			sin: Math.sin,
			cos: Math.cos,
			tan: Math.tan,
			asin: Math.asin,
			acos: Math.acos,
			atan: Math.atan,
			sinh: sinh,
			cosh: cosh,
			tanh: tanh,
			asinh: asinh,
			acosh: acosh,
			atanh: atanh,
			sqrt: Math.sqrt,
			log: Math.log,
			lg: log10,
			log10: log10,
			abs: Math.abs,
			ceil: Math.ceil,
			floor: Math.floor,
			round: Math.round,
			trunc: trunc,
			"-": neg,
			"!": not,
			"~": bitNot,
			not: not,
			exp: Math.exp
		};

		this.ops2_ = {
			__proto__: null,
			"+": add,
			"-": sub,
			"*": mul,
			"/": div,
			":": div,
			"\\": divInt,
			"%": mod,
			"**": Math.pow,
			"&": bitAnd,
			"|": bitOr,
			"^": bitXor,
			"&&": andOperator,
			"||": orOperator,
			",": append,
			";": concat,
			"==": equal,
			"!=": notEqual,
			"<": lessThan,
			"<<": bitMoveLeft,
			"<=": lessThanEqual,
			">": greaterThan,
			">=": greaterThanEqual,
			">>": bitMoveRight,
			">>>": bitPositiveMoveRight,
			and: andOperator,
			or: orOperator
		};

		this.functions_ = {
			__proto__: null,
			random: random,
			fac: fac,
			min: Math.min,
			max: Math.max,
			hypot: hypot,
			pyt: hypot, // backward compat
			pow: Math.pow,
			atan2: Math.atan2,
			"if": condition
		};

		this.consts = {
			__proto__: null,
			E: Math.E,
			PI: Math.PI
		};
	}

	MathParser.expression_ = Expression;

	var PRIMARY      = 1 << 0,
		OPERATOR     = 1 << 1,
		FUNCTION     = 1 << 2,
		LPAREN       = 1 << 3,
		RPAREN       = 1 << 4,
		COMMA        = 1 << 5,
		SIGN         = 1 << 6,
		CALL         = 1 << 7,
		NULLARY_CALL = 1 << 8;

	MathParser.prototype = {
		constructor: MathParser,

		parse_: function (expr) {
			var operstack = [],
				tokenstack = [],
				token, str,
				expected = (PRIMARY | LPAREN | FUNCTION | SIGN),
				noperators = 0;
			this.errormsg = "";
			this.success = true;
			this.tmpprio_ = 0;
			this.expression_ = expr;
			this.pos_ = 0;

			while (this.pos_ < this.expression_.length) {
				if (this.isOperator_()) {
					if ((this.tokenprio_ >= 60 || this.tokenprio_ === 51) && (expected & SIGN)
							|| this.tokenprio_ === 3 && (expected & FUNCTION)) {
						if (this.tokenindex_ !== "+") {
							noperators++;
							this.addfunc_(tokenstack, operstack, TOP1);
						}
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
					else if (this.isComment_()) {
					}
					else {
						if ((expected & OPERATOR) === 0) {
							this.error_parsing_(this.pos_, "unexpected operator");
						}
						noperators += 2;
						this.addfunc_(tokenstack, operstack, TOP2);
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
				}
				else if (this.isNumber_()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing_(this.pos_, "unexpected number");
					}
					token = new Token(TNUMBER, 0, 0, this.tokennumber_);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isString_()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing_(this.pos_, "unexpected string");
					}
					token = new Token(TNUMBER, 0, 0, this.tokennumber_);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isLeftParenth_()) {
					if ((expected & LPAREN) === 0) {
						this.error_parsing_(this.pos_, "unexpected \"(\"");
					}

					if (expected & CALL) {
						noperators += 2;
						this.tokenprio_ = -2;
						this.tokenindex_ = -1;
						this.addfunc_(tokenstack, operstack, TFUNCALL);
					}

					expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
				}
				else if (this.isRightParenth_()) {
					if (expected & NULLARY_CALL) {
						token = new Token(TNUMBER, 0, 0, []);
						tokenstack.push(token);
					}
					else if ((expected & RPAREN) === 0) {
						this.error_parsing_(this.pos_, "unexpected \")\"");
					}

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isComma_()) {
					if ((expected & COMMA) === 0) {
						this.error_parsing_(this.pos_, "unexpected \",\"");
					}
					this.addfunc_(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
				}
				else if (this.isConst_()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing_(this.pos_, "unexpected constant");
					}
					var consttoken = new Token(TNUMBER, 0, 0, this.tokennumber_);
					tokenstack.push(consttoken);
					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isOp1_(str = this.getOpStr_())) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing_(this.pos_, "unexpected function");
					}
					this.addfunc_(tokenstack, operstack, TOP1);
					noperators++;
					expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
				}
				else if (this.isVar_(str)) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing_(this.pos_, "unexpected variable");
					}
					var vartoken = new Token(TVAR, this.tokenindex_, 0, 0);
					tokenstack.push(vartoken);

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isWhite_()) {
				}
				else if (this.errormsg === "") {
					this.error_parsing_(this.pos_, "unknown character");
				}
				else {
					this.error_parsing_(this.pos_, this.errormsg);
				}
			}
			if (this.tmpprio_ < 0) {
				this.error_parsing_(this.pos_, "unmatched \"()\"");
			}
			else if (this.tmpprio_ >= 100) {
				this.tmpprio_ = 0;
				if (expected & NULLARY_CALL) {
					token = new Token(TNUMBER, 0, 0, []);
					tokenstack.push(token);
				}
			}
			if (noperators === tokenstack.length + operstack.length && operstack.length > 0
					&& operstack[operstack.length - 1].type_ === TOP2) {
				operstack.pop();
				noperators -= 2;
			}
			while (operstack.length > 0) {
				var tmp = operstack.pop();
				tokenstack.push(tmp);
			}
			if (noperators + 1 !== tokenstack.length) {
				this.error_parsing_(this.pos_, "parity");
			}

			return new Expression(tokenstack, this);
		},

		evaluate: function (expr, variables) {
			return this.parse_(expr).evaluate(variables);
		},

		error_parsing_: function (column, msg) {
			this.success = false;
			this.errormsg = "parse error [column " + (column) + "]: " + msg;
			this.column = column;
			throw new Error(this.errormsg);
		},

//\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

		addfunc_: function (tokenstack, operstack, type_) {
			var operator = new Token(type_, this.tokenindex_, this.tokenprio_ + this.tmpprio_, 0)
				, prio_limit = type_ === TOP1 ? -1 : 0;
			while (operstack.length > 0) {
				if (operator.prio_ - operstack[operstack.length - 1].prio_ <= prio_limit) {
					tokenstack.push(operstack.pop());
				}
				else {
					break;
				}
			}
			operstack.push(operator);
		},

		isNumber_: function () {
			var i = this.pos_, dot = false, str, scale = 10;
			for (; i < this.expression_.length; i++) {
				var code = this.expression_.charCodeAt(i);
				if (code >= 48 && code <= 57) {}
				else if (code === 46) { if (dot) { return false; } dot = true; }
				else if (code === 69 || code === 101) { // 'E' or 'e'
					code = this.expression_.charCodeAt(i + 1);
					i += code === 43 || code === 45 ? 1 : 0;
					dot = true;
					while ((code = this.expression_.charCodeAt(++i)) >= 48 && code <= 57) {}
					break;
				}
				else if (code === 88 || code === 120) {
					if (i - this.pos_ !== 1 || this.expression_.charCodeAt(i - 1) !== 48) { break; }
					scale = 16;
					while ((code = this.expression_.charCodeAt(++i)) >= 48 && code <= 57
						|| code >= 97 && code <= 102 || code >= 65 && code <= 70) {}
					break;
				}
				else { break; }
			}
			if (i <= this.pos_) { return false; }
			str = this.expression_.substring(this.pos_, i);
			this.tokennumber_ = dot ? parseFloat(str) : parseInt(str
				, scale === 10 && this.expression_.charCodeAt(this.pos_) === 48 ? 8 : scale);
			this.pos_ = i;
			return true;
		},

		// Ported from the yajjl JSON parser at https://code.google.com/p/yajjl/
		unescape_: function (v, pos) {
			var buffer = [],
				i, c,
				not_escaping = true;

			for (i = 0; i < v.length; i++) {
				c = v.charAt(i);

				if (not_escaping) {
					if (c == '\\') {
						not_escaping = false;
					} else {
						buffer.push(c);
					}
					continue;
				}
				switch (c) {
				case "'":
					buffer.push("'");
					break;
				case '\\':
					buffer.push('\\');
					break;
				case '/':
					buffer.push('/');
					break;
				case 'b':
					buffer.push('\b');
					break;
				case 'f':
					buffer.push('\f');
					break;
				case 'n':
					buffer.push('\n');
					break;
				case 'r':
					buffer.push('\r');
					break;
				case 't':
					buffer.push('\t');
					break;
				case 'u':
					// interpret the following 4 characters as the hex of the unicode code point
					var codePoint = parseInt(v.substring(i + 1, i + 5), 16);
					buffer.push(String.fromCharCode(codePoint));
					i += 4;
					break;
				default:
					throw this.error_parsing_(pos + i, "Illegal escape sequence: '\\" + c + "'");
				}
				not_escaping = true;
			}

			return buffer.join('');
		},

		isString_: function () {
			var r = false;
			var str = "";
			var startpos = this.pos_;
			if (this.pos_ < this.expression_.length && this.expression_.charAt(this.pos_) == "'") {
				this.pos_++;
				while (this.pos_ < this.expression_.length) {
					var code = this.expression_.charAt(this.pos_);
					if (code != "'" || str.slice(-1) == "\\") {
						str += this.expression_.charAt(this.pos_);
						this.pos_++;
					}
					else {
						this.pos_++;
						this.tokennumber_ = this.unescape_(str, startpos);
						r = true;
						break;
					}
				}
			}
			return r;
		},

		isConst_: function () {
			var str;
			for (var i in this.consts) {
				var L = i.length;
				str = this.expression_.substr(this.pos_, L);
				if (i === str) {
					this.tokennumber_ = this.consts[i];
					this.pos_ += L;
					return true;
				}
			}
			return false;
		},

		isOperator_: function () {
			var code = this.expression_.charCodeAt(this.pos_);
			if (code === 111) { // o
				if (this.expression_.charCodeAt(this.pos_ + 1) !== 114) { // r
					return false;
				}
				this.pos_++;
				this.tokenprio_ = 1;
				this.tokenindex_ = "or";
			}
			else if (code === 97) { // a
				if (this.expression_.charCodeAt(this.pos_ + 1) !== 110 || this.expression_.charCodeAt(this.pos_ + 2) !== 100) { // n && d
					return false;
				}
				this.pos_ += 2;
				this.tokenprio_ = 2;
				this.tokenindex_ = "and";
			}
			else if (code === 110) { // n
				if (this.expression_.charCodeAt(this.pos_ + 1) !== 111 || this.expression_.charCodeAt(this.pos_ + 2) !== 116) { // o && t
					return false;
				}
				this.pos_ += 2;
				this.tokenprio_ = 3;
				this.tokenindex_ = "not";
			}
			else if (code === 124) { // |
				if (this.expression_.charCodeAt(this.pos_ + 1) === 124) {
					this.pos_++;
					this.tokenprio_ = 11;
					this.tokenindex_ = "||";
				} else {
					this.tokenprio_ = 21;
					this.tokenindex_ = "|";
				}
			}
			else if (code === 94) { // ^
				this.tokenprio_ = 22;
				this.tokenindex_ = "^";
			}
			else if (code === 38) { // &
				if (this.expression_.charCodeAt(this.pos_ + 1) === 38) {
					this.pos_++;
					this.tokenprio_ = 12;
					this.tokenindex_ = "&&";
				} else {
					this.tokenprio_ = 23;
					this.tokenindex_ = "&";
				}
			}
			else if (code === 61) { // =
				if (this.expression_.charCodeAt(this.pos_ + 1) !== 61) {
					return false;
				}
				this.pos_++;
				this.tokenprio_ = 31;
				this.tokenindex_ = "==";
			}
			else if (code === 33) { // !
				if (this.expression_.charCodeAt(this.pos_ + 1) === 61) {
					this.pos_++;
					this.tokenprio_ = 31;
					this.tokenindex_ = "!=";
				}
				else {
					return false;
				}
			}
			else if (code === 62) { // >
				code = this.expression_.charCodeAt(this.pos_ + 1);
				if (code === 61) {
					this.pos_++;
					this.tokenprio_ = 32;
					this.tokenindex_ = ">=";
				} else if (code !== 62) {
					this.tokenprio_ = 32;
					this.tokenindex_ = ">";
				} else if (this.expression_.charCodeAt(this.pos_ + 2) === 62) {
					this.pos_ += 2;
					this.tokenprio_ = 41;
					this.tokenindex_ = ">>>";
				} else {
					this.pos_++;
					this.tokenprio_ = 41;
					this.tokenindex_ = ">>";
				}
			}
			else if (code === 60) { // <
				code = this.expression_.charCodeAt(this.pos_ + 1);
				this.pos_++;
				if (code === 60) {
					this.tokenprio_ = 41;
					this.tokenindex_ = "<<";
				} else if (code === 61) {
					this.tokenprio_ = 32;
					this.tokenindex_ = "<=";
				} else if (code === 62) {
					this.tokenprio_ = 32;
					this.tokenindex_ = "!=";
				} else {
					this.pos_--;
					this.tokenprio_ = 32;
					this.tokenindex_ = "<";
				}
			}
			else if (code === 58 || code === 65306) { // :
				this.tokenprio_ = 50;
				this.tokenindex_ = ":";
			}
			else if (code === 43) { // +
				this.tokenprio_ = 51;
				this.tokenindex_ = "+";
			}
			else if (code === 45) { // -
				this.tokenprio_ = 51;
				this.tokenindex_ = "-";
			}
			else if (code === 8729 || code === 8226) { // ∙ or •
				this.tokenprio_ = 52;
				this.tokenindex_ = "*";
			}
			else if (code === 42) { // *
				if (this.expression_.charCodeAt(this.pos_ + 1) === 42) { // *
					this.pos_++;
					this.tokenprio_ = 53;
					this.tokenindex_ = "**";
				} else {
					this.tokenprio_ = 52;
					this.tokenindex_ = "*";
				}
			}
			else if (code === 47) { // /
				this.tokenprio_ = 52;
				this.tokenindex_ = "/";
			}
			else if (code === 92) { // '\\'
				this.tokenprio_ = 52;
				this.tokenindex_ = "\\";
			}
			else if (code === 37) { // %
				this.tokenprio_ = 52;
				this.tokenindex_ = "%";
			}
			else if (code === 33) { // !
				this.tokenprio_ = 61;
				this.tokenindex_ = "!";
			}
			else if (code === 126) { // ~
				this.tokenprio_ = 61;
				this.tokenindex_ = "~";
			}
			else {
				return false;
			}
			this.pos_++;
			return true;
		},

		isLeftParenth_: function () {
			var code = this.expression_.charCodeAt(this.pos_);
			if (code === 40 || code === 65288) { // (
				this.pos_++;
				this.tmpprio_ += 100;
				return true;
			}
			return false;
		},

		isRightParenth_: function () {
			var code = this.expression_.charCodeAt(this.pos_);
			if (code === 41 || code === 65289) { // )
				this.pos_++;
				this.tmpprio_ -= 100;
				return true;
			}
			return false;
		},

		isComma_: function () {
			var code = this.expression_.charCodeAt(this.pos_);
			if (code === 44 || code === 59) { // , or ;
				this.pos_++;
				this.tokenprio_ = -1;
				this.tokenindex_ = code === 44 ? "," : ";";
				return true;
			}
			return false;
		},

		isWhite_: function () {
			var code = this.expression_.charCodeAt(this.pos_);
			if (code === 32 || code === 9 || code === 10 || code === 13) {
				this.pos_++;
				return true;
			}
			return false;
		},

		getOpStr_: function() {
			var c, i = this.pos_, str = this.expression_;
			for (; i < str.length; i++) {
				c = str.charCodeAt(i);
				if (c < 65 || c > 122 || (c > 90 && c < 97)) {
					if (i === this.pos_ || (c != 95 && (c < 48 || c > 57))) {
						break;
					}
				}
			}
			return str.substring(this.pos_, i);
		},

		isOp1_: function (str) {
			if (str.length > 0 && (str in this.ops1_)) {
				this.tokenindex_ = str;
				this.tokenprio_ = 61;
				this.pos_ += str.length;
				return true;
			}
			return false;
		},

		isVar_: function (str) {
			if (str.length > 0) {
				this.tokenindex_ = str;
				this.tokenprio_ = 61;
				this.pos_ += str.length;
				return true;
			}
			return false;
		},

		isComment_: function () {
			var code = this.expression_.charCodeAt(this.pos_ - 1);
			if (code === 47 && this.expression_.charCodeAt(this.pos_) === 42) {
				this.pos_ = this.expression_.indexOf("*/", this.pos_) + 2;
				if (this.pos_ === 1) {
					this.pos_ = this.expression_.length;
				}
				return true;
			}
			return false;
		},

		clean: function () {
			this.expression_ = "";
		}
	};

	if (typeof define === "function") {
		__filename = "math_parser.js"
		define(["require", "exports"], function(_require, exports) {
			Object.defineProperty(exports, "__esModule", { value: true })
			exports.MathParser = new MathParser()
		})
	} else {
		(typeof globalThis !== "undefined" ? globalThis : window).MathParser = new MathParser()
	}
})();
