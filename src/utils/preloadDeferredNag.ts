import {
  getHousingCheerImageUrl,
  HOUSING_CHEER_IMAGE_URLS,
  resolveHousingCheerKey,
} from '../data/housingInstantNag'
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

/** 지출 입력 진입 시 say1만 선로드 (cheer·카테고리 아이콘과 디코드 경합 방지) */
export function preloadInstantNagForCategory(): void {
  void loadImageAsset(say1Url)
}

/** 즐겨찾기·즉시 저장 직전 — 잔소리 PNG 디코드 완료까지 대기 */
export function ensureInstantNagForExpenseSave(category: string, memo: string): Promise<void> {
  const tasks: Promise<boolean>[] = [loadImageAsset(say1Url)]
  if (category === 'housing') {
    const key = resolveHousingCheerKey(memo)
    tasks.push(loadImageAsset(getHousingCheerImageUrl(key)))
  }
  return Promise.all(tasks).then(() => undefined)
}

export { say1Url, say2Url }
