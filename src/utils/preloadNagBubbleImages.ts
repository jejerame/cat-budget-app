import say1Url from '../../say1.png'
import say2Url from '../../say2.png'

const loaded = new Set<string>()

function loadOne(url: string): Promise<void> {
  if (loaded.has(url)) return Promise.resolve()
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      loaded.add(url)
      resolve()
    }
    img.onload = done
    img.onerror = done
    img.src = url
    if (img.complete) done()
  })
}

/** PWA 첫 지출 시 말풍선 PNG(수 MB) 디코드 지연 방지 */
export function preloadNagBubbleImages(): Promise<void> {
  return Promise.all([loadOne(say1Url), loadOne(say2Url)]).then(() => undefined)
}

export function isNagBubbleImageReady(variant: 'instant' | 'weekly'): boolean {
  return loaded.has(variant === 'instant' ? say1Url : say2Url)
}

export function ensureNagBubbleImageReady(variant: 'instant' | 'weekly'): Promise<void> {
  return loadOne(variant === 'instant' ? say1Url : say2Url)
}
