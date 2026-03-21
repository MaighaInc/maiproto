const { Kafka } = require('kafkajs');

const kafka = new Kafka({ clientId: 'partitions-producer', brokers: ['localhost:9093'] });
const admin    = kafka.admin();
const producer = kafka.producer();
const TOPIC    = 'keyed-topic';
const KEYS     = ['order-A', 'order-B', 'order-C'];

async function run() {
  await admin.connect();
  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }] });
    console.log(`Topic "${TOPIC}" created with 3 partitions`);
  } else {
    console.log(`Topic "${TOPIC}" already exists`);
  }
  await admin.disconnect();

  await producer.connect();
  console.log('\nSending 9 messages (3 keys × 3 messages each)...\n');

  for (let i = 1; i <= 3; i++) {
    const batch = KEYS.map((key) => ({ key, value: `${key} — message ${i}` }));
    await producer.send({ topic: TOPIC, messages: batch });
    batch.forEach((m) => console.log(`  Sent  key="${m.key}"  value="${m.value}"`));
  }

  await producer.disconnect();
  console.log('\nDone. Run consumer.js to see which partition each key landed on.');
}

run().catch(console.error);
