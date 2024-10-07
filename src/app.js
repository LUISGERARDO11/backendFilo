/* This code snippet is setting up a basic Express server in Node.js. Here's a breakdown of what each
part does: */
const express = require('express');
const corsConfig = require('./config/corsConfig'); 
const errorHandler = require('./middlewares/errorHandler');
const app = express();

// Middleware para el manejo de JSON
app.use(express.json());

// Aplicar la configuración de CORS
app.use(corsConfig);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡Hola Mundo!');
});

// Middleware para manejar errores
app.use(errorHandler);

module.exports = app;
