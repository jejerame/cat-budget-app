import { useEffect, useState } from 'react'
import { popupSavingGoodUrl } from '../utils/preloadPopupToastImages'
import { ensureImageAssetReady } from '../utils/imageAssetLoader'
import type { CalendarFrameRect } from './NagBubbleOverlay'

type SavingGoodPopupOverlayProps = {
  open: boolean
  calendarFrameRect: CalendarFrameRect | null
  onConfirm: () => void
}

export function SavingGoodPopupOverlay({
  open,
  calendarFrameRect,
  onConfirm,
}: SavingGoodPopupOverlayProps) {
  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    if (!open) {
      setImageReady(false)
      return
    }
    let cancelled = false
    setImageReady(false)
    void ensureImageAssetReady(popupSavingGoodUrl).then(() => {
      if (!cancelled) setImageReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) return null

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
      className="saving-good-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="저축 칭찬"
    >
      <div
        className={`saving-good-popup-stage${stageStyle ? '' : ' saving-good-popup-stage--fallback'}`}
        style={stageStyle}
      >
        <div className={`saving-good-popup-visual${imageReady ? ' saving-good-popup-visual--ready' : ''}`}>
          <img src={popupSavingGoodUrl} alt="" draggable={false} decoding="async" />
        </div>
        <button type="button" className="monthly-settlement-confirm saving-good-popup-confirm" onClick={onConfirm}>
          확인
        </button>
      </div>
    </div>
  )
}
