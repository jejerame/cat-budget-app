export type ExpenseRecord = {
  id: string
  category: string
  amount: number
  createdAt: string
}

const STORAGE_KEY = 'compound-nag-expenses'

export function loadExpenses(): ExpenseRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as ExpenseRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveExpenses(expenses: ExpenseRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses))
}

export function createExpense(category: string, amount: number, date = new Date()): ExpenseRecord {
  return {
    id: crypto.randomUUID(),
    category,
    amount,
    createdAt: date.toISOString(),
  }
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthTotal(expenses: ExpenseRecord[], monthKey: string): number {
  return expenses
    .filter((item) => toMonthKey(new Date(item.createdAt)) === monthKey)
    .reduce((sum, item) => sum + item.amount, 0)
}

export function getMonthExpenses(expenses: ExpenseRecord[], monthKey: string): ExpenseRecord[] {
  return expenses.filter((item) => toMonthKey(new Date(item.createdAt)) === monthKey)
}

export function getTopCategoriesByMonth(
  expenses: ExpenseRecord[],
  monthKey: string,
  limit: number,
): Array<{ category: string; totalAmount: number }> {
  const totals = new Map<string, number>()

  getMonthExpenses(expenses, monthKey).forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount)
  })

  return [...totals.entries()]
    .map(([category, totalAmount]) => ({ category, totalAmount }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit)
}
