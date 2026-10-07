import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const config = await readFile(new URL('../src/environments/environment.ts', import.meta.url), 'utf8');
const url = config.match(/supabaseUrl:\s*'([^']+)'/)[1];
const key = config.match(/supabasePublishableKey:\s*'([^']+)'/)[1];
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const observer = createClient(url, key, options);
const voter = createClient(url, key, options);
const title = `Realtime verification ${new Date().toISOString()}`;
const { data: survey, error } = await voter.from('surveys').insert({
  title, description: 'Temporary automated two-client verification.', category: 'Other',
  questions: [{ title: 'Verify live delivery?', multiple: false, answers: ['Yes', 'No'] }],
}).select('id').single();
if (error) throw error;
console.log(JSON.stringify({ testSurveyId: survey.id, title }));
const channel = observer.channel(`verification:${survey.id}`);
let resolveChange;
const changed = new Promise((resolve) => { resolveChange = resolve; });
const timeout = setTimeout(() => { console.error('Realtime verification timed out'); process.exit(1); }, 30000);
try {
  await new Promise((resolve, reject) => {
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'survey_responses', filter: `survey_id=eq.${survey.id}`,
    }, resolveChange).subscribe((status) => {
      if (status === 'SUBSCRIBED') resolve();
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error(status));
    });
  });
  const { error: insertError } = await voter.from('survey_responses').insert({ survey_id: survey.id, choices: [[0]] });
  if (insertError) throw insertError;
  const event = await changed;
  const { data, error: readError } = await observer.from('survey_responses').select('choices').eq('survey_id', survey.id);
  if (readError) throw readError;
  if (event.new.survey_id !== survey.id || data.length !== 1 || data[0].choices[0][0] !== 0) {
    throw new Error('Unexpected saved result');
  }
  console.log('PASS: independent observer received the vote and read exactly one saved response.');
} finally {
  clearTimeout(timeout);
  await observer.removeChannel(channel);
  await voter.removeAllChannels();
  observer.realtime.disconnect();
  voter.realtime.disconnect();
}
