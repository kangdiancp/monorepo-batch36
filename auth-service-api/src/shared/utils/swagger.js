const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.1.0',           // Versi OpenAPI terbaru
        info: {
            title: 'API Documentation',
            version: '1.0.0',
            description: 'Dokumentasi API Express.js dengan Swagger',
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server',
            },
        ],
    },
    apis: ['./routes/*.js'],       // Path ke file route
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;