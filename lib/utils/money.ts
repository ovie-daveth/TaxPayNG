/**
 * Money utilities for ledger and accounting.
 * Use these for all new money/ledger math to avoid float rounding errors.
 * Phase 0.5 — see docs/phase-0/README.md
 */

import Decimal from "decimal.js"

/** Default precision for money (2 decimal places) */
const MONEY_DP = 2

/**
 * Normalise to a number safe for money (2 decimal places).
 * Prefer using Decimal for chained calculations, then toNumber() at the end.
 */
export function money(value: number | string | Decimal): number {
  return new Decimal(value).toDecimalPlaces(MONEY_DP).toNumber()
}

/**
 * Sum an array of amounts (avoids float drift).
 */
export function sum(amounts: (number | string | Decimal)[]): number {
  return amounts
    .reduce((acc, a) => acc.plus(a), new Decimal(0))
    .toDecimalPlaces(MONEY_DP)
    .toNumber()
}

/**
 * Add two or more amounts.
 */
export function add(...amounts: (number | string | Decimal)[]): number {
  return sum(amounts)
}

/**
 * Subtract b from a.
 */
export function subtract(a: number | string | Decimal, b: number | string | Decimal): number {
  return new Decimal(a).minus(b).toDecimalPlaces(MONEY_DP).toNumber()
}

/**
 * Multiply amount by factor (e.g. for VAT or percentages).
 */
export function multiply(
  amount: number | string | Decimal,
  factor: number | string | Decimal
): number {
  return new Decimal(amount).times(factor).toDecimalPlaces(MONEY_DP).toNumber()
}

/**
 * Check two amounts are equal (to 2 d.p.).
 */
export function eq(a: number | string | Decimal, b: number | string | Decimal): boolean {
  return new Decimal(a).toDecimalPlaces(MONEY_DP).eq(new Decimal(b).toDecimalPlaces(MONEY_DP))
}

/**
 * Round to 2 decimal places (alias for consistent API).
 */
export function round(amount: number | string | Decimal): number {
  return new Decimal(amount).toDecimalPlaces(MONEY_DP).toNumber()
}

/** Re-export for use in ledger code (e.g. validating sum(debits) === sum(credits)) */
export { Decimal }
