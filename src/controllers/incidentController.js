/* This code snippet is a JavaScript function that is part of a Node.js application. Here's a breakdown
of what it does: */
const incidentUtils = require('../utils/incidentUtils');

// Obtener el historial de intentos fallidos de inicio de sesión
exports.getFailedLoginAttempts = async (req, res) => {
    try {
        // Llamar a la función en utils para obtener los intentos fallidos
        const { clientes, administradores } = await incidentUtils.getFailedAttemptsData();

        // Devolver la respuesta con los usuarios clasificados
        res.status(200).json({
            clientes,
            administradores
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los intentos fallidos', error: error.message });
    }
};
