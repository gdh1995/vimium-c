// Type definitions for Chrome extension development
// Project: http://developer.chrome.com/extensions/
// Definitions by: Matthew Kimber <https://github.com/matthewkimber>, otiai10 <https://github.com/otiai10>, couven92 <https://github.com/couven92>, RReverser <https://github.com/rreverser>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Modified by gdh1995 (github).


/// <reference no-default-lib="true"/>

////////////////////
// Global object
////////////////////
interface Window {
    chrome: typeof chrome;
}

////////////////////
// Bookmarks
////////////////////
/**
 * Use the chrome.bookmarks API to create, organize, and otherwise manipulate bookmarks. Also see Override Pages, which you can use to create a custom Bookmark Manager page.
 * Availability: Since Chrome 5.
 * Permissions:  "bookmarks"
 */
declare namespace chrome.bookmarks {
    /** A node (either a bookmark or a folder) in the bookmark tree. Child nodes are ordered within their parent folder. */
    interface BookmarkTreeNodeBase {
        /** Optional. The 0-based position of this node within its parent folder.  */
        index?: number;
        /** Optional. When this node was created, in milliseconds since the epoch (new Date(dateAdded)).  */
        dateAdded?: number;
        /** The text displayed for the node. */
        title: string;
        /** Optional. When the contents of this folder last changed, in milliseconds since the epoch.   */
        dateGroupModified?: number;
        /** The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.  */
        id: string;
        /** Optional. The id of the parent folder. Omitted for the root node.   */
        parentId: string;
        /**
         * Optional.
          * Since Chrome 37.
         * Indicates the reason why this node is unmodifiable. The managed value indicates that this node was configured by the system administrator or by the custodian of a supervised user. Omitted if the node can be modified by the user and the extension (default).
         */
        unmodifiable?: any;

        children?: void | BookmarkTreeNode[];
        url?: void | string;
    }
    interface BookmarkFolderNode extends BookmarkTreeNodeBase {
        /** Optional. An ordered list of children of this node.  */
        children: BookmarkTreeNode[];
        url?: void;
    }
    interface BookmarkEndNode extends BookmarkTreeNodeBase {
        /** Optional. The URL navigated to when a user clicks the bookmark. Omitted for folders.   */
        children?: void;
        url: string;
    }
    type BookmarkTreeNode = BookmarkEndNode | BookmarkFolderNode;

    interface BookmarkRemoveInfo {
        index: number;
        parentId: string;
    }

    interface BookmarkMoveInfo {
        index: number;
        oldIndex: number;
        parentId: string;
        oldParentId: string;
    }

    interface BookmarkChangeInfo {
        url?: string;
        title: string;
    }

    interface BookmarkReorderInfo {
        childIds: string[];
    }

    interface BookmarkRemovedEvent extends chrome.events.Event<(id: string, removeInfo: BookmarkRemoveInfo) => void> {}

    interface BookmarkImportEndedEvent extends chrome.events.Event<() => void> {}

    interface BookmarkMovedEvent extends chrome.events.Event<(id: string, moveInfo: BookmarkMoveInfo) => void> {}

    interface BookmarkImportBeganEvent extends chrome.events.Event<() => void> {}

    interface BookmarkChangedEvent extends chrome.events.Event<(id: string, changeInfo: BookmarkChangeInfo) => void> {}

    interface BookmarkCreatedEvent extends chrome.events.Event<(id: string, bookmark: BookmarkTreeNode) => void> {}

    interface BookmarkChildrenReordered extends chrome.events.Event<(id: string, reorderInfo: BookmarkReorderInfo) => void> {}

    interface BookmarkSearchQuery {
        query?: string;
        url?: string;
        title?: string;
    }

    interface BookmarkCreateArg {
        /** Optional. Defaults to the Other Bookmarks folder.  */
        parentId?: string;
        index?: number;
        title?: string;
        url?: string;
    }

    interface BookmarkDestinationArg {
        parentId?: string;
        index?: number;
    }

    interface BookmarkChangesArg {
        title?: string;
        url?: string;
    }

    /** @deprecated since Chrome 38. Bookmark write operations are no longer limited by Chrome. */
    var MAX_WRITE_OPERATIONS_PER_HOUR: number;
    /** @deprecated since Chrome 38. Bookmark write operations are no longer limited by Chrome. */
    var MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: number;

    /**
     * Searches for BookmarkTreeNodes matching the given query. Queries specified with an object produce BookmarkTreeNodes matching all specified properties.
     * @param query A string of words and quoted phrases that are matched against bookmark URLs and titles.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function search(query: string, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Searches for BookmarkTreeNodes matching the given query. Queries specified with an object produce BookmarkTreeNodes matching all specified properties.
     * @param query An object with one or more of the properties query, url, and title specified. Bookmarks matching all specified properties will be produced.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function search(query: BookmarkSearchQuery, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Retrieves the entire Bookmarks hierarchy.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function getTree(callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Retrieves the recently added bookmarks.
     * @param numberOfItems The maximum number of items to return.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function getRecent(numberOfItems: number, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Retrieves the specified BookmarkTreeNode.
     * @param id A single string-valued id
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function get(id: string, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Retrieves the specified BookmarkTreeNode.
     * @param idList An array of string-valued ids
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function get(idList: string[], callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Creates a bookmark or folder under the specified parentId. If url is NULL or missing, it will be a folder.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function( BookmarkTreeNode result) {...};
     */
    export function create(bookmark: BookmarkCreateArg, callback?: (result: BookmarkTreeNode) => void): 1;
    /**
     * Moves the specified BookmarkTreeNode to the provided location.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function( BookmarkTreeNode result) {...};
     */
    export function move(id: string, destination: BookmarkDestinationArg, callback?: (result: BookmarkTreeNode) => void): 1;
    /**
     * Updates the properties of a bookmark or folder. Specify only the properties that you want to change; unspecified properties will be left unchanged. Note: Currently, only 'title' and 'url' are supported.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function( BookmarkTreeNode result) {...};
     */
    export function update(id: string, changes: BookmarkChangesArg, callback?: (result: BookmarkTreeNode) => void): 1;
    /**
     * Removes a bookmark or an empty bookmark folder.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function() {...};
     */
    export function remove(id: string, callback?: Function): 1;
    /**
     * Retrieves the children of the specified BookmarkTreeNode id.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function getChildren(id: string, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Since Chrome 14.
     * Retrieves part of the Bookmarks hierarchy, starting at the specified node.
     * @param id The ID of the root of the subtree to retrieve.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of BookmarkTreeNode results) {...};
     */
    export function getSubTree(id: string, callback: (results: BookmarkTreeNode[]) => void): 1;
    /**
     * Recursively removes a bookmark folder.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function() {...};
     */
    export function removeTree(id: string, callback?: Function): 1;

    /** Fired when a bookmark or folder is removed. When a folder is removed recursively, a single notification is fired for the folder, and none for its contents. */
    var onRemoved: BookmarkRemovedEvent;
    /** Fired when a bookmark import session is ended. */
    var onImportEnded: BookmarkImportEndedEvent;
    /** Fired when a bookmark import session is begun. Expensive observers should ignore onCreated updates until onImportEnded is fired. Observers should still handle other notifications immediately. */
    var onImportBegan: BookmarkImportBeganEvent;
    /** Fired when a bookmark or folder changes. Note: Currently, only title and url changes trigger this. */
    var onChanged: BookmarkChangedEvent;
    /** Fired when a bookmark or folder is moved to a different parent folder. */
    var onMoved: BookmarkMovedEvent;
    /** Fired when a bookmark or folder is created. */
    var onCreated: BookmarkCreatedEvent;
    /** Fired when the children of a folder have changed their order due to the order being sorted in the UI. This is not called as a result of a move(). */
    var onChildrenReordered: BookmarkChildrenReordered;
}

////////////////////
// Browser Action
////////////////////
/**
 * Use browser actions to put icons in the main Google Chrome toolbar, to the right of the address bar. In addition to its icon, a browser action can also have a tooltip, a badge, and a popup.
 * Availability: Since Chrome 5.
 * Manifest:  "browser_action": {...}
 */
declare namespace chrome.browserAction {
    interface BadgeBackgroundColorDetails {
        /** An array of four integers in the range [0,255] that make up the RGBA color of the badge. For example, opaque red is [255, 0, 0, 255]. Can also be a string with a CSS value, with opaque red being #FF0000 or #F00. */
        color: any;
        /** Optional. Limits the change to when a particular tab is selected. Automatically resets when the tab is closed.  */
        tabId?: number;
    }

    interface BadgeTextDetails {
        /** Any number of characters can be passed, but only about four can fit in the space. */
        text: string;
        /** Optional. Limits the change to when a particular tab is selected. Automatically resets when the tab is closed.  */
        tabId?: number;
    }

    interface TitleDetails {
        /** The string the browser action should display when moused over. */
        title: string;
        /** Optional. Limits the change to when a particular tab is selected. Automatically resets when the tab is closed.  */
        tabId?: number;
    }

    interface TabDetails {
        /** Optional. Specify the tab to get the information. If no tab is specified, the non-tab-specific information is returned.  */
        tabId?: number;
    }

    interface TabIconDetails {
        /** Optional. Either a relative image path or a dictionary {size -> relative image path} pointing to icon to be set. If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density. If the number of image pixels that fit into one screen space unit equals scale, then image with size scale * 19 will be selected. Initially only scales 1 and 2 will be supported. At least one image must be specified. Note that 'details.path = foo' is equivalent to 'details.imageData = {'19': foo}'  */
        path?: any;
        /** Optional. Limits the change to when a particular tab is selected. Automatically resets when the tab is closed.  */
        tabId?: number;
        /** Optional. Either an ImageData object or a dictionary {size -> ImageData} representing icon to be set. If the icon is specified as a dictionary, the actual image to be used is chosen depending on screen's pixel density. If the number of image pixels that fit into one screen space unit equals scale, then image with size scale * 19 will be selected. Initially only scales 1 and 2 will be supported. At least one image must be specified. Note that 'details.imageData = foo' is equivalent to 'details.imageData = {'19': foo}'  */
        imageData?: ImageData | {
            [size in "19" | "38"]?: ImageData
        };
    }

    interface PopupDetails {
        /** Optional. Limits the change to when a particular tab is selected. Automatically resets when the tab is closed.  */
        tabId?: number;
        /** The html file to show in a popup. If set to the empty string (''), no popup is shown. */
        popup: string;
    }

    interface BrowserClickedEvent extends chrome.events.Event<(tab: chrome.tabs.Tab) => void> {}

    /**
     * Since Chrome 22.
     * Enables the browser action for a tab. By default, browser actions are enabled.
     * @param tabId The id of the tab for which you want to modify the browser action.
     */
    export function enable(tabId?: number): 1;
    /** Sets the background color for the badge. */
    export function setBadgeBackgroundColor(details: BadgeBackgroundColorDetails): 1;
    /** Sets the badge text for the browser action. The badge is displayed on top of the icon. */
    export function setBadgeText(details: BadgeTextDetails): 1;
    /** Sets the title of the browser action. This shows up in the tooltip. */
    export function setTitle(details: TitleDetails): 1;
    /**
     * Since Chrome 19.
     * Gets the badge text of the browser action. If no tab is specified, the non-tab-specific badge text is returned.
     * @param callback The callback parameter should be a function that looks like this:
     * function(string result) {...};
     */
    export function getBadgeText(details: TabDetails, callback: (result: string) => void): 1;
    /** Sets the html document to be opened as a popup when the user clicks on the browser action's icon. */
    export function setPopup(details: PopupDetails): 1;
    /**
     * Since Chrome 22.
     * Disables the browser action for a tab.
     * @param tabId The id of the tab for which you want to modify the browser action.
     */
    export function disable(tabId?: number): 1;
    /**
     * Since Chrome 19.
     * Gets the title of the browser action.
     * @param callback The callback parameter should be a function that looks like this:
     * function(string result) {...};
     */
    export function getTitle(details: TabDetails, callback: (result: string) => void): 1;
    /**
     * Since Chrome 19.
     * Gets the background color of the browser action.
     * @param callback The callback parameter should be a function that looks like this:
     * function( ColorArray result) {...};
     */
    export function getBadgeBackgroundColor(details: TabDetails, callback: (result: number[]) => void): 1;
    /**
     * Since Chrome 19.
     * Gets the html document set as the popup for this browser action.
     * @param callback The callback parameter should be a function that looks like this:
     * function(string result) {...};
     */
    export function getPopup(details: TabDetails, callback: (result: string) => void): 1;
    /**
     * Sets the icon for the browser action. The icon can be specified either as the path to an image file or as the pixel data from a canvas element, or as dictionary of either one of those. Either the path or the imageData property must be specified.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function() {...};
     */
    export function setIcon(details: TabIconDetails, callback?: Function): 1;

    /** Fired when a browser action icon is clicked. This event will not fire if the browser action has a popup. */
    var onClicked: BrowserClickedEvent;
}

////////////////////
// Commands
////////////////////
/**
 * Use the commands API to add keyboard shortcuts that trigger actions in your extension, for example, an action to open the browser action or send a command to the extension.
 * Availability: Since Chrome 25.
 * Manifest:  "commands": {...}
 */
declare namespace chrome.commands {
    interface Command {
        /** Optional. The name of the Extension Command  */
        name?: string;
        /** Optional. The Extension Command description  */
        description?: string;
        /** Optional. The shortcut active for this command, or blank if not active.  */
        shortcut?: string;
    }

    interface CommandEvent extends chrome.events.Event<(command: string) => void> {}

    /**
     * Returns all the registered extension commands for this extension and their shortcut (if active).
     * @param callback Called to return the registered commands.
     * If you specify the callback parameter, it should be a function that looks like this:
     * function(array of Command commands) {...};
     */
    export function getAll(callback: (commands: Command[]) => void): 1;

    /** Fired when a registered command is activated using a keyboard shortcut. */
    var onCommand: CommandEvent;
}

////////////////////
// Content Settings
////////////////////
/**
 * Use the chrome.contentSettings API to change settings that control whether websites can use features such as cookies, JavaScript, and plugins. More generally speaking, content settings allow you to customize Chrome's behavior on a per-site basis instead of globally.
 * Availability: Since Chrome 16.
 * Permissions:  "contentSettings"
 */
declare namespace chrome.contentSettings {
    interface ClearDetails {
        /**
         * Optional.
          * Where to clear the setting (default: regular).
         * The scope of the ContentSetting. One of
         * * regular: setting for regular profile (which is inherited by the incognito profile if not overridden elsewhere),
         * * incognito_session_only: setting for incognito profile that can only be set during an incognito session and is deleted when the incognito session ends (overrides regular settings).
         */
        scope?: ValidScopes;
    }

    interface SetDetails {
        /** Optional. The resource identifier for the content type.  */
        resourceIdentifier?: ResourceIdentifier;
        /** The setting applied by this rule. See the description of the individual ContentSetting objects for the possible values. */
        setting: any;
        /** Optional. The pattern for the secondary URL. Defaults to matching all URLs. For details on the format of a pattern, see Content Setting Patterns.  */
        secondaryPattern?: string;
        /** Optional. Where to set the setting (default: regular).  */
        scope?: string;
        /** The pattern for the primary URL. For details on the format of a pattern, see Content Setting Patterns. */
        primaryPattern: string;
    }

