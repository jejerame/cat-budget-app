export type NagIntensity = 'normal' | 'hard' | 'spartian-lite' | 'spartian' | 'spartian-max'
export type BanPeriod = 'none' | '7days' | 'this-month' | 'next-month'

const periodLabels: Record<BanPeriod, string> = {
  none: '없음',
  '7days': '7일',
  'this-month': '이번 달 남은 기간',
  'next-month': '다음 달 전체',
}

type IntensityCopy = {
  label: string
  banListTitle: string
  banListFallback: string
  banMessage: (categoryLabel: string, amount: number, period: BanPeriod) => string
}

const intensityCopyMap: Record<NagIntensity, IntensityCopy> = {
  normal: {
    label: '보통',
    banListTitle: '다음 달 절약 권장 리스트',
    banListFallback: '전월 데이터가 부족해 권장 항목을 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원)는 ${period === 'none' ? '다음 달' : periodLabels[period]} 우선 절약 권장 항목입니다.`,
  },
  hard: {
    label: '강함',
    banListTitle: '다음 달 통제 리스트',
    banListFallback: '전월 데이터가 부족해 통제 항목을 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원) 지출은 ${periodLabels[period]} 동안 강한 통제 대상입니다.`,
  },
  'spartian-lite': {
    label: '스파르타 라이트',
    banListTitle: '스파르타 절약 통제 리스트',
    banListFallback: '전월 데이터가 부족해 스파르타 통제 항목을 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원) 소비는 ${periodLabels[period]} 금지에 준하는 통제를 적용하세요.`,
  },
  spartian: {
    label: '스파르타',
    banListTitle: '다음 달 금지 리스트',
    banListFallback: '전월 데이터가 부족해 금지 리스트를 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원)는 ${periodLabels[period]} 금지. 변명 없이 끊으세요.`,
  },
  'spartian-max': {
    label: '스파르타 맥스',
    banListTitle: '절대 금지 리스트 (Spartian Max)',
    banListFallback: '전월 데이터가 부족합니다. 데이터가 생기면 즉시 절대 금지 규칙을 적용합니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원)는 ${periodLabels[period]} 절대 금지. 이 항목 결제 버튼을 누르는 순간, 미래 자산에 직접 불을 지르는 행위입니다.`,
  },
}

export function getIntensityCopy(intensity: NagIntensity): IntensityCopy {
  return intensityCopyMap[intensity]
}

export function getBanPeriodLabel(period: BanPeriod): string {
  return periodLabels[period]
}
