import type { TransactionRecord } from '../utils/transactions'
import type { NagIntensity } from './nagIntensity'
import { getWeeklySettlementNagText } from './nagMessages'

export type WeeklyComparisonDirection = 'more' | 'less' | 'equal'

export type WeeklySettlementContent = {
  comparisonLabel: string
  comparisonAmount: number
  direction: WeeklyComparisonDirection
  message: string
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function sumExpenseBetween(transactions: TransactionRecord[], from: Date, toExclusive: Date): number {
  const a = from.getTime()
  const b = toExclusive.getTime()
  return transactions
    .filter((r) => {
      if (r.type !== 'expense') return false
      const t = new Date(r.createdAt).getTime()
      return t >= a && t < b
    })
    .reduce((s, r) => s + r.amount, 0)
}

export function getWeeklyExpenseSums(
  transactions: TransactionRecord[],
  today: Date,
): { lastSum: number; prevSum: number } {
  const end = startOfLocalDay(today)
  const lastStart = new Date(end)
  lastStart.setDate(lastStart.getDate() - 7)
  const prevStart = new Date(lastStart)
  prevStart.setDate(prevStart.getDate() - 7)
  return {
    lastSum: sumExpenseBetween(transactions, lastStart, end),
    prevSum: sumExpenseBetween(transactions, prevStart, lastStart),
  }
}

function comparisonFromSums(lastSum: number, prevSum: number): Pick<
  WeeklySettlementContent,
  'comparisonLabel' | 'comparisonAmount' | 'direction'
> {
  const diff = Math.abs(lastSum - prevSum)
  if (lastSum > prevSum) {
    return {
      comparisonLabel: '지난주 비교 더 쓴 돈',
      comparisonAmount: diff,
      direction: 'more',
    }
  }
  if (lastSum < prevSum) {
    return {
      comparisonLabel: '지난주 비교 덜 쓴 돈',
      comparisonAmount: diff,
      direction: 'less',
    }
  }
  return {
    comparisonLabel: '지난주 비교 같은 지출',
    comparisonAmount: 0,
    direction: 'equal',
  }
}

export function buildWeeklySettlement(
  transactions: TransactionRecord[],
  today: Date,
  selected: NagIntensity,
): WeeklySettlementContent | null {
  if (today.getDay() !== 0) return null
  const message = getWeeklySettlementNagText(transactions, today, selected)
  if (!message) return null
  const { lastSum, prevSum } = getWeeklyExpenseSums(transactions, today)
  return {
    ...comparisonFromSums(lastSum, prevSum),
    message,
  }
}
