import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';

import { SurveyRealtime } from '../services/survey-realtime';
import { SurveyStore } from '../services/survey-store';
import { mockSurveyStore } from '../services/survey-store.fixture';
import { SurveyDetail } from './survey-detail';

/** Selects the first available answer in each question fieldset. */
function answerEveryQuestion(page: HTMLElement): void {
  for (const field of page.querySelectorAll('fieldset')) {
    field.querySelector<HTMLInputElement>('input')!.click();
  }
}

/** Submits the response and waits for the detail view to update. */
async function submitAnswers(harness: RouterTestingHarness): Promise<void> {
  harness
    .routeNativeElement!.querySelector('form')!
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await harness.fixture.whenStable();
  harness.detectChanges();
}

/** Verifies that question fieldsets and the submit button are disabled. */
function expectLocked(page: HTMLElement): void {
  expect([...page.querySelectorAll('fieldset')].every((field) => field.disabled)).toBe(true);
  expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
}

/** Moves all test survey deadlines into the past. */
function expireSurveys(): void {
  TestBed.inject(SurveyStore).surveys.update((surveys) =>
    surveys.map((survey) => ({ ...survey, endDate: '2000-01-01' })),
  );
}

/** Verifies that saved answers replace empty results with a full answer bar. */
function expectSavedResult(page: HTMLElement): void {
  expect(page.querySelector('.empty-results')).toBeNull();
  expect(page.querySelector('.percentage')?.textContent).toBe('100%');
}

/** Verifies that a failed save leaves the form available for retry. */
function expectRetryAvailable(page: HTMLElement): void {
  expect(page.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
  expectSavedResult(page);
  expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
}

/** Verifies that expired surveys remain readable while submission is blocked. */
async function testBlocksExpiredSurveyVoting(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/1');
  const store = TestBed.inject(SurveyStore);
  expireSurveys();
  harness.detectChanges();
  const page = harness.routeNativeElement!;
  const submit = vi.spyOn(store, 'submit');
  expectLocked(page);
  expect(page.textContent).toContain('This survey has ended. Voting is closed.');
  await submitAnswers(harness);
  expect(submit).not.toHaveBeenCalled();
}

/** Configures detail tests with routing and isolated store and realtime services. */
async function configureSurveyDetail(): Promise<void> {
  localStorage.removeItem('poll-app:submitted:1');
  localStorage.removeItem('poll-app:submitted:6');
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'surveys/:id', component: SurveyDetail }]),
      { provide: SurveyStore, useFactory: mockSurveyStore },
      {
        provide: SurveyRealtime,
        useValue: { connected: signal(false), watch: vi.fn(() => vi.fn()) },
      },
    ],
  }).compileComponents();
}

/** Verifies that unanswered surveys show questions without fabricated results. */
async function testLoadsQuestionsWithoutResults(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/1');
  const page = harness.routeNativeElement!;
  expect(page.querySelectorAll('fieldset').length).toBe(4);
  expect(page.querySelectorAll('.result-row').length).toBe(0);
  expect(page.querySelector('.empty-results')).not.toBeNull();
}

/** Verifies required answers, saved results, and locking after voting. */
async function testValidatesAndLocksSubmission(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const page = harness.routeNativeElement!;
  expect(page.querySelector('.empty-results')?.textContent).toContain('There are no answers yet');
  await submitAnswers(harness);
  expect(page.querySelector('[role="alert"]')).not.toBeNull();
  answerEveryQuestion(page);
  await submitAnswers(harness);
  expectSavedResult(page);
  expectLocked(page);
}

/** Verifies multiple-choice selections and mutually exclusive single-choice answers. */
async function testRespectsAnswerSelectionMode(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const fields = harness.routeNativeElement!.querySelectorAll('fieldset');
  const activities = fields[1].querySelectorAll<HTMLInputElement>('input');
  activities[0].click();
  activities[1].click();
  const duration = fields[3].querySelectorAll<HTMLInputElement>('input');
  duration[0].click();
  duration[1].click();
  harness.detectChanges();
  expect(activities[0].checked && activities[1].checked).toBe(true);
  expect(duration[0].checked).toBe(false);
  expect(duration[1].checked).toBe(true);
}

/** Verifies that reopening a survey displays previously saved results. */
async function testRestoresSavedResults(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const store = TestBed.inject(SurveyStore);
  await store.submit('6', [[0], [1], [0], [2]]);
  await harness.navigateByUrl('/surveys/1');
  await harness.navigateByUrl('/surveys/6');
  harness.detectChanges();
  expect(harness.routeNativeElement!.querySelector('.empty-results')).toBeNull();
  expect(harness.routeNativeElement!.querySelector('.percentage')?.textContent).toBe('100%');
}

/** Verifies that failed saving preserves answers and permits a successful retry. */
async function testRetriesFailedSubmission(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const page = harness.routeNativeElement!;
  const submit = vi
    .spyOn(TestBed.inject(SurveyStore), 'submit')
    .mockRejectedValueOnce(new Error('Offline'));
  answerEveryQuestion(page);
  await submitAnswers(harness);
  expectRetryAvailable(page);
  expect(localStorage.getItem('poll-app:submitted:6')).toBeNull();
  await submitAnswers(harness);
  expect(submit).toHaveBeenCalledTimes(2);
  expect(page.querySelector('.empty-results')).toBeNull();
  expect(page.querySelector('[role="alert"]')).toBeNull();
}

/** Verifies that navigation resets survey state and handles unknown identifiers. */
async function testResetsStateOnNavigation(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/1');
  await harness.navigateByUrl('/surveys/6');
  expect(harness.routeNativeElement!.querySelector('.empty-results')).not.toBeNull();
  await harness.navigateByUrl('/surveys/999');
  expect(harness.routeNativeElement!.querySelector('.not-found')).not.toBeNull();
}

