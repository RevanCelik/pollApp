import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { Home } from './home/home';
import { SurveyStore } from './services/survey-store';
import { mockSurveyStore } from './services/survey-store.fixture';

/** Creates a home fixture and waits for initial rendering. */
async function createHome(): Promise<ComponentFixture<Home>> {
  const fixture = TestBed.createComponent(Home);
  await fixture.whenStable();
  return fixture;
}

/** Opens the category filter and selects the requested option. */
async function chooseCategory(fixture: ComponentFixture<Home>, category: string): Promise<void> {
  const page = fixture.nativeElement as HTMLElement;
  const sort = page.querySelector<HTMLButtonElement>('.sort')!;
  sort.click();
  await fixture.whenStable();
  expect(sort.getAttribute('aria-expanded')).toBe('true');
  const option = [...page.querySelectorAll<HTMLButtonElement>('.category-options button')].find(
    (button) => button.textContent?.trim() === category,
  )!;
  option.click();
  await fixture.whenStable();
}

/** Verifies that the root component can be created with routing configured. */
async function testCreatesApp(): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([])],
  }).compileComponents();
  expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
}

const APP_TESTS: Array<[string, () => void | Promise<void>]> = [
  ['should create the app', testCreatesApp],
];

describe('App', () => {
  for (const [title, test] of APP_TESTS) it(title, test);
});

/** Configures home tests with routing and an isolated store. */
async function configureHome(): Promise<void> {
  await TestBed.configureTestingModule({
    imports: [Home],
    providers: [provideRouter([]), { provide: SurveyStore, useFactory: mockSurveyStore }],
  }).compileComponents();
}

/** Verifies that the home view renders its introduction and survey cards. */
async function testRendersSurveyCards(): Promise<void> {
  const fixture = TestBed.createComponent(Home);
  await fixture.whenStable();
  const page = fixture.nativeElement as HTMLElement;
  expect(page.querySelector('h1')?.textContent).toContain('Collect Feedback');
  expect(page.querySelectorAll('.highlight-card').length).toBe(3);
  expect(page.querySelectorAll('.survey-card').length).toBe(6);
}

/** Verifies that the status filter switches between past and active surveys. */
async function testSwitchesToPastSurveysAndBack(): Promise<void> {
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
}

/** Verifies that choosing and clearing a category updates the survey list. */
async function testFiltersAndResetsCategory(): Promise<void> {
  const fixture = await createHome();
  const page = fixture.nativeElement as HTMLElement;
  await chooseCategory(fixture, 'Gaming');
  expect(page.querySelectorAll('.survey-card').length).toBe(5);
  expect(page.querySelector('.category-options')).toBeNull();
  expect(page.querySelector('.selected-category')?.textContent).toBe('Gaming');
  await chooseCategory(fixture, 'All surveys');
  expect(page.querySelectorAll('.survey-card').length).toBe(6);
}

const HOME_TESTS: Array<[string, () => void | Promise<void>]> = [
  ['renders the home screen and its survey cards', testRendersSurveyCards],
  ['switches to past surveys and back to active surveys', testSwitchesToPastSurveysAndBack],
  ['filters through the category menu and restores all surveys', testFiltersAndResetsCategory],
];

describe('Home', () => {
  beforeEach(configureHome);
  for (const [title, test] of HOME_TESTS) it(title, test);
});