    interface GetDetails {
        /** Optional. The secondary URL for which the content setting should be retrieved. Defaults to the primary URL. Note that the meaning of a secondary URL depends on the content type, and not all content types use secondary URLs.  */
        secondaryUrl?: string;
        /** Optional. A more specific identifier of the type of content for which the settings should be retrieved.  */
        resourceIdentifier?: ResourceIdentifier;
        /** Optional. Whether to check the content settings for an incognito session. (default false)  */
        incognito?: boolean;
        /** The primary URL for which the content setting should be retrieved. Note that the meaning of a primary URL depends on the content type. */
        primaryUrl: string;
    }

    interface ReturnedDetails {
        /** The content setting. See the description of the individual ContentSetting objects for the possible values. */
        setting: "allow" | "block" | "ask" | "session_only" | "detect_important_content";
    }

    interface ContentSetting {
        /**
         * Clear all content setting rules set by this extension.
         * @param callback If you specify the callback parameter, it should be a function that looks like this:
         * function() {...};
         */
        clear(details: ClearDetails, callback?: () => void): 1;
        /**
         * Applies a new content setting rule.
         * @param callback If you specify the callback parameter, it should be a function that looks like this:
         * function() {...};
         */
        set(details: SetDetails, callback?: () => void): 1;
        /**
         * @param callback The callback parameter should be a function that looks like this:
         * function(array of ResourceIdentifier resourceIdentifiers) {...};
         * Parameter resourceIdentifiers: A list of resource identifiers for this content type, or undefined if this content type does not use resource identifiers.
         */
        getResourceIdentifiers(callback: (resourceIdentifiers?: ResourceIdentifier[]) => void): 1;
        /**
         * Gets the current content setting for a given pair of URLs.
         * @param callback The callback parameter should be a function that looks like this:
         * function(object details) {...};
         */
        get(details: GetDetails, callback: (details: ReturnedDetails) => void): 1;
    }

    /** The only content type using resource identifiers is contentSettings.plugins. For more information, see Resource Identifiers. */
    interface ResourceIdentifier {
        /** The resource identifier for the given content type. */
        id: string;
        /** Optional. A human readable description of the resource.  */
        description?: string;
    }

    type ValidScopes = "incognito_session_only" | "regular";

    type ValidTypes = "cookies" | "popups" | "javascript" | "notifications" | "plugins" | "images"
        | "location" | "fullscreen" | "mouselock" | "unsandboxedPlugins" | "automaticDownloads";

    /**
     * Whether to allow cookies and other local data to be set by websites. One of
     * allow: Accept cookies,
     * block: Block cookies,
     * session_only: Accept cookies only for the current session.
     * Default is allow.
     * The primary URL is the URL representing the cookie origin. The secondary URL is the URL of the top-level frame.
     */
    var cookies: ContentSetting;
    /**
     * Whether to allow sites to show pop-ups. One of
     * allow: Allow sites to show pop-ups,
     * block: Don't allow sites to show pop-ups.
     * Default is block.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var popups: ContentSetting;
    /**
     * Whether to run JavaScript. One of
     * allow: Run JavaScript,
     * block: Don't run JavaScript.
     * Default is allow.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var javascript: ContentSetting;
    /**
     * Whether to allow sites to show desktop notifications. One of
     * allow: Allow sites to show desktop notifications,
     * block: Don't allow sites to show desktop notifications,
     * ask: Ask when a site wants to show desktop notifications.
     * Default is ask.
     * The primary URL is the URL of the document which wants to show the notification. The secondary URL is not used.
     */
    var notifications: ContentSetting;
    /**
     * Whether to run plugins. One of
     * allow: Run plugins automatically,
     * block: Don't run plugins automatically,
     * detect_important_content: Only run automatically those plugins that are detected as the website's main content.
     * Default is allow.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var plugins: ContentSetting;
    /**
     * Whether to show images. One of
     * allow: Show images,
     * block: Don't show images.
     * Default is allow.
     * The primary URL is the URL of the top-level frame. The secondary URL is the URL of the image.
     */
    var images: ContentSetting;
    /**
     * Since Chrome 42.
     * Whether to allow Geolocation. One of
     * allow: Allow sites to track your physical location,
     * block: Don't allow sites to track your physical location,
     * ask: Ask before allowing sites to track your physical location.
     * Default is ask.
     * The primary URL is the URL of the document which requested location data. The secondary URL is the URL of the top-level frame (which may or may not differ from the requesting URL).
     */
    var location: ContentSetting;
    /**
     * Since Chrome 42.
     * Whether to allow sites to toggle the fullscreen mode. One of
     * allow: Allow sites to toggle the fullscreen mode,
     * ask: Ask when a site wants to toggle the fullscreen mode.
     * Default is ask.
     * The primary URL is the URL of the document which requested to toggle the fullscreen mode. The secondary URL is the URL of the top-level frame (which may or may not differ from the requesting URL).
     */
    var fullscreen: ContentSetting;
    /**
     * Since Chrome 42.
     * Whether to allow sites to disable the mouse cursor. One of
     * allow: Allow sites to disable the mouse cursor,
     * block: Don't allow sites to disable the mouse cursor,
     * ask: Ask when a site wants to disable the mouse cursor.
     * Default is ask.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var mouselock: ContentSetting;
    /**
     * Since Chrome 42.
     * Whether to allow sites to run plugins unsandboxed. One of
     * allow: Allow sites to run plugins unsandboxed,
     * block: Don't allow sites to run plugins unsandboxed,
     * ask: Ask when a site wants to run a plugin unsandboxed.
     * Default is ask.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var unsandboxedPlugins: ContentSetting;
    /**
     * Since Chrome 42.
     * Whether to allow sites to download multiple files automatically. One of
     * allow: Allow sites to download multiple files automatically,
     * block: Don't allow sites to download multiple files automatically,
     * ask: Ask when a site wants to download files automatically after the first file.
     * Default is ask.
     * The primary URL is the URL of the top-level frame. The secondary URL is not used.
     */
    var automaticDownloads: ContentSetting;
}

////////////////////
// Events
////////////////////
/**
 * The chrome.events namespace contains common types used by APIs dispatching events to notify you when something interesting happens.
 * Availability: Since Chrome 21.
 */
declare namespace chrome.events {
    /** Filters URLs for various criteria. See event filtering. All criteria are case sensitive. */
    interface UrlFilter {
        /** Optional. Matches if the scheme of the URL is equal to any of the schemes specified in the array.  */
        schemes?: string[];
        /**
         * Optional.
          * Since Chrome 23.
         * Matches if the URL (without fragment identifier) matches a specified regular expression. Port numbers are stripped from the URL if they match the default port number. The regular expressions use the RE2 syntax.
         */
        urlMatches?: string;
        /** Optional. Matches if the path segment of the URL contains a specified string.  */
        pathContains?: string;
        /** Optional. Matches if the host name of the URL ends with a specified string.  */
        hostSuffix?: string;
        /** Optional. Matches if the host name of the URL starts with a specified string.  */
        hostPrefix?: string;
        /** Optional. Matches if the host name of the URL contains a specified string. To test whether a host name component has a prefix 'foo', use hostContains: '.foo'. This matches 'www.foobar.com' and 'foo.com', because an implicit dot is added at the beginning of the host name. Similarly, hostContains can be used to match against component suffix ('foo.') and to exactly match against components ('.foo.'). Suffix- and exact-matching for the last components need to be done separately using hostSuffix, because no implicit dot is added at the end of the host name.  */
        hostContains?: string;
        /** Optional. Matches if the URL (without fragment identifier) contains a specified string. Port numbers are stripped from the URL if they match the default port number.  */
        urlContains?: string;
        /** Optional. Matches if the query segment of the URL ends with a specified string.  */
        querySuffix?: string;
        /** Optional. Matches if the URL (without fragment identifier) starts with a specified string. Port numbers are stripped from the URL if they match the default port number.  */
        urlPrefix?: string;
        /** Optional. Matches if the host name of the URL is equal to a specified string.  */
        hostEquals?: string;
        /** Optional. Matches if the URL (without fragment identifier) is equal to a specified string. Port numbers are stripped from the URL if they match the default port number.  */
        urlEquals?: string;
        /** Optional. Matches if the query segment of the URL contains a specified string.  */
        queryContains?: string;
        /** Optional. Matches if the path segment of the URL starts with a specified string.  */
        pathPrefix?: string;
        /** Optional. Matches if the path segment of the URL is equal to a specified string.  */
        pathEquals?: string;
        /** Optional. Matches if the path segment of the URL ends with a specified string.  */
        pathSuffix?: string;
        /** Optional. Matches if the query segment of the URL is equal to a specified string.  */
        queryEquals?: string;
        /** Optional. Matches if the query segment of the URL starts with a specified string.  */
        queryPrefix?: string;
        /** Optional. Matches if the URL (without fragment identifier) ends with a specified string. Port numbers are stripped from the URL if they match the default port number.  */
        urlSuffix?: string;
        /** Optional. Matches if the port of the URL is contained in any of the specified port lists. For example [80, 443, [1000, 1200]] matches all requests on port 80, 443 and in the range 1000-1200.  */
        ports?: any[];
        /**
         * Optional.
          * Since Chrome 28.
         * Matches if the URL without query segment and fragment identifier matches a specified regular expression. Port numbers are stripped from the URL if they match the default port number. The regular expressions use the RE2 syntax.
         */
        originAndPathMatches?: string;
    }

    /** An object which allows the addition and removal of listeners for a Chrome event. */
    interface Event<T extends Function> {
        /**
         * Registers an event listener callback to an event.
         * @param callback Called when an event occurs. The parameters of this function depend on the type of event.
         * The callback parameter should be a function that looks like this:
         * function() {...};
         */
        addListener(callback: T): 1;
        /**
         * Returns currently registered rules.
         * @param callback Called with registered rules.
         * The callback parameter should be a function that looks like this:
         * function(array of Rule rules) {...};
         * Parameter rules: Rules that were registered, the optional parameters are filled with values.
         */
        getRules(callback: (rules: Rule[]) => void): 1;
        /**
         * Returns currently registered rules.
         * @param ruleIdentifiers If an array is passed, only rules with identifiers contained in this array are returned.
         * @param callback Called with registered rules.
         * The callback parameter should be a function that looks like this:
         * function(array of Rule rules) {...};
         * Parameter rules: Rules that were registered, the optional parameters are filled with values.
         */
        getRules(ruleIdentifiers: string[], callback: (rules: Rule[]) => void): 1;
        /**
         * @param callback Listener whose registration status shall be tested.
         */
        hasListener(callback: T): boolean;
        /**
         * Unregisters currently registered rules.
         * @param ruleIdentifiers If an array is passed, only rules with identifiers contained in this array are unregistered.
         * @param callback Called when rules were unregistered.
         * If you specify the callback parameter, it should be a function that looks like this:
         * function() {...};
         */
        removeRules(ruleIdentifiers?: string[], callback?: () => void): 1;
        /**
         * Unregisters currently registered rules.
         * @param callback Called when rules were unregistered.
         * If you specify the callback parameter, it should be a function that looks like this:
         * function() {...};
         */
        removeRules(callback?: () => void): 1;
        /**
         * Registers rules to handle events.
         * @param rules Rules to be registered. These do not replace previously registered rules.
         * @param callback Called with registered rules.
         * If you specify the callback parameter, it should be a function that looks like this:
         * function(array of Rule rules) {...};
         * Parameter rules: Rules that were registered, the optional parameters are filled with values.
         */
        addRules(rules: Rule[], callback?: (rules: Rule[]) => void): 1;
        /**
         * Deregisters an event listener callback from an event.
         * @param callback Listener that shall be unregistered.
         * The callback parameter should be a function that looks like this:
         * function() {...};
         */
        removeListener(callback: T): 1;
        hasListeners(): boolean;
    }

    /** Description of a declarative rule for handling events. */
    interface Rule {
        /** Optional. Optional priority of this rule. Defaults to 100.  */
        priority?: number;
        /** List of conditions that can trigger the actions. */
        conditions: any[];
        /** Optional. Optional identifier that allows referencing this rule.  */
        id?: string;
        /** List of actions that are triggered if one of the condtions is fulfilled. */
        actions: any[];
        /**
         * Optional.
          * Since Chrome 28.
         * Tags can be used to annotate rules and perform operations on sets of rules.
         */
        tags?: string[];
    }
}

////////////////////
// Extension
////////////////////
/**
 * The chrome.extension API has utilities that can be used by any extension page. It includes support for exchanging messages between an extension and its content scripts or between extensions, as described in detail in Message Passing.
 * Availability: Since Chrome 5.
 */
declare namespace chrome.extension {
    interface FetchProperties {
        /** Optional. The window to restrict the search to. If omitted, returns all views.  */
        windowId?: number;
        /** Optional. The type of view to get. If omitted, returns all views (including background pages and tabs). Valid values: 'tab', 'notification', 'popup'.  */
        type?: string;
    }

    interface LastError {
        /** Description of the error that has taken place. */
        message: string;
    }

    interface OnRequestEvent extends chrome.events.Event<((request: any, sender: runtime.MessageSender, sendResponse: (response: any) => void) => void) | ((sender: runtime.MessageSender, sendResponse: (response: any) => void) => void)> {}

    /**
     * Since Chrome 7.
     * True for content scripts running inside incognito tabs, and for extension pages running inside an incognito process. The latter only applies to extensions with 'split' incognito_behavior.
     */
    var inIncognitoContext: boolean;
    /** Set for the lifetime of a callback if an ansychronous extension api has resulted in an error. If no error has occured lastError will be undefined. */
    var lastError: LastError;

