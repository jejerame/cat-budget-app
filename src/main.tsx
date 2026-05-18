import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './theme-light.css'

const rootElement = document.getElementById('app')

if (!rootElement) {
  throw new Error('앱 루트 노드를 찾을 수 없습니다.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/** 배포 시 SW 로직을 바꾸면 숫자만 올려 주세요(브라우저가 sw.js 본문 캐시를 덜 묶게 함). */
const SW_SCRIPT_QUERY = 'v=24'

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) void r.unregister()
    })
    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    }
  })
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  let registrationRef: ServiceWorkerRegistration | null = null

  const checkForSwUpdate = (): void => {
    void registrationRef?.update()
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`/sw.js?${SW_SCRIPT_QUERY}`, { updateViaCache: 'none' })
      .then((reg) => {
        registrationRef = reg
        // 막 연 직후 날짜 터치 등 사용 중 강제 reload 방지 → 업데이트 확인은 지연·백그라운드만
        window.setTimeout(checkForSwUpdate, 120_000)
      })
      .catch(() => {
        /* 등록 실패 시에도 앱은 동작해야 함 */
      })
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') checkForSwUpdate()
  })
}
