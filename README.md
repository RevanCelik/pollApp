# PollApp

## Live results

Survey detail subscribes to INSERT events for its survey in `survey_responses`.
Saved results are refreshed on new votes and every successful connection, including
reconnections. Leaving the detail page removes the channel. The LIVE badge reflects
the actual subscription state and is hidden for expired surveys.

The remote migration `enable_survey_response_realtime` (20261007044622) enables
the table in `supabase_realtime`; `supabase/realtime.sql` contains an idempotent
setup statement for other installations. Existing read policies remain in place.
On 2026-10-07, two independent clients and two browser tabs verified live delivery
without reloading, and their temporary surveys/responses were removed afterward.

`node scripts/verify-survey-realtime.mjs` repeats the two-client network check.
It creates a temporary survey and response and prints their survey ID; remove
that survey afterward through an administrative connection (responses cascade).

## Supabase setup

The project URL and public publishable key are configured in
`src/environments/environment.ts`. No secret/service-role key belongs in the frontend.

Before using the app, apply `supabase/migrations/202610030001_create_surveys.sql`
to that Supabase project through its SQL Editor, or through a connected Supabase
integration. This creates the `surveys` table, nested question validation and
row-level security policies. The migration was applied to the Poll App project (`mwccjmhrfkgxitdjglie`) on 2026-10-03. Anonymous-role insert/read and validation checks passed in a rolled-back transaction; the public REST API returns HTTP 200.

Each survey stores its question texts, multiple-choice setting and answer options
in the `questions` JSONB column. A single insert saves the complete survey
atomically. Home and detail screens read from Supabase, including on a fresh visit.
The confirmation dialog appears only after a successful insert; failed requests
keep the form available for retry.

The current app has no login. Published surveys are publicly readable and anyone
can create a survey. The public API cannot update or delete surveys. There is no
owner-specific filtering yet. Participant submissions are saved in Supabase by
`supabase/migrations/20261005042218_persist_survey_responses.sql` (applied to the
Poll App project on 2026-10-05). Results are counted from saved submissions on
every visit. Each submission is inserted atomically, validated against the survey,
and cannot be changed or deleted through the public API. Previous
localStorage surveys are not automatically imported.

After applying the migration, verify the live integration by publishing a survey
with two questions, opening its detail URL in a fresh browser session and checking
that its title, questions and answer options load. Automated tests mock Supabase
and cover insert payloads, read mapping, rejected requests and retry behavior.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
