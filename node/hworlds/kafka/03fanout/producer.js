// 03fanout / producer.js
//
// CONCEPT: Fan-out (Pub/Sub)
//
// In 02consumer-groups, all consumers shared ONE groupId → each message
// went to exactly ONE consumer (load balancing).
//
// Fan-out is the opposite: multiple INDEPENDENT groups all subscribe to
// the same topic. Every group gets EVERY message — like a broadcast.
//
// Real-world example:
//   An "order-placed" event is published once.
//   ┌─ group: billing-service   → charges the customer
//   ├─ group: inventory-service → reserves the stock
//   └─ group: email-service     → sends confirmation email
//
// This producer sends 6 order events to "orders-topic".
// Two consumer groups (billing & inventory) will each receive all 6.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'fanout-producer',
  brokers: ['localhost:9092'],
});

const admin    = kafka.admin();
const producer = kafka.producer();

const TOPIC = 'orders-topic';

async function run() {
  // Ensure topic exists
  await admin.connect();
  const existing = await admin.listTopics();
  if (!existing.includes(TOPIC)) {
    await admin.createTopics({ topics: [{ topic: TOPIC, numPartitions: 3 }] });
    console.log(`Topic "${TOPIC}" created`);
  }
  await admin.disconnect();

  await producer.connect();
  console.log('Producer connected\n');

  const orders = [
    { id: 'ORD-001', item: 'Laptop',  price: 999 },
    { id: 'ORD-002', item: 'Mouse',   price: 29  },
    { id: 'ORD-003', item: 'Monitor', price: 399 },
    { id: 'ORD-004', item: 'Keyboard',price: 79  },
    { id: 'ORD-005', item: 'Webcam',  price: 59  },
    { id: 'ORD-006', item: 'Headset', price: 149 },
  ];

  for (const order of orders) {
    await producer.send({
      topic: TOPIC,
      messages: [{
        key:   order.id,
        value: JSON.stringify(order),
      }],
    });
    console.log(`Published order ${order.id} — ${order.item} ($${order.price})`);
  }

  await producer.disconnect();
  console.log('\nAll orders published.');
}

run().catch(console.error);
