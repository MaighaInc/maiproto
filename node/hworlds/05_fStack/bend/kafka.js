const { Kafka } = require('kafkajs');
const { insertMessage } = require('./db');

const kafka = new Kafka({
  clientId: 'hello-app',
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'hello-group' });
const admin = kafka.admin();

async function startKafka() {
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [{ topic: 'hello-topic', numPartitions: 1, replicationFactor: 1 }],
  });
  await admin.disconnect();

  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'hello-topic', fromBeginning: true });

  consumer.run({
    eachMessage: async ({ message }) => {
      if (message.value) {
        const content = message.value.toString();
        console.log('Consumed:', content);
        await insertMessage(content);
      }
    },
  });
}

module.exports = { producer, startKafka };