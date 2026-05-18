import type { NagIntensity } from './nagIntensity'
import { getHousingInstantNagMessage, resolveHousingCheerKey } from './housingInstantNag'
import { resolveContentIntensity } from './nagIntensity'

/** 지출 저장 직후 말풍선(say1)용 — 카테고리 우선, 메모는 같은 카테고리 안에서만 보조 (문구 풀 = 스파르탄 라이트) */

export const INSTANT_NAG_COFFEE = [
  '또 마셨구나?',
  '또야? 내일 지켜본다',
  '차라리 커피숍을 차려라',
  '이 정도면 네 몸속에 피 대신 아메리카노가 흐르겠어.',
  '스타벅스 주주니? 배당금 받는 거 아니면 적당히 해.',
] as const

export const INSTANT_NAG_TAXI = [
  '또 택시 탔구나? 다리는 뒀다 어디 쓰게?',
  '버스나 지하철이란 것도 있단다',
  '또 늦잠 잤지? 좀 걸어라.',
  '네 통장도 택시 미터기처럼 올라가는 속도가 예사롭지 않네.',
] as const

export const INSTANT_NAG_DELIVERY = [
  '픽업은 생각 안 해봤니?',
  '치킨은 살 안 쪄. 너만 쪄.',
  '또 배달 시켰어? 배가 많이 고팠구나.',
  '라이더 분들이 너희 집 주소 외웠겠다. 그만 좀 불러라.',
] as const

export const INSTANT_NAG_DINING = [
  '입은 즐거운데 통장은 눈물 흘리는 중. 맛은 있더냐?',
  '담엔 집밥 먹을 거지?',
  '물가 비싸지? 알면서도 사먹었어?',
] as const

export const INSTANT_NAG_ESSENTIAL = ['너 지금 필수라고 합리화 중이지?'] as const

export const INSTANT_NAG_IMPULSE = ['고생한 나를 위한 선물? 그냥 충동구매야.'] as const

export const INSTANT_NAG_COUPLE = [
  '데이트비도 통장이 다 기억해.',
  '좋은 추억이지만, 다음엔 공짜 산책 데이트는 어때?',
  '사랑도 중요하지만 이번 달 데이트 예산도 같이 챙기자.',
  '설렘은 살고, 통장 잔고도 살아남게 해 줘.',
] as const

export const INSTANT_NAG_FIXED = [
  '통신·보험 고정비는 피할 순 없지만, 요금이 합리적인지는 봐야지.',
  '매달 나가는 돈이야. 요금제·보험료 변동 없는지 한번 점검해 봐.',
  '더 싼 통신 플랜이나 보험 상품은 없는지 찾아봤어?',
] as const

export const INSTANT_NAG_SPECIAL = [
  '특별한 하루였구나. 다음 달 통장도 미리 생각해 둬.',
  '이벤트·여행은 한 번에 크게 나가. 예산 상한은 정했지?',
  '추억은 소중해. 다만 카드 한도도 같이 챙겨.',
] as const

export const INSTANT_NAG_SELF_DEV = [
  '자기계발 멋지다. 지갑도 같이 단련 중이네.',
  '성장 투자 좋아. 이번 달 취미·건강 예산은 아직 괜찮아?',
  '나를 위한 지출이지만, 반복되면 습관이 돼.',
] as const

export const PET_INSTANT_LARGE_THRESHOLD = 150_000

const PET_INSTANT_LARGE = [
  '아이를 위한 마음은 알겠지만, 집사가 파산하면 아이도 슬퍼해요!',
  '사랑은 충분해요. 이번 결제는 한 번만 더 계산해보고 지켜요.',
] as const

const PET_INSTANT_TREATS = [
  '간식 많이 사준다고 사랑이 비례하는 건 아니에요. 아이 비만 오면 병원비가 더 나옵니다!',
] as const

const PET_INSTANT_TOY = [
  '집사야, 저번에 산 장난감도 아직 새거다. 아이는 새 옷보다 너랑 5분 더 노는 걸 좋아해.',
] as const

const PET_INSTANT_MEDICAL = [
  '이건 아끼지 마세요. 대신 다음 달엔 집사님 커피값을 줄여서 메꿉시다. 아이는 죄가 없으니까요!',
] as const

const PET_INSTANT_GROOMING = [
  '댕댕이 미용은 풀코스로, 집사님 머리는 셀프 컷? 적당히 합시다. 같이 오래 살려면 집사 통장도 지켜야죠.',
] as const

