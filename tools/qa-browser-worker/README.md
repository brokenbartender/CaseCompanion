# QA Browser Worker

Fast, local browser QA worker for end-to-end demo diagnostics.

## Run

From repo root:

```
npm run qa:full
```

Drive the agent with a scripted sequence (default demo login flow):

```
npm run qa:drive
```

Run with a custom JSON sequence file:

```
npm run qa:drive -- path/to/sequence.json
```

Autonomous (OpenAI cloud brain):

```
npm run qa:autonomous
```

## Options

- `QA_BASE_URL` (default `http://localhost:3001`)
- `QA_API_URL` (default `http://localhost:8787`)
- `QA_HEADLESS` (`false` to show the browser)
- `QA_ALLOW_HOSTS` (comma-separated extra hosts to allow)
- `OPENAI_API_KEY` (required for `qa:autonomous`)
- `QA_OPENAI_MODEL` (default `gpt-4o-mini-2024-07-18`)
- `qa:autonomous` uses the OpenAI Responses API with strict JSON schema output.
- `QA_PROVIDER=openai|ollama` (default `openai`; set `ollama` for local brain)
- `QA_CODE_SCAN=1` to include a lightweight codebase summary in the agent prompt
- `/api/ai/agent/translate` converts natural language to agent commands (uses OpenAI if configured, otherwise local AI)

## Output

Reports are saved to:

```
reports/qa-browser-worker/<timestamp>/
```

Long-term agent memory is stored at:

```
reports/qa-agent-memory.json
```

Knowledge memory (slow-changing truths) is stored at:

```
reports/qa-agent-knowledge.json
```

Each run includes:
- `report.json`
- `report.md`
- Screenshots
