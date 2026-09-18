import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard, type Arrow } from 'react-chessboard'
import type { Puzzle } from '../data/puzzles'

type PuzzleTrainerProps = {
  puzzles: Puzzle[]
  collectionName: string
  collectionSlug: string
}

type Result = 'correct' | 'incorrect' | null

type Attempt = {
  move: string
  result: Exclude<Result, null>
  checkedAt?: string
}

type SharedPractice = {
  studentId: string
  practiceKey: string
}

const LIGHT_SQUARE_STYLE = {
  backgroundColor: '#d3d1c8',
  backgroundImage:
    'radial-gradient(circle at 18% 22%, rgba(255, 255, 255, 0.28) 0 5%, transparent 24%), radial-gradient(circle at 78% 72%, rgba(80, 82, 72, 0.12) 0 7%, transparent 28%), linear-gradient(118deg, rgba(255, 255, 255, 0.1), rgba(78, 80, 70, 0.08))',
  backgroundSize: '82px 82px, 106px 106px, 100% 100%',
} satisfies CSSProperties

const DARK_SQUARE_STYLE = {
  backgroundColor: '#6b9078',
  backgroundImage:
    'radial-gradient(circle at 22% 18%, rgba(222, 235, 222, 0.2) 0 5%, transparent 23%), radial-gradient(circle at 76% 74%, rgba(28, 65, 45, 0.18) 0 8%, transparent 29%), linear-gradient(118deg, rgba(255, 255, 255, 0.07), rgba(20, 57, 39, 0.12))',
  backgroundSize: '88px 88px, 112px 112px, 100% 100%',
} satisfies CSSProperties

const normalizeSan = (san: string) =>
  san.trim().replaceAll('0', 'O').replace(/[!?]+$/g, '')

const createAnswerArrows = (fen: string, answers: string[]): Arrow[] =>
  answers.flatMap((answer) => {
    const game = new Chess(fen)

    try {
      const move = game.move(normalizeSan(answer))
      return [{
        startSquare: move.from,
        endSquare: move.to,
        color: 'rgba(217, 119, 6, 0.9)',
      }]
    } catch {
      return []
    }
  })