    /** Returns the JavaScript 'window' object for the background page running inside the current extension. Returns null if the extension has no background page. */
    export function getBackgroundPage(): Window | null;
    /**
     * Converts a relative path within an extension install directory to a fully-qualified URL.
     * @param path A path to a resource within an extension expressed relative to its install directory.
     */
    export function getURL(path: string): string;
    /**
     * Sets the value of the ap CGI parameter used in the extension's update URL. This value is ignored for extensions that are hosted in the Chrome Extension Gallery.
     * Since Chrome 9.
     */
    export function setUpdateUrlData(data: string): 1;
    /** Returns an array of the JavaScript 'window' objects for each of the pages running inside the current extension. */
    export function getViews(fetchProperties?: FetchProperties): Window[];
    /**
     * Retrieves the state of the extension's access to the 'file://' scheme (as determined by the user-controlled 'Allow access to File URLs' checkbox.
     * Since Chrome 12.
     * @param callback The callback parameter should be a function that looks like this:
     * function(boolean isAllowedAccess) {...};
     * Parameter isAllowedAccess: True if the extension can access the 'file://' scheme, false otherwise.
     */
    export function isAllowedFileSchemeAccess(callback: (isAllowedAccess: boolean) => void): 1;
    /**
     * Retrieves the state of the extension's access to Incognito-mode (as determined by the user-controlled 'Allowed in Incognito' checkbox.
     * Since Chrome 12.
     * @param callback The callback parameter should be a function that looks like this:
     * function(boolean isAllowedAccess) {...};
     * Parameter isAllowedAccess: True if the extension has access to Incognito mode, false otherwise.
     */
    export function isAllowedIncognitoAccess(callback: (isAllowedAccess: boolean) => void): 1;
    /**
     * Sends a single request to other listeners within the extension. Similar to runtime.connect, but only sends a single request with an optional response. The extension.onRequest event is fired in each page of the extension.
     * @deprecated Deprecated since Chrome 33. Please use runtime.sendMessage.
     * @param extensionId The extension ID of the extension you want to connect to. If omitted, default is your own extension.
     * @param responseCallback If you specify the responseCallback parameter, it should be a function that looks like this:
     * function(any response) {...};
     * Parameter response: The JSON response object sent by the handler of the request. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendRequest(extensionId: string, request: any, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single request to other listeners within the extension. Similar to runtime.connect, but only sends a single request with an optional response. The extension.onRequest event is fired in each page of the extension.
     * @deprecated Deprecated since Chrome 33. Please use runtime.sendMessage.
     * @param responseCallback If you specify the responseCallback parameter, it should be a function that looks like this:
     * function(any response) {...};
     * Parameter response: The JSON response object sent by the handler of the request. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendRequest(request: any, responseCallback?: (response: any) => void): 1;
    /**
     * Returns an array of the JavaScript 'window' objects for each of the tabs running inside the current extension. If windowId is specified, returns only the 'window' objects of tabs attached to the specified window.
     * @deprecated Deprecated since Chrome 33. Please use extension.getViews {type: "tab"}.
     */
    export function getExtensionTabs(windowId?: number): Window[];

    /**
     * Fired when a request is sent from either an extension process or a content script.
     * @deprecated Deprecated since Chrome 33. Please use runtime.onMessage.
     */
    var onRequest: OnRequestEvent;
    /**
     * Fired when a request is sent from another extension.
     * @deprecated Deprecated since Chrome 33. Please use runtime.onMessageExternal.
     */
    var onRequestExternal: OnRequestEvent;
}

////////////////////
// History
////////////////////
/**
 * Use the chrome.history API to interact with the browser's record of visited pages. You can add, remove, and query for URLs in the browser's history. To override the history page with your own version, see Override Pages.
 * Availability: Since Chrome 5.
 * Permissions:  "history"
 */
declare namespace chrome.history {
    /** An object encapsulating one visit to a URL. */
    interface VisitItem {
        /** The transition type for this visit from its referrer. */
        transition: string;
        /** Optional. When this visit occurred, represented in milliseconds since the epoch. */
        visitTime?: number;
        /** The unique identifier for this visit. */
        visitId: string;
        /** The visit ID of the referrer. */
        referringVisitId: string;
        /** The unique identifier for the item. */
        id: string;
    }

    /** An object encapsulating one result of a history query. */
    interface HistoryItem {
        /** Optional. The number of times the user has navigated to this page by typing in the address. */
        typedCount?: number;
        /** Optional. The title of the page when it was last loaded. */
        title: string;
        /** Optional. The URL navigated to by a user. */
        url: string;
        /** Optional. When this page was last loaded, represented in milliseconds since the epoch. */
        lastVisitTime: number;
        /** Optional. The number of times the user has navigated to this page. */
        visitCount?: number;
        /** The unique identifier for the item. */
        id: string;
    }

    interface HistoryQuery {
        /** A free-text query to the history service. Leave empty to retrieve all pages. */
        text: string;
        /** Optional. The maximum number of results to retrieve. Defaults to 100. */
        maxResults?: number;
        /** Optional. Limit results to those visited after this date, represented in milliseconds since the epoch. */
        startTime?: number;
        /** Optional. Limit results to those visited before this date, represented in milliseconds since the epoch. */
        endTime?: number;
    }

    interface Url {
        /** The URL for the operation. It must be in the format as returned from a call to history.search. */
        url: string;
    }

    interface Range {
        /** Items added to history before this date, represented in milliseconds since the epoch. */
        endTime: number;
        /** Items added to history after this date, represented in milliseconds since the epoch. */
        startTime: number;
    }

    interface RemovedBaseResult {
        allHistory?: boolean;
        urls: string[];
    }
    interface RemovedUrlsResult extends RemovedBaseResult {
        allHistory?: false;
        urls: string[];
    }
    interface AllRemovedResult extends RemovedBaseResult {
        /** True if all history was removed. If true, then urls will be empty. */
        allHistory: true;
        urls: never[];
    }

    type RemovedResult = RemovedUrlsResult | AllRemovedResult;

    interface HistoryVisitedEvent extends chrome.events.Event<(result: HistoryItem) => void> {}

    interface HistoryVisitRemovedEvent extends chrome.events.Event<(removed: RemovedResult) => void> {}

    /**
     * Searches the history for the last visit time of each page matching the query.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of HistoryItem results) {...};
     */
    export function search(query: HistoryQuery, callback: (results: HistoryItem[]) => void): 1;
    /**
     * Adds a URL to the history at the current time with a transition type of "link".
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function() {...};
     */
    export function addUrl(details: Url, callback?: () => void): 1;
    /**
     * Removes all items within the specified date range from the history. Pages will not be removed from the history unless all visits fall within the range.
     * @param callback The callback parameter should be a function that looks like this:
     * function() {...};
     */
    export function deleteRange(range: Range, callback: () => void): 1;
    /**
     * Deletes all items from the history.
     * @param callback The callback parameter should be a function that looks like this:
     * function() {...};
     */
    export function deleteAll(callback: () => void): 1;
    /**
     * Retrieves information about visits to a URL.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of VisitItem results) {...};
     */
    export function getVisits(details: Url, callback: (results: VisitItem[]) => void): 1;
    /**
     * Removes all occurrences of the given URL from the history.
     * @param callback If you specify the callback parameter, it should be a function that looks like this:
     * function() {...};
     */
    export function deleteUrl(details: Url, callback?: () => void): 1;

    /** Fired when a URL is visited, providing the HistoryItem data for that URL. This event fires before the page has loaded. */
    var onVisited: HistoryVisitedEvent;
    /** Fired when one or more URLs are removed from the history service. When all visits have been removed the URL is purged from history. */
    var onVisitRemoved: HistoryVisitRemovedEvent;
}

////////////////////
// i18n
////////////////////
/**
 * Use the chrome.i18n infrastructure to implement internationalization across your whole app or extension.
 * @since Chrome 5.
 */
declare namespace chrome.i18n {
    /**
     * Gets the accept-languages of the browser. This is different from the locale used by the browser; to get the locale, use i18n.getUILanguage.
     * @param callback The callback parameter should be a function that looks like this:
     * function(array of string languages) {...};
     * Parameter languages: Array of the accept languages of the browser, such as en-US,en,zh-CN
     */
    export function getAcceptLanguages(callback: (languages: string[]) => void): 1;
    /**
     * Gets the localized string for the specified message. If the message is missing, this method returns an empty string (''). If the format of the getMessage() call is wrong — for example, messageName is not a string or the substitutions array has more than 9 elements — this method returns undefined.
     * @param messageName The name of the message, as specified in the messages.json file.
     * @param substitutions Optional. Up to 9 substitution strings, if the message requires any.
     */
    export function getMessage(messageName: string, substitutions?: any): string;
    /**
     * Gets the browser UI language of the browser. This is different from i18n.getAcceptLanguages which returns the preferred user languages.
     * @since Chrome 35.
     */
    export function getUILanguage(): string;
}

////////////////////
// Notifications
// https://developer.chrome.com/extensions/notifications
////////////////////
/**
 * Use the chrome.notifications API to create rich notifications using templates and show these notifications to users in the system tray.
 * Permissions:  "notifications"
 * @since Chrome 28.
 */
declare namespace chrome.notifications {
    interface ButtonOptions {
        title: string;
        iconUrl?: string;
    }

    interface ItemOptions {
        /** Title of one item of a list notification. */
        title: string;
        /** Additional details about this item. */
        message: string;
    }

    interface NotificationOptions {
        /** Optional. Which type of notification to display. Required for notifications.create method. */
        type?: string;
        /**
         * Optional.
         * A URL to the sender's avatar, app icon, or a thumbnail for image notifications.
         * URLs can be a data URL, a blob URL, or a URL relative to a resource within this extension's .crx file Required for notifications.create method.
         */
        iconUrl?: string;
        /** Optional. Title of the notification (e.g. sender name for email). Required for notifications.create method. */
        title?: string;
        /** Optional. Main notification content. Required for notifications.create method. */
        message?: string;
        /**
         * Optional.
         * Alternate notification content with a lower-weight font.
         * @since Chrome 31.
         */
        contextMessage?: string;
        /** Optional. Priority ranges from -2 to 2. -2 is lowest priority. 2 is highest. Zero is default. */
        priority?: number;
        /** Optional. A timestamp associated with the notification, in milliseconds past the epoch (e.g. Date.now() + n). */
        eventTime?: number;
        /** Optional. Text and icons for up to two notification action buttons. */
        buttons?: ButtonOptions[];
        /** Optional. Items for multi-item notifications. */
        items?: ItemOptions[];
        /**
         * Optional.
         * Current progress ranges from 0 to 100.
         * @since Chrome 30.
         */
        progress?: number;
        /**
         * Optional.
         * Whether to show UI indicating that the app will visibly respond to clicks on the body of a notification.
         * @since Chrome 32.
         */
        isClickable?: boolean;
        /**
         * Optional.
         * A URL to the app icon mask. URLs have the same restrictions as iconUrl. The app icon mask should be in alpha channel, as only the alpha channel of the image will be considered.
         * @since Chrome 38.
         */
        appIconMaskUrl?: string;
        /** Optional. A URL to the image thumbnail for image-type notifications. URLs have the same restrictions as iconUrl. */
        imageUrl?: string;
    }

    interface NotificationClosedEvent extends chrome.events.Event<(notificationId: string, byUser: boolean) => void> {}

    interface NotificationClickedEvent extends chrome.events.Event<(notificationId: string) => void> {}

    interface NotificationButtonClickedEvent extends chrome.events.Event<(notificationId: string, buttonIndex: number) => void> {}

    interface NotificationPermissionLevelChangedEvent extends chrome.events.Event<(level: string) => void> {}

    interface NotificationShowSettingsEvent extends chrome.events.Event<() => void> {}

    /** The notification closed, either by the system or by user action. */
    export var onClosed: NotificationClosedEvent;
    /** The user clicked in a non-button area of the notification. */
    export var onClicked: NotificationClickedEvent;
    /** The user pressed a button in the notification. */
    export var onButtonClicked: NotificationButtonClickedEvent;
    /**
     * The user changes the permission level.
     * @since Chrome 32.
     */
    export var onPermissionLevelChanged: NotificationPermissionLevelChangedEvent;
    /**
     * The user clicked on a link for the app's notification settings.
     * @since Chrome 32.
     */
    export var onShowSettings: NotificationShowSettingsEvent;

    /**
     * Creates and displays a notification.
     * @param notificationId Identifier of the notification. If not set or empty, an ID will automatically be generated. If it matches an existing notification, this method first clears that notification before proceeding with the create operation.
     * The notificationId parameter is required before Chrome 42.
     * @param options Contents of the notification.
     * @param callback Returns the notification id (either supplied or generated) that represents the created notification.
     * The callback is required before Chrome 42.
     * If you specify the callback parameter, it should be a function that looks like this:
     * function(string notificationId) {...};
     */
    export function create(notificationId: string, options: NotificationOptions, callback?: (notificationId: string) => void): 1;
    /**
     * Creates and displays a notification.
     * @param notificationId Identifier of the notification. If not set or empty, an ID will automatically be generated. If it matches an existing notification, this method first clears that notification before proceeding with the create operation.
     * The notificationId parameter is required before Chrome 42.
     * @param options Contents of the notification.
     * @param callback Returns the notification id (either supplied or generated) that represents the created notification.
     * The callback is required before Chrome 42.
     * If you specify the callback parameter, it should be a function that looks like this:
     * function(string notificationId) {...};
     */
    export function create(options: NotificationOptions, callback?: (notificationId: string) => void): 1;
    /**
     * Updates an existing notification.
     * @param notificationId The id of the notification to be updated. This is returned by notifications.create method.
     * @param options Contents of the notification to update to.
     * @param callback Called to indicate whether a matching notification existed.
     * The callback is required before Chrome 42.
     * If you specify the callback parameter, it should be a function that looks like this:
     * function(boolean wasUpdated) {...};
     */
    export function update(notificationId: string, options: NotificationOptions, callback?: (wasUpdated: boolean) => void): 1;
    /**
     * Clears the specified notification.
     * @param notificationId The id of the notification to be cleared. This is returned by notifications.create method.
     * @param callback Called to indicate whether a matching notification existed.
     * The callback is required before Chrome 42.
     * If you specify the callback parameter, it should be a function that looks like this:
     * function(boolean wasCleared) {...};
     */
    export function clear(notificationId: string, callback?: (wasCleared: boolean) => void): 1;
    /**
     * Retrieves all the notifications.
     * @since Chrome 29.
     * @param callback Returns the set of notification_ids currently in the system.
     * The callback parameter should be a function that looks like this:
     * function(object notifications) {...};
     */
    export function getAll(callback: (notifications: Object) => void): 1;
    /**
     * Retrieves whether the user has enabled notifications from this app or extension.
     * @since Chrome 32.
     * @param callback Returns the current permission level.
     * The callback parameter should be a function that looks like this:
     * function( PermissionLevel level) {...};
     */
    export function getPermissionLevel(callback: (level: string) => void): 1;
}

////////////////////
// Omnibox
////////////////////
/**
 * The omnibox API allows you to register a keyword with Google Chrome's address bar, which is also known as the omnibox.
 * Manifest:  "omnibox": {...}
 * @since Chrome 9.
 */
declare namespace chrome.omnibox {
    /** A suggest result. */
    interface SuggestResult {
        /** The text that is put into the URL bar, and that is sent to the extension when the user chooses this entry. */
        content: string;
        /** The text that is displayed in the URL dropdown. Can contain XML-style markup for styling. The supported tags are 'url' (for a literal URL), 'match' (for highlighting text that matched what the user's query), and 'dim' (for dim helper text). The styles can be nested, eg. dimmed match. You must escape the five predefined entities to display them as text: stackoverflow.com/a/1091953/89484 */
        description: string;
    }

    interface Suggestion {
        /** The text that is displayed in the URL dropdown. Can contain XML-style markup for styling. The supported tags are 'url' (for a literal URL), 'match' (for highlighting text that matched what the user's query), and 'dim' (for dim helper text). The styles can be nested, eg. dimmed match. */
        description: string;
    }

    interface OmniboxInputEnteredEvent extends chrome.events.Event<(text: string) => void> {}

