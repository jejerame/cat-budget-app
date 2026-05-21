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
  /** 주간 결산 카드 안에 말풍선만 삽입 */
  embedded?: boolean
  /** `.calendar-zone` 안에 절대 위치 — 달력 프레임 정중앙 */
  calendarAnchored?: boolean
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
  embedded = false,
  calendarAnchored = false,
  autoHideMs,
  onAutoClose,
  showConfirm,
  onConfirm,
}: NagBubbleOverlayProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const imgElRef = useRef<HTMLImageElement>(null)
  const [layoutTick, setLayoutTick] = useState(0)
  const [imagePainted, setImagePainted] = useState(false)

  const resolvedImageSrc = imageSrc ?? (variant === 'instant' ? say1Url : say2Url)
  const housingClass = imageSrc || imageOnly ? ' nag-bubble-card--housing' : ''
  const cheerOnlyClass = imageOnly ? ' nag-bubble-card--cheer-only' : ''
  const showTextOverlay = !imageOnly && imagePainted
  const showCardContent = imagePainted
  const displayText = text.replace(/\s+/g, ' ').trim()
  const isLongText = displayText.length >= 34
  const isVeryLongText = displayText.length >= 58

  const showActive = visible || embedded

  useEffect(() => {
    if (!showActive) {
      setImagePainted(false)
      return
    }
    void (imageSrc ? ensureBubbleImageReady(imageSrc) : ensureNagBubbleImageReady(variant))
  }, [showActive, variant, imageSrc])

  useEffect(() => {
    if (!showActive) return
    const img = imgElRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setImagePainted(true)
    }
  }, [showActive, resolvedImageSrc])

  useEffect(() => {
    if (!showActive || imagePainted) return
    const id = window.setTimeout(() => {
      const img = imgElRef.current
      if (img && img.naturalWidth > 0) setImagePainted(true)
    }, 120)
    return () => window.clearTimeout(id)
  }, [showActive, imagePainted, resolvedImageSrc])

  const handleImageReady = (): void => {
    setImagePainted(true)
    setLayoutTick((n) => n + 1)
  }

  useLayoutEffect(() => {
    if (!showActive || !showTextOverlay) return
    const wrap = padRef.current
    const el = textRef.current
    if (!wrap || !el) return

    const maxPx = isVeryLongText
      ? variant === 'instant'
        ? 17
        : 18
      : isLongText
        ? variant === 'instant'
          ? 19
          : 20
        : variant === 'instant'
          ? 22
          : 23
    const minPx = isVeryLongText ? 8 : isLongText ? 9 : 11
    let size = maxPx
    el.style.fontSize = `${size}px`
    el.style.lineHeight = isLongText ? '1.12' : '1.16'
    el.style.textAlign = 'center'
    el.style.width = '100%'

    for (let i = 0; i < 120 && size > minPx; i += 1) {
      const overY = el.scrollHeight > wrap.clientHeight + 0.5
      const overX = el.scrollWidth > wrap.clientWidth + 0.5
      if (!overY && !overX) break
      size -= isLongText ? 0.35 : 0.4
      el.style.fontSize = `${size}px`
    }
  }, [showActive, showTextOverlay, displayText, variant, layoutTick, isLongText, isVeryLongText])

  useEffect(() => {
    if (!showActive || !imagePainted) return
    playNagBubblePop()
  }, [showActive, imagePainted])

  const onAutoCloseRef = useRef(onAutoClose)
  onAutoCloseRef.current = onAutoClose

  useEffect(() => {
    if (!showActive || !imagePainted || autoHideMs == null || !onAutoCloseRef.current) return
    const id = window.setTimeout(() => onAutoCloseRef.current?.(), autoHideMs)
    return () => window.clearTimeout(id)
  }, [showActive, imagePainted, autoHideMs])

  if (!showActive) return null

  const card = (
    <div
      className={`nag-bubble-card nag-bubble-transparent nag-bubble-card--${variant}${housingClass}${cheerOnlyClass}${isLongText ? ' nag-bubble-card--long-text' : ''}${isVeryLongText ? ' nag-bubble-card--very-long-text' : ''}${showCardContent ? ' nag-bubble-card--ready' : ''}${embedded ? ' nag-bubble-card--embedded' : ''}`}
    >
      <div className="nag-bubble-visual nag-bubble-transparent">
        {showTextOverlay ? (
          <div ref={padRef} className="nag-bubble-text-layer">
            <div className="nag-bubble-text-inner">
              <p ref={textRef} className="nag-bubble-text text-center">
                {displayText}
              </p>
            </div>
          </div>
        ) : null}
        <img
          ref={imgElRef}
          src={resolvedImageSrc}
          alt={imageOnly ? text : ''}
          className="nag-bubble-img"
          draggable={false}
          decoding="async"
          fetchPriority="high"
          onLoad={handleImageReady}
          onError={handleImageReady}
        />
      </div>
      {!embedded && showConfirm && showCardContent ? (
        <button type="button" className="nag-bubble-confirm" onClick={onConfirm}>
          확인
        </button>
      ) : null}
    </div>
  )

  if (embedded) {
    return card
  }

  return (
    <div
      className={`nag-bubble-overlay nag-bubble-transparent nag-bubble-overlay--visible${calendarAnchored ? ' nag-bubble-overlay--in-calendar-frame' : ''}${showCardContent ? '' : ' nag-bubble-overlay--loading'}`}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={imageOnly ? text : undefined}
    >
      {card}
    </div>
  )
}
