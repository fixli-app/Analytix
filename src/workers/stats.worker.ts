import { expose } from 'comlink'
import { describe } from '../stats/descriptive'
import { correlation } from '../stats/correlation'
import { compareVariances } from '../stats/compareVariances'
import { chiSquareIndependence } from '../stats/chiSquare'
import {
  chiSquareGoodnessOfFit,
  chiSquareUniformGoodnessOfFit,
} from '../stats/chiSquareGoodnessOfFit'
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
import { buildGraph } from '../charts/graphData'
import { crossedGageRr } from '../quality/gageRr'
import { subgroupControlChart } from '../quality/subgroupControlChart'
import { normalAndersonDarling } from '../stats/normalAndersonDarling'
import { poissonGoodnessOfFit } from '../stats/poissonGoodnessOfFit'
import { oneWayAnova } from '../stats/oneWayAnova'
import {
  friedman,
  kruskalWallis,
  mannWhitney,
  moodMedian,
  runsTest,
  signTest,
  wilcoxonSignedRank,
} from '../stats/nonparametric'
import { bootstrapInterval, permutationDifference } from '../stats/resampling'
import { analyzeTwoLevelFactorial } from '../doe/twoLevelFactorial'
import { twoWayAnova } from '../stats/twoWayAnova'
import { linearRegression } from '../stats/linearRegression'
import { multipleLinearRegression } from '../stats/regressionModel'
import { kaplanMeier } from '../stats/survival'
import { parametricSurvival } from '../stats/parametricSurvival'
import { analyzeTimeSeries } from '../stats/timeSeries'
import { powerAndSampleSize } from '../stats/power'

const api = {
  describe,
  correlation,
  compareVariances,
  chiSquareIndependence,
  chiSquareGoodnessOfFit,
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
  buildGraph,
  crossedGageRr,
  subgroupControlChart,
  normalAndersonDarling,
  poissonGoodnessOfFit,
  oneWayAnova,
  mannWhitney,
  kruskalWallis,
  signTest,
  runsTest,
  wilcoxonSignedRank,
  moodMedian,
  friedman,
  bootstrapInterval,
  permutationDifference,
  analyzeTwoLevelFactorial,
  twoWayAnova,
  linearRegression,
  multipleLinearRegression,
  kaplanMeier,
  parametricSurvival,
  analyzeTimeSeries,
  powerAndSampleSize,
}

export type StatsWorker = typeof api

expose(api)
