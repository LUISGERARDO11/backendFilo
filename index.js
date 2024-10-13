/**
 * The function starts a server by connecting to a database and listening on a specified port.
 */
const app = require("./src/app"); // Importar la configuración de la app
const connectDB = require("./src/config/dataBase"); // Importar la función de conexión a la base de datos

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log("Conexión a la base de datos establecida correctamente.");

    // Iniciar el servidor
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
  }
}

startServer();
