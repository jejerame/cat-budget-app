import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { SplashCatOverlay } from './components/SplashCatOverlay'
import { NagBubbleOverlay } from './components/NagBubbleOverlay'
import { LimitBreakOverlay } from './components/LimitBreakOverlay'
import { getInstantNagMessageForExpense, getPetInstantNagMessage } from './data/instantNagBubbles'
import {
  getHousingCheerAriaLabel,
  getHousingCheerImageUrl,
  resolveHousingCheerKey,
} from './data/housingInstantNag'
import { preloadNagBubbleImages } from './utils/preloadNagBubbleImages'
import {
  applyColorModeToDocument,
  loadColorModePreference,
  persistManualColorMode,
  resolveEffectiveColorMode,
  type ColorMode,
  type ColorModePreference,
} from './utils/colorMode'
import {
  applyBanPeriodChange,
  areNagsSilenced,
  BAN_PERIOD_UI_OPTIONS,
  getNagMessageBanPeriod,
  isBanPeriodLocked,
  loadInitialBanPeriod,
  normalizeSelectableBanPeriod,
} from './utils/nagSilence'
import { getEtfRecommendation } from './data/etfRecommendations'
import {
  getBanPeriodLabel,
  getEffectiveIntensity,
  getIntensityCopy,
  isNagIntensityLocked,
  NAG_INTENSITY_UI_OPTIONS,
  normalizeNagIntensity,
  type BanPeriod,
  type NagIntensity,
} from './data/nagIntensity'
import {
  getBudgetGaugeNagLine,
  getExpenseModalNagMessages,
  getPettyNagQuote,
  getRandomNagByAmount,
  getRedReflectionComment,
  getWeeklySettlementNagText,
} from './data/nagMessages'
import { getCategoryLabel } from './data/spendingCategories'
import {
  calculateTenYearCompoundValue,
  calculateTenYearMonthlyWaste,
  formatWon,
  formatWonInputValue,
  parseWonInput,
  wonAmountToKorean,
} from './utils/finance'
import {
  createTransaction,
  getMonthSummary,
  isMonthBudgetExceeded,
  loadTransactions,
  saveTransactions,
  toDateKey,
  type TransactionRecord,
  type TransactionType,
} from './utils/transactions'
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
import beghouseCatUrl from '../beghouse.png'
import bookCatUrl from '../book.png'
import tourCatUrl from '../tour.png'
import dateCoupleCatUrl from '../date1.png'
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
const SAVING_TARGET_RATE_STORAGE_KEY = 'compound-saving-target-rate'
/** 지출 비율 게이지 5단계(막대 20% 구간마다) — 상단 칩 라벨 */
const BUDGET_GAUGE_STAGES: { tone: 'tone-risk' | 'tone-caution' | 'tone-giveup'; label: string }[] = [
  { tone: 'tone-risk', label: '1·양호' },
  { tone: 'tone-risk', label: '2·주의' },
  { tone: 'tone-caution', label: '3·경고' },
  { tone: 'tone-caution', label: '4·위험' },
  { tone: 'tone-giveup', label: '5·한계' },
]
/** 1~5단계 고정 이미지(비율 0~20, 20~40, …, 80~100+) */
const BUDGET_GAUGE_CAT_SRC = [happyGaugeUrl, supGaugeUrl, ang1GaugeUrl, ang2GaugeUrl, redCatUrl] as const
const INVESTMENT_DISCLAIMER = '본 앱의 기회비용 계산 및 제안은 소비 절약을 돕기 위한 참고용이며, 실제 투자 결과에 대해 제작자는 어떠한 법적 책임도 지지 않습니다. 투자의 판단과 책임은 사용자 본인에게 있습니다.'
const ENTRY_DISCLAIMER_EXTRA = '과거 데이터에 기반한 예시일 뿐 수익을 보장하지 않습니다.'
const DAILY_ANGRY_THRESHOLD = 100_000 // 10만원 이상이면 angry
/** 달력 셀: 하루 지출 합계가 이 금액을 넘으면 red1.png 고양이로 표시 */
const CALENDAR_DAY_HIGH_EXPENSE_CAT_THRESHOLD = 200_000
/** 단일 지출이 이 금액 이상이면 말풍선(say1) 종료 후 「잔소리의 복리 효과」만 표시 */
const HIGH_EXPENSE_COMPOUND_THRESHOLD = 200_000
const INSTANT_NAG_BUBBLE_MS = 2_000
const WEEKLY_SETTLEMENT_BUBBLE_STORAGE_PREFIX = 'weekly-settlement-bubble:v1:'
/** 달력 연도 콤보: 거래가 없어도 선택 가능하도록 올해 기준 이전·이후 연도를 항상 포함 */
const CALENDAR_YEAR_COMBO_PAST = 15
const CALENDAR_YEAR_COMBO_FUTURE = 1
const QUICK_MEMO_TAGS = [
  '커피',
  '택시',
  '외식',
  '배달',
  '해외여행',
  '이벤트',
  '경조사',
  '통신',
  '월세',
  '대출이자',
  '사료',
  '병원',
]
const INCOME_BUBBLE_MESSAGES = [
  '이번 달도 고생했어.',
  '오늘도 번 만큼 대단해.',
  '수입 기록 완료! 진짜 잘하고 있어.',
]