    interface OmniboxInputChangedEvent extends chrome.events.Event<(text: string, suggest: (suggestResults: SuggestResult[]) => void) => void> {}

    interface OmniboxInputStartedEvent extends chrome.events.Event<() => void> {}

    interface OmniboxInputCancelledEvent extends chrome.events.Event<() => void> {}

    /**
     * Sets the description and styling for the default suggestion. The default suggestion is the text that is displayed in the first suggestion row underneath the URL bar.
     * @param suggestion A partial SuggestResult object, without the 'content' parameter.
     */
    export function setDefaultSuggestion(suggestion: Suggestion): 1;

    /** User has accepted what is typed into the omnibox. */
    var onInputEntered: OmniboxInputEnteredEvent;
    /** User has changed what is typed into the omnibox. */
    var onInputChanged: OmniboxInputChangedEvent;
    /** User has started a keyword input session by typing the extension's keyword. This is guaranteed to be sent exactly once per input session, and before any onInputChanged events. */
    var onInputStarted: OmniboxInputStartedEvent;
    /** User has ended the keyword input session without accepting the input. */
    var onInputCancelled: OmniboxInputCancelledEvent;
}

////////////////////
// Runtime
////////////////////
/**
 * Use the chrome.runtime API to retrieve the background page, return details about the manifest, and listen for and respond to events in the app or extension lifecycle. You can also use this API to convert the relative path of URLs to fully-qualified URLs.
 * @since Chrome 22
 */
declare namespace chrome.runtime {
    var PlatformOs: {
        MAC: "mac"
    } | undefined;
    /** This will be defined during an API method callback if there was an error */
    var lastError: void;
    /** The ID of the extension/app. */
    var id: string;

    interface LastError {
        /** Optional. Details about the error which occurred.  */
        message?: string;
    }

    interface ConnectInfo {
        name?: string;
    }

    interface InstalledDetails {
        /**
         * The reason that this event is being dispatched.
         * One of: "install", "update", "chrome_update", or "shared_module_update"
         */
        reason: string;
        /**
         * Optional.
         * Indicates the previous version of the extension, which has just been updated. This is present only if 'reason' is 'update'.
         */
        previousVersion?: string;
        /**
         * Optional.
         * Indicates the ID of the imported shared module extension which updated. This is present only if 'reason' is 'shared_module_update'.
         * @since Chrome 29.
         */
        id?: string;
    }

    interface MessageOptions {
        /** Whether the TLS channel ID will be passed into onMessageExternal for processes that are listening for the connection event. */
        includeTlsChannelId?: boolean;
    }

    /**
     * An object containing information about the script context that sent a message or request.
     * @since Chrome 26.
     */
    interface MessageSender {
        /** The ID of the extension or app that opened the connection, if any. */
        id?: string;
        /** The tabs.Tab which opened the connection, if any. This property will only be present when the connection was opened from a tab (including content scripts), and only if the receiver is an extension, not an app. */
        tab?: chrome.tabs.Tab;
        /**
         * The frame that opened the connection. 0 for top-level frames, positive for child frames. This will only be set when tab is set.
         * @since Chrome 41.
         */
        frameId?: number;
        /**
         * The URL of the page or frame that opened the connection. If the sender is in an iframe, it will be iframe's URL not the URL of the page which hosts it.
         * @since Chrome 28.
         */
        url: string;
        /**
         * The TLS channel ID of the page or frame that opened the connection, if requested by the extension or app, and if available.
         * @since Chrome 32.
         */
        tlsChannelId?: string;
    }

    /**
     * An object containing information about the current platform.
     * @since Chrome 36.
     */
    interface PlatformInfo {
        /**
         * The operating system chrome is running on.
         * One of: "mac", "win", "android", "cros", "linux", or "openbsd"
         */
        os: string;
        /**
         * The machine's processor architecture.
         * One of: "arm", "x86-32", or "x86-64"
         */
        arch: string;
        /**
         * The native client architecture. This may be different from arch on some platforms.
         * One of: "arm", "x86-32", or "x86-64"
         */
        nacl_arch: string;
    }

    /**
     * An object which allows two way communication with other pages.
     * @since Chrome 26.
     */
    interface Port {
        // postMessage: (message: Object) => void;
        disconnect: () => void;
        /**
         * Optional.
         * This property will only be present on ports passed to onConnect/onConnectExternal listeners.
         */
        sender: MessageSender;
        /** An object which allows the addition and removal of listeners for a Chrome event. */
        onDisconnect: PortDisconnectEvent;
        /** An object which allows the addition and removal of listeners for a Chrome event. */
        onMessage: PortMessageEvent;
        name: string;
    }

    interface UpdateAvailableDetails {
        /** The version number of the available update. */
        version: string;
    }

    interface UpdateCheckDetails {
        /** The version of the available update. */
        version: string;
    }

    interface PortDisconnectEvent extends chrome.events.Event<(port: Port) => void> {}

    interface PortMessageEvent extends chrome.events.Event<(message: Object, port: Port) => void> {}

    interface ExtensionMessageEvent extends chrome.events.Event<(message: any, sender: MessageSender, sendResponse: (response: any) => void) => void> {}

    interface ExtensionConnectEvent extends chrome.events.Event<(port: Port) => void> {}

    interface RuntimeInstalledEvent extends chrome.events.Event<(details: InstalledDetails) => void> {}

    interface RuntimeEvent extends chrome.events.Event<() => void> {}

    interface RuntimeRestartRequiredEvent extends chrome.events.Event<(reason: string) => void> {}

    interface RuntimeUpdateAvailableEvent extends chrome.events.Event<(details: UpdateAvailableDetails) => void> {}

    interface ManifestIcons {
        [size: number]: string;
    }

    interface ManifestAction {
        default_icon?: ManifestIcons;
        default_title?: string;
        default_popup?: string;
    }

    interface SearchProvider {
        name?: string;
        keyword?: string;
        favicon_url?: string;
        search_url: string;
        encoding?: string;
        suggest_url?: string;
        instant_url?: string;
        image_url?: string;
        search_url_post_params?: string;
        suggest_url_post_params?: string;
        instant_url_post_params?: string;
        image_url_post_params?: string;
        alternate_urls?: string[];
        prepopulated_id?: number;
        is_default?: boolean;
    }

    interface Manifest {
        // Required
        manifest_version: number;
        name: string;
        version: string;

        // Recommended
        default_locale?: string;
        description?: string;
        icons?: ManifestIcons;

        // Pick one (or none)
        browser_action?: ManifestAction;
        page_action?: ManifestAction;

        // Optional
        author?: any;
        automation?: any;
        background: {
            scripts?: string[];
            page?: string;
            persistent?: boolean;
        };
        background_page?: string;
        chrome_settings_overrides?: {
            homepage?: string;
            search_provider?: SearchProvider;
            startup_pages?: string[];
        };
        chrome_ui_overrides?: {
            bookmarks_ui?: {
                remove_bookmark_shortcut?: boolean;
                remove_button?: boolean;
            }
        };
        chrome_url_overrides?: {
            bookmarks?: string;
            history?: string;
            newtab?: string;
        };
        commands?: {
            [name: string]: {
                suggested_key?: {
                    default?: string;
                    windows?: string;
                    mac?: string;
                    chromeos?: string;
                    linux?: string;
                };
                description?: string;
                global?: boolean
            }
        };
        content_capabilities?: {
            matches?: string[];
            permissions?: string[];
        };
        content_scripts: {
            matches: string[];
            exclude_matches?: string[];
            css?: string[];
            js: string[];
            run_at?: string;
            all_frames?: boolean;
            include_globs?: string[];
            exclude_globs?: string[];
        }[];
        content_security_policy?: string;
        converted_from_user_script?: boolean;
        copresence?: any;
        current_locale?: string;
        devtools_page?: string;
        event_rules?: {
            event?: string;
            actions?: {
                type: string;
            }[];
            conditions?: any[]
        }[];
        externally_connectable?: {
            ids?: string[];
            matches?: string[];
            accepts_tls_channel_id?: boolean;
        };
        file_browser_handlers?: {
            id?: string;
            default_title?: string;
            file_filters?: string[];
        }[];
        file_system_provider_capabilities?: {
            configurable?: boolean;
            watchable?: boolean;
            multiple_mounts?: boolean;
            source?: string;
        };
        homepage_url?: string;
        import?: {
            id: string;
            minimum_version?: string
        }[];
        export?: {
            whitelist?: string[]
        };
        incognito?: string;
        input_components?: {
            name?: string;
            type?: string;
            id?: string;
            description?: string;
            language?: string;
            layouts?: any[];
        }[];
        key?: string;
        minimum_chrome_version?: string;
        nacl_modules?: {
            path: string;
            mime_type: string;
        }[];
        oauth2?: {
            client_id: string;
            scopes?: string[];
        };
        offline_enabled?: boolean;
        omnibox?: {
            keyword: string;
        };
        optional_permissions?: string[];
        options_page?: string;
        options_ui?: {
            page?: string;
            chrome_style?: boolean;
            open_in_tab?: boolean;
        };
        permissions?: string[];
        platforms?: {
            nacl_arch?: string;
            sub_package_path: string;
        }[];
        plugins?: {
            path: string;
        }[];
        requirements?: {
            '3D'?: {
                features?: string[]
            };
            plugins?: {
                npapi?: boolean;
            }
        };
        sandbox?: {
            pages: string[];
            content_security_policy?: string;
        };
        short_name?: string;
        signature?: any;
        spellcheck?: {
            dictionary_language?: string;
            dictionary_locale?: string;
            dictionary_format?: string;
            dictionary_path?: string;
        };
        storage?: {
            managed_schema: string
        };
        system_indicator?: any;
        tts_engine?: {
            voices: {
                voice_name: string;
                lang?: string;
                gender?: string;
                event_types?: string[];
            }[]
        };
        update_url?: string;
        version_name?: string;
        web_accessible_resources?: string[];
        [key: string]: any;
    }

    /**
     * Attempts to connect to connect listeners within an extension/app (such as the background page), or other extensions/apps. This is useful for content scripts connecting to their extension processes, inter-app/extension communication, and web messaging. Note that this does not connect to any listeners in a content script. Extensions may connect to content scripts embedded in tabs via tabs.connect.
     * @since Chrome 26.
     */
    export function connect(connectInfo?: ConnectInfo): Port;
    /**
     * Attempts to connect to connect listeners within an extension/app (such as the background page), or other extensions/apps. This is useful for content scripts connecting to their extension processes, inter-app/extension communication, and web messaging. Note that this does not connect to any listeners in a content script. Extensions may connect to content scripts embedded in tabs via tabs.connect.
     * @since Chrome 26.
     * @param extensionId Optional.
     * The ID of the extension or app to connect to. If omitted, a connection will be attempted with your own extension. Required if sending messages from a web page for web messaging.
     */
    export function connect(extensionId: string, connectInfo?: ConnectInfo): Port;
    /**
     * Connects to a native application in the host machine.
     * @since Chrome 28.
     * @param application The name of the registered application to connect to.
     */
    export function connectNative(application: string): Port;
    /** Retrieves the JavaScript 'window' object for the background page running inside the current extension/app. If the background page is an event page, the system will ensure it is loaded before calling the callback. If there is no background page, an error is set. */
    export function getBackgroundPage(callback: (backgroundPage?: Window) => void): 1;
    /**
     * Returns details about the app or extension from the manifest. The object returned is a serialization of the full manifest file.
     * @returns The manifest details.
     */
    export function getManifest(): Manifest;
    /**
     * Returns a DirectoryEntry for the package directory.
     * @since Chrome 29.
     */
    export function getPackageDirectoryEntry(callback: (directoryEntry: any) => void): 1;
    /**
     * Returns information about the current platform.
     * @since Chrome 29.
     * @param callback Called with results
     */
    export function getPlatformInfo(callback: (platformInfo: PlatformInfo) => void): 1;
    /**
     * Converts a relative path within an app/extension install directory to a fully-qualified URL.
     * @param path A path to a resource within an app/extension expressed relative to its install directory.
     */
    export function getURL(path: string): string;
    /**
     * Reloads the app or extension.
     * @since Chrome 25.
     */
    export function reload(): 1;
    /**
     * Requests an update check for this app/extension.
     * @since Chrome 25.
     * @param callback
     * Parameter status: Result of the update check. One of: "throttled", "no_update", or "update_available"
     * Optional parameter details: If an update is available, this contains more information about the available update.
     */
    export function requestUpdateCheck(callback: (status: string, details?: UpdateCheckDetails) => void): 1;
    /**
     * Restart the ChromeOS device when the app runs in kiosk mode. Otherwise, it's no-op.
     * @since Chrome 32.
     */
    export function restart(): 1;
    /**
     * Sends a single message to event listeners within your extension/app or a different extension/app. Similar to runtime.connect but only sends a single message, with an optional response. If sending to your extension, the runtime.onMessage event will be fired in each page, or runtime.onMessageExternal, if a different extension. Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
     * @since Chrome 26.
     * @param responseCallback Optional
     * Parameter response: The JSON response object sent by the handler of the message. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendMessage(message: any, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single message to event listeners within your extension/app or a different extension/app. Similar to runtime.connect but only sends a single message, with an optional response. If sending to your extension, the runtime.onMessage event will be fired in each page, or runtime.onMessageExternal, if a different extension. Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
     * @since Chrome 32.
     * @param responseCallback Optional
     * Parameter response: The JSON response object sent by the handler of the message. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendMessage(message: any, options: MessageOptions, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single message to event listeners within your extension/app or a different extension/app. Similar to runtime.connect but only sends a single message, with an optional response. If sending to your extension, the runtime.onMessage event will be fired in each page, or runtime.onMessageExternal, if a different extension. Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
     * @since Chrome 26.
     * @param extensionId The ID of the extension/app to send the message to. If omitted, the message will be sent to your own extension/app. Required if sending messages from a web page for web messaging.
     * @param responseCallback Optional
     * Parameter response: The JSON response object sent by the handler of the message. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendMessage(extensionId: string, message: any, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single message to event listeners within your extension/app or a different extension/app. Similar to runtime.connect but only sends a single message, with an optional response. If sending to your extension, the runtime.onMessage event will be fired in each page, or runtime.onMessageExternal, if a different extension. Note that extensions cannot send messages to content scripts using this method. To send messages to content scripts, use tabs.sendMessage.
     * @since Chrome 32.
     * @param extensionId The ID of the extension/app to send the message to. If omitted, the message will be sent to your own extension/app. Required if sending messages from a web page for web messaging.
     * @param responseCallback Optional
     * Parameter response: The JSON response object sent by the handler of the message. If an error occurs while connecting to the extension, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendMessage(extensionId: string, message: any, options: MessageOptions, responseCallback?: (response: any) => void): 1;
    /**
     * Send a single message to a native application.
     * @since Chrome 28.
     * @param application The of the native messaging host.
     * @param message The message that will be passed to the native messaging host.
     * @param responseCallback Optional.
     * Parameter response: The response message sent by the native messaging host. If an error occurs while connecting to the native messaging host, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendNativeMessage(application: string, message: Object, responseCallback?: (response: any) => void): 1;
    /**
     * Sets the URL to be visited upon uninstallation. This may be used to clean up server-side data, do analytics, and implement surveys. Maximum 255 characters.
     * @since Chrome 41.
     * @param url Since Chrome 34.
     * URL to be opened after the extension is uninstalled. This URL must have an http: or https: scheme. Set an empty string to not open a new tab upon uninstallation.
     * @param callback Called when the uninstall URL is set. If the given URL is invalid, runtime.lastError will be set.
     */
    export function setUninstallURL(url: string, callback?: () => void): 1;
    /**
     * Open your Extension's options page, if possible.
     * The precise behavior may depend on your manifest's options_ui or options_page key, or what Chrome happens to support at the time. For example, the page may be opened in a new tab, within chrome://extensions, within an App, or it may just focus an open options page. It will never cause the caller page to reload.
     * If your Extension does not declare an options page, or Chrome failed to create one for some other reason, the callback will set lastError.
     * @since Chrome 42.
     */
    export function openOptionsPage(callback?: () => void): 1;

