import { useEffect } from 'react'
import {
  HOME_CRITICAL_PRELOAD_URLS,
  HOME_GAUGE_CAT_URLS,
  preloadHomeCriticalImages,
} from '../utils/preloadHomeCritical'
import { preloadDeferredNagAssets, preloadInstantNagSay1 } from '../utils/preloadDeferredNag'
import { preloadMonthlySettlementImages } from '../utils/preloadMonthlySettlementImages'

/** 홈 필수 고양이 우선 디코드 · 말풍선/팝업은 유휴 시 */
export function HomeCriticalWarmup() {
  useEffect(() => {
    void preloadHomeCriticalImages()

    const onFirstInteraction = (): void => {
      preloadInstantNagSay1()
    }
    document.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true })
    document.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true })

    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 2000)

    const idleId = idle(() => {
      void preloadDeferredNagAssets()
      void preloadMonthlySettlementImages()
    })

    return () => {
      document.removeEventListener('pointerdown', onFirstInteraction)
      document.removeEventListener('touchstart', onFirstInteraction)
      if (typeof idleId === 'number') {
        window.clearTimeout(idleId)
      } else if (typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId)
      }
    }
  }, [])

  return (
    <div className="home-critical-preload" aria-hidden="true">
      {HOME_CRITICAL_PRELOAD_URLS.map((url) => (
        <img key={url} src={url} alt="" decoding="async" fetchPriority="high" />
      ))}
      {HOME_GAUGE_CAT_URLS.map((url) => (
        <img key={url} src={url} alt="" decoding="async" />
      ))}
    </div>
  )
}
