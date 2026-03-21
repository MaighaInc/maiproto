const { Kafka } = require('kafkajs');

const kafka    = new Kafka({ clientId: 'manual-commit-consumer', brokers: ['localhost:9093'] });
const consumer = kafka.consumer({ groupId: 'payments-group' });
const TOPIC    = 'payments-topic';

async function processPayment(payment) {
  await new Promise(r => setTimeout(r, 300));
  if (payment.fail) throw new Error(`Payment gateway rejected ${payment.id}`);
  console.log(`  ✓ Processed ${payment.id}  $${payment.amount}`);
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });
  console.log('Consumer started (manual commit mode)\n');

  await consumer.run({
    autoCommit: false,

    eachMessage: async ({ topic, partition, message }) => {
      const payment = JSON.parse(message.value.toString());
      console.log(`Received ${payment.id}  fail=${payment.fail}`);

      try {
        await processPayment(payment);
        await consumer.commitOffsets([{
          topic,
          partition,
          offset: (BigInt(message.offset) + 1n).toString(),
        }]);
        console.log(`  ✔ Offset ${message.offset} committed\n`);
      } catch (err) {
        console.error(`  ✗ FAILED: ${err.message}`);
        console.error(`    Offset ${message.offset} NOT committed — will retry on next start\n`);
        await consumer.disconnect();
        process.exit(1);
      }
    },
  });
}

process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
run().catch(console.error);
