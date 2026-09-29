const express = require('express');
const config = require('../config');
const path = require('path');
const routes = require('./routes');
const globalErrorHandler = require('./shared/middlewares/errorHandler');
const notFound = require('./shared/middlewares/notFound');
//const { generalLimiter } = require('./shared/middlewares/rateLimiter');

//1.setup swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger-output.json');

const app = express();

// serving static files, untuk localstorage kita simpan di folder uploads
app.use(
  `/${config.storage.local.uploadDir}`,
  express.static(path.resolve(process.cwd(), config.storage.local.uploadDir))
);

//Middleware 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy — penting untuk dapat IP asli di belakang load balancer/Docker
app.set('trust proxy', 1);

// General rate limiter untuk semua route
//app.use(generalLimiter);

//Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    env: config.app.env,
    db: 'postgresql',
    orm: 'sequelize',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  }
}));

//API Routes 
app.use(config.app.prefix, routes);

//404
app.use(notFound);

//Global Error Handler 
app.use(globalErrorHandler);


module.exports = app;
