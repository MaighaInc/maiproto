// 02consumer-groups / producer.js
//
// CONCEPT: Consumer Groups — Load Balancing
//
// When multiple consumers share the same groupId, Kafka assigns
// partitions evenly among them. Each partition is owned by exactly
// ONE consumer in the group at any time.
//
// keyed-topic has 3 partitions (created in 01partitions).
// If you run 3 consumers → each owns 1 partition.
// If you run 2 consumers → one owns 2 partitions, the other owns 1.
// If you run 4 consumers → one sits idle (no partition left to assign).
//
// This producer sends 12 messages evenly across the 3 keys so you
// can clearly see which consumer instance processes which messages.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'groups-producer',
  brokers: ['localhost:9092'],
});

const producer = kafka.producer();
const TOPIC = 'keyed-topic'; // same topic created in 01partitions

async function run() {
  await producer.connect();
  console.log('Producer connected\n');

  const keys = ['order-A', 'order-B', 'order-C'];

  for (let i = 1; i <= 4; i++) {
    const messages = keys.map((key) => ({
      key,
      value: `${key} — batch ${i}`,
    }));
    await producer.send({ topic: TOPIC, messages });
    messages.forEach((m) => console.log(`Sent  key="${m.key}"  value="${m.value}"`));
  }

  await producer.disconnect();
  console.log('\nDone.');
}

run().catch(console.error);
