import { createApp } from './app';
import { env } from './config/env';
import { checkDatabaseConnection, pool } from './db';

import { startGrpcServer } from './grpc/server';

async function bootstrap(): Promise<void> {
  await checkDatabaseConnection();
  console.log(' Koneksi PostgreSQL OK');

  // REST server (Fastify) 
  const app = await createApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`   REST server berjalan di http://localhost:${env.PORT}`);
  console.log(`   Health check : http://localhost:${env.PORT}/health`);
  console.log(`   API prefix   : ${env.API_PREFIX}`);

  //startGrpcServer(50051);
  const grpcServer = await startGrpcServer(env.GRPC_PORT ?? 50051);
  console.log(`   gRPC server  : 0.0.0.0:${env.GRPC_PORT ?? 50051}`);


  const shutdown = async (signal: string) => {
    console.log(`\n${signal} diterima, mematikan server dengan aman...`);

    await app.close();


    /**
      * saat exit gunakan Ctrl + C di terminal, tryShutdown() akan dicall
      * ini dilakukan untuk memastikan semua port yang dipakai di-relase
      * tidak ada yang menggantung, kita kasih waktu 5s pake timeout fallback, 
      * jika masih belum selesai kita paksa supaya di closed
    */
    await new Promise<void>((resolve) => {
      const forceTimeout = setTimeout(() => {
        console.warn('gRPC graceful shutdown timeout (5s), force shutdown...');
        grpcServer.forceShutdown();
        resolve();
      }, 5000);

      grpcServer.tryShutdown((err) => {
        clearTimeout(forceTimeout);
        if (err) {
          console.error('gRPC graceful shutdown gagal, force shutdown:', err);
          grpcServer.forceShutdown();
        } else {
          console.log('gRPC server ditutup.');
        }
        resolve();
      });
    });

    await pool.end();
    console.log('Pool database ditutup. See you!');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Gagal start aplikasi:', err);
  process.exit(1);
});
