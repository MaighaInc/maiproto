# 03 — Fan-out (Pub/Sub)

Same concept as `kafka/03fanout/` — see that README for full explanation.

## Run it

```bash
node 03fanout/consumer.js billing
node 03fanout/consumer.js inventory

node 03fanout/producer.js
```

Both terminals receive all 6 orders independently because they use different `groupId`s.
