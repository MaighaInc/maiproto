# 02 — Consumer Groups (Load Balancing)

Same concept as `kafka/02consumer-groups/` — see that README for full explanation.

## Fix applied from the KRaft run

The KRaft producer used keys `order-A`, `order-B`, `order-C`. Both B and C hashed to partition 0, leaving partition 1 (worker-2) idle.

This producer uses `order-A`, `order-B`, `order-D` — verified to hit all 3 partitions:

```
order-A  →  partition 2
order-B  →  partition 0
order-D  →  partition 1   ← changed from order-C
```

All 3 workers will now receive messages.

## Zookeeper's role here

Consumer group membership and rebalance coordination is managed by the **Kafka broker** (via the Group Coordinator protocol), not directly by Zookeeper in modern Kafka. However, Zookeeper still stores broker registrations that the Group Coordinator depends on.

## Run it

```bash
# 3 terminals
node 02consumer-groups/consumer.js worker-1
node 02consumer-groups/consumer.js worker-2
node 02consumer-groups/consumer.js worker-3

# then
node 02consumer-groups/producer.js
```
