import { wrap } from 'comlink'
import type { StatsWorker } from './stats.worker'

const worker = new Worker(new URL('./stats.worker.ts', import.meta.url), { type: 'module' })

export const statsWorker = wrap<StatsWorker>(worker)
