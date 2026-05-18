export const COLOR_MODE_STORAGE_KEY = 'janso-cat-color-mode'

export type ColorMode = 'light' | 'dark'
/** auto = OS·기기 다크 모드 일정(prefers-color-scheme) 따름 */
export type ColorModePreference = 'auto' | 'light' | 'dark'

export function getSystemColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function loadColorModePreference(): ColorModePreference {
  try {
    const v = localStorage.getItem(COLOR_MODE_STORAGE_KEY)
    if (v === 'auto' || v === 'light' || v === 'dark') return v
  } catch {
    /* ignore */
  }
  return 'auto'
}

export function resolveEffectiveColorMode(preference: ColorModePreference): ColorMode {
  if (preference === 'auto') return getSystemColorMode()
  return preference
}

export function applyColorModeToDocument(mode: ColorMode): void {
  document.documentElement.dataset.theme = mode
  try {
    const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null
    if (meta) meta.content = mode === 'light' ? '#ffffff' : '#161616'
  } catch {
    /* ignore */
  }
}

/** 사용자가 DAY/DARK 토글을 눌렀을 때만 호출 → 이후 고정 */
export function persistManualColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
