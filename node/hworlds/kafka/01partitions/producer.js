// 01partitions / producer.js
//
// CONCEPT: Partitions & Keys
//
// A Kafka topic is split into one or more PARTITIONS (ordered sub-logs).
// When you send a message WITHOUT a key → Kafka distributes round-robin.
// When you send a message WITH a key    → Kafka always routes that key to
//   the SAME partition (hash of key % numPartitions).
//
// Why it matters:
//   - Messages with the same key are always in order relative to each other.
//   - Different keys can be processed in parallel across partitions.
//
// This producer:
//   1. Creates "keyed-topic" with 3 partitions (via Admin API).
//   2. Sends 9 messages across 3 keys so you can watch them land on
//      consistent partitions.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'partitions-producer',
  brokers: ['localhost:9092'],
});

const admin = kafka.admin();
const producer = kafka.producer();

const TOPIC = 'keyed-topic';
const KEYS = ['order-A', 'order-B', 'order-C'];

async function run() {
  // ── Step 1: ensure the topic exists with 3 partitions ──────────────────
  await admin.connect();

  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({
      topics: [{ topic: TOPIC, numPartitions: 3 }],
    });
    console.log(`Topic "${TOPIC}" created with 3 partitions`);
  } else {
    console.log(`Topic "${TOPIC}" already exists`);
  }
  await admin.disconnect();

  // ── Step 2: send messages with keys ────────────────────────────────────
  await producer.connect();
  console.log('\nSending 9 messages (3 keys × 3 messages each)...\n');

  for (let i = 1; i <= 3; i++) {
    const batch = KEYS.map((key) => ({
      key,                            // determines partition
      value: `${key} — message ${i}`,
    }));

    await producer.send({ topic: TOPIC, messages: batch });

    batch.forEach((m) =>
      console.log(`  Sent  key="${m.key}"  value="${m.value}"`)
    );
  }

  await producer.disconnect();
  console.log('\nDone. Run consumer.js to see which partition each key landed on.');
}

run().catch(console.error);
