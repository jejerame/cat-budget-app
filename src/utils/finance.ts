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

const KOREAN_DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

function readFourDigitChunk(n: number): string {
  if (n <= 0) return ''
  const thou = Math.floor(n / 1000)
  const hun = Math.floor((n % 1000) / 100)
  const ten = Math.floor((n % 100) / 10)
  const one = n % 10
  let s = ''
  if (thou > 0) s += thou === 1 ? '천' : KOREAN_DIGITS[thou] + '천'
  if (hun > 0) s += hun === 1 ? '백' : KOREAN_DIGITS[hun] + '백'
  if (ten > 0) s += ten === 1 ? '십' : KOREAN_DIGITS[ten] + '십'
  if (one > 0) s += KOREAN_DIGITS[one]
  return s
}

/** 정수 원 금액을 한글 읽기 문자열로 바꿉니다 (예: 7000 → "칠천원"). */
export function wonAmountToKorean(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  const n = Math.min(Math.floor(amount), Number.MAX_SAFE_INTEGER)
  if (n === 0) return ''

  const chunks: number[] = []
  let rest = n
  while (rest > 0) {
    chunks.push(rest % 10000)
    rest = Math.floor(rest / 10000)
  }

  const bigUnits = ['', '만', '억', '조', '경']
  let result = ''
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    const chunk = chunks[i]
    if (chunk === 0) continue
    const unit = bigUnits[i] ?? ''
    if (unit === '만' && chunk === 1) {
      result += '만'
      continue
    }
    result += readFourDigitChunk(chunk) + unit
  }
  return `${result}원`
}

/** 금액 입력 필드용: 숫자만 남기고 천 단위 콤마를 넣습니다. */
export function formatWonInputValue(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const noLeadingZeros = digits.replace(/^0+(?=\d)/, '') || '0'
  return Number(noLeadingZeros).toLocaleString('ko-KR')
}

/** 콤마 등이 포함된 입력에서 정수 원 금액을 읽습니다. 빈·잘못된 입력이면 NaN. */
export function parseWonInput(value: string): number {
  const digits = value.replace(/\D/g, '')
  if (!digits) return Number.NaN
  const n = Number(digits)
  if (!Number.isFinite(n)) return Number.NaN
  return Math.floor(n)
}
