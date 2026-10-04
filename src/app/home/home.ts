import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SurveyStore } from '../services/survey-store';
interface Survey {
  id: number | string;
  created?: boolean;
  category: string;
  title: string;
  daysLeft: number | null;
}
@Component({ selector: 'app-home', imports: [RouterLink], templateUrl: './home.html', styleUrl: './home.scss' })
export class Home {
  private readonly store = inject(SurveyStore);
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly surveys = computed<Survey[]>(() => this.store.surveys().map(survey => ({
    id: survey.id, title: survey.title, category: survey.category, created: true,
    daysLeft: survey.endDate ? Math.ceil((new Date(survey.endDate + 'T23:59:59').getTime() - Date.now()) / 86400000) : null,
  })));
  protected readonly highlights = computed(() => this.surveys()
    .filter(survey => survey.daysLeft !== null && survey.daysLeft >= 0)
    .sort((a, b) => a.daysLeft! - b.daysLeft!).slice(0, 3));
  constructor() { void this.store.load(); }
  protected reload(): void { void this.store.load(); }
  protected readonly selectedStatus = signal<'active' | 'past'>('active');
  protected readonly selectedCategory = signal('');
  protected readonly categoryMenuOpen = signal(false);
  protected readonly categories = computed(() => [...new Set(this.surveys().map(s => s.category))].sort());
  protected selectCategory(category: string): void { this.selectedCategory.set(category); this.categoryMenuOpen.set(false); }
  protected readonly visibleSurveys = computed(() => {
    const items = this.surveys().filter(s => this.selectedStatus() === 'active'
      ? s.daysLeft === null || s.daysLeft >= 0
      : s.daysLeft !== null && s.daysLeft < 0);
    return items.filter(s => !this.selectedCategory() || s.category === this.selectedCategory());
  });
  protected deadline(days: number): string {
    return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
}
