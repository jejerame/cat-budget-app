export type TransactionType = 'income' | 'expense' | 'saving'

export type TransactionRecord = {
  id: string
  type: TransactionType
  category: string
  amount: number
  memo?: string
  createdAt: string
}

const STORAGE_KEY = 'compound-nag-transactions'

export function loadTransactions(): TransactionRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw) as TransactionRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTransactions(records: TransactionRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function createTransaction(
  type: TransactionType,
  category: string,
  amount: number,
  memo?: string,
  date = new Date(),
): TransactionRecord {
  return {
    id: crypto.randomUUID(),
    type,
    category,
    amount,
    memo,
    createdAt: date.toISOString(),
  }
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getMonthSummary(records: TransactionRecord[], date = new Date()): {
  income: number
  expense: number
  saving: number
  balance: number
  carryoverIncome: number
} {
  const y = date.getFullYear()
  const m = date.getMonth()

  const monthRecords = records.filter((item) => {
    const d = new Date(item.createdAt)
    return d.getFullYear() === y && d.getMonth() === m
  })

  const income = monthRecords.filter((x) => x.type === 'income').reduce((sum, x) => sum + x.amount, 0)
  const expense = monthRecords.filter((x) => x.type === 'expense').reduce((sum, x) => sum + x.amount, 0)
  const saving = monthRecords.filter((x) => x.type === 'saving').reduce((sum, x) => sum + x.amount, 0)
  const carryoverIncome = monthRecords
    .filter((x) => x.type === 'income' && x.category === 'carryover')
    .reduce((sum, x) => sum + x.amount, 0)

  return { income, expense, saving, balance: income - expense - saving, carryoverIncome }
}

/** 해당 월 지출이 가용 예산(수입−저축+이월)을 초과했는지 */
export function isMonthBudgetExceeded(records: TransactionRecord[], date: Date): boolean {
  const summary = getMonthSummary(records, date)
  const available = Math.max(0, summary.income - summary.saving + summary.carryoverIncome)
  if (available > 0) return summary.expense > available
  return summary.expense > 0
}

/** 가용 예산(>0)이 있을 때 지출이 그 예산을 넘었는지 — 한계 돌파(펑) 연출용 */
export function isMonthBudgetExceededWithAvailable(records: TransactionRecord[], date: Date): boolean {
  const summary = getMonthSummary(records, date)
  const available = Math.max(0, summary.income - summary.saving + summary.carryoverIncome)
  if (available <= 0) return false
  return summary.expense > available
}

/** 가용 예산이 있었는데 이번 변경으로 처음 넘김(수입 0·첫 지출은 false) */
export function didMonthBudgetJustExceedWithAvailableBudget(
  recordsBefore: TransactionRecord[],
  recordsAfter: TransactionRecord[],
  date: Date,
): boolean {
  const before = getMonthSummary(recordsBefore, date)
  const availableBefore = Math.max(0, before.income - before.saving + before.carryoverIncome)
  if (availableBefore <= 0) return false
  return (
    !isMonthBudgetExceeded(recordsBefore, date) &&
    isMonthBudgetExceeded(recordsAfter, date)
  )
}

export function getMonthBudgetRatioPercent(records: TransactionRecord[], date: Date): number {
  const summary = getMonthSummary(records, date)
  const available = Math.max(0, summary.income - summary.saving + summary.carryoverIncome)
  if (available <= 0) return summary.expense > 0 ? 100 : 0
  return (summary.expense / available) * 100
}

/** 선택한 달의 지출을 카테고리별 합산한 뒤 금액 내림차순 상위 limit개 */
export function getTopExpenseCategoriesByMonth(
  records: TransactionRecord[],
  date: Date,
  limit: number,
): Array<{ category: string; total: number }> {
  const y = date.getFullYear()
  const m = date.getMonth()
  const totals = new Map<string, number>()
  records.forEach((item) => {
    if (item.type !== 'expense') return
    const d = new Date(item.createdAt)
    if (d.getFullYear() !== y || d.getMonth() !== m) return
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount)
  })
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}
