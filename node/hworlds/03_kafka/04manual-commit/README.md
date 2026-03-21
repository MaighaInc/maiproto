# 04 — Manual Offset Commit (At-Least-Once Delivery)

## Concept

Every consumer group tracks a **committed offset** per partition — the position up to which messages have been successfully processed. On restart, Kafka resumes from the last committed offset.

### The problem with auto-commit

By default KafkaJS commits offsets automatically every 5 seconds:

```
Receive msg  →  [5 sec timer fires → commit]  →  process msg  →  CRASH
                        ↑ offset already advanced
```

On restart Kafka skips the crashed message — it was "committed" before processing finished. **Silent data loss.**

### Manual commit fixes this

```
Receive msg  →  process msg  →  SUCCESS → commit offset
                             →  FAIL    → do NOT commit → re-delivered on restart
```

This is called **at-least-once delivery** — a message is never skipped, but may be processed more than once if the consumer crashes after processing but before committing.

---

## The demo scenario

The producer sends 5 payment jobs. `PAY-003` has `fail: true`.

| Run | What happens |
|---|---|
| First run | PAY-001, PAY-002 processed & committed. PAY-003 crashes — offset NOT committed. |
| Second run | Resumes from PAY-003 (not PAY-001). Crashes again. |
| (Repeat) | Until you fix the bad payment or handle it differently. |

---

## Files

| File | Role |
|---|---|
| `producer.js` | Sends 5 payments; PAY-003 has `fail: true` |
| `consumer.js` | `autoCommit: false` — only commits after successful processing |

---

## Run it

```bash
# Step 1 — publish the payments (once)
node 04manual-commit/producer.js

# Step 2 — start the consumer (crashes on PAY-003)
node 04manual-commit/consumer.js

# Step 3 — restart the consumer
# Watch it resume from PAY-003, not PAY-001
node 04manual-commit/consumer.js
```

### Expected output — first run

```
Received PAY-001  fail=false
  ✓ Processed PAY-001  $100
  ✔ Offset 0 committed

Received PAY-002  fail=false
  ✓ Processed PAY-002  $250
  ✔ Offset 1 committed

Received PAY-003  fail=true
  ✗ FAILED: Payment gateway rejected PAY-003
    Offset 2 NOT committed — will retry on next start
```

### Expected output — second run (restart)

```
Received PAY-003  fail=true   ← resumes here, not from PAY-001
  ✗ FAILED: ...
```

PAY-001 and PAY-002 are never re-processed. Only the uncommitted offset is retried.

---

## Auto-commit vs Manual-commit

| | Auto-commit | Manual commit |
|---|---|---|
| Commit timing | Every N seconds | After successful processing |
| Risk | Message lost if crash before processing | Message reprocessed if crash after processing |
| Delivery guarantee | At-most-once | **At-least-once** |
| Code complexity | None | Explicit `commitOffsets()` call |

---

## Key takeaway

> Set `autoCommit: false` and call `commitOffsets()` only after your work succeeds.  
> This guarantees **at-least-once delivery** — no message is ever silently skipped,  
> though messages may be processed more than once during failures.
>
> For **exactly-once**, Kafka offers transactional producers + idempotent consumers — that's an advanced topic for later.
