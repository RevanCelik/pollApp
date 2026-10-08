import { TestBed } from '@angular/core/testing';
import { Mock, vi } from 'vitest';

import { SupabaseService } from './supabase.service';
import { SurveyRealtime } from './survey-realtime';
import { SurveyStore } from './survey-store';

interface RealtimeTestContext {
  realtime: SurveyRealtime;
  channel: { on: Mock; subscribe: Mock };
  client: { channel: Mock; removeChannel: Mock };
  store: { refreshResults: Mock };
  stop: () => void;
}

const RESPONSE_FILTER = {
  event: 'INSERT',
  schema: 'public',
  table: 'survey_responses',
  filter: 'survey_id=eq.survey-id',
};

/** Registers the isolated client and store used by realtime tests. */
function provideMocks(client: unknown, store: unknown): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: SupabaseService, useValue: { client } },
      { provide: SurveyStore, useValue: store },
    ],
  });
}

/** Creates a subscribed realtime service with isolated channel and store mocks. */
function setup(): RealtimeTestContext {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  const client = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
  const store = { refreshResults: vi.fn().mockResolvedValue(undefined) };
  provideMocks(client, store);
  const realtime = TestBed.inject(SurveyRealtime);
  const stop = realtime.watch('survey-id');
  return { realtime, channel, client, store, stop };
}

/** Verifies survey filtering and result refreshes on votes and reconnection. */
function testRefreshesSurveyOnRealtimeEvents(): void {
  const { realtime, channel, store } = setup();
  expect(channel.on.mock.calls[0][1]).toEqual(RESPONSE_FILTER);
  const status = channel.subscribe.mock.calls[0][0];
  expect(realtime.connected()).toBe(false);
  status('SUBSCRIBED');
  expect(realtime.connected()).toBe(true);
  channel.on.mock.calls[0][2]();
  status('CHANNEL_ERROR');
  expect(realtime.connected()).toBe(false);
  status('SUBSCRIBED');
  expect(store.refreshResults).toHaveBeenCalledTimes(3);
}

/** Verifies that stopping realtime removes the channel and ignores late events. */
function testIgnoresCallbacksAfterCleanup(): void {
  const { realtime, channel, client, store, stop } = setup();
  channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
  stop();
  expect(client.removeChannel).toHaveBeenCalledWith(channel);
  channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
  channel.on.mock.calls[0][2]();
  expect(realtime.connected()).toBe(false);
  expect(store.refreshResults).toHaveBeenCalledTimes(1);
}

const SURVEY_REALTIME_TESTS: Array<[string, () => void | Promise<void>]> = [
  [
    'filters responses by survey and refreshes on votes and reconnection',
    testRefreshesSurveyOnRealtimeEvents,
  ],
  [
    'removes the channel and ignores late callbacks after leaving',
    testIgnoresCallbacksAfterCleanup,
  ],
];

describe('Survey realtime', () => {
  for (const [title, test] of SURVEY_REALTIME_TESTS) it(title, test);
});
