// 01partitions / consumer.js
//
// WHAT TO OBSERVE:
//   - Every message for "order-A" lands on the same partition number.
//   - Every message for "order-B" and "order-C" each land on their own
//     consistent partition.
//   - The partition numbers differ between keys, proving that
//     key → hash → partition routing is deterministic.
//
// Try this: run producer.js again, then watch the consumer. The same
// keys will ALWAYS map to the same partition numbers.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'partitions-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'partitions-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'keyed-topic', fromBeginning: true });

  console.log('Waiting for messages on [keyed-topic]...\n');
  console.log('  key          | partition | value');
  console.log('  -------------|-----------|-------------------------------');

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const key   = message.key?.toString().padEnd(12);
      const value = message.value.toString();
      console.log(`  ${key} | ${String(partition).padEnd(9)} | ${value}`);
    },
  });
}

run().catch(console.error);
