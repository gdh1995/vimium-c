import "./define.js"
//#region main
import "./store.js"
import "./utils.js"
import "./browser.js"
import "./normalize_urls.js"
import "./parse_urls.js"
import "./settings.js"
import "./ports.js"
import "./exclusions.js"
import "./ui_css.js"
import "./i18n.js"
import "./key_mappings.js"
import "./run_commands.js"
import "./run_keys.js"
import "./tools.js"
import "./clipboard.js"
import "./eval_urls.js"
import "./filter_tabs.js"
import "./open_urls.js"
import "./frame_commands.js"
import "./tab_commands.js"
import "./all_commands.js"
import "./request_handlers.js"
import "./main.js"
//#endregion
//#region dynamic
import "./browsing_data_manager.js"
import "./completion_utils.js"
import "./completion.js"
import * as action_icon from "./action_icon.js"
__moduleMap.action_icon   = __moduleMap.action_icon   || action_icon
import "./others.js"
import "./sync.js"
import * as page_handlers from "./page_handlers.js"
import * as help_dialog from "./help_dialog.js"
import * as math_parser from "../lib/math_parser.js"
__moduleMap.page_handlers = __moduleMap.page_handlers || page_handlers
__moduleMap.help_dialog   = __moduleMap.help_dialog   || help_dialog
__moduleMap.math_parser   = __moduleMap.math_parser   || math_parser
//#endregion
