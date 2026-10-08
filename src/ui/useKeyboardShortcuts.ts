import { useEffect } from 'react'
import { sceneApi } from '../scene/sceneApi'
import { stepWeek, togglePlay } from './timeControl'

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
}

/** Global shortcuts: space play/pause, ←/→ step a week, +/− zoom, 0 reset view, F perf overlay. */
export function useKeyboardShortcuts(onToggleStats: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const target = e.target as HTMLElement | null
      // Let focused buttons and sliders handle their own keys.
      const onControl = target?.closest('button, [role=slider], [role=radio]') !== null
      switch (e.key) {
        case ' ':
          if (onControl) return
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowRight':
          if (onControl) return
          e.preventDefault()
          stepWeek(e.shiftKey ? 4 : 1)
          break
        case 'ArrowLeft':
          if (onControl) return
          e.preventDefault()
          stepWeek(e.shiftKey ? -4 : -1)
          break
        case '+':
        case '=':
          sceneApi.zoomIn()
          break
        case '-':
        case '_':
          sceneApi.zoomOut()
          break
        case '0':
          sceneApi.resetView()
          break
        case 'f':
        case 'F':
          onToggleStats()
          break
        default:
          return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggleStats])
}
