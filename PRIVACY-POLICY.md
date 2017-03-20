Privacy Policy
==============

All information handled by Vimium++, including history, bookmarks and page titles and urls, will only be used locally.

There will be no syncing activity to your Chrome account, unless you enable the setting item `vimSync` manually.

Your search history in `Vomnibar` and `Link Hints` modes will be cleaned immediately after it's used.

While Vimium++ supports both settings syncing (uploading) and exporting,
    your search keywords on `FindMode` won't be included, so that your privacy is very safe.

Please pay attention that your `FindMode` search keywords on an incognito tab are stored in memory,
    and keep alive if only there's at least one incognito window alive.


Permissions Required
====================

This extension Vimium++ requires such types of information and permissions:
* **`bookmarks` & `history`**: match queries and generate suggestions for Vomnibar
* **`tabs`**: operate your tabs, including opening / removing / moving / updating
* **`webNavigation`**: get a page's new url to check if Vimium++ should be enabled / disabled on the page
* **clipboard read+write & browsing activity**: add shortcuts to copy/paste page title/url, link text/href and so on
* **`contentSettings`**: toggle browser's content settings on special websites, such as whether to show images
* **`notifications`**: show a notification whenever Vimium++ is upgraded to a higher version
* **`sessions`**: allow you to restore closed tabs (supported from Chrome 37)
* **`storage`**: not in use by default; if you enable `vimSync` manually,
    Vimium++ will need it to sync settings to Google servers

Note: the "**browsing activity**" listed above actually includes many permissions:
    `tabs`, `<all_urls>` and `webNavigation`.


Other Explanations
==================

Vimium++ overrides the "newtab" chrome url in order to provide better user experience on the `chrome://newtab` page.

Vimium++ also registers a search key `v` for Chrome omni box, which makes the box work just like Vomnibar on omni mode.

Such permissions can be removed safely and won't break Vimium++:
* `notifications`, `storage` and `webNavigation`
* before Chrome 37, there's no `sessions` functionality, so a few commands of Vimium++ won't work,
    but most others are not influenced.
