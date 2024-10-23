/* This code snippet is a middleware function in Node.js that is used to verify the authentication of a
JWT token stored in a cookie. Here's a breakdown of what the code does: */
const jwt = require("jsonwebtoken");
require("dotenv").config();
//Importar modelos
const Session = require("../models/Session");
const User = require("../models/User");
//Importar servicios
const authService = require("../services/authService");

// Middleware para verificar la autenticación del token JWT desde cookies
// Middleware para verificar la autenticación del token JWT desde cookies
const authMiddleware = (req, res, next) => {
  const token = req.cookies['token']; // Extraer el token de la cookie
  console.log(req.cookies['token'])
  if (!token) {
    return res.status(401).json({ message: "Acceso no autorizado. Token no proporcionado." });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
          return res.sendStatus(403); // Token inválido o error de verificación
      }
      req.user = decoded; // Guarda el usuario decodificado en el objeto de la solicitud
      next(); // Continúa con el siguiente middleware
    });
  } catch (err) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
}

module.exports = authMiddleware;
