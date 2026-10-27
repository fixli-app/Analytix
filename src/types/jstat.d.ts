declare module 'jstat' {
  interface StudentTDistribution {
    cdf(value: number, degreesOfFreedom: number): number
    inv(probability: number, degreesOfFreedom: number): number
  }

  const jStat: {
    studentt: StudentTDistribution
  }

  export default jStat
}
