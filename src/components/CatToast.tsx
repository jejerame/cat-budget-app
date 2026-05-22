import { useEffect, useRef, useState } from 'react'
import { ensureImageAssetReady } from '../utils/imageAssetLoader'

export type CatToastVariant = 'expense' | 'saving'

type CatToastProps = {
  imageSrc: string
  variant: CatToastVariant
  open: boolean
  onPaint?: () => void
}

export function CatToast({ imageSrc, variant, open, onPaint }: CatToastProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [paintReady, setPaintReady] = useState(false)

  useEffect(() => {
    if (!open || !imageSrc) {
      setPaintReady(false)
      return
    }

    let cancelled = false
    setPaintReady(false)

    void ensureImageAssetReady(imageSrc).then(() => {
      if (cancelled) return
      const img = imgRef.current
      if (img?.complete && img.naturalWidth > 0) {
        requestAnimationFrame(() => {
          if (!cancelled) setPaintReady(true)
        })
        return
      }
      /* onLoad에서 paintReady */
    })

    return () => {
      cancelled = true
    }
  }, [open, imageSrc])

  const handleImgReady = (): void => {
    const img = imgRef.current
    if (!img || img.naturalWidth <= 0) return
    void (typeof img.decode === 'function' ? img.decode() : Promise.resolve())
      .catch(() => undefined)
      .finally(() => {
        requestAnimationFrame(() => {
          setPaintReady(true)
          onPaint?.()
        })
      })
  }

  const show = open && Boolean(imageSrc) && paintReady

  return (
    <>
      <div
        className={`cat-toast cat-toast-transparent ${variant === 'saving' ? 'cat-toast-saving' : ''} ${open && imageSrc ? '' : 'hidden'} ${show ? 'show' : 'hide'}`}
        aria-live="polite"
      >
        {open && imageSrc ? (
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            aria-hidden="true"
            decoding="async"
            fetchPriority="high"
            onLoad={handleImgReady}
            onError={handleImgReady}
          />
        ) : null}
      </div>
    </>
  )
}