    /**
     * Fired when a connection is made from either an extension process or a content script.
     * @since Chrome 26.
     */
    var onConnect: ExtensionConnectEvent;
    /**
     * Fired when a connection is made from another extension.
     * @since Chrome 26.
     */
    var onConnectExternal: ExtensionConnectEvent;
    /** Sent to the event page just before it is unloaded. This gives the extension opportunity to do some clean up. Note that since the page is unloading, any asynchronous operations started while handling this event are not guaranteed to complete. If more activity for the event page occurs before it gets unloaded the onSuspendCanceled event will be sent and the page won't be unloaded. */
    var onSuspend: RuntimeEvent;
    /**
     * Fired when a profile that has this extension installed first starts up. This event is not fired when an incognito profile is started, even if this extension is operating in 'split' incognito mode.
     * @since Chrome 23.
     */
    var onStartup: RuntimeEvent;
    /** Fired when the extension is first installed, when the extension is updated to a new version, and when Chrome is updated to a new version. */
    var onInstalled: RuntimeInstalledEvent;
    /** Sent after onSuspend to indicate that the app won't be unloaded after all. */
    var onSuspendCanceled: RuntimeEvent;
    /**
     * Fired when a message is sent from either an extension process or a content script.
     * @since Chrome 26.
     */
    var onMessage: ExtensionMessageEvent;
    /**
     * Fired when a message is sent from another extension/app. Cannot be used in a content script.
     * @since Chrome 26.
     */
    var onMessageExternal: ExtensionMessageEvent;
    /**
     * Fired when an app or the device that it runs on needs to be restarted. The app should close all its windows at its earliest convenient time to let the restart to happen. If the app does nothing, a restart will be enforced after a 24-hour grace period has passed. Currently, this event is only fired for Chrome OS kiosk apps.
     * @since Chrome 29.
     */
    var onRestartRequired: RuntimeRestartRequiredEvent;
    /**
     * Fired when an update is available, but isn't installed immediately because the app is currently running. If you do nothing, the update will be installed the next time the background page gets unloaded, if you want it to be installed sooner you can explicitly call chrome.runtime.reload(). If your extension is using a persistent background page, the background page of course never gets unloaded, so unless you call chrome.runtime.reload() manually in response to this event the update will not get installed until the next time chrome itself restarts. If no handlers are listening for this event, and your extension has a persistent background page, it behaves as if chrome.runtime.reload() is called in response to this event.
     * @since Chrome 25.
     */
    var onUpdateAvailable: RuntimeUpdateAvailableEvent;
    /**
     * @deprecated since Chrome 33. Please use chrome.runtime.onRestartRequired.
     * Fired when a Chrome update is available, but isn't installed immediately because a browser restart is required.
     */
    var onBrowserUpdateAvailable: RuntimeEvent;
}

////////////////////
// Sessions
////////////////////
/**
 * Use the chrome.sessions API to query and restore tabs and windows from a browsing session.
 * Permissions:  "sessions"
 * @since Chrome 37.
 */
declare namespace chrome.sessions {
    interface Filter {
        /**
         * Optional.
         * The maximum number of entries to be fetched in the requested list. Omit this parameter to fetch the maximum number of entries (sessions.MAX_SESSION_RESULTS).
         */
        maxResults?: number;
    }

    interface Session {
        /** The time when the window or tab was closed or modified, represented in milliseconds since the epoch. */
        lastModified: number;
        /**
         * Optional.
         * The tabs.Tab, if this entry describes a tab. Either this or sessions.Session.window will be set.
         */
        tab?: tabs.Tab & {
            /**
             * Optional. The session ID used to uniquely identify a Tab obtained from the sessions API.
             * @since Chrome 31.
             */
            sessionId?: string;
        };
        /**
         * Optional.
         * The windows.Window, if this entry describes a window. Either this or sessions.Session.tab will be set.
         */
        window?: windows.Window;
    }

    interface Device {
        /** The name of the foreign device. */
        deviceName: string;
        /** A list of open window sessions for the foreign device, sorted from most recently to least recently modified session. */
        sessions: Session[];
    }

    interface SessionChangedEvent extends chrome.events.Event<() => void> {}

    /** The maximum number of sessions.Session that will be included in a requested list. */
    export var MAX_SESSION_RESULTS: number | undefined;

    /**
     * Gets the list of recently closed tabs and/or windows.
     * @param callback
     * Parameter sessions: The list of closed entries in reverse order that they were closed (the most recently closed tab or window will be at index 0). The entries may contain either tabs or windows.
     */
    export function getRecentlyClosed(filter: Filter, callback: (sessions: Session[]) => void): 1;
    /**
     * Gets the list of recently closed tabs and/or windows.
     * @param callback
     * Parameter sessions: The list of closed entries in reverse order that they were closed (the most recently closed tab or window will be at index 0). The entries may contain either tabs or windows.
     */
    export function getRecentlyClosed(callback: (sessions: Session[]) => void): 1;
    /**
     * Retrieves all devices with synced sessions.
     * @param callback
     * Parameter devices: The list of sessions.Device objects for each synced session, sorted in order from device with most recently modified session to device with least recently modified session. tabs.Tab objects are sorted by recency in the windows.Window of the sessions.Session objects.
     */
    export function getDevices(filter: Filter, callback: (devices: Device[]) => void): 1;
    /**
     * Retrieves all devices with synced sessions.
     * @param callback
     * Parameter devices: The list of sessions.Device objects for each synced session, sorted in order from device with most recently modified session to device with least recently modified session. tabs.Tab objects are sorted by recency in the windows.Window of the sessions.Session objects.
     */
    export function getDevices(callback: (devices: Device[]) => void): 1;
    /**
     * Reopens a windows.Window or tabs.Tab, with an optional callback to run when the entry has been restored.
     * @param sessionId Optional.
     * The windows.Window.sessionId, or tabs.Tab.sessionId to restore. If this parameter is not specified, the most recently closed session is restored.
     * @param callback Optional.
     * Parameter restoredSession: A sessions.Session containing the restored windows.Window or tabs.Tab object.
     */
    export function restore(sessionId?: string | null, callback?: (restoredSession: Session) => void): 1;

    /** Fired when recently closed tabs and/or windows are changed. This event does not monitor synced sessions changes. */
    export var onChanged: SessionChangedEvent;
}

////////////////////
// Storage
////////////////////
/**
 * Use the chrome.storage API to store, retrieve, and track changes to user data.
 * Permissions:  "storage"
 * @since Chrome 20.
 */
declare namespace chrome.storage {
    interface StorageArea {
        /**
         * Gets the amount of space (in bytes) being used by one or more items.
         * @param callback Callback with the amount of space being used by storage, or on failure (in which case runtime.lastError will be set).
         * Parameter bytesInUse: Amount of space being used in storage, in bytes.
         */
        getBytesInUse(callback: (bytesInUse: number) => void): 1;
        /**
         * Gets the amount of space (in bytes) being used by one or more items.
         * @param keys A single key or list of keys to get the total usage for. An empty list will return 0. Pass in null to get the total usage of all of storage.
         * @param callback Callback with the amount of space being used by storage, or on failure (in which case runtime.lastError will be set).
         * Parameter bytesInUse: Amount of space being used in storage, in bytes.
         */
        getBytesInUse(keys: string | string[] | null, callback: (bytesInUse: number) => void): 1;
        /**
         * Removes all items from storage.
         * @param callback Optional.
         * Callback on success, or on failure (in which case runtime.lastError will be set).
         */
        clear(callback?: () => void): 1;
        /**
         * Sets multiple items.
         * @param items An object which gives each key/value pair to update storage with. Any other key/value pairs in storage will not be affected.
         * Primitive values such as numbers will serialize as expected. Values with a typeof "object" and "function" will typically serialize to {}, with the exception of Array (serializes as expected), Date, and Regex (serialize using their String representation).
         * @param callback Optional.
         * Callback on success, or on failure (in which case runtime.lastError will be set).
         */
        set(items: Object, callback?: () => void): 1;
        /**
         * Removes one item from storage.
         * @param key A single key for items to remove.
         * @param callback Optional.
         * Callback on success, or on failure (in which case runtime.lastError will be set).
         */
        remove(key: string, callback?: () => void): 1;
        /**
         * Removes items from storage.
         * @param keys A list of keys for items to remove.
         * @param callback Optional.
         * Callback on success, or on failure (in which case runtime.lastError will be set).
         */
        remove(keys: string[], callback?: () => void): 1;
        /**
         * Gets one or more items from storage.
         * @param callback Callback with storage items, or on failure (in which case runtime.lastError will be set).
         * Parameter items: Object with items in their key-value mappings.
         */
        get(callback: (items: { [key: string]: any }) => void): 1;
        /**
         * Gets one or more items from storage.
         * @param keys A single key to get, list of keys to get, or a dictionary specifying default values.
         * An empty list or object will return an empty result object. Pass in null to get the entire contents of storage.
         * @param callback Callback with storage items, or on failure (in which case runtime.lastError will be set).
         * Parameter items: Object with items in their key-value mappings.
         */
        get(keys: string | string[] | Object | null, callback: (items: { [key: string]: any }) => void): 1;
    }

    interface StorageChange {
        /** Optional. The new value of the item, if there is a new value. */
        newValue?: any;
        /** Optional. The old value of the item, if there was an old value. */
        oldValue?: any;
    }

    interface LocalStorageArea extends StorageArea {
        /** The maximum amount (in bytes) of data that can be stored in local storage, as measured by the JSON stringification of every value plus every key's length. This value will be ignored if the extension has the unlimitedStorage permission. Updates that would cause this limit to be exceeded fail immediately and set runtime.lastError. */
        QUOTA_BYTES: number;
    }

    interface SyncStorageArea extends StorageArea {
        /** @deprecated since Chrome 40. The storage.sync API no longer has a sustained write operation quota. */
        MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: number;
        /** The maximum total amount (in bytes) of data that can be stored in sync storage, as measured by the JSON stringification of every value plus every key's length. Updates that would cause this limit to be exceeded fail immediately and set runtime.lastError. */
        QUOTA_BYTES: number;
        /** The maximum size (in bytes) of each individual item in sync storage, as measured by the JSON stringification of its value plus its key length. Updates containing items larger than this limit will fail immediately and set runtime.lastError. */
        QUOTA_BYTES_PER_ITEM: number;
        /** The maximum number of items that can be stored in sync storage. Updates that would cause this limit to be exceeded will fail immediately and set runtime.lastError. */
        MAX_ITEMS: number;
        /**
         * The maximum number of set, remove, or clear operations that can be performed each hour. This is 1 every 2 seconds, a lower ceiling than the short term higher writes-per-minute limit.
         * Updates that would cause this limit to be exceeded fail immediately and set runtime.lastError.
         */
        MAX_WRITE_OPERATIONS_PER_HOUR: number;
        /**
         * The maximum number of set, remove, or clear operations that can be performed each minute. This is 2 per second, providing higher throughput than writes-per-hour over a shorter period of time.
         * Updates that would cause this limit to be exceeded fail immediately and set runtime.lastError.
         * @since Chrome 40.
         */
        MAX_WRITE_OPERATIONS_PER_MINUTE: number;
    }

    interface StorageChangedEvent extends chrome.events.Event<(changes: { [key: string]: StorageChange }, areaName: string) => void> {}

    /** Items in the local storage area are local to each machine. */
    var local: LocalStorageArea;
    /** Items in the sync storage area are synced using Chrome Sync. */
    var sync: SyncStorageArea;

    /**
     * Items in the managed storage area are set by the domain administrator, and are read-only for the extension; trying to modify this namespace results in an error.
     * @since Chrome 33.
     */
    var managed: StorageArea;

    /** Fired when one or more items change. */
    var onChanged: StorageChangedEvent;
}

////////////////////
// Tabs
////////////////////
/**
 * Use the chrome.tabs API to interact with the browser's tab system. You can use this API to create, modify, and rearrange tabs in the browser.
 * Permissions: The majority of the chrome.tabs API can be used without declaring any permission. However, the "tabs" permission is required in order to populate the url, title, and favIconUrl properties of Tab.
 * @since Chrome 5.
 */
declare namespace chrome.tabs {
    var TAB_ID_NONE: -1;
    /**
     * Tab muted state and the reason for the last state change.
     * @since Chrome 46. Warning: this is the current Beta channel.
     */
    interface MutedInfo {
        /** Whether the tab is prevented from playing sound (but hasn't necessarily recently produced sound). Equivalent to whether the muted audio indicator is showing. */
        muted: boolean;
        /**
         * Optional.
         * The reason the tab was muted or unmuted. Not set if the tab's mute state has never been changed.
         * "user": A user input action has set/overridden the muted state.
         * "capture": Tab capture started, forcing a muted state change.
         * "extension": An extension, identified by the extensionId field, set the muted state.
         */
        reason?: string;
        /**
         * Optional.
         * The ID of the extension that changed the muted state. Not set if an extension was not the reason the muted state last changed.
         */
        extensionId?: string;
    }

