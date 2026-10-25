import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const packageRoot = join(projectRoot, 'node_modules', 'stockfish')
const outputRoot = join(projectRoot, 'public', 'vendor', 'stockfish')

await mkdir(outputRoot, { recursive: true })

await Promise.all([
  'bin/stockfish-19-lite-single.js',
  'bin/stockfish-19-lite-single.wasm',
  'Copying.txt',
].map((relativePath) => copyFile(
  join(packageRoot, relativePath),
  join(outputRoot, relativePath.split('/').at(-1)),
)))
