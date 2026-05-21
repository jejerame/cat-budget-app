import popupExpenseUrl from '../../popup1.png'
import popupSavingGoodUrl from '../../popup2.png'
import popupSavingBadUrl from '../../popup3.png'

export const POPUP_TOAST_IMAGE_URLS = [popupExpenseUrl, popupSavingGoodUrl, popupSavingBadUrl] as const

export { popupExpenseUrl, popupSavingGoodUrl, popupSavingBadUrl }

const decoded = new Set<string>()

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

function loadOne(url: string): Promise<void> {
  if (decoded.has(url)) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackId)
      decoded.add(url)
      resolve()
    }

    const fallbackId = window.setTimeout(finish, 14_000)

    const afterLoad = () => {
      void (async () => {
        try {
          if (typeof img.decode === 'function') await img.decode()
        } catch {
          /* ignore */
        }
        const paintable = await waitPaintable(img, 8)
        if (paintable) finish()
        else finish()
      })()
    }

    img.onload = afterLoad
    img.onerror = finish
    img.decoding = 'async'
    img.src = url
    if (img.complete) afterLoad()
  })
}

export function preloadPopupToastImages(): Promise<void> {
  return Promise.all(POPUP_TOAST_IMAGE_URLS.map(loadOne)).then(() => undefined)
}

export function ensurePopupToastImageReady(url: string): Promise<void> {
  return loadOne(url)
}
