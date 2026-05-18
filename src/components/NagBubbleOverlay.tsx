import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { ensureBubbleImageReady, ensureNagBubbleImageReady } from '../utils/preloadNagBubbleImages'
import { playNagBubblePop } from '../utils/nagBubblePopSound'

export type NagBubbleVariant = 'instant' | 'weekly'

type NagBubbleOverlayProps = {
  variant: NagBubbleVariant
  text: string
  visible: boolean
  /** say1/say2 대신 주거 cheer 등 커스텀 말풍선 PNG */
  imageSrc?: string
  /** PNG에 문구가 포함된 경우 텍스트 오버레이 숨김 */
  imageOnly?: boolean
  autoHideMs?: number
  onAutoClose?: () => void
  showConfirm?: boolean
  onConfirm?: () => void
}

export function NagBubbleOverlay({
  variant,
  text,
  visible,
  imageSrc,
  imageOnly = false,
  autoHideMs,
  onAutoClose,
  showConfirm,
  onConfirm,
}: NagBubbleOverlayProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [layoutTick, setLayoutTick] = useState(0)
  const [imgReady, setImgReady] = useState(false)

  const resolvedImageSrc = imageSrc ?? (variant === 'instant' ? say1Url : say2Url)
  const housingClass = imageSrc || imageOnly ? ' nag-bubble-card--housing' : ''
  const cheerOnlyClass = imageOnly ? ' nag-bubble-card--cheer-only' : ''

  useEffect(() => {
    if (!visible) {
      setImgReady(false)
      return
    }
    let cancelled = false
    const ready = imageSrc
      ? ensureBubbleImageReady(imageSrc)
      : ensureNagBubbleImageReady(variant)
    void ready.then(() => {
      if (!cancelled) setImgReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [visible, variant, imageSrc])

  useLayoutEffect(() => {
    if (!visible || !imgReady || imageOnly) return
    const wrap = padRef.current
    const el = textRef.current
    if (!wrap || !el) return

    const maxPx = variant === 'instant' ? 22 : 23
    const minPx = 11
    let size = maxPx
    el.style.fontSize = `${size}px`
    el.style.lineHeight = '1.16'

    for (let i = 0; i < 100 && size > minPx; i += 1) {
      const overY = el.scrollHeight > wrap.clientHeight + 0.5
      const overX = el.scrollWidth > wrap.clientWidth + 0.5
      if (!overY && !overX) break
      size -= 0.4
      el.style.fontSize = `${size}px`
    }
  }, [visible, imgReady, text, variant, layoutTick, imageOnly])

  useEffect(() => {
    if (!visible || !imgReady) return
    playNagBubblePop()
  }, [visible, imgReady])

  const onAutoCloseRef = useRef(onAutoClose)
  onAutoCloseRef.current = onAutoClose

  useEffect(() => {
    if (!visible || !imgReady || autoHideMs == null || !onAutoCloseRef.current) return
    const id = window.setTimeout(() => onAutoCloseRef.current?.(), autoHideMs)
    return () => window.clearTimeout(id)
  }, [visible, imgReady, autoHideMs])

  if (!visible) return null
  if (!imgReady) return null

  return (
    <div
      className="nag-bubble-overlay nag-bubble-overlay--visible"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={imageOnly ? text : undefined}
    >
      <div className={`nag-bubble-card nag-bubble-card--${variant}${housingClass}${cheerOnlyClass}`}>
        <div className="nag-bubble-visual">
          <img
            src={resolvedImageSrc}
            alt={imageOnly ? text : ''}
            className="nag-bubble-img"
            draggable={false}
            decoding="sync"
            onLoad={() => setLayoutTick((n) => n + 1)}
          />
          {!imageOnly ? (
            <div className="nag-bubble-text-pad">
              <div ref={padRef} className="nag-bubble-text-slot">
                <p ref={textRef} className="nag-bubble-text">
                  {text}
                </p>
              </div>
            </div>
          ) : null}
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
