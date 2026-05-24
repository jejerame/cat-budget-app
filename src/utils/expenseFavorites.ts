import { buildExpenseMemo } from '../data/expenseSubcategories'

export type ExpenseFavorite = {
  id: string
  name: string
  category: string
  subcategoryId: string
  /** null이면 탭 시 금액만 입력 */
  fixedAmount: number | null
}

const FAVORITES_KEY = 'expense-favorites:v1'
const USAGE_KEY_PREFIX = 'expense-fav-usage:v1:'
const MAX_FAVORITES = 10

export function loadExpenseFavorites(): ExpenseFavorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ExpenseFavorite[]
    return Array.isArray(parsed) ? parsed.slice(0, MAX_FAVORITES) : []
  } catch {
    return []
  }
}

export function saveExpenseFavorites(items: ExpenseFavorite[]): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items.slice(0, MAX_FAVORITES)))
}

export function formatFavoriteButtonLabel(fav: ExpenseFavorite): string {
  if (fav.fixedAmount != null && fav.fixedAmount > 0) {
    return `${fav.name} ${fav.fixedAmount.toLocaleString('ko-KR')}`
  }
  return fav.name
}

export function usageKey(category: string, subcategoryId: string, amount: number): string {
  return `${USAGE_KEY_PREFIX}${category}:${subcategoryId}:${amount}`
}

/** 저장 직후 호출 — 누적 횟수 반환 */
export function recordExpenseComboUsage(category: string, subcategoryId: string, amount: number): number {
  const key = usageKey(category, subcategoryId, amount)
  try {
    const prev = Number(localStorage.getItem(key) ?? '0')
    const next = prev + 1
    localStorage.setItem(key, String(next))
    return next
  } catch {
    return 1
  }
}

export function createExpenseFavorite(input: {
  name: string
  category: string
  subcategoryId: string
  fixedAmount: number | null
}): ExpenseFavorite | null {
  const list = loadExpenseFavorites()
  if (list.length >= MAX_FAVORITES) return null
  const item: ExpenseFavorite = {
    id: crypto.randomUUID(),
    name: input.name.trim() || buildExpenseMemo(input.category, input.subcategoryId),
    category: input.category,
    subcategoryId: input.subcategoryId,
    fixedAmount: input.fixedAmount,
  }
  saveExpenseFavorites([...list, item])
  return item
}

export function updateExpenseFavorite(
  id: string,
  patch: Partial<Pick<ExpenseFavorite, 'name' | 'fixedAmount' | 'category' | 'subcategoryId'>>,
): void {
  const list = loadExpenseFavorites().map((f) =>
    f.id === id
      ? {
          ...f,
          ...patch,
          name: patch.name !== undefined ? patch.name.trim() || f.name : f.name,
        }
      : f,
  )
  saveExpenseFavorites(list)
}

export function deleteExpenseFavorite(id: string): void {
  saveExpenseFavorites(loadExpenseFavorites().filter((f) => f.id !== id))
}

export const EXPENSE_FAVORITES_MAX = MAX_FAVORITES
