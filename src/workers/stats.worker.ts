import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { oneSampleT } from '../stats/oneSampleT'
import { oneProportion } from '../stats/oneProportion'
import { pairedT } from '../stats/pairedT'
import { standardize } from '../stats/transform'
import { twoSampleT } from '../stats/twoSampleT'
import { twoProportions } from '../stats/twoProportions'

const api = {
  describe,
  oneProportion,
  oneSampleT,
  pairedT,
  standardize,
  twoSampleT,
  twoProportions,
}

export type StatsWorker = typeof api

expose(api)