const PET_INSTANT_DEFAULT = '아이를 챙기는 마음은 최고예요. 다만 집사 통장 체력도 같이 관리해요.'

export type InstantNagBucket =
  | 'coffee'
  | 'taxi'
  | 'delivery'
  | 'dining'
  | 'essential'
  | 'impulse'
  | 'couple'
  | 'pet'
  | 'fixed'
  | 'housing'
  | 'special'
  | 'self_dev'

const COFFEE_RE = /커피|아메리카노|카페|라떼|스타벅스|americano|espresso|에스프레소/i
const TAXI_RE = /택시|taxi|우버|uber/i
const DELIVERY_RE = /배달|배민|요기요|쿠팡이츠|픽업/i
const DINING_RE = /외식|맛집|식당|레스토랑|브런치|회식|데이트|영화|카페데이트/i

function pickRandom<T extends readonly string[]>(lines: T): string {
  const i = Math.floor(Math.random() * lines.length)
  return lines[i] ?? lines[0]
}

/** RED·생활만 메모 키워드로 세부 버킷. 그 외 카테고리는 메모와 무관하게 고정 버킷 */
export function resolveInstantNagBucket(category: string, memo: string): InstantNagBucket {
  const t = memo.trim()

  switch (category) {
    case 'red':
      if (COFFEE_RE.test(t)) return 'coffee'
      if (TAXI_RE.test(t)) return 'taxi'
      if (DELIVERY_RE.test(t)) return 'delivery'
      if (DINING_RE.test(t)) return 'dining'
      return 'impulse'

    case 'living':
      if (DELIVERY_RE.test(t)) return 'delivery'
      if (DINING_RE.test(t)) return 'dining'
      if (COFFEE_RE.test(t)) return 'coffee'
      if (TAXI_RE.test(t)) return 'taxi'
      return 'essential'

    case 'couple':
      return 'couple'

    case 'pet':
      return 'pet'

    case 'fixed':
      return 'fixed'

    case 'housing':
      return 'housing'

    case 'special':
      return 'special'

    case 'self_dev':
      return 'self_dev'

    default:
      return 'impulse'
  }
}

export function getPetInstantNagMessage(amount: number, memo: string): string {
  const normalized = memo.toLowerCase()
  if (amount >= PET_INSTANT_LARGE_THRESHOLD) return pickRandom(PET_INSTANT_LARGE)
  if (['간식', '사료', '캔', '츄르'].some((kw) => normalized.includes(kw))) {
    return pickRandom(PET_INSTANT_TREATS)
  }
  if (['장난감', '옷', '리드줄', '하네스'].some((kw) => normalized.includes(kw))) {
    return pickRandom(PET_INSTANT_TOY)
  }
  if (['병원', '약', '진료', '접종'].some((kw) => normalized.includes(kw))) {
    return pickRandom(PET_INSTANT_MEDICAL)
  }
  if (['미용', '스파', '향수', '악세', '액세'].some((kw) => normalized.includes(kw))) {
    return pickRandom(PET_INSTANT_GROOMING)
  }
  return PET_INSTANT_DEFAULT
}

export function getInstantNagMessageForExpense(
  category: string,
  memo: string,
  amount = 0,
  selectedIntensity: NagIntensity = 'spartian-lite',
): string {
  void resolveContentIntensity(selectedIntensity)
  const bucket = resolveInstantNagBucket(category, memo)
  switch (bucket) {
    case 'coffee':
      return pickRandom(INSTANT_NAG_COFFEE)
    case 'taxi':
      return pickRandom(INSTANT_NAG_TAXI)
    case 'delivery':
      return pickRandom(INSTANT_NAG_DELIVERY)
    case 'dining':
      return pickRandom(INSTANT_NAG_DINING)
    case 'essential':
      return pickRandom(INSTANT_NAG_ESSENTIAL)
    case 'couple':
      return pickRandom(INSTANT_NAG_COUPLE)
    case 'pet':
      return getPetInstantNagMessage(amount, memo)
    case 'fixed':
      return pickRandom(INSTANT_NAG_FIXED)
    case 'housing':
      return getHousingInstantNagMessage(resolveHousingCheerKey(memo))
    case 'special':
      return pickRandom(INSTANT_NAG_SPECIAL)
    case 'self_dev':
      return pickRandom(INSTANT_NAG_SELF_DEV)
    default:
      return pickRandom(INSTANT_NAG_IMPULSE)
  }
}
