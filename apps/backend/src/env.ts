import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const backendRoot = resolve(currentDir, '..')
const workspaceRoot = resolve(currentDir, '../../..')

const candidates = [
  resolve(workspaceRoot, '.env'),
  resolve(backendRoot, '.env'),
  resolve(process.cwd(), '.env'),
]

for (const candidate of candidates) {
  config({ path: candidate, override: false, quiet: true })
}
