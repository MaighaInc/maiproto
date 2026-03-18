# 04 — Manual Offset Commit

Same concept as `kafka/04manual-commit/` — see that README for full explanation.

## Run it

```bash
node 04manual-commit/producer.js

# crashes on PAY-003
node 04manual-commit/consumer.js

# resumes from PAY-003
node 04manual-commit/consumer.js
```
