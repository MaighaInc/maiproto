// 02consumer-groups / consumer.js
//
// HOW TO USE:
//   Open 2 or 3 terminals and run this file in each one.
//   All use the same groupId → Kafka splits partitions between them.
//
//   Then run producer.js and watch which terminal prints which messages.
//
// WHAT TO OBSERVE:
//   - Each consumer only prints messages from its assigned partition(s).
//   - No two consumers in the same group print the same message.
//   - If you kill one consumer, Kafka rebalances — the remaining
//     consumers take over the orphaned partition automatically.
//
// The WORKER_ID env var (or a CLI arg) just labels each terminal so
// you can tell them apart. It has no effect on Kafka behavior.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: `groups-consumer-${process.pid}`,
  brokers: ['localhost:9092'],
});

// All instances share the SAME groupId → they form one consumer group
const consumer = kafka.consumer({ groupId: 'groups-demo-group' });

const WORKER_ID = process.argv[2] || `worker-${process.pid}`;

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'keyed-topic', fromBeginning: false });

  console.log(`[${WORKER_ID}] Ready — waiting for messages...\n`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const key   = message.key?.toString();
      const value = message.value.toString();
      console.log(`[${WORKER_ID}] partition=${partition}  key="${key}"  → ${value}`);
    },
  });
}

// Graceful shutdown on Ctrl+C
process.on('SIGINT', async () => {
  console.log(`\n[${WORKER_ID}] Shutting down...`);
  await consumer.disconnect();
  process.exit(0);
});

run().catch(console.error);
