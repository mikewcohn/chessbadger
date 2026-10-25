const STOCKFISH_WORKER_URL = '/vendor/stockfish/stockfish-19-lite-single.js'

type PendingSearch = {
  resolve: (move: string | null) => void
  reject: (error: Error) => void
}

export const parseStockfishBestMove = (line: string) => {
  const match = line.match(/^bestmove\s+(\S+)/)
  if (!match || match[1] === '(none)') return null
  return match[1]
}

export class StockfishEngine {
  private worker: Worker
  private readyPromise: Promise<void>
  private pendingSearch: PendingSearch | null = null
  private ignoredBestMoves = 0
  private resolveReady: (() => void) | null = null
  private rejectReady: ((error: Error) => void) | null = null
  private initialized = false
  private failedError: Error | null = null

  constructor() {
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve
      this.rejectReady = reject
    })

    this.worker = new Worker(STOCKFISH_WORKER_URL)
    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
    this.worker.postMessage('uci')
  }

  private handleMessage = (event: MessageEvent<string>) => {
    const lines = String(event.data).split(/\r?\n/)

    lines.forEach((line) => {
      if (line === 'uciok') {
        this.worker.postMessage('setoption name Hash value 16')
        this.worker.postMessage('isready')
        return
      }

      if (line === 'readyok' && !this.initialized) {
        this.initialized = true
        this.resolveReady?.()
        this.resolveReady = null
        this.rejectReady = null
        return
      }

      if (!line.startsWith('bestmove ')) return
      if (this.ignoredBestMoves > 0) {
        this.ignoredBestMoves -= 1
        return
      }
      if (!this.pendingSearch) return
      const pending = this.pendingSearch
      this.pendingSearch = null
      pending.resolve(parseStockfishBestMove(line))
    })
  }

  private handleError = () => {
    const error = new Error('Stockfish could not start in this browser.')
    this.failedError = error
    this.rejectReady?.(error)
    this.rejectReady = null
    this.resolveReady = null
    this.pendingSearch?.reject(error)
    this.pendingSearch = null
  }

  async ready() {
    await this.readyPromise
  }

  async findBestMove(fen: string, moveTimeMs = 500) {
    await this.ready()
    if (this.failedError) throw this.failedError
    this.stop()

    return new Promise<string | null>((resolve, reject) => {
      this.pendingSearch = { resolve, reject }
      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go movetime ${moveTimeMs}`)
    })
  }

  stop() {
    if (!this.pendingSearch) return
    const pending = this.pendingSearch
    this.pendingSearch = null
    this.ignoredBestMoves += 1
    this.worker.postMessage('stop')
    pending.resolve(null)
  }

  terminate() {
    this.stop()
    this.worker.removeEventListener('message', this.handleMessage)
    this.worker.removeEventListener('error', this.handleError)
    this.worker.terminate()
  }
}
