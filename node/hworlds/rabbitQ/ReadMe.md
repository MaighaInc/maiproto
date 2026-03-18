4️⃣ README.md (Quick Test Instructions)
# RabbitMQ Node Examples

## Setup
1. Start RabbitMQ:

docker-compose up -d

2. Install dependencies:

npm install

3. Open dashboard: http://localhost:15672 (guest/guest)

## Run Patterns

### 1. Work Queue
- Run consumers in 2 terminals:

node src/work-queue/consumer.js

- Send tasks:

node src/work-queue/producer.js Task1


### 2. Pub/Sub
- Run subscribers in 2 terminals:

node src/pub-sub/subscriber.js

- Publish message:

node src/pub-sub/publisher.js


### 3. Direct Routing
- Run consumer for `error` key:

node src/direct-routing/consumer.js error

- Publish:

node src/direct-routing/publisher.js error


### 4. Topic Routing
- Consumer for `user.*`:

node src/topic-routing/consumer.js user.*

- Publish:

node src/topic-routing/publisher.js user.created


### 5. Dead-Letter Queue
- Run DLQ consumer:

node src/dead-letter/dlq.js

- Send a message to `main_q` using work queue producer.

### 6. Retry Queue
- Run retry script:

node src/retry/retry.js

- Send a failing message via work queue producer.

### 7. Priority Queue
- Run priority script:

node src/priority/priority.js

- Observe `HIGH` processed before `low`.

---

All queues visible in RabbitMQ dashboard.