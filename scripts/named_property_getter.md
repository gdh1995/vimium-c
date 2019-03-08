# named_property_getter

## frames

- **framset**: CrossContext, OverrideBuiltins
  - ***fixed***
  - OverrideBuiltins: removed since C70, commit 6a866d29f4314b990981119285da46540a50742c

Comment: on C35 and C70, `iframe` and `frame` have no named property getters

## forms

- **form**: CrossContext, OverrideBuiltins
  - ***fixed***
    - VDom, VUtils, VKeyboard, polyfill
    - VMarks, VFind, VVisual, VScroller, VOmni
    - VDom.UI, extend_click, inject_end
    - frontend

## plugins

- **object**, **embed**: CrossContext?, OverrideBuiltins?
  - ***ignored***
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
- **document**: OverrideBuiltins
  - ***fixed***
  - `iframe[name]`
  - those whose `Element::GetNamedItemType() != NamedItemType::kNone`
    - `embed, form, iframe, image, object`
  - doc: https://html.spec.whatwg.org/multipage/dom.html#dom-document-nameditem

Comment: confirmed on C35 and C70

# note

On Chrome, `window.Var && typeof window.Var !== "function"` is not enough,
because on some old versions (< 58) of Chrome, `typeof <embed>` is unfortunately `"function"`.
Related doc: https://www.chromestatus.com/features/5715026367217664

My filed issue about `<form>` is https://bugs.chromium.org/p/chromium/issues/detail?id=897399

And there's a test page: https://jsfiddle.net/bvumn4g3/ (../tests/dom/named-property.html)
