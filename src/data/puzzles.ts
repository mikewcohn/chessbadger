type PuzzleBase = {
  id: string
  title: string
  fen: string
  answers: string[]
}

type MovePuzzle = PuzzleBase & {
  type?: 'move'
  solutionLines?: string[][]
}

export type PlacementPuzzle = PuzzleBase & {
  type: 'placement'
  piece: 'wQ' | 'bQ'
}

export type Puzzle = MovePuzzle | PlacementPuzzle

export const puzzles: Puzzle[] = [
  {
    id: 'page-3-puzzle-01',
    title: 'Page 3, Puzzle 01',
    fen: '2k4r/2p3p1/1p3q2/n1bQ3p/P7/5NPP/5PB1/3R2K1 w - - 0 1',
    answers: ['Qa8#'],
  },
  {
    id: 'page-3-puzzle-02',
    title: 'Page 3, Puzzle 02',
    fen: '8/1p4pp/k1p1Nbb1/r3n3/8/P3B2P/1P3PP1/3R2K1 w - - 0 1',
    answers: ['Nc7#'],
  },
  {
    id: 'page-3-puzzle-03',
    title: 'Page 3, Puzzle 03',
    fen: '2kr2r1/pp5p/2p5/2R5/P7/4B3/1P2bP1P/4R2K b - - 0 1',
    answers: ['Bf3#'],
  },
  {
    id: 'page-3-puzzle-04',
    title: 'Page 3, Puzzle 04',
    fen: '2k4r/pp4pp/5pn1/2b5/2Q5/5N1P/P4PP1/6K1 b - - 0 1',
    answers: ['b6'],
  },
  {
    id: 'page-3-puzzle-05',
    title: 'Page 3, Puzzle 05',
    fen: '1n1r1r1k/4b1pp/1p1p1p2/pB1P4/6P1/2N2P1P/1P3K2/r3r3 b - - 0 1',
    answers: ['Rf7'],
  },
  {
    id: 'page-3-puzzle-06',
    title: 'Page 3, Puzzle 06',
    fen: '3r1nk1/5pp1/1p5p/2n5/8/2N3P1/1PP1QPBP/r5K1 w - - 0 1',
    answers: ['Bf1'],
  },
  {
    id: 'page-3-puzzle-07',
    title: 'Page 3, Puzzle 07',
    fen: 'R2bk3/5n2/2P1p3/3pP2Q/3P4/B3K3/8/8 b - - 0 1',
    answers: ['Bg1'],
    solutionLines: [['Bg1', 'Bxc1', 'Rxc1#']],
  },
  {
    id: 'page-3-puzzle-08',
    title: 'Page 3, Puzzle 08',
    fen: '6r1/pp5p/1bp1kp2/4p3/P3Pn2/5B1P/1PP2KP1/4NR2 w - - 0 1',
    answers: ['Kh8', 'Kf8', 'Kg7'],
    solutionLines: [['Kh8'], ['Kf8', 'Qf7#'], ['Kg7', 'Qf6#']],
  },
  {
    id: 'page-3-puzzle-09',
    title: 'Page 3, Puzzle 09',
    fen: '1r2k3/5pbp/2p1b1p1/p5P1/P5P1/2N5/2P5/K7 w - - 0 1',
    answers: ['Kg1'],
  },
  {
    id: 'page-3-puzzle-10',
    title: 'Page 3, Puzzle 10',
    fen: 'r2q1rk1/ppp2pbp/2n3p1/3N4/3pP3/6BP/PPP2PP1/r2Q1RK1 w - - 0 1',
    answers: ['Bxc7', 'Nxc7'],
  },
  {
    id: 'page-3-puzzle-11',
    title: 'Page 3, Puzzle 11',
    fen: 'r2qr1k1/pbp2ppp/1p1p1n2/4p3/2P1P3/1P3N2/P1P2PPP/r1BQR1K1 b - - 0 1',
    answers: ['Nxe4', 'Bxe4'],
  },
  {
    id: 'page-3-puzzle-12',
    title: 'Page 3, Puzzle 12',
    fen: '4r1k1/5ppp/2b5/8/p7/1B4P1/P5PP/5RK1 w - - 0 1',
    answers: ['Bxf7+'],
    solutionLines: [['Bxf7+', 'Rxf7', 'axb3']],
  },
  {
    id: 'page-6-puzzle-01',
    title: 'Page 6, Puzzle 01',
    type: 'placement',
    piece: 'wQ',
    fen: '8/1k6/4r3/8/8/8/8/8 w - - 0 1',
    answers: ['d7', 'f7'],
  },
  {
    id: 'page-6-puzzle-02',
    title: 'Page 6, Puzzle 02',
    type: 'placement',
    piece: 'wQ',
    fen: '7k/8/8/4r3/8/8/8/8 w - - 0 1',
    answers: ['b8', 'f6', 'h2'],
  },
  {
    id: 'page-6-puzzle-03',
    title: 'Page 6, Puzzle 03',
    type: 'placement',
    piece: 'wQ',
    fen: '2n5/8/8/3k4/8/8/8/8 w - - 0 1',
    answers: ['a8', 'b7', 'f5', 'g8'],
  },
  {
    id: 'page-6-puzzle-04',
    title: 'Page 6, Puzzle 04',
    type: 'placement',
    piece: 'bQ',
    fen: '8/8/8/8/K2N4/8/8/8 b - - 0 1',
    answers: ['a1', 'a7', 'c4'],
  },
  {
    id: 'page-6-puzzle-05',
    title: 'Page 6, Puzzle 05',
    type: 'placement',
    piece: 'bQ',
    fen: '8/8/8/8/2K3B1/8/8/8 b - - 0 1',
    answers: ['e4', 'f4', 'g8'],
  },
  {
    id: 'page-6-puzzle-06',
    title: 'Page 6, Puzzle 06',
    type: 'placement',
    piece: 'bQ',
    fen: '8/8/8/6B1/8/8/3K4/8 b - - 0 1',
    answers: ['a5', 'd5', 'g2'],
  },
  {
    id: 'page-6-puzzle-07',
    title: 'Page 6, Puzzle 07',
    type: 'placement',
    piece: 'wQ',
    fen: '6k1/8/8/n7/8/8/8/8 w - - 0 1',
    answers: ['a2', 'a8', 'd5', 'd8', 'g5'],
  },
  {
    id: 'page-6-puzzle-08',
    title: 'Page 6, Puzzle 08',
    type: 'placement',
    piece: 'bQ',
    fen: '8/8/8/8/8/R7/8/6K1 b - - 0 1',
    answers: ['c1', 'c5'],
  },
  {
    id: 'page-6-puzzle-09',
    title: 'Page 6, Puzzle 09',
    type: 'placement',
    piece: 'wQ',
    fen: '8/8/8/5k2/8/8/1b6/8 w - - 0 1',
    answers: ['b1', 'c2', 'f2'],
  },
  {
    id: 'page-6-puzzle-10',
    title: 'Page 6, Puzzle 10',
    type: 'placement',
    piece: 'wQ',
    fen: '8/8/1k4b1/8/8/8/8/8 w - - 0 1',
    answers: ['d6', 'e6', 'f6', 'g1'],
  },
  {
    id: 'page-6-puzzle-11',
    title: 'Page 6, Puzzle 11',
    type: 'placement',
    piece: 'wQ',
    fen: '8/8/8/3k4/5n2/8/3b4/8 w - - 0 1',
    answers: ['a2'],
  },
  {
    id: 'page-6-puzzle-12',
    title: 'Page 6, Puzzle 12',
    type: 'placement',
    piece: 'bQ',
    fen: '8/2R5/5N2/8/3K4/8/8/8 b - - 0 1',
    answers: ['b6', 'f4'],
  },
]
