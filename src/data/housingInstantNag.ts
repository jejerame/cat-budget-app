import cheer1Url from '../../cheer1.png'
import cheer2Url from '../../cheer2.png'
import cheer3Url from '../../cheer3.png'

export type HousingCheerKey = 'rent' | 'loan' | 'default'

const HOUSING_CHEER_IMAGE: Record<HousingCheerKey, string> = {
  rent: cheer1Url,
  loan: cheer2Url,
  default: cheer3Url,
}

const HOUSING_MESSAGES: Record<HousingCheerKey, readonly string[]> = {
  rent: [
    '월세 또 나갔구나. 집은 지키는 중이니까, 다른 데서만 조금 아껴 보자.',
    '매달 나가는 월세, 메모에 남겨 둬서 통장이 헷갈리지 않게 하자.',
    '월세는 피할 수 없어. 대신 이번 달 변동 지출만 같이 챙기자.',
  ],
  loan: [
    '대출 이자… 은행이 또 웃겠다. 원금 상환 계획은 그대로 가고 있지?',
    '대출금·이자는 기록만 잘 해도 돈이 어디로 새는지 보인다.',
    '이자 납부는 필수야. 다음 달 상환 일정도 한번 더 확인해 봐.',
  ],
  default: [
    '주거비는 꼭 필요한 지출이야. 메모에 월세·대출이자를 적어주면 더 잘 챙겨줄게.',
    '집 관련 지출이구나. 월세인지 대출인지 메모에 적어 두면 맞춤 잔소리가 나와.',
    '주거 카테고리 선택 완료! 메모에 월세나 대출 키워드를 넣어 주면 더 정확해.',
  ],
}

function pickRandom(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0]
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

export function getHousingInstantNagMessage(key: HousingCheerKey): string {
  return pickRandom(HOUSING_MESSAGES[key])
}

export const HOUSING_CHEER_IMAGE_URLS = Object.values(HOUSING_CHEER_IMAGE)
