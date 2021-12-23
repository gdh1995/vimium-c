# named_property_getter

## frames

- **framset**: CrossContext, OverrideBuiltins
  - ***fixed (some are ignored)*** for Chrome
  - `[name] = Window`
  - test page: http://www.w3school.com.cn/tiy/loadtext.asp?f=html_frame_cols
  - removed since C70, commit 6a866d29f4314b990981119285da46540a50742c
    - @see https://bugs.chromium.org/p/chromium/issues/detail?id=695891
    - BrowserVer.MinFramesetHasNoNamedGetter
  - according to tests and source code, its named getter requires `<frame>.contentDocument` is valid
  - not on MS Edge 18.17763
  - not on modern versions of Firefox
    - according to logs of https://dxr.mozilla.org/mozilla-central/source/dom/webidl/HTMLFrameSetElement.webidl

Comment: on C35 and C70, `iframe` and `frame` have no named property getters

## forms

- **form**: CrossContext, OverrideBuiltins
  - ***fixed*** for Chrome
  - `[name] = HTMLFormControlElement | RadioNodeList`
  - CrossContext: not on Firefox 65
  - does cross contexts on MS Edge 18.17763
  - `input[form]` takes effects only if the input is connected
    - https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#reset-the-form-owner

## plugins

- **object**, **embed**: CrossContext?, OverrideBuiltins?
  - ***ignored***
  - `[name] = unknown (any)`
  - OverrideBuiltins: added since C45, commit b3afcae7d957f15d5a23c6dfd891be3bd21f3e21
  - CrossContext: removed since C61, commit 1e196e33687bd22a33c8b2116956754b90b29bde

### *Conclusion:*
* The two are unsafe only during C45 and C60, and when installed plugins are not well designed.
* In the meantime, the feature to click Flash areas are important enough.
* Therefore, ignore them

### *access paths for embed/object plugins (2018/10/15)*

1. V8HTMLEmbedElement::namedPropertyGetterCustom | V8HTMLObjectElement::namedPropertyGetterCustom
2. (annoymous_namespace)::GetScriptableObjectProperty (in v8_html_plugin_element_custom.cc)
3. HTMLPlugInElement::PluginWrapper
4. WebPluginContainerImpl::ScriptableObject
5. WebPlugin::V8ScriptableObject (virtual, hidden)
    - WebViewPlugin::V8ScriptableObject
      - PluginPlaceholderBase::GetV8ScriptableObject (return empty)
    - **BrowserPlugin::V8ScriptableObject** (public, CONTENT_EXPORT)
      - MimeHandlerViewContainer::V8ScriptableObject
        1. MimeHandlerViewContainerBase::GetScriptableObject
        2. ScriptableObject::Create
        3. ScriptableObject::GetNamedProperty (only supports "postMessage")
    - PepperWebPluginImpl::V8ScriptableObject
      1. **PepperPluginInstanceImpl::GetMessageChannelObject** (public, CONTENT_EXPORT)
      2. PepperPluginInstanceImpl::message_channel_object_ (private)
      3. MessageChannel::Create (public, hidden)
      4. gin::Handle<MessageChannel>::ToV8()->ToObject
      5. MessageChannel::GetNamedProperty (private, hidden)
          - MessageChannel::internal_named_properties_
            1. MessageChannel::SetReadOnlyProperty (public, hidden)
            2. **PepperPluginInstanceImpl::SetEmbedProperty** (public, CONTENT_EXPORT)
                - NexeLoadManager::SetReadOnlyProperty (public, hidden)
                  1. NexeLoadManager::set_nacl_ready_state (set "readyState")
                  2. NexeLoadManager::SetLastError (set "lastError")
                  3. NexeLoadManager::set_exit_status (set "exitStatus")
          - PluginObject::GetNamedProperty (public, hidden)
            1. PluginObject::GetPropertyOrMethod
            2. **PPP_Class_Deprecated**::HasProperty | PPP_Class_Deprecated::HasMethod (accessible)
            3. PPP_Class_Deprecated::GetProperty | PluginObject::Call
            4. PPP_Class_Deprecated::Call

## roots

- **window**: CrossContext
  - ***fixed***
  - `iframe[name],frame[name]`: mapped to `element.contentWindow`
    - `[name]` needs to be set up during loading
  - `[id]`: mapped to the `element` itself
    - dynamic; but with a lower priority than `iframe[name]`
- **document**: OverrideBuiltins
  - ***fixed***
  - those whose `Element::GetNamedItemType() != NamedItemType::kNone`
    - `embed, form, iframe, image, object`
  - doc: https://html.spec.whatwg.org/multipage/dom.html#dom-document-nameditem

The overriding values may be:
* `HTMLCollection` if multi matched else
* `Window` if `iframe,frame` else
* `Element` if `[id]`

Traces:
  - https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/custom/v8_window_custom.cc?q=NamedPropertyGetterCustom&dr=CSs&l=300
  - https://cs.chromium.org/chromium/src/third_party/blink/renderer/bindings/core/v8/local_window_proxy.cc?q=GetNamedProperty&g=0&l=482

Comment: confirmed on C35 and C70

# note

On Chrome, `window.Var && typeof window.Var !== "function"` is not enough,
because on some old versions (< 58) of Chrome, `typeof <embed>` is unfortunately `"function"`.
Related doc: https://www.chromestatus.com/features/5715026367217664

My filed issue about `<form>` is @see https://bugs.chromium.org/p/chromium/issues/detail?id=897399
and https://github.com/whatwg/html/issues/4458 .

And there's a test page: https://jsfiddle.net/bvumn4g3/ (../tests/dom/named-property.html)

# Firefox: Xray vision

Firefox has applied [Xray vision](https://developer.mozilla.org/en-US/docs/Mozilla/Tech/Xray_vision)
  to help protect privileged JavaScript code.
* http://devdoc.net/web/developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts.html#DOM_access
* https://dxr.mozilla.org/mozilla-central/source/dom/bindings/Codegen.py#11708