    interface Tab {
        /**
         * Optional.
         * Either loading or complete.
         */
        status?: string;
        /** The zero-based index of the tab within its window. */
        index: number;
        /**
         * Optional.
         * The ID of the tab that opened this tab, if any. This property is only present if the opener tab still exists.
         * @since Chrome 18.
         */
        openerTabId?: number;
        /**
         * The title of the tab. This property is only present if the extension's manifest includes the "tabs" permission.
         */
        title: string;
        /**
         * The URL the tab is displaying. This property is only present if the extension's manifest includes the "tabs" permission.
         */
        url: string;
        /**
         * Whether the tab is pinned.
         * @since Chrome 9.
         */
        pinned: boolean;
        /**
         * Whether the tab is highlighted.
         * @since Chrome 16.
         */
        highlighted: boolean;
        /** The ID of the window the tab is contained within. */
        windowId: number;
        /**
         * Whether the tab is active in its window. (Does not necessarily mean the window is focused.)
         * @since Chrome 16.
         */
        active: boolean;
        /**
         * The URL of the tab's favicon. This property is only present if the extension's manifest includes the "tabs" permission. It may also be an empty string if the tab is loading.
         */
        favIconUrl: string;
        /**
         * The ID of the tab. Tab IDs are unique within a browser session. Under some circumstances a Tab may not be assigned an ID, for example when querying foreign tabs using the sessions API, in which case a session ID may be present. Tab ID can also be set to chrome.tabs.TAB_ID_NONE for apps and devtools windows.
         */
        id: number;
        /** Whether the tab is in an incognito window. */
        incognito: boolean;
        /**
         * Whether the tab is selected.
         * @deprecated since Chrome 33. Please use tabs.Tab.highlighted.
         */
        selected: boolean;
        /**
         * Whether the tab has produced sound over the past couple of seconds (but it might not be heard if also muted). Equivalent to whether the speaker audio indicator is showing.
         * @since Chrome 45.
         */
        audible: boolean;
        /**
         * Current tab muted state and the reason for the last state change.
         * @since Chrome 46. Warning: this is the current Beta channel.
         */
        mutedInfo: MutedInfo;
        /**
         * Optional. The width of the tab in pixels.
         * @since Chrome 31.
         */
        width?: number;
        /**
         * Optional. The height of the tab in pixels.
         * @since Chrome 31.
         */
        height?: number;
    }

    /**
     * Defines how zoom changes in a tab are handled and at what scope.
     * @since Chrome 38.
     */
    interface ZoomSettings {
        /**
         * Optional.
         * Defines how zoom changes are handled, i.e. which entity is responsible for the actual scaling of the page; defaults to "automatic".
         * "automatic": Zoom changes are handled automatically by the browser.
         * "manual": Overrides the automatic handling of zoom changes. The onZoomChange event will still be dispatched, and it is the responsibility of the extension to listen for this event and manually scale the page. This mode does not support per-origin zooming, and will thus ignore the scope zoom setting and assume per-tab.
         * "disabled": Disables all zooming in the tab. The tab will revert to the default zoom level, and all attempted zoom changes will be ignored.
         */
        mode?: string;
        /**
         * Optional.
         * Defines whether zoom changes will persist for the page's origin, or only take effect in this tab; defaults to per-origin when in automatic mode, and per-tab otherwise.
         * "per-origin": Zoom changes will persist in the zoomed page's origin, i.e. all other tabs navigated to that same origin will be zoomed as well. Moreover, per-origin zoom changes are saved with the origin, meaning that when navigating to other pages in the same origin, they will all be zoomed to the same zoom factor. The per-origin scope is only available in the automatic mode.
         * "per-tab": Zoom changes only take effect in this tab, and zoom changes in other tabs will not affect the zooming of this tab. Also, per-tab zoom changes are reset on navigation; navigating a tab will always load pages with their per-origin zoom factors.
         */
        scope?: string;
        /**
         * Optional.
         * Used to return the default zoom level for the current tab in calls to tabs.getZoomSettings.
         * @since Chrome 43.
         */
        defaultZoomFactor?: number;
    }

    interface InjectDetails {
        /**
         * Optional.
         * If allFrames is true, implies that the JavaScript or CSS should be injected into all frames of current page. By default, it's false and is only injected into the top frame.
         */
        allFrames?: boolean;
        /**
         * Optional. JavaScript or CSS code to inject.
         * Warning: Be careful using the code parameter. Incorrect use of it may open your extension to cross site scripting attacks.
         */
        code?: string;
        /**
         * Optional. The soonest that the JavaScript or CSS will be injected into the tab.
         * One of: "document_start", "document_end", or "document_idle"
         * @since Chrome 20.
         */
        runAt?: string;
        /** Optional. JavaScript or CSS file to inject. */
        file?: string;
        /**
         * Optional.
         * If matchAboutBlank is true, then the code is also injected in about:blank and about:srcdoc frames if your extension has access to its parent document. Code cannot be inserted in top-level about:-frames. By default it is false.
         * @since Chrome 39.
         */
        matchAboutBlank?: boolean;
    }

    interface CreateProperties {
        /** Optional. The position the tab should take in the window. The provided value will be clamped to between zero and the number of tabs in the window. */
        index?: number;
        /**
         * Optional.
         * The ID of the tab that opened this tab. If specified, the opener tab must be in the same window as the newly created tab.
         * @since Chrome 18.
         */
        openerTabId?: number;
        /**
         * Optional.
         * The URL to navigate the tab to initially. Fully-qualified URLs must include a scheme (i.e. 'http://www.google.com', not 'www.google.com'). Relative URLs will be relative to the current page within the extension. Defaults to the New Tab Page.
         */
        url?: string;
        /**
         * Optional. Whether the tab should be pinned. Defaults to false
         * @since Chrome 9.
         */
        pinned?: boolean;
        /** Optional. The window to create the new tab in. Defaults to the current window. */
        windowId?: number;
        /**
         * Optional.
         * Whether the tab should become the active tab in the window. Does not affect whether the window is focused (see windows.update). Defaults to true.
         * @since Chrome 16.
         */
        active?: boolean;
        /**
         * Optional. Whether the tab should become the selected tab in the window. Defaults to true
         * @deprecated since Chrome 33. Please use active.
         */
        selected?: boolean;
    }

    interface MoveProperties {
        /** The position to move the window to. -1 will place the tab at the end of the window. */
        index: number;
        /** Optional. Defaults to the window the tab is currently in. */
        windowId?: number;
    }

    interface UpdateProperties {
        /**
         * Optional. Whether the tab should be pinned.
         * @since Chrome 9.
         */
        pinned?: boolean;
        /**
         * Optional. The ID of the tab that opened this tab. If specified, the opener tab must be in the same window as this tab.
         * @since Chrome 18.
         */
        openerTabId?: number;
        /** Optional. A URL to navigate the tab to. */
        url?: string;
        /**
         * Optional. Adds or removes the tab from the current selection.
         * @since Chrome 16.
         */
        highlighted?: boolean;
        /**
         * Optional. Whether the tab should be active. Does not affect whether the window is focused (see windows.update).
         * @since Chrome 16.
         */
        active?: boolean;
        /**
         * Optional. Whether the tab should be selected.
         * @deprecated since Chrome 33. Please use highlighted.
         */
        selected?: boolean;
        /**
         * Optional. Whether the tab should be muted.
         * @since Chrome 45.
         */
        muted?: boolean;
    }

    interface CaptureVisibleTabOptions {
        /**
         * Optional.
         * When format is "jpeg", controls the quality of the resulting image. This value is ignored for PNG images. As quality is decreased, the resulting image will have more visual artifacts, and the number of bytes needed to store it will decrease.
         */
        quality?: number;
        /**
         * Optional. The format of an image.
         * One of: "jpeg", or "png"
         */
        format?: string;
    }

    interface ReloadProperties {
        /** Optional. Whether using any local cache. Default is false. */
        bypassCache?: boolean;
    }

    interface ConnectInfo {
        /** Optional. Will be passed into onConnect for content scripts that are listening for the connection event. */
        name?: string;
        /**
         * Open a port to a specific frame identified by frameId instead of all frames in the tab.
         * @since Chrome 41.
         */
        frameId?: number;
    }

    interface MessageSendOptions {
        /** Optional. Send a message to a specific frame identified by frameId instead of all frames in the tab. */
        frameId?: number;
    }

    interface HighlightInfo {
        /** One or more tab indices to highlight. */
        tabs: number | number[];
        /** Optional. The window that contains the tabs. */
        windowId?: number;
    }

    interface QueryInfo {
        /**
         * Optional. Whether the tabs have completed loading.
         * One of: "loading", or "complete"
         */
        status?: string;
        /**
         * Optional. Whether the tabs are in the last focused window.
         * @since Chrome 19.
         */
        lastFocusedWindow?: boolean;
        /** Optional. The ID of the parent window, or windows.WINDOW_ID_CURRENT for the current window. */
        windowId?: number;
        /**
         * Optional. The type of window the tabs are in.
         * One of: "normal", "popup", "panel", "app", or "devtools"
         */
        windowType?: string;
        /** Optional. Whether the tabs are active in their windows. */
        active?: boolean;
        /**
         * Optional. The position of the tabs within their windows.
         * @since Chrome 18.
         */
        index?: number;
        /** Optional. Match page titles against a pattern. */
        title?: string;
        /** Optional. Match tabs against one or more URL patterns. Note that fragment identifiers are not matched. */
        url?: string | string[];
        /**
         * Optional. Whether the tabs are in the current window.
         * @since Chrome 19.
         */
        currentWindow?: boolean;
        /** Optional. Whether the tabs are highlighted. */
        highlighted?: boolean;
        /** Optional. Whether the tabs are pinned. */
        pinned?: boolean;
        /**
         * Optional. Whether the tabs are audible.
         * @since Chrome 45.
         */
        audible?: boolean;
        /**
         * Optional. Whether the tabs are muted.
         * @since Chrome 45.
         */
        muted?: boolean;
    }

    interface TabHighlightInfo {
        windowId: number;
        tabIds: number[];
    }

    interface TabRemoveInfo {
        /**
         * The window whose tab is closed.
         * @since Chrome 25.
         */
        windowId: number;
        /** True when the tab is being closed because its window is being closed. */
        isWindowClosing: boolean;
    }

    interface TabAttachInfo {
        newPosition: number;
        newWindowId: number;
    }

    interface TabChangeInfo {
        /** Optional. The status of the tab. Can be either loading or complete. */
        status?: string;
        /**
         * The tab's new pinned state.
         * @since Chrome 9.
         */
        pinned?: boolean;
        /** Optional. The tab's URL if it has changed. */
        url?: string;
        /**
         * The tab's new audible state.
         * @since Chrome 45.
         */
        audible?: boolean;
        /**
         * The tab's new muted state and the reason for the change.
         * @since Chrome 46. Warning: this is the current Beta channel.
         */
        mutedInfo?: MutedInfo;
        /**
         * The tab's new favicon URL.
         * @since Chrome 27.
         */
        favIconUrl?: string;
        /**
         * The tab's new title.
         * @since Chrome 48.
         */
        title?: string;
    }

    interface TabMoveInfo {
        toIndex: number;
        windowId: number;
        fromIndex: number;
    }

    interface TabDetachInfo {
        oldWindowId: number;
        oldPosition: number;
    }

    interface TabActiveInfo {
        /** The ID of the tab that has become active. */
        tabId: number;
        /** The ID of the window the active tab changed inside of. */
        windowId: number;
    }

    interface TabWindowInfo {
        /** The ID of the window of where the tab is located. */
        windowId: number;
    }

    interface ZoomChangeInfo {
        tabId: number;
        oldZoomFactor: number;
        newZoomFactor: number;
        zoomSettings: ZoomSettings;
    }

    interface TabHighlightedEvent extends chrome.events.Event<(highlightInfo: HighlightInfo) => void> {}

    interface TabRemovedEvent extends chrome.events.Event<(tabId: number, removeInfo: TabRemoveInfo) => void> {}

    interface TabUpdatedEvent extends chrome.events.Event<(tabId: number, changeInfo: TabChangeInfo, tab: Tab) => void> {}

    interface TabAttachedEvent extends chrome.events.Event<(tabId: number, attachInfo: TabAttachInfo) => void> {}

    interface TabMovedEvent extends chrome.events.Event<(tabId: number, moveInfo: TabMoveInfo) => void> {}

    interface TabDetachedEvent extends chrome.events.Event<(tabId: number, detachInfo: TabDetachInfo) => void> {}

    interface TabCreatedEvent extends chrome.events.Event<(tab: Tab) => void> {}

    interface TabActivatedEvent extends chrome.events.Event<(activeInfo: TabActiveInfo) => void> {}

    interface TabReplacedEvent extends chrome.events.Event<(addedTabId: number, removedTabId: number) => void> {}

    interface TabSelectedEvent extends chrome.events.Event<(tabId: number, selectInfo: TabWindowInfo) => void> {}

    interface TabZoomChangeEvent extends chrome.events.Event<(ZoomChangeInfo: ZoomChangeInfo) => void> {}

