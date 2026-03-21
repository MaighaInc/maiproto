const amqp = require('amqplib');

async function receiveMessage() {
  try {
    const connection = await amqp.connect('amqp://localhost:5672');
    const channel = await connection.createChannel();

    const queue = 'task_queue';

    await channel.assertQueue(queue, { durable: true });

    channel.prefetch(1); // fair dispatch

    console.log("Waiting for messages...");

    channel.consume(queue, (msg) => {
      const content = msg.content.toString();
      console.log("Received:", content);

      // simulate work
      setTimeout(() => {
        console.log("Processed:", content);
        channel.ack(msg); // acknowledge
      }, 1000);
    }, {
      noAck: false
    });

  } catch (err) {
    console.error(err);
  }
}

receiveMessage();