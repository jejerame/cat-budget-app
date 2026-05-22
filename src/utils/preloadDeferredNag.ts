import { HOUSING_CHEER_IMAGE_URLS } from '../data/housingInstantNag'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { loadImageAsset } from './imageAssetLoader'
import { POPUP_TOAST_IMAGE_URLS } from './preloadPopupToastImages'

/** 홈 이후·유휴 시간에 로드 (say·cheer·입력 팝업) */
export function preloadDeferredNagAssets(): Promise<void> {
  return Promise.all([
    loadImageAsset(say2Url),
    ...HOUSING_CHEER_IMAGE_URLS.map((url) => loadImageAsset(url)),
    ...POPUP_TOAST_IMAGE_URLS.map((url) => loadImageAsset(url)),
  ]).then(() => undefined)
}

export function preloadInstantNagSay1(): void {
  void loadImageAsset(say1Url)
}

/** 카테고리 화면에서 지출 잔소리 PNG 미리 디코드 (모바일 선행 텍스트 방지) */
export function preloadInstantNagForCategory(): void {
  void loadImageAsset(say1Url)
  void Promise.all(HOUSING_CHEER_IMAGE_URLS.map((url) => loadImageAsset(url)))
}

export { say1Url, say2Url }
