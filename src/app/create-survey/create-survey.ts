import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CreatedSurvey, SurveyQuestion, SurveyStore } from '../services/survey-store';
import {
  ALPHABET_LENGTH,
  FIRST_ANSWER_LETTER_CODE,
  MAX_ANSWERS,
  MIN_ANSWERS,
} from '../survey.constants';

@Component({
  selector: 'app-create-survey',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
  host: {
    '(document:click)': 'closeCategoryOutside($event)',
    '(document:keydown.escape)': 'closeCategory()',
  },
})
export class CreateSurvey {
  private readonly store = inject(SurveyStore);
  private readonly router = inject(Router);
  private readonly confirmation = viewChild<ElementRef<HTMLDialogElement>>('confirmation');
  protected title: string = '';
  protected description: string = '';
  protected endDate: string = '';
  protected category: string = '';
  protected readonly categories = ['Team activities', 'Gaming', 'Healthy Lifestyle', 'Other'];
  private readonly categoryDropdown = viewChild<ElementRef<HTMLDetailsElement>>('categoryDropdown');

  /** Selects the draft category and returns focus to the dropdown trigger. */
  protected selectCategory(category: string): void {
    this.category = category;
    this.closeCategory();
  }

  protected closeCategory(): void {
    const dropdown = this.categoryDropdown()?.nativeElement;
    if (!dropdown?.open) return;
    dropdown.open = false;
    dropdown.querySelector('summary')?.focus();
  }

  protected closeCategoryOutside(event: Event): void {
    const dropdown = this.categoryDropdown()?.nativeElement;
    if (dropdown && event.target instanceof Node && !dropdown.contains(event.target)) {
      dropdown.open = false;
    }
  }
  protected questions: SurveyQuestion[] = [this.emptyQuestion()];
  protected error: string = '';
  protected validationAttempted = false;

  protected isRequiredMissing(value: string): boolean {
    return this.validationAttempted && !value.trim();
  }

  protected get invalidEndDate(): boolean {
    return this.validationAttempted && !!this.endDate && this.endDate < this.today;
  }

  protected get formMessage(): string {
    return (this.validationAttempted ? this.validationError() : '') || this.error;
  }
  protected publishedId: string = '';
  protected saving: boolean = false;
  protected readonly today = new Date().toLocaleDateString('en-CA');
  protected readonly maxAnswers: number = MAX_ANSWERS;

  /** Creates a blank question with the minimum number of answer fields. */
  private emptyQuestion(): SurveyQuestion {
    return {
      title: '',
      multiple: false,
      answers: Array.from({ length: MIN_ANSWERS }, () => ''),
      votes: [],
    };
  }
  /** Adds an answer while the question remains below its answer limit. */
  protected addAnswer(question: SurveyQuestion): void {
    if (question.answers.length < MAX_ANSWERS) question.answers.push('');
  }
  /** Appends a blank question to the survey draft. */
  protected addQuestion(): void {
    this.questions.push(this.emptyQuestion());
  }
  /** Removes a question, or clears it when only one question remains. */
  protected deleteQuestion(index: number): void {
    if (this.questions.length === 1) Object.assign(this.questions[0], this.emptyQuestion());
    else this.questions.splice(index, 1);
  }
  /** Removes an answer or clears it to preserve the minimum answer count. */
  protected deleteAnswer(question: SurveyQuestion, index: number): void {
    if (question.answers.length > MIN_ANSWERS) question.answers.splice(index, 1);
    else question.answers[index] = '';
  }
  /** Converts a zero-based answer index into an alphabetic label. */
  protected letter(index: number): string {
    let label = '';
    do {
      label = String.fromCharCode(FIRST_ANSWER_LETTER_CODE + (index % ALPHABET_LENGTH)) + label;
      index = Math.floor(index / ALPHABET_LENGTH) - 1;
    } while (index >= 0);
    return label;
  }
  /** Validates and publishes the draft, exposing saving and failure state to the form. */
  protected async publish(): Promise<void> {
    if (this.publishedId || this.saving) return;
    this.validationAttempted = true;
    this.error = '';
    if (this.validationError()) return;
    this.saving = true;
    try {
      await this.saveSurvey();
    } catch {
      this.error = 'Your survey could not be saved in Supabase. Please try again.';
    } finally {
      this.saving = false;
    }
  }
  /** Returns the first draft validation message, or an empty string when valid. */
  private validationError(): string {
    if (this.hasMissingFields()) {
      return 'Please complete the highlighted required fields.';
    }
    if (this.endDate && this.endDate < this.today) {
      return 'Please choose an end date today or later.';
    }
    return '';
  }
  /** Checks whether the draft contains an empty required field. */
  private hasMissingFields(): boolean {
    return (
      !this.title.trim() ||
      !this.category ||
      this.questions.some(
        (question) => !question.title.trim() || question.answers.some((answer) => !answer.trim()),
      )
    );
  }
  /** Persists the prepared draft and opens the publication confirmation. */
  private async saveSurvey(): Promise<void> {
    this.publishedId = await this.store.publish(this.surveyPayload());
    this.confirmation()?.nativeElement.showModal();
  }
  /** Builds a survey payload with trimmed text and prepared questions. */
  private surveyPayload(): Omit<CreatedSurvey, 'id'> {
    return {
      title: this.title.trim(),
      description: this.description.trim(),
      category: this.category,
      endDate: this.endDate,
      questions: this.questions.map((question) => this.prepareQuestion(question)),
    };
  }
  /** Trims question text and initializes zero vote counts for its answers. */
  private prepareQuestion(question: SurveyQuestion): SurveyQuestion {
    return {
      ...question,
      title: question.title.trim(),
      answers: question.answers.map((answer) => answer.trim()),
      votes: question.answers.map(() => 0),
    };
  }
  /** Navigates to the survey published from the current draft. */
  protected viewSurvey(): void {
    void this.router.navigate(['/surveys', this.publishedId]);
  }
}
