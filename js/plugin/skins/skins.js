(function ($) {
	$.skins = function () {
		return new skins()
	};
	var skins = (function () {
		var skins = function () {};
		skins.prototype = {
			content : '',
			init : function (force) {
				var self = this;
				if (force == true) {
					self.content = ""
				}
				if (self.content != '') {
					return self.content
				}
				var template = $(this.template());
				if (PDI.getStyle('background', 'backgroundRepeat') == "repeat repeat") {
					template.find(".bgButton[layout='tensile']").addClass("selected")
				} else if (PDI.getStyle('background', 'backgroundSize') == "100% 100%") {
					template.find(".bgButton[layout='tile']").addClass("selected")
				} else if (PDI.getStyle('background', 'backgroundSize') == "100% auto") {
					template.find(".bgButton[layout='autowidth']").addClass("selected")
				} else if (PDI.getStyle('background', 'backgroundSize') == "auto 100%") {
					template.find(".bgButton[layout='autoheight']").addClass("selected")
				} else if (PDI.getStyle('background', 'backgroundPosition') != "") {
					template.find(".bgButton[layout='" + PDI.getStyle('background', 'backgroundPosition') + "']").addClass("selected")
				}
				if (PDI.get("privateSetup", "BgAutoTime") != "0") {
					template.find(".bgAutoTime[automin='" + PDI.get("privateSetup", "BgAutoTime") + "']").addClass("selected")
				} else {
					template.find(".bgAutoTime[automin='0']").addClass("selected")
				}
				template.find(".bgButton[layout]").bind("click", function () {
					if ($(".wallpaper").css('backgroundImage') == 'none') {
						return false
					}
					var layout = $(this).attr('layout');
					template.find(".bgButton[layout]").removeClass("selected");
					$(this).addClass("selected");
					if (layout == "tile") {
						PDI.setStyle('background', 'backgroundRepeat', 'repeat repeat');
						PDI.setStyle('background', 'backgroundSize', '');
						PDI.setStyle('background', 'backgroundPosition', '')
					} else if (layout == "autowidth") {
						PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
						PDI.setStyle('background', 'backgroundSize', '100% auto');
						PDI.setStyle('background', 'backgroundPosition', '50% 50%')
					} else if (layout == "autoheight") {
						PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
						PDI.setStyle('background', 'backgroundSize', 'auto 100%');
						PDI.setStyle('background', 'backgroundPosition', '50% 50%')
					} else if (layout == "tensile") {
						PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
						PDI.setStyle('background', 'backgroundSize', '100% 100%');
						PDI.setStyle('background', 'backgroundPosition', '')
					} else {
						PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
						PDI.setStyle('background', 'backgroundSize', '');
						PDI.setStyle('background', 'backgroundPosition', layout)
					}
					oauth.updateMsgId();
					oauth.synchronize();
					$(".wallpaper").css(PDI.getStyle('background'))
				});
				template.find(".bgColor").find("button").bind("click", function () {
					if (!$(this).hasClass('selected')) {
						var tmp_color = $(this).attr('class').substring(1);
						var _style = PDI.getSkin(PDI.get('privateSetup', 'skin'), 'style');
						var bg = {
							"background" : {
								"backgroundColor" : '#' + tmp_color,
								"backgroundImage" : _style && _style['background'] && _style['background']['backgroundImage'] || ""
							}
						};
						storage.remove('skins');
						PDI.setSkin('skin_cloud', 'style', bg);
						PDI.set('privateSetup', 'skin', 'skin_cloud');
						oauth.updateMsgId();
						oauth.synchronize();
						$('.wallpaper').css({backgroundColor: bg.background.backgroundColor})
					}
				});
				template.find(".bgAutoTime[automin]").bind("click", function () {
					template.find(".bgAutoTime[automin]").removeClass("selected");
					$(this).addClass("selected");
					if (parseInt($(this).attr("automin")) > 0) {
						var _usedWallpaper = PDI.get('usedWallpaper');
						if (_usedWallpaper.length > 0) {
							var _wallpaperId = _usedWallpaper[getRand(0, _usedWallpaper.length)];
							var _wallpaperUrl = "";
							if(parseInt(_wallpaperId) == _wallpaperId) {
								_wallpaperId = parseInt(_wallpaperId);
								$.each(PDI.get("wallpaper"), function (i, n) {
									var _wallpaperLimit = n.split('-');
									if (_wallpaperLimit.length == 2) {
										if (_wallpaperId >= _wallpaperLimit[1] && _wallpaperId <= _wallpaperLimit[0]) {
											_wallpaperUrl = urlImg + 'cloudWallpaper/' + i + '/' + _wallpaperId + '.jpg';
											return
										}
									}
								});
							} else {
								_wallpaperUrl = _wallpaperId;
							}
							if (_wallpaperUrl != "") {
								var _style = PDI.getSkin(PDI.get('privateSetup', 'skin'), 'style');
								var tmp_color = _style && _style['background'] && _style['background']['backgroundColor'] || "";
								var style = {
									"background" : {
										"backgroundColor" : tmp_color,
										"backgroundImage" : "url(" + _wallpaperUrl + ")"
									}
								};
								storage.remove('skins');
								PDI.setSkin('skin_cloud', 'style', style);
								PDI.set('privateSetup', 'skin', 'skin_cloud');
								$('.wallpaper').css({backgroundImage: style.background.backgroundImage})
							}
						}
					}
					PDI.set("privateSetup", "BgAutoTime", parseInt($(this).attr("automin")));
					PDI.set("privateSetup", "BgChangeTime", parseInt(Date.now() / 1000))
				});
				template.find('.bgImport').bind('click', function () {
					$(this).hide();
					$(importFile).show();
					importFile.focus();
					return false;
				});
				template.find('.moreSettings').bind('click', function () {
					template.find('.moreSettingsContainer').toggle()
				});
				template.bind('click', function (e) {
					if (!isContainsClass(e.target, "moreSettingsContainer") && !isContainsClass(e.target, "moreSettings")) {
						template.find('.moreSettingsContainer').hide()
					}
				});
				template.find("#importFile").bind('keydown', function (e) {
					if(e.keyCode != 13) { return; }
					var _style = PDI.getSkin(PDI.get('privateSetup', 'skin'), 'style');
					var bg = {
						"background" : {
							"backgroundColor" : _style && _style['background'] && _style['background']['backgroundColor'] || "",
							"backgroundImage" : "url(" + this.value + ")"
						}
					};
					storage.remove('skins');
					PDI.setSkin('skin_cloud', 'style', bg);
					PDI.set('privateSetup', 'skin', 'skin_cloud');
					if (cloudWallpaper.cacheData['Used'].indexOf(this.value) == -1) {
						cloudWallpaper.cacheData['Used'].splice(0, 0, this.value);
						if (cloudWallpaper.cacheData['Used'].length > 50) {
							cloudWallpaper.cacheData['Used'].splice(50, cloudWallpaper.cacheData['Used'].length - 50)
						}
						PDI.set('usedWallpaper', '', cloudWallpaper.cacheData['Used']);
					}
					$('.wallpaper').css({backgroundImage: bg.background.backgroundImage});
				});
				self.content = template;
				return template
			},
			template : function () {
				return '<div class="skinsContainer"><div class="skinsHeader dragArea"><div class="headerIcon"></div>' + getI18nMsg('skinsAppTitle') + ' - ' +
				getI18nMsg('skinsAppSupported') + ' <a href="http://www.like5.com" target="_blank" style="font-size:18px;color:#454545;text-shadow:none;">LIKE5.COM</a></div><div class="skinsBody"><div class="wallpaperCategorysContainer"><div class="cloudWallpaperCategorys"></div><div class="moreSettings">' +
				getI18nMsg('moreSettings') + '</div></div><div class="cloudWallpaperContainer"></div><div class="autoCloudWallpaperContainer"><div class="bgAutoChange">' +
				getI18nMsg('bgAutoChange') + ':</div><div class="bgAutoTimeContainer"><div class="bgAutoTime" automin="0">' +
					getI18nMsg('never') + '</div><div class="bgAutoTime" automin="5">5' +
					getI18nMsg('minUnit') + '</div><div class="bgAutoTime" automin="10">10' +
					getI18nMsg('minUnit') + '</div><div class="bgAutoTime" automin="30">30' +
					getI18nMsg('minUnit') + '</div><div class="bgAutoTime" automin="60">1' +
					getI18nMsg('hourUnit') + '</div><div class="bgAutoTime" automin="720">12' +
					getI18nMsg('hourUnit') + '</div><div class="bgAutoTime" automin="1440">1' +
					getI18nMsg('dayUnit') + '</div><div class="bgAutoTime" automin="10080">7' +
				getI18nMsg('dayUnit') + '</div></div></div><div class="loading"><img src="img/skin_0/loading2.gif"></div></div><div class="moreSettingsContainer"><div class="arrowBorder"></div><div class="arrow"></div><div class="bgLayoutContainer"><div class="bgLayoutTitle">' +
				getI18nMsg('bgLayout') + '</div><div class="bgLayout"><div class="bgButton left" layout="left">' +
					getI18nMsg('bgLayoutLeft') + '</div><div class="bgButton center" layout="center">' +
					getI18nMsg('bgLayoutCenter') + '</div><div class="bgButton right" layout="right">' +
					getI18nMsg('bgLayoutRight') + '</div></div><div class="bgLayout"><div class="bgButton tile" layout="tile">' +
					getI18nMsg('bgLayoutTile') + '</div><div class="bgButton autowidth" layout="autowidth">' +
					getI18nMsg('bgLayoutAutoWidth') + '</div><div class="bgButton autoheight" layout="autoheight">' +
					getI18nMsg('bgLayoutAutoHeight') + '</div><div class="bgButton tensile" layout="tensile">' +
					getI18nMsg('bgLayoutTensile') + '</div></div></div><div class="bgColorContainer"><div class="bgColorTitle">' +
				getI18nMsg('bgColor') + '</div><div class="bgColor"><button class="CE7E7E7"></button><button class="Cf8b500"></button><button class="C008000"></button><button class="C418b89"></button><button class="Cd2b48c"></button><button class="C0866A4"></button><button class="CAAD930"></button><button class="C686868"></button><button class="C0F204E"></button><button class="CFFFFFF"></button></div></div><div class="bgImportContainer" ' +
				((_browser.msie && _browser.msie <= 9) ? 'style="display: none;"' : '') + '><div class="bgImportTitle"></div><div class="bgImport">' +
				getI18nMsg('bgImportFile') + '</div><input type="text" name="importFile" id="importFile" style="display:none;width:180px;height:18px;border-radius:5px;border:2px #ccc solid;padding: 1px 10px;outline:none;" /></div></div></div>'
			}
		};
		return skins
	})()
})(jq);
var skins = $.skins();
