import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { standardize } from '../stats/transform'

const api = { describe, standardize }

export type StatsWorker = typeof api

expose(api)
