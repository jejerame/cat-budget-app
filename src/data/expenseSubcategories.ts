/** 지출 카테고리별 서브카테고리 — memo에는 label(기타는 직접 입력) 저장 → instantNagBubbles 키워드 연동 */

export type ExpenseSubcategoryDef = {
  id: string
  label: string
}

export const EXPENSE_CATEGORY_KEYS = [
  'red',
  'living',
  'couple',
  'fixed',
  'housing',
  'self_dev',
  'special',
  'pet',
  'subscription',
] as const

export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number]

export const EXPENSE_CATEGORY_SHORT_LABELS: Record<ExpenseCategoryKey, string> = {
  red: 'RED',
  living: '생활',
  couple: '커플',
  fixed: '고정',
  housing: '주거',
  self_dev: '자기개발',
  special: '특별',
  pet: '내새끼',
  subscription: '구독',
}

export const EXPENSE_SUBCATEGORIES: Record<ExpenseCategoryKey, ExpenseSubcategoryDef[]> = {
  red: [
    { id: 'coffee', label: '커피' },
    { id: 'taxi', label: '택시' },
    { id: 'impulse', label: '충동구매' },
    { id: 'other', label: '기타' },
  ],
  living: [
    { id: 'delivery', label: '배달' },
    { id: 'dining', label: '외식' },
    { id: 'medical', label: '의료' },
    { id: 'essential', label: '필수품' },
    { id: 'grocery', label: '장보기' },
    { id: 'other', label: '기타' },
  ],
  couple: [
    { id: 'date', label: '데이트비용' },
    { id: 'other', label: '기타' },
  ],
  fixed: [
    { id: 'telecom', label: '통신' },
    { id: 'insurance', label: '보험' },
    { id: 'other', label: '기타' },
  ],
  housing: [
    { id: 'rent', label: '월세' },
    { id: 'loan', label: '대출이자' },
    { id: 'other', label: '기타' },
  ],
  self_dev: [
    { id: 'hobby', label: '취미' },
    { id: 'health', label: '건강' },
    { id: 'beauty', label: '미용' },
    { id: 'other', label: '기타' },
  ],
  special: [
    { id: 'event', label: '이벤트' },
    { id: 'travel', label: '여행' },
    { id: 'family_event', label: '경조사' },
    { id: 'other', label: '기타' },
  ],
  pet: [
    { id: 'vet', label: '병원' },
    { id: 'food', label: '사료' },
    { id: 'medicine', label: '약값' },
    { id: 'other', label: '기타' },
  ],
  subscription: [
    { id: 'ott', label: 'OTT' },
    { id: 'membership', label: '멤버십' },
    { id: 'other', label: '기타' },
  ],
}

export function isExpenseCategoryKey(value: string): value is ExpenseCategoryKey {
  return (EXPENSE_CATEGORY_KEYS as readonly string[]).includes(value)
}

export function getSubcategoryDef(
  category: string,
  subcategoryId: string,
): ExpenseSubcategoryDef | undefined {
  if (!isExpenseCategoryKey(category)) return undefined
  return EXPENSE_SUBCATEGORIES[category].find((s) => s.id === subcategoryId)
}

export function buildExpenseMemo(
  category: string,
  subcategoryId: string,
  customText = '',
): string {
  const sub = getSubcategoryDef(category, subcategoryId)
  if (!sub) return customText.trim()
  if (sub.id === 'other') return customText.trim() || '기타'
  return sub.label
}

export function resolveSubcategoryFromMemo(
  category: string,
  memo: string,
): { subcategoryId: string; customText: string } {
  if (!isExpenseCategoryKey(category)) {
    return { subcategoryId: 'other', customText: memo.trim() }
  }
  const trimmed = memo.trim()
  const match = EXPENSE_SUBCATEGORIES[category].find((s) => s.id !== 'other' && s.label === trimmed)
  if (match) return { subcategoryId: match.id, customText: '' }
  return { subcategoryId: 'other', customText: trimmed }
}
