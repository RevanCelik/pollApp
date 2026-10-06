import { mockSurveyStore } from '../services/survey-store.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CreateSurvey } from './create-survey';
import { SurveyStore } from '../services/survey-store';

describe('Create survey', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateSurvey],
      providers: [provideRouter([]), { provide: SurveyStore, useFactory: mockSurveyStore }],
    }).compileComponents();
  });

  it('clears the first question and removes additional questions', async () => {
    const fixture = TestBed.createComponent(CreateSurvey);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const input = page.querySelector<HTMLInputElement>('#question-0')!;
    input.value = 'A question';
    input.dispatchEvent(new Event('input'));
    page.querySelector<HTMLButtonElement>('.add-question button')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('fieldset').length).toBe(2);
    page.querySelector<HTMLButtonElement>('[aria-label="Clear question 1"]')!.click();
    await fixture.whenStable();
    expect(page.querySelector<HTMLInputElement>('#question-0')!.value).toBe('');
    expect(page.querySelectorAll('fieldset').length).toBe(2);
    page.querySelector<HTMLButtonElement>('[aria-label="Delete question 2"]')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('fieldset').length).toBe(1);
  });

  it('limits each question to six answers and allows adding again after deletion', async () => {
    const fixture = TestBed.createComponent(CreateSurvey);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const add = page.querySelector<HTMLButtonElement>('.add-answer')!;
    for (let index = 0; index < 5; index++) {
      add.click();
      await fixture.whenStable();
    }
    expect(page.querySelectorAll('.answer-row').length).toBe(6);
    expect(add.disabled).toBe(true);
    page
      .querySelector<HTMLButtonElement>('[aria-label="Delete answer A from question 1"]')!
      .click();
    await fixture.whenStable();
    expect(add.disabled).toBe(false);
    add.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.answer-row').length).toBe(6);
  });

  it('validates before saving and opens the publication confirmation', async () => {
    const fixture = TestBed.createComponent(CreateSurvey);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const form = page.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    for (const [selector, value] of [
      ['#survey-name', 'New survey'],
      ['#question-0', 'Choose one'],
      ['#answer-0-0', 'Yes'],
      ['#answer-0-1', 'No'],
    ]) {
      const input = page.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    const category = page.querySelector('select')!;
    category.value = 'Team activities';
    category.dispatchEvent(new Event('change'));
    const dialog = page.querySelector('dialog')!;
    let opened = false;
    dialog.showModal = () => {
      opened = true;
    };
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(opened).toBe(true);
    expect(TestBed.inject(SurveyStore).surveys()[0].title).toBe('New survey');
    expect(TestBed.inject(SurveyStore).surveys()[0].questions[0].answers).toEqual(['Yes', 'No']);
  });
});
