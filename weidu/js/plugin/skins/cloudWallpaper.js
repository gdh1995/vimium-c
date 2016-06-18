var cloudWallpaper = {
	_loadFun: 0,
	cwURL: urlImg + 'cloudWallpaper/',
	cacheDataAll: {},
	contpp: null,
	container : null,
	page : 1,
	num : 30,
	loading : false,
	category : 'Beauty',
	cacheData : {},
	init : function () {
		var self = this;
		self.cacheData['All'] = [];
		self.cacheData['Used'] = PDI.get("usedWallpaper");
		$.getJSON(self.cwURL + 'index.json?t=' + new Date().getDay(), function (data) {
			PDI.set("wallpaper", "", data);
			$.each(data, function (i, n) {
				if (n != "") {
					self.cacheData[i] = [];
					var _tmp = n.split(',');
					if (_tmp.length > 0) {
						$.each(_tmp, function (k, v) {
							var _vtmp = v.split('-');
							if (_vtmp.length == 2) {
								for (var index = _vtmp[0]; index >= _vtmp[1]; index--) {
									self.cacheData[i].push(index * 1);
									if (i != "Beauty" || ui_locale == "zh_CN" || parseInt(Math.random() * (10 - 1) + 1) % 5 == 1) {
										self.cacheData['All'].push(index * 1)
									}
									self.cacheDataAll[index * 1] = i
								}
							}
						})
					}
					self.contpp.find('.cloudWallpaperCategorys').append($('<div class="categoryItem" id="' + i + '">' + getI18nMsg('wallpaperCategory' + i) + '</div>').unbind('click').bind('click', function () {
							self.initWallpaperContainer($(this).attr('id'), 1);
						}))
				}
			});
			self.contpp.find('.cloudWallpaperCategorys').append($('<div class="categoryItem" id="Used">' + getI18nMsg('wallpaperCategoryUsed') + '</div>').unbind('click').bind('click', function () {
					self.initWallpaperContainer($(this).attr('id'), 1);
				}));
			self.shuffle(self.cacheData['All']);
			self.contpp.find('.cloudWallpaperCategorys').prepend($('<div class="categoryItem selected" id="All">' + getI18nMsg('wallpaperCategoryAll') + '</div>').unbind('click').bind('click', function () {
					self.initWallpaperContainer($(this).attr('id'), 1);
				}));
			if (self.cacheData['Used'] && self.cacheData['Used'].length > 0) {
				self.category = 'Used';
			} else {
				self.category = 'All';
			}
			self.initWallpaperContainer(self.category, self.page)
		})
	},
	initWallpaperContainer : function (category, page) {
		var self = this;
		self.contpp.find('.cloudWallpaperCategorys .categoryItem').removeClass('selected');
		self.contpp.find('.cloudWallpaperCategorys #' + category).addClass('selected');
		if (category == 'Used' && self.cacheData['Used'].length > 0) {
			self.contpp.find('.autoCloudWallpaperContainer').show();
		} else {
			self.contpp.find('.autoCloudWallpaperContainer').hide();
		}
		self.container.unbind('scroll');
		if (self._loadFun) {
			clearTimeout(self._loadFun)
		}
		if (typeof category != 'undefined') {
			self.category = category
		}
		if (typeof page != 'undefined') {
			self.page = page
		}
		self.container.get(0).scrollTop = 0;
		self.container.siblings('.loading').css("visibility", "visible");
		self.container.empty();
		self.loadWallpaper()
	},
	loadWallpaper : function () {
		var self = this;
		var start = (self.page - 1) * self.num,
		end = start + self.num;
		var float = "";
		for (var i = start; i < end; i++) {
			if (typeof self.cacheData[self.category][i] != 'undefined') {
				var imgIndex = self.cacheData[self.category][i];
				var realsrc;
				if (parseInt(imgIndex) == imgIndex) {
					if (self.category == 'All' || self.category == 'Used') {
						realsrc = self.cwURL + self.cacheDataAll[imgIndex] + '/' + imgIndex + '.jpg'
					} else {
						realsrc = self.cwURL + self.category + '/' + imgIndex + '.jpg'
					}
				} else {
					realsrc = imgIndex;
				}
				if (i % 5 == 0 && i > 0) {
					float = float == "" ? " right" : ""
				}
				self.container.append($('<div class="cloudWallpaperItem' + (i % 5 == 0 ? " big" : "") + '" imgIndex="' + imgIndex + '"><img realsrc="' + realsrc + '" src="' + realsrc.replace(/\/(\d{4}\.)/, '/s_$1') + '" /><div class="cloudWallpaperItemDownload"></div>' + (self.category == "Used" ? '<div class="cloudWallpaperItemDelete" title="' + getI18nMsg("delete") + '"></div>' : '') + '<div class="cloudWallpaperItemBar"></div></div>').unbind('click').bind('click', function (e) {
						var thisSelf = $(this);
						var imgIndex = thisSelf.attr("imgIndex");
						var url = thisSelf.find('img').attr('realsrc');
						if (isContainsClass(e.target, 'cloudWallpaperItemDownload')) {
							var hiddenA = self.container.find("#hiddenA");
							if (hiddenA.length == 0) {
								hiddenA = $('<a id="hiddenA" style="display:none"></a>');
								self.container.append(hiddenA);
							}
							var out = /\/([^\/]+)\/(\d{4})\./.exec(url);
							hiddenA[0].download = out ? (out[1] + '_' + out[2]) : '';
							hiddenA[0].href = url;
							hiddenA[0].click();
							return false
						}
						if (isContainsClass(e.target, 'cloudWallpaperItemDelete')) {
							setTimeout(function () {
								var _index = self.cacheData['Used'].indexOf(thisSelf.attr('imgIndex'));
								if (_index > -1) {
									self.cacheData['Used'].splice(_index, 1);
									PDI.set('usedWallpaper', '', self.cacheData['Used']);
									oauth.updateMsgId();
									oauth.synchronize()
								}
								thisSelf.remove()
							}, 200);
							return false
						}
						if (self.loading) {
							return false
						}
						self.loading = true;
						thisSelf.append('<div class="wallpaperLoading"><img src="img/skin_0/loading2.gif"></div>');
						var imgObj = new Image();
						$(imgObj).bind('load', function () {
							$(".bgButton[layout]").removeClass("selected");
							if (self.category != 'Used') {
								if ((screenWidth / screenHeight) < (imgObj.width / imgObj.height)) {
									PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
									PDI.setStyle('background', 'backgroundSize', 'auto 100%');
									PDI.setStyle('background', 'backgroundPosition', '50% 50%');
									$(".bgButton[layout='autoheight']").addClass("selected")
								} else {
									PDI.setStyle('background', 'backgroundRepeat', 'no-repeat');
									PDI.setStyle('background', 'backgroundSize', '100% auto');
									PDI.setStyle('background', 'backgroundPosition', '50% 50%');
									$(".bgButton[layout='autowidth']").addClass("selected")
								}
							}
							// $(".wallpaper").css(PDI.getStyle('background'));
							var _skin = PDI.get('privateSetup', 'skin');
							var _style = PDI.getSkin(_skin, 'style');
							var tmp_color = _style && _style['background'] && _style['background']['backgroundColor'] || "";
							var style = {
								"background" : {
									"backgroundColor" : tmp_color,
									"backgroundImage" : "url(" + url + ")"
								}
							};
							storage.remove('skins');
							PDI.setSkin('skin_cloud', 'style', style);
							PDI.set('privateSetup', 'skin', 'skin_cloud');
							var cused = self.cacheData['Used'];
							if (cused.indexOf(thisSelf.attr('imgIndex')) == -1) {
								cused.splice(0, 0, thisSelf.attr('imgIndex'));
								if (cused.length > 50) {
									cused.splice(50, cused.length - 50);
								}
								PDI.set('usedWallpaper', '', cused);
							}
							oauth.updateMsgId();
							oauth.synchronize();
							$('.wallpaper').css(style.background);
							installWall('skin_cloud', url);
							self.loading = false;
							thisSelf.find('.wallpaperLoading').remove()
						});
						imgObj.src = url
					}))
			}
		}
		self.container.siblings('.loading').css("visibility", "hidden");
		self.page++;
		if (end >= self.cacheData[self.category].length) {
			self.container.unbind('scroll')
		} else {
			self.container.unbind('scroll').bind('scroll', function () {
				self.container.find('#refresh').remove();
				self.container.append('<div id="refresh"></div>');
				if (this.scrollHeight - this.scrollTop - this.offsetHeight < 180) {
					if (self.container.siblings('.loading').css("visibility") == "hidden") {
						self.container.siblings('.loading').css("visibility", "visible");
						self._loadFun = setTimeout(function () {
								self.loadWallpaper()
							}, 1500)
					}
				}
			})
		}
	},
	shuffle: function (aArr) {
		var iLength = aArr.length, i = iLength, mTemp, iRandom;
		while (i--) {
			if (i !== (iRandom = Math.floor(Math.random() * iLength))) {
				mTemp = aArr[i];
				aArr[i] = aArr[iRandom];
				aArr[iRandom] = mTemp
			}
		}
	}
};
cloudWallpaper.container = $('.cloudWallpaperContainer');
cloudWallpaper.contpp = cloudWallpaper.container.parent().parent();
cloudWallpaper.init();
