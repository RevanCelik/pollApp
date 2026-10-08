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
type StoredQuestion = Omit<SurveyQuestion, 'votes'>;
interface SurveyResponse {
  choices: number[][];
}
interface StoredSurvey {
  id: string;
  title: string;
  description: string;
  category: string;
  end_date: string | null;
  questions: StoredQuestion[];
  survey_responses?: SurveyResponse[];
}
type SurveyInsert = Omit<StoredSurvey, 'id' | 'survey_responses'>;

@Injectable({ providedIn: 'root' })
export class SurveyStore {
  private readonly client = inject(SupabaseService).client;
  readonly surveys = signal<CreatedSurvey[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private pendingLoad?: Promise<void>;
  private pendingRefresh?: Promise<void>;
  private refreshRequested: boolean = false;

  /** Loads surveys while sharing an existing request between concurrent callers. */
  load(): Promise<void> {
    if (this.pendingLoad) return this.pendingLoad;
    this.pendingLoad = this.fetchSurveys().finally(() => {
      this.pendingLoad = undefined;
    });
    return this.pendingLoad;
  }

  /** Loads survey data and exposes loading or failure state to the view. */
  private async fetchSurveys(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const rows = await this.requestSurveys();
      this.surveys.set(rows.map((row) => this.mapSurvey(row)));
    } catch {
      this.error.set('Surveys could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
  /**
   * Requests surveys and saved responses, ordered from newest to oldest.
   * @returns Stored surveys, or an empty array when the database returns no data.
   * @throws The database error when the request fails.
   */
  private async requestSurveys(): Promise<StoredSurvey[]> {
    const { data, error } = await this.client
      .from('surveys')
      .select('id,title,description,category,end_date,questions,survey_responses(choices)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
  /** Converts stored survey data into the view model with derived vote counts. */
  private mapSurvey(row: StoredSurvey): CreatedSurvey {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      endDate: row.end_date ?? '',
      questions: row.questions.map((question, index) =>
        this.countVotes(question, index, row.survey_responses ?? []),
      ),
    };
  }
  /** Counts saved selections for each answer in the requested question. */
  private countVotes(
    question: StoredQuestion,
    index: number,
    responses: SurveyResponse[],
  ): SurveyQuestion {
    return {
      ...question,
      votes: question.answers.map(
        (_, answerIndex) =>
          responses.filter((response) => response.choices[index]?.includes(answerIndex)).length,
      ),
    };
  }

  /**
   * Saves a response before refreshing authoritative result counts from the database.
   * @param surveyId - Identifier of the survey receiving the response.
   * @param choices - Zero-based answer indices grouped in question order.
   * @throws The database error when saving the response fails.
   */
  async submit(surveyId: string, choices: number[][]): Promise<void> {
    const { error } = await this.client
      .from('survey_responses')
      .insert({ survey_id: surveyId, choices });
    if (error) throw error;
    await this.refreshResults();
  }
  /** Queues a result refresh and shares any refresh already in progress. */
  refreshResults(): Promise<void> {
    this.refreshRequested = true;
    if (this.pendingRefresh) return this.pendingRefresh;
    this.pendingRefresh = this.drainRefreshes().finally(() => {
      this.pendingRefresh = undefined;
    });
    return this.pendingRefresh;
  }
  /** Waits for initial loading and processes refreshes queued during active requests. */
  private async drainRefreshes(): Promise<void> {
    await this.pendingLoad;
    while (this.refreshRequested) {
      this.refreshRequested = false;
      await this.refreshSavedResults();
    }
  }
  /** Reloads saved results and reports failures through the error signal. */
  private async refreshSavedResults(): Promise<void> {
    try {
      const rows = await this.requestSurveys();
      this.surveys.set(rows.map((row) => this.mapSurvey(row)));
      this.error.set('');
    } catch {
      this.error.set('Results could not be refreshed. Please try again.');
    }
  }

  /**
   * Inserts a survey with its questions and updates local state after successful saving.
   * @param survey - Prepared survey data without its generated identifier.
   * @returns Identifier of the persisted survey.
   * @throws The database error, or an error when the insert returns no survey.
   */
  async publish(survey: Omit<CreatedSurvey, 'id'>): Promise<string> {
    // One insert saves the survey and all its questions together.
    const { data, error } = await this.client
      .from('surveys')
      .insert(this.insertPayload(survey))
      .select('id')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Supabase did not return the published survey.');
    this.surveys.update((surveys) => [{ ...survey, id: data.id }, ...surveys]);
    return data.id;
  }
  /** Builds a database insert payload without identifiers or derived vote counts. */
  private insertPayload(survey: Omit<CreatedSurvey, 'id'>): SurveyInsert {
    return {
      title: survey.title,
      description: survey.description,
      category: survey.category,
      end_date: survey.endDate || null,
      questions: survey.questions.map(({ title, multiple, answers }) => ({
        title,
        multiple,
        answers,
      })),
    };
  }
}
