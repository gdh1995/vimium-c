var setup = {
	content : '',
	_dialBoxSpacingFun: 0,
	_dialBoxWidthFun: 0,
	_dialBoxHeightFun: 0,
	_dialBoxRadiusFun: 0,
	_dialBoxOpacityFun: 0,
	_dialBoxQBCWidthFun: 0,
	init : function (force) {
		var self = this;
		if (force == true) {
			self.content = ""
		}
		if (self.content != '') {
			return self.content
		}
		self.content = $(this.template());
		var dialBoxNum = PDI.get("privateSetup", "dialBoxNum");
		self.content.find("#dialBoxNum").val(dialBoxNum);
		self.content.find("#dialBoxNum").parent().find(".RValue").val(dialBoxNum);
		var dialBoxWidth = PDI.get("privateSetup", "dialBoxWidth");
		self.content.find("#dialBoxWidth").val(dialBoxWidth);
		self.content.find("#dialBoxWidth").parent().find(".RValue").val(dialBoxWidth);
		var dialBoxHeight = PDI.get("privateSetup", "dialBoxHeight");
		if (dialBoxHeight === false) {
			dialBoxHeight = Math.round(dialBoxWidth * 0.56)
		}
		self.content.find("#dialBoxHeight").val(dialBoxHeight);
		self.content.find("#dialBoxHeight").parent().find(".RValue").val(dialBoxHeight);
		var dialBoxSpacing = PDI.get("privateSetup", "dialBoxSpacing");
		self.content.find("#dialBoxSpacing").val(dialBoxSpacing);
		self.content.find("#dialBoxSpacing").parent().find(".RValue").val(dialBoxSpacing);
		var dialBoxRadius = PDI.get("privateSetup", "dialBoxRadius");
		self.content.find("#dialBoxRadius").val(dialBoxRadius);
		self.content.find("#dialBoxRadius").parent().find(".RValue").val(dialBoxRadius);
		var dialBoxOpacity = PDI.get("privateSetup", "dialBoxOpacity");
		self.content.find("#dialBoxOpacity").val(dialBoxOpacity);
		self.content.find("#dialBoxOpacity").parent().find(".RValue").val(Math.round((1 - dialBoxOpacity) * 100));
		var dialBoxQBCWidth = PDI.get("privateSetup", "dialBoxQBCWidth");
		self.content.find("#dialBoxQBCWidth").val(dialBoxQBCWidth);
		self.content.find("#dialBoxQBCWidth").parent().find(".RValue").val(dialBoxQBCWidth);
		var setupInputList = self.content.find("input[type='checkbox']");
		if (setupInputList.length > 0) {
			for (var i = 0; i < setupInputList.length; i++) {
				var _setupKey = $(setupInputList[i]).attr("private") == "true" ? "privateSetup" : "setup";
				if (PDI.get(_setupKey, $(setupInputList[i]).attr("id"))) {
					$(setupInputList[i]).attr("checked", true)
				} else {
					$(setupInputList[i]).removeAttr("checked")
				}
			}
		}
		self.content.find(".recovery").bind('click', function () {
			var clearConfirmMsg = PDI.get("setup", "oauthSource") != "" ? getI18nMsg('clear_confirm').replace('%s', PDI.get("setup", "oauthSource")) : "";
			if (confirm(getI18nMsg('reset_confirm').replace('%s', clearConfirmMsg))) {
				oauth.clear()
			}
		});
		self.content.find(".dialBoxSettingsContainer .more").bind("click", function () {
			self.content.find(".settingBox").css({
				"left" : "-760px",
				"opacity" : 0
			});
			setTimeout(function () {
				self.content.find(".dialBoxSettingsBox").css({
					"left" : "0px",
					"opacity" : 1
				})
			}, 0)
		});
		self.content.find(".back").bind("click", function () {
			self.content.find(".dialBoxSettingsBox").css({
				"left" : "760px",
				"opacity" : 0
			});
			setTimeout(function () {
				self.content.find(".settingBox").css({
					"left" : "0px",
					"opacity" : 1
				})
			}, 0)
		});
		self.content.find('.DBoxNum').bind('click', function () {
			var type = 'default';
			var _screenDialboxOption = screenDialboxOptions['default'];
			if (typeof screenDialboxOptions[screenWidth + "*" + screenHeight] != 'undefined') {
				var _screenDialboxOption = screenDialboxOptions[screenWidth + "*" + screenHeight]
			}
			$.each(_screenDialboxOption, function (i, n) {
				DBOX[i] = n
			});
			DBOX.num = parseInt($(this).text());
			DBOX.titleShow = false;
			if ($(this).parent().hasClass('default')) {
				DBOX.radius = 4
			} else if ($(this).parent().hasClass('circular')) {
				type = "square";
				DBOX.radius = 200
			} else if ($(this).parent().hasClass('square')) {
				type = "square";
				DBOX.radius = 12
			} else if ($(this).parent().hasClass('seamless')) {
				type = "seamless";
				DBOX.spacing = 0;
				DBOX.radius = 0
			}
			if (type == "square") {
				DBOX.titleShow = true;
				DBOX.width = _screenDialboxOption['height'];
				DBOX.height = DBOX.width
			}
			PDI.set('privateSetup', 'dialBoxNum', DBOX.num);
			PDI.set('privateSetup', 'dialBoxSpacing', DBOX.spacing);
			PDI.set('privateSetup', 'dialBoxWidth', DBOX.width);
			PDI.set('privateSetup', 'dialBoxHeight', DBOX.height);
			PDI.set('privateSetup', 'dialBoxRadius', DBOX.radius);
			PDI.set('privateSetup', 'dialBoxMaxTop', DBOX.maxTop);
			PDI.set('privateSetup', 'dialBoxQBCWidth', DBOX.QBContainerWidth);
			if (PDI.get('privateSetup', 'dialBoxTitleSwitch') != DBOX.titleShow) {
				$(self.content.find('#dialBoxTitleSwitch')).get(0).click()
			}
			self.content.find("#dialBoxNum").val(DBOX.num);
			self.content.find("#dialBoxNum").parent().find(".RValue").val(DBOX.num);
			self.content.find("#dialBoxWidth").val(DBOX.width);
			self.content.find("#dialBoxWidth").parent().find(".RValue").val(DBOX.width);
			self.content.find("#dialBoxHeight").val(parseInt(DBOX.height));
			self.content.find("#dialBoxHeight").parent().find(".RValue").val(DBOX.height);
			self.content.find("#dialBoxSpacing").val(DBOX.spacing);
			self.content.find("#dialBoxSpacing").parent().find(".RValue").val(DBOX.spacing);
			self.content.find("#dialBoxRadius").val(DBOX.radius);
			self.content.find("#dialBoxRadius").parent().find(".RValue").val(DBOX.radius);
			self.content.find("#dialBoxQBCWidth").val(DBOX.QBContainerWidth);
			self.content.find("#dialBoxQBCWidth").parent().find(".RValue").val(DBOX.QBContainerWidth);
			DBOX.init(true);
			oauth.updateMsgId();
			oauth.synchronize();
			$("#setupDialog").find('.close').get(0).click()
		});
		self.content.find("#dialBoxNum").bind("change", function () {
			self.changeDialBoxNum($(this).val(), 'range')
		});
		self.content.find("#dialBoxNum").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxNum($(this).val())
		});
		self.content.find("#dialBoxWidth").bind("change", function () {
			self.changeDialBoxWidth($(this).val(), "range")
		});
		self.content.find("#dialBoxWidth").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxWidth($(this).val())
		});
		self.content.find("#dialBoxHeight").bind("change", function () {
			self.changeDialBoxHeight($(this).val(), "range")
		});
		self.content.find("#dialBoxHeight").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxHeight($(this).val())
		});
		self.content.find("#dialBoxRadius").bind("change", function () {
			self.changeDialboxRadius($(this).val(), "range")
		});
		self.content.find("#dialBoxRadius").parent().find(".RValue").bind("change", function () {
			self.changeDialboxRadius($(this).val())
		});
		self.content.find("#dialBoxSpacing").bind("change", function () {
			self.changeDialBoxSpacing($(this).val(), "range")
		});
		self.content.find("#dialBoxSpacing").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxSpacing($(this).val())
		});
		self.content.find("#dialBoxOpacity").bind("change", function () {
			self.changeDialBoxOpacity($(this).val(), "range")
		});
		self.content.find("#dialBoxOpacity").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxOpacity($(this).val())
		});
		self.content.find("#dialBoxQBCWidth").bind("change", function () {
			self.changeDialBoxQBCWidth($(this).val(), "range")
		});
		self.content.find("#dialBoxQBCWidth").parent().find(".RValue").bind("change", function () {
			self.changeDialBoxQBCWidth($(this).val())
		});
		self.content.find(".oauthLogout").bind("click", function () {
			window.location.href = oauth.oauthApiUrl + "&a=logout&referer=" + window.location.protocol + "//" + window.location.hostname + window.location.pathname + "&t=" + Date.now()
		});
		self.content.find(".loginButtonMore").bind("click", function () {
			$(this).hide();
			self.content.find(".loginButton").show()
		});
		self.content.find(".oauthSyn").bind("click", function () {
			var self = this;
			$(self).html('.');
			var i = 1;
			var _synfun = setInterval(function () {
					if (i < 8) {
						$(self).html($(self).html() + '.');
						i++
					} else {
						$(self).html('.');
						i = 1
					}
				}, 150);
			oauth.updateMsgId();
			oauth.synchronize(function () {
				setTimeout(function () {
					clearInterval(_synfun);
					$(self).html(" [ " + getI18nMsg('synchronize') + " ] ")
				}, 1500)
			})
		});
		self.content.find(".dataAction").bind("click", function () {
			if ($(this).hasClass('import')) {
				if (confirm(getI18nMsg('import_confirm'))) {
					$("#importData").get(0).click();
					return false
				}
			} else if ($(this).hasClass('export')) {
				var db1 = storage.db;
				var data1 = {confver: 1};
				for (var i in db1) {
					if (i != 'oauthData' && db1.hasOwnProperty(i)) {
						try {
							data1[i] = JSON.parse(db1[i]);
						} catch (e) {
							data1[i] = db1[i];
						}
					}
				}
				var data = JSON.stringify(data1, null, '\t');
				var hiddenA = self.content.find(".dataContainer #hiddenA");
				if (hiddenA.length == 0) {
					hiddenA = $('<a id="hiddenA" style="display:none"></a>');
					self.content.find(".dataContainer").append(hiddenA);
				}
				var d = new Date();
				var force2 = function(i) {
					return ((i <= 9) ? '0'  : '') + i;
				}
				hiddenA[0].download = ['vim++_', d.getFullYear(), force2(d.getMonth() + 1), force2(d.getDate()),
					'_', force2(d.getHours()), force2(d.getMinutes()), force2(d.getSeconds()), '.json'].join('');
				hiddenA[0].href = 'data:application/json;charset=utf-8;base64,'+rstr2b64(str2rstr_utf8(data));
				hiddenA[0].click();
			}
		});
		self.content.find("#importData").bind('change', function () {
			var file = this.files[0];
			this.value = '';
			this.files = null;
			var reader = new FileReader();
			reader.onload = function (e) {
				var oriUpdateConf = function (obj) {
					if (oauth.save(obj)) {
						oauth.updateMsgId();
						oauth.synchronize();
					}
				};
				var data;
				try {
					data = JSON.parse(this.result);
					if (data == undefined) {
						return $.post(urlImg + "weidu/wc.json.php", {
							a : "import",
							lang : ui_locale,
							data : this.result
						}, function(result) {
							if (!result || result.startsWith('ERROR')) {
								showNotice(getI18nMsg('importError'));
								return false
							}
							var resultObj = JSON.parse(result);
							if (resultObj.dataVersion && JSON.parse(resultObj.dataVersion) && _config.dataVersion < JSON.parse(resultObj.dataVersion)) {
								showNotice(getI18nMsg('oauthImportDataVersionError'));
								return false
							}
							oriUpdateConf(resultObj);
							setTimeout(function () { window.location.reload(true); }, 200);
						});
					}
					var ver = data.confver;
					delete data.confver;
					if (ver >= 1) {
						var db = storage.db;
						db.clear();
						for (var i in data) {
							db.setItem(i, JSON.stringify(data[i]));
						}
					} else {
						oriUpdateConf(data);
					}
					setTimeout(function () { window.location.reload(true); }, 200);
				} finally {
				}
			};
			reader.readAsText(file);
		});
		self.content.find("input[type='checkbox']").bind('click', function () {
			var dataSet = true;
			if ($(this).attr('id') == 'dialBoxTitleSwitch') {
				if ($(this).attr('checked') == null) {
					DBOX.titleShow = true
				} else {
					DBOX.titleShow = false
				}
				DBOX.init()
			}
			if ($(this).attr('id') == 'targetSwitch') {
				if ($(this).attr('checked') == null) {
					targetSwitch = true
				} else {
					targetSwitch = false
				}
			}
			if ($(this).attr('id') == 'contextMenusSwitch') {
				if ($(this).attr('checked') == null) {
					chrome.contextMenus.create({
						id : "addToDialbox",
						title : getI18nMsg("contextMenusAddToDialbox")
					}, function () {})
				} else {
					chrome.contextMenus.remove("addToDialbox", function () {})
				}
			}
			if ($(this).attr('id') == 'dialBoxCloudBoxSwitch') {
				if ($(this).attr('checked') == null) {
					DBOX.cloudBoxShow = true
				} else {
					DBOX.cloudBoxShow = false
				}
				PDI.set("privateSetup", "dialBoxCloudBoxSwitch", DBOX.cloudBoxShow);
				DBOX.init()
			}
			if ($(this).attr('id') == 'dialBoxPageSwitcher') {
				if ($(this).attr('checked') == null) {
					DBOX.pageSwitcherShow = true
				} else {
					DBOX.pageSwitcherShow = false
				}
				DBOX.pageIndex()
			}
			if ($(this).attr('id') == 'dialBoxPage3DSwitcher') {
				if ($(this).attr('checked') == null) {
					DBOX.page3DSwitcherOpen = true
				} else {
					DBOX.page3DSwitcherOpen = false
				}
				DBOX.init()
			}
			if ($(this).attr('id') == 'dialBoxQuickSwitcher') {
				if ($(this).attr('checked') == null) {
					DBOX.dialBoxQuickHide = true
				} else {
					DBOX.dialBoxQuickHide = false
				}
				DBOX.position()
			}
			if (dataSet) {
				var _setupKey = $(this).attr("private") == "true" ? "privateSetup" : "setup";
				PDI.set(_setupKey, $(this).attr('id'), $(this).attr('checked') == null ? true : false);
				oauth.updateMsgId();
				oauth.synchronize();
				if ($(this).attr('checked') == null) {
					$(this).attr("checked", true)
				} else {
					$(this).removeAttr("checked")
				}
			}
		});
		return self.content
	},
	changeDialBoxNum : function (v, t) {
		var self = this;
		if (_nowNum == PDI.get('privateSetup', 'dialBoxNum')) {
			return false
		}
		var skipNum = {
			5 : true,
			7 : true,
			10 : true,
			11 : true,
			13 : true,
			14 : true,
			17 : true,
			19 : true,
			22 : true,
			23 : true,
			26 : true,
			29 : true,
			31 : true
		};
		if (skipNum[v] == true || !v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxNum").attr("min") || v * 1 > self.content.find("#dialBoxNum").attr("max")) {
			return false
		}
		var _nowNum = v;
		if (t == "range") {
			self.content.find("#dialBoxNum").parent().find(".RValue").val(_nowNum)
		} else {
			self.content.find("#dialBoxNum").val(_nowNum)
		}
		PDI.set('privateSetup', 'dialBoxNum', _nowNum);
		oauth.updateMsgId();
		oauth.synchronize();
		DBOX.num = _nowNum;
		DBOX.init(true)
	},
	changeDialBoxWidth : function (v, t) {
		var self = this;
		if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxWidth").attr("min") || v * 1 > self.content.find("#dialBoxWidth").attr("max")) {
			return false
		}
		if (t == "range") {
			self.content.find("#dialBoxWidth").parent().find(".RValue").val(v)
		} else {
			self.content.find("#dialBoxWidth").val(v)
		}
		clearTimeout(self._dialBoxWidthFun);
		self._dialBoxWidthFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxWidth', parseInt(v));
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.width = parseInt(v);
				DBOX.init(true)
			}, 200)
	},
	changeDialBoxHeight : function (v, t) {
		var self = this;
		if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxHeight").attr("min") || v * 1 > self.content.find("#dialBoxHeight").attr("max")) {
			return false
		}
		if (t == "range") {
			self.content.find("#dialBoxHeight").parent().find(".RValue").val(v)
		} else {
			self.content.find("#dialBoxHeight").val(v)
		}
		clearTimeout(self._dialBoxHeightFun);
		self._dialBoxHeightFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxHeight', parseInt(v));
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.height = parseInt(v);
				DBOX.init(true)
			}, 200)
	},
	changeDialboxRadius : function (v, t) {
		var self = this;
		if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxRadius").attr("min") || v * 1 > self.content.find("#dialBoxRadius").attr("max")) {
			return false
		}
		if (t == "range") {
			self.content.find("#dialBoxRadius").parent().find(".RValue").val(v)
		} else {
			self.content.find("#dialBoxRadius").val(v)
		}
		clearTimeout(self._dialBoxRadiusFun);
		self._dialBoxRadiusFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxRadius', parseInt(v));
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.radius = parseInt(v);
				DBOX.init(true)
			}, 200)
	},
	changeDialBoxSpacing : function (v, t) {
		var self = this;
		if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxSpacing").attr("min") || v * 1 > self.content.find("#dialBoxSpacing").attr("max")) {
			return false
		}
		if (t == "range") {
			self.content.find("#dialBoxSpacing").parent().find(".RValue").val(v)
		} else {
			self.content.find("#dialBoxSpacing").val(v)
		}
		clearTimeout(self._dialBoxSpacingFun);
		self._dialBoxSpacingFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxSpacing', parseInt(v));
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.spacing = parseInt(v);
				DBOX.init()
			}, 200)
	},
	changeDialBoxOpacity : function (v, t) {
		var self = this;
		if (t == "range") {
			v = v == 1 ? 1 : v.substring(0, v.indexOf(".") + 2);
			self.content.find("#dialBoxOpacity").parent().find(".RValue").val(Math.round((1 - v) * 100))
		} else {
			if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxOpacity").attr("min") * 100 || v * 1 > self.content.find("#dialBoxOpacity").attr("max") * 100) {
				return false
			}
			if (v % 10 != 0) {
				v = Math.round(v / 10) * 10;
				self.content.find("#dialBoxOpacity").parent().find(".RValue").val(v)
			}
			v = (100 - v) / 100;
			self.content.find("#dialBoxOpacity").val(v)
		}
		clearTimeout(self._dialBoxOpacityFun);
		self._dialBoxOpacityFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxOpacity', v);
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.opacity = v * 1;
				var oldClass = $('.normalDialbox').attr('class').replace('normalDialbox ', '');
				$('.normalDialbox').removeClass(oldClass).addClass('op_' + v * 10)
			}, 200)
	},
	changeDialBoxQBCWidth : function (v, t) {
		var self = this;
		if (!v.match(/^\d+$/) || v * 1 < self.content.find("#dialBoxQBCWidth").attr("min") || v * 1 > self.content.find("#dialBoxQBCWidth").attr("max")) {
			return false
		}
		if (t == "range") {
			self.content.find("#dialBoxQBCWidth").parent().find(".RValue").val(v)
		} else {
			self.content.find("#dialBoxQBCWidth").val(v)
		}
		clearTimeout(self._dialBoxQBCWidthFun);
		self._dialBoxQBCWidthFun = setTimeout(function () {
				PDI.set('privateSetup', 'dialBoxQBCWidth', v);
				oauth.updateMsgId();
				oauth.synchronize();
				DBOX.QBContainerWidth = v;
				DBOX.measurement();
				DBOX.positionQBox()
			}, 200)
	},
	template : function () {
		var dialBoxStyles = {
			'default' : [((screenWidth / screenHeight >= 1.25) ? 9 : 8), 12, ((screenWidth / screenHeight >= 1.25) ? 16 : 15), 20],
			'square' : [8, 12, 15, 21],
			'seamless' : [9, 12, 16, 20]
		},
		dialBoxStyleContents = {
			'default' : '',
			'square' : '',
			'seamless' : ''
		};
		$.each(dialBoxStyles, function (i, n) {
			$.each(n, function (k, v) {
				if (k < 3 || i == 'square' || (k == 3 && screenWidth >= 1440 && screenHeight >= 900)) {
					dialBoxStyleContents[i] += '<div class="DBoxNum">' + v + '</div>'
				}
			})
		});
		var loginButtonHtml = '';
		PDI.set("setup", "oauthKey", '');
		if (oauth.oauthId) {
			loginButtonHtml += '<div class="loginButton"><img src="js/plugin/setup/img/skin_0/login_' + oauth.oauthSource + '.png" width="87" height="32" /></div><div class="userContent"><div class="userContentArrowBorder"></div><div class="userContentArrow"></div><span class="oauthCode">' + oauth.oauthCode + '</span><span class="oauthSyn">[ ' + getI18nMsg('synchronize') + ' ]</span><span class="oauthLogout">[ ' + getI18nMsg('logout') + ' ]</span></div>'
		} else {
			var show_limit = 5;
			$.each(_config["oauthType"], function (i, n) {
				loginButtonHtml += '<div class="loginButton" style="display:' + (i < show_limit ? "block" : "none") + '"><a href="' + urlImg + 'oauth/login.php?sign=' + n + '&oauthKey=' + PDI.get("setup", "oauthKey") + '&referer=' + window.location.protocol + '//' + window.location.hostname + window.location.pathname + '&hash=synchronize&t=' + Date.now() + '" target="_self"><img src="js/plugin/setup/img/skin_0/login_' + n + '.png" width="87" height="32" title="' + getI18nMsg(n + 'LoginTypeTitle') + '"/></a></div>'
			});
			if (_config["oauthType"].length > show_limit) {
				loginButtonHtml += '<div class="loginButtonMore" title="' + getI18nMsg('more') + '"></div>'
			}
		}
		var suggestHtml = '<div class="suggest"><a href="http://www.' + officialDomain + '/feedback.html" target="_blank">' + getI18nMsg('suggest') + '</a></div><div class="useHelp"><a href="http://www.' + officialDomain + '/help.html" target="_blank">' + getI18nMsg('useHelp') + '</a></div><div class="version"><a>( V' +  _config.version.replace(".360", "") + ' )</a></div>';
		return '<div class="settingContainer"><div class="settingBox"><div class="titleBar dragArea"><div class="titleBarIcon"></div>' + getI18nMsg('setupAppTitle') + '</div><div class="baseSettingsBar"><span>' + getI18nMsg('baseSettingsMore') + '</span></div><div class="dialBoxSettingsContainer"><div class="dialBoxStyle square">' + dialBoxStyleContents['square'] + '</div><div class="dialBoxStyle circular">' + dialBoxStyleContents['square'] + '</div><div class="dialBoxStyle seamless">' + dialBoxStyleContents['seamless'] + '</div><div class="dialBoxStyle default">' + dialBoxStyleContents['default'] + '</div><div class="more" title="' + getI18nMsg('dialBoxSettingsMore') + '"></div></div><div class="baseSettingsContainer"><div class="settingsItem"><span>' + getI18nMsg('targetSwitch') + '</span><div class="settingsItemSwitch"><input type="checkbox" id="targetSwitch" private="true"/><label for="targetSwitch"></label></div></div><div class="settingsItem"><span>' + getI18nMsg('dialBoxPageSwitcher') + '</span><div class="settingsItemSwitch"><input type="checkbox" id="dialBoxPageSwitcher" private="true"/><label for="dialBoxPageSwitcher"></label></div></div><div class="settingsItem"><span>' + getI18nMsg('contextMenusSwitch') + '</span><div class="settingsItemSwitch"><input type="checkbox" id="contextMenusSwitch" /><label for="contextMenusSwitch"></label></div></div><div class="settingsItem' + (cId != "" ? " last" : "") + '"><span>' + getI18nMsg('openSwitch') + '</span><div class="settingsItemSwitch"><input type="checkbox" id="openSwitch" /><label for="openSwitch"></label></div></div><div class="settingsItem" style="display:' + (cId != "" ? "none" : "block") + '"><span>' + getI18nMsg('settingSecovery') + '</span><button class="recovery">' + getI18nMsg('default') + '</button></div></div><div class="oathSettingsBar"><span>' + getI18nMsg('login') + '</span><span class="right">' + getI18nMsg('loginMemo') + '</span></div><div class="oathSettingsContainer"><div class="settingsItem" style="display:' + (cId != "" ? "none" : "block") + '"><span>' + getI18nMsg('backup') + '</span><div class="dataContainer"><div class="dataAction"><input type="file" name="importData" id="importData" style="visibility:hidden;width:0px;height:0px;" accept="*/*" /></div><div class="dataAction export"><div class="icon export"></div><div>' + getI18nMsg('export') + '</div></div><div class="dataAction import"><div class="icon import"></div><div>' + getI18nMsg('import') + '</div></div></div></div><div class="settingsItem"><span>' + (oauth.oauthId ? getI18nMsg('autoBackup') : getI18nMsg('openAutoBackup')) + '</span><div class="loginContainer">' + loginButtonHtml + '</div></div></div>' + suggestHtml + '</div><div class="dialBoxSettingsBox"><div class="titleBar dragArea"><div class="titleBarIcon"></div>' + getI18nMsg('dialBoxSettingsMore') + '<div class="back">' + getI18nMsg('backSettings') + '</div></div><div class="settingsMoreContainer"><div class="containerBorder"><div class="dialBoxPage3DBar"><span>' + getI18nMsg('dialBoxPage3DSwitcher') + '</span><div class="dialBoxPage3D"><input type="checkbox" id="dialBoxPage3DSwitcher" private="true"/><label for="dialBoxPage3DSwitcher"></label></div></div><div class="dialBoxTitleBar"><span>' + getI18nMsg('dialBoxTitleSwitch') + '</span><div class="dialBoxTitle"><input type="checkbox" id="dialBoxTitleSwitch" private="true"/><label for="dialBoxTitleSwitch"></label></div></div><div class="dialBoxQuickBar"><span>' + getI18nMsg('dialBoxQuickSwitcher') + '</span><div class="dialBoxQuick"><input type="checkbox" id="dialBoxQuickSwitcher" private="true"/><label for="dialBoxQuickSwitcher"></label></div></div><div class="dialBoxCloudBoxBar"><span>' + getI18nMsg('dialBoxCloudBoxSwitch') + '</span><div class="dialBoxCloudBox"><input type="checkbox" id="dialBoxCloudBoxSwitch" private="true"/><label for="dialBoxCloudBoxSwitch"></label></div></div></div><div class="containerBorder"><div class="dialBoxNumBar"><span>' + getI18nMsg('dialBoxNum') + '</span><div class="dialBoxNum"><input type="range" rtype="range" min="4" max="32" step="1" id="dialBoxNum" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxNumUnit') + '</div></div></div><div class="dialBoxWidthBar"><span>' + getI18nMsg('dialBoxWidth') + '</span><div class="dialBoxWidth"><input type="range" rtype="range" min="1" max="800" step="1" id="dialBoxWidth" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxWidthUnit') + '</div></div></div><div class="dialBoxHeightBar"><span>' + getI18nMsg('dialBoxHeight') + '</span><div class="dialBoxHeight"><input type="range" rtype="range" min="1" max="800" step="1" id="dialBoxHeight" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxHeightUnit') + '</div></div></div><div class="dialBoxRadiusBar"><span>' + getI18nMsg('dialBoxRadius') + '</span><div class="dialBoxRadius"><input type="range" rtype="range" min="0" max="400" step="1" id="dialBoxRadius" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxRadiusUnit') + '</div></div></div><div class="dialBoxSpacingBar"><span>' + getI18nMsg('dialBoxSpacing') + '</span><div class="dialBoxSpacing"><input type="range" rtype="range" min="0" max="100" step="1" id="dialBoxSpacing" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxSpacingUnit') + '</div></div></div><div class="dialBoxOpacityBar"><span>' + getI18nMsg('dialBoxOpacity') + '</span><div class="dialBoxOpacity"><input type="range" rtype="range" min="0" max="1" step="0.1" id="dialBoxOpacity" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxOpacityUnit') + '</div></div></div><div class="dialBoxQBCWidthBar"><span>' + getI18nMsg('dialBoxQBCWidth') + '</span><div class="dialBoxQBCWidth"><input type="range" rtype="range" min="800" max="' + screenWidth + '" step="1" id="dialBoxQBCWidth" autocomplete="off"><div title="' + getI18nMsg('dialBoxSettingsEditTitle') + '"><input type="text" class="RValue" /></div><div class="unit">' + getI18nMsg('dialBoxQBCWidthUnit') + '</div></div></div></div></div></div></div>'
	}
};