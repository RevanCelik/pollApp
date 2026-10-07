import { SurveyStore } from '../services/survey-store';
import { mockSurveyStore } from '../services/survey-store.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SurveyDetail } from './survey-detail';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { SurveyRealtime } from '../services/survey-realtime';

describe('Survey detail', () => {
  it('keeps expired surveys readable but blocks choices and submission', async () => {
    const harness = await RouterTestingHarness.create('/surveys/1');
    const store = TestBed.inject(SurveyStore);
    store.surveys.update((surveys) =>
      surveys.map((survey) => ({ ...survey, endDate: '2000-01-01' })),
    );
    harness.detectChanges();
    const page = harness.routeNativeElement!;
    const submit = vi.spyOn(store, 'submit');
    expect([...page.querySelectorAll('fieldset')].every((field) => field.disabled)).toBe(true);
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect(page.textContent).toContain('This survey has ended. Voting is closed.');
    page.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await harness.fixture.whenStable();
    expect(submit).not.toHaveBeenCalled();
  });
  beforeEach(async () => {
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
  });

  it('loads the four questions with no fabricated results', async () => {
    const harness = await RouterTestingHarness.create('/surveys/1');
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('fieldset').length).toBe(4);
    expect(page.querySelectorAll('.result-row').length).toBe(0);
    expect(page.querySelector('.empty-results')).not.toBeNull();
  });

  it('validates answers, counts a submission and prevents another submission', async () => {
    const harness = await RouterTestingHarness.create('/surveys/6');
    const page = harness.routeNativeElement!;
    expect(page.querySelector('.empty-results')?.textContent).toContain('There are no answers yet');
    const form = page.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')).not.toBeNull();
    for (const field of page.querySelectorAll('fieldset')) {
      field.querySelector<HTMLInputElement>('input')!.click();
    }
    harness.detectChanges();
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('.empty-results')).toBeNull();
    expect(page.querySelectorAll('.percentage')[0].textContent).toBe('100%');
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(true);
    expect([...page.querySelectorAll('fieldset')].every((field) => field.disabled)).toBe(true);
  });

  it('allows several activities but only one event duration', async () => {
    const harness = await RouterTestingHarness.create('/surveys/6');
    const page = harness.routeNativeElement!;
    const fields = page.querySelectorAll('fieldset');
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
  });

  it('shows saved results when reopening a survey', async () => {
    const harness = await RouterTestingHarness.create('/surveys/6');
    const store = TestBed.inject(SurveyStore);
    await store.submit('6', [[0], [1], [0], [2]]);
    await harness.navigateByUrl('/surveys/1');
    await harness.navigateByUrl('/surveys/6');
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('.empty-results')).toBeNull();
    expect(harness.routeNativeElement!.querySelector('.percentage')?.textContent).toBe('100%');
  });

  it('keeps answers available for retry after a failed save', async () => {
    const harness = await RouterTestingHarness.create('/surveys/6');
    const page = harness.routeNativeElement!;
    const submit = vi
      .spyOn(TestBed.inject(SurveyStore), 'submit')
      .mockRejectedValueOnce(new Error('Offline'));
    for (const field of page.querySelectorAll('fieldset'))
      field.querySelector<HTMLInputElement>('input')!.click();
    const form = page.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
    expect(page.querySelector('.empty-results')).not.toBeNull();
    expect(page.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(submit).toHaveBeenCalledTimes(2);
    expect(page.querySelector('.empty-results')).toBeNull();
    expect(page.querySelector('[role="alert"]')).toBeNull();
  });

  it('resets the example state when navigating to the other survey', async () => {
    const harness = await RouterTestingHarness.create('/surveys/1');
    await harness.navigateByUrl('/surveys/6');
    expect(harness.routeNativeElement!.querySelector('.empty-results')).not.toBeNull();
    await harness.navigateByUrl('/surveys/999');
    expect(harness.routeNativeElement!.querySelector('.not-found')).not.toBeNull();
  });
});
