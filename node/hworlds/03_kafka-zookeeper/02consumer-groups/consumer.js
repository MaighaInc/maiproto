// Uses order-A (p2), order-B (p0), order-D (p1) — no collision, all 3 workers active.
// Pass a label: node 02consumer-groups/consumer.js worker-1

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: `groups-consumer-${process.pid}`,
  brokers: ['localhost:9093'],
});

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

process.on('SIGINT', async () => {
  console.log(`\n[${WORKER_ID}] Shutting down...`);
  await consumer.disconnect();
  process.exit(0);
});

run().catch(console.error);
