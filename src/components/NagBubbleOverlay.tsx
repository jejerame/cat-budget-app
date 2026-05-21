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
  const isLongText = text.length >= 34

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

    const maxPx = isLongText ? (variant === 'instant' ? 20 : 21) : variant === 'instant' ? 22 : 23
    const minPx = isLongText ? 10 : 11
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
  }, [showActive, showTextOverlay, text, variant, layoutTick, isLongText])

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
      className={`nag-bubble-card nag-bubble-card--${variant}${housingClass}${cheerOnlyClass}${isLongText ? ' nag-bubble-card--long-text' : ''}${showCardContent ? ' nag-bubble-card--ready' : ''}${embedded ? ' nag-bubble-card--embedded' : ''}`}
    >
      <div className="nag-bubble-visual">
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
        {showTextOverlay ? (
          <div className="nag-bubble-text-pad">
            <div ref={padRef} className="nag-bubble-text-slot">
              <p ref={textRef} className="nag-bubble-text">
                {text}
              </p>
            </div>
          </div>
        ) : null}
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
      className={`nag-bubble-overlay nag-bubble-overlay--visible${showCardContent ? '' : ' nag-bubble-overlay--loading'}`}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={imageOnly ? text : undefined}
    >
      {card}
    </div>
  )
}
