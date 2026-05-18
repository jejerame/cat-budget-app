import { HOUSING_CHEER_IMAGE_URLS } from '../data/housingInstantNag'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'

const decoded = new Set<string>()

function urlForVariant(variant: 'instant' | 'weekly'): string {
  return variant === 'instant' ? say1Url : say2Url
}

function isPaintable(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalHeight > 0
}

/** onload/complete만으로는 iOS에서 높이 0인 가로 띠로 그려질 수 있음 → decode + naturalWidth 확인 */
function loadOne(url: string): Promise<void> {
  if (decoded.has(url)) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    let settled = false

    const settleOk = () => {
      if (settled || !isPaintable(img)) return
      settled = true
      window.clearTimeout(fallbackId)
      decoded.add(url)
      resolve()
    }

    const settleAnyway = () => {
      if (settled) return
      settled = true
      window.clearTimeout(fallbackId)
      resolve()
    }

    const fallbackId = window.setTimeout(settleAnyway, 12_000)

    const afterLoad = () => {
      void (async () => {
        try {
          if (typeof img.decode === 'function') await img.decode()
        } catch {
          /* decode 실패 시 onload 기준으로 진행 */
        }
        settleOk()
      })()
    }

    img.onload = afterLoad
    img.onerror = settleAnyway
    img.src = url

    if (img.complete) afterLoad()
  })
}

/** PWA 첫 지출 시 말풍선 PNG(수 MB) 디코드 지연 방지 */
export function preloadNagBubbleImages(): Promise<void> {
  return Promise.all([loadOne(say1Url), loadOne(say2Url), ...HOUSING_CHEER_IMAGE_URLS.map(loadOne)]).then(
    () => undefined,
  )
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
