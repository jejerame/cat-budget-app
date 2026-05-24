import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { wonAmountToKorean } from '../utils/finance'
import {
  buildExpenseMemo,
  EXPENSE_CATEGORY_KEYS,
  EXPENSE_CATEGORY_SHORT_LABELS,
  EXPENSE_SUBCATEGORIES,
  getSubcategoryDef,
  isExpenseCategoryKey,
  resolveSubcategoryFromMemo,
  type ExpenseCategoryKey,
} from '../data/expenseSubcategories'
import {
  createExpenseFavorite,
  deleteExpenseFavorite,
  EXPENSE_FAVORITES_MAX,
  formatFavoriteButtonLabel,
  loadExpenseFavorites,
  recordExpenseComboUsage,
  updateExpenseFavorite,
  type ExpenseFavorite,
} from '../utils/expenseFavorites'
import { ensureInstantNagForExpenseSave } from '../utils/preloadDeferredNag'

const QUICK_AMOUNTS = [4_000, 5_000, 10_000, 20_000, 50_000] as const

const FAVORITE_LONG_PRESS_MS = 500
const FAVORITE_TAP_MAX_MS = 450

function FavoriteChip({
  label,
  onTap,
  onLongPress,
}: {
  fav: ExpenseFavorite
  label: string
  onTap: () => void
  onLongPress: () => void
}) {
  const timerRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const pointerDownAtRef = useRef(0)
  const longPressFiredRef = useRef(false)
  const suppressClickRef = useRef(false)
  const lastPointerTypeRef = useRef('')

  const clearLongPressTimer = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>): void => {
    if (e.button !== 0) return
    lastPointerTypeRef.current = e.pointerType
    longPressFiredRef.current = false
    suppressClickRef.current = false
    pointerDownAtRef.current = e.timeStamp
    startPosRef.current = { x: e.clientX, y: e.clientY }
    clearLongPressTimer()
    if (e.pointerType === 'touch') {
      timerRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true
        suppressClickRef.current = true
        onLongPress()
      }, FAVORITE_LONG_PRESS_MS)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>): void => {
    const start = startPosRef.current
    if (!start) return
    if (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8) {
      clearLongPressTimer()
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>): void => {
    clearLongPressTimer()
    const start = startPosRef.current
    startPosRef.current = null
    if (longPressFiredRef.current) {
      suppressClickRef.current = true
      return
    }
    if (e.pointerType !== 'touch' || !start) return
    const elapsed = e.timeStamp - pointerDownAtRef.current
    if (elapsed <= FAVORITE_TAP_MAX_MS) {
      suppressClickRef.current = true
      onTap()
    }
  }

  const handlePointerCancel = (): void => {
    clearLongPressTimer()
    startPosRef.current = null
  }

  return (
    <button
      type="button"
      className="entry-fav-chip"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={(e) => {
        if (suppressClickRef.current || longPressFiredRef.current) {
          e.preventDefault()
          suppressClickRef.current = false
          longPressFiredRef.current = false
          return
        }
        if (lastPointerTypeRef.current === 'touch') {
          e.preventDefault()
          return
        }
        onTap()
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onLongPress()
      }}
    >
      {label}
    </button>
  )
}

export type ExpenseSavePayload = {
  category: string
  memo: string
  amount: number
}

type ExpenseEntryFlowProps = {
  entryDate: string
  onEntryDateChange: (dateKey: string) => void
  editingTransactionId: string | null
  initialCategory?: string
  initialMemo?: string
  initialAmountFormatted?: string
  categoryIconByKey: Record<string, string>
  defaultCategoryIcon: string
  warningCategories: ReadonlySet<string>
  formatWonInputValue: (raw: string) => string
  parseWonInput: (raw: string) => number
  onDelete?: () => void
  /** true면 홈·잔소리 등으로 이미 화면 전환됨 — onFinished 생략 */
  onSaveTransaction: (payload: ExpenseSavePayload) => boolean
  onFinished: () => void
}

