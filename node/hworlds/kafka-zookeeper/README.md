# Kafka + Zookeeper — Hello World

## Why does Kafka need Zookeeper?

A production Kafka cluster is made up of **multiple brokers** (servers). For the cluster to work correctly, every broker needs answers to questions like:

- Which broker is currently the **controller** (the one that manages partition leadership)?
- Which broker is the **leader** for partition 3 of `orders-topic`?
- Which topics exist, how many partitions, and what is the replication config?
- Which brokers are alive right now?

Before KRaft, Kafka had no built-in way to manage this distributed state itself. So it delegated that job to **Apache Zookeeper** — a battle-tested coordination service designed exactly for this: storing small pieces of critical cluster metadata and electing leaders reliably across a distributed system.

### What Zookeeper stores for Kafka

| ZK path | What's inside |
|---|---|
| `/brokers/ids/<id>` | Heartbeat — proves this broker is alive |
| `/brokers/topics/<name>` | Partition count, replica assignment |
| `/controller` | Which broker ID is currently the cluster controller |
| `/admin/delete_topics` | Topics queued for deletion |

### The problem with this design

Zookeeper is a **separate system** with its own:
- separate deployment & version lifecycle
- separate monitoring & ops burden
- write bottleneck (all metadata writes go through ZK)
- scaling limit (~tens of thousands of partitions before ZK becomes a bottleneck)

For large clusters, Zookeeper itself became the limiting factor.

### KRaft — Kafka without Zookeeper

Introduced in Kafka 2.8 (beta) and production-ready in Kafka 3.3, **KRaft** (Kafka Raft) bakes the metadata management directly into the Kafka broker using the Raft consensus algorithm. The `kafka/` folder in this repo uses KRaft.

```
Zookeeper mode (this folder)        KRaft mode (kafka/ folder)
────────────────────────────        ──────────────────────────
Zookeeper process   ← metadata      No Zookeeper
Kafka broker        ← messages      Kafka broker ← metadata + messages
2 processes, 2 images               1 process, 1 image
```

### When will you still see Zookeeper?

- Any Kafka cluster **installed before ~2023** is almost certainly running in Zookeeper mode.
- Managed services (Confluent Cloud, Amazon MSK older versions) used ZK mode for years.
- Most enterprise on-premise Kafka installations still run Zookeeper today.

Understanding Zookeeper mode is essential for working with real-world Kafka deployments.

---

## How this differs from the KRaft folder

| | `kafka/` (KRaft) | `kafka-zookeeper/` (this folder) |
|---|---|---|
| Broker port | 9092 | **9093** |
| Metadata storage | Built into broker (KRaft) | **Separate Zookeeper process** |
| Docker containers | 1 (kafka) | **2 (zookeeper + kafka)** |
| Kafka version history | New (Kafka 3.3+) | Classic — used before 2024 |

Both folders teach the same Kafka concepts. The application code (KafkaJS) is identical except for the port number.

---

## Architecture

```
  ┌─────────────┐        ┌───────────────────────────────┐
  │  Zookeeper  │◄──────►│  Kafka Broker (cp-kafka:7.6)  │
  │  port 2181  │        │  port 9093                    │
  └─────────────┘        └───────────────────────────────┘
                                       ▲
                              KafkaJS connects here
```

Zookeeper's job:
- Stores cluster metadata (topics, partitions, replicas)
- Manages broker leader election
- Tracks consumer group offsets (old clients; KafkaJS uses the broker directly)

---

## Quick start

```bash
# Start both containers
docker compose up -d

# Wait ~15 seconds for Zookeeper + Kafka to fully start, then:
npm install

# Terminal 1 — send a message
node producer.js

# Terminal 2 — receive messages
node consumer.js
```

---

## Topic sequence

Same concepts as `kafka/`, same folder names — only the broker port changes:

| Folder | Concept |
|---|---|
| (root) | Hello World |
| `01partitions/` | Keys & partition routing |
| `02consumer-groups/` | Load balancing |
| `03fanout/` | Pub/Sub fan-out |
| `04manual-commit/` | At-least-once delivery |
| `05replay/` | Seeking & replaying the log |
