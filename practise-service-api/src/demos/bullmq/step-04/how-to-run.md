
 docker compose -f docker-compose.yml up -d

npx tsx worker.ts                         # worker + relay
npx tsx producer.ts                       # kirim 8 pesanan (satu sengaja dikirim dobel)
npx tsx status.ts --watch