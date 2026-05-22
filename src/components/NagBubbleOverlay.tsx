import { useLayoutEffect, useRef, useEffect, useState } from 'react'
import say1Url from '../../say1.png'
import say2Url from '../../say2.png'
import { ensureBubbleImageReady, ensureNagBubbleImageReady } from '../utils/preloadNagBubbleImages'
import { playNagBubblePop } from '../utils/nagBubblePopSound'

export type NagBubbleVariant = 'instant' | 'weekly'

export type CalendarFrameRect = {
  top: number
  left: number
  width: number
  height: number
}

type NagBubbleOverlayProps = {
  variant: NagBubbleVariant
  text: string
  visible: boolean
  imageSrc?: string
  imageOnly?: boolean
  embedded?: boolean
  calendarAnchored?: boolean
  calendarFrameRect?: CalendarFrameRect | null
  autoHideMs?: number
  onAutoClose?: () => void
  showConfirm?: boolean
  onConfirm?: () => void
}

function paintImageElement(img: HTMLImageElement): Promise<void> {
  if (img.naturalWidth <= 0) return Promise.resolve()
  return (typeof img.decode === 'function' ? img.decode() : Promise.resolve()).catch(() => undefined)
}

export function NagBubbleOverlay({
  variant,
  text,
  visible,
  imageSrc,
  imageOnly = false,
  embedded = false,
  calendarAnchored = false,
  calendarFrameRect = null,
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
  const showActive = visible || embedded
  const showCardContent = imagePainted
  const showTextOverlay = !imageOnly && imagePainted
  const displayText = text.replace(/\s+/g, ' ').trim()
  const isLongText = displayText.length >= 34
  const isVeryLongText = displayText.length >= 58

  useEffect(() => {
    if (!showActive) {
      setImagePainted(false)
      return
    }
    setImagePainted(false)
    void (imageSrc ? ensureBubbleImageReady(imageSrc) : ensureNagBubbleImageReady(variant))
  }, [showActive, variant, imageSrc])

  const confirmImagePainted = (): void => {
    const img = imgElRef.current
    if (!img || img.naturalWidth <= 0) return
    void paintImageElement(img).then(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setImagePainted(true)
          setLayoutTick((n) => n + 1)
        })
      })
    })
  }

  const handleImageReady = (): void => {
    confirmImagePainted()
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
        {showActive ? (
          <img
            ref={imgElRef}
            src={resolvedImageSrc}
            alt={imageOnly ? text : ''}
            className="nag-bubble-img"
            draggable={false}
            decoding="sync"
            fetchPriority="high"
            onLoad={handleImageReady}
            onError={handleImageReady}
          />
        ) : null}
        {showTextOverlay ? (
          <div ref={padRef} className="nag-bubble-text-layer">
            <div className="nag-bubble-text-inner">
              <p ref={textRef} className="nag-bubble-text text-center">
                {displayText}
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

  const calendarFrameStyle =
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
      className={`nag-bubble-overlay nag-bubble-transparent nag-bubble-overlay--visible${calendarFrameRect ? ' nag-bubble-overlay--calendar-frame' : ''}${calendarAnchored ? ' nag-bubble-overlay--in-calendar-frame' : ''}${showCardContent ? '' : ' nag-bubble-overlay--loading'}`}
      style={calendarFrameStyle}
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={imageOnly ? text : undefined}
    >
      {card}
    </div>
  )
}
