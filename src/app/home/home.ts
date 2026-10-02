import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
interface Survey {
  id: number;
  category: string;
  title: string;
  daysLeft: number;
}
@Component({ selector: 'app-home', imports: [RouterLink], templateUrl: './home.html', styleUrl: './home.scss' })
export class Home {
  // Example data from the design; database integration follows separately.
  protected readonly surveys: Survey[] = [
    {
      id: 1,
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      daysLeft: 1,
    },
    { id: 2, category: 'Gaming', title: 'Gaming habits and favorite games!', daysLeft: 3 },
    { id: 3, category: 'Gaming', title: 'Gaming habits and favorite games!', daysLeft: 3 },
    {
      id: 4,
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      daysLeft: 2,
    },
    {
      id: 5,
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      daysLeft: 2,
    },
    {
      id: 6,
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      daysLeft: 1,
    },
  ];
  protected readonly highlights: Survey[] = [
    this.surveys[0],
    { id: 7, category: 'Health & Wellness', title: 'Fit & wellness survey!', daysLeft: 2 },
    { ...this.surveys[1], category: 'Gaming & Entertainment' },
  ];
  protected readonly selectedStatus = signal<'active' | 'past'>('active');
  protected readonly sortByCategory = signal(false);
  protected readonly visibleSurveys = computed(() => {
    const items = this.selectedStatus() === 'active' ? [...this.surveys] : [];
    return this.sortByCategory()
      ? items.sort((a, b) => a.category.localeCompare(b.category))
      : items;
  });
  protected deadline(days: number): string {
    return `Ends in ${days} ${days === 1 ? 'Day' : 'Days'}`;
  }
}
