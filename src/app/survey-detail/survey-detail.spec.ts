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
  expect(page.querySelector('.empty-results')).not.toBeNull();
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

const SURVEY_DETAIL_TESTS: Array<[string, () => void | Promise<void>]> = [
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
  for (const [title, test] of SURVEY_DETAIL_TESTS) it(title, test);
});
