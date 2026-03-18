const express = require('express');
const client = require('prom-client');

const app = express();
const register = new client.Registry();

client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);

app.get('/', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  setTimeout(() => {
    res.send('Hello World from Node.js 🚀');
    end({ method: 'GET', route: '/', status: 200 });
  }, Math.random() * 300);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3001, () => console.log('App running on port 3001'));