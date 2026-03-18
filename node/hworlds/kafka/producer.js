const { Kafka } = require('kafkajs');

// 1. Create a Kafka client pointed at our local broker
const kafka = new Kafka({
  clientId: 'hello-producer',
  brokers: ['localhost:9092'],
});

// 2. Create a producer instance
const producer = kafka.producer();

async function run() {
  // 3. Connect to Kafka
  await producer.connect();
  console.log('Producer connected');

  const topic = 'hello-topic';
  const message = process.argv[2] || 'Hello, Kafka!';

  // 4. Send a message to the topic
  await producer.send({
    topic,
    messages: [
      { value: message },
    ],
  });

  console.log(`Message sent to [${topic}]: "${message}"`);

  // 5. Disconnect cleanly
  await producer.disconnect();
}

run().catch(console.error);
