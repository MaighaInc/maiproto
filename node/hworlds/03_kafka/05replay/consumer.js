// 05replay / consumer.js
//
// Three replay modes — pass as a CLI argument:
//
//   node 05replay/consumer.js beginning     → replay ALL messages from offset 0
//   node 05replay/consumer.js offset 3      → replay from a specific offset number
//   node 05replay/consumer.js latest        → only NEW messages (no replay)
//
// HOW IT WORKS:
//   KafkaJS exposes a "seek" API inside the `partitionsAssigned` event.
//   After the partition is assigned (but before messages flow), we call
//   consumer.seek({ topic, partition, offset }) to pin the start position.
//
// IMPORTANT: seek() overrides any committed offset for this session.
// The group's stored offset in Kafka is NOT permanently changed —
// next restart will go back to the committed position unless you seek again.

const { Kafka } = require('kafkajs');

const MODE   = process.argv[2] || 'beginning';
const OFFSET = process.argv[3];           // only used in "offset" mode

if (!['beginning', 'offset', 'latest'].includes(MODE)) {
  console.error('Usage: node consumer.js <beginning|offset|latest> [offsetNumber]');
  process.exit(1);
}

const kafka = new Kafka({
  clientId: 'replay-consumer',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'replay-group' });
const TOPIC    = 'sensor-topic';

async function run() {
  await consumer.connect();

  // ── Seek happens here — BEFORE messages start flowing ─────────────────
  consumer.on(consumer.events.GROUP_JOIN, async () => {
    const partitions = consumer.assignment();            // partitions assigned to this instance

    for (const { topic, partition } of partitions) {
      let seekTo;

      if (MODE === 'beginning') {
        seekTo = '0';
        console.log(`[seek] partition ${partition} → offset 0 (beginning)\n`);

      } else if (MODE === 'offset') {
        seekTo = OFFSET || '0';
        console.log(`[seek] partition ${partition} → offset ${seekTo} (custom)\n`);

      } else {
        // 'latest' — seek to the high-watermark (end of log)
        // We use a special Admin call to find the latest offset
        const admin = kafka.admin();
        await admin.connect();
        const offsets = await admin.fetchTopicOffsets(TOPIC);
        await admin.disconnect();
        const hi = offsets.find(o => o.partition === partition)?.high || '0';
        seekTo = hi;
        console.log(`[seek] partition ${partition} → offset ${seekTo} (latest)\n`);
      }

      consumer.seek({ topic, partition, offset: seekTo });
    }
  });
  // ──────────────────────────────────────────────────────────────────────

  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  console.log(`Replay mode: "${MODE}"  — waiting for messages...\n`);
  console.log('  offset | seq | value  | timestamp');
  console.log('  -------|-----|--------|--------------------------');

  await consumer.run({
    autoCommit: false,          // don't advance the stored offset — pure read
    eachMessage: async ({ partition, message }) => {
      const r = JSON.parse(message.value.toString());
      console.log(
        `  ${String(message.offset).padEnd(6)} | ` +
        `${String(r.seq).padEnd(3)} | ` +
        `${String(r.value + '°C').padEnd(6)} | ` +
        r.ts
      );
    },
  });
}

process.on('SIGINT', async () => {
  await consumer.disconnect();
  process.exit(0);
});

run().catch(console.error);
