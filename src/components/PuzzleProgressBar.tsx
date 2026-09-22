import type { PuzzleProgress } from '../lib/puzzleProgress'

type PuzzleProgressBarProps = {
  progress: PuzzleProgress
  className?: string
}

export default function PuzzleProgressBar({
  progress,
  className = 'h-2.5',
}: PuzzleProgressBarProps) {
  const segment = (value: number) => progress.total === 0
    ? '0%'
    : `${(value / progress.total) * 100}%`

  return (
    <div
      className={`flex overflow-hidden rounded-full bg-stone-200 ${className}`}
      role="img"
      aria-label={`${progress.attempted} of ${progress.total} attempted: ${progress.clean} solved cleanly, ${progress.retried} solved after retry, ${progress.missed} missed`}
    >
      <span className="bg-emerald-800" style={{ width: segment(progress.clean) }} />
      <span className="bg-emerald-300" style={{ width: segment(progress.retried) }} />
      <span className="bg-rose-700" style={{ width: segment(progress.missed) }} />
    </div>
  )
}
