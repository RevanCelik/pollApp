import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SurveyStore } from '../services/survey-store';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  private readonly store = inject(SurveyStore);
  protected readonly createdSurvey = computed(() => this.store.surveys().find(s => s.id === this.surveyId()));
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly surveyId = computed(() => this.params().get('id'));
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly found = computed(() => !!this.createdSurvey());
  protected readonly questions = computed(() => this.createdSurvey()?.questions ?? []);
  protected readonly choices = signal<number[][]>([]);
  protected readonly counts = signal<number[][]>([]);
  protected readonly submitted = signal(false);
  protected readonly showValidation = signal(false);
  protected readonly hasResults = computed(() =>
    this.counts().some((row) => row.some((count) => count > 0)),
  );
  protected readonly results = computed(() =>
    this.counts().map((row) => {
      const total = row.reduce((sum, count) => sum + count, 0);
      return row.map((count) => (total ? Math.round((count / total) * 100) : 0));
    }),
  );

  constructor() {
    void this.store.load();
    effect(() => {
      this.counts.set(
        this.questions().map((question) => question.votes.map(() => 0)),
      );
      this.choices.set(this.questions().map(() => []));
      this.submitted.set(false);
      this.showValidation.set(false);
    });
  }

  protected reload(): void { void this.store.load(); }

  protected letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected choose(questionIndex: number, answerIndex: number): void {
    if (this.submitted()) return;
    this.choices.update((rows) =>
      rows.map((row, index) => {
        if (index !== questionIndex) return row;
        if (!this.questions()[index].multiple) return [answerIndex];
        return row.includes(answerIndex)
          ? row.filter((answer) => answer !== answerIndex)
          : [...row, answerIndex];
      }),
    );
  }

  protected complete(event: Event): void {
    event.preventDefault();
    if (this.submitted()) return;
    if (this.choices().some((row) => row.length === 0)) {
      this.showValidation.set(true);
      return;
    }
    this.counts.update((rows) =>
      rows.map((row, questionIndex) =>
        row.map(
          (count, answerIndex) =>
            count + (this.choices()[questionIndex].includes(answerIndex) ? 1 : 0),
        ),
      ),
    );
    this.submitted.set(true);
    this.showValidation.set(false);
  }
}
