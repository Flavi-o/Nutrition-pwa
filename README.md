# nutrition-pwa

## Prerequis

- Node.js 20+ (teste ici avec Node 24)
- npm

## Installation

```bash
npm install
```

## Configuration

1. Copier l'exemple d'environnement:

```bash
cp .env.example .env
```

2. Renseigner au minimum `OPENAI_API_KEY` dans `.env`.

## Lancement en developpement

```bash
npm run dev
```

- Front Vite: `http://localhost:5173`
- API Express: `http://localhost:3001`
- Page Recipe Optimizer: `http://localhost:5173/recipe-optimizer`

## Build production

```bash
npm run build
npm start
```

- App principale: `http://localhost:3001/`
- Recipe Optimizer: `http://localhost:3001/recipe-optimizer/`

## Endpoints Recipe Optimizer

- `POST /api/recipe/parse`
  - body: `{ "text": "...", "sourceUrl": "https://..." }`
- `POST /api/recipe/optimize`
  - body: `{ "recipeJson": {...}, "mode": "equilibre|seche", "targets": {...}, "dishTypeOverride": "dessert|savory|snack" }`
- `GET /api/recipe/history?limit=40`
- `GET /api/recipe/history/:id`
