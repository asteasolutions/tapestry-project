import { isMac } from './user-agent.js'

export function isMeta(e: KeyboardEvent | MouseEvent | TouchEvent) {
  return isMac ? e.metaKey : e.ctrlKey
}

function isCtrl(modifiers: string[], event: KeyboardEvent) {
  return ((!isMac && modifiers.includes('meta')) || modifiers.includes('ctrl')) === event.ctrlKey
}

export function shortcutLabel(shortcutString: string) {
  return shortcutString
    .split(/\s*\|\s*/)
    .map((shortcut) => {
      const [key, ...modifiers] = shortcut.split(/\s\+\s/).reverse()
      const res = []
      if (modifiers.some((m) => m === 'meta')) {
        res.push(isMac ? '⌘' : 'Ctrl')
      }
      if (modifiers.some((m) => m === 'ctrl')) {
        res.push(isMac ? '⌃' : 'Ctrl')
      }
      if (modifiers.some((m) => m === 'shift')) {
        res.push(isMac ? '⇧' : 'Shift')
      }
      if (modifiers.some((m) => m === 'alt')) {
        res.push(isMac ? '⌥' : 'Alt')
      }
      res.push(key)
      return res.join(' + ')
    })
    .join(', ')
}

export function matchesShortcut(event: KeyboardEvent, shortcutString: string) {
  for (const shortcut of shortcutString.split(/\s*\|\s*/)) {
    const [keyCode, ...modifiers] = shortcut.split(/\s\+\s/).reverse()

    const matchesModifiers =
      modifiers.includes('shift') === event.shiftKey &&
      isCtrl(modifiers, event) &&
      modifiers.includes('alt') === event.altKey &&
      modifiers.includes('meta') === isMeta(event)

    if (keyCode === event.code && matchesModifiers) {
      return true
    }
  }

  return false
}

export function arrowShortcuts(cb: (dir: 'x' | 'y', distance: number) => boolean | void) {
  const getDistance = (ev: KeyboardEvent) => {
    if (ev.shiftKey && isMeta(ev)) {
      return 300
    }
    if (ev.shiftKey) {
      return 100
    }
    return 20
  }
  return {
    'ArrowUp | shift + ArrowUp | meta + shift + ArrowUp': (ev: KeyboardEvent) =>
      cb('y', -getDistance(ev)),
    'ArrowLeft | shift + ArrowLeft | meta + shift + ArrowLeft': (ev: KeyboardEvent) =>
      cb('x', -getDistance(ev)),
    'ArrowDown | shift + ArrowDown | meta + shift + ArrowDown': (ev: KeyboardEvent) =>
      cb('y', getDistance(ev)),
    'ArrowRight | shift + ArrowRight | meta + shift + ArrowRight': (ev: KeyboardEvent) =>
      cb('x', getDistance(ev)),
    KeyW: () => cb('y', -20),
    KeyA: () => cb('x', -20),
    KeyS: () => cb('y', 20),
    KeyD: () => cb('x', 20),
  }
}
