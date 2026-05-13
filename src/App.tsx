import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { SplashCatOverlay } from './components/SplashCatOverlay'
import { getEtfRecommendation } from './data/etfRecommendations'
import { getBanPeriodLabel, getIntensityCopy, type BanPeriod, type NagIntensity } from './data/nagIntensity'
import { getRandomNagByAmount } from './data/nagMessages'
import { getCategoryLabel } from './data/spendingCategories'
import {
  calculateTenYearCompoundValue,
  calculateTenYearMonthlyWaste,
  formatWon,
  formatWonInputValue,
  parseWonInput,
  wonAmountToKorean,
} from './utils/finance'
import { createTransaction, getMonthSummary, loadTransactions, saveTransactions, toDateKey, type TransactionRecord, type TransactionType } from './utils/transactions'
import begDayCatUrl from '../beg.png'
import richDayCatUrl from '../rich.png'
import tokCatUrl from '../tok.png'
import janCatUrl from '../jan1.png'
import jan2CatUrl from '../jan2.png'
import red1CatUrl from '../red1.png'
import entryCatUrl from '../cat11.png'
import cat3Url from '../cat3.png'
import cat4Url from '../cat4.png'
import cat6Url from '../cat6.png'
import cat7Url from '../cat7.png'
import happyGaugeUrl from '../happy.png'
import supGaugeUrl from '../sup.png'
import ang1GaugeUrl from '../ang1.png'
import ang2GaugeUrl from '../ang2.png'
import redCatUrl from '../red.png'
import martCatUrl from '../mart.png'
import houseCatUrl from '../house.png'
import bookCatUrl from '../book.png'
import tourCatUrl from '../tour.png'
import dogCatUrl from '../dog.png'
import popupExpenseUrl from '../popup1.png'
import popupSavingGoodUrl from '../popup2.png'
import popupSavingBadUrl from '../popup3.png'
import delBtnUrl from '../del.png'
import canBtnUrl from '../can.png'
import checkCatUrl from '../check.png'
import ddCatUrl from '../dd.png'
import payTypeUrl from '../pay.png'
import incomeTypeUrl from '../income.png'
import saveTypeUrl from '../save.png'
import angryListCatUrl from '../angl.png'
import smileListCatUrl from '../smal.png'

const DEFAULT_ANNUAL_RETURN_RATE = 0.07
const NAG_INTENSITY_STORAGE_KEY = 'compound-nag-intensity'
const BAN_PERIOD_STORAGE_KEY = 'compound-ban-period'
const SAVING_TARGET_RATE_STORAGE_KEY = 'compound-saving-target-rate'
/** 수입이 0원일 때 지출 비율 게이지 분모로 쓰는 기본값(전월 수입도 없을 때) */
const INCOME_GAUGE_FALLBACK_WON = 1_000_000
/** 반성 지수(지출/수입 %) 3단계 — 상단 칩 라벨 */
const BUDGET_GAUGE_STAGE_ORDER: { tone: 'tone-risk' | 'tone-caution' | 'tone-giveup'; label: string }[] = [
  { tone: 'tone-risk', label: '평온단계' },
  { tone: 'tone-caution', label: '자제 필요' },
  { tone: 'tone-giveup', label: '포기 단계' },
]
const INVESTMENT_DISCLAIMER = '본 앱의 기회비용 계산 및 제안은 소비 절약을 돕기 위한 참고용이며, 실제 투자 결과에 대해 제작자는 어떠한 법적 책임도 지지 않습니다. 투자의 판단과 책임은 사용자 본인에게 있습니다.'
const ENTRY_DISCLAIMER_EXTRA = '과거 데이터에 기반한 예시일 뿐 수익을 보장하지 않습니다.'
const DAILY_ANGRY_THRESHOLD = 100_000 // 10만원 이상이면 angry
/** 달력 셀: 하루 지출 합계가 이 금액을 넘으면 red1.png 고양이로 표시 */
const CALENDAR_DAY_HIGH_EXPENSE_CAT_THRESHOLD = 200_000
/** 달력 연도 콤보: 거래가 없어도 선택 가능하도록 올해 기준 이전·이후 연도를 항상 포함 */
const CALENDAR_YEAR_COMBO_PAST = 15
const CALENDAR_YEAR_COMBO_FUTURE = 1
const QUICK_MEMO_TAGS = ['외식', '배달', '해외여행', '이벤트', '경조사', '통신', '사료', '병원']
const PET_LARGE_EXPENSE_THRESHOLD = 150_000
const PET_SOFT_NAGS_LARGE = [
  '아이를 위한 마음은 알겠지만, 집사가 파산하면 아이도 슬퍼해요!',
  '사랑은 충분해요. 이번 결제는 한 번만 더 계산해보고 지켜요.',
]
const PET_SOFT_NAGS_TREATS = [
  '간식 많이 사준다고 사랑이 비례하는 건 아니에요. 아이 비만 오면 병원비가 더 나옵니다!',
]
const PET_SOFT_NAGS_TOY = [
  '집사야, 저번에 산 장난감도 아직 새거다. 아이는 새 옷보다 너랑 5분 더 노는 걸 좋아해.',
]
const PET_SOFT_NAGS_MEDICAL = [
  '이건 아끼지 마세요. 대신 다음 달엔 집사님 커피값을 줄여서 메꿉시다. 아이는 죄가 없으니까요!',
]
const PET_SOFT_NAGS_GROOMING = [
  '댕댕이 미용은 풀코스로, 집사님 머리는 셀프 컷? 적당히 합시다. 같이 오래 살려면 집사 통장도 지켜야죠.',
]
const INCOME_BUBBLE_MESSAGES = [
  '이번 달도 고생했어.',
  '오늘도 번 만큼 대단해.',
  '수입 기록 완료! 진짜 잘하고 있어.',
]

const expenseCategories = [
  'red',
  'living',
  'fixed',
  'self_dev',
  'special',
  'pet',
]
const incomeCategories = ['salary', 'allowance', 'carryover', 'other']
const savingCategories = ['saving', 'other']
const warningExpenseCategories = new Set(['red'])
const coachingExpenseCategories = new Set(['living', 'self_dev', 'special', 'pet'])
const infoExpenseCategories = new Set(['fixed'])
const essentialExpenseCategories = new Set(['living', 'fixed'])

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const POPUP_IMAGE_BY_TYPE = {
  expense: popupExpenseUrl,
  savingGood: popupSavingGoodUrl,
  savingBad: popupSavingBadUrl,
} as const
const CATEGORY_ICON_BY_KEY: Record<string, string> = {
  red: redCatUrl,
  living: martCatUrl,
  fixed: houseCatUrl,
  self_dev: bookCatUrl,
  special: tourCatUrl,
  pet: dogCatUrl,
  salary: cat7Url,
  allowance: cat4Url,
  carryover: cat3Url,
  saving: cat7Url,
  other: cat6Url,
}

function isRedTransaction(item: TransactionRecord): boolean {
  if (item.category === 'red') return true
  const memo = (item.memo ?? '').toLowerCase()
  return ['커피', '아메리카노', '카페', '택시', '충동구매', '충동'].some((kw) => memo.includes(kw.toLowerCase()))
}
type Screen = 'home' | 'entry' | 'category'
type DashboardCardType = 'income' | 'expense' | 'saving' | 'balance'
type ToastVariant = 'expense' | 'saving'
type AnalysisContent = {
  intro: string
  expenseAmount: string
  investAmount: string
  etfName: string
  etfReason: string
  shareProjection: string
  nag: string
  tip: string
  disclaimer: string
}
type ExpenseAnalysisInput = {
  amount: number
  category: string
  memo: string
  banPeriod: BanPeriod
}
type BackupPayload = {
  version: number
  exportedAt: string
  transactions: TransactionRecord[]
  settings: {
    nagIntensity: NagIntensity
    banPeriod: BanPeriod
    savingTargetRate: number
  }
}

const COLOR_MODE_STORAGE_KEY = 'janso-cat-color-mode'
type ColorMode = 'light' | 'dark'

function resolveColorMode(): ColorMode {
  try {
    const v = localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light'
  }
  return 'dark'
}

function ThemeSunGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round">
        <line x1="8" y1="0.7" x2="8" y2="2.7" />
        <line x1="8" y1="13.3" x2="8" y2="15.3" />
        <line x1="0.7" y1="8" x2="2.7" y2="8" />
        <line x1="13.3" y1="8" x2="15.3" y2="8" />
        <line x1="2.7" y1="2.7" x2="4" y2="4" />
        <line x1="12" y1="12" x2="13.3" y2="13.3" />
        <line x1="2.7" y1="13.3" x2="4" y2="12" />
        <line x1="12" y1="4" x2="13.3" y2="2.7" />
      </g>
    </svg>
  )
}

function ThemeMoonGlyph() {
  return (
    <svg width="12" height="11" viewBox="0 0 16 16" aria-hidden>
      <path
        fill="currentColor"
        d="M9.8 2.4a5.6 5.6 0 100 11.2 5.1 5.1 0 01-3.9-9.2 5.6 5.6 0 013.9-2z"
      />
      <path
        fill="currentColor"
        opacity="0.55"
        d="M12.2 3.5l.35.7.75.1-.55.55.15.75-.65-.35-.65.35.15-.75-.55-.55.75-.1.35-.7zm1.4 2.8l.2.45.5.05-.4.35.1.5-.45-.25-.45.25.1-.5-.4-.35.5-.05.2-.45zm-1.1 2.1l.15.35.35.05-.3.25.08.38-.33-.18-.33.18.08-.38-.3-.25.35-.05.15-.35z"
      />
    </svg>
  )
}

