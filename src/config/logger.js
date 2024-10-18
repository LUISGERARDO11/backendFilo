const { createLogger, format, transports } = require('winston');
require('dotenv').config();

const logger = createLogger({
    level: 'info', // Captura información general y errores
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.errors({ stack: true }), // Captura errores con stack trace
        format.splat(),
        format.json()
    ),
    transports: [
        new transports.Console({ level: 'info' }), // Registra en consola
        new transports.File({ filename: 'logs/error.log', level: 'error' }), // Solo errores
        new transports.File({ filename: 'logs/combined.log' }) // Todos los logs
    ],
});

// En producción, limitar a solo errores en la consola
if (process.env.NODE_ENV === 'production') {
    logger.add(new transports.Console({ format: format.simple(), level: 'error' }));
}

module.exports = logger;
