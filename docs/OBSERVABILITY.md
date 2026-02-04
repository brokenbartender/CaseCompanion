# Observability Plan

## Metrics
- LLM latency (p50/p95)
- Retrieval latency
- Token usage per request
- Error rates by provider

## Logs
- Prompt + response IDs (not raw content)
- Policy decision logs
- Audit event IDs

## Traces
- Request -> retrieval -> generation -> verification
