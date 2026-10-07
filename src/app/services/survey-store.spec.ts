import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SupabaseService } from './supabase.service';
import { SurveyStore } from './survey-store';

describe('Supabase survey store', () => {
  const survey = {
    title: 'Team event',
    description: '',
    category: 'Team activities',
    endDate: '',
    questions: [
      { title: 'Which day?', multiple: false, answers: ['Friday', 'Saturday'], votes: [0, 0] },
    ],
  };

  function setup() {
    const query = { select: vi.fn(), order: vi.fn(), insert: vi.fn(), single: vi.fn() };
    query.select.mockReturnValue(query);
    query.insert.mockReturnValue(query);
    const from = vi.fn().mockReturnValue(query);
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { from } } }],
    });
    return { store: TestBed.inject(SurveyStore), query, from };
  }

  it('stores questions and answers in the same insert, without result counts', async () => {
    const { store, query, from } = setup();
    query.single.mockResolvedValue({ data: { id: 'remote-id' }, error: null });
    expect(await store.publish(survey)).toBe('remote-id');
    expect(from).toHaveBeenCalledWith('surveys');
    expect(query.insert).toHaveBeenCalledWith({
      title: 'Team event',
      description: '',
      category: 'Team activities',
      end_date: null,
      questions: [{ title: 'Which day?', multiple: false, answers: ['Friday', 'Saturday'] }],
    });
    expect(store.surveys()[0].id).toBe('remote-id');
  });

  it('does not publish locally when Supabase rejects the insert', async () => {
    const { store, query } = setup();
    query.single.mockResolvedValue({ data: null, error: { message: 'Access denied' } });
    await expect(store.publish(survey)).rejects.toEqual({ message: 'Access denied' });
    expect(store.surveys()).toEqual([]);
  });

  it('loads the remote questions after a fresh visit and shares simultaneous requests', async () => {
    const { store, query } = setup();
    query.order.mockResolvedValue({
      data: [{ ...survey, id: 'remote-id', end_date: null }],
      error: null,
    });
    await Promise.all([store.load(), store.load()]);
    expect(query.order).toHaveBeenCalledTimes(1);
    expect(store.surveys()[0].questions[0].title).toBe('Which day?');
    expect(store.surveys()[0].endDate).toBe('');
    expect(store.loading()).toBe(false);
  });

  it('shows a load failure and allows retry', async () => {
    const { store, query } = setup();
    query.order
      .mockResolvedValueOnce({ data: null, error: { message: 'Offline' } })
      .mockResolvedValueOnce({ data: [], error: null });
    await store.load();
    expect(store.error()).toContain('could not be loaded');
    await store.load();
    expect(store.error()).toBe('');
  });

  it('loads saved results on a fresh visit, including multiple answers', async () => {
    const { store, query } = setup();
    query.order.mockResolvedValue({
      data: [
        {
          ...survey,
          id: 'remote-id',
          end_date: null,
          survey_responses: [{ choices: [[0]] }, { choices: [[1]] }, { choices: [[0, 1]] }],
        },
      ],
      error: null,
    });
    await store.load();
    expect(store.surveys()[0].questions[0].votes).toEqual([2, 2]);
  });

  it('saves a submission before updating counts and preserves results after reload', async () => {
    const { store, query, from } = setup();
    store.surveys.set([{ ...survey, id: 'remote-id' }]);
    query.insert.mockResolvedValue({ error: null });
    query.order.mockResolvedValue({
      data: [
        { ...survey, id: 'remote-id', end_date: null, survey_responses: [{ choices: [[1]] }] },
      ],
      error: null,
    });
    await store.submit('remote-id', [[1]]);
    expect(from).toHaveBeenCalledWith('survey_responses');
    expect(query.insert).toHaveBeenCalledWith({ survey_id: 'remote-id', choices: [[1]] });
    expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
    await store.refreshResults();
    expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
    query.order.mockResolvedValue({
      data: [
        { ...survey, id: 'remote-id', end_date: null, survey_responses: [{ choices: [[1]] }] },
      ],
      error: null,
    });
    await store.load();
    expect(store.surveys()[0].questions[0].votes).toEqual([0, 1]);
  });

  it('does not count rejected submissions', async () => {
    const { store, query } = setup();
    store.surveys.set([{ ...survey, id: 'remote-id' }]);
    query.insert.mockResolvedValue({ error: { message: 'Offline' } });
    await expect(store.submit('remote-id', [[0]])).rejects.toEqual({ message: 'Offline' });
    expect(store.surveys()[0].questions[0].votes).toEqual([0, 0]);
  });
});
