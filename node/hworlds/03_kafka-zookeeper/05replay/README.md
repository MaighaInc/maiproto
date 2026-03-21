# 05 — Replay (Seeking in the Log)

Same concept as `kafka/05replay/` — see that README for full explanation.

## Run it

```bash
node 05replay/producer.js

node 05replay/consumer.js beginning
node 05replay/consumer.js offset 3
node 05replay/consumer.js latest
```
