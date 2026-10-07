import { surveyDaysLeft } from './survey-date';

describe('Survey calendar deadlines', () => {
  const today = new Date(2026, 9, 7, 9);

  it('marks yesterday as expired immediately, rather than rounding to zero', () => {
    expect(surveyDaysLeft('2026-10-06', today)).toBe(-1);
  });

  it('keeps today active and counts tomorrow as one day away', () => {
    expect(surveyDaysLeft('2026-10-07', today)).toBe(0);
    expect(surveyDaysLeft('2026-10-08', today)).toBe(1);
  });

  it('handles missing deadlines and daylight saving changes', () => {
    expect(surveyDaysLeft('', today)).toBeNull();
    expect(surveyDaysLeft('2026-10-24', new Date(2026, 9, 25, 9))).toBe(-1);
  });
});
