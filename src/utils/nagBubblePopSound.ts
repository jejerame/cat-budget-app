/** 말풍선 등장 시 짧은 '뾱' 효과음 (외부 파일 없음, Web Audio API) */
let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedCtx) return sharedCtx
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedCtx = new Ctor()
  return sharedCtx
}

let lastPopAt = 0

export function playNagBubblePop(): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now - lastPopAt < 120) return
  lastPopAt = now
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  const t0 = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(580, t0)
  osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.07)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + 0.1)
}
