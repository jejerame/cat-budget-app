import { useEffect } from 'react'
import {
  popupExpenseUrl,
  popupSavingBadUrl,
  popupSavingGoodUrl,
  preloadPopupToastImages,
} from '../utils/preloadPopupToastImages'

/** 지출·저축 버튼 첫 탭 전 popup1~3 디코드 (소리만 나고 그림 안 뜨는 현상 방지) */
export function CatToastWarmup() {
  useEffect(() => {
    void preloadPopupToastImages()

    const onFirstInteraction = (): void => {
      void preloadPopupToastImages()
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
      <img src={popupExpenseUrl} alt="" decoding="async" fetchPriority="high" />
      <img src={popupSavingGoodUrl} alt="" decoding="async" />
      <img src={popupSavingBadUrl} alt="" decoding="async" />
    </div>
  )
}
