import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SurveyStore } from '../services/survey-store';
import { surveyDaysLeft } from '../survey-date';
import { MAX_HIGHLIGHTED_SURVEYS } from '../survey.constants';
interface Survey {
  id: number | string;
  created?: boolean;
  category: string;
  title: string;
  daysLeft: number | null;
}
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly store = inject(SurveyStore);
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly surveys = computed<Survey[]>(() =>
    this.store.surveys().map((survey) => ({
      id: survey.id,
      title: survey.title,
      category: survey.category,
      created: true,
      daysLeft: surveyDaysLeft(survey.endDate),
    })),
  );
  protected readonly highlights = computed(() =>
    this.surveys()
      .filter((survey) => survey.daysLeft !== null && survey.daysLeft >= 0)
      .sort((a, b) => a.daysLeft! - b.daysLeft!)
      .slice(0, MAX_HIGHLIGHTED_SURVEYS),
  );
  /** Starts loading the surveys displayed on the home view. */
  constructor() {
    void this.store.load();
  }
  /** Requests a fresh survey load through the store. */
  protected reload(): void {
    void this.store.load();
  }
  protected readonly selectedStatus = signal<'active' | 'past'>('active');
  protected readonly selectedCategory = signal('');
  protected readonly categoryMenuOpen = signal(false);
  protected readonly categories = computed(() =>
    [...new Set(this.surveys().map((survey) => survey.category))].sort(),
  );
  /** Applies the category filter and closes its dropdown. */
  protected selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.categoryMenuOpen.set(false);
  }
  /** Closes the category menu when focus moves outside its container. */
  protected onCategoryFocusOut(event: FocusEvent): void {
    const container = event.currentTarget;
    const nextTarget = event.relatedTarget;
    if (!(container instanceof HTMLElement)) return;
    if (nextTarget instanceof Node && container.contains(nextTarget)) return;
    this.categoryMenuOpen.set(false);
  }
  protected readonly visibleSurveys = computed(() => {
    const items = this.surveys().filter((survey) =>
      this.selectedStatus() === 'active'
        ? survey.daysLeft === null || survey.daysLeft >= 0
        : survey.daysLeft !== null && survey.daysLeft < 0,
    );
    return items.filter(
      (survey) => !this.selectedCategory() || survey.category === this.selectedCategory(),
    );
  });
  /** Formats remaining calendar days as an English deadline label. */
  protected deadline(days: number): string {
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
}
