$env:QA_BASE_URL = "http://localhost:3001"
$env:QA_HEADLESS = "false"
$env:QA_TRACE = "1"
$env:QA_TRACE_EVERY = "1"
node tools/qa-browser-worker/agent-console/agent.mjs
