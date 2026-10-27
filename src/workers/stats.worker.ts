import { expose } from 'comlink'
import { describe } from '../stats/descriptive'

const api = { describe }

export type StatsWorker = typeof api

expose(api)
