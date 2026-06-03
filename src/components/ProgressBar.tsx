interface Props {
  current: number
  total: number
  label?: string
  className?: string
}

export function ProgressBar({ current, total, label, className = '' }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0

  return (
    <div className={`progress-bar ${className}`}>
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-bar__label">{label ?? `${current}/${total}`}</span>
    </div>
  )
}
