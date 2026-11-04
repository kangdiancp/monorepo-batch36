
 docker compose -f docker-compose.yml up -d

npx tsx worker.ts                         # worker + relay
npx tsx producer.ts                       # kirim 8 order (1 order kita kirim double)
npx tsx status.ts --watch