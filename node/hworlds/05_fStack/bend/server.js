const express = require('express');
const cors = require('cors');
const { createTable, insertMessage, getMessages, updateMessage, deleteMessage } = require('./db');
const { producer, startKafka } = require('./kafka');
const { client, requestCounter } = require('./metrics');

const app = express();
app.use(cors());
app.use(express.json());

createTable();
startKafka();

// CRUD Endpoints
app.post('/messages', async (req, res) => {
  requestCounter.inc();
  const { content } = req.body;
  await producer.send({ topic: 'hello-topic', messages: [{ value: content }] });
  res.json({ status: 'sent', content });
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
  const updated = await updateMessage(id, content);
  res.json(updated);
});

app.delete('/messages/:id', async (req, res) => {
  requestCounter.inc();
  const { id } = req.params;
  await deleteMessage(id);
  res.json({ status: 'deleted', id });
});

// Metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(4000, () => console.log('Backend running on port 4000'));