/// <reference path="../typings/lib/window.d.ts" />

(function (): void {
  const MayChrome = !!(Build.BTypes & BrowserType.Chrome), MayNotChrome = !!(Build.BTypes & ~BrowserType.Chrome)
  const mayBrowser_ = MayChrome && MayNotChrome
      && typeof browser === "object" && !("tagName" in (browser as unknown as Element))
      ? (browser as typeof chrome) : null
  const useBrowser = !MayNotChrome ? false : !MayChrome ? true
      : !!(mayBrowser_ && mayBrowser_.runtime && mayBrowser_.runtime.connect)
  const browser_ = useBrowser ? (browser as typeof chrome) : chrome
  const runtime = browser_.runtime
  const destroy = (): void => {
    ; (parent as Window).focus()
    window.closed || window.close()
    port = null
  }
  const onTask = (_response: BaseTeeTask): void => {
    type TaskTypes<K> = K extends keyof TeeTasks ? Req.tee<K> : never
    let onFinish = (ok: boolean | string): void => {
      if (Build.MV3 || port) {
        (port as any).postMessage(ok)
      } else {
        resolve!(ok)
      }
      destroy()
    }
    const { t: taskId, s: serialized, d: data, r: resolve } = _response as TaskTypes<keyof TeeTasks>
    const runTask = (): void | Promise<unknown> => {
      if (Build.MV3) {
        switch (taskId) {
        case kTeeTask.Copy:
        case kTeeTask.Paste:
            const navClip = navigator.clipboard!, realOnFinish = onFinish
            onFinish = (): void => {}
            return (taskId === kTeeTask.Copy ? navClip.writeText!(serialized) : navClip.readText!())
                .catch(() => false as const).then((result): void => {
              setTimeout((): void => { // try to avoid a strange crashes on Chrome 103
                realOnFinish(taskId === kTeeTask.Copy ? result !== false : result as string | false)
              }, 0)
            })
        case kTeeTask.Download:
          return (((window as any).fetch as GlobalFetch)(serialized.url).then(res => res.blob())
              .then(blob => URL.createObjectURL(blob), () => {})).then(url2 => {
            url2 && (serialized.url = url2)
            return chrome.downloads.download!(serialized).catch((): void => {})
          })
        }
      }
      switch (taskId) {
      case kTeeTask.CopyImage:
        return (data ? Promise.resolve(data)
                : ((window as any).fetch(serialized[0] as string) as Promise<Response>).then(res => res.blob()))
            .then((image): Promise<unknown> => {
          const png = "image/png", plain = "text/plain"
          const item: EnsuredDict<Blob> = { [png]: image.type === png ? image : new Blob([image], { type: png }) }
          serialized[1] && (item[plain] = new Blob([serialized[1]], { type: plain }))
          return navigator.clipboard!.write!([new ClipboardItem(item)])
        })
      }
      Build.NDEBUG || console.log("Vimium C: error: unknown tee task id =", taskId)
    }
    const onFocus = (): void => {
      let p: ReturnType<typeof runTask> | undefined
      try {
        p = runTask()
      } catch (e) {
        Build.NDEBUG || console.log("Vimium C: error: failed in running task id = %o:\n%o", taskId, e)
      }
      p ? p.then((): void => { onFinish(true) }, (err): void => {
        Build.NDEBUG || console.log("Vimium C: can not run task=%o:", taskId, err)
        onFinish(false)
      }) : onFinish(false)
    }
    document.hasFocus() ? onFocus() : (window.onfocus = onFocus, window.focus())
  }
  let port: chrome.runtime.Port | null, once = false
  if (!Build.MV3) {
    const getBg = browser_.extension.getBackgroundPage
    const bg = getBg && getBg() as unknown as BgExports | null
    if (bg && bg.onPagesReq) {
      const task = bg.onPagesReq({ i: GlobalConsts.TeeReqId as const, q: [] }) as unknown as BaseTeeTask | null
      if (task) {
        onTask(task)
      }
      return
    }
  }
  try {
    port = runtime.connect({ name: "" + (PortType.selfPages | PortType.Tee) })
    port.onDisconnect.addListener(destroy)
  } catch {
    destroy()
    return
  }
  port.onMessage.addListener((_response: unknown): void => {
    const response = _response as Req.bg<kBgReq>
    if (response.N !== kBgReq.omni_runTeeTask || once) {
      Build.NDEBUG || console.log("Vimium C: error: unknown message:", response)
      destroy()
    } else {
      once = true
      onTask(response)
    }
  })
})()
