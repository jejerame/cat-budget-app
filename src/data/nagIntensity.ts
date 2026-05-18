export type NagIntensity = 'spartian-lite' | 'spartian' | 'spartian-max'
export type BanPeriod = 'none' | '7days' | 'this-month' | 'next-month'

const periodLabels: Record<BanPeriod, string> = {
  none: '없음',
  '7days': '7일',
  'this-month': '이번 달 남은 기간',
  'next-month': '다음 달 전체',
}

export type NagIntensityUiOption = {
  value: NagIntensity
  label: string
  locked: boolean
}

/** 설정 화면에 보이는 3단계 (상위 2단계는 준비 중·비활성) */
export const NAG_INTENSITY_UI_OPTIONS: NagIntensityUiOption[] = [
  { value: 'spartian-lite', label: 'spartian-lite', locked: false },
  { value: 'spartian', label: 'spartian', locked: true },
  { value: 'spartian-max', label: 'spartian-max', locked: true },
]

const lockedValues = new Set(
  NAG_INTENSITY_UI_OPTIONS.filter((o) => o.locked).map((o) => o.value),
)

export function isNagIntensityLocked(intensity: NagIntensity): boolean {
  return lockedValues.has(intensity)
}

/** localStorage·백업 값 → 실제 선택 가능한 수위 (잠금·구버전은 라이트) */
export function normalizeNagIntensity(stored: string | null | undefined): NagIntensity {
  if (stored === 'spartian-lite') return 'spartian-lite'
  return 'spartian-lite'
}

/**
 * 실제 잔소리 문구에 쓰는 수위.
 * 잠금 단계는 라이트와 동일한 문구를 쓰고, 유료 오픈 시 풀·맵만 확장하면 됨.
 */
export function resolveContentIntensity(selected: NagIntensity): NagIntensity {
  if (isNagIntensityLocked(selected)) return 'spartian-lite'
  return selected
}

type IntensityCopy = {
  label: string
  banListTitle: string
  banListFallback: string
  banMessage: (categoryLabel: string, amount: number, period: BanPeriod) => string
}

const intensityCopyMap: Record<NagIntensity, IntensityCopy> = {
  'spartian-lite': {
    label: '스파르탄 라이트',
    banListTitle: '스파르탄 절약 통제 리스트',
    banListFallback: '전월 데이터가 부족해 스파르탄 통제 항목을 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원) 소비는 ${periodLabels[period]} 금지에 준하는 통제를 적용하세요.`,
  },
  spartian: {
    label: '스파르탄',
    banListTitle: '다음 달 금지 리스트',
    banListFallback: '전월 데이터가 부족해 금지 리스트를 만들지 못했습니다.',
    banMessage: (categoryLabel, amount, period) =>
      `${categoryLabel}(${Math.round(amount).toLocaleString('ko-KR')}원)는 ${periodLabels[period]} 금지. 변명 없이 끊으세요.`,
  },
  'spartian-max': {
    label: '스파르탄 맥스',
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

/** 복리 모달 등: 선택 수위를 콘텐츠 수위로 맞춘 뒤 반환 (현재는 전 구간 라이트) */
export function getEffectiveIntensity(
  _level: 'strong' | 'coach' | 'info',
  selected: NagIntensity,
): NagIntensity {
  return resolveContentIntensity(selected)
}
