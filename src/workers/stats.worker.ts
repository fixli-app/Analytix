import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { oneSampleT } from '../stats/oneSampleT'
import { standardize } from '../stats/transform'

const api = { describe, oneSampleT, standardize }

export type StatsWorker = typeof api

expose(api)
