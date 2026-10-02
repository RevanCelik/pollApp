import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SurveyDetail } from './survey-detail';

describe('Survey detail', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'surveys/:id', component: SurveyDetail }])],
    }).compileComponents();
  });

  it('shows seeded results and the four questions', async () => {
    const harness = await RouterTestingHarness.create('/surveys/1');
    const page = harness.routeNativeElement!;
    expect(page.querySelectorAll('fieldset').length).toBe(4);
    expect(page.querySelectorAll('.result-row').length).toBe(16);
    expect(page.querySelector('.empty-results')).toBeNull();
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

  it('resets the example state when navigating to the other survey', async () => {
    const harness = await RouterTestingHarness.create('/surveys/1');
    await harness.navigateByUrl('/surveys/6');
    expect(harness.routeNativeElement!.querySelector('.empty-results')).not.toBeNull();
    await harness.navigateByUrl('/surveys/999');
    expect(harness.routeNativeElement!.querySelector('.not-found')).not.toBeNull();
  });
});
