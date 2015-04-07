(function ($) {
	$.createWebsite = function (opt) {
		return new createWebsite(opt)
	};
	var createWebsite = (function (opt) {
		var createWebsite = function (opt) {
			var self = this;
			$.each(opt, function (i, n) {
				self[i] = n
			});
			self.init()
		};
		createWebsite.prototype = {
			suggestHide : true,
			trends : [],
			defaultLogoUrl : urlImg + 'ie_logo.png',
			defaultUrl : '',
			defaultTitle : '',
			url : '',
			title : '',
			LogoUrl : '',
			isUpdate : false,
			container : '',
			init : function () {
				var self = this;
        chrome.history.search({
          text : '',
          maxResults : 5000,
          startTime : 0
        }, function (data) {
          if (data instanceof Array && data.length > 0) {
            $.each(data, function (i, n) {
              if (typeof n.url != "undefined" && n.url.indexOf('http') === 0) {
                try {
                  var _domain = n.url.match(/[^:]+:\/\/([^\/]+)/);
                  var domain = _domain[1];
                  if (domain) {
                    if (self.trends.indexOf(domain) == -1) {
                      self.trends.push(domain)
                    }
                  }
                } catch (error) {}

              }
            })
          }
        });
				$('#cloudDialog').bind("click", function (e) {
					if (!isContainsClass(e.target, "selectArrow") && !isContainsClass(e.target, "logoContainer")) {
						if (self.container.find('.logoBox').hasClass("selected")) {
							self.container.find('.logoBox').removeClass("selected");
							self.container.find('.logoContainer').hide()
						}
					}
				});
				self.container.find('.selectArrow').unbind('click').bind('click', function () {
					if (!self.container.find('.logoBox').hasClass("selected")) {
						self.container.find('.logoBox').addClass("selected");
						self.container.find('.logoContainer').show()
					} else {
						self.container.find('.logoBox').removeClass("selected");
						self.container.find('.logoContainer').hide()
					}
				});
				self.container.find("#logoData").bind('change', function () {
					var file = this.files[0];
					if (file.size >= 30 * 1024) {
						showNotice(getI18nMsg('logoFileLarger'));
						return
					}
					var reader = new FileReader();
					reader.readAsDataURL(file);
					reader.onload = function (e) {
						$.post(urlImg + "weidu/uploadLogo.php", {
							"imgData" : this.result
						}, function (result) {
							if (result && result.substring(0, 5) == 'ERROR') {
								showNotice(getI18nMsg('logoFileUploadError'));
								return
							}
							self.container.find('#webSiteLogo').val(urlImg + result);
							self.loadLogo(urlImg + result);
							self.container.find('.logoBox').removeClass("selected");
							self.container.find('.logoContainer').hide()
						})
					};
					$(this).val('');
					this.files = null
				});
				self.container.find('.aboutTabs div').bind('click', function () {
					if ($(this).hasClass('currentTab') && isApp) {
						return false
					}
					if (!$(this).hasClass('selected')) {
						self.container.find('.aboutTabs div').removeClass("selected");
						self.container.find('.visiteContainer').removeClass("selected");
						$(this).addClass("selected");
						if ($(this).hasClass('topTab')) {
							self.container.find(".visiteContainer[tab='topTab']").addClass("selected")
						} else {
							self.container.find(".visiteContainer[tab='currentTab']").addClass("selected")
						}
					}
				});
				self.container.find('#resetBtn').bind("click", function () {
					$('#cloudDialog').find('.close').get(0).click();
					return false
				});
				self.container.find('#webSiteTitle').bind('focus', function () {
					this.setSelectionRange(0, 200)
				});
				self.container.find('#webSiteUrl').bind('blur', function () {
					if (self.suggestHide) {
						self.container.find('#webSiteUrlSuggest').hide()
					} else {
						return false
					}
					if ($(this).val() == $(this).attr("v")) {
						return false
					}
					if ($(this).val().trim() == "" || $(this).val().trim() == "http://") {
						$(this).siblings('.message').html('<div class="checkError"></div>' + getI18nMsg('webSiteUrlNull'));
						return false
					} else {
						$(this).siblings('.message').html('<div class="checkOK"></div>' + getI18nMsg('webSiteUrlNoError'))
					}
					var img = $(this).val();
					if (!isUrl(img)) {
						img = self.defaultLogoUrl
					} else {
						img = img.toLowerCase().replace(/%3a%2f%2f/ig, '://');
						var imgMatch = img.match(/:\/\/[^\/]+/g);
						if (imgMatch == null) {
							img = "http://" + img;
							imgMatch = img.match(/:\/\/[^\/]+/g)
						}
						img = imgMatch.pop();
						img = img.substring(3);
						img = img.replace(/^www\./, '');
						if (img == '' || img.indexOf('.') == -1 || img.indexOf('.') == img.length - 1) {
							img = self.defaultLogoUrl
						} else {
							if (self.container.find('#webSiteTitle').val() == "") {
								self.container.find('#webSiteTitle').val(img)
							}
							img = urlImg + 'm/' + img + '.png'
						}
					}
					self.logoUrl = img;
					self.container.find('#webSiteLogo').val(img);
					self.loadLogo(img);
					$(this).attr("v", $(this).val())
				});
				self.container.find('#webSiteTitle').bind('blur', function () {
					if ($(this).val() == $(this).attr("v")) {
						return false
					}
					if ($(this).val() == '') {
						$(this).siblings('.message').html('<div class="checkError"></div>' + getI18nMsg('webSiteTitleNull'));
						return false
					} else {
						$(this).siblings('.message').html('<div class="checkOK"></div>' + getI18nMsg('webSiteTitleNoError'))
					}
					$(this).attr("v", $(this).val())
				});
				self.container.find('#websiteForm').bind('submit', function () {
					if (self.container.find('#webSiteUrlSuggest').css('display') != 'none') {
						return false
					}
					if (self.container.find('#webSiteUrl').val().trim() == "" || self.container.find('#webSiteUrl').val().trim() == "http://") {
						self.container.find('#webSiteUrl').siblings('.message').html('<div class="checkError"></div>' + getI18nMsg('webSiteUrlNull'));
						return false
					} else {
						self.container.find('#webSiteUrl').siblings('.message').html('<div class="checkOK"></div>' + getI18nMsg('webSiteUrlNoError'))
					}
					if (self.container.find('#webSiteTitle').val() == '') {
						self.container.find('#webSiteTitle').siblings('.message').html('<div class="checkError"></div>' + getI18nMsg('webSiteTitleNull'));
						return false
					} else {
						self.container.find('#webSiteTitle').siblings('.message').html('<div class="checkOK"></div>' + getI18nMsg('webSiteTitleNoError'))
					}
					if (self.isUpdate != false && self.container.find('#webSiteClassification').val() == cId) {
						var updateOptions = self.isUpdate.split("_");
						if (updateOptions.length > 1) {
							var sum = 0,
							index = 0;
							PDI.updateDialbox(updateOptions[0], updateOptions[2], {
								title : self.container.find('#webSiteTitle').val(),
								url : self.container.find('#webSiteUrl').val(),
								img : self.container.find('#webSiteLogo').val(),
								isNew : true
							});
							oauth.updateMsgId();
							oauth.synchronize()
						}
						_isRefresh = "curPage"
					} else {
						if (self.container.find('#webSiteClassification').val() != cId) {
							storage.setId(self.container.find('#webSiteClassification').val());
						}
						if (DBOX.getLastDialbox() == "cloud") {
							var toIndex = DBOX.getDialboxIndex('normal', 'cloud');
							PDI.appendDialbox('normal', toIndex, {
								title : self.container.find('#webSiteTitle').val(),
								url : self.container.find('#webSiteUrl').val(),
								img : self.container.find('#webSiteLogo').val(),
								isApp : false,
								isNew : true
							})
						} else {
							PDI.insertDialbox('normal', {
								title : self.container.find('#webSiteTitle').val(),
								url : self.container.find('#webSiteUrl').val(),
								img : self.container.find('#webSiteLogo').val(),
								isApp : false,
								isNew : true
							})
						}
						if (self.container.find('#webSiteClassification').val() != cId) {
							storage.setId(self.container.find('#webSiteClassification').val());
							_isRefresh = "remove"
						} else {
							_isRefresh = "lastPage"
						}
					}
					$('#cloudDialog').find('.close').get(0).click();
					return false
				});
				self.initLogoContainer();
				self.initAboutContainer();
				self.initClassificationsContainer();
				self.initSuggest()
			},
			loadLogo : function (logoUrl) {
				var self = this;
				var logoImg = new Image();
				logoImg.onload = function () {
					if ((150 / 90) < (logoImg.width / logoImg.height)) {
						self.container.find('.logoBox .logo').css({
							'backgroundSize' : '100% auto'
						})
					} else {
						self.container.find('.logoBox .logo').css({
							'backgroundSize' : 'auto 100%'
						})
					}
					self.container.find('.logoBox .logo').css({
						'backgroundImage' : 'url(' + logoUrl + ')'
					})
				};
				logoImg.src = logoUrl
			},
			initWebsite : function (url, title, logoUrl, type, id) {
				var self = this;
				self.url = typeof url == "undefined" ? self.defaultUrl : url;
				self.title = typeof title == "undefined" ? self.defaultTitle : title;
				self.logoUrl = typeof logoUrl == "undefined" ? self.defaultLogoUrl : logoUrl;
				type = typeof type == "undefined" ? '' : type;
				id = typeof id == "undefined" ? '' : id;
				if (type != '' && id != '') {
					self.isUpdate = type + "_" + id
				} else {
					self.isUpdate = false
				}
				self.container.find('#webSiteUrl').val(self.url);
				self.container.find('#webSiteUrl').attr("v", self.url);
				self.container.find('#webSiteTitle').val(self.title);
				self.container.find('#webSiteTitle').attr("v", self.title);
				if (type == "quick") {
					if (self.logoUrl.indexOf(urlImg) == 0 && self.logoUrl.indexOf('/s/') > -1) {
						self.logoUrl = self.logoUrl.replace("/s/", "/m/")
					}
				}
				self.container.find('#webSiteLogo').val(self.logoUrl);
				self.loadLogo(self.logoUrl);
				self.container.find('#webSiteUrl').siblings('.message').html(getI18nMsg('webSiteUrlMessage'));
				self.container.find('#webSiteTitle').siblings('.message').html(getI18nMsg('webSiteTitleMessage'));
				self.container.find('.logoBox').removeClass("selected");
				self.initLogoContainer();
				self.container.find('.logoContainer').hide()
			},
			initAboutContainer : function () {
				var self = this;
				if (typeof chrome.topSites != "undefined") {
					try {
						chrome.topSites.get(function (tabs) {
							if (tabs.length > 0) {
								$.each(tabs, function (i, n) {
									self.container.find(".visiteContainer[tab='topTab']").append($('<div class="visitedItem"><a url="' + n.url + '">' + title_fix(truncate(n.title, 0, 36)) + '</a></div>').bind("click", function () {
											self.initLogoContainer();
											self.container.find('#webSiteUrl').val(n.url);
											self.container.find('#webSiteTitle').val(n.title);
											self.container.find('#webSiteUrl').get(0).focus();
											setTimeout(function () {
												self.container.find('#webSiteTitle').get(0).focus();
												setTimeout(function () {
													self.container.find('#webSiteTitle').get(0).blur()
												}, 0)
											}, 0)
										}))
								});
								if (isApp == false) {
									try {
										$.each(self.container.find(".visiteContainer[tab='topTab'] .visitedItem a"), function (p, q) {
											var itemUrl = $(q).attr("url");
											var faviconPath = 'chrome://favicon/size/16/' + itemUrl;
											var faviconImg = new Image();
											if (itemUrl) {
												faviconImg.onload = function () {
													$(q).css("backgroundImage", "url(" + faviconPath + ")")
												};
												faviconImg.src = faviconPath
											}
										})
									} catch (e) {}

								}
							}
						})
					} catch (e) {}

				}
				if (!isApp) {
					try {
						chrome.tabs.query({
							"windowType" : "normal"
						}, function (tabs) {
							var faviconLoad = false;
							if (tabs.length > 0) {
								$.each(tabs, function (i, n) {
									if (typeof n.url != "undefined") {
										self.container.find(".visiteContainer[tab='currentTab']").append($('<div class="visitedItem"><a url="' + n.url + '">' + title_fix(truncate(n.title, 0, 36)) + '</a></div>').bind("click", function () {
												self.initLogoContainer();
												self.container.find('#webSiteUrl').val(n.url);
												self.container.find('#webSiteTitle').val(n.title);
												self.container.find('#webSiteUrl').get(0).focus();
												setTimeout(function () {
													self.container.find('#webSiteTitle').get(0).focus();
													setTimeout(function () {
														self.container.find('#webSiteTitle').get(0).blur()
													}, 0)
												}, 0)
											}));
										faviconLoad = true
									}
								});
								if (faviconLoad && isApp == false) {
									try {
										$.each(self.container.find(".visiteContainer[tab='currentTab'] .visitedItem a"), function (k, v) {
											var itemUrl = $(v).attr("url");
											var faviconPath = 'chrome://favicon/size/16/' + itemUrl;
											var faviconImg = new Image();
											if (itemUrl) {
												faviconImg.onload = function () {
													$(v).css("backgroundImage", "url(" + faviconPath + ")")
												};
												faviconImg.src = faviconPath
											}
										})
									} catch (e) {}

								}
							}
						})
					} catch (e) {}

				}
			},
			initClassificationsContainer : function () {
				var self = this;
				var classificationsListHtml = '<div class="classification' + (cId == "" ? " selected" : "") + '" cId=""><div class="classificationSelected"></div><img src="js/plugin/classification/img/logo.png"><br/><span>' + getI18nMsg('classificationMain') + '</span></div>';
				$.each(PDI.get("classifications"), function (i, n) {
					if (typeof n.dataUrl != "undefined" && n.dataUrl != "") {
						if (typeof n.LTime != "undefined" && n.LTime > 0) {
							classificationsListHtml += '<div class="classification' + (cId == n.id ? " selected" : "") + '" cId="' + n.id + '"><div class="classificationSelected"></div><img src="' + n.logo + '"><br/><span>' + n.title + '</span></div>'
						}
					} else {
						classificationsListHtml += '<div class="classification' + (cId == n.id ? " selected" : "") + '" cId="' + n.id + '"><div class="classificationSelected"></div><img src="' + n.logo + '"><br/><span>' + n.title + '</span></div>'
					}
				});
				classificationsListHtml += '<input type="hidden" id="webSiteClassification" value="' + cId + '">';
				self.container.find(".classificationsList").html(classificationsListHtml);
				self.container.find(".classificationsContainer .classification").unbind('click').bind('click', function () {
					self.container.find(".classificationsContainer .classification").removeClass("selected");
					$(this).addClass("selected");
					self.container.find("#webSiteClassification").val($(this).attr("cId"))
				})
			},
			initLogoContainer : function () {
				var self = this;
				var iStart = 0;
				if (ui_locale != 'zh_CN') {
					iStart += 3000
				}
				self.container.find('.logoContainer').children().not('#logoData').remove();
				self.container.find('.logoContainer').append('<div class="logoItemTitle">' + getI18nMsg('webSiteLogoUpload') + '</div>');
				self.container.find('.logoContainer').append($('<div class="logoLine"></div><div class="logoItem" style="background-image:url(' + urlImg + 'cloudapp/images/' + _langPre + '_uploadLogo.png)"></div>').bind("click", function () {
						self.container.find('#logoData').get(0).click();
						return false
					}));
				self.container.find('.logoContainer').append('<div class="logoItemTitle">' + getI18nMsg('webSiteLogoOutside') + '</div>');
				self.container.find('.logoContainer').append($('<div class="logoLine"></div><div class="logoItem" style="background-image:url(' + urlImg + 'cloudapp/images/' + _langPre + '_outSideLogo.png)"></div>').bind("click", function () {
						var logoUrl = prompt(getI18nMsg('webSiteLogoOutsideUrl'), "");
						if (logoUrl != null && logoUrl != "") {
							self.container.find('#webSiteLogo').val(logoUrl);
							self.loadLogo(logoUrl);
							self.container.find('.logoBox').removeClass("selected");
							self.container.find('.logoContainer').hide()
						}
						return false
					}));
				self.container.find('.logoContainer').append('<div class="logoItemTitle">' + getI18nMsg('webSiteLogos') + '</div>');
				for (var i = iStart + 1; i <= iStart + 30; i++) {
					self.container.find('.logoContainer').append($('<div class="logoLine"></div><div class="logoItem" style="background-image:url(' + urlImg + 'cloudapp/generalLogo/m/' + pad(i, 4) + '.png)"></div>').bind("click", function () {
							var selectedLogo = $(this).css("backgroundImage");
							var selectedLogoSize = $(this).css("backgroundSize");
							self.container.find('#webSiteLogo').val(selectedLogo.replace('url(', '').replace(')', '').replace(/\"/g, ""));
							$(this).css({
								"backgroundImage" : self.container.find('.logoBox .logo').css("backgroundImage"),
								"backgroundSize" : self.container.find('.logoBox .logo').css("backgroundSize")
							});
							self.container.find('.logoBox .logo').css({
								"backgroundImage" : selectedLogo,
								"backgroundSize" : selectedLogoSize
							});
							self.container.find('.logoBox').removeClass("selected");
							self.container.find('.logoContainer').hide()
						}))
				}
			},
			initSuggest : function () {
				var self = this;
				self.container.find('#webSiteUrlSuggest').unbind("mouseover").bind("mouseover", function (e) {
					if (!isMouseMoveContains(e, this)) {
						self.suggestHide = false
					}
				}).unbind("mouseout").bind("mouseout", function (e) {
					if (!isMouseMoveContains(e, this)) {
						self.suggestHide = true
					} else {
						self.suggestHide = false
					}
				});
				self.container.find('#webSiteUrl').unbind('keydown').bind('keydown', function (e) {
					if (e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 13) {
						if (self.container.find('#webSiteUrlSuggest').css('display') != 'none') {
							var index = self.container.find('#webSiteUrlSuggest li').indexOf(self.container.find('#webSiteUrlSuggest li.selected').get(0));
							if (e.keyCode == 38 || e.keyCode == 40) {
								var nextIndex = 0;
								if (index == -1) {
									if (e.keyCode == 38) {
										nextIndex = self.container.find('#webSiteUrlSuggest li').length - 1
									}
								} else {
									nextIndex = e.keyCode == 38 ? (index - 1) : (index + 1)
								}
								self.container.find('#webSiteUrlSuggest li').removeClass('selected');
								var nextObj = self.container.find('#webSiteUrlSuggest li')[nextIndex];
								if (typeof nextObj != 'undefined') {
									$(nextObj).addClass('selected');
									self.container.find('#webSiteUrl').val('http://' + $(nextObj).attr('url'))
								}
							} else if (e.keyCode == 13) {
								self.container.find('#webSiteUrl').get(0).focus();
								self.container.find('#webSiteUrlSuggest').hide();
								setTimeout(function () {
									self.suggestHide = true
								}, 100);
								return false
							}
						}
					}
				});
				self.container.find('#webSiteUrl').unbind('keyup').bind('keyup', function (e) {
					if (e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 13) {
						return false
					}
					if (self.trends.length > 0) {
						var selfObj = $(this);
						var keyword = $(this).val().replace('http://', '').replace('https://', '');
						var suggestContent = '<ul>';
						$.each(self.trends, function (i, n) {
							if (n.indexOf(keyword) != -1) {
								suggestContent += '<li url="' + n + '">' + n.replace(keyword, '<b>' + keyword + '</b>') + '</li>'
							}
						});
						suggestContent += '</ul>';
						if (self.container.find('#webSiteUrlSuggest').css('display') == 'none') {
							self.container.find('#webSiteUrlSuggest').show()
						}
						self.container.find('#webSiteUrlSuggest').html(suggestContent);
						self.container.find('#webSiteUrlSuggest li').unbind('click').bind('click', function () {
							selfObj.val('http://' + $(this).attr('url'));
							selfObj.get(0).focus();
							self.container.find('#webSiteUrlSuggest').hide();
							setTimeout(function () {
								self.suggestHide = true
							}, 100)
						}).unbind('mouseover').bind('mouseover', function () {
							self.container.find('#webSiteUrlSuggest li').removeClass('selected');
							$(this).addClass('selected')
						})
					}
				})
			}
		};
		return createWebsite
	})()
})(jq);
var createWebsite = $.createWebsite({
		"container" : $('.createWebsite')
	});
