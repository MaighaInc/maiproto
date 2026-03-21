const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'replay-producer', brokers: ['localhost:9093'] });
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
      value:  Math.round(20 + Math.random() * 10),
      seq:    i,
      ts:     new Date().toISOString(),
    };
    await producer.send({
      topic: TOPIC,
      messages: [{ key: reading.sensor, value: JSON.stringify(reading) }],
    });
    console.log(`Sent reading #${i}  ${reading.value}°C  @ ${reading.ts}`);
    await new Promise(r => setTimeout(r, 100));
  }

  await producer.disconnect();
  console.log('\nAll readings sent.');
}

run().catch(console.error);
