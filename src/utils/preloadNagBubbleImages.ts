import { HOUSING_CHEER_IMAGE_URLS } from '../data/housingInstantNag'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { ensureImageAssetReady, isImageAssetReady, loadImageAsset } from './imageAssetLoader'

export { say1Url, say2Url }

let instantWarmupStarted = false

function urlForVariant(variant: 'instant' | 'weekly'): string {
  return variant === 'instant' ? say1Url : say2Url
}

/** PWA·Safari: say1·say2·cheer PNG 디코드 */
export function preloadNagBubbleImages(): Promise<void> {
  return loadImageAsset(say1Url).then(() =>
    Promise.all([
      loadImageAsset(say2Url),
      ...HOUSING_CHEER_IMAGE_URLS.map((url) => loadImageAsset(url)),
    ]).then(() => undefined),
  )
}

export function warmupInstantNagBubbleImage(): void {
  if (instantWarmupStarted) return
  instantWarmupStarted = true
  void loadImageAsset(say1Url)
}

export function isNagBubbleImageReady(variant: 'instant' | 'weekly'): boolean {
  return isImageAssetReady(urlForVariant(variant))
}

export function ensureNagBubbleImageReady(variant: 'instant' | 'weekly'): Promise<void> {
  return ensureImageAssetReady(urlForVariant(variant))
}

export function ensureBubbleImageReady(url: string): Promise<void> {
  return ensureImageAssetReady(url)
}

export function isBubbleImageReady(url: string): boolean {
  return isImageAssetReady(url)
}
