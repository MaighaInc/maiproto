// sub.js
const amqp = require('amqplib');

(async () => {
  const conn = await amqp.connect('amqp://localhost:5672');
  const ch = await conn.createChannel();
  const ex = 'logs_fanout';

  await ch.assertExchange(ex, 'fanout', { durable: false });
  const q = await ch.assertQueue('', { exclusive: true });

  await ch.bindQueue(q.queue, ex, '');
  ch.consume(q.queue, msg => {
    console.log('Got:', msg.content.toString());
  }, { noAck: true });
})();