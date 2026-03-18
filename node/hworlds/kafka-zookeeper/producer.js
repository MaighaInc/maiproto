const { Kafka } = require('kafkajs');

// Broker is on 9093 (Zookeeper stack) — not 9092 (KRaft stack)
const kafka = new Kafka({
  clientId: 'hello-producer',
  brokers: ['localhost:9093'],
});

const producer = kafka.producer();

async function run() {
  await producer.connect();
  console.log('Producer connected');

  const topic   = 'hello-topic';
  const message = process.argv[2] || 'Hello, Kafka + Zookeeper!';

  await producer.send({
    topic,
    messages: [{ value: message }],
  });

  console.log(`Message sent to [${topic}]: "${message}"`);
  await producer.disconnect();
}

run().catch(console.error);
