/* This code snippet is setting up a Node.js Express application. Here's a breakdown of what it's
doing: */
const express = require('express');
const cookieParser = require('cookie-parser');
const corsConfig = require('./config/corsConfig'); 
const morgan = require('morgan');
//Importar el logger
const logger = require('./config/logger');
// Importar los middlewares
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/expressRateLimit');
//Importar utilidades
const authUtils = require('./utils/authUtils');
// Importar las rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const companyRoutes = require('./routes/companyRoutes');
const infoPublicRoutes = require('./routes/publicInformationRoutes');
const regulatoryDocumentRoutes = require('./routes/regulatoryDocumentRoutes');
const emailTypeRoutes = require('./routes/emailTypeRoutes');
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');

const app = express();

// Middleware para el manejo de JSON
app.use(express.json());

// Aplicar la configuración de CORS
app.use(corsConfig);

// Aplicar el limitador general a todas las rutas
app.use(generalLimiter);

// Configura cookie-parser
app.use(cookieParser());

// Integrar Morgan con Winston para registrar las solicitudes HTTP
app.use(morgan('combined', {
  stream: {
      write: (message) => logger.info(message.trim()) // Enviar logs de solicitudes HTTP a Winston
  }
}));

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

// Cargar la lista de contraseñas filtradas al iniciar la aplicación
authUtils.loadPasswordList();

// Rutas de autenticación y usuarios
app.use('/auth', authRoutes); // Rutas de autenticación (registro, login)
app.use('/users', userRoutes); // Rutas de usuarios autenticados (perfil)
app.use('/admin', adminRoutes);
app.use('/company', companyRoutes);
app.use('/public', infoPublicRoutes);
app.use('/regulatory', regulatoryDocumentRoutes);
app.use('/email-types', emailTypeRoutes);
app.use('/email-templates', emailTemplateRoutes);

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;