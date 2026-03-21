const { startDbConsumer } = require('./dbConsumer');
const { startRedisConsumer } = require('./redisConsumer');

async function startConsumers() {
  await startDbConsumer();
  await startRedisConsumer();
  console.log('All consumers started');
}

module.exports = { startConsumers };
