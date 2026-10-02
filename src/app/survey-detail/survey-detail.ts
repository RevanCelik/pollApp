import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Question {
  title: string;
  multiple: boolean;
  answers: string[];
  votes: number[];
}

// Counts are demo data, not live database results.
const QUESTIONS: Question[] = [
  {
    title: 'Which date would work best for you?',
    multiple: true,
    answers: [
      '19.09.2025, Friday',
      '10.10.2025, Friday',
      '11.10.2025, Saturday',
      '31.10.2025, Friday',
    ],
    votes: [27, 44, 3, 26],
  },
  {
    title: 'Choose the activities you prefer',
    multiple: true,
    answers: [
      'Outdoor adventure like kayaking',
      'Office Costume Party',
      'Bowling, mini-golf, volleyball',
      'Beach party, Music & cocktails',
      'Escape room',
    ],
    votes: [60, 0, 14, 26, 0],
  },
  {
    title: 'What’s most important to you in a team event?',
    multiple: true,
    answers: [
      'Team bonding',
      'Food and drinks',
      'Trying something new',
      'Keeping it low-key and stress-free',
    ],
    votes: [44, 3, 26, 27],
  },
  {
    title: 'How long would you prefer the event to last?',
    multiple: false,
    answers: ['Half a day', 'Full day', 'Evening only'],
    votes: [14, 86, 0],
  },
];

@Component({
  selector: 'app-survey-detail',
  imports: [RouterLink],
  templateUrl: './survey-detail.html',
  styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  protected readonly surveyId = computed(() => this.params().get('id'));
  protected readonly found = computed(() => ['1', '6'].includes(this.surveyId() ?? ''));
  protected readonly questions = QUESTIONS;
  protected readonly choices = signal<number[][]>(QUESTIONS.map(() => []));
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
    effect(() => {
      const seeded = this.surveyId() === '1';
      this.counts.set(
        QUESTIONS.map((question) => question.votes.map((count) => (seeded ? count : 0))),
      );
      this.choices.set(QUESTIONS.map(() => []));
      this.submitted.set(false);
      this.showValidation.set(false);
    });
  }

  protected letter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  protected choose(questionIndex: number, answerIndex: number): void {
    if (this.submitted()) return;
    this.choices.update((rows) =>
      rows.map((row, index) => {
        if (index !== questionIndex) return row;
        if (!QUESTIONS[index].multiple) return [answerIndex];
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
