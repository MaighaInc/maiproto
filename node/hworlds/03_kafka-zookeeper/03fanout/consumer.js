// node 03fanout/consumer.js billing
// node 03fanout/consumer.js inventory

const { Kafka } = require('kafkajs');

const SERVICE = process.argv[2];
if (!SERVICE) {
  console.error('Usage: node consumer.js <service-name>  e.g. billing | inventory | email');
  process.exit(1);
}

const kafka    = new Kafka({ clientId: `${SERVICE}-client`, brokers: ['localhost:9093'] });
const consumer = kafka.consumer({ groupId: `${SERVICE}-group` });

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders-topic', fromBeginning: true });
  console.log(`[${SERVICE}] Subscribed to orders-topic (group: ${SERVICE}-group)\n`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      const order = JSON.parse(message.value.toString());
      if (SERVICE === 'billing')   console.log(`[billing]   💳  Charging $${order.price} for ${order.id} (${order.item})`);
      else if (SERVICE === 'inventory') console.log(`[inventory] 📦  Reserving stock for ${order.id} (${order.item})`);
      else console.log(`[${SERVICE}] Received:`, order);
    },
  });
}

process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
run().catch(console.error);
