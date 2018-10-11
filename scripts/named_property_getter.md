# named_property_getter

- **framset**: CrossOrigin, OverrideBuiltins
- **form**: CrossOrigin, OverrideBuiltins
- **embed**: CrossOrigin ?, OverrideBuiltins ?
- **object**: CrossOrigin ?, OverrideBuiltins ?

- **window**: CrossOrigin
- **document**: OverrideBuiltins

# note
On Chrome, `window.Var && typeof window.Var !== "function"` is not enough,
because on some old versions of Chrome, `typeof <embed>` is (unfortunately) `"function"`.
Related doc: https://www.chromestatus.com/features/5715026367217664