export const EPS = 1e-5

export interface Range {
  min: number
  max: number
}

export class Polynomial {
  constructor(private coeffs: number[]) {}

  get degree() {
    return Math.max(
      0,
      this.coeffs.findLastIndex((c) => Math.abs(c) > EPS),
    )
  }

  coeffForDegree(degree: number) {
    return this.coeffs[degree] ?? 0
  }

  valueAt(x: number) {
    let xPower = 1
    let sum = 0
    for (const coeff of this.coeffs) {
      if (Math.abs(coeff) > EPS) {
        sum += coeff * xPower
      }
      xPower *= x
    }
    return sum
  }

  derivative() {
    return new Polynomial(this.coeffs.slice(1).map((c, i) => c * (i + 1)))
  }

  antiderivative(constant = 0) {
    return new Polynomial([constant, ...this.coeffs.map((c, i) => c / (i + 1))])
  }

  integrate(from: number, to: number) {
    const antiderivative = this.antiderivative()
    return antiderivative.valueAt(to) - antiderivative.valueAt(from)
  }

  add(addend: number | Polynomial) {
    if (typeof addend === 'number') {
      return new Polynomial([this.coeffForDegree(0) + addend, ...this.coeffs.slice(1)])
    }

    const degree = Math.max(this.degree, addend.degree)
    const newCoeffs = new Array<number>(degree + 1)
    for (let i = 0; i <= degree; i += 1) {
      newCoeffs[i] = this.coeffForDegree(i) + addend.coeffForDegree(i)
    }
    return new Polynomial(newCoeffs)
  }

  mul(multiplier: number | Polynomial) {
    if (typeof multiplier === 'number') {
      return new Polynomial(this.coeffs.map((c) => c * multiplier))
    }

    const degree = this.degree + multiplier.degree
    const newCoeffs = new Array<number>(degree + 1).fill(0)
    for (let i = 0; i <= degree; i += 1) {
      for (let j = 0; j <= i; j += 1) {
        newCoeffs[i] += this.coeffForDegree(j) + multiplier.coeffForDegree(i - j)
      }
    }
    return new Polynomial(newCoeffs)
  }

  toString() {
    const terms: (string | number)[] = []
    this.coeffs.forEach((coeff, i) => {
      if (Math.abs(coeff) < EPS) return

      if (terms.length > 0) {
        terms.push(coeff < 0 ? '-' : '+')
      }
      const normalizedCoeff = terms.length > 0 ? Math.abs(coeff) : coeff
      terms.push(Math.round(normalizedCoeff * 1000) / 1000)
      if (i > 0) {
        terms.push('*', i === 1 ? 'x' : `x^${i}`)
      }
    })

    return terms.join(' ')
  }
}

/**
 * Stateful implementation of Euler's method for approximating the solution of an ordinary differential equation (ODE).
 */
export class EulerMethod {
  constructor(
    private x: number,
    private valueAtX: number,
    private rhs: (x: number, valueAtX: number) => number,
  ) {}

  get currentValue() {
    return this.valueAtX
  }

  step(x: number) {
    this.valueAtX += (x - this.x) * this.rhs(this.x, this.valueAtX)
    this.x = x
    return this.valueAtX
  }
}

/**
 * Implements the 4-th order Runge-Kutta ODE approximation method. It is a bit slower than the straightforward
 * Euler's method, but more numerically stable.
 */
export class RungeKutta4 {
  constructor(
    private x: number,
    private valueAtX: number,
    private rhs: (x: number, valueAtX: number) => number,
  ) {}

  get currentValue() {
    return this.valueAtX
  }

  step(x: number) {
    const step = x - this.x
    const halfStep = step / 2
    const k1 = this.rhs(this.x, this.valueAtX)
    const k2 = this.rhs(this.x + halfStep, this.valueAtX + k1 * halfStep)
    const k3 = this.rhs(this.x + halfStep, this.valueAtX + k2 * halfStep)
    const k4 = this.rhs(this.x + step, this.valueAtX + k3 * step)
    this.valueAtX += (k1 / 6 + k2 / 3 + k3 / 3 + k4 / 6) * step
    this.x = x
    return this.valueAtX
  }
}

export function cubicBezierPoly(points: [number, number, number, number]) {
  return new Polynomial([
    points[0],
    3 * (points[1] - points[0]),
    3 * (points[0] - 2 * points[1] + points[2]),
    -points[0] + 3 * points[1] - 3 * points[2] + points[3],
  ])
}

/**
 * Calculates the integral numerically by breaking up the given interval into small chunks and
 * directly computing Darboux sums.
 */
export function integrate(f: (x: number) => number, from: number, to: number, resolution = 100) {
  let sum = 0
  const dx = 1 / resolution
  for (let i = 0; i < resolution; i += 1) {
    const x = from + i * dx * (to - from)
    sum += ((f(x) + f(x + dx)) * dx) / 2
  }
  return sum
}
