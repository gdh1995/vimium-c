# Script Execution Order

* `[src][defer]:parser`
  * a list to execute on after-parsing and before-doc-ready
* `[src]:parser`
  * pending parsing-blocking
* `[src]${async=false}:from-code`
  * list to execute in order as soon as possible
* `[src]:from-code`, `[src][async]:parser`
  * set to execute as soon as possible
* `:not([src]):parser`
  * pending parsing-blocking + :ready
* `default`
  * execute immediately


## Conclusion

`[src]${async=false}:from-code` is not suitable for `extend_click`,
and it can only use `<script>` with code textContent.
