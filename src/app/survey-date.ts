import { MILLISECONDS_PER_DAY } from './survey.constants';

export function surveyDaysLeft(endDate: string, today: Date = new Date()): number | null {
  if (!endDate) return null;
  const [year, month, day] = endDate.split('-').map(Number);
  const deadline = Date.UTC(year, month - 1, day);
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return (deadline - currentDay) / MILLISECONDS_PER_DAY;
}

export function isSurveyExpired(endDate: string): boolean {
  const daysLeft = surveyDaysLeft(endDate);
  return daysLeft !== null && daysLeft < 0;
}
