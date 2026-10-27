declare module 'jstat' {
  interface StudentTDistribution {
    cdf(value: number, degreesOfFreedom: number): number
    inv(probability: number, degreesOfFreedom: number): number
  }

  interface NormalDistribution {
    cdf(value: number, mean: number, standardDeviation: number): number
    inv(probability: number, mean: number, standardDeviation: number): number
  }

  const jStat: {
    studentt: StudentTDistribution
    normal: NormalDistribution
  }

  export default jStat
}
