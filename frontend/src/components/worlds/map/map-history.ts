export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function initHistory<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] }
}

export function commitHistory<T>(state: HistoryState<T>, next: T, limit = 50): HistoryState<T> {
  if (JSON.stringify(state.present) === JSON.stringify(next)) return state
  return {
    past: [...state.past, state.present].slice(-limit),
    present: next,
    future: [],
  }
}

export function undoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.past.length === 0) return state
  const present = state.past[state.past.length - 1]
  return { past: state.past.slice(0, -1), present, future: [state.present, ...state.future] }
}

export function redoHistory<T>(state: HistoryState<T>): HistoryState<T> {
  if (state.future.length === 0) return state
  const [present, ...future] = state.future
  return { past: [...state.past, state.present], present, future }
}