/** Verifies local previews, changing radio answers and toggling checkboxes without saving. */
async function testPreviewsSelectionsLocally(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const store = TestBed.inject(SurveyStore);
  const submit = vi.spyOn(store, 'submit');
  const page = harness.routeNativeElement!;
  const fields = page.querySelectorAll('fieldset');
  const choices = fields[0].querySelectorAll<HTMLInputElement>('input');
  choices[0].click();
  harness.detectChanges();
  expectSavedResult(page);
  choices[1].click();
  harness.detectChanges();
  expect(
    [...page.querySelectorAll('.result-question')[0].querySelectorAll('.percentage')].map(
      (el) => el.textContent,
    ),
  ).toEqual(['50%', '50%', '0%', '0%']);
  choices[0].click();
  harness.detectChanges();
  expect(page.querySelector('.percentage')?.textContent).toBe('0%');
  const radio = fields[3].querySelectorAll<HTMLInputElement>('input');
  radio[0].click();
  radio[1].click();
  harness.detectChanges();
  expect(
    [...page.querySelectorAll('.result-question')[3].querySelectorAll('.percentage')].map(
      (el) => el.textContent,
    ),
  ).toEqual(['0%', '100%', '0%']);
  expect(
    store
      .surveys()
      .find((survey) => survey.id === '6')!
      .questions.every((question) => question.votes.every((count) => count === 0)),
  ).toBe(true);
  expect(submit).not.toHaveBeenCalled();
  await harness.navigateByUrl('/surveys/1');
  await harness.navigateByUrl('/surveys/6');
  expect(harness.routeNativeElement!.querySelector('.empty-results')).not.toBeNull();
}

/** Verifies previews include incoming saved votes and disappear exactly once after saving. */
async function testCombinesPreviewAndSavedVotes(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const store = TestBed.inject(SurveyStore);
  const page = harness.routeNativeElement!;
  answerEveryQuestion(page);
  await store.submit('6', [[1], [1], [1], [1]]);
  harness.detectChanges();
  expect(page.querySelector('.percentage')?.textContent).toBe('50%');
  const submit = vi.spyOn(store, 'submit');
  await submitAnswers(harness);
  expect(submit).toHaveBeenCalledExactlyOnceWith('6', [[0], [0], [0], [0]]);
  expect(page.querySelector('.percentage')?.textContent).toBe('50%');
  expectLocked(page);
}

/** Verifies navigation restores the participation lock. */
async function testPersistsParticipation(): Promise<void> {
  const harness = await RouterTestingHarness.create('/surveys/6');
  const submit = vi.spyOn(TestBed.inject(SurveyStore), 'submit');
  answerEveryQuestion(harness.routeNativeElement!);
  await submitAnswers(harness);
  expect(localStorage.getItem('poll-app:submitted:6')).toBe('1');
  await harness.navigateByUrl('/surveys/1');
  expect(harness.routeNativeElement!.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  await harness.navigateByUrl('/surveys/6');
  expectLocked(harness.routeNativeElement!);
  await submitAnswers(harness);
  expect(submit).toHaveBeenCalledTimes(1);
}

/** Verifies a stored marker restores the lock without relying on in-memory state. */
async function testRestoresStoredParticipation(): Promise<void> {
  localStorage.setItem('poll-app:submitted:6', '1');
  const harness = await RouterTestingHarness.create('/surveys/6');
  const submit = vi.spyOn(TestBed.inject(SurveyStore), 'submit');
  expectLocked(harness.routeNativeElement!);
  await submitAnswers(harness);
  expect(submit).not.toHaveBeenCalled();
}

/** Verifies storage failures do not turn a successful vote into a failed submission. */
async function testHandlesUnavailableStorage(): Promise<void> {
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Storage unavailable');
  });
  try {
    const harness = await RouterTestingHarness.create('/surveys/6');
    answerEveryQuestion(harness.routeNativeElement!);
    await submitAnswers(harness);
    expectLocked(harness.routeNativeElement!);
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')).toBeNull();
    await harness.navigateByUrl('/surveys/1');
    await harness.navigateByUrl('/surveys/6');
    expectLocked(harness.routeNativeElement!);
  } finally {
    storage.mockRestore();
  }
}

const SURVEY_DETAIL_TESTS: Array<[string, () => void | Promise<void>]> = [
  ['keeps successful participation locked after navigation and reopening', testPersistsParticipation],
  ['restores participation from browser storage', testRestoresStoredParticipation],
  ['preserves successful voting when browser storage is unavailable', testHandlesUnavailableStorage],
  [
    'previews selections without saving and discards them on navigation',
    testPreviewsSelectionsLocally,
  ],
  [
    'combines local and saved votes without double counting after completion',
    testCombinesPreviewAndSavedVotes,
  ],
  [
    'keeps expired surveys readable but blocks choices and submission',
    testBlocksExpiredSurveyVoting,
  ],
  ['loads the four questions with no fabricated results', testLoadsQuestionsWithoutResults],
  [
    'validates answers, counts a submission and prevents another submission',
    testValidatesAndLocksSubmission,
  ],
  ['allows several activities but only one event duration', testRespectsAnswerSelectionMode],
  ['shows saved results when reopening a survey', testRestoresSavedResults],
  ['keeps answers available for retry after a failed save', testRetriesFailedSubmission],
  ['resets the example state when navigating to the other survey', testResetsStateOnNavigation],
];

describe('Survey detail', () => {
  beforeEach(configureSurveyDetail);
  afterEach(() => {
    localStorage.removeItem('poll-app:submitted:1');
    localStorage.removeItem('poll-app:submitted:6');
  });
  for (const [title, test] of SURVEY_DETAIL_TESTS) it(title, test);
});
