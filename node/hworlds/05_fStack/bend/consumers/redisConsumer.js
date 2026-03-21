const { kafka, TOPIC } = require('../kafka');
const { updateRedisCache } = require('../redisClient');

async function startRedisConsumer() {
  const consumer = kafka.consumer({ groupId: 'redis-group' });
  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: true });

  consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log('[Redis Consumer] received:', event.type);
        await updateRedisCache(event);
      } catch (err) {
        console.error('[Redis Consumer] error (non-fatal):', err.message);
      }
    },
  });

  console.log('[Redis Consumer] started');
}

module.exports = { startRedisConsumer };
