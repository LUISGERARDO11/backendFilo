/* This code snippet is setting up a Node.js Express application. Here's a breakdown of what it does: */
const express = require('express');
const corsConfig = require('./config/corsConfig'); 
const errorHandler = require('./middlewares/errorHandler');
const { generalLimiter } = require('./middlewares/expressRateLimit');
const cookieParser = require('cookie-parser');
const authUtils = require('./utils/authUtils');
// Importar las rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware para el manejo de JSON
app.use(express.json());

// Aplicar la configuración de CORS
app.use(corsConfig);

// Aplicar el limitador general a todas las rutas
app.use(generalLimiter);

// Configura cookie-parser
app.use(cookieParser());

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

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;

