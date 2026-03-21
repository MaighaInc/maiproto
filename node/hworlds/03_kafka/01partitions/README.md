# 01 — Partitions & Keys

## Concept

A Kafka topic is split into one or more **partitions** — independent, ordered sub-logs.

```
hello-topic  (1 partition, default)
                 ┌──────────────────────┐
  Partition 0    │ msg0 │ msg1 │ msg2 … │
                 └──────────────────────┘

keyed-topic  (3 partitions)
                 ┌──────────────────────┐
  Partition 0    │ order-B msgs …       │
                 └──────────────────────┘
                 ┌──────────────────────┐
  Partition 1    │ order-C msgs …       │
                 └──────────────────────┘
                 ┌──────────────────────┐
  Partition 2    │ order-A msgs …       │
                 └──────────────────────┘
```

### No key → round-robin

Kafka spreads messages evenly across all partitions. No ordering guarantee across messages.

### With a key → deterministic partition

Kafka hashes the key and picks a partition:

```
partition = hash(key) % numPartitions
```

The **same key always goes to the same partition**. This gives you:
- **Ordering** — all events for `order-A` are in sequence within their partition.
- **Parallelism** — different keys are processed in parallel on different partitions.

---

## Files

| File | Role |
|---|---|
| `producer.js` | Creates `keyed-topic` with 3 partitions, sends 9 messages across 3 keys |
| `consumer.js` | Reads and prints each message alongside its partition number |

---

## Run it

```bash
# Terminal 1 — send messages
node 01partitions/producer.js

# Terminal 2 — read messages
node 01partitions/consumer.js
```

### Expected consumer output

```
  key          | partition | value
  -------------|-----------|-------------------------------
  order-A      | 2         | order-A — message 1
  order-B      | 0         | order-B — message 1
  order-C      | 1         | order-C — message 1
  order-A      | 2         | order-A — message 2
  order-B      | 0         | order-B — message 2
  order-C      | 1         | order-C — message 2
  ...
```

### What to notice

1. **Same key → same partition every time.** Re-run the producer; `order-A` will always land on partition 2 (or whichever partition it hashed to first).
2. **Different keys → different partitions.** Each key gets its own "lane".
3. **Order is per-partition.** Messages within a partition are always in insertion order; across partitions there is no global order.

---

## Key takeaway

> Use **keys** whenever the order of events for a particular entity (user, order, sensor) matters. Let Kafka route all events for that entity to the same partition.
