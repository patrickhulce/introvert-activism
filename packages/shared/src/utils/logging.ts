const levels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']

export function createLogger(scope: string): typeof import('electron-log') {
  const log: any = {}
  try {
    const electronLog = eval(`require('electron-log')`)
    levels.forEach(level => (log[level] = electronLog[level]))
  } catch (_) {
    levels.forEach(level => (log[level] = (console as any)[level] || console.log))
  }

  const scopedLog = {...log}
  levels.forEach(level => (scopedLog[level] = (...args: any[]) => log[level](scope, ...args)))
  return scopedLog
}
