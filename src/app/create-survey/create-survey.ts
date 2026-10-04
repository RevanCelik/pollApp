import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SurveyQuestion, SurveyStore } from '../services/survey-store';

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

  private emptyQuestion(): SurveyQuestion {
    return { title: '', multiple: false, answers: ['', ''], votes: [] };
  }
  protected addAnswer(question: SurveyQuestion): void {
    if (question.answers.length < 6) question.answers.push('');
  }
  protected addQuestion(): void { this.questions.push(this.emptyQuestion()); }
  protected deleteQuestion(index: number): void {
    if (index === 0) this.questions[0] = this.emptyQuestion();
    else this.questions.splice(index, 1);
  }
  protected deleteAnswer(question: SurveyQuestion, index: number): void {
    if (question.answers.length > 2) question.answers.splice(index, 1);
    else question.answers[index] = '';
  }
  protected letter(index: number): string {
    let label = '';
    do { label = String.fromCharCode(65 + index % 26) + label; index = Math.floor(index / 26) - 1; } while (index >= 0);
    return label;
  }
  protected async publish(): Promise<void> {
    if (this.publishedId || this.saving) return;
    if (!this.title.trim() || !this.category || this.questions.some(q => !q.title.trim() || q.answers.some(a => !a.trim()))) {
      this.error = 'Please enter a survey name, choose a category and fill in every question and answer.';
      return;
    }
    if (this.endDate && this.endDate < this.today) {
      this.error = 'Please choose an end date today or later.';
      return;
    }
    this.saving = true;
    try {
      this.publishedId = await this.store.publish({
        title: this.title.trim(), description: this.description.trim(), category: this.category,
        endDate: this.endDate,
        questions: this.questions.map(q => ({ ...q, title: q.title.trim(), answers: q.answers.map(a => a.trim()), votes: q.answers.map(() => 0) })),
      });
      this.error = '';
      this.confirmation()?.nativeElement.showModal();
    } catch { this.error = 'Your survey could not be saved in Supabase. Please try again.'; }
    finally { this.saving = false; }
  }
  protected viewSurvey(): void {
    void this.router.navigate(['/surveys', this.publishedId]);
  }
}
