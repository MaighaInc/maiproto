const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'partitions-consumer', brokers: ['localhost:9093'] });
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

process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
run().catch(console.error);
