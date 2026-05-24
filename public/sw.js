const CACHE_NAME = 'janso-cat-cache-v98'
const CORE_ASSETS = ['/manifest.webmanifest', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  )
  // skipWaiting 제거: 활성화 시 페이지 강제 reload 없이 다음 실행부터 새 SW 적용
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // 홈 화면 아이콘·manifest: SW·브라우저 캐시를 피해 항상 네트워크에서만 가져옴
  if (
    url.pathname === '/apple-touch-icon.png'
    || url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(fetch(request, { cache: 'no-store' }))
    return
  }

  // Safari 등에서 HTTP 캐시·SW 캐시에 오래 묶이지 않도록 네트워크는 no-store
  const netFetch = () => fetch(request, { cache: 'no-store' })

  // 페이지 진입/새로고침은 항상 네트워크 우선 -> 새 배포 반영 지연 최소화
  if (request.mode === 'navigate') {
    event.respondWith(
      netFetch()
        .then((response) => {
          const cloned = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/'))),
    )
    return
  }

  event.respondWith(
    netFetch()
      .then((response) => {
        // JS/CSS는 해시 파일명으로 갱신되므로 Cache API에 넣지 않음(구버전 번들 재사용 방지)
        if (
          response.ok
          && (request.destination === 'image' || request.destination === 'font')
        ) {
          const cloned = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
        }
        return response
      })
      .catch(() => caches.match(request)),
  )
})
