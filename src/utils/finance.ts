export function calculateTenYearMonthlyWaste(amount: number): number {
  const months = 12 * 10
  // "매달 한 번 소비" 가정: 월 1회 x 120개월
  return amount * months
}

export function calculateTenYearCompoundValue(monthlyAmount: number, annualReturnRate: number): number {
  const months = 12 * 10
  const monthlyRate = annualReturnRate / 12

  if (monthlyRate === 0) {
    return monthlyAmount * months
  }

  return monthlyAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
}

export function formatWon(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}
