# 02 — Consumer Groups (Load Balancing)

## Concept

A **consumer group** is a set of consumers that cooperate to consume a topic.  
Kafka assigns each partition to **exactly one consumer** in the group.

```
keyed-topic  (3 partitions)

  Partition 0  ──►  Consumer A
  Partition 1  ──►  Consumer B
  Partition 2  ──►  Consumer C
```

### Rules

| Consumers in group | Result |
|---|---|
| Fewer than partitions | Some consumers handle multiple partitions |
| Equal to partitions | Perfect 1-to-1 assignment |
| More than partitions | Extra consumers sit **idle** (no partition left) |

### Rebalance

When a consumer joins or leaves the group, Kafka automatically **rebalances** — reassigning partitions so the load is spread evenly. You will see a short pause in processing during rebalance.

### What this is NOT

This is **not** fan-out (where every consumer gets every message). In a single group, each message is processed by **one** consumer only. Fan-out (pub/sub) is covered in `03fanout`.

---

## Files

| File | Role |
|---|---|
| `producer.js` | Sends 12 messages (4 batches × 3 keys) to `keyed-topic` |
| `consumer.js` | Joins `groups-demo-group`; accepts an optional label argument |

---

## Run it

### Step 1 — Start 3 consumers (3 separate terminals)

```bash
node 02consumer-groups/consumer.js worker-1
node 02consumer-groups/consumer.js worker-2
node 02consumer-groups/consumer.js worker-3
```

Wait until all three print `Ready — waiting for messages...`

### Step 2 — Send messages

```bash
node 02consumer-groups/producer.js
```

### Expected output (spread across terminals)

```
[worker-1] partition=0  key="order-B"  → order-B — batch 1
[worker-2] partition=1  key="order-C"  → order-C — batch 1
[worker-3] partition=2  key="order-A"  → order-A — batch 1
[worker-1] partition=0  key="order-B"  → order-B — batch 2
...
```

Each worker only prints its assigned partition — no duplicates.

---

## Experiment: kill a consumer mid-stream

1. Run the producer once so messages are produced.  
2. Kill `worker-3` (Ctrl+C).  
3. Run the producer again.  
4. Watch `worker-1` or `worker-2` take over partition 2 (the rebalance log appears first).

---

## Why did worker-2 get nothing?

You may observe that one worker prints no messages even though the producer sent to all 3 keys. This is expected.

Key hashing is **deterministic, not evenly distributed**:

```
hash("order-A") % 3  →  partition 2
hash("order-B") % 3  →  partition 0
hash("order-C") % 3  →  partition 0  ← collision with order-B!
```

Two keys landed on the same partition, leaving partition 1 empty. The consumer assigned to partition 1 sits idle — not a bug, just hash skew.

**Fix options:**
- Add more keys (more keys → better spread across partitions).
- Use keyless messages (`key` omitted) → Kafka round-robins evenly across all partitions.

---

## Key takeaway

> Use consumer groups to **scale out** message processing. Add more consumers (up to the number of partitions) to increase throughput. Kafka guarantees each message is delivered to exactly one member of the group.
> 
> Key hashing is deterministic but not guaranteed to be even. Uneven key distribution causes partition skew — some consumers do more work, others sit idle.
