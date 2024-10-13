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
const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token; // Extraer el token de la cookie

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acceso no autorizado. Token no proporcionado." });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token inválido o expirado" });
    }

    const userId = decoded.user_id;

    // Verificar que la sesión esté activa en la base de datos
    const session = await Session.findOne({
      user_id: userId,
      token,
      revocada: false,
    });
    if (!session) {
      return res
        .status(401)
        .json({ message: "Sesión no válida o token revocado." });
    }

    // Verificar si el usuario existe y está activo
    const user = await User.findById(userId);
    if (!user || user.estado !== "activo") {
      return res
        .status(403)
        .json({ message: "Usuario no autorizado o inactivo." });
    }

    // Renovar el token si está a menos de 15 minutos de expirar
    const expirationThreshold = 15 * 60; // 15 minutos en segundos
    if (decoded.exp - Date.now() / 1000 < expirationThreshold) {
      const newToken = authService.generateJWT(user); // Usar el método del servicio para generar el nuevo token

      // Establecer la nueva cookie con el token renovado
      res.cookie("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 3600000, // 1 hora
      });
    }

    // Añadir la información del usuario a la solicitud
    req.user = { user_id: userId, tipo_usuario: user.tipo_usuario };
    req.token = token;

    // Actualizar la última actividad de la sesión
    session.ultima_actividad = new Date();
    await session.save();

    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: "Token inválido o expirado", error: error.message });
  }
};

module.exports = authMiddleware;
