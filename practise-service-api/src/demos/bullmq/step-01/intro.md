docker compose -f docker-compose.yml up -d  

terminal di folder infra: 
npx @bull-board/cli -r redis://localhost:6379

redis-cli --scan --pattern 'bull:order-food:*'
redis-cli LRANGE bull:order-food:wait 0 -1
redis-cli ZRANGE bull:order-food:prioritized 0 -1 WITHSCORES
redis-cli ZRANGE bull:order-food:delayed 0 -1 WITHSCORES
redis-cli HGETALL bull:order-food:1