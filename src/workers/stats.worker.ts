import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { oneSampleT } from '../stats/oneSampleT'
import { standardize } from '../stats/transform'
import { twoSampleT } from '../stats/twoSampleT'

const api = { describe, oneSampleT, standardize, twoSampleT }

export type StatsWorker = typeof api

expose(api)
