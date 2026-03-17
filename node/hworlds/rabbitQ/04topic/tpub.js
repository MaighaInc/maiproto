// topic_pub.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost:5672')).createChannel();
  const ex = 'topic_logs';
  await ch.assertExchange(ex, 'topic', { durable: false });

  const key = process.argv[2] || 'user.created';
  ch.publish(ex, key, Buffer.from(`Event: ${key}`));
  console.log('Sent:', key);
})();