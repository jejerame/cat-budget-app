import { useEffect } from 'react'
import { HOUSING_CHEER_IMAGE_URLS } from '../data/housingInstantNag'
import { preloadNagBubbleImages, say1Url, say2Url, warmupInstantNagBubbleImage } from '../utils/preloadNagBubbleImages'
import { POPUP_TOAST_IMAGE_URLS } from '../utils/preloadPopupToastImages'

/** 앱 기동 시·숨김 img로 Safari 말풍선 PNG 디코드 워밍 */
export function NagBubbleWarmup() {
  useEffect(() => {
    void preloadNagBubbleImages()

    const onFirstInteraction = (): void => {
      warmupInstantNagBubbleImage()
    }
    document.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true })
    document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true })

    return () => {
      document.removeEventListener('pointerdown', onFirstInteraction)
      document.removeEventListener('touchstart', onFirstInteraction)
    }
  }, [])

  return (
    <div className="nag-bubble-preload" aria-hidden="true">
      <img src={say1Url} alt="" decoding="async" fetchPriority="high" />
      <img src={say2Url} alt="" decoding="async" />
      {HOUSING_CHEER_IMAGE_URLS.map((url) => (
        <img key={url} src={url} alt="" decoding="async" />
      ))}
      {POPUP_TOAST_IMAGE_URLS.map((url) => (
        <img key={url} src={url} alt="" decoding="async" />
      ))}
    </div>
  )
}
