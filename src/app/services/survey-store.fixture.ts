import { WritableSignal, signal } from '@angular/core';

import { CreatedSurvey, SurveyQuestion } from './survey-store';

interface MockSurveyStore {
  surveys: WritableSignal<CreatedSurvey[]>;
  loading: WritableSignal<boolean>;
  error: WritableSignal<string>;
  load: () => Promise<void>;
  submit: (id: string, choices: number[][]) => Promise<void>;
  publish: (survey: Omit<CreatedSurvey, 'id'>) => Promise<string>;
}

type MockSurveyActions = Pick<MockSurveyStore, 'load' | 'submit' | 'publish'>;

// Test data only; production screens load from Supabase.
const QUESTIONS: SurveyQuestion[] = [
  {
    title: 'Which date?',
    multiple: true,
    answers: ['Friday', 'Saturday', 'Sunday', 'Monday'],
    votes: [0, 0, 0, 0],
  },
  {
    title: 'Which activity?',
    multiple: true,
    answers: ['Bowling', 'Beach', 'Kayaking', 'Party', 'Escape room'],
    votes: [0, 0, 0, 0, 0],
  },
  {
    title: 'What matters?',
    multiple: true,
    answers: ['Food', 'Bonding', 'Fun', 'Rest'],
    votes: [0, 0, 0, 0],
  },
  {
    title: 'How long?',
    multiple: false,
    answers: ['Half day', 'Full day', 'Evening'],
    votes: [0, 0, 0],
  },
];

/** Creates a sample survey with deterministic identifiers and question data. */
function createSurvey(index: number): CreatedSurvey {
  return {
    id: String(index + 1),
    title: 'Survey ' + (index + 1),
    description: 'Description',
    category: index === 0 ? 'Team activities' : 'Gaming',
    endDate: '2099-01-01',
    questions: QUESTIONS,
  };
}

/** Returns a survey whose counts include the selections from one submission. */
function addVotes(survey: CreatedSurvey, choices: number[][]): CreatedSurvey {
  return {
    ...survey,
    questions: survey.questions.map((question, index) => ({
      ...question,
      votes: question.votes.map(
        (count, answer) => count + (choices[index].includes(answer) ? 1 : 0),
      ),
    })),
  };
}

/** Creates an isolated in-memory survey store for component tests. */
export function mockSurveyStore(): MockSurveyStore {
  const surveys = signal<CreatedSurvey[]>(
    Array.from({ length: 6 }, (_, index) => createSurvey(index)),
  );
  return {
    surveys,
    loading: signal(false),
    error: signal(''),
    ...mockActions(surveys),
  };
}

/** Builds the asynchronous actions supported by the test store. */
function mockActions(surveys: WritableSignal<CreatedSurvey[]>): MockSurveyActions {
  return {
    load: async () => {},
    submit: async (id: string, choices: number[][]) => applyVotes(surveys, id, choices),
    publish: async (survey: Omit<CreatedSurvey, 'id'>) => publishSurvey(surveys, survey),
  };
}

/** Updates the matching test survey with the submitted selections. */
function applyVotes(
  surveys: WritableSignal<CreatedSurvey[]>,
  id: string,
  choices: number[][],
): void {
  surveys.update((items) =>
    items.map((survey) => (survey.id === id ? addVotes(survey, choices) : survey)),
  );
}

/** Prepends a survey to the test store and returns its published identifier. */
function publishSurvey(
  surveys: WritableSignal<CreatedSurvey[]>,
  survey: Omit<CreatedSurvey, 'id'>,
): string {
  surveys.update((items) => [{ ...survey, id: 'published-id' }, ...items]);
  return 'published-id';
}
