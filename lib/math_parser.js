/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/
var MathParser = (function () {
	"use strict";

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

	Token.prototype.toString = function () {
		switch (this.type_) {
		case TNUMBER:
			return this.number_;
		case TOP1: case TOP2: case TVAR:
			return this.index_;
		case TFUNCALL:
			return "CALL";
		default:
			return "Invalid Token";
		}
	};

	function Expression(tokens, scope) {
		this.tokens = tokens;
		this.ops1 = scope.ops1;
		this.ops2 = scope.ops2;
		this.functions = scope.functions;
	}

	// Based on http://www.json.org/json2.js
	var escapable = /[\\\'\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
		meta = {	// table of character substitutions
			'\b': '\\b',
			'\t': '\\t',
			'\n': '\\n',
			'\f': '\\f',
			'\r': '\\r',
			"'": "\\'",
			'\\': '\\\\'
		};

	function escapeValue(v) {
		if (typeof v === "string") {
			escapable.lastIndex = 0;
			return escapable.test(v) ? "'" + v.replace(escapable, function (a) {
				var c = meta[a];
				return typeof c === 'string' ? c
					: '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
			}) + "'": "'" + v + "'";
		}
		return v;
	}

	Expression.prototype = {
		constructor: Expression,

		simplify: function (values) {
			values = values || {};
			var nstack = [],
				newexpression = [],
				n1,
				n2,
				f,
				L = this.tokens.length,
				item,
				i;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item);
				}
				else if (type_ === TVAR && (item.index_ in values)) {
					item = new Token(TNUMBER, 0, 0, values[item.index_]);
					nstack.push(item);
				}
				else if (type_ === TOP2 && nstack.length > 1) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_, n2.number_));
					nstack.push(item);
				}
				else if (type_ === TOP1 && nstack.length > 0) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
					item = new Token(TNUMBER, 0, 0, f(n1.number_));
					nstack.push(item);
				}
				else {
					while (nstack.length > 0) {
						newexpression.push(nstack.shift());
					}
					newexpression.push(item);
				}
			}
			while (nstack.length > 0) {
				newexpression.push(nstack.shift());
			}

			return new Expression(newexpression, this);
		},

		substitute: function (variable, expr) {
			if (!(expr instanceof Expression)) {
				expr = MathParser.singleton.parse(String(expr));
			}
			var newexpression = [],
				L = this.tokens.length,
				item,
				i;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TVAR && item.index_ === variable) {
					for (var j = 0; j < expr.tokens.length; j++) {
						var expritem = expr.tokens[j];
						var replitem = new Token(expritem.type_, expritem.index_, expritem.prio_, expritem.number_);
						newexpression.push(replitem);
					}
				}
				else {
					newexpression.push(item);
				}
			}

			return new Expression(newexpression, this);
		},

		evaluate: function (values) {
			values = values || {};
			var nstack = [],
				n1,
				n2,
				f,
				L = this.tokens.length,
				item,
				i;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(item.number_);
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = this.ops2[item.index_];
					nstack.push(f(n1, n2));
				}
				else if (type_ === TVAR) {
					if (item.index_ in values) {
						nstack.push(values[item.index_]);
					}
					else if (item.index_ in this.functions) {
						nstack.push(this.functions[item.index_]);
					}
					else {
						throw new Error("undefined variable: " + item.index_);
					}
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = this.ops1[item.index_];
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
		},

		toString: function (toJS) {
			var nstack = [],
				n1,
				n2,
				f,
				L = this.tokens.length,
				item,
				i;
			for (i = 0; i < L; i++) {
				item = this.tokens[i];
				var type_ = item.type_;
				if (type_ === TNUMBER) {
					nstack.push(escapeValue(item.number_));
				}
				else if (type_ === TOP2) {
					n2 = nstack.pop();
					n1 = nstack.pop();
					f = item.index_;
					if (toJS && f == "^") {
						nstack.push("Math.pow(" + n1 + "," + n2 + ")");
					}
					else {
						nstack.push("(" + n1 + f + n2 + ")");
					}
				}
				else if (type_ === TVAR) {
					nstack.push(item.index_);
				}
				else if (type_ === TOP1) {
					n1 = nstack.pop();
					f = item.index_;
					if (f === "-") {
						nstack.push("(" + f + n1 + ")");
					}
					else {
						nstack.push(f + "(" + n1 + ")");
					}
				}
				else if (type_ === TFUNCALL) {
					n1 = nstack.pop();
					f = nstack.pop();
					nstack.push(f + "(" + n1 + ")");
				}
				else {
					throw new Error("invalid Expression");
				}
			}
			if (nstack.length > 1) {
				throw new Error("invalid Expression (parity)");
			}
			return nstack[0];
		},

		variables: function () {
			var L = this.tokens.length;
			var vars = [];
			for (var i = 0; i < L; i++) {
				var item = this.tokens[i];
				if (item.type_ === TVAR && (vars.indexOf(item.index_) == -1)) {
					vars.push(item.index_);
				}
			}

			return vars;
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
		return a == b;
	}
	function notEqual(a, b) {
		return a != b;
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
	function trunc(a) {
		if (Math.trunc) return Math.trunc(a);
		else return x < 0 ? Math.ceil(x) : Math.floor(x);
	}
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

	function hypot() {
		var y = 0;
		var length = arguments.length;
		for (var i = 0, j; i < length; i++) {
			j = arguments[i];
			j = j * j;
			if (j === Infinity) { return j; }
			y += j;
		}
		return Math.sqrt(y);
	}
	hypot = Math.hypot || hypot; // Math.hypot is from Chrome 38

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
		this.expression = "";

		this.pos = 0;

		this.tokennumber = 0;
		this.tokenprio = 0;
		this.tokenindex = 0;
		this.tmpprio = 0;

		this.ops1 = {
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

		this.ops2 = {
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

		this.functions = {
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

	MathParser.Expression = Expression;

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

		parse: function (expr) {
			var operstack = [],
				tokenstack = [],
				token, str,
				expected = (PRIMARY | LPAREN | FUNCTION | SIGN),
				noperators = 0;
			this.errormsg = "";
			this.success = true;
			this.tmpprio = 0;
			this.expression = expr;
			this.pos = 0;

			while (this.pos < this.expression.length) {
				if (this.isOperator()) {
					if ((this.tokenprio >= 60 || this.tokenprio === 51) && (expected & SIGN)
							|| this.tokenprio === 3 && (expected & FUNCTION)) {
						if (this.tokenindex !== "+") {
							noperators++;
							this.addfunc(tokenstack, operstack, TOP1);
						}
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
					else if (this.isComment()) {
					}
					else {
						if ((expected & OPERATOR) === 0) {
							this.error_parsing(this.pos, "unexpected operator");
						}
						noperators += 2;
						this.addfunc(tokenstack, operstack, TOP2);
						expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
					}
				}
				else if (this.isNumber()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected number");
					}
					token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isString()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected string");
					}
					token = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(token);

					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isLeftParenth()) {
					if ((expected & LPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \"(\"");
					}

					if (expected & CALL) {
						noperators += 2;
						this.tokenprio = -2;
						this.tokenindex = -1;
						this.addfunc(tokenstack, operstack, TFUNCALL);
					}

					expected = (PRIMARY | LPAREN | FUNCTION | SIGN | NULLARY_CALL);
				}
				else if (this.isRightParenth()) {
					if (expected & NULLARY_CALL) {
						token = new Token(TNUMBER, 0, 0, []);
						tokenstack.push(token);
					}
					else if ((expected & RPAREN) === 0) {
						this.error_parsing(this.pos, "unexpected \")\"");
					}

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isComma()) {
					if ((expected & COMMA) === 0) {
						this.error_parsing(this.pos, "unexpected \",\"");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (PRIMARY | LPAREN | FUNCTION | SIGN);
				}
				else if (this.isConst()) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected constant");
					}
					var consttoken = new Token(TNUMBER, 0, 0, this.tokennumber);
					tokenstack.push(consttoken);
					expected = (OPERATOR | RPAREN | COMMA);
				}
				else if (this.isOp2(str = this.getOpStr())) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP2);
					noperators += 2;
					expected = (LPAREN);
				}
				else if (this.isOp1(str)) {
					if ((expected & FUNCTION) === 0) {
						this.error_parsing(this.pos, "unexpected function");
					}
					this.addfunc(tokenstack, operstack, TOP1);
					noperators++;
					expected = (LPAREN);
				}
				else if (this.isVar(str)) {
					if ((expected & PRIMARY) === 0) {
						this.error_parsing(this.pos, "unexpected variable");
					}
					var vartoken = new Token(TVAR, this.tokenindex, 0, 0);
					tokenstack.push(vartoken);

					expected = (OPERATOR | RPAREN | COMMA | LPAREN | CALL);
				}
				else if (this.isWhite()) {
				}
				else if (this.errormsg === "") {
					this.error_parsing(this.pos, "unknown character");
				}
				else {
					this.error_parsing(this.pos, this.errormsg);
				}
			}
			if (this.tmpprio < 0 || this.tmpprio >= 100) {
				this.error_parsing(this.pos, "unmatched \"()\"");
			}
			while (operstack.length > 0) {
				var tmp = operstack.pop();
				tokenstack.push(tmp);
			}
			if (noperators + 1 !== tokenstack.length) {
				//print(noperators + 1);
				//print(tokenstack);
				this.error_parsing(this.pos, "parity");
			}

			return new Expression(tokenstack, this);
		},

		evaluate: function (expr, variables) {
			return this.parse(expr).evaluate(variables);
		},

		error_parsing: function (column, msg) {
			this.success = false;
			this.errormsg = "parse error [column " + (column) + "]: " + msg;
			this.column = column;
			throw new Error(this.errormsg);
		},

