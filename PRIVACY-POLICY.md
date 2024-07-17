How Vimium C Respects Your Privacy
==================================

Vimium C supports both export and cloud-based synchronization of your settings (including key mappings and search
engines). None of your browsing behavior is included.

By default, Vimium C only downloads synced settings during the first installation, and if no synced settings are found,
it will never sync with your browser account. However, if you do wish to enable this behavior, you may enable the
advanced `Synchronize settings with your current account for this browser` setting.

All information handled by Vimium C, including history, bookmarks, page titles and URLs, will only be used locally.

Your search history in `Link Hints` modes will be purged immediately after use,
and queries in `Vomnibar` and browser omnibox will be cleared in less than 20 seconds. Your keyword searches --
entered when using `FindMode` -- are stored but never included in synced settings. Please note that your `FindMode`
search keywords on Incognito windows are stored temporarily, and will remain in memory, until all of your Incognito
windows have been destroyed.


Permissions Required
====================

Vimium C requires these permissions:
* **`bookmarks` & `history`**: to match queries and generate suggestions for Vomnibar.
* **`tabs`**: to operate your tabs, including opening, removing, moving and updating.
* **`webNavigation`**: to match an incoming URL, confirming whether Vimium C should be enabled or disabled on the page.
* **clipboard read+write & browsing activity**: to add shortcuts for copying and pasting the page title/URL, link
  text/href, and the like.
* **`contentSettings`**: to toggle your browser's content settings. For example, turn on/off images, or JavaScript,
  on selected websites.
* **`notifications`**: to show a notification whenever Vimium C is upgraded.
* **`sessions`**: to allow you to restore closed tabs. This functionality requires Chrome 37+ or Firefox.
* **`storage`**: its syncing functionality is **not in use** by default. However, if you enable "`Sync settings with
  your current account for this browser`", Vimium C will require **`storage.sync`**, to sync your settings items with
  the browser account servers.
* **`tabGroups`**: to follow and keep current tab groups during `moveTab*` commands and so on
* **`cookies`**: (on Firefox only) to follow tab containers during moving tabs and opening URLs
* **`downloads`**: to let your browser directly download some links
* **`favicon`**: to show website icons on Vomnibar
* **`scripting`**: to collect information about what items on webpages are clickable
* **`search`**: to search for query words on Vomnibar using your browser's default search engine

Note:
* The "**browsing activity**" listed above actually includes a number of separate permissions: `tabs`, `<all_urls>` and
  `webNavigation`.
* Vimium C never deletes any browser history item, except on explicit user requests (such as <kbd>Shift+Delete</kbd>).


Other Information
===================

Vimium C formerly overrode the "newtab" browser URL, to provide a better user experience on the `chrome://newtab` page.
That behavior was reversed in version 1.77.0, released in Sep 2019: Vimium C no longer overrides this setting. If you'd
like to restore the previous behavior, we recommend [NewTab
Adapter](https://github.com/gdh1995/vimium-c-helpers/tree/master/newtab#readme).

Vimium C registers a search key (`v`) for browser's [omnibox](https://developer.chrome.com/extensions/omnibox) (the
address bar). This makes the box work just like Vomnibar in omni mode.

You may remove certain permissions without breaking Vimium C (note that some commands might fail as a result):
* `webNavigation`, `contentSettings`, `notifications`, and `storage` may be removed.
* Certain manifest fields, including `commands`, `chrome_url_overrides`, and `omnibox`, can be removed safely.
* In versions previous to Chrome 37, no `sessions` functionality exists, so a few of Vimium C's commands won't work.
  Most others will remain unchanged.
