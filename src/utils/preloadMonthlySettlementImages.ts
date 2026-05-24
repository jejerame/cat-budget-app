import hwaCatUrl from '../../hwa.PNG'
import ddCatUrl from '../../dd.png'
import { loadImageAsset } from './imageAssetLoader'

export const MONTHLY_SETTLEMENT_CAT_URLS = [hwaCatUrl, ddCatUrl] as const

export { hwaCatUrl, ddCatUrl }

/** 월말 결산 고양이(hwa/dd) — 홈 유휴·결산 직전 디코드 */
export function preloadMonthlySettlementImages(): Promise<void> {
  return Promise.all(MONTHLY_SETTLEMENT_CAT_URLS.map((url) => loadImageAsset(url))).then(() => undefined)
}

export function ensureMonthlySettlementCatReady(url: string): Promise<void> {
  return loadImageAsset(url).then(() => undefined)
}
