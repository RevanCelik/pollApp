import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesFilter } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { SurveyStore } from './survey-store';

@Injectable({ providedIn: 'root' })
export class SurveyRealtime {
  private readonly client = inject(SupabaseService).client;
  private readonly store = inject(SurveyStore);
  readonly connected = signal(false);

  watch(surveyId: string): () => void {
    let active = true;
    this.connected.set(false);
    const channel = this.client.channel(`survey-results:${surveyId}`);
    this.listen(channel, surveyId, () => active);
    return () => {
      active = false;
      this.disconnect(channel);
    };
  }
  private listen(channel: RealtimeChannel, surveyId: string, active: () => boolean): void {
    channel
      .on('postgres_changes', this.responseFilter(surveyId), () => {
        if (active()) void this.store.refreshResults();
      })
      .subscribe((status) => {
        if (active()) this.handleStatus(status);
      });
  }
  private disconnect(channel: RealtimeChannel): void {
    this.connected.set(false);
    void this.client.removeChannel(channel);
  }
  private responseFilter(surveyId: string): RealtimePostgresChangesFilter<'INSERT'> {
    return {
      event: 'INSERT',
      schema: 'public',
      table: 'survey_responses',
      filter: `survey_id=eq.${surveyId}`,
    };
  }

  private handleStatus(status: string): void {
    this.connected.set(status === 'SUBSCRIBED');
    if (status === 'SUBSCRIBED') void this.store.refreshResults();
  }
}
