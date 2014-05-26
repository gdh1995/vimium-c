(function ($) {
	$.weather = function () {
		return new weather()
	};
	var weather = (function () {
		var weather = function () {};
		weather.prototype = {
			ip : '',
			city : '',
			cityID : '',
			defaultCityID : 2514815,
			isAuto : false,
			pre : false,
			weather : '',
			tempUnit : PDI.get("weather", "tempUnit"),
			calendar : '',
			dateline : 0,
			weatherCache : '',
			container : '',
			content : '',
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
			bgImageOptions : {
				0 : [31, 32, 33, 34, 36],
				1 : [25, 26, 27, 28, 29, 30, 44],
				3 : [8, 9, 10, 11, 12, 17, 35, 37, 38, 39, 40, 45, 47],
				7 : [5, 6, 7, 13, 14, 15, 16, 18, 41, 42, 43, 46],
				10 : [0, 1, 2, 3, 4, 23, 24],
				11 : [19, 20, 21, 22, ]
			},
			init : function (opt) {
				var self = this;
				self.weatherCache = "";
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
				var curTime = Math.round(new Date().getTime() / 1000);
				if (self.cityID == '' || (self.isAuto && curTime >= self.dateline + 1 * 3600)) {
					self.cityID = self.defaultCityID;
					$.ajax({
						url : urlImg + "myapp/weather/city/global/getAddress.php?t=" + curTime,
						success : function (result) {
							var ipInfo = JSON.parse(result);
							if (typeof ipInfo == 'object' && ipInfo.city) {
								$.ajax({
									url : urlImg + "tianqi/city.php?city=" + encodeURIComponent(ipInfo.city) + "&type=yahoo&t=" + curTime,
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
												if (n.woeid != "" && n.city == ipInfo.city) {
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
			getWeatherData : function (fn) {
				var self = this;
				fn = fn || function () {};
				$.ajax({
					url : urlImg + "myapp/weather/data/yahooData/index.php?cityID=" + self.cityID + "&u=" + self.tempUnit.toLowerCase() + "&t=" + new Date().getTime(),
					success : function (data) {
						if (data) {
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
			setWeatherData : function (fn) {
				var self = this;
				fn = fn || function () {};
				var curTime = Math.round(new Date().getTime() / 1000);
				if (self.cityID != "" && curTime >= self.dateline + 1 * 3600) {
					self.getWeatherData(function (xmlDoc) {
						if (xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue != 'Yahoo! Weather - Error') {
							self.weatherCache = xmlDoc;
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
								temp : self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("high").value + getI18nMsg('weatherTempUnit' + self.tempUnit) + " ~ " + self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("low").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
								wind : "Wind chill:" + self.weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("chill").value + " Direction:" + self.weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("direction").value + " Speed:" + self.weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("speed").value
							};
							var weatherDate = self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("date").value;
							var weatherDateArray = weatherDate.split(' ');
							self.calendar = {
								year : weatherDateArray[2],
								month : weatherDateArray[1],
								date : weatherDateArray[0],
								day : '',
								weekDay : self.weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("day").value
							};
							self.dateline = curTime;
							PDI.set('weather', '', {
								city : self.city,
								cityID : self.cityID,
								isAuto : self.isAuto,
								weather : self.weather,
								tempUnit : self.tempUnit,
								calendar : self.calendar,
								dateline : self.dateline,
								ip : PDI.get("setup", "ip")
							});
							fn();
							self.initWeatherApp()
						} else {
							if (self.cityID != self.defaultCityID) {
								self.cityID = self.defaultCityID;
								self.setWeatherData()
							}
						}
					})
				} else {
					fn();
					self.initWeatherApp()
				}
			},
			initWeatherApp : function () {
				var self = this;
				self.container.find('.weatherApp').remove();
				if (DBOX.width >= 180 && DBOX.height >= 90) {
					self.container.append($('<div class="weatherApp"><div class="preview"></div><div class="temp">' + self.weather.temp + '</div><div class="address">' + self.city + '</div><div class="lunarCalendar">' + self.calendar.date + " " + self.calendar.month + " [" + self.calendar.weekDay + ']</div><div class="weather">' + self.weather.text + '</div></div>').css({
							'marginTop' : DBOX.titleShow == true ? "-61px" : "-45px"
						}))
				} else if (DBOX.width >= 85 && DBOX.height >= 90) {
					self.container.append($('<div class="weatherApp small"><div class="preview"></div><div class="weather">' + '<font size="+1">' + self.weather.temp + "</font><br/>" + self.weather.text + '</div></div>').css({
							'marginTop' : DBOX.titleShow == true ? "-61px" : "-45px"
						}))
				}
				self.container.find('.boxTitle').html('<a>' + self.weather.text + ' ' + self.weather.temp + '</a>');
				var weatherImage = new Image();
				weatherImageUrl = urlImg + 'myapp/weather/img/m/' + self.getWeatherImage(self.weather.images);
				weatherLogoImageUrl = urlImg + 'myapp/weather/img/' + (self.container.hasClass('quick') ? 's/' : 'm/') + self.getWeatherImage(self.weather.images);
				weatherImage.onload = function () {
					self.container.find('.weatherApp .preview').css('backgroundImage', 'url(' + weatherImageUrl + ')');
					self.container.find('.boxLogo').css('backgroundImage', 'url(' + weatherLogoImageUrl + ')')
				};
				setTimeout(function () {
					weatherImage.src = weatherImageUrl
				}, 200)
			},
			getWeatherImage : function (img1) {
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
			template : function (targetDialogObj, weatherCache) {
				var self = this;
				if (self.pre === false) {
					try {
						self.pre = "";
						weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
					} catch (e) {
						self.pre = "yweather:";
						weatherCache.getElementsByTagName(self.pre + "location")[0].attributes.getNamedItem("city").value
					}
				}
				var weatherCacheData = {
					text : weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("text").value,
					images : weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("code").value,
					temp : weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("high").value + getI18nMsg('weatherTempUnit' + self.tempUnit) + " / " + weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("low").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
					wind : "Direction: " + weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("direction").value + " Speed: " + weatherCache.getElementsByTagName(self.pre + "wind")[0].attributes.getNamedItem("speed").value,
					date : weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("date").value,
					weekDay : weatherCache.getElementsByTagName(self.pre + "forecast")[0].attributes.getNamedItem("day").value
				};
				var weatherCacheDataTomorrow = {
					text : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("text").value,
					images : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("code").value,
					tempHigh : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("high").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
					tempLow : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("low").value + getI18nMsg('weatherTempUnit' + self.tempUnit),
					date : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("date").value,
					weekDay : weatherCache.getElementsByTagName(self.pre + "forecast")[1].attributes.getNamedItem("day").value
				};
				var weatherForecast = '';
				var weatherDetailBG = '0';
				$.each(self.bgImageOptions, function (i, n) {
					if (n.indexOf(parseInt(weatherCacheData.images)) > -1) {
						weatherDetailBG = i;
						return false
					}
				});
				var template = '<div class="weatherContainer"><div class="weatherHeader"><div class="headerIcon"></div>' + getI18nMsg('weatherAppTitle') + '</div><div class="weatherBody"><div class="weatherDetail" style="background-image:url(' + urlImg + 'myapp/weather/img/bg/t01_' + weatherDetailBG + '.jpg)"><div class="weatherContent"><div class="weatherSketch"><div>' + weatherCacheData.temp + '</div><div>' + weatherCacheData.text + '</div><div>' + weatherCacheData.wind + '</div><div>' + weatherCacheData.weekDay + ' | ' + weatherCacheData.date + '</div><div class="line"></div><div class="cityStting"><span class="cityName">' + self.city + '</span>' + (self.isAuto ? '<span class="cityAuto">' + getI18nMsg('auto') + '</span>' : '') + '<span class="citySettingAuto">[' + getI18nMsg('auto') + ']</span><span class="citySetting">[ ' + getI18nMsg('weatherCitySetting') + ' ]</span><span class="TempUnitSetting" unit="' + self.tempUnit + '">[ ' + getI18nMsg('weatherTempUnit' + self.tempUnit) + ' ]</span></div></div><div class="weatherDescription">' + (PDI.get("setup", "ip") != "" ? 'IP: ' + PDI.get("setup", "ip") : "") + '</div></div><div class="weatherAbout"><ul><li class="aboutTop">Tomorrow</li><li class="aboutLeft">' + weatherCacheDataTomorrow.weekDay + '</li><li class="aboutCenter"><img src=' + urlImg + 'myapp/weather/img/m/' + self.getWeatherImage(weatherCacheDataTomorrow.images) + '></li><li class="aboutRight"><span class="tempHeight">' + weatherCacheDataTomorrow.tempHigh + '</span><br/><span class="tempLow">' + weatherCacheDataTomorrow.tempLow + '</span></li><li class="aboutBottom">' + weatherCacheDataTomorrow.text + '</li></ul></div></div><div class="citySettingContainer"><div class="citySearch"><form id="citySearchForm"><input id="searchKeyword" class="searchKeyword" type="text" value="" placeholder="' + getI18nMsg('weatherSearchKeyword') + '" autofocus /><input class="searchBtn" type="submit" value=""/></form></div><div class="cityListContainer"></div></div></div></div>';
				template = $(template);
				template.find('.citySetting').unbind('click').bind('click', function () {
					template.find('.citySettingContainer').toggle()
				});
				template.find('.citySettingAuto').unbind('click').bind('click', function () {
					self.reloadWeather('', targetDialogObj)
				});
				template.find('.TempUnitSetting').unbind('click').bind('click', function () {
					var _tempUnit = $(this).attr("unit");
					if (_tempUnit == "C") {
						self.tempUnit = "F"
					} else {
						self.tempUnit = "C"
					}
					PDI.get("weather", "tempUnit", self.tempUnit);
					self.reloadWeather(self.cityID, targetDialogObj)
				});
				template.unbind('click').bind('click', function (e) {
					if (!$(e.target).hasClass('citySetting')) {
						if (!isContains(e.target, template.find('.citySettingContainer').get(0))) {
							template.find('.citySettingContainer').hide()
						}
					}
				});
				template.find('#citySearchForm').unbind('submit').bind('submit', function () {
					var searchKeyword = $("#searchKeyword").val().toLowerCase();
					var similarCityList = [];
					if (searchKeyword == "") {
						template.find('.cityListContainer').empty().append(getI18nMsg('weatherSearchCityKeywordError'))
					} else {
						$.get(urlImg + "tianqi/city.php?city=" + encodeURIComponent(searchKeyword) + "&type=yahoo&t=" + new Date().getTime(), function (data) {
							if (data) {
								var cityListData = JSON.parse(data);
								if (typeof cityListData == 'object' && cityListData.query.count > 0) {
									var cityList = [];
									if (cityListData.query.count == 1) {
										cityList.push(cityListData.query.results.Result)
									} else {
										cityList = cityListData.query.results.Result
									}
									$.each(cityList, function (i, n) {
										if (typeof n.city != 'undefined' && n.city != null && n.city != '') {
											if (searchKeyword.indexOf(n.city.toLowerCase()) > -1) {
												similarCityList.push(n)
											}
										}
									})
								}
								if (similarCityList.length > 0) {
									similarCityList = similarCityList.sort(function (a, b) {
											return a["country"] > b["country"] ? 1 : a["country"] == b["country"] ? 0 : -1
										});
									var cityListContainerHtml = '<ul>';
									$.each(similarCityList, function (i, n) {
										n.uzip = (typeof n.uzip == "undefined" || n.uzip == null) ? "" : n.uzip;
										n.countrycode = (typeof n.countrycode == "undefined" || n.countrycode == null) ? "" : n.countrycode;
										if (i > 0) {
											cityListContainerHtml += '<li class="cityItemSeparator"></li>'
										}
										cityListContainerHtml += '<li class="cityItem" cityID="' + n.woeid + '"><div class="cityItemIcon"></div><div class="cityItemCity">' + n.city + ',' + n.countrycode + ',' + n.uzip + '</div></li>'
									});
									cityListContainerHtml += '</ul>';
									template.find('.cityListContainer').empty().html(cityListContainerHtml);
									template.find('.cityItem').unbind('click').bind('click', function () {
										template.find('.citySettingContainer').hide();
										self.reloadWeather($(this).attr("cityID"), targetDialogObj)
									})
								} else {
									template.find('.cityListContainer').empty().html(getI18nMsg('weatherSearchCityEmpty'))
								}
							}
						})
					}
					return false
				});
				targetDialogObj.changeContent(template)
			},
			reloadWeather : function (cityID, targetDialogObj) {
				var self = this;
				if (cityID != "") {
					self.cityID = cityID;
					self.dateline = 0;
					self.isAuto = false;
					PDI.set('weather', '', {
						cityID : self.cityID,
						isAuto : self.isAuto,
						tempUnit : self.tempUnit,
						dateline : self.dateline
					});
					self.getWeather(function () {
						self.getWeatherData(function (xmlDoc) {
							if (xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue != 'Yahoo! Weather - Error') {
								self.weatherCache = xmlDoc;
								setTimeout(function () {
									self.template(targetDialogObj, self.weatherCache)
								}, 200)
							} else {
								showNotice(getI18nMsg('weatherCityDataNull'));
								self.reloadWeather(self.defaultCityID, targetDialogObj)
							}
						})
					})
				} else {
					var t = new Date().getTime();
					$.ajax({
						url : urlImg + "myapp/weather/city/global/getAddress.php?t=" + t,
						success : function (result) {
							var ipInfo = JSON.parse(result);
							if (typeof ipInfo == 'object' && ipInfo.city) {
								$.ajax({
									url : urlImg + "tianqi/city.php?city=" + encodeURIComponent(ipInfo.city) + "&type=yahoo&t=" + t,
									success : function (data) {
										self.cityID = self.defaultCityID;
										data = JSON.parse(data);
										if (typeof data == 'object') {
											var cityList = [];
											if (data.query.count > 1) {
												cityList = data.query.results.Result
											} else {
												cityList.push(data.query.results.Result)
											}
											$.each(cityList, function (i, n) {
												if (n.woeid != "" && n.city == ipInfo.city) {
													self.cityID = n.woeid;
													return false
												}
											})
										}
										self.dateline = 0;
										self.isAuto = true;
										PDI.set('weather', '', {
											cityID : self.cityID,
											isAuto : self.isAuto,
											tempUnit : self.tempUnit,
											dateline : self.dateline
										});
										self.getWeather(function () {
											self.getWeatherData(function (xmlDoc) {
												if (xmlDoc.getElementsByTagName("title")[0].childNodes[0].nodeValue != 'Yahoo! Weather - Error') {
													self.weatherCache = xmlDoc;
													setTimeout(function () {
														self.template(targetDialogObj, self.weatherCache)
													}, 500)
												} else {
													showNotice(getI18nMsg('weatherCityDataNull'));
													self.reloadWeather(self.defaultCityID, targetDialogObj)
												}
											})
										})
									}
								})
							} else {
								showNotice(getI18nMsg('weatherCityIsNull'))
							}
						}
					})
				}
			}
		};
		return weather
	})()
})(jq);
var weather = $.weather();