//\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\

		addfunc: function (tokenstack, operstack, type_) {
			var operator = new Token(type_, this.tokenindex, this.tokenprio + this.tmpprio, 0)
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

		isNumber: function () {
			var r = false;
			var str = "";
			while (this.pos < this.expression.length) {
				var code = this.expression.charCodeAt(this.pos);
				if ((code >= 48 && code <= 57) || code === 46) {
					str += this.expression.charAt(this.pos);
					this.pos++;
					this.tokennumber = parseFloat(str);
					r = true;
				}
				else {
					break;
				}
			}
			return r;
		},

		// Ported from the yajjl JSON parser at http://code.google.com/p/yajjl/
		unescape: function (v, pos) {
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
					throw this.error_parsing(pos + i, "Illegal escape sequence: '\\" + c + "'");
				}
				not_escaping = true;
			}

			return buffer.join('');
		},

		isString: function () {
			var r = false;
			var str = "";
			var startpos = this.pos;
			if (this.pos < this.expression.length && this.expression.charAt(this.pos) == "'") {
				this.pos++;
				while (this.pos < this.expression.length) {
					var code = this.expression.charAt(this.pos);
					if (code != "'" || str.slice(-1) == "\\") {
						str += this.expression.charAt(this.pos);
						this.pos++;
					}
					else {
						this.pos++;
						this.tokennumber = this.unescape(str, startpos);
						r = true;
						break;
					}
				}
			}
			return r;
		},

		isConst: function () {
			var str;
			for (var i in this.consts) {
				var L = i.length;
				str = this.expression.substr(this.pos, L);
				if (i === str) {
					this.tokennumber = this.consts[i];
					this.pos += L;
					return true;
				}
			}
			return false;
		},

		isOperator: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 111) { // o
				if (this.expression.charCodeAt(this.pos + 1) !== 114) { // r
					return false;
				}
				this.pos++;
				this.tokenprio = 1;
				this.tokenindex = "or";
			}
			else if (code === 97) { // a
				if (this.expression.charCodeAt(this.pos + 1) !== 110 || this.expression.charCodeAt(this.pos + 2) !== 100) { // n && d
					return false;
				}
				this.pos += 2;
				this.tokenprio = 2;
				this.tokenindex = "and";
			}
			else if (code === 110) { // n
				if (this.expression.charCodeAt(this.pos + 1) !== 111 || this.expression.charCodeAt(this.pos + 2) !== 116) { // o && t
					return false;
				}
				this.pos += 2;
				this.tokenprio = 3;
				this.tokenindex = "not";
			}
			else if (code === 124) { // |
				if (this.expression.charCodeAt(this.pos + 1) === 124) {
					this.pos++;
					this.tokenprio = 11;
					this.tokenindex = "||";
				} else {
					this.tokenprio = 21;
					this.tokenindex = "|";
				}
			}
			else if (code === 94) { // ^
				this.tokenprio = 22;
				this.tokenindex = "^";
			}
			else if (code === 38) { // &
				if (this.expression.charCodeAt(this.pos + 1) === 38) {
					this.pos++;
					this.tokenprio = 12;
					this.tokenindex = "&&";
				} else {
					this.tokenprio = 23;
					this.tokenindex = "&";
				}
			}
			else if (code === 61) { // =
				if (this.expression.charCodeAt(this.pos + 1) !== 61) {
					return false;
				}
				this.pos++;
				this.tokenprio = 31;
				this.tokenindex = "==";
			}
			else if (code === 33) { // !
				if (this.expression.charCodeAt(this.pos + 1) === 61) {
					this.pos++;
					this.tokenprio = 31;
					this.tokenindex = "!=";
				}
				else {
					return false;
				}
			}
			else if (code === 62) { // >
				code = this.expression.charCodeAt(this.pos + 1);
				if (code === 61) {
					this.pos++;
					this.tokenprio = 32;
					this.tokenindex = ">=";
				} else if (code !== 62) {
					this.tokenprio = 32;
					this.tokenindex = ">";
				} else if (this.expression.charCodeAt(this.pos + 2) === 62) {
					this.pos += 2;
					this.tokenprio = 41;
					this.tokenindex = ">>>";
				} else {
					this.pos++;
					this.tokenprio = 41;
					this.tokenindex = ">>";
				}
			}
			else if (code === 60) { // <
				code = this.expression.charCodeAt(this.pos + 1);
				this.pos++;
				if (code === 60) {
					this.tokenprio = 41;
					this.tokenindex = "<<";
				} else if (code === 61) {
					this.tokenprio = 32;
					this.tokenindex = "<=";
				} else if (code === 62) {
					this.tokenprio = 32;
					this.tokenindex = "!=";
				} else {
					this.pos--;
					this.tokenprio = 32;
					this.tokenindex = "<";
				}
			}
			else if (code === 58 || code === 65306) { // :
				this.tokenprio = 50;
				this.tokenindex = ":";
			}
			else if (code === 43) { // +
				this.tokenprio = 51;
				this.tokenindex = "+";
			}
			else if (code === 45) { // -
				this.tokenprio = 51;
				this.tokenindex = "-";
			}
			else if (code === 8729 || code === 8226) { // ∙ or •
				this.tokenprio = 52;
				this.tokenindex = "*";
			}
			else if (code === 42) { // *
				if (this.expression.charCodeAt(this.pos + 1) === 42) { // *
					this.pos++;
					this.tokenprio = 53;
					this.tokenindex = "**";
				} else {
					this.tokenprio = 52;
					this.tokenindex = "*";
				}
			}
			else if (code === 47) { // /
				this.tokenprio = 52;
				this.tokenindex = "/";
			}
			else if (code === 92) { // '\\'
				this.tokenprio = 52;
				this.tokenindex = "\\";
			}
			else if (code === 37) { // %
				this.tokenprio = 52;
				this.tokenindex = "%";
			}
			else if (code === 33) { // !
				this.tokenprio = 61;
				this.tokenindex = "!";
			}
			else if (code === 126) { // ~
				this.tokenprio = 61;
				this.tokenindex = "~";
			}
			else {
				return false;
			}
			this.pos++;
			return true;
		},

		isLeftParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 40 || code === 65288) { // (
				this.pos++;
				this.tmpprio += 100;
				return true;
			}
			return false;
		},

		isRightParenth: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 41 || code === 65289) { // )
				this.pos++;
				this.tmpprio -= 100;
				return true;
			}
			return false;
		},

		isComma: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 44 || code === 59) { // , or ;
				this.pos++;
				this.tokenprio = -1;
				this.tokenindex = code === 44 ? "," : ";";
				return true;
			}
			return false;
		},

		isWhite: function () {
			var code = this.expression.charCodeAt(this.pos);
			if (code === 32 || code === 9 || code === 10 || code === 13) {
				this.pos++;
				return true;
			}
			return false;
		},

		getOpStr: function() {
			var c, i = this.pos, str = this.expression;
			for (; i < str.length; i++) {
				c = str.charCodeAt(i);
				if (c < 65 || c > 122 || (c > 90 && c < 97)) {
					if (i === this.pos || (c != 95 && (c < 48 || c > 57))) {
						break;
					}
				}
			}
			return str.substring(this.pos, i);
		},

		isOp1: function (str) {
			if (str.length > 0 && (str in this.ops1)) {
				this.tokenindex = str;
				this.tokenprio = 61;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isOp2: function (str) {
			if (str.length > 0 && (str in this.ops2)) {
				this.tokenindex = str;
				this.tokenprio = 61;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isVar: function (str) {
			if (str.length > 0) {
				this.tokenindex = str;
				this.tokenprio = 60;
				this.pos += str.length;
				return true;
			}
			return false;
		},

		isComment: function () {
			var code = this.expression.charCodeAt(this.pos - 1);
			if (code === 47 && this.expression.charCodeAt(this.pos) === 42) {
				this.pos = this.expression.indexOf("*/", this.pos) + 2;
				if (this.pos === 1) {
					this.pos = this.expression.length;
				}
				return true;
			}
			return false;
		}
	};

	MathParser.singleton = new MathParser();
	(typeof exports !== 'undefined' && exports || {}).MathParser = MathParser.singleton;
	return MathParser.singleton;
})();
