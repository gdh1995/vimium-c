(function ($) {
	$.fn.weather = function (opt) {
		return new weather(this, opt)
	};
	var weather = (function (el, opt) {
		var weather = function (el, opt) {
			var self = this;
			self.container = el;
			self.init(opt)
		};
		weather.prototype = {
			container : '',
			containerShow : false,
			city : '',
			cityID : '',
			defaultCityID : 2514815,
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
				"1:1" : {
					0 : [32, 33, 34, 36],
					1 : [27, 28],
					2 : [26, 29, 30, 44],
					3 : [9, 40],
					4 : [],
					5 : [11, 12, 37],
					6 : [3, 4, 38, 39, 45, 47],
					7 : [13, 14, 16, 40, 41, 42, 43, 46],
					8 : [17],
					9 : [25],
					10 : [0, 1, 2, 23, 24],
					11 : [19, 20, 21, 22],
					"5-7" : [5, 6, 7, 18],
					"5-8" : [8, 10, 35],
					"7-10" : [15],
					"1-0" : [31, 28, 30],
				},
				"2:1" : {}

			},
			pre : false,
			init : function (opt) {
				var self = this;
				if (typeof opt != "undefined") {
					$.each(opt, function (i, n) {
						self[i] = n
					})
				}
				self.getWeather()
			},
			getWeather : function (fn) {
				var self = this;
				fn = fn || function () {};
				var curTime = parseInt(new Date().getTime() / 1000);
				if (self.cityID == '' || (self.isAuto && curTime >= self.dateline + 1 * 3600)) {
					self.cityID = self.defaultCityID;
					$.ajax({
						url : urlImg + "myapp/weather/city/global/getAddress.php?t=" + curTime,
						success : function (result) {
							var result = JSON.parse(result);
							if (typeof result == 'object' && result.city) {
								$.ajax({
									url : urlImg + "tianqi/city.php?city=" + encodeURIComponent(result.city) + "&type=yahoo&t=" + curTime,
									success : function (data) {
										data = JSON.parse(data);
										var cityList = [];
										if (typeof data == 'object') {
											if (data.query.count > 1) {
												cityList = data.query.results.Result
											} else {
												cityList.push(data.query.results.Result)
											}
										}
										if (cityList.length > 0) {
											$.each(cityList, function (i, n) {
												if (n.woeid != "" && n.city == result.city) {
													self.cityID = n.woeid;
													return false
												}
											})
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
				var curTime = parseInt(new Date().getTime() / 1000);
				if (curTime >= self.dateline + 1 * 3600) {
					self.getWeatherData(function (data) {
						if (data.getElementsByTagName("title")[0].childNodes[0].nodeValue != 'Yahoo! Weather - Error') {
							self.weatherCache = data;
							try {
								self.pre = "";
								self.city = self.weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
							} catch (e) {
								self.pre = "yweather:";
								self.city = self.weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
							}
							self.weather = {
								text : self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("text").value,
								images : self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("code").value,
								temp : self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("high").value + getI18nMsg('weatherTempUnit' + self.tempUnit) + " / " + self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("low").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
								wind : "Wind chill: " + self.weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("chill").value + ",Speed:" + self.weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("speed").value
							};
							var _lastDate = "";
							if (self.calendar != "") {
								_lastDate = self.calendar.year + "" + self.calendar.month + "" + self.calendar.date
							}
							var weatherDateArray = self.weatherCache.getElementsByTagName("lastBuildDate")[0].childNodes[0].nodeValue.split(' ');
							self.calendar = {
								year : weatherDateArray[3],
								month : weatherDateArray[2],
								date : weatherDateArray[1],
								day : '',
								weekDay : weatherDateArray[0].replace(",", ""),
								fullDate : new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + "-" + new Date().getDate()
							};
							var _curDate = self.calendar.year + "" + self.calendar.month + "" + self.calendar.date;
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
								url : urlImg + "myapp/weather/message/index.php?cityID=" + self.cityID + "&ui_locale=" + _langPre + "&tz=" + (new Date().getTimezoneOffset() / 60) * (-1) + "&t=" + new Date().getTime(),
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
						} else {
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
					url : urlImg + "myapp/weather/data/yahooData/index.php?cityID=" + self.cityID + "&u=" + self.tempUnit.toLowerCase() + "&t=" + new Date().getTime(),
					success : function (data) {
						var re = new RegExp("<!\-\-([\\S\\s]*?)\-\->", "g");
						var xmlString = data.replace(re, '');
						var xmlDoc = null;
						if (!window.DOMParser && window.ActiveXObject) {
							var xmlDomVersions = ['MSXML.2.DOMDocument.6.0', 'MSXML.2.DOMDocument.3.0', 'Microsoft.XMLDOM'];
							for (var i = 0; i < xmlDomVersions.length; i++) {
								try {
									xmlDoc = new ActiveXObject(xmlDomVersions[i]);
									xmlDoc.async = false;
									xmlDoc.loadXML(xmlString);
									break
								} catch (e) {}

							}
						} else if (window.DOMParser && document.implementation && document.implementation.createDocument) {
							try {
								domParser = new DOMParser();
								xmlDoc = domParser.parseFromString(xmlString, 'text/xml')
							} catch (e) {}

						} else {
							return null
						}
						fn(xmlDoc.documentElement)
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
				var weatherImageUrl = urlImg + '/myapp/weather/img/new/' + self.getWeatherImage(self.weather.images);
				var weatherContent = '<div class="weatherLeft"><div class="thumb" style="background-image:url(' + weatherImageUrl + ')"></div><div class="city">' + self.city + '</div></div><div class="weatherRight"><div class="temp">' + self.weather.temp + '</div><div class="text">' + self.weather.text + '</div><div class="calendar">' + self.calendar.month + ' ' + self.calendar.date + ', ' + self.calendar.weekDay + '</div></div><div class="weatherSettingButton"></div>';
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
					var weatherContainerObj = $('<div class="weatherContainer"><div class="arrow"></div><div class="weatherMain"><div class="weatherContent">' + weatherContent + '</div><div class="weatherForecast lower"></div></div><div class="weatherSetting"><div class="citySearch"><input type="hidden" id="cityID" value="' + self.cityID + '"><input id="searchKeyword" class="searchKeyword" type="text" value="" placeholder="' + getI18nMsg('weatherSearchKeyword') + '" autofocus /><input class="searchBtn" type="submit" value=""/><div class="cityList"></div><div class="auto">' + getI18nMsg('weatherAutoLocate') + '</div></div><div class="text"><span>' + getI18nMsg('weatherCurCity') + '： </span><span class="cityName">' + self.city + (self.isAuto ? ' [' + getI18nMsg('auto') + ']' : '') + '</span></div><div class="unit">' + getI18nMsg('weatherTempUnit') + '<input type="radio" name="tempUnit" class="tempUnit" value="C" ' + (self.tempUnit == "C" ? "checked" : "") + '> ' + getI18nMsg('weatherTempUnitC') + ' <input type="radio" name="tempUnit" class="tempUnit" value="F" ' + (self.tempUnit == "F" ? "checked" : "") + '> ' + getI18nMsg('weatherTempUnitF') + ' </div><div class="submitButton">' + getI18nMsg('determine') + '</div><div class="cancelButton">' + getI18nMsg('cancel') + '</div></div></div>');
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
						self.weatherCache = data;
						var _weatherForecast = self.getWeatherForecast();
						if (_weatherForecast != "") {
							weatherContainerObj.find('.weatherForecast').html(_weatherForecast);
							weatherContainerObj.find('.weatherForecast').show()
						}
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
					if (weatherContainerObj.find('.tempUnit:checked').val() != self.tempUnit) {
						self.tempUnit = weatherContainerObj.find('.tempUnit:checked').val();
						_isChange = true
					}
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
					cityListAjaxHandle = $.getJSON(urlImg + "tianqi/city.php?city=" + encodeURIComponent(searchKeyword) + "&type=yahoo&t=" + new Date().getTime(), function (data) {
							if (!cityListAjaxHandle) {
								return
							}
							if (data) {
								if (typeof data == 'object' && data.query.count > 0) {
									var cityList = [];
									if (data.query.count == 1) {
										cityList.push(data.query.results.Result)
									} else {
										cityList = data.query.results.Result
									}
									var _cityList = [];
									$.each(cityList, function (i, n) {
										if (typeof n.city != 'undefined' && n.city != null && n.city != '') {
											if (searchKeyword.indexOf(n.city.toLowerCase()) > -1) {
												if (_cityList.indexOf(n.city + "/" + n.countrycode) == -1) {
													_cityList.push(n.city + "/" + n.countrycode);
													similarCityList.push(n)
												}
											}
										}
									})
								}
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
				var weatherForecast = "";
				if (self.weatherCache.getElementsByTagName("title")[0].childNodes[0].nodeValue != 'Yahoo! Weather - Error') {
					if (self.pre === false) {
						try {
							self.pre = "";
							self.weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
						} catch (e) {
							self.pre = "yweather:";
							self.weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
						}
					}
					var _index = 1;
					if (self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("day").value == self.calendar['weekDay']) {
						_index = 2
					}
					var weatherTomorrow = {
						text : self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("text").value,
						images : self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("code").value,
						temp : self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("high").value + getI18nMsg('weatherTempUnit' + self.tempUnit) + " / " + self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("low").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
						day : '',
						weekDay : self.weatherCache.getElementsByTagName(self.pre + "forecast")[_index].attributes.getNamedItem("day").value
					};
					weatherForecast += '<div class="item" style="background-image:url(' + urlImg + '/myapp/weather/img/new/black/' + self.getWeatherImage(weatherTomorrow.images) + ')">' + weatherTomorrow.weekDay + ', ' + weatherTomorrow.temp + ', ' + weatherTomorrow.text + '</div>'
				}
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
				if (typeof self.weather.images != 'undefined' && self.weather.images != 3200) {
					$.each(self.imageOptions["1:1"], function (i, n) {
						if (n.indexOf(1 * img1) > -1) {
							weatherImage = i;
							return false
						}
					})
				}
				return weatherImage == '' ? 'logo.png' : weatherImage + '.png'
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
		return weather
	})()
})(jq);
var weather = $('body').weather({
		"city" : PDI.get('weather', 'city'),
		"cityID" : PDI.get('weather', 'cityID'),
		"isAuto" : PDI.get('weather', 'isAuto'),
		"weather" : PDI.get('weather', 'weather'),
		"calendar" : PDI.get('weather', 'calendar'),
		"message" : PDI.get('weather', 'message'),
		"messageID" : PDI.get('weather', 'messageID'),
		"dateline" : PDI.get('weather', 'dateline')
	});
