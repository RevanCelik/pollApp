import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { SurveyStore } from '../services/survey-store';
import { mockSurveyStore } from '../services/survey-store.fixture';
import { CreateSurvey } from './create-survey';

/** Creates a survey form fixture and waits for initial rendering. */
async function createForm(): Promise<ComponentFixture<CreateSurvey>> {
  const fixture = TestBed.createComponent(CreateSurvey);
  await fixture.whenStable();
  return fixture;
}

/** Updates an input and dispatches its Angular forms event. */
function setInput(page: HTMLElement, selector: string, value: string): void {
  const input = page.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/** Clicks the requested form button and waits for view updates. */
async function clickButton(
  fixture: ComponentFixture<CreateSurvey>,
  selector: string,
): Promise<void> {
  fixture.nativeElement.querySelector(selector).click();
  await fixture.whenStable();
}

/** Reaches the answer limit and verifies that adding more answers is disabled. */
async function fillAnswers(fixture: ComponentFixture<CreateSurvey>): Promise<void> {
  for (let index = 0; index < 5; index++) {
    await clickButton(fixture, '.add-answer');
  }
  expect(fixture.nativeElement.querySelectorAll('.answer-row').length).toBe(6);
  expect(fixture.nativeElement.querySelector('.add-answer').disabled).toBe(true);
}

/** Fills required survey fields with valid test values. */
function fillValidSurvey(page: HTMLElement): void {
  setInput(page, '#survey-name', 'New survey');
  setInput(page, '#question-0', 'Choose one');
  setInput(page, '#answer-0-0', 'Yes');
  setInput(page, '#answer-0-1', 'No');
  const category = page.querySelector('select')!;
  category.value = 'Team activities';
  category.dispatchEvent(new Event('change'));
}

/** Submits the creation form and waits for publication to settle. */
async function submitForm(fixture: ComponentFixture<CreateSurvey>): Promise<void> {
  fixture.nativeElement
    .querySelector('form')
    .dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
}

/** Configures creation tests with routing and an isolated store. */
async function configureCreateSurvey(): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [CreateSurvey],
    providers: [provideRouter([]), { provide: SurveyStore, useFactory: mockSurveyStore }],
  }).compileComponents();
}

/** Verifies that the first question is cleared while extra questions can be removed. */
async function testClearsAndDeletesQuestions(): Promise<void> {
  const fixture = await createForm();
  const page = fixture.nativeElement as HTMLElement;
  setInput(page, '#question-0', 'A question');
  await clickButton(fixture, '.add-question button');
  expect(page.querySelectorAll('fieldset').length).toBe(2);
  await clickButton(fixture, '[aria-label="Clear question 1"]');
  expect(page.querySelector<HTMLInputElement>('#question-0')!.value).toBe('');
  expect(page.querySelectorAll('fieldset').length).toBe(2);
  await clickButton(fixture, '[aria-label="Delete question 2"]');
  expect(page.querySelectorAll('fieldset').length).toBe(1);
}

/** Verifies the answer limit and that deleting an answer permits adding another. */
async function testLimitsEachQuestionToSixAnswers(): Promise<void> {
  const fixture = await createForm();
  const page = fixture.nativeElement as HTMLElement;
  const add = page.querySelector<HTMLButtonElement>('.add-answer')!;
  await fillAnswers(fixture);
  await clickButton(fixture, '[aria-label="Delete answer A from question 1"]');
  expect(add.disabled).toBe(false);
  await clickButton(fixture, '.add-answer');
  expect(page.querySelectorAll('.answer-row').length).toBe(6);
}

/** Verifies required-field validation and successful publication confirmation. */
async function testValidatesAndPublishesSurvey(): Promise<void> {
  const fixture = await createForm();
  const page = fixture.nativeElement as HTMLElement;
  await submitForm(fixture);
  expect(page.querySelector('[role="alert"]')).not.toBeNull();
  fillValidSurvey(page);
  const dialog = page.querySelector('dialog')!;
  dialog.showModal = vi.fn();
  await submitForm(fixture);
  expect(dialog.showModal).toHaveBeenCalledOnce();
  expect(TestBed.inject(SurveyStore).surveys()[0].title).toBe('New survey');
  expect(TestBed.inject(SurveyStore).surveys()[0].questions[0].answers).toEqual(['Yes', 'No']);
}

const CREATE_SURVEY_TESTS: Array<[string, () => void | Promise<void>]> = [
  ['clears the first question and removes additional questions', testClearsAndDeletesQuestions],
  [
    'limits each question to six answers and allows adding again after deletion',
    testLimitsEachQuestionToSixAnswers,
  ],
  [
    'validates before saving and opens the publication confirmation',
    testValidatesAndPublishesSurvey,
  ],
];

describe('Create survey', () => {
  beforeEach(configureCreateSurvey);
  for (const [title, test] of CREATE_SURVEY_TESTS) it(title, test);
});
