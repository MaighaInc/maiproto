// work_consumer.js
const amqp = require('amqplib');

(async () => {
  const conn = await amqp.connect('amqp://localhost:5672');
  const ch = await conn.createChannel();
  const q = 'work_q';

  await ch.assertQueue(q, { durable: true });
  ch.prefetch(1); // fair dispatch

  ch.consume(q, async (msg) => {
    const job = msg.content.toString();
    console.log('Working on:', job);
    await new Promise(r => setTimeout(r, 1000));
    ch.ack(msg);
  }, { noAck: false });
})();