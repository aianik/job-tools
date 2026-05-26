import { hasFreeTrialKey } from '../lib/freeTrialKey'

interface Props {
  apiKey: string
  freeLeft: number
  onOpenSettings: () => void
}

export default function SetupBanner({ apiKey, freeLeft, onOpenSettings }: Props) {
  const hasTrial = hasFreeTrialKey()
  const visible = !apiKey && !(hasTrial && freeLeft > 0)
  if (!visible) return null

  const msg = hasTrial
    ? <><strong>Free uses exhausted.</strong> Add your own Anthropic API key to use this tool.</>
    : <><strong>One quick step:</strong> this tool needs a free Anthropic API key to call Claude.</>

  return (
    <div className="setup-banner visible" role="alert">
      <p className="setup-banner-text">{msg}</p>
      <button className="btn-primary" onClick={onOpenSettings}>Get started →</button>
    </div>
  )
}
