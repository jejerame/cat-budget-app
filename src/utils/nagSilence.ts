import type { BanPeriod } from '../data/nagIntensity'

export const BAN_PERIOD_STORAGE_KEY = 'compound-ban-period'
export const BAN_SILENCED_UNTIL_KEY = 'compound-ban-period-until'
export const BAN_PERIOD_MIGRATION_V2_KEY = 'compound-ban-period-v2'

export type BanPeriodUiOption = {
  value: BanPeriod
  label: string
  locked: boolean
}

/** 설정 화면 옵션 (상위 2개는 유료 예정·비활성, 로직은 유지) */
export const BAN_PERIOD_UI_OPTIONS: BanPeriodUiOption[] = [
  { value: 'none', label: '없음 (잔소리 표시)', locked: false },
  { value: '7days', label: '7일 동안 잔소리 끄기', locked: false },
  { value: 'this-month', label: '이번 달 남은 기간 잔소리 끄기', locked: true },
  { value: 'next-month', label: '다음 달 전체 잔소리 끄기', locked: true },
]

const lockedBanPeriods = new Set(
  BAN_PERIOD_UI_OPTIONS.filter((o) => o.locked).map((o) => o.value),
)

export function isBanPeriodLocked(period: BanPeriod): boolean {
  return lockedBanPeriods.has(period)
}

/** 현재 버전에서 선택·저장 가능한 값만 반환 */
export function normalizeSelectableBanPeriod(stored: string | null | undefined): BanPeriod {
  if (stored === 'none' || stored === '7days') return stored
  return 'none'
}

export function isActiveSilencePeriod(value: string | null | undefined): value is BanPeriod {
  return value === '7days' || value === 'this-month' || value === 'next-month'
}

/** 복리 모달 등 잔소리 문구용 기간(금지 모드가 아닐 때) */
export function getNagMessageBanPeriod(period: BanPeriod): Exclude<BanPeriod, 'none'> {
  return period === 'none' ? 'next-month' : period
}

export function computeSilencedUntil(period: Exclude<BanPeriod, 'none'>, from = new Date()): Date {
  const end = new Date(from)
  if (period === '7days') {
    end.setDate(end.getDate() + 7)
    end.setHours(23, 59, 59, 999)
    return end
  }
  if (period === 'this-month') {
    end.setMonth(end.getMonth() + 1, 0)
    end.setHours(23, 59, 59, 999)
    return end
  }
  end.setMonth(end.getMonth() + 2, 0)
  end.setHours(23, 59, 59, 999)
  return end
}

export function readSilencedUntil(): number | null {
  try {
    const raw = localStorage.getItem(BAN_SILENCED_UNTIL_KEY)
    if (!raw) return null
    const t = new Date(raw).getTime()
    return Number.isFinite(t) ? t : null
  } catch {
    return null
  }
}

export function persistSilenceWindow(period: Exclude<BanPeriod, 'none'>): void {
  try {
    localStorage.setItem(BAN_SILENCED_UNTIL_KEY, computeSilencedUntil(period).toISOString())
  } catch {
    /* ignore */
  }
}

export function clearSilenceWindow(): void {
  try {
    localStorage.removeItem(BAN_SILENCED_UNTIL_KEY)
  } catch {
    /* ignore */
  }
}

/** none이 아니고, 아직 침묵 종료 시각 전이면 잔소리(말풍선·토스트·복리 모달 등) 끔 */
export function areNagsSilenced(period: BanPeriod, now = Date.now()): boolean {
  if (period === 'none') return false
  if (!isActiveSilencePeriod(period)) return false
  const until = readSilencedUntil()
  if (until == null) return true
  return now < until
}

export function loadInitialBanPeriod(): BanPeriod {
  try {
    if (!localStorage.getItem(BAN_PERIOD_MIGRATION_V2_KEY)) {
      localStorage.setItem(BAN_PERIOD_MIGRATION_V2_KEY, '1')
      localStorage.setItem(BAN_PERIOD_STORAGE_KEY, 'none')
      clearSilenceWindow()
      return 'none'
    }
  } catch {
    /* ignore */
  }

  try {
    const stored = localStorage.getItem(BAN_PERIOD_STORAGE_KEY)
    const selectable = normalizeSelectableBanPeriod(stored)
    if (selectable !== stored) {
      localStorage.setItem(BAN_PERIOD_STORAGE_KEY, selectable)
      if (selectable === 'none') clearSilenceWindow()
    }
    if (selectable === 'none') return 'none'
    if (!areNagsSilenced(selectable)) {
      localStorage.setItem(BAN_PERIOD_STORAGE_KEY, 'none')
      clearSilenceWindow()
      return 'none'
    }
    return selectable
  } catch {
    return 'none'
  }
}

export function applyBanPeriodChange(next: BanPeriod): void {
  if (isBanPeriodLocked(next)) return
  try {
    localStorage.setItem(BAN_PERIOD_STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  if (next === 'none') {
    clearSilenceWindow()
    return
  }
  if (isActiveSilencePeriod(next)) {
    persistSilenceWindow(next)
  }
}
