var weather = {
	container : null,
	containerShow : false,
	city : '',
	cityID : '',
	defaultCityID : 101010100,
	isAuto : false,
	weather : '',
	tempUnit : PDI.get("weather", "tempUnit"),
	calendar : '',
	dateline : 0,
	message : '',
	messageID : 0,
	weatherCache : '',
	weekOptions : [getI18nMsg("calendarSun"), getI18nMsg("calendarMon"), getI18nMsg("calendarTue"), getI18nMsg("calendarWed"), getI18nMsg("calendarThu"), getI18nMsg("calendarFri"), getI18nMsg("calendarSat")],
	imageOptions : {
		"1:1": {
			0 : [0],
			1 : [1],
			2 : [2],
			3 : [7],
			4 : [8],
			5 : [3, 9, 10, 11, 12, 21, 22, 23, 24, 25],
			6 : [4],
			7 : [6, 13, 14, 15, 16, 17, 26, 27, 28],
			8 : [5],
			9 : [19],
			10 : [20, 30, 29, 31],
			11 : [18, 53, 32]
		},
		"2:1": ['0-1', '0-5', '0-6', '0-7', '1-2', '5-7', '5-8', '7-10']
	},
	init : function (opt) {
		var self = this;
		if (opt) {
			$.each(opt, function (i, n) {
				self[i] = n
			})
		}
		self.getWeather()
	},
	getWeather : function (fn) {
		var self = this;
		fn = fn || function () {};
		var curTime = parseInt(Date.now() / 1000);
		if (self.cityID == '' || (self.isAuto && curTime >= self.dateline + 1 * 3600)) {
			self.cityID = self.defaultCityID;
			$.ajax({
				url : urlImg + "myapp/weather/city/global/getAddress.php?t=" + curTime,
				success : function (result) {
					var result = JSON.parse(result);
					if (typeof result == 'object' && result.city) {
						$.ajax({
							url : urlImg + "tianqi/city.php?city=" + result.city + "&t=" + curTime,
							success : function (data) {
								if (data && data.substring(0, 5) !== 'ERROR') {
									self.cityID = data
								}
								self.setWeatherData(fn)
							},
							error : function () {
								self.setWeatherData(fn)
							}
						})
					} else {
						self.setWeatherData(fn)
					}
				},
				error : function () {
					self.setWeatherData(fn)
				}
			})
		} else {
			self.setWeatherData(fn)
		}
	},
	setWeatherData : function (fn) {
		var self = this;
		fn = fn || function () {};
		var curTime = parseInt(Date.now() / 1000);
		if (curTime >= self.dateline + 1 * 3600) {
			self.getWeatherData(function (data) {
				try {
					var weahterInfo = JSON.parse(data);
					self.weatherCache = weahterInfo.weatherinfo;
					self.city = weahterInfo.weatherinfo.city;
					self.weather = {
						text : weahterInfo.weatherinfo.weather1,
						images : [weahterInfo.weatherinfo.img1, weahterInfo.weatherinfo.img2],
						temp : self.getTemp(weahterInfo.weatherinfo.temp1),
						wind : weahterInfo.weatherinfo.wind1
					};
					var weatherDate = Date.parse(weahterInfo.weatherinfo.date_y.replace(getI18nMsg('yearUnit'), "/").replace(getI18nMsg('monthUnit'), "/").replace(getI18nMsg('dateUnit'), "/"));
					weatherDate = new Date(weatherDate);
					var _lastDate = "";
					if (self.calendar != "") {
						_lastDate = self.calendar.year + "" + (self.calendar.month + 1) + "" + self.calendar.date
					}
					self.calendar = {
						year : weatherDate.getFullYear(),
						month : weatherDate.getMonth(),
						date : weatherDate.getDate(),
						day : weatherDate.getDay(),
						weekDay : self.weekOptions[weatherDate.getDay()],
						fullDate : new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + "-" + new Date().getDate()
					};
					var _curDate = self.calendar.year + "" + (self.calendar.month + 1) + "" + self.calendar.date;
					self.dateline = curTime;
					PDI.set('weather', '', {
						city : self.city,
						cityID : self.cityID,
						isAuto : self.isAuto,
						weather : self.weather,
						tempUnit : self.tempUnit,
						calendar : self.calendar,
						dateline : self.dateline
					});
					$.ajax({
						url : urlImg + "myapp/weather/message/index.php?cityID=" + self.cityID + "&ui_locale=" + _langPre + "&tz=" + (new Date().getTimezoneOffset() / 60) * (-1) + "&t=" + Date.now(),
						success : function (data) {
							if (data) {
								self.message = JSON.parse(data);
								PDI.set('weather', 'message', self.message)
							}
							fn();
							self.initWeatherApp(_curDate > _lastDate ? true : false)
						},
						error : function () {
							fn();
							self.initWeatherApp(_curDate > _lastDate ? true : false)
						}
					})
				} catch (e) {
					if (self.cityID != self.defaultCityID) {
						self.cityID = self.defaultCityID;
						self.setWeatherData(fn)
					}
				}
			})
		} else {
			fn();
			self.initWeatherApp()
		}
	},
	getWeatherData : function (fn) {
		var self = this;
		fn = fn || function () {};
		$.ajax({
			url : urlImg + "myapp/weather/data/index.php?cityID=" + self.cityID + "&t=" + Date.now(),
			success : function (data) {
				if (data) {
					fn(data)
				}
			},
			error : function () {
				if (self.cityID != self.defaultCityID) {
					self.cityID = self.defaultCityID;
					self.getWeatherData(fn)
				}
			}
		})
	},
	initWeatherApp : function (isOpen) {
		var self = this;
		isOpen = !PDI.get("setup", "helpSwitch") ? (isOpen || false) : false;
		var weatherImageUrl = urlImg + '/myapp/weather/img/new/' + self.getWeatherImage(self.weather.images[0], self.weather.images[1]);
		var weatherContent = '<div class="weatherLeft"><div class="thumb" style="background-image:url(' + weatherImageUrl + ')"></div><div class="city">' + self.city + '</div></div><div class="weatherRight"><div class="temp">' + self.weather.temp + '</div><div class="text">' + self.weather.text + ' , ' + self.weather.wind + '</div><div class="calendar">' + parseInt(self.calendar.month + 1) + getI18nMsg('monthUnit') + self.calendar.date + getI18nMsg('dateUnit') + ' ' + self.calendar.weekDay + ' ' + PDI.get("setup", "lunarCalendar") + '</div></div><div class="weatherSettingButton"></div>';
		var weatherObj = self.container.find('.weather');
		if (weatherObj.length == 0) {
			var weatherObj = $('<div class="weather" style="background-image:url(' + weatherImageUrl + ')">' + self.weather.temp + '</div>');
			self.container.append(weatherObj)
		} else {
			weatherObj.css("backgroundImage", "url(" + weatherImageUrl + ")");
			weatherObj.html(self.weather.temp)
		}
		var weatherContainerObj = self.container.find('.weatherContainer');
		if (weatherContainerObj.length == 0) {
			var weatherContainerObj = $('<div class="weatherContainer"><div class="arrow"></div><div class="weatherMain"><div class="weatherContent">' + weatherContent + '</div><div class="weatherForecast"></div></div><div class="weatherSetting"><div class="citySearch"><input type="hidden" id="cityID" value="' + self.cityID + '"><input id="searchKeyword" class="searchKeyword" type="text" value="" placeholder="' + getI18nMsg('weatherSearchKeyword') + '" autofocus /><input class="searchBtn" type="submit" value=""/><div class="cityList"></div><div class="auto">' + getI18nMsg('weatherAutoLocate') + '</div></div><div class="text"><span>' + getI18nMsg('weatherCurCity') + '： </span><span class="cityName">' + self.city + (self.isAuto ? ' [' + getI18nMsg('auto') + ']' : '') + '</span></div><div class="submitButton">' + getI18nMsg('determine') + '</div><div class="cancelButton">' + getI18nMsg('cancel') + '</div></div></div>');
			self.container.append(weatherContainerObj)
		} else {
			weatherContainerObj.find('#cityID').val(self.cityID);
			weatherContainerObj.find("#searchKeyword").val('');
			weatherContainerObj.find('.weatherSetting .cityName').html(self.city + (self.isAuto ? ' [' + getI18nMsg('auto') + ']' : ''));
			weatherContainerObj.find('.weatherContent').html(weatherContent)
		}
		if (self.weatherCache != '') {
			var _weatherForecast = self.getWeatherForecast();
			if (_weatherForecast != "") {
				weatherContainerObj.find('.weatherForecast').html(_weatherForecast);
				weatherContainerObj.find('.weatherForecast').show()
			}
		} else {
			self.getWeatherData(function (data) {
				try {
					var weahterInfo = JSON.parse(data);
					self.weatherCache = weahterInfo.weatherinfo;
					var _weatherForecast = self.getWeatherForecast();
					if (_weatherForecast != "") {
						weatherContainerObj.find('.weatherForecast').html(_weatherForecast);
						weatherContainerObj.find('.weatherForecast').show()
					}
				} catch (e) {}

			})
		}
		var weatherMessageObj = self.container.find('.weatherMessage');
		if (self.message != "" && weatherMessageObj.length == 0) {
			if (self.message.messageID > self.messageID) {
				if (self.message.showDate == "" || self.calendar.fullDate.toLowerCase() == self.message.showDate.toLowerCase()) {
					self.getWeatherMessage(self.message).insertAfter(weatherContainerObj.find('.weatherForecast'))
				}
			}
		}
		weatherContainerObj.find('.weatherSettingButton').unbind('click').bind('click', function () {
			weatherContainerObj.find('.weatherSetting').css('height', weatherContainerObj.find('.weatherMain').css('height'));
			weatherContainerObj.find('.cityList').hide();
			weatherContainerObj.addClass('setting')
		});
		weatherContainerObj.find('.submitButton').unbind('click').bind('click', function () {
			var _isChange = false;
			if (weatherContainerObj.find('#cityID').val() != self.cityID) {
				self.cityID = weatherContainerObj.find('#cityID').val();
				_isChange = true
			}
			if (_isChange) {
				self.dateline = 0;
				self.isAuto = self.cityID == '' ? true : false;
				PDI.set('weather', '', {
					cityID : self.cityID,
					isAuto : self.isAuto,
					tempUnit : self.tempUnit,
					dateline : self.dateline
				});
				self.getWeather();
				weatherContainerObj.removeClass('setting')
			} else {
				weatherContainerObj.removeClass('setting')
			}
		});
		weatherContainerObj.find('.cancelButton').unbind('click').bind('click', function () {
			weatherContainerObj.removeClass('setting')
		});
		weatherContainerObj.find('.citySearch .auto').unbind('click').bind('click', function () {
			weatherContainerObj.find("#cityID").val('');
			weatherContainerObj.find('.weatherSetting .cityName').html(getI18nMsg('auto'))
		});
		var cityListAjaxHandle;
		weatherContainerObj.find("#searchKeyword").unbind('keyup').bind('keyup', function (e) {
			if (e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 13 || e.keyCode == 27) {
				return false
			}
			var searchKeyword = weatherContainerObj.find("#searchKeyword").val().toLowerCase();
			if (searchKeyword == "") {
				weatherContainerObj.find('.cityList').hide();
				return false
			}
			var similarCityList = [];
			if (cityListAjaxHandle) {
				cityListAjaxHandle.abort()
			}
			cityListAjaxHandle = $.getJSON(urlImg + "myapp/weather/city/index.php?keyword=" + encodeURIComponent(searchKeyword) + "&ui_locale=" + ui_locale, function (data) {
					if (!cityListAjaxHandle) {
						return
					}
					if (data) {
						$.each(data, function (i, n) {
							similarCityList.push(n)
						});
						if (similarCityList.length > 0) {
							similarCityList = similarCityList.sort(function (a, b) {
									return a["countrycode"] > b["countrycode"] ? 1 : a["countrycode"] == b["countrycode"] ? 0 : -1
								});
							weatherContainerObj.find('.cityList').empty();
							$.each(similarCityList, function (i, n) {
								n.countrycode = (typeof n.countrycode == "undefined" || n.countrycode == null) ? "" : n.countrycode;
								weatherContainerObj.find('.cityList').append('<div class="item" cityID="' + n.woeid + '" cityName="' + n.city + '">' + n.city + (n.countrycode != "" ? ("," + n.countrycode) : "") + '</div>')
							});
							weatherContainerObj.find('.cityList .item').unbind('click').bind('click', function () {
								weatherContainerObj.find("#searchKeyword").val($(this).attr('cityName'));
								weatherContainerObj.find("#cityID").val($(this).attr('cityID'));
								weatherContainerObj.find('.weatherSetting .cityName').html($(this).attr('cityName'));
								weatherContainerObj.find('.cityList').hide()
							});
							weatherContainerObj.find('.cityList').show()
						}
					} else {
						weatherContainerObj.find('.cityList').hide()
					}
				});
			return false
		});
		weatherContainerObj.find('.weatherSetting').unbind('click').bind('click', function (e) {
			if (!isContainsClass(e.target, 'cityList')) {
				weatherContainerObj.find('.cityList').hide()
			}
		});
		weatherObj.unbind("mouseover").bind("mouseover", function () {
			self.showWeatherContainer(weatherContainerObj)
		}).unbind("mouseout").bind("mouseout", function (e) {
			self.hideWeatherContainer(e, this, weatherContainerObj)
		});
		weatherContainerObj.unbind("mouseover").bind("mouseover", function () {
			self.showWeatherContainer(weatherContainerObj)
		}).unbind("mouseout").bind("mouseout", function (e) {
			self.hideWeatherContainer(e, this, weatherContainerObj)
		});
		if (isOpen) {
			self.showWeatherContainer(weatherContainerObj)
		}
	},
	getWeatherForecast : function () {
		var self = this;
		var curWeatherDate = Date.parse(self.weatherCache.date_y.replace(getI18nMsg('yearUnit'), "/").replace(getI18nMsg('monthUnit'), "/").replace(getI18nMsg('dateUnit'), "/"));
		var weatherForecast = '';
		try {
			for (var i = 1; i <= 4; i++) {
				var weatherImageUrl = urlImg + '/myapp/weather/img/new/black/' + self.getWeatherImage(self.weatherCache['img' + ((i - 1) * 2 + 1)], self.weatherCache['img' + ((i - 1) * 2 + 2)]);
				var weatherDate = curWeatherDate + (i - 1) * 3600 * 24 * 1000;
				weatherDate = new Date(weatherDate);
				weatherForecast += '<div class="item" style="background-image:url(' + weatherImageUrl + ')"><div class="week">' + self.weekOptions[weatherDate.getDay()] + '</div><div class="temp">' + self.getTemp(self.weatherCache['temp' + i]) + '</div></div>'
			}
		} catch (e) {}

		return weatherForecast
	},
	getWeatherMessage : function (data) {
		var self = this;
		var weatherMessageObj = "";
		if (data.image) {
			weatherMessageObj = $('<div class="weatherMessage thumb"><a ' + (data.url != '' ? 'href="' + data.url + '"' : '') + ' target="_blank"><div class="messageItem"><div class="thumb" style="background-image:url(' + data.image + ')"></div><div class="content">' + data.title + '<div class="button">View</div></div></div></a></div><div class="weatherLine"></div>')
		} else {
			weatherMessageObj = $('<div class="weatherMessage"><div class="messageItem"><div class="content"><a ' + (data.url != '' ? 'href="' + data.url + '"' : '') + ' target="_blank">' + data.title + '</a></div></div></div><div class="weatherLine"></div>')
		}
		return weatherMessageObj
	},
	getWeatherImage : function (img1, img2) {
		var self = this;
		var weatherImage = '';
		if (typeof self.weather.images != 'undefined') {
			$.each(self.imageOptions["1:1"], function (i, n) {
				if (n.indexOf(1 * img1) > -1) {
					weatherImage += i;
					return false
				}
			});
			$.each(self.imageOptions["1:1"], function (i, n) {
				img2 = img2 == img1 ? 99 : img2;
				if (n.indexOf(1 * img2) > -1) {
					if (weatherImage != i) {
						if (i > weatherImage) {
							var _tmpWeatherImage = weatherImage + '-' + i
						} else {
							var _tmpWeatherImage = i + '-' + weatherImage
						}
						if (self.imageOptions["2:1"].indexOf(_tmpWeatherImage) > -1) {
							weatherImage += weatherImage == "" ? i : "-" + i
						}
					}
					return false
				}
			})
		}
		return weatherImage == '' ? 'logo.png' : weatherImage + '.png'
	},
	getTemp : function (str) {
		var self = this;
		var _temps = str.split('~');
		var _returnTemps = [];
		if (parseInt(_temps[0].replace("℃", "")) < parseInt(_temps[1].replace("℃", ""))) {
			_returnTemps = _temps
		} else {
			_returnTemps[0] = _temps[1];
			_returnTemps[1] = _temps[0]
		}
		return _returnTemps[0] + '~' + _returnTemps[1]
	},
	showWeatherContainer : function (weatherContainerObj) {
		var self = this;
		self.containerShow = true;
		$(document).unbind('click.weather').bind('click.weather', function (e) {
			if (!isContainsClass(e.target, 'weatherContainer') && !isContainsClass(e.target, 'weather')) {
				weatherContainerObj.hide();
				weatherContainerObj.removeClass('setting');
				$(document).unbind('click.weather');
				return false
			}
		});
		clearTimeout(window._showWeatherContainerFun);
		window._showWeatherContainerFun = setTimeout(function () {
				if (self.containerShow == true) {
					weatherContainerObj.show();
					if (self.message.showDate == "") {
						self.messageID = self.message.messageID;
						PDI.set('weather', 'messageID', self.messageID)
					}
				}
			}, 300)
	},
	hideWeatherContainer : function (e, eventObj, weatherContainerObj) {
		var self = this;
		self.containerShow = false;
		$(document).unbind('click.weather');
		clearTimeout(window._hideWeatherContainerFun);
		window._hideWeatherContainerFun = setTimeout(function () {
				if (self.containerShow == false && !isMouseMoveContains(e, eventObj)) {
					weatherContainerObj.hide();
					weatherContainerObj.removeClass('setting')
				}
			}, 500)
	}
};
weather.container = $('body');
weather.init({
	city: PDI.get('weather', 'city'),
	cityID: PDI.get('weather', 'cityID'),
	isAuto: PDI.get('weather', 'isAuto'),
	weather: PDI.get('weather', 'weather'),
	calendar: PDI.get('weather', 'calendar'),
	message: PDI.get('weather', 'message'),
	messageID: PDI.get('weather', 'messageID'),
	dateline: PDI.get('weather', 'dateline')
});
