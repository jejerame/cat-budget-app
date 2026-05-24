import type { MonthlySettlementContent } from '../data/monthlySettlement'
import { formatWon } from '../utils/finance'

type MonthlySettlementOverlayProps = {
  content: MonthlySettlementContent | null
  onClose: () => void
}

export function MonthlySettlementOverlay({ content, onClose }: MonthlySettlementOverlayProps) {
  if (!content) return null

  return (
    <div
      className="monthly-settlement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="monthly-settlement-title"
    >
      <div className="monthly-settlement-card">
        <p id="monthly-settlement-title" className="monthly-settlement-title">
          {content.monthLabel} 결산
        </p>
        <p className="monthly-settlement-top-rank">
          지출 1순위 · {content.topCategoryLabel}{' '}
          <strong>{formatWon(content.topCategoryAmount)}</strong>
        </p>
        <div
          className={`monthly-settlement-message-box monthly-settlement-message-box--${content.tone}`}
        >
          <div className="monthly-settlement-message">
            <img
              src={content.catImageUrl}
              alt=""
              className="monthly-settlement-cat"
              draggable={false}
              decoding="async"
            />
            <p className="monthly-settlement-message-text">{content.message}</p>
          </div>
        </div>
        <button type="button" className="monthly-settlement-confirm" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
