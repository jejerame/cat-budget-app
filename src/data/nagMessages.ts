type NagBucket = {
  maxAmount: number
  messages: string[]
}

const nagBuckets: NagBucket[] = [
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
]

function pickRandom<T>(items: T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length)
  return items[randomIndex]
}

export function getRandomNagByAmount(amount: number): string {
  const bucket = nagBuckets.find((item) => amount <= item.maxAmount) ?? nagBuckets[nagBuckets.length - 1]
  return pickRandom(bucket.messages)
}
