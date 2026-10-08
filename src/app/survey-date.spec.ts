import { surveyDaysLeft } from './survey-date';

const TODAY: Date = new Date(2026, 9, 7, 9);

/** Verifies that a deadline from yesterday is already expired. */
function testExpiresYesterdayDeadline(): void {
  expect(surveyDaysLeft('2026-10-06', TODAY)).toBe(-1);
}

/** Verifies the remaining days for deadlines today and tomorrow. */
function testCountsCurrentAndFutureDeadline(): void {
  expect(surveyDaysLeft('2026-10-07', TODAY)).toBe(0);
  expect(surveyDaysLeft('2026-10-08', TODAY)).toBe(1);
}

/** Verifies missing deadlines and day counting across a daylight saving time change. */
function testHandlesMissingDeadlineAndClockChange(): void {
  expect(surveyDaysLeft('', TODAY)).toBeNull();
  expect(surveyDaysLeft('2026-10-24', new Date(2026, 9, 25, 9))).toBe(-1);
}

const SURVEY_DATE_TESTS: Array<[string, () => void | Promise<void>]> = [
  [
    'marks yesterday as expired immediately, rather than rounding to zero',
    testExpiresYesterdayDeadline,
  ],
  ['keeps today active and counts tomorrow as one day away', testCountsCurrentAndFutureDeadline],
  [
    'handles missing deadlines and daylight saving changes',
    testHandlesMissingDeadlineAndClockChange,
  ],
];

describe('Survey calendar deadlines', () => {
  for (const [title, test] of SURVEY_DATE_TESTS) it(title, test);
});
