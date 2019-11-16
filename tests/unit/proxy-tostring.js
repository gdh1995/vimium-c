var a = function() {},
b = new Proxy(a, {
  get (t,k) { console.log('get', t, k); return k ==='toString'? () => '123' : t[k] },
  apply (t,s,a) { console.log('apply', t, s, a); return t.apply(s, a) }
});
if (Function.prototype.toString.call(b).replace(/\s+/g, " ") !== "function () { [native code] }") {
  console.log("Assert error!!! Proxy behavior may have changed");
} else {
  console.log("Passed");
}
