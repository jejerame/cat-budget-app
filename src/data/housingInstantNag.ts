/** 월세·대출·주거 cheer — 프로젝트 루트 `cheer1.png` `cheer2.png` `cheer3.png` 교체.
 *  누끼(바깥 투명) PNG만 사용. 자동 여백/흰색 제거 스크립트는 말풍선 안쪽 흰색까지 깨뜨리므로 적용 금지. */
import cheer1Url from '../../cheer1.png'
import cheer2Url from '../../cheer2.png'
import cheer3Url from '../../cheer3.png'

export type HousingCheerKey = 'rent' | 'loan' | 'default'

const HOUSING_CHEER_IMAGE: Record<HousingCheerKey, string> = {
  rent: cheer1Url,
  loan: cheer2Url,
  default: cheer3Url,
}

/** cheer PNG에 문구가 포함되어 있음 — 스크린리더용만 사용 */
const HOUSING_CHEER_ARIA: Record<HousingCheerKey, string> = {
  rent: '월세 지출 잔소리',
  loan: '대출 이자·대출금 지출 잔소리',
  default: '주거 지출 잔소리',
}

/** 조건 A: 월세 → cheer1 / B: 대출이자·대출금 → cheer2 / C: 그 외 → cheer3 */
export function resolveHousingCheerKey(memo: string): HousingCheerKey {
  const text = memo.trim()
  if (!text) return 'default'
  if (text.includes('월세')) return 'rent'
  if (text.includes('대출이자') || text.includes('대출금')) return 'loan'
  return 'default'
}

export function getHousingCheerImageUrl(key: HousingCheerKey): string {
  return HOUSING_CHEER_IMAGE[key]
}

export function getHousingCheerAriaLabel(key: HousingCheerKey): string {
  return HOUSING_CHEER_ARIA[key]
}

export const HOUSING_CHEER_IMAGE_URLS = Object.values(HOUSING_CHEER_IMAGE)
