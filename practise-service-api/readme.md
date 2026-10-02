docker compose -f docker-compose.otel.yml exec kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:29092 --delete --topic lamaran-abc

docker compose -f docker-compose.otel.yml exec kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:29092 --delete --topic lamaran-xyz


npx tsx create-topic.ts
PIN_PARTITIONS=true npx tsx producer.ts   # cukup SEKALI
npx tsx consumer.ts abc  