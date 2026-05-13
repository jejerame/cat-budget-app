const etfComparableCategories = new Set(['red', 'self_dev', 'special', 'pet', 'couple'])
const categoryLabels: Record<string, string> = {
  salary: '월급',
  allowance: '용돈',
  carryover: '이월',
  saving: '저축',
  red: 'RED(커피, 택시, 충동구매)',
  living: '생활(식비, 필수품, 의료)',
  couple: '커플(데이트 비용)',
  fixed: '고정(주거, 보험, 통신)',
  self_dev: '자기개발(취미, 건강, 미용)',
  special: '특별(이벤트, 여행, 경조사)',
  pet: '내 새끼(반려동물)',
  meal: '식비',
  transport: '교통비',
  hobby: '여가/취미',
  shopping_beauty: '쇼핑/미용',
  impulse_clothing: '충동적 의류 구입',
  medical: '의료/건강',
  telecom: '통신비',
  housing: '주거/공과금',
  family_event: '경조사',
  insurance: '보험',
  tax: '세금',
  coffee: '커피',
  taxi: '택시비',
  shopping: '쇼핑',
  subscription: '구독',
  other: '기타',
}

export function isEtfComparableCategory(category: string): boolean {
  return etfComparableCategories.has(category)
}

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] ?? '기타'
}