export default function PuzzleTrainer({ puzzles, collectionName, collectionSlug }: PuzzleTrainerProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [position, setPosition] = useState(puzzles[0].fen)
  const [attemptedMove, setAttemptedMove] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [attemptHistory, setAttemptHistory] = useState<Record<string, Attempt[]>>({})
  const [sharedPractice, setSharedPractice] = useState<SharedPractice | null>(null)
  const [studentName, setStudentName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')

  const puzzle = puzzles[puzzleIndex]
  const puzzleAttempts = attemptHistory[puzzle.id] ?? []
  const startingGame = new Chess(puzzle.fen)
  const sideToMove = startingGame.turn() === 'w' ? 'White' : 'Black'
  const answerArrows = useMemo(
    () => answerVisible ? createAnswerArrows(puzzle.fen, puzzle.answers) : [],
    [answerVisible, puzzle.answers, puzzle.fen],
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedPuzzle = Number(params.get('puzzle'))
    if (Number.isInteger(requestedPuzzle) && requestedPuzzle >= 1 && requestedPuzzle <= puzzles.length) {
      setPuzzleIndex(requestedPuzzle - 1)
      setPosition(puzzles[requestedPuzzle - 1].fen)
    }

    const studentId = params.get('student') ?? ''
    const practiceKey = params.get('key') ?? ''
    if (!studentId || !practiceKey) return

    const controller = new AbortController()
    setSharedPractice({ studentId, practiceKey })
    setSaveStatus('loading')

    void fetch(
      `/api/practice/attempts?student=${encodeURIComponent(studentId)}&key=${encodeURIComponent(practiceKey)}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json() as {
          student?: {
            name: string
            attempts: Array<Attempt & { puzzleId: string }>
          }
          error?: string
        }
        if (!response.ok || !data.student) throw new Error(data.error ?? 'Could not load practice history.')

        const history = data.student.attempts.reduce<Record<string, Attempt[]>>(
          (grouped, attempt) => {
            grouped[attempt.puzzleId] = [
              ...(grouped[attempt.puzzleId] ?? []),
              {
                move: attempt.move,
                result: attempt.result,
                checkedAt: attempt.checkedAt,
              },
            ]
            return grouped
          },
          {},
        )

        setStudentName(data.student.name)
        setAttemptHistory(history)
        setSaveStatus('saved')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setSaveStatus('error')
      })

    return () => controller.abort()
  }, [])

  const resetPuzzle = (nextIndex = puzzleIndex) => {
    setPuzzleIndex(nextIndex)
    setPosition(puzzles[nextIndex].fen)
    setAttemptedMove(null)
    setResult(null)
    setAnswerVisible(false)
    setSelectedSquare(null)
  }

  const showAnswer = () => {
    setPosition(puzzle.fen)
    setSelectedSquare(null)
    setAnswerVisible(true)
  }

  const checkMove = (moveSan: string) => {
    const acceptedAnswers = new Set(puzzle.answers.map(normalizeSan))
    const isCorrect = acceptedAnswers.has(normalizeSan(moveSan))
    const nextResult = isCorrect ? 'correct' : 'incorrect'
    const checkedAt = new Date().toISOString()

    setAttemptHistory((history) => ({
      ...history,
      [puzzle.id]: [
        ...(history[puzzle.id] ?? []),
        { move: moveSan, result: nextResult, checkedAt },
      ],
    }))
    setResult(nextResult)
    setAnswerVisible(false)

    if (sharedPractice) {
      setSaveStatus('saving')
      void fetch('/api/practice/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          studentId: sharedPractice.studentId,
          practiceKey: sharedPractice.practiceKey,
          puzzleId: puzzle.id,
          puzzleTitle: puzzle.title,
          move: moveSan,
          result: nextResult,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const data = await response.json() as { error?: string }
            throw new Error(data.error ?? 'Could not save attempt.')
          }
          setSaveStatus('saved')
        })
        .catch(() => setSaveStatus('error'))
    }
  }

  const tryMove = (sourceSquare: string, targetSquare: string | null) => {
    if (!targetSquare || attemptedMove) return false

    const game = new Chess(position)

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      setPosition(game.fen())
      setAttemptedMove(move.san)
      setSelectedSquare(null)
      checkMove(move.san)
      return true
    } catch {
      return false
    }
  }

  const handleSquareClick = (square: string) => {
    if (attemptedMove) return

    const game = new Chess(position)
    const clickedSquare = square as Square

    if (selectedSquare) {
      if (tryMove(selectedSquare, clickedSquare)) return
      setSelectedSquare(null)
    }

    const piece = game.get(clickedSquare)
    if (piece?.color === game.turn()) setSelectedSquare(clickedSquare)
  }

  const squareStyles = selectedSquare
    ? {
        [selectedSquare]: {
          boxShadow: 'inset 0 0 0 4px rgba(120, 53, 15, 0.7)',
        },
      }
    : {}

  const collectionHref = sharedPractice
    ? `/puzzles/${collectionSlug}?student=${encodeURIComponent(sharedPractice.studentId)}&key=${encodeURIComponent(sharedPractice.practiceKey)}`
    : `/puzzles/${collectionSlug}`

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(280px,1fr)] lg:items-start">
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-stone-300 bg-white p-2 shadow-xl shadow-stone-900/10 sm:p-3">
        <div className="overflow-hidden rounded-xl">
          <Chessboard
            options={{
              id: `puzzle-board-${puzzle.id}`,
              position,
              boardOrientation: 'white',
              showNotation: true,
              allowDragging: attemptedMove === null,
              allowDrawingArrows: false,
              arrows: answerArrows,
              clearArrowsOnClick: false,
              clearArrowsOnPositionChange: false,
              squareStyles,
              lightSquareStyle: LIGHT_SQUARE_STYLE,
              darkSquareStyle: DARK_SQUARE_STYLE,
              lightSquareNotationStyle: { color: '#3f6651' },
              darkSquareNotationStyle: { color: 'rgba(246, 246, 239, 0.88)' },
              onPieceDrop: ({ sourceSquare, targetSquare }) =>
                tryMove(sourceSquare, targetSquare),
              onSquareClick: ({ square }) => handleSquareClick(square),
            }}
          />
        </div>

        {result ? (
          <div
            className={`absolute inset-x-5 bottom-5 rounded-2xl border p-4 shadow-2xl backdrop-blur-md sm:inset-x-8 sm:bottom-8 sm:p-5 ${
              result === 'correct'
                ? 'border-emerald-200/70 bg-emerald-950/94 text-white'
                : 'border-rose-200/70 bg-rose-950/94 text-white'
            }`}
            role="status"
            aria-live="polite"
          >
            {result === 'correct' ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Nice work</p>
                  <p className="mt-1 text-2xl font-black sm:text-3xl">Correct!</p>
                </div>
                {puzzleIndex < puzzles.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex + 1)}
                    className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-emerald-950 shadow-lg transition hover:scale-105 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-14"
                    aria-label="Next puzzle"
                    title="Next puzzle"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 fill-current sm:size-7">
                      <path d="M8 5.4v13.2c0 .78.86 1.26 1.53.85l10.2-6.6a1 1 0 0 0 0-1.7l-10.2-6.6A1 1 0 0 0 8 5.4Z" />
                    </svg>
                  </button>
                ) : (
                  <p className="text-sm font-bold text-emerald-100">All puzzles complete.</p>
                )}
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black sm:text-3xl">Try again, fool!</p>
                {answerVisible ? (
                  <p className="mt-2 text-sm text-rose-100">
                    Answer: <strong>{puzzle.answers.join(', ')}</strong>
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={showAnswer}
                    disabled={answerVisible}
                    className="cursor-pointer rounded-full border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Show answer
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzle()}
                    className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-bold text-rose-950 hover:bg-rose-50"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => resetPuzzle(puzzleIndex + 1)}
                    disabled={puzzleIndex === puzzles.length - 1}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/35 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Advance
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
                      <path d="M8 5.4v13.2c0 .78.86 1.26 1.53.85l10.2-6.6a1 1 0 0 0 0-1.7l-10.2-6.6A1 1 0 0 0 8 5.4Z" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-black text-amber-800">
          <a href={collectionHref} className="underline decoration-amber-300 underline-offset-4 hover:text-amber-700">
            {collectionName}
          </a>
          <span aria-hidden="true">·</span>
          <span className="uppercase tracking-[0.16em]">Puzzle {puzzleIndex + 1} of {puzzles.length}</span>
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          {puzzle.title}
        </h2>
        <p className="mt-3 text-lg font-bold text-stone-700">{sideToMove} to move</p>

        {sharedPractice ? (
          <p className={saveStatus === 'error' ? 'mt-2 text-sm font-bold text-rose-800' : 'mt-2 text-sm font-bold text-emerald-800'}>
            {saveStatus === 'loading'
              ? 'Loading shared practice…'
              : saveStatus === 'saving'
                ? 'Saving attempt…'
                : saveStatus === 'error'
                  ? 'This attempt could not be saved for your coach.'
                  : `${studentName || 'Student'} · Shared with coach`}
          </p>
        ) : null}

        {result === null && answerVisible ? (
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4" aria-live="polite">
            <p className="text-stone-800">
              Answer: <strong>{puzzle.answers.join(', ')}</strong>
            </p>
          </div>
        ) : null}

        {result === null ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={showAnswer}
              disabled={answerVisible}
              className="cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Show answer
            </button>
            <button
              type="button"
              onClick={() => resetPuzzle()}
              disabled={!attemptedMove && !answerVisible}
              className="cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-bold text-stone-900 hover:border-stone-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Try again
            </button>
          </div>
        ) : null}

        {puzzleAttempts.length > 0 ? (
          <section className="mt-7 border-t border-stone-200 pt-6" aria-labelledby="attempt-history-heading">
            <h3 id="attempt-history-heading" className="text-lg font-black text-stone-950">
              Attempt history
            </h3>
            <ol className="mt-3 grid gap-2">
              {puzzleAttempts.map((attempt, index) => (
                <li
                  key={`${attempt.move}-${index}`}
                  className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3 text-sm"
                >
                  <span className="font-bold text-stone-900">
                    {index + 1}. {attempt.move}
                  </span>
                  <span className={attempt.result === 'correct' ? 'font-bold text-emerald-800' : 'font-bold text-rose-800'}>
                    {attempt.result === 'correct' ? 'Correct' : 'Try again, fool!'}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-stone-200 pt-6">
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex - 1)}
            disabled={puzzleIndex === 0}
            className="cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            ← Previous puzzle
          </button>
          <button
            type="button"
            onClick={() => resetPuzzle(puzzleIndex + 1)}
            disabled={puzzleIndex === puzzles.length - 1}
            className="cursor-pointer text-sm font-bold text-amber-900 hover:text-amber-700 disabled:cursor-not-allowed disabled:text-stone-400"
          >
            Next puzzle →
          </button>
        </div>
      </div>
    </div>
  )
}
