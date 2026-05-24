import { useEffect, useRef, useState } from 'react'
import type { MonthlySettlementContent } from '../data/monthlySettlement'
import { ensureMonthlySettlementCatReady } from '../utils/preloadMonthlySettlementImages'
import { formatWon } from '../utils/finance'

type MonthlySettlementOverlayProps = {
  content: MonthlySettlementContent | null
  onClose: () => void
}

function confirmCatPainted(img: HTMLImageElement | null, onReady: () => void): void {
  if (!img || img.naturalWidth <= 0) return
  void (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
    .catch(() => undefined)
    .finally(() => {
      requestAnimationFrame(() => onReady())
    })
}

export function MonthlySettlementOverlay({ content, onClose }: MonthlySettlementOverlayProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [messageReady, setMessageReady] = useState(false)

  useEffect(() => {
    if (!content) {
      setMessageReady(false)
      return
    }
    setMessageReady(false)
    void ensureMonthlySettlementCatReady(content.catImageUrl).then(() => {
      const img = imgRef.current
      if (img?.complete && img.naturalWidth > 0) {
        confirmCatPainted(img, () => setMessageReady(true))
      }
    })
  }, [content])

  const handleImgReady = (): void => {
    confirmCatPainted(imgRef.current, () => setMessageReady(true))
  }

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
          <div
            className={`monthly-settlement-message${messageReady ? ' monthly-settlement-message--ready' : ''}`}
          >
            <img
              ref={imgRef}
              src={content.catImageUrl}
              alt=""
              className="monthly-settlement-cat"
              draggable={false}
              decoding="sync"
              fetchPriority="high"
              onLoad={handleImgReady}
              onError={handleImgReady}
            />
            {messageReady ? (
              <p className="monthly-settlement-message-text">{content.message}</p>
            ) : null}
          </div>
        </div>
        <button type="button" className="monthly-settlement-confirm" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
