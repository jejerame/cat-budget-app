import type { WeeklySettlementContent } from '../data/weeklySettlement'
import { formatWon } from '../utils/finance'
import { NagBubbleOverlay } from './NagBubbleOverlay'

type WeeklySettlementOverlayProps = {
  content: WeeklySettlementContent | null
  onClose: () => void
}

export function WeeklySettlementOverlay({ content, onClose }: WeeklySettlementOverlayProps) {
  if (!content) return null

  return (
    <div
      className="monthly-settlement-overlay weekly-settlement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-settlement-title"
    >
      <div className="monthly-settlement-card weekly-settlement-card">
        <p id="weekly-settlement-title" className="monthly-settlement-title">
          이번 주 결산
        </p>
        <p className="weekly-settlement-compare">
          {content.comparisonLabel}: <strong>{formatWon(content.comparisonAmount)}</strong>
        </p>
        <div className="weekly-settlement-bubble-wrap">
          <NagBubbleOverlay variant="weekly" text={content.message} visible embedded={true} />
        </div>
        <button type="button" className="monthly-settlement-confirm" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
