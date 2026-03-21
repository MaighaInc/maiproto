const { Kafka } = require('kafkajs');

// 1. Create a Kafka client pointed at our local broker
const kafka = new Kafka({
  clientId: 'hello-consumer',
  brokers: ['localhost:9092'],
});

// 2. Create a consumer that belongs to a consumer group
//    All consumers in the same group share the partition load.
const consumer = kafka.consumer({ groupId: 'hello-group' });

async function run() {
  // 3. Connect to Kafka
  await consumer.connect();
  console.log('Consumer connected');

  // 4. Subscribe to the topic
  //    fromBeginning: true  → replay all existing messages on first run
  await consumer.subscribe({ topic: 'hello-topic', fromBeginning: true });

  console.log('Waiting for messages on [hello-topic]... (Ctrl+C to stop)\n');

  // 5. Start the polling loop — eachMessage is called for every record
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString(),
      });
    },
  });
}

run().catch(console.error);