type FavoriteFormState = {
  name: string
  category: string
  subcategoryId: string
  fixedAmountInput: string
  lockAmount: boolean
}

export function ExpenseEntryFlow({
  entryDate,
  onEntryDateChange,
  editingTransactionId,
  initialCategory,
  initialMemo = '',
  initialAmountFormatted = '',
  categoryIconByKey,
  defaultCategoryIcon,
  warningCategories,
  formatWonInputValue,
  parseWonInput,
  onDelete,
  onSaveTransaction,
  onFinished,
}: ExpenseEntryFlowProps) {
  const amountInputRef = useRef<HTMLInputElement>(null)

  const initialResolved =
    initialCategory && isExpenseCategoryKey(initialCategory)
      ? resolveSubcategoryFromMemo(initialCategory, initialMemo)
      : null

  const [favorites, setFavorites] = useState<ExpenseFavorite[]>(() => loadExpenseFavorites())
  const [expandedCategory, setExpandedCategory] = useState<ExpenseCategoryKey | null>(
    initialResolved && initialCategory && isExpenseCategoryKey(initialCategory)
      ? initialCategory
      : null,
  )
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategoryKey | null>(
    initialCategory && isExpenseCategoryKey(initialCategory) ? initialCategory : null,
  )
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(
    initialResolved?.subcategoryId ?? null,
  )
  const [customSubcategoryText, setCustomSubcategoryText] = useState(initialResolved?.customText ?? '')
  const [amountInput, setAmountInput] = useState(initialAmountFormatted)
  const [amountFocusFromFavorite, setAmountFocusFromFavorite] = useState(false)
  const amountKoreanReading = useMemo(() => {
    const n = parseWonInput(amountInput)
    return !Number.isNaN(n) && n > 0 ? wonAmountToKorean(n) : ''
  }, [amountInput, parseWonInput])

  const [suggestFavoriteOpen, setSuggestFavoriteOpen] = useState(false)
  const [favoriteFormOpen, setFavoriteFormOpen] = useState(false)
  const [favoriteModalStep, setFavoriteModalStep] = useState<'pick-category' | 'details'>('pick-category')
  const [favoritePickerCategory, setFavoritePickerCategory] = useState<ExpenseCategoryKey | null>(null)
  const [favoritePickerSubcategoryId, setFavoritePickerSubcategoryId] = useState<string | null>(null)
  const [favoritePickerCustomText, setFavoritePickerCustomText] = useState('')
  const [favoriteForm, setFavoriteForm] = useState<FavoriteFormState | null>(null)
  const [favoriteContextMenu, setFavoriteContextMenu] = useState<ExpenseFavorite | null>(null)
  const [editingFavorite, setEditingFavorite] = useState<ExpenseFavorite | null>(null)
  const [favoritesHelpOpen, setFavoritesHelpOpen] = useState(false)
  const [awaitingFavoriteDismiss, setAwaitingFavoriteDismiss] = useState(false)

  const subcategoryReady = Boolean(selectedCategory && selectedSubcategoryId)
  const isOtherSub =
    selectedSubcategoryId === 'other' &&
    selectedCategory &&
    getSubcategoryDef(selectedCategory, 'other') != null
  const amountSectionActive = subcategoryReady && (!isOtherSub || customSubcategoryText.trim().length > 0)

  const refreshFavorites = useCallback(() => {
    setFavorites(loadExpenseFavorites())
  }, [])

  useEffect(() => {
    if (amountFocusFromFavorite && amountSectionActive) {
      amountInputRef.current?.focus()
      setAmountFocusFromFavorite(false)
    }
  }, [amountFocusFromFavorite, amountSectionActive])

  const buildMemo = (): string => {
    if (!selectedCategory || !selectedSubcategoryId) return ''
    return buildExpenseMemo(selectedCategory, selectedSubcategoryId, customSubcategoryText)
  }

  const applyCategory = (cat: ExpenseCategoryKey): void => {
    setExpandedCategory(cat)
    setSelectedCategory(cat)
    setSelectedSubcategoryId(null)
    setCustomSubcategoryText('')
    setAmountInput('')
  }

  const applySubcategory = (subId: string): void => {
    setSelectedSubcategoryId(subId)
    if (subId !== 'other') setCustomSubcategoryText('')
  }

  const closeFavoriteModal = (): void => {
    setFavoriteFormOpen(false)
    setFavoriteForm(null)
    setFavoritePickerCategory(null)
    setFavoritePickerSubcategoryId(null)
    setFavoritePickerCustomText('')
    setEditingFavorite(null)
    if (suggestFavoriteOpen) {
      setSuggestFavoriteOpen(false)
      setAwaitingFavoriteDismiss(false)
      onFinished()
    }
  }

  const beginFavoriteDetailsStep = (
    category: ExpenseCategoryKey,
    subcategoryId: string,
    customText = '',
  ): void => {
    const amount = parseWonInput(amountInput)
    const defaultName =
      subcategoryId === 'other' && customText.trim()
        ? customText.trim()
        : (getSubcategoryDef(category, subcategoryId)?.label ?? '')
    setFavoritePickerCategory(category)
    setFavoritePickerSubcategoryId(subcategoryId)
    setFavoritePickerCustomText(customText)
    setFavoriteForm({
      name: defaultName,
      category,
      subcategoryId,
      fixedAmountInput: !Number.isNaN(amount) && amount > 0 ? String(amount) : '',
      lockAmount: !Number.isNaN(amount) && amount > 0,
    })
    setFavoriteModalStep('details')
    startTransition(() => {
      setFavoriteFormOpen(true)
    })
  }

  const openFavoriteAddFlow = (): void => {
    if (favorites.length >= EXPENSE_FAVORITES_MAX) {
      alert(`즐겨찾기는 최대 ${EXPENSE_FAVORITES_MAX}개까지예요.`)
      return
    }
    setEditingFavorite(null)
    if (selectedCategory && selectedSubcategoryId) {
      const isOther = selectedSubcategoryId === 'other'
      if (isOther && !customSubcategoryText.trim()) {
        setFavoritePickerCategory(selectedCategory)
        setFavoritePickerSubcategoryId('other')
        setFavoritePickerCustomText('')
        setFavoriteForm(null)
        setFavoriteModalStep('pick-category')
        startTransition(() => {
          setFavoriteFormOpen(true)
        })
        return
      }
      startTransition(() => {
        beginFavoriteDetailsStep(selectedCategory, selectedSubcategoryId, customSubcategoryText)
      })
      return
    }
    setFavoritePickerCategory(null)
    setFavoritePickerSubcategoryId(null)
    setFavoritePickerCustomText('')
    setFavoriteForm(null)
    setFavoriteModalStep('pick-category')
    startTransition(() => {
      setFavoriteFormOpen(true)
    })
  }

  const favoritePickReady =
    favoritePickerCategory != null &&
    favoritePickerSubcategoryId != null &&
    (favoritePickerSubcategoryId !== 'other' || favoritePickerCustomText.trim().length > 0)

  const advanceFromFavoritePickStep = (): void => {
    if (!favoritePickerCategory || !favoritePickerSubcategoryId) return
    if (favoritePickerSubcategoryId === 'other' && !favoritePickerCustomText.trim()) {
      alert('서브카테고리 내용을 입력해 주세요.')
      return
    }
    beginFavoriteDetailsStep(
      favoritePickerCategory,
      favoritePickerSubcategoryId,
      favoritePickerCustomText,
    )
  }

  const finishSave = (payload: ExpenseSavePayload, checkSuggest: boolean): void => {
    const navigated = onSaveTransaction(payload)
    if (checkSuggest) {
      const count = recordExpenseComboUsage(payload.category, selectedSubcategoryId!, payload.amount)
      if (count >= 3 && favorites.length < EXPENSE_FAVORITES_MAX) {
        setAwaitingFavoriteDismiss(true)
        setSuggestFavoriteOpen(true)
        return
      }
    }
    if (!navigated) onFinished()
  }

  const handleSave = (): void => {
    if (awaitingFavoriteDismiss) {
      onFinished()
      return
    }
    if (editingTransactionId) {
      if (!selectedCategory || !selectedSubcategoryId) return
      const amount = parseWonInput(amountInput)
      if (Number.isNaN(amount) || amount <= 0) {
        alert('금액을 입력해 주세요.')
        return
      }
      const memo = buildMemo()
      if (!memo) {
        alert('서브카테고리를 입력해 주세요.')
        return
      }
      onSaveTransaction({ category: selectedCategory, memo, amount })
      return
    }
    if (!selectedCategory || !selectedSubcategoryId) return
    const amount = parseWonInput(amountInput)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('금액을 입력해 주세요.')
      return
    }
    const memo = buildMemo()
    if (!memo) {
      alert('서브카테고리를 입력해 주세요.')
      return
    }
    finishSave({ category: selectedCategory, memo, amount }, true)
  }

  const handleFavoriteTap = (fav: ExpenseFavorite): void => {
    setSelectedCategory(isExpenseCategoryKey(fav.category) ? fav.category : null)
    setExpandedCategory(isExpenseCategoryKey(fav.category) ? fav.category : null)
    setSelectedSubcategoryId(fav.subcategoryId)
    setCustomSubcategoryText('')

    if (fav.fixedAmount != null && fav.fixedAmount > 0) {
      const memo = buildExpenseMemo(fav.category, fav.subcategoryId)
      void ensureInstantNagForExpenseSave(fav.category, memo)
      finishSave({ category: fav.category, memo, amount: fav.fixedAmount }, false)
      return
    }

    setAmountInput('')
    setAmountFocusFromFavorite(true)
  }

  const confirmFavoriteForm = (): void => {
    if (!favoriteForm) return
    const fixedAmount = favoriteForm.lockAmount
      ? parseWonInput(favoriteForm.fixedAmountInput)
      : NaN
    if (favoriteForm.lockAmount && (Number.isNaN(fixedAmount) || fixedAmount <= 0)) {
      alert('고정할 금액을 입력해 주세요.')
      return
    }

    if (editingFavorite) {
      updateExpenseFavorite(editingFavorite.id, {
        name: favoriteForm.name,
        category: favoriteForm.category,
        subcategoryId: favoriteForm.subcategoryId,
        fixedAmount: favoriteForm.lockAmount ? fixedAmount : null,
      })
    } else {
      const created = createExpenseFavorite({
        name: favoriteForm.name,
        category: favoriteForm.category,
        subcategoryId: favoriteForm.subcategoryId,
        fixedAmount: favoriteForm.lockAmount ? fixedAmount : null,
      })
      if (!created) {
        alert(`즐겨찾기는 최대 ${EXPENSE_FAVORITES_MAX}개까지예요.`)
        return
      }
    }
    refreshFavorites()
    closeFavoriteModal()
  }

  const startEditFavorite = (fav: ExpenseFavorite): void => {
    setFavoriteContextMenu(null)
    setEditingFavorite(fav)
    const cat = isExpenseCategoryKey(fav.category) ? fav.category : null
    if (!cat) return
    setFavoritePickerCategory(cat)
    setFavoritePickerSubcategoryId(fav.subcategoryId)
    setFavoritePickerCustomText(fav.subcategoryId === 'other' ? fav.name : '')
    setFavoriteForm({
      name: fav.name,
      category: fav.category,
      subcategoryId: fav.subcategoryId,
      fixedAmountInput: fav.fixedAmount != null ? String(fav.fixedAmount) : '',
      lockAmount: fav.fixedAmount != null,
    })
    setFavoriteModalStep('details')
    startTransition(() => {
      setFavoriteFormOpen(true)
    })
  }

  return (
    <div className="entry-flow">
      <label className="entry-field entry-field--date">
        날짜
        <span className="entry-date-wrap">
          <input type="date" value={entryDate} onChange={(e) => onEntryDateChange(e.target.value)} />
        </span>
      </label>

      <section className="entry-favorites-wrap" aria-label="즐겨찾기">
        {favorites.length > 0 ? (
          <div className="entry-favorites-head">
            <span className="entry-favorites-label" id="entry-favorites-label">
              즐겨찾기
            </span>
            <button
              type="button"
              className="entry-favorites-help-btn"
              aria-label="즐겨찾기 수정·삭제 방법"
              aria-describedby="entry-favorites-label"
              onClick={() => setFavoritesHelpOpen(true)}
            >
              ⓘ
            </button>
          </div>
        ) : null}
        <div className="entry-favorites-scroll">
          <div className="entry-favorites-track">
            {favorites.map((fav) => (
              <FavoriteChip
                key={fav.id}
                fav={fav}
                label={formatFavoriteButtonLabel(fav)}
                onTap={() => handleFavoriteTap(fav)}
                onLongPress={() => setFavoriteContextMenu(fav)}
              />
            ))}
            <button
              type="button"
              className="entry-fav-chip entry-fav-chip--add"
              onClick={openFavoriteAddFlow}
            >
              + 추가
            </button>
          </div>
        </div>
      </section>

      <section aria-label="카테고리">
        {expandedCategory === null ? (
          <div className="entry-cat-grid">
            {EXPENSE_CATEGORY_KEYS.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`entry-cat-btn ${warningCategories.has(cat) ? 'entry-cat-btn--warn' : ''}`}
                onClick={() => applyCategory(cat)}
              >
                <img
                  src={categoryIconByKey[cat] ?? defaultCategoryIcon}
                  alt=""
                  className="entry-cat-btn-icon"
                  decoding="async"
                  loading="lazy"
                  aria-hidden
                />
                <span>{EXPENSE_CATEGORY_SHORT_LABELS[cat]}</span>
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="entry-cat-collapsed"
            onClick={() => {
              setExpandedCategory(null)
              setSelectedCategory(null)
              setSelectedSubcategoryId(null)
              setCustomSubcategoryText('')
            }}
          >
            <span className="entry-cat-collapsed-check" aria-hidden>
              ✓
            </span>
            <img
              src={categoryIconByKey[expandedCategory] ?? defaultCategoryIcon}
              alt=""
              className="entry-cat-btn-icon"
              aria-hidden
            />
            <span>{EXPENSE_CATEGORY_SHORT_LABELS[expandedCategory]}</span>
            <span className="entry-cat-collapsed-hint">탭하여 변경</span>
          </button>
        )}

        {expandedCategory ? (
          <div className="entry-subcat-grid">
            {EXPENSE_SUBCATEGORIES[expandedCategory].map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={`entry-subcat-btn ${selectedSubcategoryId === sub.id ? 'active' : ''}`}
                onClick={() => applySubcategory(sub.id)}
              >
                {sub.label}
              </button>
            ))}
          </div>
        ) : null}

        {isOtherSub ? (
          <label className="entry-field">
            직접 입력
            <input
              type="text"
              value={customSubcategoryText}
              placeholder="내용 입력"
              onChange={(e) => setCustomSubcategoryText(e.target.value)}
            />
          </label>
        ) : null}
      </section>

      <section
        className={`entry-amount-section ${amountSectionActive ? 'entry-amount-section--active' : 'entry-amount-section--locked'}`}
        aria-label="금액"
      >
        <div className="entry-quick-amounts">
          {QUICK_AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              className="entry-quick-amount-btn"
              disabled={!amountSectionActive}
              onClick={() => setAmountInput(formatWonInputValue(String(n)))}
            >
              {n.toLocaleString('ko-KR')}
            </button>
          ))}
        </div>
        <label className="entry-field entry-field--amount">
          <span>금액(원)</span>
          <span className="amount-korean-reading" aria-live="polite">
            {amountKoreanReading || '\u00a0'}
          </span>
          <div className="entry-amount-input-wrap">
            <input
              ref={amountInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="done"
              placeholder="금액 입력"
              value={amountInput}
              disabled={!amountSectionActive}
              onChange={(e) => setAmountInput(formatWonInputValue(e.target.value))}
            />
            <button
              type="button"
              className="entry-fav-star-inline"
              disabled={!amountSectionActive}
              onClick={openFavoriteAddFlow}
              aria-label="즐겨찾기에 추가"
            >
              ⭐
            </button>
          </div>
        </label>
      </section>

      <div className="entry-actions">
        <button
          type="button"
          className="entry-primary-btn"
          disabled={!amountSectionActive}
          onClick={handleSave}
        >
          {editingTransactionId ? '수정 저장' : '저장'}
        </button>
        {editingTransactionId && onDelete ? (
          <button type="button" className="entry-delete-text-btn" onClick={onDelete}>
            이 내역 삭제
          </button>
        ) : null}
      </div>

      {favoritesHelpOpen ? (
        <div
          className="entry-modal-backdrop"
          role="presentation"
          onClick={() => setFavoritesHelpOpen(false)}
        >
          <div
            className="entry-modal entry-modal--help"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-favorites-help-title"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="entry-favorites-help-title" className="entry-modal-title">
              즐겨찾기 수정·삭제
            </p>
            <div className="entry-favorites-help-body">
              <p className="entry-favorites-help-row">
                <strong>스마트폰</strong>
                <span>즐겨찾기를 길게 누르면 수정·삭제할 수 있어요.</span>
              </p>
              <p className="entry-favorites-help-row">
                <strong>PC</strong>
                <span>즐겨찾기를 우클릭하면 수정·삭제 메뉴가 열려요.</span>
              </p>
            </div>
            <button
              type="button"
              className="entry-modal-primary entry-favorites-help-confirm"
              onClick={() => setFavoritesHelpOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      ) : null}

      {favoriteContextMenu ? (
        <div
          className="entry-menu-backdrop"
          role="presentation"
          onClick={() => setFavoriteContextMenu(null)}
        >
          <div
            className="entry-fav-menu"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" role="menuitem" onClick={() => startEditFavorite(favoriteContextMenu)}>
              수정
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                deleteExpenseFavorite(favoriteContextMenu.id)
                refreshFavorites()
                setFavoriteContextMenu(null)
              }}
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}

      {suggestFavoriteOpen && selectedCategory && selectedSubcategoryId ? (
        <div className="entry-modal-backdrop">
          <div className="entry-modal" role="dialog" aria-modal="true">
            <p className="entry-modal-title">즐겨찾기에 추가할까요?</p>
            <div className="entry-modal-actions">
              <button
                type="button"
                className="entry-modal-primary"
                onClick={() => {
                  setSuggestFavoriteOpen(false)
                  setEditingFavorite(null)
                  beginFavoriteDetailsStep(
                    selectedCategory,
                    selectedSubcategoryId,
                    customSubcategoryText,
                  )
                }}
              >
                추가하기
              </button>
              <button
                type="button"
                className="entry-modal-ghost"
                onClick={() => {
                  setSuggestFavoriteOpen(false)
                  setAwaitingFavoriteDismiss(false)
                  onFinished()
                }}
              >
                괜찮아요
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {favoriteFormOpen && favoriteModalStep === 'pick-category' ? (
        <div className="entry-modal-backdrop">
          <div
            className="entry-modal entry-modal--pick"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="entry-modal-title">카테고리 선택</p>
            <p className="entry-modal-hint entry-modal-hint--top">
              즐겨찾기에 넣을 카테고리와 서브카테고리를 골라 주세요.
            </p>
            <div className="entry-modal-cat-grid">
              {EXPENSE_CATEGORY_KEYS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`entry-modal-cat-text-btn ${favoritePickerCategory === cat ? 'entry-modal-cat-text-btn--selected' : ''} ${warningCategories.has(cat) ? 'entry-modal-cat-text-btn--warn' : ''}`}
                  onClick={() => {
                    setFavoritePickerCategory(cat)
                    setFavoritePickerSubcategoryId(null)
                    setFavoritePickerCustomText('')
                  }}
                >
                  {EXPENSE_CATEGORY_SHORT_LABELS[cat]}
                </button>
              ))}
            </div>
            {favoritePickerCategory ? (
              <>
                <div className="entry-subcat-grid entry-modal-subcat-grid">
                  {EXPENSE_SUBCATEGORIES[favoritePickerCategory].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className={`entry-subcat-btn ${favoritePickerSubcategoryId === sub.id ? 'active' : ''}`}
                      onClick={() => {
                        setFavoritePickerSubcategoryId(sub.id)
                        if (sub.id !== 'other') setFavoritePickerCustomText('')
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
                {favoritePickerSubcategoryId === 'other' ? (
                  <label className="entry-field">
                    직접 입력
                    <input
                      type="text"
                      value={favoritePickerCustomText}
                      placeholder="내용 입력"
                      onChange={(e) => setFavoritePickerCustomText(e.target.value)}
                    />
                  </label>
                ) : null}
              </>
            ) : null}
            <div className="entry-modal-actions">
              <button
                type="button"
                className="entry-modal-primary"
                disabled={!favoritePickReady}
                onClick={advanceFromFavoritePickStep}
              >
                다음
              </button>
              <button type="button" className="entry-modal-ghost" onClick={closeFavoriteModal}>
                괜찮아요
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {favoriteFormOpen && favoriteModalStep === 'details' && favoriteForm ? (
        <div className="entry-modal-backdrop">
          <div className="entry-modal entry-modal--form" role="dialog" aria-modal="true">
            <p className="entry-modal-title">{editingFavorite ? '즐겨찾기 수정' : '즐겨찾기 추가'}</p>
            <div className="entry-fav-summary">
              <p className="entry-fav-summary-text">
                {isExpenseCategoryKey(favoriteForm.category)
                  ? EXPENSE_CATEGORY_SHORT_LABELS[favoriteForm.category]
                  : favoriteForm.category}
                {' · '}
                {favoriteForm.subcategoryId === 'other'
                  ? favoritePickerCustomText.trim() || '기타'
                  : (getSubcategoryDef(
                      favoriteForm.category as ExpenseCategoryKey,
                      favoriteForm.subcategoryId,
                    )?.label ?? favoriteForm.subcategoryId)}
              </p>
              <button
                type="button"
                className="entry-fav-summary-change"
                onClick={() => {
                  if (isExpenseCategoryKey(favoriteForm.category)) {
                    setFavoritePickerCategory(favoriteForm.category)
                  }
                  setFavoritePickerSubcategoryId(favoriteForm.subcategoryId)
                  setFavoritePickerCustomText(favoritePickerCustomText)
                  setFavoriteModalStep('pick-category')
                }}
              >
                변경
              </button>
            </div>
            <label className="entry-field">
              칩에 보일 이름 (선택)
              <input
                type="text"
                value={favoriteForm.name}
                placeholder="비우면 서브카테고리 이름 사용"
                onChange={(e) => setFavoriteForm({ ...favoriteForm, name: e.target.value })}
              />
            </label>
            <label className="entry-modal-check">
              <input
                type="checkbox"
                checked={favoriteForm.lockAmount}
                onChange={(e) => setFavoriteForm({ ...favoriteForm, lockAmount: e.target.checked })}
              />
              금액 고정
            </label>
            {favoriteForm.lockAmount ? (
              <label className="entry-field">
                고정 금액(원)
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatWonInputValue(favoriteForm.fixedAmountInput)}
                  onChange={(e) =>
                    setFavoriteForm({ ...favoriteForm, fixedAmountInput: formatWonInputValue(e.target.value) })
                  }
                />
              </label>
            ) : null}
            <p className="entry-modal-hint">
              금액을 고정하면 탭 한 번으로 바로 저장돼요. 비우면 탭할 때 금액만 입력하면 돼요.
            </p>
            <div className="entry-modal-actions">
              <button type="button" className="entry-modal-primary" onClick={confirmFavoriteForm}>
                {editingFavorite ? '저장' : '추가하기'}
              </button>
              <button type="button" className="entry-modal-ghost" onClick={closeFavoriteModal}>
                괜찮아요
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
