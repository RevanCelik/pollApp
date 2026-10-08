import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel, RealtimePostgresChangesFilter } from '@supabase/supabase-js';

import { SupabaseService } from './supabase.service';
import { SurveyStore } from './survey-store';

@Injectable({ providedIn: 'root' })
export class SurveyRealtime {
  private readonly client = inject(SupabaseService).client;
  private readonly store = inject(SurveyStore);
  readonly connected = signal(false);

  /**
   * Subscribes to survey votes until the returned cleanup callback is called.
   * @param surveyId - Identifier used to filter saved response events.
   * @returns Cleanup callback that removes the channel and ignores late events.
   */
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
  /** Registers vote and connection callbacks that ignore inactive subscriptions. */
  private listen(channel: RealtimeChannel, surveyId: string, active: () => boolean): void {
    channel
      .on('postgres_changes', this.responseFilter(surveyId), () => {
        if (active()) void this.store.refreshResults();
      })
      .subscribe((status) => {
        if (active()) this.handleStatus(status);
      });
  }
  /** Clears connection state and removes the realtime channel. */
  private disconnect(channel: RealtimeChannel): void {
    this.connected.set(false);
    void this.client.removeChannel(channel);
  }
  /** Builds the INSERT filter for responses belonging to the requested survey. */
  private responseFilter(surveyId: string): RealtimePostgresChangesFilter<'INSERT'> {
    return {
      event: 'INSERT',
      schema: 'public',
      table: 'survey_responses',
      filter: `survey_id=eq.${surveyId}`,
    };
  }

  /** Updates connection state and reloads results after subscribing or reconnecting. */
  private handleStatus(status: string): void {
    this.connected.set(status === 'SUBSCRIBED');
    if (status === 'SUBSCRIBED') void this.store.refreshResults();
  }
}
