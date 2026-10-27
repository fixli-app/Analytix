declare module 'jstat' {
  interface StudentTDistribution {
    cdf(value: number, degreesOfFreedom: number): number
    inv(probability: number, degreesOfFreedom: number): number
  }

  interface NormalDistribution {
    cdf(value: number, mean: number, standardDeviation: number): number
    inv(probability: number, mean: number, standardDeviation: number): number
  }

  interface ChiSquareDistribution {
    cdf(value: number, degreesOfFreedom: number): number
    inv(probability: number, degreesOfFreedom: number): number
  }

  interface FDistribution {
    cdf(
      value: number,
      numeratorDegreesOfFreedom: number,
      denominatorDegreesOfFreedom: number,
    ): number
  }

  const jStat: {
    studentt: StudentTDistribution
    normal: NormalDistribution
    chisquare: ChiSquareDistribution
    centralF: FDistribution
  }

  export default jStat
}
