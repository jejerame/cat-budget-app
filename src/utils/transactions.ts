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
