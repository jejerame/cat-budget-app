import type { TransactionRecord } from '../utils/transactions'
import type { NagIntensity } from './nagIntensity'
import { resolveContentIntensity } from './nagIntensity'

type NagBucket = {
  maxAmount: number
  messages: string[]
}

const nagBucketsByTier: Record<NagIntensity, NagBucket[]> = {
  'spartian-lite': [
    {
      maxAmount: 10_000,
      messages: [
        '작은 돈이라고 무시하면 큰 돈이 되어 돌아온다. 오늘부터 바로 끊자.',
        '지금 웃고 넘긴 1만원이, 10년 뒤엔 울게 만든다.',
        '사소한 지출이 습관이 되면 통장도 습관적으로 얇아진다.',
      ],
    },
    {
      maxAmount: 50_000,
      messages: [
        '이 정도면 기분 소비가 아니라 자산 파괴의 시작이다.',
        '5만원은 순간이고, 후회는 복리로 쌓인다.',
        '지금 한 번 참으면 다음 달 숨통이 열린다.',
      ],
    },
    {
      maxAmount: 100_000,
      messages: [
        '이 지출은 오늘의 편안함을 위해 미래의 여유를 팔아버리는 선택이다.',
        '한 번의 10만원은 그냥 소비가 아니라 투자 기회 포기 선언이다.',
        '이 돈이 그냥 스쳐 지나가도 되는 금액인지 다시 생각해라.',
      ],
    },
    {
      maxAmount: Number.POSITIVE_INFINITY,
      messages: [
        '큰돈을 충동적으로 쓰는 순간, 통장은 네 편이 아니다.',
        '이 금액은 소비가 아니라 자산 계획을 흔드는 사건이다.',
        '큰 지출에는 큰 후회가 따라온다. 이번 달 전략을 다시 짜라.',
      ],
    },
  ],
  spartian: [],
  'spartian-max': [],
}

const BUDGET_GAUGE_LINES: Record<NagIntensity, string[]> = {
  'spartian-lite': [
    '좋아, 잘하고 있어. 이대로만 아껴 쓰자! ✨',
    '어어? 슬슬 쓰는 게 늘어나는데? 지켜보고 있다. 👀',
    '잠깐! 벌써 절반 넘게 썼어. 정신 차려, 집사! ⚠️',
    '지갑 닫아! 지금 안 멈추면 이번 달은 끝이야! 🚫',
    '한도 끝이야! 더 쓰면 통장이 비명 지를 거다! 💀',
  ],
  spartian: [],
  'spartian-max': [],
}

const BUDGET_GAUGE_OVER_LINE: Record<NagIntensity, string> = {
  'spartian-lite': '에휴, 내 팔자야... 결국 다 썼구나? 포기다, 포기! 🔥',
  spartian: '',
  'spartian-max': '',
}

const WEEKLY_SETTLEMENT: Record<NagIntensity, { worse: string; better: string }> = {
  'spartian-lite': {
    worse: '지난주보다 더 썼네? 그러다 거지 꼴 못 면한다!',
    better: '칭찬해. 그래도 정신 단디 똑바로 차리자.',
  },
  spartian: { worse: '', better: '' },
  'spartian-max': { worse: '', better: '' },
}

const PETTY_NAG_QUOTES: Record<NagIntensity, readonly string[]> = {
  'spartian-lite': [
    '다 꼭 필요한 거였어? 다시 한 번 확인해 봐. 정신 똑바로 붙들고.',
    '소비는 순간이지만 영수증은 영원하지.',
    '덮어놓고 쓰다 보면 거지 꼴 못 면한다',
  ],
  spartian: [],
  'spartian-max': [],
}

const SPLASH_BUBBLE_MESSAGES: Record<NagIntensity, readonly string[]> = {
  'spartian-lite': ['샀니? 샀어?', '그게 꼭 필요해?', '1억 안 모을 거야?', '또 샀어?'],
  spartian: [],
  'spartian-max': [],
}

const RED_REFLECTION_BY_MEMO: Record<NagIntensity, { taxi: string; coffee: string; fashion: string; default: string }> = {
  'spartian-lite': {
    taxi: '두 번 탈 거 한 번으로 줄이세요. 기본요금 거리는 튼튼한 두 다리로!',
    coffee: '카페인 수혈도 적당히! 내일은 집에서 타온 커피 어때요?',
    fashion: '인스타 보고 산 거 아니죠? 결제 전 10초만 더 고민하세요.',
    default: '지금 지출도 기록하면 통제할 수 있어요. 다음 결제 전 10초만 더 생각해봐요.',
  },
  spartian: { taxi: '', coffee: '', fashion: '', default: '' },
  'spartian-max': { taxi: '', coffee: '', fashion: '', default: '' },
}

