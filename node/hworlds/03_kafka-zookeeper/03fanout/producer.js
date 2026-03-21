const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'fanout-producer', brokers: ['localhost:9093'] });
const admin    = kafka.admin();
const producer = kafka.producer();
const TOPIC    = 'orders-topic';

async function run() {
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
    { id: 'ORD-001', item: 'Laptop',   price: 999 },
    { id: 'ORD-002', item: 'Mouse',    price: 29  },
    { id: 'ORD-003', item: 'Monitor',  price: 399 },
    { id: 'ORD-004', item: 'Keyboard', price: 79  },
    { id: 'ORD-005', item: 'Webcam',   price: 59  },
    { id: 'ORD-006', item: 'Headset',  price: 149 },
  ];

  for (const order of orders) {
    await producer.send({
      topic: TOPIC,
      messages: [{ key: order.id, value: JSON.stringify(order) }],
    });
    console.log(`Published order ${order.id} — ${order.item} ($${order.price})`);
  }

  await producer.disconnect();
  console.log('\nAll orders published.');
}

run().catch(console.error);
