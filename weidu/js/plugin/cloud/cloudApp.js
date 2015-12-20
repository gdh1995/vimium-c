var cloudApp = {
	installApps : [],
	container : '',
	init : function () {
		var self = this;
		self.installApps = [];
		var normalWebSites = PDI.get('dialBoxes', 'normal');
		$.each(normalWebSites, function (i, n) {
			if (!n.isDel && typeof n.isApp != 'undefined' && n.isApp) {
				self.installApps.push(n.isApp)
			}
		});
		var quickWebSites = PDI.get('dialBoxes', 'quick');
		$.each(quickWebSites, function (i, n) {
			if (!n.isDel && typeof n.isApp != 'undefined' && n.isApp) {
				self.installApps.push(n.isApp)
			}
		});
		self.container.find('li').remove();
		self.initAppContainer()
	},
	initAppContainer : function () {
		var self = this, ignoreAppDialboxs = [], re = /^o[A-Z]\w+/;
		$.each(_config['apps'], function (i, n) {
			if (ignoreAppDialboxs.indexOf(n.id) == -1) {
				if (typeof n.img == "undefined") {
					if (typeof n.url != "undefined") {
						var img = n.url.replace(/%3a%2f%2f/ig, '://');
						var imgMatch = img.match(/:\/\/[^\/]+/g);
						if (imgMatch == null) {
							img = "http://" + img;
							imgMatch = img.match(/:\/\/[^\/]+/g)
						}
						img = imgMatch.pop();
						img = img.substring(3);
						img = img.replace(/^www\./, '');
						n.img = urlImg + "s/" + img + ".png"
					}
				}
				if (!re.test(n.id)) {
					self.addApp(n, self.container.find('.pluginsList'))
				} else {
					self.addApp(n, self.container.find('.shortcutsList'))
				}
			}
		});
		chrome.management.getAll(function (_extensions) {
			if (_extensions instanceof Array && _extensions.length > 0) {
				$.each(_extensions, function (i, n) {
					if ((typeof n.appLaunchUrl != "undefined" || n.type == "packaged_app") && n.enabled === true && n.id != document.location.host) {
						n.url = n.appLaunchUrl;
						n.img = "chrome://extension-icon/" + n.id + "/128/0";
						n.title = n.name;
						self.addApp(n, self.container.find('.pluginsList'), 'chrome')
					}
				})
			}
		})
	},
	addApp : function (app, containerObj, type) {
		var self = this;
		type == typeof type == 'undefined' ? 'self' : type;
		var appItem = $('<li class="appItem"><div class="itemWindow"  title="' + getI18nMsg('itemAdd') +
      '"></div><div class="itemBottom"><a class="openWeb" title="' + getI18nMsg('openWeb') +
      '">' + truncate(title_fix(app.title), 0, 12) +
      '</a></div><div class="itemData"><div class="itemLogo" style="background-image:url(' + app.img +
      ');"></div></div><div class="itemInstall' + (self.installApps.indexOf(app.id) >= 0 ? ' selected' : '') +
      '"><div class="installBar"></div><div class="selected"></div></div>' +
      (type == 'chrome' ? '<a class="itemDelete" title="' + getI18nMsg('appItemDelete') +
      '"></a>' : '') + '</li>');
		appItem.find('.itemDelete').unbind('click').bind('click', function () {
			chrome.management.uninstall(app.id, function () {
				appItem.remove()
			})
		});
		appItem.find('.openWeb').unbind('click').bind('click', function () {
			if (typeof app.url != 'undefined' && app.url != '') {
				openTab(false, app.url, false);
				return false
			}
		});
		appItem.find('.itemWindow').unbind('click').bind('click', function () {
			if ($(this).siblings('.itemInstall').hasClass('selected')) {
				return false
			} else {
				if (DBOX.getLastDialbox() == "cloud") {
					var toIndex = DBOX.getDialboxIndex('normal', 'cloud');
					PDI.appendDialbox('normal', toIndex, {
						title : app.title,
						img : app.img,
						url : app.url,
						desc : app.desc,
						isApp : app.id,
						appType : app.type,
						isFixed : app.isFixed,
						isNew : true
					})
				} else {
					PDI.insertDialbox('normal', {
						title : app.title,
						img : app.img,
						url : app.url,
						desc : app.desc,
						isApp : app.id,
						appType : app.type,
						isFixed : app.isFixed,
						isNew : true
					})
				}
				self.installApps.push(app.id);
				$(this).siblings('.itemInstall').addClass('selected');
				_isRefresh = "lastPage";
				if ($('#cloudDialog').find('#multipleSelect:checked').length == 0) {
					$('#cloudDialog').find('.close').get(0).click()
				}
			}
		});
		containerObj.append(appItem)
	}
};
cloudApp.container = $('.container.appList');
cloudApp.init();
