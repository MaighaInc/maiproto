// direct_pub.js
const amqp = require('amqplib');

(async () => {
  const ch = await (await amqp.connect('amqp://localhost:5672')).createChannel();
  const ex = 'logs_direct';
  await ch.assertExchange(ex, 'direct', { durable: false });

  const level = process.argv[2] || 'info';
  ch.publish(ex, level, Buffer.from(`Message: ${level}`));
  console.log('Sent:', level);
})();