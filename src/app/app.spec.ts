import { SurveyStore } from './services/survey-store';
import { mockSurveyStore } from './services/survey-store.fixture';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { Home } from './home/home';

describe('App', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });
});

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Home], providers: [provideRouter([]), { provide: SurveyStore, useFactory: mockSurveyStore }] }).compileComponents();
  });

  it('renders the home screen and its survey cards', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Collect Feedback');
    expect(page.querySelectorAll('.highlight-card').length).toBe(3);
    expect(page.querySelectorAll('.survey-card').length).toBe(6);
  });

  it('switches to past surveys and back to active surveys', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const filters = page.querySelectorAll<HTMLButtonElement>('.filters button');
    filters[1].click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.survey-card').length).toBe(0);
    expect(page.querySelector('.empty-state')?.textContent).toContain('No past surveys');
    filters[0].click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.survey-card').length).toBe(6);
  });

  it('filters through the category menu and restores all surveys', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    const sort = page.querySelector<HTMLButtonElement>('.sort')!;
    sort.click();
    await fixture.whenStable();
    expect(sort.getAttribute('aria-expanded')).toBe('true');
    const gaming = [...page.querySelectorAll<HTMLButtonElement>('.category-options button')].find(button => button.textContent?.trim() === 'Gaming')!;
    gaming.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.survey-card').length).toBe(5);
    expect(page.querySelector('.category-options')).toBeNull();
    expect(page.querySelector('.selected-category')?.textContent).toBe('Gaming');
    sort.click();
    await fixture.whenStable();
    page.querySelector<HTMLButtonElement>('.category-options button')!.click();
    await fixture.whenStable();
    expect(page.querySelectorAll('.survey-card').length).toBe(6);
  });
});
