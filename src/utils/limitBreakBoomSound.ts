let sharedCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (sharedCtx) return sharedCtx
  const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  sharedCtx = new Ctor()
  return sharedCtx
}

/** 한계 돌파 폭발음 (Boom) */
export function playLimitBreakBoom(): void {
  const ctx = getCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  const t0 = ctx.currentTime

  const bufferSize = Math.floor(ctx.sampleRate * 0.45)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.exp(-i / (bufferSize * 0.12))
    data[i] = (Math.random() * 2 - 1) * env
  }
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.0001, t0)
  noiseGain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02)
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42)
  noise.connect(noiseGain)

  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t0)
  osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.35)
  const oscGain = ctx.createGain()
  oscGain.gain.setValueAtTime(0.0001, t0)
  oscGain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.015)
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38)
  osc.connect(oscGain)

  const master = ctx.createGain()
  master.gain.value = 0.9
  noiseGain.connect(master)
  oscGain.connect(master)
  master.connect(ctx.destination)
  noise.start(t0)
  osc.start(t0)
  osc.stop(t0 + 0.4)
  noise.stop(t0 + 0.45)
}
