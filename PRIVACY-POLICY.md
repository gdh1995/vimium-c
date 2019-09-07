Privacy Policy
==============

Vimium C supports both export, and cloud-based synchronization of your settings,
    including key mappings and search engines, but no browsing behavior.

By default, Vimium C only downloads synced settings during the first installation,
and if no synced settings found, it will never sync with your Chrome account.
However, if you do wish to enable this behavior, you may enable the advanced
    `Synchronize settings with your current account for this browser` setting.

All information handled by Vimium C, including history, bookmarks, page titles and URLs, will only be used locally.

Your search history in `Vomnibar` and `Link Hints` modes will be purged immediately after use.

Your keyword searches using `FindMode` are never included in these.
Please note that your `FindMode` search keywords on Incognito windows are stored temporarily,
    and will remain in memory, until all your Incognito windows are destroyed.


Permissions Required
====================

This extension Vimium C requires such types of information and permissions:
* **`bookmarks` & `history`**: match queries and generate suggestions for Vomnibar
* **`tabs`**: operate your tabs, including opening / removing / moving / updating
* **`webNavigation`**: get a page's new url to check if Vimium C should be enabled / disabled on the page
* **clipboard read+write & browsing activity**: add shortcuts to copy/paste page title/url, link text/href and so on
* **`contentSettings`**: toggle browser's content settings on special websites, such as whether to show images
* **`notifications`**: show a notification whenever Vimium C is upgraded to a higher version
* **`sessions`**: allow you to restore closed tabs (supported from Chrome 37)
* **`storage`**: **not in use** by default.
    When you enable "`Sync settings with your current account for this browser`" manually,
    Vimium C will require this permission to sync your settings items with Google servers.

Note:
* The "**browsing activity**" listed above actually includes many permissions:
    `tabs`, `<all_urls>` and `webNavigation`.
* Vimium C never deletes any browser history item, except on explicit user request (such as <kbd>Shift+Delete</kbd>).


Further Information
===================

In old versions (before v1.77.0),
Vimium C overrides the "newtab" chrome URL in order to provide a better user experience on the `chrome://newtab` page.
But since 2019/09 the default behavior has been updated, so there's no more overriding in public releases.
As an alternative, the extension [NewTab Adapter](https://github.com/gdh1995/vimium-c-helpers/tree/master/newtab#readme)
    does the same thing.

Vimium C also registers a search key (`v`) for Chrome's [omnibox](https://developer.chrome.com/extensions/omnibox).
This makes the box work just like Vomnibar in omni mode.

You may remove certain permissions without breaking Vimium C (note that some commands might fail as a result):
* `webNavigation`, `contentSettings`, `notifications`, and `storage` may be removed.
* Certain manifest fields, including `commands`, `chrome_url_overrides`, and `omnibox`, can be removed safely.
* In versions previous to Chrome 37, no `sessions` functionality exists, so a few of Vimium C's commands won't work.
    Most others will remain unchanged.
