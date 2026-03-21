# 05 — Replay (Seeking in the Log)

## Concept

Kafka is a **persistent log**, not a destructive queue. Messages are retained on disk (default: 7 days) regardless of how many consumers have read them.

This means any consumer can **seek** to any position in the log and reprocess historical events — a capability that does not exist in RabbitMQ or BullMQ.

```
sensor-topic  partition 0

offset:   0       1       2       3       4       5       6       7
        [ r#1 ] [ r#2 ] [ r#3 ] [ r#4 ] [ r#5 ] [ r#6 ] [ r#7 ] [ r#8 ]
                              ▲
                         seek here → replay from reading #4 onwards
```

### When to replay

| Scenario | Action |
|---|---|
| Bug found in consumer logic | Fix code → replay from offset 0 |
| New service needs history | New groupId + `fromBeginning: true` OR seek to 0 |
| Investigate a specific incident window | Seek to the offset/timestamp of interest |
| Smoke-test a new deployment | Replay a known set of events |

### seek() vs fromBeginning

| | `fromBeginning: true` | `consumer.seek()` |
|---|---|---|
| Where | subscribe option | Called after partition assignment |
| Resets to | Offset 0 | Any offset you specify |
| Permanent? | Only for groups with no prior committed offset | Session only — committed offset unchanged |

---

## Files

| File | Role |
|---|---|
| `producer.js` | Sends 8 temperature sensor readings (seq 1–8) |
| `consumer.js` | Three replay modes via CLI arg |

---

## Run it

### Step 1 — Publish sensor readings

```bash
node 05replay/producer.js
```

### Step 2 — Replay all from the beginning

```bash
node 05replay/consumer.js beginning
```

Output: all 8 readings, offset 0 → 7.

### Step 3 — Replay from a specific offset

```bash
node 05replay/consumer.js offset 3
```

Output: readings #4 → #8 (offsets 3–7). Earlier readings are skipped.

### Step 4 — Latest only (no replay)

```bash
node 05replay/consumer.js latest
```

Output: nothing (no new messages). Run the producer again in another terminal — only the NEW readings appear.

---

### Expected output (`beginning` mode)

```
  offset | seq | value  | timestamp
  -------|-----|--------|--------------------------
  0      | 1   | 23°C   | 2026-03-19T...
  1      | 2   | 27°C   | 2026-03-19T...
  2      | 3   | 21°C   | 2026-03-19T...
  3      | 4   | 25°C   | 2026-03-19T...
  ...
```

---

## Key takeaway

> Kafka's log retention gives you a **time machine**. Use `consumer.seek()` to jump to any offset. Set `autoCommit: false` during a replay run so you don't accidentally overwrite your group's real committed position.
>
> This is one of the most powerful features that sets Kafka apart from traditional message queues.
