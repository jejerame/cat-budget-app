const decoded = new Set<string>()
const inflight = new Map<string, Promise<boolean>>()

export function isImageAssetReady(url: string): boolean {
  return decoded.has(url)
}

function isPaintable(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalHeight > 0
}

function waitPaintable(img: HTMLImageElement, attemptsLeft: number): Promise<boolean> {
  if (isPaintable(img)) return Promise.resolve(true)
  if (attemptsLeft <= 0) return Promise.resolve(false)
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      void waitPaintable(img, attemptsLeft - 1).then(resolve)
    })
  })
}

/** Safari·PWA: decode 완료 + naturalWidth 확인 후에만 ready */
export function loadImageAsset(url: string): Promise<boolean> {
  if (decoded.has(url)) return Promise.resolve(true)

  const pending = inflight.get(url)
  if (pending) return pending

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image()
    let settled = false

    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackId)
      if (ok) decoded.add(url)
      inflight.delete(url)
      resolve(ok)
    }

    const fallbackId = window.setTimeout(() => finish(false), 18_000)

    const afterLoad = () => {
      void (async () => {
        try {
          if (typeof img.decode === 'function') await img.decode()
        } catch {
          /* decode 실패 시 onload + naturalWidth로 판단 */
        }
        const paintable = await waitPaintable(img, 24)
        finish(paintable)
      })()
    }

    img.onload = afterLoad
    img.onerror = () => finish(false)
    img.decoding = 'async'
    img.src = url
    if (img.complete) afterLoad()
  })

  inflight.set(url, promise)
  return promise
}

export function ensureImageAssetReady(url: string): Promise<void> {
  return loadImageAsset(url).then((ok) => {
    if (!ok) return loadImageAsset(url).then(() => undefined)
  })
}
