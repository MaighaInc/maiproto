const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'hello-consumer',
  brokers: ['localhost:9093'],
});

const consumer = kafka.consumer({ groupId: 'hello-group' });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'hello-topic', fromBeginning: true });

  console.log('Waiting for messages on [hello-topic]... (Ctrl+C to stop)\n');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        value:  message.value.toString(),
      });
    },
  });
}

process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
run().catch(console.error);
