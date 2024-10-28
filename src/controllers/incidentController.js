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

//Actualizar los tiempos de vida de tokens y codigos
exports.updateTokenLifetime = [
    // Validación de cada campo con límites especificados
    body('jwt_lifetime')
        .optional()
        .isInt({ min: 300, max: 2592000 })
        .withMessage('El tiempo de vida del JWT debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('verificacion_correo_lifetime')
        .optional()
        .isInt({ min: 300, max: 2592000 })
        .withMessage('El tiempo de vida del enlace de verificación debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('otp_lifetime')
        .optional()
        .isInt({ min: 60, max: 1800 })
        .withMessage('El tiempo de vida del OTP debe estar entre 1 y 30 minutos.')
        .toInt(),
    body('sesion_lifetime')
        .optional()
        .isInt({ min: 300, max: 2592000 })
        .withMessage('El tiempo de vida de la sesión debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('cookie_lifetime')
        .optional()
        .isInt({ min: 300, max: 2592000 })
        .withMessage('El tiempo de vida de la cookie debe estar entre 5 minutos y 30 días.')
        .toInt(),
    body('expirationThreshold_lifetime')
        .optional()
        .isInt({ min: 60, max: 1800 })
        .withMessage('El tiempo de vida de expirationThreshold debe estar entre 1 y 30 minutos.')
        .toInt(),
    body('maximo_intentos_fallidos_login')
        .optional()
        .isInt({ min: 3, max: 10 })
        .withMessage('El valor de intentos fallidos debe estar entre 3 y 10.')
        .toInt(),
    body('maximo_bloqueos_en_n_dias')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('El número máximo de bloqueos en N días debe estar entre 1 y 10.')
        .toInt(),
    body('dias_periodo_de_bloqueo')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('El periodo de días para el bloqueo debe estar entre 1 y 365 días.')
        .toInt(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Construir dinámicamente el objeto de actualización
        const updateFields = {};
        const allowedFields = [
            'jwt_lifetime',
            'verificacion_correo_lifetime',
            'otp_lifetime',
            'sesion_lifetime',
            'cookie_lifetime',
            'expirationThreshold_lifetime',
            'maximo_intentos_fallidos_login',
            'maximo_bloqueos_en_n_dias',
            'dias_periodo_de_bloqueo'
        ];

        // Solo añadir a updateFields los campos que se recibieron en la solicitud
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateFields[field] = req.body[field];
            }
        });

        // Validar si no se recibieron campos para actualizar
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({ message: 'No se proporcionaron campos para actualizar.' });
        }

        try {
            const config = await Config.findOneAndUpdate(
                {}, // Asumiendo que solo hay un documento de configuración
                { $set: updateFields }, // Actualizar solo los campos proporcionados
                { new: true, upsert: true } // Retornar el documento actualizado, crear si no existe
            );

            // Registrar la actividad de actualización
            loggerUtils.logUserActivity(
                req.user ? req.user._id : 'admin',
                'update',
                'Configuración de tiempos de expiración e intentos fallidos actualizada.'
            );

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
