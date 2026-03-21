// pub.js
const amqp = require('amqplib');

(async () => {
  const conn = await amqp.connect('amqp://localhost:5672');
  const ch = await conn.createChannel();
  const ex = 'logs_fanout';

  await ch.assertExchange(ex, 'fanout', { durable: false });
  ch.publish(ex, '', Buffer.from('Hello all!'));
  console.log('Published');
  setTimeout(() => conn.close(), 300);
})();