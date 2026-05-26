// Key stored as 4 interleaved fragments — paste encoder output here
const _f0 = "DDcXBdQbEPAZPYWVRPZQILRLWJASNPWbSJUW"
const _f1 = "nmhm20EliTQ0U0BUk3CFXkTWXkjVWXlBWGQ3"
const _f2 = "hto41BdtJt5RdM4Ett5AZVoZ1lBIZh58AtJ8"
const _f3 = "n4ZeZhtqRmZbBi4X2KQ8Yn7i+tltj2I3DrRg"

function _sA(): string {
  return [13*8+5, 11*8, 10*10+7, 5*7, 3*19, 8*8, 2*59, 4*19]
    .map(c => String.fromCharCode(c)).join('')
}

const _sb1 = [113, 53, 84, 38]
const _sb2 = [82, 33, 122, 119]
function _sB(): string {
  return _sb1.flatMap((v, i) => [String.fromCharCode(v), String.fromCharCode(_sb2[i])]).join('')
}

const _scR = "^7nH*2fB"
function _sC(): string { return [..._scR].reverse().join('') }

const _xD = [17, 42, 91, 13, 38, 77, 106, 88]
const _yD = [72, 89, 111, 41, 108, 40, 91, 115]
function _sD(): string { return _xD.map((v, i) => String.fromCharCode(v ^ _yD[i])).join('') }

const _rotN = 3 * 4 + 1

export const FREE_ATTEMPTS_TOTAL = 5

export function hasFreeTrialKey(): boolean {
  return _f0.length > 0
}

export function decodeKey(): string {
  const _f = [_f0, _f1, _f2, _f3]
  const maxLen = Math.max(..._f.map(s => s.length))
  let b64 = ''
  for (let i = 0; i < maxLen; i++)
    for (let j = 0; j < 4; j++)
      if (i < _f[j].length) b64 += _f[j][i]
  let b = [...atob(b64)].map(c => c.charCodeAt(0))
  const sA = _sA(), sB = _sB(), sC = _sC(), sD = _sD()
  b = b.map((v, i) => v ^ sD.charCodeAt(i % 8))
  b = b.reverse()
  b = b.map((v, i) => v ^ sC.charCodeAt(i % 8))
  const n = b.length
  b = [...b.slice(n - _rotN), ...b.slice(0, n - _rotN)]
  b = b.map((v, i) => v ^ sB.charCodeAt(i % 8))
  b = b.reverse()
  b = b.map((v, i) => v ^ sA.charCodeAt(i % 8))
  return b.map(v => String.fromCharCode(v)).join('')
}

export function getFreeAttemptsLeft(): number {
  const used = parseInt(localStorage.getItem('free_attempts_used') || '0', 10)
  return Math.max(0, FREE_ATTEMPTS_TOTAL - used)
}

export function useFreeAttempt(): void {
  const used = parseInt(localStorage.getItem('free_attempts_used') || '0', 10)
  localStorage.setItem('free_attempts_used', String(used + 1))
}

export function getEffectiveKey(ownKey: string): { key: string | null; isDemo: boolean } {
  if (ownKey) return { key: ownKey, isDemo: false }
  if (hasFreeTrialKey() && getFreeAttemptsLeft() > 0) return { key: decodeKey(), isDemo: true }
  return { key: null, isDemo: false }
}
