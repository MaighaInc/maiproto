// node 05replay/consumer.js beginning
// node 05replay/consumer.js offset 3
// node 05replay/consumer.js latest

const { Kafka } = require('kafkajs');

const MODE   = process.argv[2] || 'beginning';
const OFFSET = process.argv[3];

if (!['beginning', 'offset', 'latest'].includes(MODE)) {
  console.error('Usage: node consumer.js <beginning|offset|latest> [offsetNumber]');
  process.exit(1);
}

const kafka    = new Kafka({ clientId: 'replay-consumer', brokers: ['localhost:9093'] });
const consumer = kafka.consumer({ groupId: 'replay-group' });
const TOPIC    = 'sensor-topic';

async function run() {
  await consumer.connect();

  consumer.on(consumer.events.GROUP_JOIN, async () => {
    const partitions = consumer.assignment();

    for (const { topic, partition } of partitions) {
      let seekTo;

      if (MODE === 'beginning') {
        seekTo = '0';
        console.log(`[seek] partition ${partition} → offset 0 (beginning)\n`);
      } else if (MODE === 'offset') {
        seekTo = OFFSET || '0';
        console.log(`[seek] partition ${partition} → offset ${seekTo} (custom)\n`);
      } else {
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

  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  console.log(`Replay mode: "${MODE}" — waiting for messages...\n`);
  console.log('  offset | seq | value  | timestamp');
  console.log('  -------|-----|--------|--------------------------');

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ message }) => {
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

process.on('SIGINT', async () => { await consumer.disconnect(); process.exit(0); });
run().catch(console.error);
