interface WindowWithTop extends Window { top: Window }

declare var window: Window, document: Document // eslint-disable-line no-var

/** Warning on Firefox:
 * Even when `frameElement` is valid, `parent.innerWidth` may still throw.
 *
 * Common cases:
 * * on QQMail desktop version, the inbox is an `<iframe src="//mail.qq.com/...">`
 * * if the top frame is using HTTPS, then there's an auto-upgrading from HTTP to HTTPS
 * * its first element is an inline `<script>`, and the first line is `document.domain="mail.qq.com";`
 * * before this line, access to `parent.innerWidth` is blocked
 * * after this line, the access is re-enabled on Chrome and most time of Firefox
 *
 * Bug cases:
 * * But on Firefox, if debugging code and access `webextension.parent.***` before the line,
 * * then the `parent` is generated as an instance of `Restricted` lazily,
 * * when the page is loaded, the `parent` is still restricted and only `.focus` and `.location.href` can be accessed
 */
declare var parent: unknown; // eslint-disable-line no-var

interface Window { readonly VApi?: VApiTy | undefined }
declare var VApi: VApiTy | undefined // eslint-disable-line no-var
