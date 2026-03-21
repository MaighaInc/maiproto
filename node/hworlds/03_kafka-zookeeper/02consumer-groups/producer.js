const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'groups-producer', brokers: ['localhost:9093'] });
const producer = kafka.producer();
const TOPIC    = 'keyed-topic';

async function run() {
  await producer.connect();
  console.log('Producer connected\n');

  const keys = ['order-A', 'order-B', 'order-D']; // A→p2, B→p0, D→p1 (no collision)

  for (let i = 1; i <= 4; i++) {
    const messages = keys.map((key) => ({ key, value: `${key} — batch ${i}` }));
    await producer.send({ topic: TOPIC, messages });
    messages.forEach((m) => console.log(`Sent  key="${m.key}"  value="${m.value}"`));
  }

  await producer.disconnect();
  console.log('\nDone.');
}

run().catch(console.error);
