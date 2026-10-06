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
  imports: [FormsModule, RouterLink],
  templateUrl: './create-survey.html',
  styleUrl: './create-survey.scss',
})
export class CreateSurvey {
  private readonly store = inject(SurveyStore);
  private readonly router = inject(Router);
  private readonly confirmation = viewChild<ElementRef<HTMLDialogElement>>('confirmation');
  protected title = '';
  protected description = '';
  protected endDate = '';
  protected category = '';
  protected questions: SurveyQuestion[] = [this.emptyQuestion()];
  protected error = '';
  protected publishedId = '';
  protected saving = false;
  protected readonly today = new Date().toLocaleDateString('en-CA');
  protected readonly maxAnswers: number = MAX_ANSWERS;

  private emptyQuestion(): SurveyQuestion {
    return {
      title: '',
      multiple: false,
      answers: Array.from({ length: MIN_ANSWERS }, () => ''),
      votes: [],
    };
  }
  protected addAnswer(question: SurveyQuestion): void {
    if (question.answers.length < MAX_ANSWERS) question.answers.push('');
  }
  protected addQuestion(): void {
    this.questions.push(this.emptyQuestion());
  }
  protected deleteQuestion(index: number): void {
    if (index === 0) this.questions[0] = this.emptyQuestion();
    else this.questions.splice(index, 1);
  }
  protected deleteAnswer(question: SurveyQuestion, index: number): void {
    if (question.answers.length > MIN_ANSWERS) question.answers.splice(index, 1);
    else question.answers[index] = '';
  }
  protected letter(index: number): string {
    let label = '';
    do {
      label = String.fromCharCode(FIRST_ANSWER_LETTER_CODE + (index % ALPHABET_LENGTH)) + label;
      index = Math.floor(index / ALPHABET_LENGTH) - 1;
    } while (index >= 0);
    return label;
  }
  protected async publish(): Promise<void> {
    if (this.publishedId || this.saving) return;
    this.error = this.validationError();
    if (this.error) return;
    this.saving = true;
    try {
      await this.saveSurvey();
    } catch {
      this.error = 'Your survey could not be saved in Supabase. Please try again.';
    } finally {
      this.saving = false;
    }
  }
  private validationError(): string {
    if (this.hasMissingFields()) {
      return 'Please enter a survey name, choose a category and fill in every question and answer.';
    }
    if (this.endDate && this.endDate < this.today) {
      return 'Please choose an end date today or later.';
    }
    return '';
  }
  private hasMissingFields(): boolean {
    return (
      !this.title.trim() ||
      !this.category ||
      this.questions.some(
        (question) => !question.title.trim() || question.answers.some((answer) => !answer.trim()),
      )
    );
  }
  private async saveSurvey(): Promise<void> {
    this.publishedId = await this.store.publish(this.surveyPayload());
    this.confirmation()?.nativeElement.showModal();
  }
  private surveyPayload(): Omit<CreatedSurvey, 'id'> {
    return {
      title: this.title.trim(),
      description: this.description.trim(),
      category: this.category,
      endDate: this.endDate,
      questions: this.questions.map((question) => this.prepareQuestion(question)),
    };
  }
  private prepareQuestion(question: SurveyQuestion): SurveyQuestion {
    return {
      ...question,
      title: question.title.trim(),
      answers: question.answers.map((answer) => answer.trim()),
      votes: question.answers.map(() => 0),
    };
  }
  protected viewSurvey(): void {
    void this.router.navigate(['/surveys', this.publishedId]);
  }
}
