/** 지출 저장 직후 말풍선(say1)용 카테고리·키워드별 잔소리 */

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

export type InstantNagBucket = 'coffee' | 'taxi' | 'delivery' | 'dining' | 'impulse' | 'essential'

const COFFEE_RE = /커피|아메리카노|카페|라떼|스타벅스|americano|espresso|에스프레소/i
const TAXI_RE = /택시|taxi|우버|uber/i
const DELIVERY_RE = /배달|배민|요기요|쿠팡이츠|픽업/i
const DINING_RE = /외식|맛집|식당|레스토랑|브런치|회식/i
const IMPULSE_RE = /충동|옷|가방|여행|해외여행|이벤트|경조사|쇼핑|구매/i

function pickRandom<T extends readonly string[]>(lines: T): string {
  const i = Math.floor(Math.random() * lines.length)
  return lines[i] ?? lines[0]
}

export function resolveInstantNagBucket(category: string, memo: string): InstantNagBucket {
  const t = memo.trim()

  if (COFFEE_RE.test(t)) return 'coffee'
  if (TAXI_RE.test(t)) return 'taxi'
  if (DELIVERY_RE.test(t)) return 'delivery'
  if (DINING_RE.test(t)) return 'dining'
  if (IMPULSE_RE.test(t)) return 'impulse'

  if (category === 'living' || category === 'fixed') return 'essential'
  if (category === 'special' || category === 'self_dev' || category === 'pet') return 'impulse'
  if (category === 'couple') return 'dining'
  if (category === 'red') {
    if (COFFEE_RE.test(t)) return 'coffee'
    if (TAXI_RE.test(t)) return 'taxi'
    return 'impulse'
  }

  return 'impulse'
}

export function getInstantNagMessageForExpense(category: string, memo: string): string {
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
    default:
      return pickRandom(INSTANT_NAG_IMPULSE)
  }
}
