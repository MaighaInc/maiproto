const { Kafka } = require('kafkajs');

const TOPIC = 'messages-events';

const kafka = new Kafka({
  clientId: 'hello-app',
  brokers: [process.env.KAFKA_BROKER],
});

const producer = kafka.producer();

async function initKafka() {
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [{ topic: TOPIC, numPartitions: 1, replicationFactor: 1 }],
  });
  await admin.disconnect();
  console.log(`Kafka topic '${TOPIC}' ready`);

  await producer.connect();
  console.log('Kafka producer connected');
}

module.exports = { kafka, producer, initKafka, TOPIC };