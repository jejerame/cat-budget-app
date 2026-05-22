import { ensureImageAssetReady, isImageAssetReady } from './imageAssetLoader'
import { preloadDeferredNagAssets, preloadInstantNagSay1, say1Url, say2Url } from './preloadDeferredNag'

export { say1Url, say2Url }

export function preloadNagBubbleImages(): Promise<void> {
  return preloadDeferredNagAssets()
}

export function warmupInstantNagBubbleImage(): void {
  preloadInstantNagSay1()
}

export function isNagBubbleImageReady(variant: 'instant' | 'weekly'): boolean {
  const url = variant === 'instant' ? say1Url : say2Url
  return isImageAssetReady(url)
}

export function ensureNagBubbleImageReady(variant: 'instant' | 'weekly'): Promise<void> {
  const url = variant === 'instant' ? say1Url : say2Url
  return ensureImageAssetReady(url)
}

export function ensureBubbleImageReady(url: string): Promise<void> {
  return ensureImageAssetReady(url)
}

export function isBubbleImageReady(url: string): boolean {
  return isImageAssetReady(url)
}
