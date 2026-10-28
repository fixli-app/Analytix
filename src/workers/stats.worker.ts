import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { correlation } from '../stats/correlation'
import { compareVariances } from '../stats/compareVariances'
import { chiSquareIndependence } from '../stats/chiSquare'
import { chiSquareUniformGoodnessOfFit } from '../stats/chiSquareGoodnessOfFit'
import { fisherExactTwoSided } from '../stats/fisherExact'
import { oneSampleT } from '../stats/oneSampleT'
import { oneProportion } from '../stats/oneProportion'
import { oneSamplePoissonRate } from '../stats/oneSamplePoissonRate'
import { oneSampleZ } from '../stats/oneSampleZ'
import { normalKolmogorovSmirnov } from '../stats/normalKs'
import { twoSampleZ } from '../stats/twoSampleZ'
import { pairedT } from '../stats/pairedT'
import { standardize } from '../stats/transform'
import { twoSampleT } from '../stats/twoSampleT'
import { twoProportions } from '../stats/twoProportions'
import { twoSamplePoissonRate } from '../stats/twoSamplePoissonRate'
import { normalProcessCapability } from '../stats/processCapability'
import { imrControlChart } from '../stats/imrControlChart'

const api = {
  describe,
  correlation,
  compareVariances,
  chiSquareIndependence,
  chiSquareUniformGoodnessOfFit,
  fisherExactTwoSided,
  oneProportion,
  oneSamplePoissonRate,
  oneSampleZ,
  normalKolmogorovSmirnov,
  twoSampleZ,
  oneSampleT,
  pairedT,
  standardize,
  twoSampleT,
  twoProportions,
  twoSamplePoissonRate,
  normalProcessCapability,
  imrControlChart,
}

export type StatsWorker = typeof api

expose(api)
