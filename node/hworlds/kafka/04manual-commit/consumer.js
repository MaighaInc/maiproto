// 04manual-commit / consumer.js
//
// KEY SETTINGS:
//   autoCommit: false  → KafkaJS will NEVER advance the offset automatically.
//   eachBatchAutoResolve: false → we resolve/commit per-message manually.
//
// FLOW for each message:
//   1. Receive message
//   2. Do the work (process payment)
//   3. ONLY IF work succeeded → commitOffsets()
//   4. If work fails → throw (do NOT commit) → message will be re-delivered
//
// RUN INSTRUCTIONS:
//   Step 1: node 04manual-commit/producer.js   (sends 5 payments, one is bad)
//   Step 2: node 04manual-commit/consumer.js   (crashes on PAY-003)
//   Step 3: node 04manual-commit/consumer.js   (restarts from PAY-003, not PAY-001)
//
// Without manual commit, PAY-003 would be silently skipped after the crash.

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'manual-commit-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({
  groupId:    'payments-group',
  // ─── disable auto-commit ──────────────────────────────────────────────
  // (also set in consumer.run below — both are needed)
});

const TOPIC = 'payments-topic';

async function processPayment(payment) {
  // Simulate async work (e.g. hitting a payment gateway)
  await new Promise(r => setTimeout(r, 300));

  if (payment.fail) {
    throw new Error(`Payment gateway rejected ${payment.id}`);
  }

  console.log(`  ✓ Processed ${payment.id}  $${payment.amount}`);
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  console.log('Consumer started (manual commit mode)\n');

  await consumer.run({
    // ─── THIS IS THE KEY FLAG ─────────────────────────────────────────
    autoCommit: false,
    // ─────────────────────────────────────────────────────────────────

    eachMessage: async ({ topic, partition, message, heartbeat, commitOffsetsIfNecessary, resolveOffset }) => {
      const payment = JSON.parse(message.value.toString());
      console.log(`Received ${payment.id}  fail=${payment.fail}`);

      try {
        await processPayment(payment);

        // ── Commit ONLY after successful processing ──────────────────
        // offset to commit = current message offset + 1
        await consumer.commitOffsets([{
          topic,
          partition,
          offset: (BigInt(message.offset) + 1n).toString(),
        }]);
        console.log(`  ✔ Offset ${message.offset} committed\n`);

      } catch (err) {
        // ── Do NOT commit → this offset will be re-delivered on restart
        console.error(`  ✗ FAILED: ${err.message}`);
        console.error(`    Offset ${message.offset} NOT committed — will retry on next start\n`);
        // Disconnect so the crash is visible (in production you'd use a retry/DLQ)
        await consumer.disconnect();
        process.exit(1);
      }
    },
  });
}

process.on('SIGINT', async () => {
  await consumer.disconnect();
  process.exit(0);
});

run().catch(console.error);
