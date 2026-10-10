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
  page.querySelector<HTMLButtonElement>('.category-options button')!.click();
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

/** Verifies renumbering and preservation of the remaining questions and answers. */
async function testClearsAndDeletesQuestions(): Promise<void> {
  const fixture = await createForm();
  const page = fixture.nativeElement as HTMLElement;
  setInput(page, '#question-0', 'First question');
  await clickButton(fixture, '.add-question button');
  setInput(page, '#question-1', 'Second question');
  setInput(page, '#answer-1-0', 'Second answer A');
  setInput(page, '#answer-1-1', 'Second answer B');
  const multiple = page.querySelector<HTMLInputElement>('fieldset:nth-of-type(2) .multiple input')!;
  multiple.click();
  await clickButton(fixture, '.add-question button');
  setInput(page, '#question-2', 'Third question');
  setInput(page, '#answer-2-0', 'Third answer A');
  setInput(page, '#answer-2-1', 'Third answer B');
  await clickButton(fixture, '[aria-label="Delete question 1"]');
  expect(page.querySelectorAll('fieldset').length).toBe(2);
  expect(page.querySelector<HTMLInputElement>('#question-0')!.value).toBe('Second question');
  expect(page.querySelector<HTMLInputElement>('#question-1')!.value).toBe('Third question');
  expect(page.querySelector<HTMLInputElement>('#answer-0-0')!.value).toBe('Second answer A');
  expect(page.querySelector<HTMLInputElement>('#answer-0-1')!.value).toBe('Second answer B');
  expect(page.querySelector<HTMLInputElement>('fieldset:first-of-type .multiple input')!.checked).toBe(true);
  expect(page.querySelector<HTMLInputElement>('#answer-1-0')!.value).toBe('Third answer A');
  expect(page.querySelector<HTMLInputElement>('#answer-1-1')!.value).toBe('Third answer B');
  expect(page.querySelector('#question-2')).toBeNull();
  await clickButton(fixture, '[aria-label="Delete question 2"]');
  expect(page.querySelectorAll('fieldset').length).toBe(1);
  expect(page.querySelector<HTMLInputElement>('#question-0')!.value).toBe('Second question');
  const remainingFieldset = page.querySelector('fieldset');
  const remainingQuestionInput = page.querySelector('#question-0');
  await clickButton(fixture, '[aria-label="Clear question 1"]');
  expect(page.querySelector('fieldset')).toBe(remainingFieldset);
  expect(page.querySelector('#question-0')).toBe(remainingQuestionInput);
  expect(page.querySelectorAll('fieldset').length).toBe(1);
  expect(page.querySelector<HTMLInputElement>('#question-0')!.value).toBe('');
  expect(page.querySelector<HTMLInputElement>('#answer-0-0')!.value).toBe('');
  expect(page.querySelector<HTMLInputElement>('#answer-0-1')!.value).toBe('');
  expect(page.querySelector<HTMLInputElement>('fieldset:first-of-type .multiple input')!.checked).toBe(false);
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
  expect(page.querySelector('.field-invalid')).toBeNull();
  await submitForm(fixture);
  expect(page.querySelector('[role="alert"]')?.textContent).toContain(
    'Please complete the highlighted required fields.',
  );
  expect(page.querySelectorAll('[aria-invalid="true"]').length).toBe(5);
  expect(page.querySelector('#description')?.getAttribute('aria-invalid')).toBeNull();
  setInput(page, '#survey-name', '   ');
  await fixture.whenStable();
  expect(page.querySelector('#survey-name')?.getAttribute('aria-invalid')).toBe('true');
  setInput(page, '#survey-name', 'New survey');
  await fixture.whenStable();
  expect(page.querySelector('#survey-name')?.getAttribute('aria-invalid')).toBe('false');
  expect(page.querySelectorAll('[aria-invalid="true"]').length).toBe(4);
  fillValidSurvey(page);
  await fixture.whenStable();
  expect(page.querySelector('.field-invalid')).toBeNull();
  expect(page.querySelector('[role="alert"]')).toBeNull();
  const dialog = page.querySelector('dialog')!;
  dialog.showModal = vi.fn();
  await submitForm(fixture);
  expect(dialog.showModal).toHaveBeenCalledOnce();
  expect(TestBed.inject(SurveyStore).surveys()[0].title).toBe('New survey');
  expect(TestBed.inject(SurveyStore).surveys()[0].questions[0].answers).toEqual(['Yes', 'No']);
}

const CREATE_SURVEY_TESTS: Array<[string, () => void | Promise<void>]> = [
  ['removes and renumbers questions while clearing the last remaining question', testClearsAndDeletesQuestions],
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
