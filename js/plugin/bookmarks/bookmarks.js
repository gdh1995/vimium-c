(function ($) {
	$.bookmarks = function () {
		return new Bookmarks()
	};
	if (1) {
		var Bookmarks = function () {};
		Bookmarks.prototype = {
			content : '',
			openQueue : [],
			template : function (tree, recentTree) {
				var self = this;
				recentTree = {
					title : getI18nMsg('bookmarksRecent'),
					children : recentTree,
					id : 'recent'
				};
				self.openQueue = PDI.get('setup', 'bookMarksOpenQueue');
				self.content = '<div class="bookmarksContainer"><div class="bookmarksHeader"><div class="headerIcon"></div><div class="searchBookmarks"><input type="text" class="searchBookmarksKeyword" /></div>' + getI18nMsg('bookmarksAppTitle') + '<div class="bookmarksManage">' + getI18nMsg('manage') + '</div></div><div class="bookmarksBody"><div class="bookmarksFolder search"><div class="bookmarksFolderTitle open">搜索结果</div><ul class="bookMarksFolderContainer"></ul></div>';
				self.getBookmarks(tree[0]);
				self.getBookmarks(recentTree);
				self.content += '</div></div>';
				self.content = $(self.content);
				self.content.find(".searchBookmarksKeyword").unbind('keyup').bind('keyup', function () {
					var keyword = $(this).val();
					var searchBookMarksFolderContainer = self.content.find(".bookmarksFolder.search .bookMarksFolderContainer");
					searchBookMarksFolderContainer.empty();
					if (keyword == "") {
						self.content.find(".bookmarksFolder").show();
						self.content.find(".bookmarksFolder.search").hide()
					} else {
						chrome.bookmarks.search(keyword, function (bookmarkTreeNode) {
							if (bookmarkTreeNode.length > 0) {
								$.each(bookmarkTreeNode, function (i, n) {
									searchBookMarksFolderContainer.append('<li class="bookMarksFolderItem"><a href="' + n.url + '" title="' + n.title + '">' + title_fix(n.title) + '</a></li>')
								})
							} else {
								searchBookMarksFolderContainer.html('<li class="bookMarksFolderItem"><a>' + getI18nMsg('noResult') + '</a></li>')
							}
							self.content.find(".bookmarksFolder").hide();
							self.content.find(".bookmarksFolder.search").show()
						})
					}
				});
				self.content.find(".bookmarksManage").bind("click", function (e) {
					openTab(false, "chrome://bookmarks/#1", e.ctrlKey || e.metaKey);
				});
				self.content.find(".bookmarksFolderTitle").bind('click', function () {
					var fid = $(this).attr('fid');
					var index = self.openQueue.indexOf(fid);
					if ($(this).hasClass('open')) {
						$(this).removeClass('open');
						self.openQueue.splice(index, 1)
					} else {
						$(this).addClass('open');
						if (index == -1) {
							self.openQueue.push(fid)
						}
					}
					PDI.set('setup', 'bookMarksOpenQueue', self.openQueue)
				});
				self.content.find('.bookMarksFolderItemDel').unbind('click').bind('click', function () {
					if (confirm(getI18nMsg('bookmardDelete_confirm'))) {
						var delFid = $(this).parent().attr("fid");
						chrome.bookmarks.remove($(this).parent().attr("fid"), function () {
							self.content.find('.bookMarksFolderItem[fid="' + delFid + '"]').remove()
						})
					}
				});
				self.content.find('.bookMarksFolderItemAdd').unbind('click').bind('click', function () {
					var url = $(this).siblings('a').attr('href');
					var title = $(this).siblings('a').text();
					$('#bookmarksDialog').find('.close').get(0).click();
					if (DBOX.getLastDialbox() == "cloud") {
						var toIndex = DBOX.getDialboxIndex('normal', 'cloud');
						PDI.appendDialbox('normal', toIndex, {
							title : title,
							url : url,
							isApp : false,
							isNew : true
						})
					} else {
						PDI.insertDialbox('normal', {
							title : title,
							url : url,
							isApp : false,
							isNew : true
						})
					}
					DBOX.getBoxes();
					setTimeout(function () {
						DBOX.loadBoxes(DBOX.totalPage)
					}, 350)
				})
			},
			getBookmarks : function (tree) {
				var self = this;
				if (typeof tree.url == 'undefined') {
					if (typeof tree.children != 'undefined' && tree.children.length > 0) {
						if (tree.id != 0 && tree.title != '') {
							if (self.openQueue.length == 0) {
								self.content += '<div class="bookmarksFolder"><div class="bookmarksFolderTitle' + (tree.title == getI18nMsg('bookmarksRecent') ? ' recent' : '') + (tree.id == 'recent' ? ' open' : '') + '" fid="' + tree.id + '">' + title_fix(tree.title) + '</div><ul class="bookMarksFolderContainer">'
							} else {
								self.content += '<div class="bookmarksFolder"><div class="bookmarksFolderTitle' + (tree.title == getI18nMsg('bookmarksRecent') ? ' recent' : '') + (self.openQueue.indexOf(tree.id) != -1 ? ' open' : '') + '" fid="' + tree.id + '">' + title_fix(tree.title) + '</div><ul class="bookMarksFolderContainer">'
							}
						}
						var folder = false;
						$.each(tree.children, function (i, n) {
							if (typeof n.url == 'undefined') {
								folder = true
							}
						});
						if (folder) {
							$.each(tree.children, function (i, n) {
								if (typeof n.url == 'undefined') {
									self.getBookmarks(n)
								}
							})
						}
						$.each(tree.children, function (i, n) {
							if (typeof n.url != 'undefined') {
								self.getBookmarks(n)
							}
						});
						if (tree.id > 0 && tree.title != '') {
							self.content += '</ul></div>'
						}
					} else {
						if (tree.id != 0 && tree.title != '') {
							self.content += '<div class="bookmarksFolder"><div class="bookmarksFolderTitle" fid="' + tree.id + '">' + title_fix(tree.title) + '</div><ul class="bookMarksFolderContainer"></ul></div>'
						}
					}
				} else {
					if (tree.url.trim() != '') {
						var itemUrlArray = urlRegEx(tree.url);
						self.content += '<li class="bookMarksFolderItem"  fid="' + tree.id + '"><a href="' + tree.url + '" title="' + tree.title + '">' + title_fix(tree.title) + '</a><div class="bookMarksFolderItemAdd" title="' + getI18nMsg('addToDialbox') + '"></div><div class="bookMarksFolderItemDel" title="' + getI18nMsg('delete') + '"></div></li>'
					}
				}
			}
		};
	}
})(jq);
var bookmarks = $.bookmarks();
