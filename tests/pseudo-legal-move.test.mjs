import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyPseudoLegalMove,
  isPseudoLegalMove,
  pseudoLegalMoveContextFromFen,
} from '../src/lib/pseudoLegalMove.ts'

const piece = (pieceType) => ({ pieceType })
const move = (position, sourceSquare, targetSquare, options = {}) => isPseudoLegalMove({
  position,
  sourceSquare,
  targetSquare,
  sideToMove: 'w',
  ...options,
})

test('pieces must follow their movement geometry', () => {
  assert.equal(move({ g1: piece('wN') }, 'g1', 'f3'), true)
  assert.equal(move({ g1: piece('wN') }, 'g1', 'g6'), false)
  assert.equal(move({ c1: piece('wB') }, 'c1', 'h6'), true)
  assert.equal(move({ c1: piece('wB') }, 'c1', 'c5'), false)
  assert.equal(move({ a1: piece('wR') }, 'a1', 'a8'), true)
  assert.equal(move({ d4: piece('wQ') }, 'd4', 'h8'), true)
  assert.equal(move({ d4: piece('wQ') }, 'd4', 'f7'), false)
})

test('sliding pieces cannot move through occupied squares', () => {
  assert.equal(move({ c1: piece('wB'), d2: piece('wP') }, 'c1', 'h6'), false)
  assert.equal(move({ a1: piece('wR'), a4: piece('bP') }, 'a1', 'a8'), false)
  assert.equal(move({ d4: piece('wQ'), f6: piece('bN') }, 'd4', 'h8'), false)
})

test('moves cannot capture friendly pieces or either king', () => {
  assert.equal(move({ c1: piece('wB'), h6: piece('wN') }, 'c1', 'h6'), false)
  assert.equal(move({ c1: piece('wB'), h6: piece('bN') }, 'c1', 'h6'), true)
  assert.equal(move({ c1: piece('wB'), h6: piece('bK') }, 'c1', 'h6'), false)
  assert.equal(move({ c8: piece('bB') }, 'c8', 'h3'), false)
})

test('pawns obey forward, double-step, capture, and en passant rules', () => {
  assert.equal(move({ e2: piece('wP') }, 'e2', 'e4'), true)
  assert.equal(move({ e2: piece('wP'), e3: piece('bN') }, 'e2', 'e4'), false)
  assert.equal(move({ e3: piece('wP') }, 'e3', 'e5'), false)
  assert.equal(move({ e4: piece('wP'), f5: piece('bN') }, 'e4', 'f5'), true)
  assert.equal(move({ e4: piece('wP') }, 'e4', 'f5'), false)
  assert.equal(move(
    { e5: piece('wP'), d5: piece('bP') },
    'e5',
    'd6',
    { enPassantSquare: 'd6' },
  ), true)
})

test('castling requires rights, a rook, and a clear path but ignores attacked squares', () => {
  const position = { e1: piece('wK'), h1: piece('wR'), f8: piece('bR') }
  assert.equal(move(position, 'e1', 'g1', { castlingRights: 'K' }), true)
  assert.equal(move(position, 'e1', 'g1'), false)
  assert.equal(move({ ...position, f1: piece('wB') }, 'e1', 'g1', { castlingRights: 'K' }), false)
})

test('king safety is intentionally ignored', () => {
  const pinnedRook = { e1: piece('wK'), e2: piece('wR'), e8: piece('bR') }
  assert.equal(move(pinnedRook, 'e2', 'f2'), true)

  const kingWalkingIntoAttack = { e1: piece('wK'), e8: piece('bR') }
  assert.equal(move(kingWalkingIntoAttack, 'e1', 'e2'), true)
})

test('manual application handles en passant, castling, and promotion', () => {
  assert.deepEqual(
    applyPseudoLegalMove(
      { e5: piece('wP'), d5: piece('bP') },
      'e5',
      'd6',
      { enPassantSquare: 'd6' },
    ),
    { d6: piece('wP') },
  )
  assert.deepEqual(
    applyPseudoLegalMove(
      { e1: piece('wK'), h1: piece('wR') },
      'e1',
      'g1',
      { enPassantSquare: null },
    ),
    { f1: piece('wR'), g1: piece('wK') },
  )
  assert.deepEqual(
    applyPseudoLegalMove(
      { a7: piece('wP') },
      'a7',
      'a8',
      { enPassantSquare: null },
    ),
    { a8: piece('wQ') },
  )
})

test('FEN context provides side, castling rights, and en passant square', () => {
  assert.deepEqual(
    pseudoLegalMoveContextFromFen('8/8/8/8/8/8/8/8 b Kq e3 0 1'),
    { sideToMove: 'b', castlingRights: 'Kq', enPassantSquare: 'e3' },
  )
})
