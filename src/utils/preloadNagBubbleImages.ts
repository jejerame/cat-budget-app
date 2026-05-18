import { HOUSING_CHEER_IMAGE_URLS } from '../data/housingInstantNag'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'

export { say1Url, say2Url }

const decoded = new Set<string>()
let instantWarmupStarted = false

function urlForVariant(variant: 'instant' | 'weekly'): string {
  return variant === 'instant' ? say1Url : say2Url
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

/** onload/complete만으로는 iOS Safari에서 높이 0인 가로 띠로 그려질 수 있음 → decode + naturalWidth 확인 */
function loadOne(url: string): Promise<void> {
  if (decoded.has(url)) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false

    const finishOk = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackId)
      decoded.add(url)
      resolve()
    }

    const finishFail = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackId)
      resolve()
    }

    const fallbackId = window.setTimeout(finishFail, 14_000)

    const afterLoad = () => {
      void (async () => {
        try {
          if (typeof img.decode === 'function') await img.decode()
        } catch {
          /* decode 실패 시 onload + naturalWidth 기준 */
        }
        const paintable = await waitPaintable(img, 8)
        if (paintable) finishOk()
        else finishFail()
      })()
    }

    img.onload = afterLoad
    img.onerror = finishFail
    img.decoding = 'async'
    img.src = url

    if (img.complete) afterLoad()
  })
}

/** PWA·Safari 첫 지출: say1(즉시 잔소리)을 최우선으로 디코드 */
export function preloadNagBubbleImages(): Promise<void> {
  return loadOne(say1Url).then(() =>
    Promise.all([loadOne(say2Url), ...HOUSING_CHEER_IMAGE_URLS.map(loadOne)]).then(() => undefined),
  )
}

/** 첫 터치·입력 전에 say1 워밍 (Safari 콜드 스타트) */
export function warmupInstantNagBubbleImage(): void {
  if (instantWarmupStarted) return
  instantWarmupStarted = true
  void loadOne(say1Url)
}

export function isNagBubbleImageReady(variant: 'instant' | 'weekly'): boolean {
  return decoded.has(urlForVariant(variant))
}

export function ensureNagBubbleImageReady(variant: 'instant' | 'weekly'): Promise<void> {
  return loadOne(urlForVariant(variant))
}

export function ensureBubbleImageReady(url: string): Promise<void> {
  return loadOne(url)
}

export function isBubbleImageReady(url: string): boolean {
  return decoded.has(url)
}
