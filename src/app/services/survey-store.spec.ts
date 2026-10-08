import { TestBed } from '@angular/core/testing';
import { Mock, vi } from 'vitest';

import { SupabaseService } from './supabase.service';
import { CreatedSurvey, SurveyStore } from './survey-store';

interface StoreTestContext {
  store: SurveyStore;
  query: { select: Mock; order: Mock; insert: Mock; single: Mock };
  from: Mock;
}

type SavedSurvey = CreatedSurvey & {
  end_date: null;
  survey_responses: { choices: number[][] }[];
};

/** Builds stored survey data containing the requested saved selections. */
function savedSurvey(choices: number[][][] = []): SavedSurvey {
  return {
    ...SURVEY,
    id: 'remote-id',
    end_date: null,
    survey_responses: choices.map((selection) => ({ choices: selection })),
  };
}

const SURVEY: Omit<CreatedSurvey, 'id'> = {
  title: 'Team event',
  description: '',
  category: 'Team activities',
  endDate: '',
  questions: [
    { title: 'Which day?', multiple: false, answers: ['Friday', 'Saturday'], votes: [0, 0] },
  ],
};

/** Creates an isolated survey store backed by a mock database query builder. */
function setup(): StoreTestContext {
  const query = { select: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn() };
  query.select.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  TestBed.configureTestingModule({
    providers: [{ provide: SupabaseService, useValue: { client: { from } } }],
  });
  return { store: TestBed.inject(SurveyStore), query, from };
}

/** Verifies that publication persists questions without derived result counts. */
async function testPublishesSurveyWithoutVotes(): Promise<void> {
  const { store, query, from } = setup();
  query.single.mockResolvedValue({ data: { id: 'remote-id' }, error: null });
  expect(await store.publish(SURVEY)).toBe('remote-id');
  expect(from).toHaveBeenCalledWith('surveys');
  expect(query.insert).toHaveBeenCalledWith({
    title: 'Team event',
    description: '',
    category: 'Team activities',
    end_date: null,
    questions: [{ title: 'Which day?', multiple: false, answers: ['Friday', 'Saturday'] }],
  });
  expect(store.surveys()[0].id).toBe('remote-id');
}

/** Verifies that a failed insert does not publish a survey locally. */
async function testRejectsFailedPublication(): Promise<void> {
  const { store, query } = setup();
  query.single.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
  await expect(store.publish(SURVEY)).rejects.toEqual({ message: 'Access denied' });
  expect(store.surveys()).toEqual([]);
}

/** Verifies that concurrent loads share a request and map saved survey data. */
async function testSharesConcurrentLoadRequests(): Promise<void> {
  const { store, query } = setup();
  query.order.mockResolvedValue({
    data: [{ ...SURVEY, id: 'remote-id', end_date: null }],
    error: null,
  });
  await Promise.all([store.load(), store.load()]);
  expect(query.order).toHaveBeenCalledTimes(1);
  expect(store.surveys()[0].questions[0].title).toBe('Which day?');
  expect(store.surveys()[0].endDate).toBe('');
  expect(store.loading()).toBe(false);
}

/** Verifies that retrying a failed load clears its error after success. */
async function testRetriesFailedLoad(): Promise<void> {
  const { store, query } = setup();
  query.order
    .mockResolvedValueOnce({ data: null, error: { message: 'Offline' } })
    .mockResolvedValueOnce({ data: [], error: null });
  await store.load();
  expect(store.error()).toContain('could not be loaded');
  await store.load();
  expect(store.error()).toBe('');
}

/** Verifies counts derived from saved single and multiple answer selections. */
async function testLoadsPersistedVotes(): Promise<void> {
  const { store, query } = setup();
  query.order.mockResolvedValue({
    data: [savedSurvey([[[0]], [[1]], [[0, 1]]])],
    error: null,
  });
  await store.load();
  expect(store.surveys()[0].questions[0].votes).toEqual([2, 2]);
}

/** Verifies that persisted responses determine counts and survive reloading. */
async function testPersistsSubmissionBeforeCounting(): Promise<void> {
  const { store, query, from } = setup();
  store.surveys.set([{ ...SURVEY, id: 'remote-id' }]);
  query.insert.mockResolvedValue({ error: null });
  query.order.mockResolvedValue({
    data: [savedSurvey([[[1]]])],
    error: null,
  });
  await store.submit('remote-id', [[1]]);
  expect(from).toHaveBeenCalledWith('survey_responses');
  expect(query.insert).toHaveBeenCalledWith({ survey_id: 'remote-id', choices: [[1]] });
  await verifyPersistedVote(store);
}

/** Verifies that rejected responses do not change result counts. */
async function testDoesNotCountRejectedSubmissions(): Promise<void> {
  const { store, query } = setup();
  store.surveys.set([{ ...SURVEY, id: 'remote-id' }]);
  query.insert.mockResolvedValue({ error: { message: 'Offline' } });
  await expect(store.submit('remote-id', [[0]])).rejects.toEqual({ message: 'Offline' });
  expect(store.surveys()[0].questions[0].votes).toEqual([0, 0]);
}

const SURVEY_STORE_TESTS: Array<[string, () => void | Promise<void>]> = [
  [
    'stores questions and answers in the same insert, without result counts',
    testPublishesSurveyWithoutVotes,
  ],
  ['does not publish locally when Supabase rejects the insert', testRejectsFailedPublication],
  [
    'loads the remote questions after a fresh visit and shares simultaneous requests',
    testSharesConcurrentLoadRequests,
  ],
  ['shows a load failure and allows retry', testRetriesFailedLoad],
  ['loads saved results on a fresh visit, including multiple answers', testLoadsPersistedVotes],
  [
    'saves a submission before updating counts and preserves results after reload',
    testPersistsSubmissionBeforeCounting,
  ],
  ['does not count rejected submissions', testDoesNotCountRejectedSubmissions],
];

describe('Supabase survey store', () => {
  for (const [title, test] of SURVEY_STORE_TESTS) it(title, test);
});

/** Verifies that refreshing and reloading preserve saved vote counts. */
async function verifyPersistedVote(store: SurveyStore): Promise<void> {
  expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
  await store.refreshResults();
  expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
  await store.load();
  expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
}
