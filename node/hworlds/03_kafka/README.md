# Kafka Hello World

A minimal Kafka example using **KafkaJS** to understand the core publish/subscribe model.

---

## What you'll learn

| Concept | Where |
|---|---|
| **Broker** | The Kafka server that stores and routes messages |
| **Topic** | A named channel (like a queue, but replayable) |
| **Producer** | Sends messages to a topic |
| **Consumer** | Reads messages from a topic |
| **Consumer Group** | A group of consumers sharing partition load |

---

## Folder structure

```
kafka/
├── docker-compose.yml   ← spins up a single Kafka broker (KRaft, no Zookeeper)
├── producer.js          ← sends one message then exits
├── consumer.js          ← subscribes and prints every message (stays running)
└── package.json
```

---

## Quick start

### 1. Start Kafka

```bash
docker compose up -d
```

Wait ~10 seconds for the broker to be ready.

### 2. Install dependencies

```bash
npm install
```

### 3. Send a message (Terminal 1)

```bash
node producer.js
# or with a custom message:
node producer.js "Hello from me!"
```

### 4. Start the consumer (Terminal 2)

```bash
node consumer.js
```

Because `fromBeginning: true` is set, the consumer will replay the message you already sent and then wait for more.

**Consumer output:**

```
{
  topic: 'hello-topic',
  partition: 0,
  offset: '0',
  value: 'Hello, Kafka!'
}
```

---

## Key ideas

### Topic vs Queue
Kafka topics are **append-only logs**. Unlike a traditional queue, a message is NOT deleted after being consumed. Consumers track their own position (offset), so:
- A new consumer with `fromBeginning: true` replays all past messages.
- Multiple consumer groups all get their own independent copy of every message.

### Consumer Group
If you run two consumers with the **same** `groupId`, Kafka splits partitions between them (load balancing). If they have **different** groupIds, each group gets all messages (pub/sub fan-out).

### Offset
Every message has a sequential number (offset) within its partition. Kafka remembers your group's last read offset, so restarts pick up where they left off.

---

## Stop Kafka

```bash
docker compose down
# to also delete stored messages:
docker compose down -v
```
