type Recommendation = {
  etfName: string
  reason: string
}

type RecommendationOptions = {
  monthlyRepeatSavings?: number
  totalSavingPotential?: number
  excludedEtfNames?: string[]
}

type UnitAssetOption = {
  etfName: string
  unitLabel: string
  unitPrice: number
  prefix: string
  suffix: string
}

const PENSION_ANNUAL_THRESHOLD = 6_000_000

const usEtfOptions: Recommendation[] = [
  { etfName: 'KODEX 미국S&P500TR', reason: '대표 미국 지수를 분산 추종하며 장기 적립에 유리합니다.' },
  { etfName: 'TIGER 미국나스닥100', reason: '기술 성장주 비중이 높아 장기 성장 포트폴리오에 어울립니다.' },
  { etfName: 'ACE 미국배당다우존스', reason: '배당 + 성장 균형으로 현금흐름을 함께 노릴 수 있습니다.' },
]

const unitAssetOptions: UnitAssetOption[] = [
  {
    etfName: 'KRX 금현물 / 금 시세 연동 ETF',
    unitLabel: '금',
    unitPrice: 145_000,
    prefix: '이 돈이면 금(Gold) 약 ',
    suffix: 'g을 모을 수 있었습니다.',
  },
  {
    etfName: 'KRX 은 현물 대안 / 은 ETF',
    unitLabel: '은',
    unitPrice: 1_700,
    prefix: '안전 자산인 은(Silver) 기준으로 약 ',
    suffix: 'g 적립이 가능한 금액입니다.',
  },
  {
    etfName: '해외주식 대안: 스타벅스(SBUX) 소수점 투자',
    unitLabel: '스타벅스 주식',
    unitPrice: 120_000,
    prefix: '이 금액으로 스타벅스 주식 약 ',
    suffix: '주를 모을 수 있습니다.',
  },
]

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

function pickRandomWithoutExclusion<T extends { etfName: string }>(list: T[], excludedEtfNames: Set<string>): T {
  const candidates = list.filter((item) => !excludedEtfNames.has(item.etfName))
  return pickRandom(candidates.length > 0 ? candidates : list)
}

function formatUnit(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

function getUnitAssetRecommendation(annualAmount: number, excludedEtfNames: Set<string>): Recommendation {
  const option = pickRandomWithoutExclusion(unitAssetOptions, excludedEtfNames)
  const units = Math.max(0.01, annualAmount / option.unitPrice)
  return {
    etfName: option.etfName,
    reason: `1년 절약액 기준, ${option.prefix}${formatUnit(units)}${option.suffix}`,
  }
}

export function getEtfRecommendation(amount: number, options: RecommendationOptions = {}): Recommendation {
  const monthlyRepeatSavings = options.monthlyRepeatSavings ?? amount
  const totalSavingPotential = options.totalSavingPotential ?? monthlyRepeatSavings * 12
  const excludedEtfNames = new Set(options.excludedEtfNames ?? [])
  const annualBenchmarkAmount = totalSavingPotential
  const annualSavingFromMonthly = monthlyRepeatSavings * 12
  const isPensionEligible = annualSavingFromMonthly >= PENSION_ANNUAL_THRESHOLD || totalSavingPotential >= PENSION_ANNUAL_THRESHOLD

  if (isPensionEligible && !excludedEtfNames.has('연금저축펀드(세액공제 우선)')) {
    const shouldPrioritizePension = Math.random() < 0.6
    if (shouldPrioritizePension) {
      return {
        etfName: '연금저축펀드(세액공제 우선)',
        reason: '월 50만 원 이상(연 600만 원 이상) 적립이 가능한 구간입니다. 세액공제 혜택이 있는 연금저축펀드로 노후 자산을 길게 쌓아보는 건 어떨까요?',
      }
    }
  }

  // 실물자산 비중을 소폭 낮춰 미국 지수 ETF 노출을 조금 더 높임
  const pickUnitAsset = Math.random() < 0.35
  if (pickUnitAsset) return getUnitAssetRecommendation(annualBenchmarkAmount, excludedEtfNames)
  if (annualBenchmarkAmount <= 600_000 && !excludedEtfNames.has(usEtfOptions[0].etfName)) return usEtfOptions[0]
  if (annualBenchmarkAmount <= 1_200_000 && !excludedEtfNames.has(usEtfOptions[1].etfName)) return usEtfOptions[1]
  if (annualBenchmarkAmount <= 3_000_000 && !excludedEtfNames.has(usEtfOptions[2].etfName)) return usEtfOptions[2]
  const splitOption: Recommendation = { etfName: 'KODEX 200 + TIGER 미국S&P500 분할', reason: '큰 금액은 국내/미국 지수 분할로 변동성을 완화하기 좋습니다.' }
  if (!excludedEtfNames.has(splitOption.etfName)) return splitOption
  if (annualBenchmarkAmount <= 600_000) return usEtfOptions[0]
  if (annualBenchmarkAmount <= 1_200_000) return usEtfOptions[1]
  if (annualBenchmarkAmount <= 3_000_000) return usEtfOptions[2]
  return splitOption
}