    /**
     * Injects JavaScript code into a page. For details, see the programmatic injection section of the content scripts doc.
     * @param details Details of the script or CSS to inject. Either the code or the file property must be set, but both may not be set at the same time.
     * @param callback Optional. Called after all the JavaScript has been executed.
     * Parameter result: The result of the script in every injected frame.
     */
    export function executeScript(details: InjectDetails, callback?: (result: any[]) => void): 1;
    /**
     * Injects JavaScript code into a page. For details, see the programmatic injection section of the content scripts doc.
     * @param tabId Optional. The ID of the tab in which to run the script; defaults to the active tab of the current window.
     * @param details Details of the script or CSS to inject. Either the code or the file property must be set, but both may not be set at the same time.
     * @param callback Optional. Called after all the JavaScript has been executed.
     * Parameter result: The result of the script in every injected frame.
     */
    export function executeScript(tabId: number, details: InjectDetails, callback?: (result: any[]) => void): 1;
    /** Retrieves details about the specified tab. */
    export function get(tabId: number, callback: (tab: Tab) => void): 1;
    /**
     * Gets details about all tabs in the specified window.
     * @deprecated since Chrome 33. Please use tabs.query {windowId: windowId}.
     */
    export function getAllInWindow(callback: (tab: Tab) => void): 1;
    /**
     * Gets details about all tabs in the specified window.
     * @deprecated since Chrome 33. Please use tabs.query {windowId: windowId}.
     * @param windowId Optional. Defaults to the current window.
     */
    export function getAllInWindow(windowId: number, callback: (tab: Tab) => void): 1;
    /** Gets the tab that this script call is being made from. May be undefined if called from a non-tab context (for example: a background page or popup view). */
    export function getCurrent(callback: (tab?: Tab) => void): 1;
    /**
     * Gets the tab that is selected in the specified window.
     * @deprecated since Chrome 33. Please use tabs.query {active: true}.
     */
    export function getSelected(callback: (tab: Tab) => void): 1;
    /**
     * Gets the tab that is selected in the specified window.
     * @deprecated since Chrome 33. Please use tabs.query {active: true}.
     * @param windowId Optional. Defaults to the current window.
     */
    export function getSelected(windowId: number, callback: (tab: Tab) => void): 1;
    /**
     * Creates a new tab.
     * @param callback Optional.
     * Parameter tab: Details about the created tab. Will contain the ID of the new tab.
     */
    export function create(createProperties: CreateProperties, callback?: ((tab: Tab) => void) | null): 1;
    /**
     * Moves one or more tabs to a new position within its window, or to a new window. Note that tabs can only be moved to and from normal (window.type === "normal") windows.
     * @param tabId The tab to move.
     * @param callback Optional.
     * Parameter tab: Details about the moved tab.
     */
    export function move(tabIds: number[], moveProperties: MoveProperties, callback?: (tabs: Tab[]) => void): 1;
    export function move(tabId: number, moveProperties: MoveProperties, callback?: (tab: Tab) => void): 1;
    /**
     * Moves one or more tabs to a new position within its window, or to a new window. Note that tabs can only be moved to and from normal (window.type === "normal") windows.
     * @param tabIds The tabs to move.
     * @param callback Optional.
     * Parameter tabs: Details about the moved tabs.
     */
    export function move(tabIds: number[], moveProperties: MoveProperties, callback?: (tabs: Tab[]) => void): 1;
    /**
     * Modifies the properties of a tab. Properties that are not specified in updateProperties are not modified.
     * @param callback Optional.
     * Optional parameter tab: Details about the updated tab. The tabs.Tab object doesn't contain url, title and favIconUrl if the "tabs" permission has not been requested.
     */
    export function update(updateProperties: UpdateProperties, callback?: (tab?: Tab) => void): 1;
    /**
     * Modifies the properties of a tab. Properties that are not specified in updateProperties are not modified.
     * @param tabId Defaults to the selected tab of the current window.
     * @param callback Optional.
     * Optional parameter tab: Details about the updated tab. The tabs.Tab object doesn't contain url, title and favIconUrl if the "tabs" permission has not been requested.
     */
    export function update(tabId: number, updateProperties: UpdateProperties
        , callback?: ((tab?: Tab) => void) | null): 1;
    /**
     * Closes a tab.
     * @param tabId The tab to close.
     */
    export function remove(tabId: number, callback?: Function): 1;
    /**
     * Closes several tabs.
     * @param tabIds The list of tabs to close.
     */
    export function remove(tabIds: number[], callback?: Function): 1;
    /**
     * Captures the visible area of the currently active tab in the specified window. You must have <all_urls> permission to use this method.
     * @param callback
     * Parameter dataUrl: A data URL which encodes an image of the visible area of the captured tab. May be assigned to the 'src' property of an HTML Image element for display.
     */
    export function captureVisibleTab(callback: (dataUrl: string) => void): 1;
    /**
     * Captures the visible area of the currently active tab in the specified window. You must have <all_urls> permission to use this method.
     * @param windowId Optional. The target window. Defaults to the current window.
     * @param callback
     * Parameter dataUrl: A data URL which encodes an image of the visible area of the captured tab. May be assigned to the 'src' property of an HTML Image element for display.
     */
    export function captureVisibleTab(windowId: number, callback: (dataUrl: string) => void): 1;
    /**
     * Captures the visible area of the currently active tab in the specified window. You must have <all_urls> permission to use this method.
     * @param options Optional. Details about the format and quality of an image.
     * @param callback
     * Parameter dataUrl: A data URL which encodes an image of the visible area of the captured tab. May be assigned to the 'src' property of an HTML Image element for display.
     */
    export function captureVisibleTab(options: CaptureVisibleTabOptions, callback: (dataUrl: string) => void): 1;
    /**
     * Captures the visible area of the currently active tab in the specified window. You must have <all_urls> permission to use this method.
     * @param windowId Optional. The target window. Defaults to the current window.
     * @param options Optional. Details about the format and quality of an image.
     * @param callback
     * Parameter dataUrl: A data URL which encodes an image of the visible area of the captured tab. May be assigned to the 'src' property of an HTML Image element for display.
     */
    export function captureVisibleTab(windowId: number, options: CaptureVisibleTabOptions, callback: (dataUrl: string) => void): 1;
    /**
     * Reload a tab.
     * @since Chrome 16.
     * @param tabId The ID of the tab to reload; defaults to the selected tab of the current window.
     */
    export function reload(tabId: number, reloadProperties?: ReloadProperties, callback?: () => void): 1;
    /**
     * Reload the selected tab of the current window.
     * @since Chrome 16.
     */
    export function reload(reloadProperties: ReloadProperties, callback?: () => void): 1;
    /**
     * Reload the selected tab of the current window.
     * @since Chrome 16.
     */
    export function reload(tabId: number, callback?: () => void): 1;
    /**
     * Reload the selected tab of the current window.
      * @since Chrome 16.
     */
    export function reload(callback?: () => void): 1;
    /**
     * Duplicates a tab.
     * @since Chrome 23.
     * @param tabId The ID of the tab which is to be duplicated.
     * @param callback Optional.
     * Optional parameter tab: Details about the duplicated tab. The tabs.Tab object doesn't contain url, title and favIconUrl if the "tabs" permission has not been requested.
     */
    export function duplicate(tabId: number, callback?: (tab?: Tab) => void): 1;
    /**
     * Sends a single message to the content script(s) in the specified tab, with an optional callback to run when a response is sent back. The runtime.onMessage event is fired in each content script running in the specified tab for the current extension.
     * @since Chrome 20.
     */
    export function sendMessage(tabId: number, message: any, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single message to the content script(s) in the specified tab, with an optional callback to run when a response is sent back. The runtime.onMessage event is fired in each content script running in the specified tab for the current extension.
     * @since Chrome 41.
     * @param responseCallback Optional.
     * Parameter response: The JSON response object sent by the handler of the message. If an error occurs while connecting to the specified tab, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendMessage(tabId: number, message: any, options: MessageSendOptions, responseCallback?: (response: any) => void): 1;
    /**
     * Sends a single request to the content script(s) in the specified tab, with an optional callback to run when a response is sent back. The extension.onRequest event is fired in each content script running in the specified tab for the current extension.
     * @deprecated since Chrome 33. Please use runtime.sendMessage.
     * @param responseCallback Optional.
     * Parameter response: The JSON response object sent by the handler of the request. If an error occurs while connecting to the specified tab, the callback will be called with no arguments and runtime.lastError will be set to the error message.
     */
    export function sendRequest(tabId: number, request: any, responseCallback?: (response: any) => void): 1;
    /** Connects to the content script(s) in the specified tab. The runtime.onConnect event is fired in each content script running in the specified tab for the current extension. */
    export function connect(tabId: number, connectInfo?: ConnectInfo): runtime.Port;
    /**
     * Injects CSS into a page. For details, see the programmatic injection section of the content scripts doc.
     * @param details Details of the script or CSS to inject. Either the code or the file property must be set, but both may not be set at the same time.
     * @param callback Optional. Called when all the CSS has been inserted.
     */
    export function insertCSS(details: InjectDetails, callback?: Function): 1;
    /**
     * Injects CSS into a page. For details, see the programmatic injection section of the content scripts doc.
     * @param tabId Optional. The ID of the tab in which to insert the CSS; defaults to the active tab of the current window.
     * @param details Details of the script or CSS to inject. Either the code or the file property must be set, but both may not be set at the same time.
     * @param callback Optional. Called when all the CSS has been inserted.
     */
    export function insertCSS(tabId: number, details: InjectDetails, callback?: Function): 1;
    /**
     * Highlights the given tabs.
     * @since Chrome 16.
     * @param callback Optional.
     * Parameter window: Contains details about the window whose tabs were highlighted.
     */
    export function highlight(highlightInfo: HighlightInfo, callback: (window: chrome.windows.Window) => void): 1;
    export function query(queryInfo: QueryInfo & { active: true, windowId: number }
        , callback: (result: [Tab] | never[]) => void): 1;
    export function query(queryInfo: QueryInfo & { active: true, currentWindow: true }
        , callback: (result: [Tab] | never[]) => void): 1;
    /**
     * Gets all tabs that have the specified properties, or all tabs if no properties are specified.
     * @since Chrome 16.
     */
    export function query(queryInfo: QueryInfo, callback: (result: Tab[]) => void): 1;
    /**
     * Detects the primary language of the content in a tab.
     * @param callback
     * Parameter language: An ISO language code such as en or fr. For a complete list of languages supported by this method, see kLanguageInfoTable. The 2nd to 4th columns will be checked and the first non-NULL value will be returned except for Simplified Chinese for which zh-CN will be returned. For an unknown language, und will be returned.
     */
    export function detectLanguage(callback: (language: string) => void): 1;
    /**
     * Detects the primary language of the content in a tab.
     * @param tabId Optional. Defaults to the active tab of the current window.
     * @param callback
     * Parameter language: An ISO language code such as en or fr. For a complete list of languages supported by this method, see kLanguageInfoTable. The 2nd to 4th columns will be checked and the first non-NULL value will be returned except for Simplified Chinese for which zh-CN will be returned. For an unknown language, und will be returned.
     */
    export function detectLanguage(tabId: number, callback: (language: string) => void): 1;
    /**
     * Zooms a specified tab.
     * @since Chrome 42.
     * @param zoomFactor The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor. Values greater than zero specify a (possibly non-default) zoom factor for the tab.
     * @param callback Optional. Called after the zoom factor has been changed.
     */
    export function setZoom(zoomFactor: number, callback?: () => void): 1;
    /**
     * Zooms a specified tab.
     * @since Chrome 42.
     * @param tabId Optional. The ID of the tab to zoom; defaults to the active tab of the current window.
     * @param zoomFactor The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor. Values greater than zero specify a (possibly non-default) zoom factor for the tab.
     * @param callback Optional. Called after the zoom factor has been changed.
     */
    export function setZoom(tabId: number, zoomFactor: number, callback?: () => void): 1;
    /**
     * Gets the current zoom factor of a specified tab.
     * @since Chrome 42.
     * @param callback Called with the tab's current zoom factor after it has been fetched.
     * Parameter zoomFactor: The tab's current zoom factor.
     */
    export function getZoom(callback: (zoomFactor: number) => void): 1;
    /**
     * Gets the current zoom factor of a specified tab.
     * @since Chrome 42.
     * @param tabId Optional. The ID of the tab to get the current zoom factor from; defaults to the active tab of the current window.
     * @param callback Called with the tab's current zoom factor after it has been fetched.
     * Parameter zoomFactor: The tab's current zoom factor.
     */
    export function getZoom(tabId: number, callback: (zoomFactor: number) => void): 1;
    /**
     * Sets the zoom settings for a specified tab, which define how zoom changes are handled. These settings are reset to defaults upon navigating the tab.
     * @since Chrome 42.
     * @param zoomSettings Defines how zoom changes are handled and at what scope.
     * @param callback Optional. Called after the zoom settings have been changed.
     */
    export function setZoomSettings(zoomSettings: ZoomSettings, callback?: () => void): 1;
    /**
     * Sets the zoom settings for a specified tab, which define how zoom changes are handled. These settings are reset to defaults upon navigating the tab.
     * @since Chrome 42.
     * @param tabId Optional. The ID of the tab to change the zoom settings for; defaults to the active tab of the current window.
     * @param zoomSettings Defines how zoom changes are handled and at what scope.
     * @param callback Optional. Called after the zoom settings have been changed.
     */
    export function setZoomSettings(tabId: number, zoomSettings: ZoomSettings, callback?: () => void): 1;
    /**
     * Gets the current zoom settings of a specified tab.
     * @since Chrome 42.
     * @param callback Called with the tab's current zoom settings.
     * Paramater zoomSettings: The tab's current zoom settings.
     */
    export function getZoomSettings(callback: (zoomSettings: ZoomSettings) => void): 1;
    /**
     * Gets the current zoom settings of a specified tab.
     * @since Chrome 42.
     * @param tabId Optional. The ID of the tab to get the current zoom settings from; defaults to the active tab of the current window.
     * @param callback Called with the tab's current zoom settings.
     * Paramater zoomSettings: The tab's current zoom settings.
     */
    export function getZoomSettings(tabId: number, callback: (zoomSettings: ZoomSettings) => void): 1;

    /**
     * Fired when the highlighted or selected tabs in a window changes.
     * @since Chrome 18.
     */
    var onHighlighted: TabHighlightedEvent;
    /** Fired when a tab is closed. */
    var onRemoved: TabRemovedEvent;
    /** Fired when a tab is updated. */
    var onUpdated: TabUpdatedEvent;
    /** Fired when a tab is attached to a window, for example because it was moved between windows. */
    var onAttached: TabAttachedEvent;
    /**
     * Fired when a tab is moved within a window. Only one move event is fired, representing the tab the user directly moved. Move events are not fired for the other tabs that must move in response. This event is not fired when a tab is moved between windows. For that, see tabs.onDetached.
     */
    var onMoved: TabMovedEvent;
    /** Fired when a tab is detached from a window, for example because it is being moved between windows. */
    var onDetached: TabDetachedEvent;
    /** Fired when a tab is created. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events to be notified when a URL is set. */
    var onCreated: TabCreatedEvent;
    /**
     * Fires when the active tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to onUpdated events to be notified when a URL is set.
     * @since Chrome 18.
     */
    var onActivated: TabActivatedEvent;
    /**
     * Fired when a tab is replaced with another tab due to prerendering or instant.
     * @since Chrome 26.
     */
    var onReplaced: TabReplacedEvent;
    /**
     * @deprecated since Chrome 33. Please use tabs.onActivated.
     * Fires when the selected tab in a window changes.
     */
    var onSelectionChanged: TabSelectedEvent;
    /**
     * @deprecated since Chrome 33. Please use tabs.onActivated.
     * Fires when the selected tab in a window changes. Note that the tab's URL may not be set at the time this event fired, but you can listen to tabs.onUpdated events to be notified when a URL is set.
     */
    var onActiveChanged: TabSelectedEvent;
    /**
     * @deprecated since Chrome 33. Please use tabs.onHighlighted.
     * Fired when the highlighted or selected tabs in a window changes.
     */
    var onHighlightChanged: TabHighlightedEvent;
    /**
     * Fired when a tab is zoomed.
     * @since Chrome 38.
     */
    var onZoomChange: TabZoomChangeEvent;
}

////////////////////
// Web Navigation
////////////////////
/**
 * Use the chrome.webNavigation API to receive notifications about the status of navigation requests in-flight.
 * Permissions:  "webNavigation"
 * @since Chrome 16.
 */
declare namespace chrome.webNavigation {
    interface GetFrameDetails {
        /**
         * The ID of the process runs the renderer for this tab.
         * @since Chrome 22.
         */
        processId: number;
        /** The ID of the tab in which the frame is. */
        tabId: number;
        /** The ID of the frame in the given tab. */
        frameId: number;
    }

    interface GetFrameResultDetails {
        /** The URL currently associated with this frame, if the frame identified by the frameId existed at one point in the given tab. The fact that an URL is associated with a given frameId does not imply that the corresponding frame still exists. */
        url: string;
        /** True if the last navigation in this frame was interrupted by an error, i.e. the onErrorOccurred event fired. */
        errorOccurred: boolean;
        /** ID of frame that wraps the frame. Set to -1 of no parent frame exists. */
        parentFrameId: number;
    }

    interface GetAllFrameDetails {
        /** The ID of the tab. */
        tabId: number;
    }

    interface GetAllFrameResultDetails extends GetFrameResultDetails {
        /** The ID of the process runs the renderer for this tab. */
        processId: number;
        /** The ID of the frame. 0 indicates that this is the main frame; a positive value indicates the ID of a subframe. */
        frameId: number;
    }

    interface WebNavigationCallbackDetails {
        /** The ID of the tab in which the navigation is about to occur. */
        tabId: number;
        /** The time when the browser was about to start the navigation, in milliseconds since the epoch. */
        timeStamp: number;
    }

