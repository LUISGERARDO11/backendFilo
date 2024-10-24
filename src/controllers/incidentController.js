/* This code snippet is a JavaScript function that is part of a Node.js application. Here's a breakdown
of what it does: */
const { body, validationResult } = require('express-validator');
const incidentUtils = require('../utils/incidentUtils');
const loggerUtils = require('../utils/loggerUtils');
const Account = require('../models/Account');
const User = require('../models/User');
const Config = require('../models/Config');

// Obtener el historial de intentos fallidos de inicio de sesión
exports.getFailedLoginAttempts = async (req, res) => {
    const { periodo } = req.query; // Obtener el parámetro de periodo de tiempo (día, semana, mes)

    try {
        // Llamar a la función en utils para obtener los intentos fallidos en base al periodo
        const { clientes, administradores } = await incidentUtils.getFailedAttemptsData(periodo);

        // Registrar evento de seguridad: consulta de intentos fallidos de inicio de sesión
        loggerUtils.logSecurityEvent(req.user ? req.user._id : 'admin', 'failed-login-attempts', 'view', `Consulta de intentos fallidos en el periodo ${periodo}.`);

        // Devolver la respuesta con los usuarios clasificados
        res.status(200).json({
            clientes,
            administradores
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener los intentos fallidos', error: error.message });
    }
};

//ACTUALIZAR
// Actualizar el máximo de intentos fallidos de inicio de sesión
exports.updateMaxFailedLoginAttempts = async (req, res) => {
    const { maxAttempts } = req.body;

    // Validar que el número de intentos fallidos esté en el rango permitido
    if (!Number.isInteger(maxAttempts) || maxAttempts < 3 || maxAttempts > 10) {
        return res.status(400).json({
            message: 'El valor de intentos fallidos debe ser un número entre 3 y 10.'
        });
    }

    try {
        // Actualizar el campo maximo_intentos_fallidos_login en la colección Config
        const result = await Config.findOneAndUpdate({}, { $set: { maximo_intentos_fallidos_login: maxAttempts } }, { new: true });

        if (!result) {
            return res.status(404).json({
                message: 'No se encontró la configuración global para actualizar.'
            });
        }

        // Registrar evento de seguridad: actualización del máximo de intentos fallidos
        loggerUtils.logSecurityEvent(req.user ? req.user._id : 'admin', 'config-settings', 'update', `Actualización del máximo de intentos fallidos a ${maxAttempts}.`);

        return res.status(200).json({
            message: `Se ha actualizado el máximo de intentos fallidos a ${maxAttempts} en la configuración global.`,
            config: result // Devolver la configuración actualizada
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        return res.status(500).json({
            message: 'Error al actualizar el máximo de intentos fallidos.',
            error: error.message
        });
    }
};

//Actualizar los tiempos de vida de tokens y codigos
exports.updateTokenLifetime = [
    // Validar y sanitizar entradas
    body('jwt_lifetime')
        .isInt({ min: 300, max: 2592000 }) // JWT entre 5 minutos y 30 días
        .withMessage('El tiempo de vida del JWT debe estar entre 5 minutos y 30 días.')
        .toInt(), // Convertir a entero
    body('verificacion_correo_lifetime')
        .isInt({ min: 300, max: 2592000 }) // Tiempo de vida del enlace de verificación entre 5 minutos y 30 días
        .withMessage('El tiempo de vida del enlace de verificación debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('otp_lifetime')
        .isInt({ min: 60, max: 1800 }) // OTP entre 1 minuto y 30 minutos
        .withMessage('El tiempo de vida del OTP debe estar entre 1 minuto y 30 minutos.')
        .toInt(),
    body('sesion_lifetime')
        .isInt({ min: 300, max: 2592000 }) // Sesión entre 5 minutos y 30 días
        .withMessage('El tiempo de vida de la sesión debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('cookie_lifetime')
        .isInt({ min: 300, max: 2592000 }) // Cookie entre 5 minutos y 30 días
        .withMessage('El tiempo de vida de la cookie debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('expirationThreshold_lifetime')
        .isInt({ min: 60, max: 1800 }) // expirationThreshold entre 1 minuto y 30 minutos
        .withMessage('El tiempo de vida de expirationThreshold debe estar entre 1 minuto y 30 minutos.')
        .toInt(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { jwt_lifetime, verificacion_correo_lifetime, otp_lifetime, sesion_lifetime } = req.body;

        try {
            // Actualizar la configuración
            const config = await Config.findOneAndUpdate(
                {}, // No especificamos un filtro ya que es una colección de un solo documento
                {
                    jwt_lifetime,
                    verificacion_correo_lifetime,
                    otp_lifetime,
                    sesion_lifetime
                },
                { new: true, upsert: true } // Retornar el documento actualizado y crear si no existe
            );

            // Registrar la actividad de actualización de configuración
            loggerUtils.logUserActivity(req.user ? req.user._id : 'admin', 'update', `Configuración de tiempos de expiración actualizada.`);

            res.status(200).json({ message: 'Configuración actualizada correctamente.', config });
        } catch (error) {
            loggerUtils.logCriticalError(error);
            res.status(500).json({ message: 'Error al actualizar la configuración.', error: error.message });
        }
    }
];


// Controlador para que el administrador desbloquee una cuenta
exports.adminUnlockUser = async (req, res) => {
    const { userId } = req.params;
  
    try {
      const user = await User.findById(userId);
      if (!user || user.estado !== 'bloqueado_permanente') {
        return res.status(400).json({ message: 'El usuario no está bloqueado permanentemente o no existe.' });
      }
  
      // Desbloquear al usuario
      user.estado = 'activo';
      await user.save();
  
      // Limpiar los intentos fallidos
      await FailedAttempt.updateMany({ user_id: userId }, { $set: { is_resolved: true } });
  
      loggerUtils.logUserActivity(req.user._id, 'admin_unlock', `El usuario ${userId} fue desbloqueado por un administrador.`);
      return res.status(200).json({ message: 'Usuario desbloqueado exitosamente.' });
    } catch (error) {
      loggerUtils.logCriticalError(error);
      return res.status(500).json({ message: 'Error al desbloquear al usuario.', error: error.message });
    }
  };

// Obtener la configuración existente
exports.getConfig = async (req, res) => {
    try {
        const config = await Config.findOne();

        if (!config) {
            return res.status(404).json({ message: 'No se encontró ninguna configuración.' });
        }

        res.status(200).json({ config });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener la configuración.', error: error.message });
    }
};
