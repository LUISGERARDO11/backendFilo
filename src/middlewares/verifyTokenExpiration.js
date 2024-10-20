/* This code snippet is a middleware function in Node.js that is used to verify the expiration of a
JSON Web Token (JWT) extracted from the request object. Here's a breakdown of what the code does: */
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
require('dotenv').config();

// Middleware para verificar la expiración del token
exports.verifyTokenExpiration = async (req, res, next) => {
  const token = req.token; // Token extraído desde `authMiddleware`

  try {
    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err && err.name === "TokenExpiredError") {
        // Si el token ha expirado, marcar la sesión como revocada
        await Session.findOneAndUpdate({ token }, { revocada: true });

        return res
          .status(401)
          .json({ message: "Token expirado. Tu sesión ha sido revocada." });
      }
      // Si el token es válido, continuar con la solicitud
      next();
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al verificar el token", error: error.message });
  }
};