    interface WebNavigationUrlCallbackDetails extends WebNavigationCallbackDetails {
        url: string;
    }

    interface WebNavigationReplacementCallbackDetails extends WebNavigationCallbackDetails {
        /** The ID of the tab that was replaced. */
        replacedTabId: number;
    }

    interface WebNavigationFramedCallbackDetails extends WebNavigationUrlCallbackDetails {
        /** 0 indicates the navigation happens in the tab content window; a positive value indicates navigation in a subframe. Frame IDs are unique for a given tab and process. */
        frameId: number;
        /**
         * The ID of the process runs the renderer for this tab.
         * @since Chrome 22.
         */
        processId: number;
    }

    interface WebNavigationFramedErrorCallbackDetails extends WebNavigationFramedCallbackDetails {
        /** The error description. */
        error: string;
    }

    interface WebNavigationSourceCallbackDetails extends WebNavigationUrlCallbackDetails {
        /** The ID of the tab in which the navigation is triggered. */
        sourceTabId: number;
        /**
         * The ID of the process runs the renderer for the source tab.
         * @since Chrome 22.
         */
        sourceProcessId: number;
        /** The ID of the frame with sourceTabId in which the navigation is triggered. 0 indicates the main frame. */
        sourceFrameId: number;
    }

    interface WebNavigationParentedCallbackDetails extends WebNavigationFramedCallbackDetails {
        /**
         * ID of frame that wraps the frame. Set to -1 of no parent frame exists.
         * @since Chrome 24.
         */
        parentFrameId: number;
    }

    interface WebNavigationTransitionCallbackDetails extends WebNavigationFramedCallbackDetails {
        /**
         * Cause of the navigation.
         * One of: "link", "typed", "auto_bookmark", "auto_subframe", "manual_subframe", "generated", "start_page", "form_submit", "reload", "keyword", or "keyword_generated"
         */
        transitionType: string;
        /**
         * A list of transition qualifiers.
         * Each element one of: "client_redirect", "server_redirect", "forward_back", or "from_address_bar"
         */
        transitionQualifiers: string[];
    }

    interface WebNavigationEventFilter {
        /** Conditions that the URL being navigated to must satisfy. The 'schemes' and 'ports' fields of UrlFilter are ignored for this event. */
        url: chrome.events.UrlFilter[];
    }

    interface WebNavigationEvent<T extends WebNavigationCallbackDetails> extends chrome.events.Event<(details: T) => void> {
        addListener(callback: (details: T) => void, filters?: WebNavigationEventFilter): 1;
    }

    interface WebNavigationFramedEvent extends WebNavigationEvent<WebNavigationFramedCallbackDetails> {}

    interface WebNavigationFramedErrorEvent extends WebNavigationEvent<WebNavigationFramedErrorCallbackDetails> {}

    interface WebNavigationSourceEvent extends WebNavigationEvent<WebNavigationSourceCallbackDetails> {}

    interface WebNavigationParentedEvent extends WebNavigationEvent<WebNavigationParentedCallbackDetails> {}

    interface WebNavigationTransitionalEvent extends WebNavigationEvent<WebNavigationTransitionCallbackDetails> {}

    interface WebNavigationReplacementEvent extends WebNavigationEvent<WebNavigationReplacementCallbackDetails> {}

    /**
     * Retrieves information about the given frame. A frame refers to an <iframe> or a <frame> of a web page and is identified by a tab ID and a frame ID.
     * @param details Information about the frame to retrieve information about.
     * @param callback
     * Optional parameter details: Information about the requested frame, null if the specified frame ID and/or tab ID are invalid.
     */
    export function getFrame(details: GetFrameDetails, callback: (details: GetFrameResultDetails | null) => void): 1;
    /**
     * Retrieves information about all frames of a given tab.
     * @param details Information about the tab to retrieve all frames from.
     * @param callback
     * Optional parameter details: A list of frames in the given tab, null if the specified tab ID is invalid.
     */
    export function getAllFrames(details: GetAllFrameDetails, callback: (details: GetAllFrameResultDetails[] | null) => void): 1;

    /** Fired when the reference fragment of a frame was updated. All future events for that frame will use the updated URL. */
    var onReferenceFragmentUpdated: WebNavigationTransitionalEvent;
    /** Fired when a document, including the resources it refers to, is completely loaded and initialized. */
    var onCompleted: WebNavigationFramedEvent;
    /**
     * Fired when the frame's history was updated to a new URL. All future events for that frame will use the updated URL.
     * @since Chrome 22.
     */
    var onHistoryStateUpdated: WebNavigationTransitionalEvent;
    /** Fired when a new window, or a new tab in an existing window, is created to host a navigation. */
    var onCreatedNavigationTarget: WebNavigationSourceEvent;
    /**
     * Fired when the contents of the tab is replaced by a different (usually previously pre-rendered) tab.
     * @since Chrome 22.
     */
    var onTabReplaced: WebNavigationReplacementEvent;
    /** Fired when a navigation is about to occur. */
    var onBeforeNavigate: WebNavigationParentedEvent;
    /** Fired when a navigation is committed. The document (and the resources it refers to, such as images and subframes) might still be downloading, but at least part of the document has been received from the server and the browser has decided to switch to the new document. */
    var onCommitted: WebNavigationTransitionalEvent;
    /** Fired when the page's DOM is fully constructed, but the referenced resources may not finish loading. */
    var onDOMContentLoaded: WebNavigationFramedEvent;
    /** Fired when an error occurs and the navigation is aborted. This can happen if either a network error occurred, or the user aborted the navigation. */
    var onErrorOccurred: WebNavigationFramedErrorEvent;
}

////////////////////
// Windows
////////////////////
/**
 * Use the chrome.windows API to interact with browser windows. You can use this API to create, modify, and rearrange windows in the browser.
 * Permissions: The chrome.windows API can be used without declaring any permission. However, the "tabs" permission is required in order to populate the url, title, and favIconUrl properties of Tab objects.
 * @since Chrome 5.
 */
declare namespace chrome.windows {
    interface Window {
        /** Array of tabs.Tab objects representing the current tabs in the window. */
        tabs?: chrome.tabs.Tab[];
        /** Optional. The offset of the window from the top edge of the screen in pixels. Under some circumstances a Window may not be assigned top property, for example when querying closed windows from the sessions API. */
        top?: number;
        /** Optional. The height of the window, including the frame, in pixels. Under some circumstances a Window may not be assigned height property, for example when querying closed windows from the sessions API. */
        height?: number;
        /** Optional. The width of the window, including the frame, in pixels. Under some circumstances a Window may not be assigned width property, for example when querying closed windows from the sessions API. */
        width?: number;
        /**
         * The state of this browser window.
         * One of: "normal", "minimized", "maximized", "fullscreen", or "docked"
         * @since Chrome 17.
         */
        state: ValidStates;
        /** Whether the window is currently the focused window. */
        focused: boolean;
        /**
         * Whether the window is set to be always on top.
         * @since Chrome 19.
         */
        alwaysOnTop: boolean;
        /** Whether the window is incognito. */
        incognito: boolean;
        /**
         * The type of browser window this is.
         * One of: "normal", "popup", "panel", "app", or "devtools"
         */
        type: string;
        /** Optional. The ID of the window. Window IDs are unique within a browser session. Under some circumstances a Window may not be assigned an ID, for example when querying windows using the sessions API, in which case a session ID may be present. */
        id: number;
        /** Optional. The offset of the window from the left edge of the screen in pixels. Under some circumstances a Window may not be assigned left property, for example when querying closed windows from the sessions API. */
        left?: number;
        /**
         * The session ID used to uniquely identify a Window obtained from the sessions API.
         * @since Chrome 31.
         */
        sessionId?: string;
    }

    interface GetInfo {
        /**
         * Optional.
         * If true, the windows.Window object will have a tabs property that contains a list of the tabs.Tab objects. The Tab objects only contain the url, title and favIconUrl properties if the extension's manifest file includes the "tabs" permission.
         */
        populate?: boolean;
        /**
         * If set, the windows.Window returned will be filtered based on its type. If unset the default filter is set to ['app', 'normal', 'panel', 'popup'], with 'app' and 'panel' window types limited to the extension's own windows.
         * Each one of: "normal", "popup", "panel", "app", or "devtools"
         * @since Chrome 46. Warning: this is the current Beta channel.
         */
        windowTypes?: string[];
    }

    interface CreateData {
        /**
         * Optional. The id of the tab for which you want to adopt to the new window.
         * @since Chrome 10.
         */
        tabId?: number;
        /**
         * Optional.
         * A URL or array of URLs to open as tabs in the window. Fully-qualified URLs must include a scheme (i.e. 'http://www.google.com', not 'www.google.com'). Relative URLs will be relative to the current page within the extension. Defaults to the New Tab Page.
         */
        url?: string;
        /**
         * Optional.
         * The number of pixels to position the new window from the top edge of the screen. If not specified, the new window is offset naturally from the last focused window. This value is ignored for panels.
         */
        top?: number;
        /**
         * Optional.
         * The height in pixels of the new window, including the frame. If not specified defaults to a natural height.
         */
        height?: number;
        /**
         * Optional.
         * The width in pixels of the new window, including the frame. If not specified defaults to a natural width.
         */
        width?: number;
        /**
         * Optional. If true, opens an active window. If false, opens an inactive window.
         * @since Chrome 12.
         */
        focused?: boolean;
        /** Optional. Whether the new window should be an incognito window. */
        incognito?: boolean;
        /**
         * Optional. Specifies what type of browser window to create. The 'panel' and 'detached_panel' types create a popup unless the '--enable-panels' flag is set.
         * One of: "normal", "popup", "panel", or "detached_panel"
         */
        type?: string;
        /**
         * Optional.
         * The number of pixels to position the new window from the left edge of the screen. If not specified, the new window is offset naturally from the last focused window. This value is ignored for panels.
         */
        left?: number;
        /**
         * Optional. The initial state of the window. The 'minimized', 'maximized' and 'fullscreen' states cannot be combined with 'left', 'top', 'width' or 'height'.
         * One of: "normal", "minimized", "maximized", "fullscreen", or "docked"
         * @since Chrome 44.
         */
        state?: string;
    }
    type ValidStates = "normal" | "minimized" | "maximized" | "fullscreen" | "docked";

    interface UpdateInfo {
        /** Optional. The offset from the top edge of the screen to move the window to in pixels. This value is ignored for panels. */
        top?: number;
        /**
         * Optional. If true, causes the window to be displayed in a manner that draws the user's attention to the window, without changing the focused window. The effect lasts until the user changes focus to the window. This option has no effect if the window already has focus. Set to false to cancel a previous draw attention request.
         * @since Chrome 14.
         */
        drawAttention?: boolean;
        /** Optional. The height to resize the window to in pixels. This value is ignored for panels. */
        height?: number;
        /** Optional. The width to resize the window to in pixels. This value is ignored for panels. */
        width?: number;
        /**
         * Optional. The new state of the window. The 'minimized', 'maximized' and 'fullscreen' states cannot be combined with 'left', 'top', 'width' or 'height'.
         * One of: "normal", "minimized", "maximized", "fullscreen", or "docked"
         * @since Chrome 17.
         */
        state?: string;
        /**
         * Optional. If true, brings the window to the front. If false, brings the next window in the z-order to the front.
         * @since Chrome 8.
         */
        focused?: boolean;
        /** Optional. The offset from the left edge of the screen to move the window to in pixels. This value is ignored for panels. */
        left?: number;
    }

    interface WindowEventFilter {
        /**
         * Conditions that the window's type being created must satisfy. By default it will satisfy ['app', 'normal', 'panel', 'popup'], with 'app' and 'panel' window types limited to the extension's own windows.
         * Each one of: "normal", "popup", "panel", "app", or "devtools"
         */
        windowTypes: string[];
    }

    interface WindowIdEvent extends chrome.events.Event<(windowId: number, filters?: WindowEventFilter) => void> {}

    interface WindowReferenceEvent extends chrome.events.Event<(window: Window, filters?: WindowEventFilter) => void> {}

    /**
     * The windowId value that represents the current window.
     * @since Chrome 18.
     */
    var WINDOW_ID_CURRENT: number;
    /**
     * The windowId value that represents the absence of a chrome browser window.
     * @since Chrome 6.
     */
    var WINDOW_ID_NONE: number;

    /** Gets details about a window. */
    export function get(windowId: number, callback: (window: chrome.windows.Window) => void): 1;
    /**
     * Gets details about a window.
     * @since Chrome 18.
     */
    export function get(windowId: number, getInfo: GetInfo, callback: (window: chrome.windows.Window) => void): 1;
    /**
     * Gets the current window.
     */
    export function getCurrent(callback: (window: chrome.windows.Window) => void): 1;
    /**
     * Gets the current window.
     * @since Chrome 18.
     */
    export function getCurrent(getInfo: GetInfo & { populate: true }
        , callback: (window?: (chrome.windows.Window & { tabs: chrome.tabs.Tab[] }) | null) => void): 1;
    export function getCurrent(getInfo: GetInfo, callback: (window?: chrome.windows.Window | null) => void): 1;
    /**
     * Creates (opens) a new browser with any optional sizing, position or default URL provided.
     * @param callback
     * Optional parameter window: Contains details about the created window.
     */
    export function create(callback?: (window?: chrome.windows.Window) => void): 1;
    /**
     * Creates (opens) a new browser with any optional sizing, position or default URL provided.
     * @param callback
     * Optional parameter window: Contains details about the created window.
     */
    export function create(createData: CreateData, callback?: ((window?: chrome.windows.Window) => void) | null): 1;
    /**
     * Gets all windows.
     */
    export function getAll(callback: (windows: chrome.windows.Window[]) => void): 1;
    /**
     * Gets all windows.
     * @since Chrome 18.
     */
    export function getAll(getInfo: GetInfo, callback: (windows: chrome.windows.Window[]) => void): 1;
    /** Updates the properties of a window. Specify only the properties that you want to change; unspecified properties will be left unchanged. */
    export function update(windowId: number, updateInfo: UpdateInfo, callback?: (window: chrome.windows.Window) => void): 1;
    /** Removes (closes) a window, and all the tabs inside it. */
    export function remove(windowId: number, callback?: Function): 1;
    /**
     * Gets the window that was most recently focused — typically the window 'on top'.
     */
    export function getLastFocused(callback: (window: chrome.windows.Window) => void): 1;
    /**
     * Gets the window that was most recently focused — typically the window 'on top'.
     * @since Chrome 18.
     */
    export function getLastFocused(getInfo: GetInfo, callback: (window: chrome.windows.Window) => void): 1;

    /** Fired when a window is removed (closed). */
    var onRemoved: WindowIdEvent;
    /** Fired when a window is created. */
    var onCreated: WindowReferenceEvent;
    /**
     * Fired when the currently focused window changes. Will be chrome.windows.WINDOW_ID_NONE if all chrome windows have lost focus.
     * Note: On some Linux window managers, WINDOW_ID_NONE will always be sent immediately preceding a switch from one chrome window to another.
     */
    var onFocusChanged: WindowIdEvent;
}
