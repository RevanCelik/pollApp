import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SurveyStore } from '../services/survey-store';
import { SurveyRealtime } from '../services/survey-realtime';
import { FIRST_ANSWER_LETTER_CODE, PERCENTAGE_FACTOR } from '../survey.constants';
import { isSurveyExpired } from '../survey-date';

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  private readonly store = inject(SurveyStore);
  private readonly realtime = inject(SurveyRealtime);
  protected readonly live = this.realtime.connected;
  protected readonly createdSurvey = computed(() =>
    this.store.surveys().find((s) => s.id === this.surveyId()),
  );
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly surveyId = computed(() => this.params().get('id'));
  protected readonly loading = this.store.loading;
  protected readonly error = this.store.error;
  protected readonly found = computed(() => !!this.createdSurvey());
  protected readonly expired = computed(() => isSurveyExpired(this.createdSurvey()?.endDate ?? ''));
  protected readonly questions = computed(() => this.createdSurvey()?.questions ?? []);
  protected readonly choices = signal<number[][]>([]);
  protected readonly counts = computed(() => this.questions().map((question) => question.votes));
  protected readonly saving = signal(false);
  protected readonly submitError = signal('');
  protected readonly submitted = signal(false);
  protected readonly showValidation = signal(false);
  protected readonly resultsOpen = signal(true);
  protected readonly hasResults = computed(() =>
    this.counts().some((row) => row.some((count) => count > 0)),
  );
  protected readonly results = computed(() =>
    this.counts().map((row) => {
      const total = row.reduce((sum, count) => sum + count, 0);
      return row.map((count) => (total ? Math.round((count / total) * PERCENTAGE_FACTOR) : 0));
    }),
  );

  constructor() {
    void this.store.load();
    effect((onCleanup) => {
      const id = this.surveyId();
      if (id) onCleanup(this.realtime.watch(id));
    });
    effect(() => {
      this.resetSurvey(this.surveyId());
    });
  }
  private resetSurvey(id: string | null): void {
    if (id === this.activeSurveyId) return;
    this.activeSurveyId = id;
    this.choices.set([]);
    this.submitted.set(false);
    this.showValidation.set(false);
    this.resultsOpen.set(true);
    this.submitError.set('');
  }

  protected reload(): void {
    void this.store.load();
  }
  private activeSurveyId: string | null | undefined;

  protected letter(index: number): string {
    return String.fromCharCode(FIRST_ANSWER_LETTER_CODE + index);
  }

  protected choose(questionIndex: number, answerIndex: number): void {
    if (this.submitted() || this.saving() || this.expired()) return;
    this.choices.update((rows) =>
      this.questions().map((_, index) =>
        index === questionIndex
          ? this.updatedSelection(index, answerIndex, rows[index] ?? [])
          : (rows[index] ?? []),
      ),
    );
  }
  private updatedSelection(questionIndex: number, answerIndex: number, row: number[]): number[] {
    if (!this.questions()[questionIndex].multiple) return [answerIndex];
    return row.includes(answerIndex)
      ? row.filter((answer) => answer !== answerIndex)
      : [...row, answerIndex];
  }

  protected async complete(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitted() || this.saving() || this.expired()) return;
    if (!this.hasCompleteAnswers()) {
      this.showValidation.set(true);
      return;
    }
    const surveyId = this.surveyId()!;
    this.saving.set(true);
    this.submitError.set('');
    this.showValidation.set(false);
    await this.submitAnswers(surveyId);
  }
  private hasCompleteAnswers(): boolean {
    return (
      this.questions().length > 0 &&
      this.questions().every((_, index) => !!this.choices()[index]?.length)
    );
  }
  private async submitAnswers(surveyId: string): Promise<void> {
    try {
      await this.store.submit(surveyId, this.choices());
      if (this.surveyId() === surveyId) this.submitted.set(true);
    } catch {
      if (this.surveyId() === surveyId)
        this.submitError.set('Your answers could not be saved. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }
}
