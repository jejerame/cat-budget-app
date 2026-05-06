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
const APP_RESET_MARKER_KEY = 'compound-nag-app-reset-v1'
const RESET_TARGET_KEYS = [
  'compound-nag-transactions',
  'compound-nag-expenses',
  'compound-nag-intensity',
  'compound-ban-period',
  'compound-saving-target-rate',
  'compound-daily-cat-splash-at',
] as const

function ensureCleanFirstRun(): void {
  const alreadyReset = localStorage.getItem(APP_RESET_MARKER_KEY) === 'done'
  if (alreadyReset) return
  RESET_TARGET_KEYS.forEach((key) => localStorage.removeItem(key))
  localStorage.setItem(APP_RESET_MARKER_KEY, 'done')
}

export function loadTransactions(): TransactionRecord[] {
  ensureCleanFirstRun()
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

  return { income, expense, saving, balance: income - expense - saving }
}