const expenseCategories = [
  'red',
  'living',
  'couple',
  'fixed',
  'housing',
  'self_dev',
  'special',
  'pet',
]
const incomeCategories = ['salary', 'allowance', 'carryover', 'other']
const savingCategories = ['saving', 'other']
const warningExpenseCategories = new Set(['red'])
const coachingExpenseCategories = new Set(['living', 'couple', 'self_dev', 'special', 'pet'])
const infoExpenseCategories = new Set(['fixed', 'housing'])
const essentialExpenseCategories = new Set(['living', 'fixed', 'housing'])

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const POPUP_IMAGE_BY_TYPE = {
  expense: popupExpenseUrl,
  savingGood: popupSavingGoodUrl,
  savingBad: popupSavingBadUrl,
} as const
const CATEGORY_ICON_BY_KEY: Record<string, string> = {
  red: redCatUrl,
  living: martCatUrl,
  couple: dateCoupleCatUrl,
  fixed: houseCatUrl,
  housing: beghouseCatUrl,
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
  const [nagBubble, setNagBubble] = useState<null | {
    variant: 'instant' | 'weekly'
    text: string
    imageSrc?: string
    /** cheer PNG 등 이미지 내 문구만 표시(텍스트 오버레이 없음) */
    imageOnly?: boolean
  }>(null)
  const pendingCompoundAfterInstantRef = useRef<null | { amount: number; category: string; memo: string }>(null)
  const nagBubbleRef = useRef(nagBubble)
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
  const [limitBreakOpen, setLimitBreakOpen] = useState(false)
  const [limitBreakGaugeFlash, setLimitBreakGaugeFlash] = useState(false)
  const prevDeficitRef = useRef<boolean | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [colorModePreference, setColorModePreference] = useState<ColorModePreference>(() => loadColorModePreference())
  const [colorMode, setColorMode] = useState<ColorMode>(() =>
    resolveEffectiveColorMode(loadColorModePreference()),
  )
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
  const [nagIntensity, setNagIntensity] = useState<NagIntensity>(() => {
    const stored = localStorage.getItem(NAG_INTENSITY_STORAGE_KEY)
    const normalized = normalizeNagIntensity(stored)
    if (stored !== normalized) {
      try {
        localStorage.setItem(NAG_INTENSITY_STORAGE_KEY, normalized)
      } catch {
        /* ignore */
      }
    }
    return normalized
  })
  const [banPeriod, setBanPeriod] = useState<BanPeriod>(() => loadInitialBanPeriod())
  const nagsSilenced = areNagsSilenced(banPeriod)
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
  /** 가용 예산(분모) = 수입 − 저축 + 이월(이월 카테고리 수입 합, 없으면 0). 0 이하이면 비율 0%. */
  const gaugeAvailableBudgetRaw = summary.income - summary.saving + summary.carryoverIncome
  const gaugeAvailableBudget = Math.max(0, gaugeAvailableBudgetRaw)
  const budgetRatioUncapped = useMemo(() => {
    if (gaugeAvailableBudget <= 0) return 0
    return (summary.expense / gaugeAvailableBudget) * 100
  }, [summary.expense, gaugeAvailableBudget])
  /** 가용 예산을 넘긴 지출이면 적자로 간주(분모 0이면 지출만 있으면 적자 표시) */
  const isDeficitActual =
    gaugeAvailableBudget > 0 ? summary.expense > gaugeAvailableBudget : summary.expense > 0
  const isViewingCurrentMonth = useMemo(() => {
    const n = new Date()
    return selectedCalendarYear === n.getFullYear() && selectedCalendarMonth === n.getMonth()
  }, [selectedCalendarYear, selectedCalendarMonth])
  const handleLimitBreakExplosionPhase = useCallback((active: boolean) => {
    setLimitBreakGaugeFlash(active)
  }, [])
  const budgetThumbLeftPercent = Math.min(budgetRatioUncapped, 100)
  const budgetGaugeTierIndex = getBudgetGaugeTierIndex(budgetRatioUncapped)
  const budgetGaugeStage = getBudgetGaugeStage(budgetGaugeTierIndex, budgetRatioUncapped)
  const budgetGaugeNagLine = getBudgetGaugeNagLine(budgetRatioUncapped, budgetGaugeTierIndex, nagIntensity)
  const budgetGaugeCatSrc = BUDGET_GAUGE_CAT_SRC[budgetGaugeTierIndex]
  const amountKoreanReading = useMemo(() => {
    const n = parseWonInput(amountInput)
    return !Number.isNaN(n) && n > 0 ? wonAmountToKorean(n) : ''
  }, [amountInput])
  const expenseMonthTop3 = useMemo(
    () => getTopExpenseCategoriesByMonth(transactions, selectedCalendarDate, 3),
    [transactions, selectedCalendarDate],
  )
  const pettyNagQuote = useMemo(() => {
    const seed =
      selectedCalendarDate.getFullYear() * 7919 +
      selectedCalendarDate.getMonth() * 503 +
      expenseMonthTop3.reduce((acc, row, i) => acc + row.total * (i + 7) + row.category.length * 97, 0)
    return getPettyNagQuote(seed, nagIntensity)
  }, [selectedCalendarDate, expenseMonthTop3, nagIntensity])
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
    const messages = getExpenseModalNagMessages(expenseTotal, nonEssentialRate, formatWon)
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
    if (!isViewingCurrentMonth) {
      prevDeficitRef.current = isDeficitActual
      return
    }
    const prev = prevDeficitRef.current
    prevDeficitRef.current = isDeficitActual
    if (prev === null) return
    if (prev === false && isDeficitActual && !limitBreakOpen) {
      setLimitBreakOpen(true)
    }
  }, [isDeficitActual, isViewingCurrentMonth, limitBreakOpen])

  useEffect(() => {
    if (!limitBreakOpen) return
    setNagBubble(null)
    pendingCompoundAfterInstantRef.current = null
    setAnalysisOpen(false)
  }, [limitBreakOpen])

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
    applyColorModeToDocument(colorMode)
  }, [colorMode])

  useEffect(() => {
    if (colorModePreference !== 'auto') {
      setColorMode(colorModePreference)
      return undefined
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = (): void => {
      setColorMode(mq.matches ? 'dark' : 'light')
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [colorModePreference])

  useEffect(() => {
    void preloadNagBubbleImages()
  }, [])

  useEffect(() => {
    if (banPeriod === 'none') return
    if (!areNagsSilenced(banPeriod)) {
      setBanPeriod('none')
      applyBanPeriodChange('none')
    }
  }, [banPeriod])

  useEffect(() => {
    if (!nagsSilenced) return
    setNagBubble(null)
    pendingCompoundAfterInstantRef.current = null
    setAnalysisOpen(false)
    setRedReflectionOpen(false)
    setToastVisible(false)
    setToastImageSrc('')
  }, [nagsSilenced])

  useEffect(() => {
    nagBubbleRef.current = nagBubble
  }, [nagBubble])

  useEffect(() => {
    if (nagsSilenced) return undefined
    if (nagBubble != null) return undefined
    if (screen !== 'home') return undefined
    const today = new Date()
    if (today.getDay() !== 0) return undefined
    const key = `${WEEKLY_SETTLEMENT_BUBBLE_STORAGE_PREFIX}${toDateKey(today)}`
    try {
      if (localStorage.getItem(key)) return undefined
    } catch {
      return undefined
    }

    const id = window.setTimeout(() => {
      if (nagBubbleRef.current != null) return
      try {
        if (localStorage.getItem(key)) return
      } catch {
        return
      }
      const text = getWeeklySettlementNagText(transactions, new Date(), nagIntensity)
      try {
        localStorage.setItem(key, '1')
      } catch {
        /* ignore */
      }
      if (!text) return
      setNagBubble({ variant: 'weekly', text })
    }, 1100)

    return () => window.clearTimeout(id)
  }, [nagsSilenced, nagBubble, screen, transactions, nagIntensity])

  function showCatToast(imageSrc: string, variant: ToastVariant): void {
    if (nagsSilenced) return
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
    const msgPeriod = getNagMessageBanPeriod(input.banPeriod)
    const nagMessage = `${getCategorySpecificComment(level, categoryLabel, input.amount, msgPeriod, input.memo, nagIntensity)} / ${getCategorySpecificBanMessage(input.category, input.memo, input.amount, msgPeriod, intensityCopy.banMessage)}`

    return {
      intro: '이 소비를 매달 한 번씩, 10년 동안 반복하면',
      expenseAmount: formatWon(waste),
      investAmount: formatWon(invested),
      etfName: etf.etfName,
      etfReason: `${etf.reason} (${getBanPeriodLabel(msgPeriod)} 기준 통제)`,
      shareProjection: getShareProjectionText(etf.etfName, annualSavingPotential),
      nag: nagMessage,
      tip: getCompactTip(nagMessage),
      disclaimer: INVESTMENT_DISCLAIMER,
    }
  }

  function openAnalysis(amount: number, type: TransactionType, category: string, memoOverride?: string): void {
    if (limitBreakOpen) return
    if (areNagsSilenced(banPeriod)) return
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
      memo: memoOverride !== undefined ? memoOverride : memoInput.trim(),
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

    if (selectedType === 'expense' && !nagsSilenced && !limitBreakOpen) {
      const expenseMonth = dateKeyToLocalDate(entryDate)
      const nowMonth = new Date()
      const isCurrentMonthEntry =
        expenseMonth.getFullYear() === nowMonth.getFullYear() &&
        expenseMonth.getMonth() === nowMonth.getMonth()
      if (isCurrentMonthEntry) {
        const wasExceeded = isMonthBudgetExceeded(transactions, expenseMonth)
        const willExceeded = isMonthBudgetExceeded(updated, expenseMonth)
        if (!wasExceeded && willExceeded) {
          prevDeficitRef.current = true
          pendingCompoundAfterInstantRef.current = null
          setLimitBreakOpen(true)
          return
        }
        if (!willExceeded) {
          pendingCompoundAfterInstantRef.current =
            amount >= HIGH_EXPENSE_COMPOUND_THRESHOLD ? { amount, category, memo: normalizedMemo } : null
          if (category === 'housing') {
            const housingKey = resolveHousingCheerKey(normalizedMemo)
            setNagBubble({
              variant: 'instant',
              text: getHousingCheerAriaLabel(housingKey),
              imageSrc: getHousingCheerImageUrl(housingKey),
              imageOnly: true,
            })
          } else {
            setNagBubble({
              variant: 'instant',
              text: getInstantNagMessageForExpense(category, normalizedMemo, amount, nagIntensity),
            })
          }
        }
      }
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
    setColorModePreference(next)
    persistManualColorMode(next)
    setColorMode(next)
  }

  function onChangeIntensity(value: string): void {
    const next = normalizeNagIntensity(value)
    if (isNagIntensityLocked(next)) return
    setNagIntensity(next)
    localStorage.setItem(NAG_INTENSITY_STORAGE_KEY, next)
  }

  function onChangeBanPeriod(value: string): void {
    const next = normalizeSelectableBanPeriod(value)
    if (isBanPeriodLocked(next)) return
    setBanPeriod(next)
    applyBanPeriodChange(next)
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

        if (parsed.settings?.nagIntensity) {
          const imported = normalizeNagIntensity(parsed.settings.nagIntensity)
          setNagIntensity(imported)
          localStorage.setItem(NAG_INTENSITY_STORAGE_KEY, imported)
        }
        if (parsed.settings?.banPeriod) {
          const imported = normalizeSelectableBanPeriod(parsed.settings.banPeriod)
          setBanPeriod(imported)
          applyBanPeriodChange(imported)
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
      <SplashCatOverlay silenced={nagsSilenced} nagIntensity={nagIntensity} />
      <LimitBreakOverlay
        open={limitBreakOpen}
        onClose={() => setLimitBreakOpen(false)}
        onExplosionPhaseChange={handleLimitBreakExplosionPhase}
      />
      <NagBubbleOverlay
        variant={nagBubble?.variant ?? 'instant'}
        text={nagBubble?.text ?? ''}
        imageSrc={nagBubble?.imageSrc}
        imageOnly={nagBubble?.imageOnly}
        visible={Boolean(nagBubble) && !nagsSilenced && !limitBreakOpen}
        autoHideMs={nagBubble?.variant === 'instant' ? INSTANT_NAG_BUBBLE_MS : undefined}
        onAutoClose={
          nagBubble?.variant === 'instant'
            ? () => {
                const pending = pendingCompoundAfterInstantRef.current
                pendingCompoundAfterInstantRef.current = null
                setNagBubble(null)
                if (pending) {
                  window.setTimeout(() => {
                    openAnalysis(pending.amount, 'expense', pending.category, pending.memo)
                  }, 0)
                }
              }
            : undefined
        }
        showConfirm={nagBubble?.variant === 'weekly'}
        onConfirm={nagBubble?.variant === 'weekly' ? () => setNagBubble(null) : undefined}
      />
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
              <h1 className="home-title-chip" aria-label="잔소리 냥가계부">
                <span className="home-title-chip__text">
                  잔소리 <span className="home-title-chip__accent">냥</span>가계부
                </span>
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
              <div className="red-indicator-click-zone interactive" onClick={() => { if (!nagsSilenced) setRedReflectionOpen(true) }}>
                <div className="red-indicator-stage-row" aria-label={`지출 비율 ${budgetGaugeStage.label}`}>
                  <span className="red-indicator-stage-title">
                    <span className="red-indicator-headline-strong">
                      지금까지 쓴 돈 {formatWon(summary.expense)}
                      <> · 가용 예산 대비 {Math.round(budgetRatioUncapped)}%</>
                    </span>{' '}
                    <span className="red-indicator-headline-meta">(수입-저축+이월 기준)</span>
                  </span>
                  <div className="red-indicator-stage-chips">
                    {BUDGET_GAUGE_STAGES.map(({ tone, label }, idx) => (
                      <span key={`stage-${idx}`} className="red-indicator-stage-chip-wrap">
                        {idx > 0 ? (
                          <span className="red-indicator-stage-sep" aria-hidden>
                            ·
                          </span>
                        ) : null}
                        <span
                          className={`red-indicator-stage-chip${budgetGaugeStage.tierIndex === idx ? ` red-indicator-stage-chip--current red-indicator-stage-chip--${tone}` : ''}`}
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
                      limitBreakGaugeFlash ? 'red-gauge-track--limit-break-flash' : '',
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
                <select
                  className="settings-intensity-select"
                  value={nagIntensity}
                  onChange={(e) => onChangeIntensity(e.target.value)}
                >
                  {NAG_INTENSITY_UI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.locked}>
                      {opt.label}
                      {opt.locked ? ' (soon)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>잔소리 금지 기간
                <select
                  className="settings-ban-period-select"
                  value={banPeriod}
                  onChange={(e) => onChangeBanPeriod(e.target.value)}
                >
                  {BAN_PERIOD_UI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.locked}>
                      {opt.label}
                      {opt.locked ? ' (soon)' : ''}
                    </option>
                  ))}
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

          <section className="month-end-card petty-nag-card" aria-label="짜투리 잔소리">
            <div className="month-end-card__top petty-nag-card__head">
              <div className="month-end-card__lead">
                <img src={tokCatUrl} alt="" className="month-end-card__tok" aria-hidden />
                <div className="month-end-card__titles">
                  <h3 className="month-end-card__title">짜투리 잔소리</h3>
                  <p className="petty-nag-card__hint">선택한 달 · 지출 카테고리 합계 기준</p>
                </div>
              </div>
            </div>
            <div className="petty-nag-card__ranks">
              {expenseMonthTop3.length === 0 ? (
                <p className="petty-nag-card__ranks-empty">이번 달 기록된 지출이 없어요.</p>
              ) : (
                expenseMonthTop3.map((row, idx) => (
                  <p key={`${row.category}-${idx}`} className="petty-nag-card__rank-row">
                    {`${idx + 1}위: ${getCategoryLabel(row.category)} ${formatWon(row.total)}`}
                  </p>
                ))
              )}
            </div>
            <p className="month-end-card__nag petty-nag-card__quote">{pettyNagQuote}</p>
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
              className={`type-btn ${selectedType === 'income' ? 'active' : ''}`}
              type="button"
              aria-label="수입"
              onClick={() => handleSelectType('income')}
            >
              <img src={incomeTypeUrl} alt="" className="type-btn-img" draggable={false} />
            </button>
            <button
              className={`type-btn ${selectedType === 'expense' ? 'active' : ''}`}
              type="button"
              aria-label="지출"
              onClick={() => handleSelectType('expense')}
            >
              <img src={payTypeUrl} alt="" className="type-btn-img" draggable={false} />
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

      <div className={`modal ${analysisOpen && !limitBreakOpen ? '' : 'hidden'}`}>
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
          {!nagsSilenced && (
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
          )}
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
          <div className="red-reflection-body">
            <ul className="editable-list red-reflection-list">
              {thisMonthRedRecords.map((item) => (
                <li key={item.id} className="editable-item reflection-item red-reflection-item">
                  <p className="editable-item-date">{new Date(item.createdAt).getMonth() + 1}/{new Date(item.createdAt).getDate()}</p>
                  <p><span className="reflection-label">항목</span>: <span className="reflection-value">{item.memo?.trim() || '메모 없음'}</span></p>
                  <p><span className="reflection-label">금액</span>: <span className="reflection-value reflection-value-amount">{formatWon(item.amount)}</span></p>
                  <p className="reflection-comment">{getRedReflectionComment(item.memo ?? '', nagIntensity)}</p>
                </li>
              ))}
              {thisMonthRedRecords.length === 0 && <li className="red-reflection-empty">이번 달 RED 내역이 아직 없습니다.</li>}
            </ul>
          </div>
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

function getCategorySpecificComment(
  level: 'strong' | 'coach' | 'info',
  categoryLabel: string,
  amount: number,
  period: BanPeriod,
  memo = '',
  nagIntensity: NagIntensity,
): string {
  if (categoryLabel.includes('생활')) {
    if (isDiningOutMemo(memo)) {
      return `외식/배달 성격 지출은 반복되기 쉬워요. ${period === '7days' ? '이번 주' : '이번 기간'}는 강하게 한도를 묶어 관리합시다.`
    }
    return `생활 필수 지출은 강한 통제보다 예산 관리가 우선입니다. ${period === '7days' ? '이번 주' : '이번 기간'} 한도만 정해서 안정적으로 관리하세요.`
  }

  if (categoryLabel.includes('커플')) {
    return `데이트·선물 비용은 반복되기 쉬워요. ${period === '7days' ? '이번 주' : '이번 기간'} 미리 정한 데이트 예산 안에서만 쓰기로 해요.`
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
  if (level === 'strong') return getRandomNagByAmount(amount, nagIntensity)
  if (level === 'coach') {
    return `${categoryLabel} 지출은 상황형 소비입니다. ${period === '7days' ? '이번 주' : '이번 기간'} 한도만 정해서 관리하세요.`
  }
  if (categoryLabel.includes('주거')) {
    const key = resolveHousingCheerKey(memo)
    if (key === 'rent') {
      return `월세는 매달 고정으로 나가요. ${period === '7days' ? '이번 주' : '이번 기간'} 다른 변동 지출만 같이 관리해요.`
    }
    if (key === 'loan') {
      return `대출 이자·원금은 장기 부담이에요. 상환 계획표와 이번 달 이자액만 다시 확인해 봐요.`
    }
    return `주거비는 필수예요. 메모에 월세·대출이자·대출금을 적어 두면 맞춤 관리가 쉬워져요.`
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
    return `생활(식비/필수품/의료)은 강한 통제 대상보다 예산 관리 권유 대상입니다. 다음 기간 한도 내에서만 관리해요.`
  }

  if (category === 'couple') {
    return `데이트 비용도 추억은 소중하지만, ${period === '7days' ? '이번 주' : '이번 기간'} 예산 한도 안에서 집사 통장도 함께 지켜요.`
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

  if (category === 'housing') {
    const key = resolveHousingCheerKey(memo)
    if (key === 'rent') {
      return `월세는 필수 지출입니다. ${period === '7days' ? '이번 주' : '이번 기간'} 납부 일정과 금액 변동만 점검해요.`
    }
    if (key === 'loan') {
      return `대출 이자·원금 상환은 우선순위 지출입니다. 상환 일정과 잔액 추이만 함께 챙겨요.`
    }
    return `주거 지출은 메모에 월세·대출이자를 적어 두면 더 정확하게 관리할 수 있어요.`
  }

  if (category !== 'fixed') {
    return defaultBanMessage(getCategoryLabel(category), amount, period)
  }

  if (isTelecomMemo(memo)) {
    return defaultBanMessage('통신비', amount, period)
  }

  return `통신·보험 고정비는 우선 절약 권장 항목에서 제외하고, 납부 안정성과 변동 추세를 우선 점검합니다.`
}

function isTelecomMemo(memo: string): boolean {
  const normalized = memo.toLowerCase()
  if (!normalized) return false
  return ['통신', '요금제', '휴대폰', '핸드폰', '인터넷', 'wifi', '알뜰폰'].some((keyword) => normalized.includes(keyword))
}

function getPetSoftNagMessage(amount: number, memo: string): string {
  return getPetInstantNagMessage(amount, memo)
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

function getBudgetGaugeTierIndex(ratioPercent: number): number {
  const clamped = Math.min(Math.max(ratioPercent, 0), 100)
  return Math.min(4, Math.floor(clamped / 20))
}

function getBudgetGaugeStage(
  tierIndex: number,
  ratioPercent: number,
): {
  label: string
  percent: number
  tone: 'tone-risk' | 'tone-caution' | 'tone-giveup'
  tierIndex: number
} {
  const idx = ratioPercent > 100 ? 4 : tierIndex
  const s = BUDGET_GAUGE_STAGES[idx]
  return { label: s.label, percent: Math.min(ratioPercent, 100), tone: s.tone, tierIndex: idx }
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

/** 선택한 달의 지출을 카테고리별로 합산한 뒤 금액 내림차순 상위 limit개 */
function getTopExpenseCategoriesByMonth(
  transactions: TransactionRecord[],
  date: Date,
  limit: number,
): Array<{ category: string; total: number }> {
  const totals = new Map<string, number>()
  getMonthExpenseRecords(transactions, date).forEach((item) => {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.amount)
  })
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
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
