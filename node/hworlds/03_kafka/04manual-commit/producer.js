// 04manual-commit / producer.js
//
// CONCEPT: Manual Offset Commit (At-Least-Once Delivery)
//
// By default KafkaJS uses autoCommit=true — the offset is committed
// automatically every 5 seconds regardless of whether your code
// actually finished processing the message.
//
// Problem: if the consumer crashes AFTER auto-commit but BEFORE it
// finishes processing, that message is silently lost.
//
// Manual commit lets YOU decide when to advance the offset — only
// after the work is truly done.
//
// This producer sends 5 "payment" jobs, one of which will intentionally
// fail in the consumer so you can see the retry-on-crash behavior.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'manual-commit-producer',
  brokers: ['localhost:9092'],
});

const admin    = kafka.admin();
const producer = kafka.producer();
const TOPIC    = 'payments-topic';

async function run() {
  await admin.connect();
  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 1 }] });
    console.log(`Topic "${TOPIC}" created`);
  }
  await admin.disconnect();

  await producer.connect();

  const payments = [
    { id: 'PAY-001', amount: 100, fail: false },
    { id: 'PAY-002', amount: 250, fail: false },
    { id: 'PAY-003', amount: 999, fail: true  }, // ← this one will crash the consumer
    { id: 'PAY-004', amount: 50,  fail: false },
    { id: 'PAY-005', amount: 175, fail: false },
  ];

  for (const p of payments) {
    await producer.send({
      topic: TOPIC,
      messages: [{ key: p.id, value: JSON.stringify(p) }],
    });
    console.log(`Sent ${p.id}  amount=$${p.amount}  fail=${p.fail}`);
  }

  await producer.disconnect();
  console.log('\nAll payments sent.');
}

run().catch(console.error);
