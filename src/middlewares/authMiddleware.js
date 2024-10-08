/* This code snippet is defining a middleware function called `authMiddleware` in Node.js that is
responsible for verifying the authentication of a JSON Web Token (JWT) provided in the request
headers. Here's a breakdown of what the code is doing: */

const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');
require('dotenv').config(); // Para acceder al secreto JWT

// Middleware para verificar la autenticación del token JWT
const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado. Token no proporcionado.' });
    }

    try {
        // Verificar el token JWT y extraer los datos del payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.user_id;

        // Verificar que la sesión esté activa en la base de datos
        const session = await Session.findOne({ user_id: userId, token, revocada: false });
        if (!session) {
            return res.status(401).json({ message: 'Sesión no válida o token revocado.' });
        }

        // Verificar si el usuario existe y está activo
        const user = await User.findById(userId);
        if (!user || user.estado !== 'activo') {
            return res.status(403).json({ message: 'Usuario no autorizado o inactivo.' });
        }

        // Añadir la información del usuario a la solicitud para que esté disponible en las rutas
        req.user = { user_id: userId, tipo_usuario: user.tipo_usuario };

        // Actualizar la última actividad de la sesión
        session.ultima_actividad = new Date();
        await session.save();

        // Pasar el control a la siguiente función
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado', error: error.message });
    }
};

module.exports = authMiddleware;
