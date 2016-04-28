Privacy Policy
==============

All information handled by Vimium++, including history, bookmarks and page titles and urls, will only be used locally.

There will be no syncing activity to your Chrome account, unless you enable the hidden setting item "vimSync" manually.

Your search history on `Vomnibar` and `Link Hints` modes will be cleaned immediately after it's used.

While Vimium++ supports both settings syncing (uploading) and exporting,
    your search keywords on `Find` mode won't be included,
    so the your privacy is very safe.

Please pay attention that your `Find` mode search keywords on an incognito tab are remembered on your local computer,
    and keep existing until the next search keyword - just closing an incognito window won't let Vimium++ clean them.


Permissions Required
====================

This extension Vimium++ requires such types of information and permissions:
* bookmarks & history: match queries and generate suggestions for Vomnibar
* tabs: operate your tabs, including opening / removing / moving / updating
* web navigation: get a page's new url to check if Vimium++ should be enabled / disabled on the page
* clipboard read+write & browsing activity: add shortcuts to copy/paste page title/url, link text/href and so on
* content settings: toggle Chrome's content settings on special websites, such as whether to show images
* notifications: show a notification whenever Vimium++ is upgraded to a higher version
* sessions: allow you to restore closed tabs (supported from Chrome 37)
* storage: not in use by default; if you enable "vimSync" manually,
    Vimium++ needs it to sync settings to your Chrome account
* your bookmarks and navigating history to provide

Note: the "browsing activity" listed above actually includes many permissions:
    "tabs", "\<all_urls\>" and "webNavigation".


Other Explanations
=================

Vimium++ also registers a search key "v" for Chrome omni bar, which makes the bar work just like Vomnibar.

Vimium++ overrides the "newtab" chrome url in order to provide better user experience on chrome://newtab pages.

Such permissions can be removed safely and won't break Vimium:
* "notifications", "storage" and "webNavigation"
* before Chrome 37, there's no "sessions" functionality, so a few commands of Vimium++ won't work,
    but most others are not influenced.
