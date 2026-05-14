import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { playNagBubblePop } from '../utils/nagBubblePopSound'

export type NagBubbleVariant = 'instant' | 'weekly'

type NagBubbleOverlayProps = {
  variant: NagBubbleVariant
  text: string
  visible: boolean
  /** 즉시 잔소리: ms 후 onAutoClose (부모에서 상태 해제) */
  autoHideMs?: number
  onAutoClose?: () => void
  /** 주간 결산 등: 확인 버튼 */
  showConfirm?: boolean
  onConfirm?: () => void
}

export function NagBubbleOverlay({
  variant,
  text,
  visible,
  autoHideMs,
  onAutoClose,
  showConfirm,
  onConfirm,
}: NagBubbleOverlayProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [layoutTick, setLayoutTick] = useState(0)
  useLayoutEffect(() => {
    if (!visible) return
    const wrap = innerRef.current
    const el = textRef.current
    if (!wrap || !el) return

    const maxPx = variant === 'instant' ? 22 : 23
    const minPx = 11
    let size = maxPx
    el.style.fontSize = `${size}px`
    el.style.lineHeight = variant === 'instant' ? '1.28' : '1.3'

    for (let i = 0; i < 100 && size > minPx; i += 1) {
      const overY = el.scrollHeight > wrap.clientHeight + 0.5
      const overX = el.scrollWidth > wrap.clientWidth + 0.5
      if (!overY && !overX) break
      size -= 0.4
      el.style.fontSize = `${size}px`
    }
  }, [visible, text, variant, layoutTick])

  useEffect(() => {
    if (visible) playNagBubblePop()
  }, [visible])

  const onAutoCloseRef = useRef(onAutoClose)
  onAutoCloseRef.current = onAutoClose

  useEffect(() => {
    if (!visible || autoHideMs == null || !onAutoCloseRef.current) return
    const id = window.setTimeout(() => onAutoCloseRef.current?.(), autoHideMs)
    return () => window.clearTimeout(id)
  }, [visible, autoHideMs])

  if (!visible) return null

  const imgSrc = variant === 'instant' ? say1Url : say2Url

  return (
    <div className="nag-bubble-overlay nag-bubble-overlay--visible" role="dialog" aria-modal="true" aria-live="polite">
      <div className={`nag-bubble-card nag-bubble-card--${variant}`}>
        <div className="nag-bubble-visual">
          <img
            src={imgSrc}
            alt=""
            className="nag-bubble-img"
            draggable={false}
            onLoad={() => setLayoutTick((n) => n + 1)}
          />
          <div className="nag-bubble-text-pad">
            <div ref={innerRef} className="nag-bubble-text-inner">
              <p ref={textRef} className="nag-bubble-text">
                {text}
              </p>
            </div>
          </div>
        </div>
        {showConfirm && (
          <button type="button" className="nag-bubble-confirm" onClick={onConfirm}>
            확인
          </button>
        )}
      </div>
    </div>
  )
}
