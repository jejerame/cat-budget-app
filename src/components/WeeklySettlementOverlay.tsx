import type { WeeklySettlementContent } from '../data/weeklySettlement'
import { formatWon } from '../utils/finance'
import { NagBubbleOverlay, type CalendarFrameRect } from './NagBubbleOverlay'

type WeeklySettlementOverlayProps = {
  content: WeeklySettlementContent | null
  calendarFrameRect: CalendarFrameRect | null
  onClose: () => void
}

export function WeeklySettlementOverlay({
  content,
  calendarFrameRect,
  onClose,
}: WeeklySettlementOverlayProps) {
  if (!content) return null

  const stageStyle =
    calendarFrameRect && calendarFrameRect.width > 0 && calendarFrameRect.height > 0
      ? {
          top: `${calendarFrameRect.top}px`,
          left: `${calendarFrameRect.left}px`,
          width: `${calendarFrameRect.width}px`,
          height: `${calendarFrameRect.height}px`,
        }
      : undefined

  return (
    <div
      className="weekly-settlement-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-settlement-title"
    >
      <div
        className={`weekly-settlement-stage${stageStyle ? '' : ' weekly-settlement-stage--viewport-fallback'}`}
        style={stageStyle}
      >
        <div className="weekly-settlement-pills">
          <p id="weekly-settlement-title" className="monthly-settlement-title">
            이번 주 결산
          </p>
          <p className="weekly-settlement-compare">
            {content.comparisonLabel}: <strong>{formatWon(content.comparisonAmount)}</strong>
          </p>
        </div>
        <div className="weekly-settlement-bubble-wrap">
          <NagBubbleOverlay variant="weekly" text={content.message} visible embedded={true} />
        </div>
        <button type="button" className="monthly-settlement-confirm weekly-settlement-confirm" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  )
}
