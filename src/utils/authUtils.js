/* This JavaScript code snippet is defining a module that handles password-related functionalities.
Here's a breakdown of what the code is doing: */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let passwordList = new Set();

// Función auxiliar para verificar el estado de la rotación de contraseñas
exports.checkPasswordRotation = (fechaUltimoCambio) => {
  const seisMesesAntes = new Date();
  seisMesesAntes.setMonth(seisMesesAntes.getMonth() - 6); // Restar 6 meses (180 días)
  const warningPeriod = new Date();
  warningPeriod.setDate(warningPeriod.getDate() - 5); // Aviso si quedan 5 días o menos

  if (!fechaUltimoCambio || fechaUltimoCambio < seisMesesAntes) {
    // Si han pasado más de 6 meses, forzar el cambio de contraseña
    return {
      requiereCambio: true,
      message: "Debes cambiar tu contraseña. Han pasado más de 6 meses.",
    };
  }

  if (fechaUltimoCambio < warningPeriod) {
    // Si faltan menos de 7 días para que expiren los 6 meses, enviar una advertencia
    return {
      requiereCambio: false,
      warning: true,
      message: "Tu contraseña caduca pronto. Cámbiala en los próximos días.",
    };
  }

  // No se requiere cambio, ni advertencia
  return { requiereCambio: false, warning: false };
};
//Genera un codigo otp usando la libreria crypto
exports.generateOTP = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 caracteres en hexadecimal
};
// Función para cargar la lista de contraseñas
const loadPasswordList = () => {
  const filePath = path.join(
    __dirname,
    "..",
    "100k-most-used-passwords-NCSC.txt"
  );

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error al leer el archivo de contraseñas:", err);
      process.exit(1); // Salir si ocurre un error grave
    }
    // Almacena las contraseñas en un Set para búsquedas rápidas
    passwordList = new Set(data.split("\n").map((password) => password.trim()));
    console.log("Lista de contraseñas cargada correctamente");
  });
};
// Verificar si una contraseña está comprometida
exports.isPasswordCompromised = (password) => {
  return passwordList.has(password);
};
// Exportar la función para cargar la lista de contraseñas
exports.loadPasswordList = loadPasswordList;