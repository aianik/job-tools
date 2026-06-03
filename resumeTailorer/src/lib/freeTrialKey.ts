// Key is XOR-obfuscated across 4 fragments. Do NOT log, decode, or display these values.
const _f0 = 'sk-ant-api03-'
const _f1 = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
const _f2 = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
const _f3 = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'

export const FREE_ATTEMPTS_TOTAL = 5

export function getTrialKey(): string {
  // Placeholder — replace _f1/_f2/_f3 with real XOR fragments when ready
  return _f0 + _f1 + _f2 + _f3
}

export function getRemainingTrialUses(): number {
  const used = parseInt(localStorage.getItem('rt_free_attempts_used') ?? '0', 10)
  return Math.max(0, FREE_ATTEMPTS_TOTAL - used)
}

export function consumeTrialUse(): void {
  const used = parseInt(localStorage.getItem('rt_free_attempts_used') ?? '0', 10)
  localStorage.setItem('rt_free_attempts_used', String(used + 1))
}
