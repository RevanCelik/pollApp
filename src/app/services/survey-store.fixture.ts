import { signal } from '@angular/core';
import { CreatedSurvey } from './survey-store';

// Test data only; production screens load from Supabase.
export function mockSurveyStore() {
  const questions = [
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
  const surveys = signal<CreatedSurvey[]>(
    Array.from({ length: 6 }, (_, index) => ({
      id: String(index + 1),
      title: 'Survey ' + (index + 1),
      description: 'Description',
      category: index === 0 ? 'Team activities' : 'Gaming',
      endDate: '2099-01-01',
      questions,
    })),
  );
  return {
    surveys,
    loading: signal(false),
    error: signal(''),
    load: async () => {},
    submit: async (id: string, choices: number[][]) => {
      surveys.update((items) =>
        items.map((survey) =>
          survey.id !== id
            ? survey
            : {
                ...survey,
                questions: survey.questions.map((question, index) => ({
                  ...question,
                  votes: question.votes.map(
                    (count, answer) => count + (choices[index].includes(answer) ? 1 : 0),
                  ),
                })),
              },
        ),
      );
    },
    publish: async (survey: Omit<CreatedSurvey, 'id'>) => {
      surveys.update((items) => [{ ...survey, id: 'published-id' }, ...items]);
      return 'published-id';
    },
  };
}
