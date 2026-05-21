import popupExpenseUrl from '../../popup1.png'
import popupSavingGoodUrl from '../../popup2.png'
import popupSavingBadUrl from '../../popup3.png'
import { ensureImageAssetReady, loadImageAsset } from './imageAssetLoader'

export const POPUP_TOAST_IMAGE_URLS = [popupExpenseUrl, popupSavingGoodUrl, popupSavingBadUrl] as const

export { popupExpenseUrl, popupSavingGoodUrl, popupSavingBadUrl }

export function preloadPopupToastImages(): Promise<void> {
  return Promise.all(POPUP_TOAST_IMAGE_URLS.map((url) => loadImageAsset(url))).then(() => undefined)
}

export function ensurePopupToastImageReady(url: string): Promise<void> {
  return ensureImageAssetReady(url)
}
