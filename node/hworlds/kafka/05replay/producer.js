// 05replay / producer.js
//
// CONCEPT: Replay — seeking back in the log
//
// Unlike traditional queues (RabbitMQ), Kafka is a PERSISTENT LOG.
// Messages are NOT deleted after being consumed. They stay on disk
// until the retention period expires (default: 7 days).
//
// This means you can REWIND to any point and reprocess old messages.
// Use cases:
//   - A bug was found in the consumer → fix it → replay all past events
//   - A new downstream service comes online → it needs all historical data
//   - Audit / debugging → replay a specific time window
//
// This producer sends 8 "sensor reading" events with timestamps baked
// into the message so you can see which ones get replayed.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'replay-producer',
  brokers: ['localhost:9092'],
});

const admin    = kafka.admin();
const producer = kafka.producer();
const TOPIC    = 'sensor-topic';

async function run() {
  await admin.connect();
  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 1 }] });
    console.log(`Topic "${TOPIC}" created`);
  }
  await admin.disconnect();

  await producer.connect();
  console.log('Sending 8 sensor readings...\n');

  for (let i = 1; i <= 8; i++) {
    const reading = {
      sensor: 'temp-01',
      value:  Math.round(20 + Math.random() * 10),        // 20–30°C
      seq:    i,
      ts:     new Date().toISOString(),
    };
    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor, value: JSON.stringify(reading) }],
    });
    console.log(`Sent reading #${i}  ${reading.value}°C  @ ${reading.ts}`);
    await new Promise(r => setTimeout(r, 100)); // small delay so timestamps differ
  }

  await producer.disconnect();
  console.log('\nAll readings sent.');
}

run().catch(console.error);
