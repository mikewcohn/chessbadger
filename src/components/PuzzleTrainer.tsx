import { useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { Puzzle } from '../data/puzzles'

type PuzzleTrainerProps = {
  puzzles: Puzzle[]
}

type Result = 'correct' | 'incorrect' | null

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

export default function PuzzleTrainer({ puzzles }: PuzzleTrainerProps) {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [position, setPosition] = useState(puzzles[0].fen)
  const [attemptedMove, setAttemptedMove] = useState<string | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [answerVisible, setAnswerVisible] = useState(false)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)

  const puzzle = puzzles[puzzleIndex]
  const startingGame = new Chess(puzzle.fen)
  const sideToMove = startingGame.turn() === 'w' ? 'White' : 'Black'

  const resetPuzzle = (nextIndex = puzzleIndex) => {
    setPuzzleIndex(nextIndex)
    setPosition(puzzles[nextIndex].fen)
    setAttemptedMove(null)
    setResult(null)
    setAnswerVisible(false)
    setSelectedSquare(null)
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

  const checkAnswer = () => {
    if (!attemptedMove) return

    const acceptedAnswers = new Set(puzzle.answers.map(normalizeSan))
    const isCorrect = acceptedAnswers.has(normalizeSan(attemptedMove))
    setResult(isCorrect ? 'correct' : 'incorrect')
    setAnswerVisible(!isCorrect)
  }

  const squareStyles = selectedSquare
    ? {
        [selectedSquare]: {
          boxShadow: 'inset 0 0 0 4px rgba(120, 53, 15, 0.7)',
        },
      }
    : {}

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(280px,1fr)] lg:items-start">
      <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-stone-300 bg-white p-2 shadow-xl shadow-stone-900/10 sm:p-3">
        <Chessboard
          options={{
            id: `puzzle-board-${puzzle.id}`,
            position,
            boardOrientation: 'white',
            showNotation: true,
            allowDragging: attemptedMove === null,
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

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-900/5 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-800">
          Puzzle {puzzleIndex + 1} of {puzzles.length}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-stone-950">
          {puzzle.title}
        </h2>
        <p className="mt-3 text-lg font-bold text-stone-700">{sideToMove} to move</p>

        <div className="mt-6 min-h-20 rounded-2xl border border-stone-200 bg-stone-50 p-4" aria-live="polite">
          {result === 'correct' ? (
            <p className="font-bold text-emerald-800">Correct.</p>
          ) : result === 'incorrect' ? (
            <p className="font-bold text-rose-800">Not the book answer.</p>
          ) : attemptedMove ? (
            <p className="text-stone-700">You played <strong>{attemptedMove}</strong>. Check it when you’re ready.</p>
          ) : (
            <p className="text-stone-600">Make one legal move on the board.</p>
          )}

          {answerVisible ? (
            <p className="mt-2 text-stone-800">
              Book {puzzle.answers.length === 1 ? 'answer' : 'answers'}: <strong>{puzzle.answers.join(', ')}</strong>
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={checkAnswer}
            disabled={!attemptedMove || result !== null}
            className="cursor-pointer rounded-full bg-stone-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check answer
          </button>
          <button
            type="button"
            onClick={() => setAnswerVisible(true)}
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
