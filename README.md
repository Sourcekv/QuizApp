# QA Quiz App

A React/Vite quiz app for practicing QA lectures. Every quiz randomly selects 30 questions from the question bank and shows explanations after each answer.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal, usually http://localhost:5173/

## If npm install fails on Windows

Run these commands in PowerShell inside the project folder:

```powershell
npm config set registry https://registry.npmjs.org/
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install
npm run dev
```

## Build for sharing/deployment

```bash
npm run build
npm run preview
```

The app is ready for deployment to Vercel as a Vite React project.