function App() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [screen, setScreen] = useState<Screen>('home')
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => loadTransactions())
  const [amountInput, setAmountInput] = useState('')
  const [memoInput, setMemoInput] = useState('')
  const [entryDate, setEntryDate] = useState(() => toDateKey(new Date()))
  const [selectedCalendarYear, setSelectedCalendarYear] = useState(() => now.getFullYear())
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(() => now.getMonth())
  const [selectedQuickTag, setSelectedQuickTag] = useState('')
  const [selectedType, setSelectedType] = useState<TransactionType>('expense')
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [chartOpen, setChartOpen] = useState(false)
  const [dashboardModalType, setDashboardModalType] = useState<DashboardCardType | null>(null)
  const [redReflectionOpen, setRedReflectionOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [typeNagMessage, setTypeNagMessage] = useState('')
  const [pendingTypeAfterNag, setPendingTypeAfterNag] = useState<TransactionType | null>(null)
  const [toastImageSrc, setToastImageSrc] = useState('')
  const [toastVariant, setToastVariant] = useState<ToastVariant>('expense')
  const [toastVisible, setToastVisible] = useState(false)
  const [redWarningPhase, setRedWarningPhase] = useState<'idle' | 'blinking' | 'steady'>('idle')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [colorMode, setColorMode] = useState<ColorMode>(() => resolveColorMode())
  const [dayDetailDateKey, setDayDetailDateKey] = useState<string | null>(null)
  const [calendarDayTipHoverKey, setCalendarDayTipHoverKey] = useState<string | null>(null)
  const [calendarDayTipTouchKey, setCalendarDayTipTouchKey] = useState<string | null>(null)
  const calendarDayTouchTipTimeoutRef = useRef<number | null>(null)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [analysisDisclaimerOpen, setAnalysisDisclaimerOpen] = useState(false)
  const [analysisText, setAnalysisText] = useState<AnalysisContent>({
    intro: '',
    expenseAmount: '',
    investAmount: '',
    etfName: '',
    etfReason: '',
    shareProjection: '',
    nag: '',
    tip: '',
    disclaimer: INVESTMENT_DISCLAIMER,
  })
  const [lastExpenseAnalysisInput, setLastExpenseAnalysisInput] = useState<ExpenseAnalysisInput | null>(null)
  const [analysisCardCats, setAnalysisCardCats] = useState<[string, string, string]>([cat3Url, cat4Url, cat7Url])
  const [monthEndHelpOpenKey, setMonthEndHelpOpenKey] = useState<null | 'topCut' | 'nonEssential' | 'goal' | 'surplus'>(null)
  const [nagIntensity, setNagIntensity] = useState<NagIntensity>(() => {
    const stored = localStorage.getItem(NAG_INTENSITY_STORAGE_KEY)
    if (stored === 'normal' || stored === 'hard' || stored === 'spartian-lite' || stored === 'spartian' || stored === 'spartian-max') {
      return stored
    }
    return 'hard'
  })
  const [banPeriod, setBanPeriod] = useState<BanPeriod>(() => {
    const stored = localStorage.getItem(BAN_PERIOD_STORAGE_KEY)
    if (stored === '7days' || stored === 'this-month' || stored === 'next-month') {
      return stored
    }
    return 'next-month'
  })
  const [savingTargetRate, setSavingTargetRate] = useState<number>(() => {
    const stored = Number(localStorage.getItem(SAVING_TARGET_RATE_STORAGE_KEY))
    if ([20, 30, 50, 70].includes(stored)) return stored
    return 30
  })

  const selectedCalendarDate = useMemo(
    () => new Date(selectedCalendarYear, selectedCalendarMonth, 1),
    [selectedCalendarYear, selectedCalendarMonth],
  )
  const summary = useMemo(() => getMonthSummary(transactions, selectedCalendarDate), [transactions, selectedCalendarDate])
  const prevMonthSummary = useMemo(() => {
    const d = new Date(selectedCalendarYear, selectedCalendarMonth - 1, 1)
    return getMonthSummary(transactions, d)
  }, [transactions, selectedCalendarYear, selectedCalendarMonth])
  const gaugeIncomeDenominator = useMemo(() => {
    if (summary.income > 0) return summary.income
    if (prevMonthSummary.income > 0) return prevMonthSummary.income
    return INCOME_GAUGE_FALLBACK_WON
  }, [summary.income, prevMonthSummary.income])
  /** 수입이 있으면 실제 수입 대비, 없으면 기준액 대비 지출 비율(%) — 단계·잔소리·썸 위치에 공통 사용 */
  const budgetRatioUncapped = useMemo(() => {
    if (gaugeIncomeDenominator <= 0) return 0
    return (summary.expense / gaugeIncomeDenominator) * 100
  }, [summary.expense, gaugeIncomeDenominator])
  /** 실제 적자: 수입이 있으면 지출>수입, 수입이 없고 지출만 있으면 적자로 간주 */
  const isDeficitActual = summary.income > 0 ? summary.expense > summary.income : summary.expense > 0
  const budgetThumbLeftPercent = Math.min(budgetRatioUncapped, 100)
  const budgetGaugeStage = getBudgetGaugeStage(budgetRatioUncapped)
  const budgetGaugeNagLine = getBudgetGaugeNagLine(budgetRatioUncapped)
  const budgetGaugeCatSrc =
    budgetRatioUncapped > 100
      ? redCatUrl
      : budgetRatioUncapped >= 81
        ? ang2GaugeUrl
        : budgetRatioUncapped >= 51
          ? ang1GaugeUrl
          : budgetRatioUncapped >= 31
            ? supGaugeUrl
            : happyGaugeUrl
  const amountKoreanReading = useMemo(() => {
    const n = parseWonInput(amountInput)
    return !Number.isNaN(n) && n > 0 ? wonAmountToKorean(n) : ''
  }, [amountInput])
  const monthEnd = useMemo(() => getMonthEndSummary(transactions, selectedCalendarDate), [transactions, selectedCalendarDate])
  const categories = selectedType === 'expense' ? expenseCategories : selectedType === 'income' ? incomeCategories : savingCategories
  const redBlinkTimeoutRef = useRef<number | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const expenseSelectStreakRef = useRef(0)
  const importFileInputRef = useRef<HTMLInputElement | null>(null)
  const monthRecordsByType = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const thisMonthRecords = transactions.filter((item) => {
      const d = new Date(item.createdAt)
      return d.getFullYear() === y && d.getMonth() === m
    })
    return {
      income: thisMonthRecords.filter((item) => item.type === 'income'),
      expense: thisMonthRecords.filter((item) => item.type === 'expense'),
      saving: thisMonthRecords.filter((item) => item.type === 'saving'),
    }
  }, [transactions])
  const sortedMonthRecordsByType = useMemo(() => {
    const sortByDateAsc = (records: TransactionRecord[]) =>
      [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return {
      income: sortByDateAsc(monthRecordsByType.income),
      expense: sortByDateAsc(monthRecordsByType.expense),
      saving: sortByDateAsc(monthRecordsByType.saving),
    }
  }, [monthRecordsByType])
  const expenseModalNag = useMemo(() => {
    const expenseTotal = sortedMonthRecordsByType.expense.reduce((sum, item) => sum + item.amount, 0)
    const nonEssentialTotal = sortedMonthRecordsByType.expense
      .filter((item) => !essentialExpenseCategories.has(item.category))
      .reduce((sum, item) => sum + item.amount, 0)
    const nonEssentialRate = expenseTotal > 0 ? Math.round((nonEssentialTotal / expenseTotal) * 100) : 0
    const messages = [
      `이번 달 총 지출은 ${formatWon(expenseTotal)}이야. 정말 다 필요한 거였어?`,
      `이 중에서 비필수 지출이 ${nonEssentialRate}%네? 정신 안 차려?`,
    ]
    return pickRandomLocal(messages)
  }, [sortedMonthRecordsByType.expense])
  const incomeEncourageMessage = useMemo(() => {
    return pickRandomLocal(INCOME_BUBBLE_MESSAGES)
  }, [])
  const savingEncourageMessage = useMemo(() => {
    const monthlyGoal = Math.max(Math.round(summary.income * (savingTargetRate / 100)), 0)
    const remaining = Math.max(monthlyGoal - summary.saving, 0)
    return `이번 달 목표 저축액(수입의 ${savingTargetRate}%)까지 ${formatWon(remaining)} 남았어! 조금만 더 힘내`
  }, [summary.income, summary.saving, savingTargetRate])
  const thisMonthRedRecords = useMemo(() => {
    const y = selectedCalendarYear
    const m = selectedCalendarMonth
    return transactions
      .filter((item) => {
        if (item.type !== 'expense' || item.category !== 'red') return false
        const d = new Date(item.createdAt)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [transactions, selectedCalendarYear, selectedCalendarMonth])
  const calendarYear = selectedCalendarYear
  const calendarMonth = selectedCalendarMonth
  const dailyExpenseByKey = useMemo(() => {
    const map = new Map<string, { totalExpense: number; hasRed: boolean }>()
    transactions.forEach((item) => {
      if (item.type !== 'expense') return
      const d = new Date(item.createdAt)
      if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) return
      const key = toDateKey(d)
      const prev = map.get(key) ?? { totalExpense: 0, hasRed: false }
      prev.totalExpense += item.amount
      if (isRedTransaction(item)) prev.hasRed = true
      map.set(key, prev)
    })
    return map
  }, [transactions, calendarYear, calendarMonth])
  const dailyIncomeByKey = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((item) => {
      if (item.type !== 'income') return
      const d = new Date(item.createdAt)
      if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) return
      const key = toDateKey(d)
      map.set(key, (map.get(key) ?? 0) + item.amount)
    })
    return map
  }, [transactions, calendarYear, calendarMonth])
  const dailySavingByKey = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((item) => {
      if (item.type !== 'saving') return
      const d = new Date(item.createdAt)
      if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) return
      const key = toDateKey(d)
      map.set(key, (map.get(key) ?? 0) + item.amount)
    })
    return map
  }, [transactions, calendarYear, calendarMonth])
  const angryCatCountInCalendar = useMemo(() => {
    let count = 0
    dailyExpenseByKey.forEach((info) => {
      const isAngry = !info.hasRed && info.totalExpense >= DAILY_ANGRY_THRESHOLD
      if (isAngry) count += 1
    })
    return count
  }, [dailyExpenseByKey])

  const calendarCells = useMemo(() => buildCalendarCells(calendarYear, calendarMonth), [calendarYear, calendarMonth])
  const dayDetailRecords = useMemo(
    () => (dayDetailDateKey ? getTransactionsForDateKey(transactions, dayDetailDateKey) : []),
    [transactions, dayDetailDateKey],
  )
  const dayDetailHero = useMemo(() => {
    const list = dayDetailRecords
    const expenseItems = list.filter((i) => i.type === 'expense')
    const totalExpenseDay = expenseItems.reduce((s, i) => s + i.amount, 0)
    const hasRedExpense = expenseItems.some((i) => i.category === 'red')
    const hasIncome = list.some((i) => i.type === 'income')
    const hasExpense = expenseItems.length > 0
    const showBeg = hasRedExpense || totalExpenseDay > DAILY_ANGRY_THRESHOLD
    const showRich = !showBeg && (!hasExpense || hasIncome)
    if (showBeg) {
      return {
        src: begDayCatUrl,
        message: '집사야, 깡통 차기 일보직전이다냥!',
      }
    }
    if (showRich) {
      return {
        src: richDayCatUrl,
        message: '나이스! 1억 부자가 머지않았다냥!',
      }
    }
    return {
      src: richDayCatUrl,
      message: '나이스! 1억 부자가 머지않았다냥!',
    }
  }, [dayDetailRecords])
  const editingRecord = useMemo(
    () => (editingTransactionId ? transactions.find((t) => t.id === editingTransactionId) : undefined),
    [transactions, editingTransactionId],
  )
  const calendarYearOptions = useMemo(() => {
    const years = new Set<number>()
    for (let y = currentYear - CALENDAR_YEAR_COMBO_PAST; y <= currentYear + CALENDAR_YEAR_COMBO_FUTURE; y++) {
      years.add(y)
    }
    transactions.forEach((item) => years.add(new Date(item.createdAt).getFullYear()))
    return [...years].sort((a, b) => a - b)
  }, [transactions, currentYear])

  useEffect(() => {
    if (!isDeficitActual) {
      setRedWarningPhase('idle')
      if (redBlinkTimeoutRef.current) {
        window.clearTimeout(redBlinkTimeoutRef.current)
        redBlinkTimeoutRef.current = null
      }
      return
    }

    if (redWarningPhase === 'idle') {
      setRedWarningPhase('blinking')
      if (redBlinkTimeoutRef.current) {
        window.clearTimeout(redBlinkTimeoutRef.current)
      }
      redBlinkTimeoutRef.current = window.setTimeout(() => {
        setRedWarningPhase('steady')
      }, 3000)
    }
  }, [isDeficitActual, redWarningPhase])

  useEffect(() => {
    return () => {
      if (redBlinkTimeoutRef.current) {
        window.clearTimeout(redBlinkTimeoutRef.current)
      }
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current)
      }
      if (calendarDayTouchTipTimeoutRef.current) {
        window.clearTimeout(calendarDayTouchTipTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setCalendarDayTipHoverKey(null)
    setCalendarDayTipTouchKey(null)
    if (calendarDayTouchTipTimeoutRef.current) {
      window.clearTimeout(calendarDayTouchTipTimeoutRef.current)
      calendarDayTouchTipTimeoutRef.current = null
    }
  }, [selectedCalendarYear, selectedCalendarMonth])

  useEffect(() => {
    if (!monthEndHelpOpenKey) return
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.month-end-help')) return
      setMonthEndHelpOpenKey(null)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [monthEndHelpOpenKey])

  useEffect(() => {
    document.documentElement.dataset.theme = colorMode
    try {
      const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null
      if (meta) meta.content = colorMode === 'light' ? '#ffffff' : '#161616'
    } catch {
      /* ignore */
    }
  }, [colorMode])

  function showCatToast(imageSrc: string, variant: ToastVariant): void {
    setToastImageSrc(imageSrc)
    setToastVariant(variant)
    setToastVisible(true)
    playToastSound('in')
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastVisible(false)
      playToastSound('out')
    }, 1500)
  }

  function getAudioContext(): AudioContext | null {
    if (audioContextRef.current) return audioContextRef.current
    const AudioContextCtor = window.AudioContext
      || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return null
    audioContextRef.current = new AudioContextCtor()
    return audioContextRef.current
  }

  function playToastSound(kind: 'in' | 'out'): void {
    const ctx = getAudioContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
    }
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = kind === 'in' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(kind === 'in' ? 820 : 500, now)
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'in' ? 980 : 260, now + (kind === 'in' ? 0.06 : 0.12))
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'in' ? 0.09 : 0.14))
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + (kind === 'in' ? 0.1 : 0.15))
  }

  function getMonthSavingTotal(date: Date): number {
    const y = date.getFullYear()
    const m = date.getMonth()
    return transactions
      .filter((item) => {
        if (item.type !== 'saving') return false
        const d = new Date(item.createdAt)
        return d.getFullYear() === y && d.getMonth() === m
      })
      .reduce((sum, item) => sum + item.amount, 0)
  }

  function getShareProjectionText(etfName: string, annualSavingPotential: number): string {
    const projectionByEtfName: Record<string, { unitPrice: number; unitLabel: string }> = {
      'KODEX 미국S&P500TR': { unitPrice: 20_000, unitLabel: '주' },
      'TIGER 미국나스닥100': { unitPrice: 18_000, unitLabel: '주' },
      'ACE 미국배당다우존스': { unitPrice: 12_000, unitLabel: '주' },
      'KODEX 200 + TIGER 미국S&P500 분할': { unitPrice: 19_000, unitLabel: '주' },
      'KRX 금현물 / 금 시세 연동 ETF': { unitPrice: 145_000, unitLabel: 'g' },
      'KRX 은 현물 대안 / 은 ETF': { unitPrice: 1_700, unitLabel: 'g' },
      '해외주식 대안: 스타벅스(SBUX) 소수점 투자': { unitPrice: 120_000, unitLabel: '주' },
    }
    const projection = projectionByEtfName[etfName]
    if (!projection) return '1년 절약액으로 매수 가능한 수량을 추정하기 어려운 상품입니다.'
    const units = annualSavingPotential / projection.unitPrice
    return `1년 절약액으로 약 ${units.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${projection.unitLabel}(추정) 매수 가능`
  }

  function buildExpenseAnalysisText(input: ExpenseAnalysisInput, previousEtfName?: string): AnalysisContent {
    const waste = calculateTenYearMonthlyWaste(input.amount)
    const invested = calculateTenYearCompoundValue(input.amount, DEFAULT_ANNUAL_RETURN_RATE)
    const monthlyRepeatSavings = input.amount
    const annualSavingPotential = monthlyRepeatSavings * 12
    const etf = getEtfRecommendation(input.amount, {
      monthlyRepeatSavings,
      totalSavingPotential: annualSavingPotential,
      excludedEtfNames: previousEtfName ? [previousEtfName] : [],
    })
    const level = getExpenseInterventionLevel(input.category)
    const effectiveIntensity = getEffectiveIntensity(level, nagIntensity)
    const intensityCopy = getIntensityCopy(effectiveIntensity)
    const categoryLabel = getCategoryLabel(input.category)
    const nagMessage = `${getCategorySpecificComment(level, categoryLabel, input.amount, input.banPeriod, input.memo)} / ${getCategorySpecificBanMessage(input.category, input.memo, input.amount, input.banPeriod, intensityCopy.banMessage)}`

    return {
      intro: '이 소비를 매달 한 번씩, 10년 동안 반복하면',
      expenseAmount: formatWon(waste),
      investAmount: formatWon(invested),
      etfName: etf.etfName,
      etfReason: `${etf.reason} (${getBanPeriodLabel(input.banPeriod)} 기준 통제)`,
      shareProjection: getShareProjectionText(etf.etfName, annualSavingPotential),
      nag: nagMessage,
      tip: getCompactTip(nagMessage),
      disclaimer: INVESTMENT_DISCLAIMER,
    }
  }

  function openAnalysis(amount: number, type: TransactionType, category: string): void {
    if (amount <= 0) {
      setLastExpenseAnalysisInput(null)
      setAnalysisText({
        intro: '올바른 금액을 입력해 주세요.',
        expenseAmount: '-',
        investAmount: '-',
        etfName: '-',
        etfReason: '',
        shareProjection: '-',
        nag: '입력 금액을 확인한 뒤 다시 시도해 주세요.',
        tip: '금액을 다시 확인해 주세요.',
        disclaimer: INVESTMENT_DISCLAIMER,
      })
      setAnalysisCardCats(pickRandomCatFaces())
      setAnalysisDisclaimerOpen(false)
      setAnalysisOpen(true)
      return
    }

    if (type !== 'expense') {
      setLastExpenseAnalysisInput(null)
      setAnalysisText({
        intro: `${type === 'income' ? '수입' : '저축'} ${formatWon(amount)}이 기록되었습니다.`,
        expenseAmount: '-',
        investAmount: '-',
        etfName: '-',
        etfReason: '지출 기록에서만 대안 ETF를 제안합니다.',
        shareProjection: '-',
        nag: '좋은 흐름을 유지하세요.',
        tip: '지금처럼 기록 습관을 유지해 보세요.',
        disclaimer: INVESTMENT_DISCLAIMER,
      })
      setAnalysisCardCats(pickRandomCatFaces())
      setAnalysisDisclaimerOpen(false)
      setAnalysisOpen(true)
      return
    }
    const input: ExpenseAnalysisInput = {
      amount,
      category,
      memo: memoInput.trim(),
      banPeriod,
    }
    setLastExpenseAnalysisInput(input)
    setAnalysisText(buildExpenseAnalysisText(input))
    setAnalysisCardCats(pickRandomCatFaces())
    setAnalysisDisclaimerOpen(false)
    setAnalysisOpen(true)
  }

  function refreshAnalysisRecommendation(): void {
    if (!lastExpenseAnalysisInput) return
    setAnalysisText(buildExpenseAnalysisText(lastExpenseAnalysisInput, analysisText.etfName))
    setAnalysisCardCats(pickRandomCatFaces())
  }

  function toggleMonthEndHelp(key: 'topCut' | 'nonEssential' | 'goal' | 'surplus'): void {
    setMonthEndHelpOpenKey((prev) => (prev === key ? null : key))
  }

  function resetEntryFormForNew(dateKey?: string): void {
    setEditingTransactionId(null)
    setAmountInput('')
    setMemoInput('')
    setSelectedQuickTag('')
    setEntryDate(dateKey !== undefined ? dateKey : toDateKey(new Date()))
    setSelectedType('expense')
  }

  function openNewEntryForDate(dateKey: string): void {
    setDayDetailDateKey(null)
    resetEntryFormForNew(dateKey)
    setScreen('entry')
  }

  function openDayDetailOrEntry(dateKey: string): void {
    const list = getTransactionsForDateKey(transactions, dateKey)
    if (list.length === 0) {
      openNewEntryForDate(dateKey)
      return
    }
    setDayDetailDateKey(dateKey)
  }

  function beginEditTransaction(record: TransactionRecord): void {
    setDayDetailDateKey(null)
    setEditingTransactionId(record.id)
    setAmountInput(formatWonInputValue(String(record.amount)))
    setMemoInput(record.memo ?? '')
    setEntryDate(toDateKey(new Date(record.createdAt)))
    setSelectedType(record.type)
    setSelectedQuickTag(deriveQuickTagFromMemo(record.memo ?? ''))
    setScreen('entry')
  }

  function requestDeleteFromEntryEdit(): void {
    if (!editingTransactionId) return
    setPendingDeleteId(editingTransactionId)
  }

  function handleCategoryClick(category: string): void {
    const amount = parseWonInput(amountInput)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('먼저 금액을 입력해 주세요.')
      return
    }

    const normalizedMemo = memoInput.trim()

    if (editingTransactionId) {
      updateTransaction(editingTransactionId, {
        type: selectedType,
        category,
        amount,
        memo: normalizedMemo || undefined,
        createdAt: dateKeyToLocalDate(entryDate).toISOString(),
      })
      const returnDay = entryDate
      resetEntryFormForNew()
      setScreen('home')
      setDayDetailDateKey(returnDay)
      return
    }

    const updated = [...transactions, createTransaction(selectedType, category, amount, normalizedMemo || undefined, dateKeyToLocalDate(entryDate))]
    setTransactions(updated)
    saveTransactions(updated)
    resetEntryFormForNew()
    setScreen('home')
    if (selectedType === 'expense') {
      openAnalysis(amount, selectedType, category)
    }
  }

  function openEntryForDate(dateKey: string): void {
    openNewEntryForDate(dateKey)
  }

  function toggleQuickTag(tag: string): void {
    const currentMemo = memoInput.trim()
    const memoWithoutTag = QUICK_MEMO_TAGS.reduce((text, quickTag) => {
      const escapedTag = quickTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return text.replace(new RegExp(`^${escapedTag}\\s*`), '')
    }, currentMemo).trim()

    if (selectedQuickTag === tag) {
      setSelectedQuickTag('')
      setMemoInput(memoWithoutTag)
      return
    }

    setSelectedQuickTag(tag)
    setMemoInput(`${tag}${memoWithoutTag ? ` ${memoWithoutTag}` : ''}`)
  }

  function setColorModePersist(next: ColorMode): void {
    setColorMode(next)
    try {
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  function onChangeIntensity(value: string): void {
    const next = value as NagIntensity
    setNagIntensity(next)
    localStorage.setItem(NAG_INTENSITY_STORAGE_KEY, next)
  }

  function onChangeBanPeriod(value: string): void {
    const next = value as BanPeriod
    setBanPeriod(next)
    localStorage.setItem(BAN_PERIOD_STORAGE_KEY, next)
  }

  function onChangeSavingTargetRate(value: string): void {
    const next = Number(value)
    if (![20, 30, 50, 70].includes(next)) return
    setSavingTargetRate(next)
    localStorage.setItem(SAVING_TARGET_RATE_STORAGE_KEY, String(next))
  }

  function exportBackupData(): void {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      settings: {
        nagIntensity,
        banPeriod,
        savingTargetRate,
      },
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const dateTag = toDateKey(new Date()).replace(/-/g, '')
    anchor.href = url
    anchor.download = `janso-cat-backup-${dateTag}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function openImportFilePicker(): void {
    importFileInputRef.current?.click()
  }

  function importBackupData(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<BackupPayload>
        if (!Array.isArray(parsed.transactions)) {
          alert('백업 파일 형식이 올바르지 않습니다.')
          return
        }

        const importedTransactions = parsed.transactions as TransactionRecord[]
        setTransactions(importedTransactions)
        saveTransactions(importedTransactions)

        if (parsed.settings?.nagIntensity && ['normal', 'hard', 'spartian-lite', 'spartian', 'spartian-max'].includes(parsed.settings.nagIntensity)) {
          setNagIntensity(parsed.settings.nagIntensity)
          localStorage.setItem(NAG_INTENSITY_STORAGE_KEY, parsed.settings.nagIntensity)
        }
        if (parsed.settings?.banPeriod && ['7days', 'this-month', 'next-month'].includes(parsed.settings.banPeriod)) {
          setBanPeriod(parsed.settings.banPeriod)
          localStorage.setItem(BAN_PERIOD_STORAGE_KEY, parsed.settings.banPeriod)
        }
        if (parsed.settings && [20, 30, 50, 70].includes(Number(parsed.settings.savingTargetRate))) {
          const nextRate = Number(parsed.settings.savingTargetRate)
          setSavingTargetRate(nextRate)
          localStorage.setItem(SAVING_TARGET_RATE_STORAGE_KEY, String(nextRate))
        }
        alert('백업 데이터를 불러왔습니다.')
      } catch {
        alert('백업 파일을 읽는 중 오류가 발생했습니다.')
      } finally {
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleSelectType(type: TransactionType): void {
    if (type === 'income') {
      expenseSelectStreakRef.current = 0
      setSelectedType(type)
      return
    }

    if (type === 'expense') {
      expenseSelectStreakRef.current += 1
      const shouldShowExpenseToast = expenseSelectStreakRef.current === 1 || Math.random() < (1 / 3)
      if (shouldShowExpenseToast) {
        showCatToast(POPUP_IMAGE_BY_TYPE.expense, 'expense')
      }
      setSelectedType(type)
      return
    }

    if (type === 'saving') {
      expenseSelectStreakRef.current = 0
      const pendingAmount = parseWonInput(amountInput)
      const nextSavingAmount = Number.isFinite(pendingAmount) && pendingAmount > 0 ? pendingAmount : 0
      const thisMonthSaving = summary.saving
      const thisMonthIncome = summary.income
      const projectedSaving = thisMonthSaving + nextSavingAmount
      const savingRate = thisMonthIncome > 0 ? projectedSaving / thisMonthIncome : 0
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthSaving = getMonthSavingTotal(prevMonthDate)
      const hasIncomeBase = thisMonthIncome > 0
      const hasPrevSavingBase = prevMonthSaving > 0
      const isGoodSavingFeedback =
        nextSavingAmount > 100_000
        || (hasIncomeBase && savingRate >= 0.3)
        || (hasPrevSavingBase && projectedSaving > prevMonthSaving && nextSavingAmount >= 30_000)
      showCatToast(isGoodSavingFeedback ? POPUP_IMAGE_BY_TYPE.savingGood : POPUP_IMAGE_BY_TYPE.savingBad, 'saving')
      setSelectedType(type)
      return
    }
  }

  function confirmTypeNag(): void {
    if (pendingTypeAfterNag) {
      setSelectedType(pendingTypeAfterNag)
    }
    setTypeNagMessage('')
    setPendingTypeAfterNag(null)
  }

  function closeDashboardModal(): void {
    setDashboardModalType(null)
    setPendingDeleteId(null)
  }

  function updateTransaction(id: string, patch: Partial<TransactionRecord>): void {
    const updated = transactions.map((item) => (item.id === id ? { ...item, ...patch } : item))
    setTransactions(updated)
    saveTransactions(updated)
  }

  function removeTransaction(id: string): void {
    const updated = transactions.filter((item) => item.id !== id)
    setTransactions(updated)
    saveTransactions(updated)
  }

  function confirmDeleteTransaction(): void {
    if (!pendingDeleteId) return
    const wasEntryEdit = editingTransactionId === pendingDeleteId
    const deletedRec = transactions.find((t) => t.id === pendingDeleteId)
    const deletedDateKey = deletedRec ? toDateKey(new Date(deletedRec.createdAt)) : null
    const remainingOnDay =
      deletedDateKey
        ? getTransactionsForDateKey(
            transactions.filter((t) => t.id !== pendingDeleteId),
            deletedDateKey,
          )
        : []
    removeTransaction(pendingDeleteId)
    setPendingDeleteId(null)
    if (wasEntryEdit) {
      resetEntryFormForNew()
      setScreen('home')
      setDayDetailDateKey(remainingOnDay.length > 0 ? deletedDateKey : null)
    }
  }

  function cancelDeleteTransaction(): void {
    setPendingDeleteId(null)
  }

  const ratioChartTotal = summary.income + summary.expense + summary.saving
  const ratioPieBackground =
    ratioChartTotal <= 0
      ? 'conic-gradient(from -90deg, #e8e8ea 0deg 360deg)'
      : (() => {
          const degIncome = (summary.income / ratioChartTotal) * 360
          const degExpense = (summary.expense / ratioChartTotal) * 360
          const t1 = degIncome
          const t2 = degIncome + degExpense
          return `conic-gradient(from -90deg, #2cd3a0 0deg ${t1}deg, #ff4d8d ${t1}deg ${t2}deg, #4e7bff ${t2}deg 360deg)`
        })()

  return (
    <>
      <SplashCatOverlay />
      <main className="app-shell">
        <section className={`screen ${screen === 'home' ? 'active' : ''} home-screen`}>
          <div className="home-sticky-through-settings">
          <section className="mid-indicator-zone">
            <header className="home-header compact">
              <div className="calendar-header-controls">
                <select
                  value={selectedCalendarYear}
                  onChange={(e) => setSelectedCalendarYear(Number(e.target.value))}
                  aria-label="연도 선택"
                >
                  {calendarYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
                <select
                  value={selectedCalendarMonth}
                  onChange={(e) => setSelectedCalendarMonth(Number(e.target.value))}
                  aria-label="월 선택"
                >
                  {Array.from({ length: 12 }, (_, monthIdx) => (
                    <option key={monthIdx} value={monthIdx}>
                      {monthIdx + 1}월
                    </option>
                  ))}
                </select>
              </div>
              <h1 className="home-title-chip" aria-label="앱 타이틀">
                <span className="home-title-chip__text">잔소리 가계부</span>
                <img src={janCatUrl} alt="" className="home-title-chip__cat" aria-hidden="true" />
              </h1>
              <button className="icon-btn dark" type="button" onClick={() => setChartOpen(true)}>📊</button>
            </header>

            <div className="red-indicator-slim">
              <div className="red-indicator-brief-row" aria-label="이번 달 수입 지출 저축 요약">
                <button
                  type="button"
                  className="red-indicator-brief-item red-indicator-brief-item--income red-indicator-brief-btn"
                  onClick={() => setDashboardModalType('income')}
                >
                  <span className="red-indicator-brief-key">수입</span>
                  <strong className="red-indicator-brief-value">{formatWon(summary.income)}</strong>
                </button>
                <button
                  type="button"
                  className="red-indicator-brief-item red-indicator-brief-item--expense red-indicator-brief-btn"
                  onClick={() => setDashboardModalType('expense')}
                >
                  <span className="red-indicator-brief-key">지출</span>
                  <strong className="red-indicator-brief-value">{formatWon(summary.expense)}</strong>
                </button>
                <button
                  type="button"
                  className="red-indicator-brief-item red-indicator-brief-item--saving red-indicator-brief-btn"
                  onClick={() => setDashboardModalType('saving')}
                >
                  <span className="red-indicator-brief-key">저축</span>
                  <strong className="red-indicator-brief-value">{formatWon(summary.saving)}</strong>
                </button>
              </div>
              <div className="red-indicator-click-zone interactive" onClick={() => setRedReflectionOpen(true)}>
                <div className="red-indicator-stage-row" aria-label={`지출 비율 ${budgetGaugeStage.label}`}>
                  <span className="red-indicator-stage-title">
                    <span className="red-indicator-headline-strong">
                      이번 달 지출 {formatWon(summary.expense)}
                      {summary.income > 0 ? (
                        <> · 수입 대비 {Math.round(budgetRatioUncapped)}%</>
                      ) : (
                        <>
                          {' '}
                          · 기준 {formatWon(gaugeIncomeDenominator)} 대비 {Math.round(budgetRatioUncapped)}%
                        </>
                      )}
                    </span>{' '}
                    <span className="red-indicator-headline-meta">
                      {summary.income > 0
                        ? `(수입 ${formatWon(summary.income)} 기준)`
                        : prevMonthSummary.income > 0
                          ? '(수입 미입력 · 전월 수입을 기준으로 표시)'
                          : '(수입 미입력 · 100만 원 기준으로 표시)'}
                    </span>
                  </span>
                  <div className="red-indicator-stage-chips">
                    {BUDGET_GAUGE_STAGE_ORDER.map(({ tone, label }, idx) => (
                      <span key={tone} className="red-indicator-stage-chip-wrap">
                        {idx > 0 ? (
                          <span className="red-indicator-stage-sep" aria-hidden>
                            ·
                          </span>
                        ) : null}
                        <span
                          className={`red-indicator-stage-chip${budgetGaugeStage.tone === tone ? ` red-indicator-stage-chip--current red-indicator-stage-chip--${tone}` : ''}`}
                        >
                          {label}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="red-gauge-stack">
                  <div
                    className={[
                      'red-gauge-track',
                      isDeficitActual ? 'red-gauge-track--over' : '',
                      isDeficitActual && redWarningPhase === 'blinking' ? 'red-gauge-track--blink' : '',
                      isDeficitActual && redWarningPhase === 'steady' ? 'red-gauge-track--steady-warn' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className="red-gauge-gradient-bar" aria-hidden />
                    <div
                      className="red-gauge-cat-thumb"
                      style={{ left: `${budgetThumbLeftPercent}%` }}
                    >
                      <img
                        src={budgetGaugeCatSrc}
                        alt=""
                        className={`red-gauge-cat-face${budgetGaugeCatSrc === redCatUrl ? ' red-gauge-cat-face--red' : ''}${
                          isDeficitActual && budgetGaugeCatSrc === redCatUrl ? ' red-gauge-cat-face--tremble' : ''
                        }`}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <p className="red-indicator-gauge-nag">{budgetGaugeNagLine}</p>
                </div>
              </div>
            </div>

          </section>

          <section className="calendar-zone">
            <section className="monthly-calendar" aria-label="월간 캘린더">
              <div className="calendar-weekdays">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div className="calendar-grid">
                {calendarCells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="calendar-day calendar-day-empty" />
                  }

                  const info = dailyExpenseByKey.get(cell.key)
                  const totalExpense = info?.totalExpense ?? 0
                  const hasExpense = totalExpense > 0
                  const expenseText = formatCalendarExpense(totalExpense)
                  const isHighExpenseCatDay =
                    totalExpense > CALENDAR_DAY_HIGH_EXPENSE_CAT_THRESHOLD
                  const calendarDayCatSrc = isHighExpenseCatDay ? red1CatUrl : jan2CatUrl
                  const dayIncome = dailyIncomeByKey.get(cell.key) ?? 0
                  const daySaving = dailySavingByKey.get(cell.key) ?? 0
                  const hasDayTipData = dayIncome > 0 || daySaving > 0
                  const showDayTip =
                    hasDayTipData &&
                    (calendarDayTipHoverKey === cell.key || calendarDayTipTouchKey === cell.key)

                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={[
                        'calendar-day',
                        hasExpense ? 'calendar-day--spent' : '',
                        dayIncome > 0 ? 'calendar-day--income-mark' : '',
                        daySaving > 0 ? 'calendar-day--saving-mark' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`${cell.day}일${hasExpense ? ` 지출 ${formatWon(totalExpense)}` : ''}${dayIncome > 0 ? ` 수입 ${formatWon(dayIncome)}` : ''}${daySaving > 0 ? ` 저축 ${formatWon(daySaving)}` : ''}`}
                      onClick={() => openDayDetailOrEntry(cell.key)}
                      onMouseEnter={() => {
                        if (hasDayTipData) setCalendarDayTipHoverKey(cell.key)
                      }}
                      onMouseLeave={() => {
                        setCalendarDayTipHoverKey((k) => (k === cell.key ? null : k))
                      }}
                      onTouchStart={() => {
                        if (!hasDayTipData) return
                        setCalendarDayTipHoverKey(null)
                        if (calendarDayTouchTipTimeoutRef.current) {
                          window.clearTimeout(calendarDayTouchTipTimeoutRef.current)
                        }
                        setCalendarDayTipTouchKey(cell.key)
                        calendarDayTouchTipTimeoutRef.current = window.setTimeout(() => {
                          setCalendarDayTipTouchKey(null)
                          calendarDayTouchTipTimeoutRef.current = null
                        }, 2600)
                      }}
                    >
                      {dayIncome > 0 ? (
                        <span className="calendar-day-mark calendar-day-mark--income" aria-hidden />
                      ) : null}
                      {daySaving > 0 ? (
                        <span className="calendar-day-mark calendar-day-mark--saving" aria-hidden />
                      ) : null}
                      <div className="calendar-day-stack">
                        <span className="calendar-day-number">{cell.day}</span>
                        {hasExpense ? (
                          <span className="calendar-day-expense">{expenseText}</span>
                        ) : null}
                      </div>
                      {hasExpense ? (
                        <img
                          src={calendarDayCatSrc}
                          alt=""
                          className={`calendar-day-cat-icon${isHighExpenseCatDay ? ' calendar-day-cat-icon--red1' : ''}`}
                          aria-hidden="true"
                        />
                      ) : null}
                      {showDayTip ? (
                        <div className="calendar-day-tip" role="tooltip">
                          <div className="calendar-day-tip__row">
                            <span className="calendar-day-tip__k">수입</span>
                            <span className="calendar-day-tip__v">{formatWon(dayIncome)}</span>
                          </div>
                          <div className="calendar-day-tip__row">
                            <span className="calendar-day-tip__k">저축</span>
                            <span className="calendar-day-tip__v">{formatWon(daySaving)}</span>
                          </div>
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
          </section>
          <div className="settings-toggle-bar" aria-label="설정 및 화면 모드">
            <button
              type="button"
              className="settings-toggle-side settings-toggle-side--left"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              aria-controls="settings-expand-panel"
            >
              <span className="settings-toggle-left">
                <img src={entryCatUrl} alt="" className="settings-toggle-cat" aria-hidden />
                <span className="settings-toggle-title">설정</span>
              </span>
            </button>
            <button
              type="button"
              className={`settings-theme-ios ${colorMode === 'dark' ? 'settings-theme-ios--dark' : ''}`}
              onClick={() => setColorModePersist(colorMode === 'light' ? 'dark' : 'light')}
              role="switch"
              aria-checked={colorMode === 'light'}
              aria-label={
                colorMode === 'light'
                  ? '라이트 모드입니다. 다크 모드로 전환하려면 누르세요.'
                  : '다크 모드입니다. 라이트 모드로 전환하려면 누르세요.'
              }
            >
              <span className="settings-theme-ios-slider" aria-hidden />
              <span className="settings-theme-ios-inner">
                <span
                  className={`settings-theme-ios-side settings-theme-ios-side--day ${colorMode === 'light' ? 'settings-theme-ios-side--on' : ''}`}
                >
                  <span className="settings-theme-ios-icon">
                    <ThemeSunGlyph />
                  </span>
                  <span className="settings-theme-ios-text">DAY</span>
                </span>
                <span
                  className={`settings-theme-ios-side settings-theme-ios-side--night ${colorMode === 'dark' ? 'settings-theme-ios-side--on' : ''}`}
                >
                  <span className="settings-theme-ios-icon">
                    <ThemeMoonGlyph />
                  </span>
                  <span className="settings-theme-ios-text">DARK</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              className="settings-toggle-side settings-toggle-side--right"
              onClick={() => setSettingsOpen((prev) => !prev)}
              aria-expanded={settingsOpen}
              aria-controls="settings-expand-panel"
            >
              <span className="settings-toggle-right">
                <span className="settings-toggle-hint">잔소리 수위 · 금지 기간 설정</span>
                <span className="settings-toggle-chevron" aria-hidden>›</span>
              </span>
            </button>
          </div>
          {settingsOpen && (
            <div className="settings-row" id="settings-expand-panel">
              <label>잔소리 수위
                <select value={nagIntensity} onChange={(e) => onChangeIntensity(e.target.value)}>
                  <option value="normal">보통</option>
                  <option value="hard">강함</option>
                  <option value="spartian-lite">spartian-lite</option>
                  <option value="spartian">spartian</option>
                  <option value="spartian-max">spartian-max</option>
                </select>
              </label>
              <label>금지 기간
                <select value={banPeriod} onChange={(e) => onChangeBanPeriod(e.target.value)}>
                  <option value="7days">7일</option>
                  <option value="this-month">이번 달 남은 기간</option>
                  <option value="next-month">다음 달 전체</option>
                </select>
              </label>
              <div className="settings-data-actions" aria-label="데이터 백업 및 복원">
                <button type="button" className="settings-data-btn" onClick={exportBackupData}>데이터 내보내기</button>
                <button type="button" className="settings-data-btn" onClick={openImportFilePicker}>데이터 가져오기</button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json"
                  className="settings-data-file-input"
                  onChange={importBackupData}
                />
              </div>
            </div>
          )}
          </div>

          <section className="month-end-card" aria-label="월말 절약 코칭">
              <div className="month-end-card__top">
                <div className="month-end-card__lead">
                  <img src={tokCatUrl} alt="" className="month-end-card__tok" aria-hidden />
                  <div className="month-end-card__titles">
                    <h3 className="month-end-card__title">월말 절약 코칭</h3>
                    <p className="month-end-card__subtitle month-end-card__subtitle--with-help">
                      <span>{monthEnd.firstPrioritySubtitle}</span>
                      <span className={`month-end-help ${monthEndHelpOpenKey === 'topCut' ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="month-end-help__trigger"
                          aria-label="1순위 비필수 계산식 설명"
                          onClick={() => toggleMonthEndHelp('topCut')}
                        >
                          ?
                        </button>
                        <span className="month-end-help__content">
                          선택한 달의 비필수 카테고리 합계를 비교해 가장 큰 항목 1개를 표시합니다.
                        </span>
                      </span>
                    </p>
                    <p className="month-end-card__basis">계산 기준: 선택한 달의 비필수 지출</p>
                  </div>
                </div>
                <div className="month-end-card__metrics">
                  <div className="month-end-metric">
                    <span className="month-end-metric__label month-end-metric__label--with-help">
                      <span>총 비필수 지출</span>
                      <span className={`month-end-help ${monthEndHelpOpenKey === 'nonEssential' ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="month-end-help__trigger"
                          aria-label="총 비필수 지출 계산식 설명"
                          onClick={() => toggleMonthEndHelp('nonEssential')}
                        >
                          ?
                        </button>
                        <span className="month-end-help__content">
                          선택한 달 지출 중 필수(living, fixed)를 제외한 모든 금액 합계입니다.
                        </span>
                      </span>
                    </span>
                    <span className="month-end-metric__value">{formatWon(monthEnd.currentNonEssential)}</span>
                  </div>
                  <div className="month-end-metric">
                    <span className="month-end-metric__label month-end-metric__label--with-help">
                      <span>다음 달 목표</span>
                      <span className={`month-end-help ${monthEndHelpOpenKey === 'goal' ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="month-end-help__trigger"
                          aria-label="다음 달 목표 계산식 설명"
                          onClick={() => toggleMonthEndHelp('goal')}
                        >
                          ?
                        </button>
                        <span className="month-end-help__content">
                          선택한 달 총 비필수 지출의 80%를 반올림한 값입니다. (현재월 비필수 x 0.8)
                        </span>
                      </span>
                    </span>
                    <span className="month-end-metric__value">{formatWon(monthEnd.nextMonthForcedGoal)}</span>
                  </div>
                  <div className="month-end-metric">
                    <span className="month-end-metric__label month-end-metric__label--with-help">
                      <span>여유 자금</span>
                      <span className={`month-end-help ${monthEndHelpOpenKey === 'surplus' ? 'active' : ''}`}>
                        <button
                          type="button"
                          className="month-end-help__trigger"
                          aria-label="여유 자금 계산식 설명"
                          onClick={() => toggleMonthEndHelp('surplus')}
                        >
                          ?
                        </button>
                        <span className="month-end-help__content">
                          전월 비필수 x 0.8(이번 달 목표)에서 현재 비필수를 뺀 값입니다.
                        </span>
                      </span>
                    </span>
                    <span className={`month-end-metric__value month-end-surplus month-end-surplus--${monthEnd.surplusTone}`}>
                      {monthEnd.surplusDisplay}
                    </span>
                  </div>
                </div>
              </div>
              <div className="month-end-card__nag">
                {[
                  monthEnd.goalStatusText,
                  angryCatCountInCalendar >= 5 ? '집사야, 이번 달은 고양이가 굶게 생겼다' : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </div>
          </section>
          <footer className="app-disclaimer app-disclaimer--in-home" aria-label="투자 면책 조항">
            <span className="app-disclaimer-icon" aria-hidden="true">ⓘ</span>
            <span>
              {INVESTMENT_DISCLAIMER}
              {screen === 'entry' && ` ${ENTRY_DISCLAIMER_EXTRA}`}
            </span>
          </footer>
          <div className="floating-actions">
            <button type="button" onClick={() => openEntryForDate(toDateKey(new Date()))}>+ 입력</button>
          </div>
        </section>

        <section className={`screen entry-screen ${screen === 'entry' ? 'active' : ''}`}>
          <header className="flow-header">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                resetEntryFormForNew()
                setScreen('home')
              }}
            >
              ←
            </button>
            <h2>
              <span>{editingTransactionId ? '내역 수정' : '금액 입력'}</span>
              <img src={entryCatUrl} alt="" className="entry-title-cat" aria-hidden="true" />
            </h2>
          </header>
          <label className="entry-amount-label">
            금액(원)
            <span className="amount-korean-reading" aria-live="polite">
              {amountKoreanReading || '\u00a0'}
            </span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="예: 6,500"
              value={amountInput}
              onChange={(e) => setAmountInput(formatWonInputValue(e.target.value))}
            />
          </label>
          <label>날짜
            <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </label>
          <label>메모
            <input
              type="text"
              placeholder={selectedType === 'expense' ? '상세 내용(예: 아메리카노 2잔, 야근 택시)' : '메모(선택)'}
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
            />
          </label>
          {selectedType === 'expense' && (
            <div className="quick-tag-row">
              {QUICK_MEMO_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`quick-tag-btn ${selectedQuickTag === tag ? 'active' : ''}`}
                  onClick={() => toggleQuickTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
          <div className="type-group">
            <button
              className={`type-btn ${selectedType === 'expense' ? 'active' : ''}`}
              type="button"
              aria-label="지출"
              onClick={() => handleSelectType('expense')}
            >
              <img src={payTypeUrl} alt="" className="type-btn-img" draggable={false} />
            </button>
            <button
              className={`type-btn ${selectedType === 'income' ? 'active' : ''}`}
              type="button"
              aria-label="수입"
              onClick={() => handleSelectType('income')}
            >
              <img src={incomeTypeUrl} alt="" className="type-btn-img" draggable={false} />
            </button>
            <button
              className={`type-btn ${selectedType === 'saving' ? 'active' : ''}`}
              type="button"
              aria-label="저축"
              onClick={() => handleSelectType('saving')}
            >
              <img src={saveTypeUrl} alt="" className="type-btn-img" draggable={false} />
            </button>
          </div>
          {editingTransactionId ? (
            <button id="go-category" className="ghost entry-submit-next" type="button" onClick={() => setScreen('category')}>
              다음: 카테고리 선택 후 완료
            </button>
          ) : (
            <button id="go-category" className="ghost" type="button" onClick={() => setScreen('category')}>
              다음: 카테고리
            </button>
          )}
          {editingTransactionId ? (
            <button
              type="button"
              className="entry-delete-record-btn entry-delete-record-btn--img"
              onClick={requestDeleteFromEntryEdit}
            >
              <img src={delBtnUrl} alt="이 내역 삭제하기" className="entry-delete-img" />
            </button>
          ) : null}
        </section>

        <section className={`screen ${screen === 'category' ? 'active' : ''}`}>
          <header className="flow-header">
            <button type="button" className="ghost" onClick={() => setScreen('entry')}>←</button>
            <h2>{editingTransactionId ? '카테고리 · 수정 완료' : '카테고리 선택'}</h2>
          </header>
          <div className="category-grid">
            {categories.map((item) => {
              const isWarning = selectedType === 'expense' && warningExpenseCategories.has(item)
              const isCurrentEdit = Boolean(editingRecord && editingRecord.category === item)
              return (
                <button
                  key={item}
                  className={`cat-btn ${isWarning ? 'cat-btn-warning' : ''} ${isCurrentEdit ? 'cat-btn--current-edit' : ''}`}
                  type="button"
                  onClick={() => handleCategoryClick(item)}
                >
                  <img src={CATEGORY_ICON_BY_KEY[item] ?? cat7Url} alt="" className="cat-btn-icon" aria-hidden="true" />
                  <span className="cat-btn-label">{getCategoryLabel(item)}</span>
                </button>
              )
            })}
          </div>
        </section>
      </main>

      <a
        className="feedback-link-btn"
        href="https://docs.google.com/forms/d/e/1FAIpQLSecvQQqtGiR2IcFYnEZ5UDM1wYC0z8iVlGyltoiC1rmps0bng/viewform?usp=publish-editor"
        target="_blank"
        rel="noreferrer"
        aria-label="고양이 집사에게 피드백 보내기"
      >
        <span className="feedback-link-btn-icon" aria-hidden="true">💌</span>
        <span>고양이 집사에게 피드백 보내기</span>
      </a>

      <div className={`modal ${analysisOpen ? '' : 'hidden'}`}>
        <div className="modal-card analysis-modal-card">
          <h3>🐾 잔소리의 복리 효과</h3>
          <p className="analysis-intro-hero">{analysisText.intro}</p>
          <div className="analysis-grid">
            <div className="analysis-grid-box analysis-grid-label">
              <span>기회비용</span>
              <span className="analysis-cat-square" aria-hidden="true">
                <img src={analysisCardCats[0]} alt="" />
              </span>
            </div>
            <div className="analysis-grid-box">
              <p className="analysis-mini-label">10년 반복 지출액</p>
              <p className="analysis-value danger">{analysisText.expenseAmount}</p>
              <p className="analysis-mini-note">투자 시 예상 자산 {analysisText.investAmount}</p>
            </div>
            <div className="analysis-grid-box analysis-grid-label">
              <span className="analysis-label-with-note">
                <span>대안 제시</span>
                <span className="analysis-label-note">1년 예상<br />절약액 기준</span>
              </span>
              <span className="analysis-cat-square" aria-hidden="true">
                <img src={analysisCardCats[1]} alt="" />
              </span>
            </div>
            <div className="analysis-grid-box">
              <div className="analysis-recommendation-head">
                <p className="analysis-mini-label">{analysisText.etfName}</p>
                {lastExpenseAnalysisInput && (
                  <button
                    type="button"
                    className="analysis-refresh-btn"
                    onClick={refreshAnalysisRecommendation}
                    aria-label="다른 대안 새로고침"
                    title="다른 대안 보기"
                  >
                    ↻
                  </button>
                )}
              </div>
              <p className="analysis-mini-note">{analysisText.etfReason}</p>
              <p className="analysis-mini-note">{analysisText.shareProjection}</p>
            </div>
            <div className="analysis-grid-box analysis-grid-label">
              <span className="analysis-two-line-label">스파르타<br />경고</span>
              <span className="analysis-cat-square" aria-hidden="true">
                <img src={analysisCardCats[2]} alt="" />
              </span>
            </div>
            <div className="analysis-grid-box">
              <p className="analysis-mini-label">💡 팁</p>
              <p className="analysis-mini-note">{analysisText.tip}</p>
            </div>
          </div>
          <p className="analysis-disclaimer-line">
            투자 판단은 본인 책임입니다.
            <button type="button" className="analysis-disclaimer-toggle" onClick={() => setAnalysisDisclaimerOpen((prev) => !prev)}>
              (상세보기)
            </button>
          </p>
          {analysisDisclaimerOpen && <p className="analysis-disclaimer-detail">{analysisText.disclaimer}</p>}
          <button type="button" onClick={() => {
            setAnalysisOpen(false)
            setAnalysisDisclaimerOpen(false)
          }}
          >
            확인
          </button>
        </div>
      </div>

      <div className={`modal ${chartOpen ? '' : 'hidden'}`}>
        <div className="modal-card modal-card-ratio-chart">
          <button
            type="button"
            className="ratio-chart-close"
            aria-label="닫기"
            onClick={() => setChartOpen(false)}
          >
            ×
          </button>
          <h3>수입/지출/저축 비율</h3>
          <div className="ratio-chart-row">
            <img src={checkCatUrl} alt="" className="ratio-chart-cat" draggable={false} />
            <div className="ratio-pie-host">
              <div
                className="ratio-pie-disk"
                style={{ background: ratioPieBackground }}
                role="img"
                aria-label={`수입 ${formatWon(summary.income)}, 지출 ${formatWon(summary.expense)}, 저축 ${formatWon(summary.saving)}`}
              />
              <div className="ratio-pie-cutout" aria-hidden />
            </div>
          </div>
          <p className="ratio-chart-sum-line">
            <span className="ratio-sum-item">
              <span className="ratio-sum-swatch ratio-sum-swatch--income" title="수입" aria-hidden />
              <span>수입 {formatWon(summary.income)}</span>
            </span>
            <span className="ratio-sum-sep" aria-hidden>
              /
            </span>
            <span className="ratio-sum-item">
              <span className="ratio-sum-swatch ratio-sum-swatch--expense" title="지출" aria-hidden />
              <span>지출 {formatWon(summary.expense)}</span>
            </span>
            <span className="ratio-sum-sep" aria-hidden>
              /
            </span>
            <span className="ratio-sum-item">
              <span className="ratio-sum-swatch ratio-sum-swatch--saving" title="저축" aria-hidden />
              <span>저축 {formatWon(summary.saving)}</span>
            </span>
          </p>
        </div>
      </div>

      <div className={`modal ${dashboardModalType ? '' : 'hidden'}`}>
        <div className="modal-card dashboard-modal">
          <h3 className="dashboard-list-title">
            {dashboardModalType === 'income' ? '번 것' : dashboardModalType === 'expense' ? '쓴 것' : '모은 것'}
          </h3>
          <div className="dashboard-list-bubble-row">
            <img
              src={dashboardModalType === 'expense' ? angryListCatUrl : smileListCatUrl}
              alt=""
              className="dashboard-list-bubble-cat"
              aria-hidden
            />
            <p className="dashboard-list-bubble-text">
              {dashboardModalType === 'expense'
                ? expenseModalNag
                : dashboardModalType === 'income'
                  ? incomeEncourageMessage
                  : savingEncourageMessage}
            </p>
          </div>
          {dashboardModalType === 'saving' ? (
            <div className="dashboard-list-goal-row">
              <p className="dashboard-list-goal-hint">목표 저축액 기준은 이번 달 수입의 {savingTargetRate}%예요.</p>
              <select
                className="dashboard-list-goal-select"
                value={savingTargetRate}
                onChange={(e) => onChangeSavingTargetRate(e.target.value)}
                aria-label="목표 저축 비율"
              >
                <option value={20}>20%</option>
                <option value={30}>30%</option>
                <option value={50}>50%</option>
                <option value={70}>70%</option>
              </select>
            </div>
          ) : null}
          <ul className="dashboard-list-scroll">
            {(dashboardModalType === 'income'
              ? sortedMonthRecordsByType.income
              : dashboardModalType === 'expense'
                ? sortedMonthRecordsByType.expense
                : sortedMonthRecordsByType.saving
            ).map((item) => (
              <li key={item.id} className="dashboard-list-item">
                <p className="dashboard-list-date">
                  {new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
                <div className="dashboard-list-row">
                  <span className="dashboard-list-category">{getCategoryLabel(item.category)}</span>
                  <strong className="dashboard-list-amount">{formatWon(item.amount)}</strong>
                </div>
                <p className="dashboard-list-memo">{item.memo?.trim() || '메모 없음'}</p>
              </li>
            ))}
            {(dashboardModalType === 'income'
              ? sortedMonthRecordsByType.income
              : dashboardModalType === 'expense'
                ? sortedMonthRecordsByType.expense
                : sortedMonthRecordsByType.saving
            ).length === 0 && <li className="dashboard-list-empty">이번 달 내역이 없습니다.</li>}
          </ul>
          <button type="button" className="dashboard-list-close-btn" onClick={closeDashboardModal}>닫기</button>
        </div>
      </div>

      <div className={`modal ${dayDetailDateKey ? '' : 'hidden'}`}>
        <div className="modal-card day-detail-modal">
          <section className="day-detail-panel" aria-label="선택한 날짜 거래 내역">
            <button
              type="button"
              className="day-detail-panel-close"
              onClick={() => setDayDetailDateKey(null)}
              aria-label="닫기"
            >
              ✕
            </button>
            <p className="day-detail-panel-date">
              {(dayDetailDateKey ?? '').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1.$2.$3')}
            </p>
            <div className="day-detail-panel-hero">
              <img src={dayDetailHero.src} alt="" className="day-detail-panel-hero-img" aria-hidden />
              <p className="day-detail-panel-hero-msg">{dayDetailHero.message}</p>
            </div>
            <ul className="day-detail-inline-list">
              {dayDetailRecords.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="day-detail-row-btn"
                    onClick={() => beginEditTransaction(item)}
                  >
                    <span className="day-detail-row-btn-main">
                      <span className="day-detail-type">{getTransactionTypeLabel(item.type)}</span>
                      <span className="day-detail-amount">{formatWon(item.amount)}</span>
                    </span>
                    <span className="day-detail-memo-line">
                      {getCategoryLabel(item.category)} · {item.memo?.trim() || '메모 없음'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="day-detail-add-inline"
              onClick={() => {
                if (dayDetailDateKey) openNewEntryForDate(dayDetailDateKey)
              }}
            >
              이 날짜에 추가 입력
            </button>
          </section>
        </div>
      </div>

      <div className={`modal ${pendingDeleteId ? '' : 'hidden'}`}>
        <div className="modal-card modal-card-delete-confirm">
          <h3>삭제 확인</h3>
          <p>이 내역을 삭제하면 되돌릴 수 없습니다. 정말 삭제할까요?</p>
          <div className="modal-img-actions-row" role="group" aria-label="삭제 또는 취소">
            <button type="button" className="modal-img-action-btn" onClick={confirmDeleteTransaction}>
              <img src={delBtnUrl} alt="삭제하기" />
            </button>
            <button type="button" className="modal-img-action-btn" onClick={cancelDeleteTransaction}>
              <img src={canBtnUrl} alt="취소" />
            </button>
          </div>
        </div>
      </div>

      <div className={`modal ${typeNagMessage ? '' : 'hidden'}`}>
        <div className="modal-card">
          <h3>스파르타 잔소리</h3>
          <p>{typeNagMessage}</p>
          <button type="button" onClick={confirmTypeNag}>확인</button>
        </div>
      </div>

      <div className={`cat-toast ${toastVariant === 'saving' ? 'cat-toast-saving' : ''} ${toastImageSrc ? '' : 'hidden'} ${toastVisible ? 'show' : 'hide'}`} aria-live="polite">
        {toastImageSrc && <img src={toastImageSrc} alt="" aria-hidden="true" />}
      </div>

      <div className={`modal ${redReflectionOpen ? '' : 'hidden'}`}>
        <div className="modal-card dashboard-modal red-reflection-modal">
          <button type="button" className="modal-close-top red-reflection-close-top" onClick={() => setRedReflectionOpen(false)}>✕</button>
          <h3>반성 타임 · RED 내역</h3>
          <ul className="editable-list red-reflection-list">
            {thisMonthRedRecords.map((item) => (
              <li key={item.id} className="editable-item reflection-item red-reflection-item">
                <p className="editable-item-date">{new Date(item.createdAt).getMonth() + 1}/{new Date(item.createdAt).getDate()}</p>
                <p><span className="reflection-label">항목</span>: <span className="reflection-value">{item.memo?.trim() || '메모 없음'}</span></p>
                <p><span className="reflection-label">금액</span>: <span className="reflection-value reflection-value-amount">{formatWon(item.amount)}</span></p>
                <p className="reflection-comment">{getRedReflectionComment(item.memo ?? '')}</p>
              </li>
            ))}
            {thisMonthRedRecords.length === 0 && <li className="red-reflection-empty">이번 달 RED 내역이 아직 없습니다.</li>}
          </ul>
          <div className="red-reflection-quote-row">
            <img src={ddCatUrl} alt="" className="red-reflection-quote-cat" aria-hidden />
            <p className="reflection-final-quote">지출 줄이는 거 힘들죠? 하지만 부자 되는 건 더 힘듭니다. 다시 마음 잡으세요!</p>
          </div>
          <button type="button" className="red-reflection-close-btn" onClick={() => setRedReflectionOpen(false)}>닫기</button>
        </div>
      </div>
    </>
  )
}

function getExpenseInterventionLevel(category: string): 'strong' | 'coach' | 'info' {
  if (warningExpenseCategories.has(category)) return 'strong'
  if (coachingExpenseCategories.has(category)) return 'coach'
  if (infoExpenseCategories.has(category)) return 'info'
  return 'coach'
}

function getEffectiveIntensity(level: 'strong' | 'coach' | 'info', selected: NagIntensity): NagIntensity {
  if (level === 'strong') return selected
  if (level === 'coach') {
    if (selected === 'spartian-max' || selected === 'spartian') return 'hard'
    return selected
  }
  return 'normal'
}

function getCategorySpecificComment(level: 'strong' | 'coach' | 'info', categoryLabel: string, amount: number, period: BanPeriod, memo = ''): string {
  if (categoryLabel.includes('생활')) {
    if (isDiningOutMemo(memo)) {
      return `외식/배달 성격 지출은 반복되기 쉬워요. ${period === '7days' ? '이번 주' : '이번 기간'}는 강하게 한도를 묶어 관리합시다.`
    }
    return `생활 필수 지출은 강한 통제보다 예산 관리가 우선입니다. ${period === '7days' ? '이번 주' : '이번 기간'} 한도만 정해서 안정적으로 관리하세요.`
  }

  if (categoryLabel.includes('특별')) {
    if (isTravelOrEventMemo(memo)) {
      return `여행/이벤트 지출은 한 번 커지면 회복이 어렵습니다. ${period === '7days' ? '이번 주' : '이번 기간'}는 강한 통제로 지출 속도를 늦추세요.`
    }
    if (isCongratulatoryMemo(memo)) {
      return `경조사는 관계를 위한 지출이라 완전 통제 대상은 아닙니다. 예산선을 먼저 정하고 그 안에서 챙기세요.`
    }
  }

  if (categoryLabel.includes('내 새끼')) {
    return getPetSoftNagMessage(amount, memo)
  }
  if (level === 'strong') return getRandomNagByAmount(amount)
  if (level === 'coach') {
    return `${categoryLabel} 지출은 상황형 소비입니다. ${period === '7days' ? '이번 주' : '이번 기간'} 한도만 정해서 관리하세요.`
  }
  if (categoryLabel.includes('고정') && isTelecomMemo(memo)) {
    return `고정비 중에서도 통신 항목은 조정 여지가 큽니다. ${period === '7days' ? '이번 주' : '이번 기간'} 요금제/부가서비스를 점검하세요.`
  }
  return `${categoryLabel}는 필수/고정 성격이 큰 항목입니다. 잔소리 대신 기록과 추세만 점검합니다.`
}

function getCategorySpecificBanMessage(
  category: string,
  memo: string,
  amount: number,
  period: BanPeriod,
  defaultBanMessage: (categoryLabel: string, amount: number, period: BanPeriod) => string,
): string {
  if (category === 'living') {
    if (isDiningOutMemo(memo)) {
      return defaultBanMessage('외식/배달', amount, period)
    }
    return `생활(식비/필수품)은 강한 통제 대상보다 예산 관리 권유 대상입니다. 다음 기간 한도 내에서만 관리해요.`
  }

  if (category === 'special') {
    if (isTravelOrEventMemo(memo)) {
      return defaultBanMessage('여행/이벤트', amount, period)
    }
    if (isCongratulatoryMemo(memo)) {
      return `경조사 지출은 완전 통제보다 관계와 예산의 균형이 중요합니다. 다음 기간 예산 상한만 지켜주세요.`
    }
  }

  if (category === 'pet') {
    return `반려동물 지출은 사랑의 표현이지만, ${period === '7days' ? '이번 주' : '이번 기간'} 예산 한도 안에서 집사 통장도 함께 지켜요.`
  }

  if (category !== 'fixed') {
    return defaultBanMessage(getCategoryLabel(category), amount, period)
  }

  if (isTelecomMemo(memo)) {
    return defaultBanMessage('통신비', amount, period)
  }

  return `주거/보험 성격의 고정비는 우선 절약 권장 항목에서 제외하고, 납부 안정성과 변동 추세를 우선 점검합니다.`
}

function isTelecomMemo(memo: string): boolean {
  const normalized = memo.toLowerCase()
  if (!normalized) return false
  return ['통신', '요금제', '휴대폰', '핸드폰', '인터넷', 'wifi', '알뜰폰'].some((keyword) => normalized.includes(keyword))
}

function getPetSoftNagMessage(amount: number, memo: string): string {
  const normalized = memo.toLowerCase()
  if (amount >= PET_LARGE_EXPENSE_THRESHOLD) {
    return pickRandomLocal(PET_SOFT_NAGS_LARGE)
  }
  if (['간식', '사료', '캔', '츄르'].some((keyword) => normalized.includes(keyword))) {
    return pickRandomLocal(PET_SOFT_NAGS_TREATS)
  }
  if (['장난감', '옷', '리드줄', '하네스'].some((keyword) => normalized.includes(keyword))) {
    return pickRandomLocal(PET_SOFT_NAGS_TOY)
  }
  if (['병원', '약', '진료', '접종'].some((keyword) => normalized.includes(keyword))) {
    return pickRandomLocal(PET_SOFT_NAGS_MEDICAL)
  }
  if (['미용', '스파', '향수', '악세', '액세'].some((keyword) => normalized.includes(keyword))) {
    return pickRandomLocal(PET_SOFT_NAGS_GROOMING)
  }
  return '아이를 챙기는 마음은 최고예요. 다만 집사 통장 체력도 같이 관리해요.'
}

function pickRandomLocal(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)]
}

function isDiningOutMemo(memo: string): boolean {
  const normalized = memo.toLowerCase()
  return ['외식', '배달', '회식', '맛집', '야식', '카페'].some((keyword) => normalized.includes(keyword))
}

function isTravelOrEventMemo(memo: string): boolean {
  const normalized = memo.toLowerCase()
  return ['여행', '해외', '항공', '비행기', '호텔', '숙소', '이벤트', '공연', '콘서트'].some((keyword) => normalized.includes(keyword))
}

function isCongratulatoryMemo(memo: string): boolean {
  const normalized = memo.toLowerCase()
  return ['경조사', '축의금', '부의금', '조의금', '돌잔치', '결혼식', '장례'].some((keyword) => normalized.includes(keyword))
}

function getRedReflectionComment(memo: string): string {
  const normalized = memo.toLowerCase()
  if (normalized.includes('택시')) {
    return '두 번 탈 거 한 번으로 줄이세요. 기본요금 거리는 튼튼한 두 다리로!'
  }
  if (normalized.includes('커피')) {
    return '카페인 수혈도 적당히! 내일은 집에서 타온 커피 어때요?'
  }
  if (['옷', '가방', '화장품'].some((keyword) => normalized.includes(keyword))) {
    return '인스타 보고 산 거 아니죠? 결제 전 10초만 더 고민하세요.'
  }
  return '지금 지출도 기록하면 통제할 수 있어요. 다음 결제 전 10초만 더 생각해봐요.'
}

function getBudgetGaugeStage(ratioPercent: number): {
  label: string
  percent: number
  tone: 'tone-risk' | 'tone-caution' | 'tone-giveup'
} {
  if (ratioPercent >= 90) {
    return { label: BUDGET_GAUGE_STAGE_ORDER[2].label, percent: Math.min(ratioPercent, 100), tone: 'tone-giveup' }
  }
  if (ratioPercent >= 50) {
    return { label: BUDGET_GAUGE_STAGE_ORDER[1].label, percent: ratioPercent, tone: 'tone-caution' }
  }
  return { label: BUDGET_GAUGE_STAGE_ORDER[0].label, percent: ratioPercent, tone: 'tone-risk' }
}

function getBudgetGaugeNagLine(ratioPercent: number): string {
  if (ratioPercent > 100) return '에휴, 내 팔자야... 결국 다 썼구나? 포기다, 포기! 🔥'
  if (ratioPercent >= 81) return '지갑 닫아! 지금 안 멈추면 이번 달은 끝이야! 🚫'
  if (ratioPercent >= 51) return '잠깐! 벌써 절반 넘게 썼어. 정신 차려, 집사! ⚠️'
  if (ratioPercent >= 31) return '어어? 슬슬 쓰는 게 늘어나는데? 지켜보고 있다. 👀'
  return '좋아, 잘하고 있어. 이대로만 아껴 쓰자! ✨'
}

function pickRandomCatFaces(): [string, string, string] {
  const sources = [cat3Url, cat4Url, cat6Url, cat7Url]
  const shuffled = [...sources].sort(() => Math.random() - 0.5)
  return [shuffled[0], shuffled[1], shuffled[2]]
}

/** nagMessage는 ' / '로 두 문단을 이어 붙임. 본문에 '필수/고정'처럼 슬래시가 있으면 split('/')만 쓰면 앞 문단이 중간에 잘림. */
function getCompactTip(message: string): string {
  const delimiter = ' / '
  const cut = message.indexOf(delimiter)
  const primary = (cut >= 0 ? message.slice(0, cut) : message).trim() || message.trim()
  if (primary.length <= 58) return primary
  return `${primary.slice(0, 58)}...`
}

function formatCalendarExpense(totalExpense: number): string {
  if (totalExpense === 0) return '0'
  const rounded = Math.round(totalExpense)
  return `-${rounded.toLocaleString('ko-KR')}`
}

function getTransactionsForDateKey(records: TransactionRecord[], dateKey: string): TransactionRecord[] {
  return records
    .filter((item) => toDateKey(new Date(item.createdAt)) === dateKey)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

function deriveQuickTagFromMemo(memo: string): string {
  const t = memo.trim()
  for (const tag of QUICK_MEMO_TAGS) {
    if (t === tag || t.startsWith(`${tag} `)) return tag
  }
  return ''
}

function getTransactionTypeLabel(type: TransactionType): string {
  if (type === 'income') return '수입'
  if (type === 'saving') return '저축'
  return '지출'
}

function getMonthEndSummary(transactions: TransactionRecord[], baseDate: Date): {
  firstPrioritySubtitle: string
  currentNonEssential: number
  nextMonthForcedGoal: number
  goalStatusText: string
  surplusDisplay: string
  surplusTone: 'positive' | 'negative' | 'neutral'
} {
  const targetMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const prevMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1)
  const currentNonEssential = getNonEssentialExpenseTotal(transactions, targetMonth)
  const prevNonEssential = getNonEssentialExpenseTotal(transactions, prevMonth)
  const nextMonthForcedGoal = Math.round(currentNonEssential * 0.8)
  const thisMonthForcedGoal = Math.round(prevNonEssential * 0.8)
  const topCut = getTopCutCategory(transactions, targetMonth)

  const firstPrioritySubtitle = topCut
    ? `1순위 비필수: ${getCategoryLabel(topCut.category)} · ${formatWon(topCut.total)}`
    : '1순위 비필수 항목: 데이터 부족'

  const gap = prevNonEssential > 0 ? thisMonthForcedGoal - currentNonEssential : null
  let surplusDisplay: string
  let surplusTone: 'positive' | 'negative' | 'neutral'
  if (gap === null) {
    surplusDisplay = '—'
    surplusTone = 'neutral'
  } else if (gap > 0) {
    surplusDisplay = `+${formatWon(gap)}`
    surplusTone = 'positive'
  } else if (gap < 0) {
    surplusDisplay = `-${formatWon(Math.abs(gap))}`
    surplusTone = 'negative'
  } else {
    surplusDisplay = formatWon(0)
    surplusTone = 'neutral'
  }

  const goalStatusText =
    prevNonEssential <= 0
      ? '전월 비필수 소비 데이터가 없어 이번 달 강제 목표 비교는 생략됩니다.'
      : (() => {
          const g = thisMonthForcedGoal - currentNonEssential
          return g >= 0
            ? `이번 달 목표(${formatWon(thisMonthForcedGoal)}) 대비 ${formatWon(g)} 여유입니다.`
            : `이번 달 목표(${formatWon(thisMonthForcedGoal)}) 대비 ${formatWon(Math.abs(g))} 초과입니다.`
        })()

  return {
    firstPrioritySubtitle,
    currentNonEssential,
    nextMonthForcedGoal,
    goalStatusText,
    surplusDisplay,
    surplusTone,
  }
}

function getMonthExpenseRecords(transactions: TransactionRecord[], date: Date): Array<{ category: string; amount: number }> {
  const y = date.getFullYear()
  const m = date.getMonth()
  return transactions
    .filter((item) => {
      if (item.type !== 'expense') return false
      const d = new Date(item.createdAt)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .map((item) => ({ category: item.category, amount: item.amount }))
}

function getNonEssentialExpenseTotal(transactions: TransactionRecord[], date: Date): number {
  return getMonthExpenseRecords(transactions, date)
    .filter((item) => !essentialExpenseCategories.has(item.category))
    .reduce((sum, item) => sum + item.amount, 0)
}

function getTopCutCategory(transactions: TransactionRecord[], date: Date): { category: string; total: number } | null {
  const totals = new Map<string, number>()
  getMonthExpenseRecords(transactions, date)
    .filter((item) => !essentialExpenseCategories.has(item.category))
    .forEach((item) => {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount)
    })

  if (totals.size === 0) return null
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
  return { category: sorted[0][0], total: sorted[0][1] }
}

function buildCalendarCells(year: number, month: number): Array<null | { key: string; day: number }> {
  const first = new Date(year, month, 1)
  const startWeekday = first.getDay() // 0: 일요일 ... 6: 토요일
  const lastDay = new Date(year, month + 1, 0).getDate()

  const totalCells = Math.ceil((startWeekday + lastDay) / 7) * 7
  const cells: Array<null | { key: string; day: number }> = []

  for (let i = 0; i < totalCells; i += 1) {
    const day = i - startWeekday + 1
    if (day < 1 || day > lastDay) {
      cells.push(null)
      continue
    }
    const d = new Date(year, month, day)
    cells.push({ key: toDateKey(d), day })
  }

  return cells
}

function dateKeyToLocalDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number)
  // UTC 변환 시 날짜가 밀리는 문제를 피하기 위해 정오 시각으로 고정합니다.
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export default App
