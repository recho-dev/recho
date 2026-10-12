# UIST user-study system

This branch packages the study implementation as one commit above
`9071578d9662170a61d4b4316ceadbefb2879b06`, immediately before the study series.
It includes database-backed task editing, session recording and resume, replay,
SUS and NASA-TLX questionnaires, character picking, and task seed notebooks.
The paper used tasks covering strings, data transformation, and text patterns;
the seed library contains additional tasks. Select the intended tasks per session.

## Setup

Use Node.js 22 and npm. Copy `.env.example` to `.env` and replace the example
passwords before running a study. The example values are placeholders.

For local development, provide PostgreSQL 16, create the database named in
`DATABASE_URL`, then run:

```sh
npm ci
npm run db:migrate:deploy
npm run db:seed
npm run app:dev
```

Open http://localhost:3000. The navigation includes the evaluation controls.
Manage sessions at `/evaluation/manage/sessions` and task definitions at
`/evaluation/manage/tasks`. First-time seeding skips an already populated task
table. `new-examples/` contains draft notebook variants; database seeds live in
`prisma/seed-tasks/`.

Alternatively, `docker compose up --build` starts PostgreSQL and the app,
applies migrations, and seeds tasks on startup. Set credentials in `.env` first.
The Compose database is internal; its named volume persists study records.

## Access and data

Use only in a controlled study environment. Existing optional Basic authentication
protects management pages and selected evaluation read/export/import routes;
it is not complete multi-user authorization for participant and task APIs.
Set both admin environment variables and restrict network access to the study
team and participants. Use HTTPS when accessing it over a network.

Session records include participant names/IDs, editor content, interaction events,
and questionnaire responses. Keep the database and exports private. This branch
excludes recorded participant events, analysis figures, and local credentials,
including files that existed in the original study branch history. Original
history and unpublished paper-gallery work remain in the source worktree.

## Validation

```sh
npm run test:lint
npm run test:format
npm run test:js -- --run
npm run app:build
```

Database-backed recording, resume, questionnaires, and replay also require a
manual smoke test against a disposable database before conducting another study.
