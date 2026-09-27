# Agentic AI — 150 MCQ Exam

A browser-based exam for the *Agentic AI 150 MCQ Question Paper* (Turns 34–36: Guardrails & Human-in-the-Loop, Multi-Agent Systems, Agent Observability).

## Run

Open `index.html` in a browser. It needs no build step or server.

## Features

- A 150-minute countdown in the top-right corner. It turns amber at 15 minutes left and red at 5 minutes left, and submits the exam automatically at 00:00:00.
- One question at a time, with Previous, Save & next, Clear response, and Mark for review.
- A question palette grouped by section that shows answered, marked for review, visited-but-unanswered, and not-visited questions.
- Keyboard shortcuts: `A`–`D` pick an option; `←` and `→` move between questions.
- Progress is saved in `localStorage`. Refreshing the page keeps the answers, and the timer keeps running.
- The results screen shows attempts per section, and the responses can be downloaded as a CSV file.

## Answer key

The supplied paper does not include an answer key, so the results screen reports attempts only. To show a score, fill in `ANSWER_KEY` in `app.js`, for example `{ 1: "B", 2: "C", ... }`.

## Files

- `index.html` – page layout
- `style.css` – styles
- `app.js` – exam logic (timer, navigation, persistence, results)
- `questions.js` – the 150 questions extracted from the PDF
