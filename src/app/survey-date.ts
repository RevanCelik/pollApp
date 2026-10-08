import { MILLISECONDS_PER_DAY } from './survey.constants';

/**
 * Calculates remaining calendar days from the local reference date.
 *
 * @param endDate - Deadline in YYYY-MM-DD format, or an empty string.
 * @param today - Local reference date; defaults to the current date.
 * @returns Remaining days, negative for past deadlines, or null without a deadline.
 */
export function surveyDaysLeft(endDate: string, today: Date = new Date()): number | null {
  if (!endDate) return null;
  const [year, month, day] = endDate.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (deadline - currentDay) / MILLISECONDS_PER_DAY;
}

/**
 * Checks whether a dated survey ended before the current local calendar day.
 *
 * @param endDate - Deadline in YYYY-MM-DD format, or an empty string.
 * @returns Whether the deadline is before today; undated surveys remain active.
 */
export function isSurveyExpired(endDate: string): boolean {
  const daysLeft = surveyDaysLeft(endDate);
  return daysLeft !== null && daysLeft < 0;
}
