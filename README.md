# Flowtris 🎮

**A five-minute game about flow, bottlenecks, work in progress and the difference between being busy and delivering value.**

[**Play Flowtris**](https://rstebbens.github.io/flowtris/) · [**Rob Stebbens**](https://robstebbens.com/)

## How to play

1. Click a shape in the **Backlog** to start the five-minute round and send work into **Build**.
2. Work moves through **Build → Test → Deploy → Production**.
3. Allocate people between the stages using the **− / +** controls (👤 icons show allocations). There is a shared pool of six people.
4. Experiment with **WIP limits** and watch what happens to queues, processing and throughput.
5. The deployment stage releases work on a fixed cadence. Once pieces reach Production, arrange them into complete rows to release value. **Autopilot** can handle the falling pieces for you.
6. Try to maximise released product value before time runs out or Production fills up.

**Tip:** On a phone, rotate to landscape for the best gameplay layout.

## What it demonstrates

- **Flow over utilisation:** Keeping everyone busy does not guarantee that value reaches customers.
- **WIP and queues:** Starting more work can increase congestion and delay finishing.
- **Bottlenecks:** Improving one stage does not necessarily improve the whole system.
- **Resource allocation:** Moving people changes stage capacity, but coordination has a cost.
- **Release cadence:** Completed work can still wait before it becomes usable value.

Flowtris is a learning simulation, not a precise model of a real delivery organisation.

## Scores and leaderboard

The game saves a **local leaderboard** in the browser. It also integrates with a **Google Sheets / Apps Script** endpoint to record anonymous game starts, completed scores and an all-time Top 10 when the endpoint is available.

Players enter three-letter initials. A randomly generated browser ID is used to associate repeat plays; clearing browser storage or using another device may generate a new ID. No account is required.

The public score API includes basic validation but should not be treated as tamper-proof.

## Run locally

Download or clone the repository and open `index.html` in a modern browser. No package installation or build step is required.

For GitHub Pages, enable **Settings → Pages → Deploy from a branch**, select the default branch and **/(root)**.

## Project

Flowtris is an experimental Agile/business agility learning game by [Rob Stebbens](https://robstebbens.com/).

Feedback, experiments and improvements are welcome.
