const express = require('express');
const cors = require('cors');
const { createTable, getMessages } = require('./db');
const { producer, initKafka, TOPIC } = require('./kafka');
const { startConsumers } = require('./consumers');
const { client, requestCounter } = require('./metrics');

const app = express();
app.use(cors());
app.use(express.json());

async function bootstrap() {
  await createTable();
  await initKafka();
  await startConsumers();

  // CRUD Endpoints
  app.post('/messages', async (req, res) => {
    requestCounter.inc();
    const { content } = req.body;
    await producer.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify({ type: 'message.created', content }) }],
    });
    res.json({ status: 'queued', content });
  });

  app.get('/messages', async (req, res) => {
    requestCounter.inc();
    const messages = await getMessages();
    res.json(messages);
  });

  app.put('/messages/:id', async (req, res) => {
    requestCounter.inc();
    const { id } = req.params;
    const { content } = req.body;
    await producer.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify({ type: 'message.updated', id: parseInt(id), content }) }],
    });
    res.json({ status: 'queued', id });
  });

  app.delete('/messages/:id', async (req, res) => {
    requestCounter.inc();
    const { id } = req.params;
    await producer.send({
      topic: TOPIC,
      messages: [{ value: JSON.stringify({ type: 'message.deleted', id: parseInt(id) }) }],
    });
    res.json({ status: 'queued', id });
  });

  // Metrics
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  app.listen(4000, () => console.log('Backend running on port 4000'));
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});