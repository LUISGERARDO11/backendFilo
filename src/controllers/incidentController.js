/* This code snippet is a JavaScript function that is part of a Node.js application. Here's a breakdown
of what it does: */
const incidentUtils = require('../utils/incidentUtils');
const loggerUtils = require('../utils/loggerUtils');
const Account = require('../models/Account');

// Obtener el historial de intentos fallidos de inicio de sesión
exports.getFailedLoginAttempts = async (req, res) => {
    const { periodo } = req.query; // Obtener el parámetro de periodo de tiempo (día, semana, mes)

    try {
        // Llamar a la función en utils para obtener los intentos fallidos en base al periodo
        const { clientes, administradores } = await incidentUtils.getFailedAttemptsData(periodo);

        // Devolver la respuesta con los usuarios clasificados
        res.status(200).json({
            clientes,
            administradores
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los intentos fallidos', error: error.message });
    }
};

// Actualizar el máximo de intentos fallidos de inicio de sesión
exports.updateMaxFailedLoginAttempts = async (req, res) => {
    const { maxAttempts } = req.body;

    // Validar que el número de intentos fallidos esté en el rango permitido
    if (!Number.isInteger(maxAttempts) || maxAttempts < 2 || maxAttempts > 100) {
        return res.status(400).json({
            message: 'El valor de intentos fallidos debe ser un número entre 2 y 100.'
        });
    }

    try {
        // Actualizar el campo maximo_intentos_fallidos_login en todas las cuentas
        const result = await Account.updateMany({}, { $set: { 'maximo_intentos_fallidos_login': maxAttempts } });

        return res.status(200).json({
            message: `Se ha actualizado el máximo de intentos fallidos a ${maxAttempts} en todas las cuentas.`,
            modifiedCount: result.nModified // Mostrar cuántas cuentas fueron modificadas
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Error al actualizar el máximo de intentos fallidos.',
            error: error.message
        });
    }
};