# PollApp

PollApp is a responsive web app for creating and answering surveys. Users can plan a team event, collect opinions about gaming, or ask questions about a healthy lifestyle. Results appear directly on the survey detail page.

The project was developed as part of the Developer Akademie training program. The interface is in English and supports desktop, tablet, and smartphone screens.

## Features

- **Create surveys:** Add a title, category, questions, an optional description, and an optional end date.
- **Manage answer options:** Each question supports two to six answers. Depending on the question settings, participants can select one or multiple options.
- **Browse surveys:** View surveys ending soon and filter surveys by active or past status and category.
- **Answer surveys:** Required answers are validated. After a successful submission, the current form is locked.
- **View results:** Answer percentages are calculated from saved responses.
- **Live results:** New votes from other participants automatically update the open detail page through Supabase Realtime. The LIVE indicator appears for an active survey with a connected subscription.
- **Open past surveys:** Expired surveys and their results remain readable. New responses are blocked.
- **Persist data:** Surveys and responses are stored in Supabase and loaded again on subsequent visits.

## Languages and Technologies

| Language / Technology | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| TypeScript            | Application logic, data models, and tests                        |
| HTML                  | Component templates and semantic page structure                  |
| SCSS / CSS            | Styling, responsive layouts, and control states                  |
| SQL / PL/pgSQL        | Database tables, validation, and access policies                 |
| Angular 22            | Frontend with standalone components, signals, forms, and routing |
| Supabase              | PostgreSQL database, data access, and realtime events            |
| RxJS                  | Reactive integration of route data                               |
| Vitest and jsdom      | Automated component and service tests                            |
| Prettier              | Consistent source code formatting                                |
| Node.js and npm       | Development tools, dependencies, and builds                      |

## Getting Started

You need Node.js, npm, and a configured Supabase project. The installed Angular CLI version supports Node.js `^22.22.3`, `^24.15.0`, or `>=26.0.0`.

Install the dependencies from the project directory:

```bash
npm ci
```

Then start the development server:

```bash
npm start
```

The app is available at `http://localhost:4200/`. The browser opens automatically. Source code changes are reflected while the development server is running.

## Supabase Setup

The project URL and public publishable key are configured in `src/environments/environment.ts`. To use your own Supabase project, replace these values with your project's URL and key. Secret keys and service-role keys must not be included in the frontend.

For a new database, run the following SQL files in this order using the Supabase SQL Editor:

1. `supabase/migrations/202610030001_create_surveys.sql`
2. `supabase/migrations/20261005042218_persist_survey_responses.sql`
3. `supabase/realtime.sql`

The first migration creates the `surveys` table with validation and Row Level Security. Questions and answer options are stored with the survey in a JSONB column. The second migration creates `survey_responses` and validates responses, including the survey deadline. The realtime setup enables INSERT notifications for new responses. This setup has already been applied to the existing project.

The app does not require a login. Surveys are publicly readable and can be created and answered without an account. Public database access allows reading and inserting data; published surveys and responses cannot be updated or deleted through that access. User-specific management is not implemented.

The lock after voting applies to the current form. A limit of one vote per person across sessions is not implemented without user identification. Surveys previously stored in localStorage are not imported automatically.

## Production Build

```bash
npm run build
```

The optimized build is generated in `dist/pollApp/`. The deployable website files are located in **`dist/pollApp/browser/`**.

To deploy the app, upload the contents of the `browser` directory to a web server. For direct access to Angular routes such as `/surveys/<id>`, configure the server to fall back to `index.html` for paths that do not match a static file.

The build currently reports size warnings for the initial bundle and three component stylesheets. The build succeeds; the warning thresholds in `angular.json` indicate opportunities for optimization.

## Tests and Formatting

Run all automated tests once:

```bash
npm test -- --watch=false
```

The tests use isolated Supabase mocks. They cover form validation, publication, saved results, expired surveys, error handling, and realtime connections. The last test run passed 26 tests across six test files.

The additional integration check, `node scripts/verify-survey-realtime.mjs`, verifies realtime delivery using two independent clients against the configured Supabase project. It creates a temporary survey and response. Afterward, delete the printed survey ID through an administrative database connection; associated responses are deleted automatically.

Check TypeScript and HTML formatting:

```bash
npx prettier --check "src/**/*.ts" "src/**/*.html"
```

Formatting settings are defined in `.prettierrc.json`. An end-to-end testing framework is not currently configured.

## Project Structure

```text
src/
  app/
    home/                 Home page and survey overview
    create-survey/        Survey creation form
    survey-detail/        Participation and results view
    services/             Data access, realtime, and test fixtures
    survey-date.ts        Survey deadline calculations
    survey.constants.ts   Shared domain constants
  environments/           Supabase configuration
  styles.scss             Global styles
public/assets/            Logos, illustrations, and icons
supabase/                 Database migrations and realtime setup
scripts/                  Additional realtime integration check
```

## Code Conventions

The source code uses separate HTML templates, typed functions, TSDoc comments, and named domain constants. Functions are limited to a maximum of 14 lines. HTML semantics, heading hierarchy, form labels, and alternative text have been reviewed.

The documented project status is available in [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md).
