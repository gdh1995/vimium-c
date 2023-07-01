/// <reference path="../typings/lib/window.d.ts" />

(function (): void {
  const MayChrome = !!(Build.BTypes & BrowserType.Chrome), MayNotChrome = Build.BTypes !== BrowserType.Chrome as number
  const mayBrowser_ = MayChrome && MayNotChrome
      && typeof browser === "object" && !("tagName" in (browser as unknown as Element))
      ? (browser as typeof chrome) : null
  const useBrowser = !MayNotChrome ? false : !MayChrome ? true
      : !!(mayBrowser_ && mayBrowser_.runtime && mayBrowser_.runtime.connect)
  const browser_ = useBrowser ? (browser as typeof chrome) : chrome
  const runtime = browser_.runtime
  const destroy = (): void => {
    window !== top && (parent as Window).focus()
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
      setTimeout(destroy, 0) // try to avoid a strange crashes on Chrome 103
    }
    const { t: taskId, s: serialized, d: data, r: resolve } = _response as TaskTypes<keyof TeeTasks>
    const runTask = (): void | Promise<unknown> => {
      if (Build.MV3) {
        switch (taskId) {
        case kTeeTask.Copy:
        case kTeeTask.Paste:
            const navClip = navigator.clipboard!
            return taskId === kTeeTask.Copy ? navClip.writeText!(serialized)
                : navClip.readText!().then((result): void => { okResult = result })
        case kTeeTask.Download:
          return ((window as any).fetch as GlobalFetch)(serialized.u)
              .then<Blob>(res => res.status < 300 && res.status > 199 ? res.blob() : Promise.reject("HTTP "+res.status))
              .then((blob): void => {
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = serialized.t
            a.target = "_blank"
            const mouseEvent = new MouseEvent("click", {
              bubbles: true, cancelable: true, altKey: true, detail: 1, button: 0, buttons: 1
            } as ValidMouseEventInit)
            a.dispatchEvent(mouseEvent)
          })
        }
      }
      switch (taskId) {
      case kTeeTask.CopyImage:
      case kTeeTask.DrawAndCopy:
        const copying = (taskId === kTeeTask.DrawAndCopy ? new Promise<Blob>((resolve, reject): void => {
          const img = document.createElement("img")
          img.onload = (): void => {
            const canvas = document.createElement("canvas")
            const w = canvas.width = img.naturalWidth, h = canvas.height = img.naturalHeight
            const ctx = canvas.getContext("2d") // ctx may be null if OOM
            if (!ctx) { reject("Can not create canvas"); return }
            try {
              ctx.drawImage(img, 0, 0, w, h)
              canvas.toBlob(blob => blob ? resolve(blob) : reject("Can not export from canvas"))
            } catch {
              reject("Can not export tainted canvas")
            }
          }
          img.onerror = () => { reject(0) }
          img.src = serialized.u
        }).catch<Response | Blob>((err: string | 0) => !Build.MV3 && data
            || (err !== 0 ? ((window as any).fetch as GlobalFetch)(serialized.u)
                : Promise.reject("Can not load image")))
        : !Build.MV3 && data ? Promise.resolve(data) : ((window as any).fetch as GlobalFetch)(serialized.u))
            .then<Blob>((res) => {
          serialized.u = ""
          return res instanceof Response ? res.blob() : res
        })
        .then((image): Promise<unknown> => {
          if (Build.BTypes === BrowserType.Firefox as number
                || !!(Build.BTypes & BrowserType.Firefox) && serialized.b! & BrowserType.Firefox) {
            return new Promise<void>((resolve): void => {
              const reader = new FileReader()
              reader.onload = (): void => { okResult = reader.result as string; resolve() }
              reader.readAsDataURL(image)
            })
          }
          serialized.u = ""
          const png = "image/png", plain = "text/plain"
          const item: EnsuredDict<Blob> = { [png]: image.type === png ? image : new Blob([image], { type: png }) }
          serialized.t && (item[plain] = new Blob([serialized.t], { type: plain }))
          return navigator.clipboard!.write!([new ClipboardItem(item)])
        })
        taskId !== kTeeTask.DrawAndCopy && (serialized.u = "")
        return copying
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
      p ? p.then((): void => { onFinish(okResult) }, (err): void => {
        console.log("Vimium C: can not run task=%o:", taskId, err)
        onFinish(false)
      }) : onFinish(false)
    }
    let okResult: true | string = true
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
