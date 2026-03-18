// 03fanout / consumer.js
//
// HOW TO USE:
//   Run this TWICE in two separate terminals, passing a different service name:
//
//     node 03fanout/consumer.js billing
//     node 03fanout/consumer.js inventory
//
// Each gets its OWN groupId → Kafka treats them as independent subscribers.
// Both will receive every message from "orders-topic".
//
// CONTRAST WITH 02consumer-groups:
//   02 → same groupId  → messages SPLIT   between consumers (load balance)
//   03 → diff groupId  → messages COPIED  to every group   (fan-out / pub-sub)

const { Kafka } = require('kafkajs');

const SERVICE = process.argv[2];
if (!SERVICE) {
  console.error('Usage: node consumer.js <service-name>');
  console.error('Example: node consumer.js billing');
  process.exit(1);
}

const kafka = new Kafka({
  clientId: `${SERVICE}-client`,
  brokers: ['localhost:9092'],
});

// Each service has its own groupId — that is the entire secret of fan-out
const consumer = kafka.consumer({ groupId: `${SERVICE}-group` });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders-topic', fromBeginning: true });

  console.log(`[${SERVICE}] Subscribed to orders-topic (group: ${SERVICE}-group)\n`);

  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const order = JSON.parse(message.value.toString());

      // Each service "does" something different with the same event
      if (SERVICE === 'billing') {
        console.log(`[billing]   💳  Charging $${order.price} for ${order.id} (${order.item})`);
      } else if (SERVICE === 'inventory') {
        console.log(`[inventory] 📦  Reserving stock for ${order.id} (${order.item})`);
      } else {
        console.log(`[${SERVICE}] Received:`, order);
      }
    },
  });
}

process.on('SIGINT', async () => {
  await consumer.disconnect();
  process.exit(0);
});

run().catch(console.error);
