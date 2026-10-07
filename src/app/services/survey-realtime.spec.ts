import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from './supabase.service';
import { SurveyStore } from './survey-store';
import { SurveyRealtime } from './survey-realtime';

describe('Survey realtime', () => {
  function setup() {
    const channel = { on: vi.fn(), subscribe: vi.fn() };
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
    const client = { channel: vi.fn(() => channel), removeChannel: vi.fn() };
    const store = { refreshResults: vi.fn().mockResolvedValue(undefined) };
    TestBed.configureTestingModule({ providers: [
      { provide: SupabaseService, useValue: { client } },
      { provide: SurveyStore, useValue: store },
    ] });
    const realtime = TestBed.inject(SurveyRealtime);
    const stop = realtime.watch('survey-id');
    return { realtime, channel, client, store, stop };
  }

  it('filters responses by survey and refreshes on votes and reconnection', () => {
    const { realtime, channel, store } = setup();
    expect(channel.on.mock.calls[0][1]).toEqual({
      event: 'INSERT', schema: 'public', table: 'survey_responses', filter: 'survey_id=eq.survey-id',
    });
    const status = channel.subscribe.mock.calls[0][0];
    expect(realtime.connected()).toBe(false);
    status('SUBSCRIBED');
    expect(realtime.connected()).toBe(true);
    channel.on.mock.calls[0][2]();
    status('CHANNEL_ERROR');
    expect(realtime.connected()).toBe(false);
    status('SUBSCRIBED');
    expect(store.refreshResults).toHaveBeenCalledTimes(3);
  });

  it('removes the channel and ignores late callbacks after leaving', () => {
    const { realtime, channel, client, store, stop } = setup();
    channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
    stop();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
    channel.on.mock.calls[0][2]();
    expect(realtime.connected()).toBe(false);
    expect(store.refreshResults).toHaveBeenCalledTimes(1);
  });
});