function pickRandom<T>(items: readonly T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length)
  return items[randomIndex]
}

function poolForTier<T>(pools: Record<NagIntensity, readonly T[]>, selected: NagIntensity): readonly T[] {
  const tier = resolveContentIntensity(selected)
  const list = pools[tier]
  if (list && list.length > 0) return list
  return pools['spartian-lite']
}

function bucketsForTier(selected: NagIntensity): NagBucket[] {
  const tier = resolveContentIntensity(selected)
  const buckets = nagBucketsByTier[tier]
  if (buckets.length > 0) return buckets
  return nagBucketsByTier['spartian-lite']
}

export function getRandomNagByAmount(amount: number, selected: NagIntensity): string {
  const buckets = bucketsForTier(selected)
  const bucket = buckets.find((item) => amount <= item.maxAmount) ?? buckets[buckets.length - 1]
  return pickRandom(bucket.messages)
}

export function getBudgetGaugeNagLine(
  ratioPercent: number,
  tierIndex: number,
  selected: NagIntensity,
): string {
  const tier = resolveContentIntensity(selected)
  if (ratioPercent > 100) {
    return BUDGET_GAUGE_OVER_LINE[tier] || BUDGET_GAUGE_OVER_LINE['spartian-lite']
  }
  const lines = poolForTier(BUDGET_GAUGE_LINES, selected)
  return lines[tierIndex] ?? lines[0]
}

export function getPettyNagQuote(seed: number, selected: NagIntensity): string {
  const quotes = poolForTier(PETTY_NAG_QUOTES, selected)
  const idx = Math.abs(seed) % quotes.length
  return quotes[idx] ?? quotes[0]
}

export function getSplashBubbleMessage(selected: NagIntensity): string {
  const messages = poolForTier(SPLASH_BUBBLE_MESSAGES, selected)
  return pickRandom(messages)
}

export function getRedReflectionComment(memo: string, selected: NagIntensity): string {
  const tier = resolveContentIntensity(selected)
  const copy = RED_REFLECTION_BY_MEMO[tier].taxi
    ? RED_REFLECTION_BY_MEMO[tier]
    : RED_REFLECTION_BY_MEMO['spartian-lite']
  const normalized = memo.toLowerCase()
  if (normalized.includes('택시')) return copy.taxi
  if (normalized.includes('커피')) return copy.coffee
  if (['옷', '가방', '화장품'].some((keyword) => normalized.includes(keyword))) return copy.fashion
  return copy.default
}

export function getExpenseModalNagMessages(
  expenseTotal: number,
  nonEssentialRate: number,
  formatWon: (n: number) => string,
): string[] {
  return [
    `이번 달 총 지출은 ${formatWon(expenseTotal)}이야. 정말 다 필요한 거였어?`,
    `이 중에서 비필수 지출이 ${nonEssentialRate}%네? 정신 안 차려?`,
  ]
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function sumExpenseBetween(transactions: TransactionRecord[], from: Date, toExclusive: Date): number {
  const a = from.getTime()
  const b = toExclusive.getTime()
  return transactions
    .filter((r) => {
      if (r.type !== 'expense') return false
      const t = new Date(r.createdAt).getTime()
      return t >= a && t < b
    })
    .reduce((s, r) => s + r.amount, 0)
}

export function getWeeklySettlementMessageFromSums(
  lastSum: number,
  prevSum: number,
  selected: NagIntensity,
): string {
  const tier = resolveContentIntensity(selected)
  const lines = WEEKLY_SETTLEMENT[tier].worse ? WEEKLY_SETTLEMENT[tier] : WEEKLY_SETTLEMENT['spartian-lite']
  if (lastSum > prevSum) return lines.worse
  return lines.better
}

/** 일요일: 직전 7일 vs 그 이전 7일 지출 합계 비교 문구 (비교할 지출이 없으면 null) */
export function getWeeklySettlementNagText(
  transactions: TransactionRecord[],
  today: Date,
  selected: NagIntensity,
): string | null {
  if (today.getDay() !== 0) return null
  const end = startOfLocalDay(today)
  const lastStart = new Date(end)
  lastStart.setDate(lastStart.getDate() - 7)
  const prevStart = new Date(lastStart)
  prevStart.setDate(prevStart.getDate() - 7)
  const lastSum = sumExpenseBetween(transactions, lastStart, end)
  const prevSum = sumExpenseBetween(transactions, prevStart, lastStart)
  if (lastSum === 0 && prevSum === 0) return null
  return getWeeklySettlementMessageFromSums(lastSum, prevSum, selected)
}
