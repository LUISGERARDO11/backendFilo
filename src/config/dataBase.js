/* This JavaScript code snippet is setting up a function called `connectDB` that is responsible for
establishing a connection to a MongoDB database using Mongoose. Here's a breakdown of what the code
is doing: */

const mongoose = require('mongoose');
require('dotenv').config(); 

// Conexión a MongoDB
const connectDB = async () => {
  try {
    
    const dbURI = process.env.MONGO_URI; // URI de MongoDB
    const dbName = process.env.DB_NAME; // Nombre de la base de datos

    // Conectar a MongoDB
    await mongoose.connect(dbURI, {
      dbName: dbName,
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conectado a MongoDB');

  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1); // Detener la ejecución de la aplicación en caso de error
  }
};

module.exports = connectDB;
