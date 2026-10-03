import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface SurveyQuestion {
  title: string;
  multiple: boolean;
  answers: string[];
  votes: number[];
}
export interface CreatedSurvey {
  id: string;
  title: string;
  description: string;
  category: string;
  endDate: string;
  questions: SurveyQuestion[];
}

@Injectable({ providedIn: 'root' })
export class SurveyStore {
  private readonly client = inject(SupabaseService).client;
  readonly surveys = signal<CreatedSurvey[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private pendingLoad?: Promise<void>;

  load(): Promise<void> {
    if (this.pendingLoad) return this.pendingLoad;
    this.pendingLoad = this.fetchSurveys().finally(() => { this.pendingLoad = undefined; });
    return this.pendingLoad;
  }

  private async fetchSurveys(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const { data, error } = await this.client.from('surveys')
        .select('id,title,description,category,end_date,questions')
        .order('created_at', { ascending: false });
      if (error) throw error;
      this.surveys.set((data ?? []).map(row => ({
        id: row.id, title: row.title, description: row.description,
        category: row.category, endDate: row.end_date ?? '',
        questions: row.questions.map((question: Omit<SurveyQuestion, 'votes'>) => ({
          ...question, votes: question.answers.map(() => 0),
        })),
      })));
    } catch {
      this.error.set('Surveys could not be loaded. Please try again.');
    } finally { this.loading.set(false); }
  }

  async publish(survey: Omit<CreatedSurvey, 'id'>): Promise<string> {
    // One insert saves the survey and all its questions together.
    const { data, error } = await this.client.from('surveys').insert({
      title: survey.title, description: survey.description, category: survey.category,
      end_date: survey.endDate || null,
      questions: survey.questions.map(({ title, multiple, answers }) => ({ title, multiple, answers })),
    }).select('id').single();
    if (error) throw error;
    if (!data) throw new Error('Supabase did not return the published survey.');
    this.surveys.update(surveys => [{ ...survey, id: data.id }, ...surveys]);
    return data.id;
  }
}
