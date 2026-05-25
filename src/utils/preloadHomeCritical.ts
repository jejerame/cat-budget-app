import ang1GaugeUrl from '../../ang1.png'
import ang2GaugeUrl from '../../ang2.png'
import happyGaugeUrl from '../../happy.png'
import jan2CatUrl from '../../jan2.png'
import janCatUrl from '../../jan1.png'
import red1CatUrl from '../../red1.png'
import redCatUrl from '../../red.png'
import supGaugeUrl from '../../sup.png'
import martCatUrl from '../../mart.png'
import houseCatUrl from '../../house.png'
import beghouseCatUrl from '../../beghouse.png'
import bookCatUrl from '../../book.png'
import tourCatUrl from '../../tour.png'
import dateCoupleCatUrl from '../../date1.png'
import dogCatUrl from '../../dog.png'
import gudokCatUrl from '../../gudok.png'
import { loadImageAsset } from './imageAssetLoader'

/** 홈 첫 화면에 보이는 아이콘 (타이틀·게이지·달력 고양이) */
export const HOME_TITLE_CAT_URL = janCatUrl
export const HOME_CALENDAR_CAT_URLS = [jan2CatUrl, red1CatUrl] as const
export const HOME_GAUGE_CAT_URLS = [
  happyGaugeUrl,
  supGaugeUrl,
  ang1GaugeUrl,
  ang2GaugeUrl,
  redCatUrl,
] as const

export const HOME_CRITICAL_PRELOAD_URLS = [
  janCatUrl,
  jan2CatUrl,
  red1CatUrl,
  happyGaugeUrl,
  supGaugeUrl,
] as const

export const CATEGORY_ICON_URLS = [
  redCatUrl,
  martCatUrl,
  dateCoupleCatUrl,
  houseCatUrl,
  beghouseCatUrl,
  bookCatUrl,
  tourCatUrl,
  dogCatUrl,
  gudokCatUrl,
] as const

function runWhenIdle(task: () => void, timeoutMs = 4000): void {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(() => task(), { timeout: timeoutMs })
  } else {
    window.setTimeout(task, 1200)
  }
}

/** 타이틀·달력·가벼운 게이지 아이콘 우선, 나머지 게이지·말풍선은 유휴 시 */
export function preloadHomeCriticalImages(): Promise<void> {
  return loadImageAsset(janCatUrl)
    .then(() => Promise.all(HOME_CALENDAR_CAT_URLS.map((url) => loadImageAsset(url))))
    .then(() =>
      Promise.all([happyGaugeUrl, supGaugeUrl].map((url) => loadImageAsset(url))),
    )
    .then(() => {
      runWhenIdle(() => {
        void Promise.all(
          [ang1GaugeUrl, ang2GaugeUrl, redCatUrl].map((url) => loadImageAsset(url)),
        )
      })
    })
}

/** 지출 카테고리 아이콘 — 홈 유휴 or 입력 진입 시 미리 디코드 */
export function preloadCategoryIcons(): void {
  void Promise.all(CATEGORY_ICON_URLS.map((url) => loadImageAsset(url)))
}
