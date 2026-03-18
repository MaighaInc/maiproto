# 01 — Partitions & Keys

Same concept as `kafka/01partitions/` — see that README for the full explanation.

## Zookeeper's role here

When the Admin API creates `keyed-topic` with 3 partitions, Kafka writes that configuration to **Zookeeper**. You can verify it by exec-ing into the Zookeeper container:

```bash
docker exec -it zookeeper bash
# inside container:
bin/zkCli.sh -server localhost:2181
ls /brokers/topics
get /brokers/topics/keyed-topic
```

In KRaft mode that metadata lives inside the broker's own log. In Zookeeper mode it lives in `/brokers/topics/<name>` in the ZK tree.

## Run it

```bash
node 01partitions/producer.js
node 01partitions/consumer.js
```

Same output as the KRaft version — same keys hash to the same partitions because the partitioner (murmur2) is independent of the cluster mode.
