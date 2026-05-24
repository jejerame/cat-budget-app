import { getCategoryLabel } from './spendingCategories'
import {
  getMonthBudgetRatioPercent,
  getMonthSummary,
  getTopExpenseCategoriesByMonth,
  isMonthBudgetExceeded,
  type TransactionRecord,
} from '../utils/transactions'
import hwaCatUrl from '../../hwa.PNG'
import ddCatUrl from '../../dd.png'

export type MonthlySettlementTone = 'over' | 'good'

export type MonthlySettlementContent = {
  monthLabel: string
  topCategoryLabel: string
  topCategoryAmount: number
  tone: MonthlySettlementTone
  message: string
  catImageUrl: string
}

const OVER_MESSAGE = '가계부 꼬라지 봐라. 너 돈 좀 쓰는구나? 답이 없다. 답이 없어.'
const GOOD_MESSAGE = '이번 달은 좀 낫네. 지출 요요 안오도록 조심!'

/** 가용 예산 대비 80% 이상이면 탕진·과소비 경고 구간 */
const HIGH_SPEND_RATIO_PERCENT = 80

export function isLastDayOfMonth(date: Date): boolean {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return next.getMonth() !== date.getMonth()
}

export function monthlySettlementStorageKey(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  return `monthly-settlement-shown:v1:${y}-${String(m).padStart(2, '0')}`
}

function isTangjinTone(records: TransactionRecord[], monthDate: Date): boolean {
  if (isMonthBudgetExceeded(records, monthDate)) return true
  return getMonthBudgetRatioPercent(records, monthDate) >= HIGH_SPEND_RATIO_PERCENT
}

export function buildMonthlySettlement(
  records: TransactionRecord[],
  today: Date = new Date(),
): MonthlySettlementContent | null {
  if (!isLastDayOfMonth(today)) return null

  const monthDate = new Date(today.getFullYear(), today.getMonth(), 1)
  const summary = getMonthSummary(records, monthDate)
  if (summary.expense <= 0) return null

  const top = getTopExpenseCategoriesByMonth(records, monthDate, 1)[0]
  if (!top) return null

  const over = isTangjinTone(records, monthDate)
  const monthLabel = `${today.getFullYear()}년 ${today.getMonth() + 1}월`

  return {
    monthLabel,
    topCategoryLabel: getCategoryLabel(top.category),
    topCategoryAmount: top.total,
    tone: over ? 'over' : 'good',
    message: over ? OVER_MESSAGE : GOOD_MESSAGE,
    catImageUrl: over ? hwaCatUrl : ddCatUrl,
  }
}
