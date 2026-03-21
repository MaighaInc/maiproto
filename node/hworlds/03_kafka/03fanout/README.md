# 03 — Fan-out (Pub/Sub)

## Concept

**Fan-out** means one message is delivered to **every** interested consumer — not just one.

The secret is simple: each independent service uses a **different `groupId`**.  
Kafka tracks offsets per group, so every group gets its own complete copy of the log.

```
orders-topic
      │
      ├──► billing-group    → billing consumer   (charges customer)
      ├──► inventory-group  → inventory consumer (reserves stock)
      └──► email-group      → email consumer     (sends confirmation)
```

### Consumer Groups vs Fan-out — side by side

| | 02 Consumer Groups | 03 Fan-out |
|---|---|---|
| `groupId` | **Same** for all consumers | **Different** per service |
| Message delivery | One consumer in the group | Every group independently |
| Use case | Scale out processing | Broadcast to multiple services |

---

## Files

| File | Role |
|---|---|
| `producer.js` | Publishes 6 order events to `orders-topic` |
| `consumer.js` | Subscribes as a named service; pass `billing` or `inventory` (or any name) |

---

## Run it

### Step 1 — Start both service consumers

```bash
# Terminal 1
node 03fanout/consumer.js billing

# Terminal 2
node 03fanout/consumer.js inventory
```

### Step 2 — Publish orders

```bash
node 03fanout/producer.js
```

### Expected output

**billing terminal:**
```
[billing]   💳  Charging $999 for ORD-001 (Laptop)
[billing]   💳  Charging $29 for ORD-002 (Mouse)
[billing]   💳  Charging $399 for ORD-003 (Monitor)
...
```

**inventory terminal:**
```
[inventory] 📦  Reserving stock for ORD-001 (Laptop)
[inventory] 📦  Reserving stock for ORD-002 (Mouse)
[inventory] 📦  Reserving stock for ORD-003 (Monitor)
...
```

Both terminals receive **all 6 orders** — independently and simultaneously.

---

## Experiment: add a third service

Start a third consumer with any new name:

```bash
node 03fanout/consumer.js email
```

Then run the producer again. The `email` group picks up all messages — even the ones already consumed by billing and inventory — because it has a **fresh groupId** with no committed offsets.

---

## Key takeaway

> **Same groupId** = load balancing (messages split between consumers).  
> **Different groupId** = fan-out (every group gets every message).  
> This single distinction covers both scaling patterns in Kafka.
