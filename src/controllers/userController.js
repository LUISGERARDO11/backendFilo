/* This JavaScript code snippet defines several functions related to user management and authentication
in a Node.js application. Here is a breakdown of what each function does: */

const User = require('../models/User');
const Account = require('../models/Account');
const PassHistory = require('../models/PassHistory');
const FailedAttempt = require('../models/FailedAttempt');
const Session = require('../models/Session');
const { body, validationResult } = require('express-validator');

//** GESTION DE PERFIL DE USUARIOS  **
// Actualización del perfil del usuario (nombre, dirección, teléfono)
exports.updateProfile = [
    // Validar y sanitizar entradas
    body('nombre').optional().isString().trim().escape(),
    body('direccion').optional().isObject().custom(value => {
        // Validar campos de dirección
        if (!value.calle || !value.ciudad || !value.estado || !value.codigo_postal) {
            throw new Error('Todos los campos de la dirección son obligatorios (calle, ciudad, estado, código postal).');
        }
        return true;
    }),
    body('telefono').optional().isString().trim().escape(),

    async (req, res) => {
        const userId = req.user.user_id;

        // Validar entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Actualizar campos permitidos
            if (req.body.nombre) user.nombre = req.body.nombre;
            if (req.body.direccion) user.direccion = req.body.direccion;
            if (req.body.telefono) user.telefono = req.body.telefono;

            await user.save();
            res.status(200).json({ message: 'Perfil actualizado exitosamente', user });
        } catch (error) {
            res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
        }
    }
];
// Actualizar solo la dirección del usuario
exports.updateUserProfile = [
    // Validar y sanitizar entradas
    body('direccion').isObject().custom(value => {
        // Validar campos de dirección
        if (!value.calle || !value.ciudad || !value.estado || !value.codigo_postal) {
            throw new Error('Todos los campos de la dirección son obligatorios (calle, ciudad, estado, código postal).');
        }
        return true;
    }),

    async (req, res) => {
        const userId = req.user.user_id;

        // Validar entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            // Actualizar la dirección del usuario
            user.direccion = req.body.direccion;
            const updatedUser = await user.save();

            res.status(200).json({
                message: 'Dirección actualizada correctamente',
                user: {
                    direccion: updatedUser.direccion
                }
            });
        } catch (error) {
            res.status(500).json({ message: 'Error al actualizar la dirección', error: error.message });
        }
    }
];
// Función para obtener el perfil del usuario autenticado
exports.getProfile = async (req, res) => {
    const userId = req.user.user_id; // Asumiendo que `authMiddleware` agrega `req.user`
    
    try {
        const user = await User.findById(userId).select('nombre email telefono direccion estado tipo_usuario'); // Seleccionar solo los campos específicos
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.status(200).json(user); // Retornar solo los campos seleccionados
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el perfil', error: error.message });
    }
};

//** ELIMINCACIÓN DE CUENTAS  **
// Eliminar la cuenta del cliente autenticado
exports.deleteMyAccount = async (req, res) => {
    const userId = req.user.user_id; // ID del usuario autenticado

    try {
        // Buscar al usuario por su ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar que el usuario sea de tipo "cliente"
        if (user.tipo_usuario !== 'cliente') {
            return res.status(403).json({ message: 'Solo los usuarios de tipo cliente pueden eliminar su propia cuenta.' });
        }

        // Eliminar el documento del usuario en `users`
        await User.findByIdAndDelete(userId);

        // Eliminar la cuenta del usuario en `accounts`
        await Account.findOneAndDelete({ user_id: userId });

        // Eliminar el historial de contraseñas en `pass_history`
        await PassHistory.deleteMany({ account_id: userId });

        // Eliminar los intentos fallidos de inicio de sesión en `failed_attempts`
        await FailedAttempt.deleteMany({ user_id: userId });

        // Eliminar las sesiones activas del usuario en `sessions`
        await Session.deleteMany({ user_id: userId });

        // Responder con éxito
        res.status(200).json({ message: 'Tu cuenta y todos los registros relacionados han sido eliminados exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar tu cuenta', error: error.message });
    }
};
// Eliminar todo lo relacionado con un usuario de tipo cliente (solo para administradores)
exports.deleteCustomerAccount = [
    // Validar y sanitizar entradas
    body('id').isMongoId().withMessage('ID de usuario no válido.'),

    async (req, res) => {
        const userId = req.params.id;

        // Validar entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            if (user.tipo_usuario !== 'cliente') {
                return res.status(403).json({ message: 'Solo los usuarios de tipo cliente pueden ser eliminados.' });
            }

            await User.findByIdAndDelete(userId);
            await Account.findOneAndDelete({ user_id: userId });
            await PassHistory.deleteMany({ account_id: userId });
            await FailedAttempt.deleteMany({ user_id: userId });
            await Session.deleteMany({ user_id: userId });

            res.status(200).json({ message: 'Cuenta de cliente eliminada exitosamente junto con todos los registros relacionados.' });
        } catch (error) {
            res.status(500).json({ message: 'Error al eliminar la cuenta de cliente', error: error.message });
        }
    }
];

//** ADMINISTRACIÓN DE USUARIOS (SOLO PARA ADMINISTRADORES)  **
// Obtener todos los usuarios con la sesión más reciente (solo accesible por administradores)
exports.getAllUsersWithSessions = async (req, res) => {
    try {
        // Obtener todos los usuarios
        const users = await User.find({}, '_id nombre email estado'); // Seleccionar solo los campos necesarios

        // Crear una lista de usuarios con su sesión activa más reciente o estado de sesión inactiva
        const usersWithSessions = await Promise.all(users.map(async (user) => {
            // Buscar las sesiones activas del usuario
            const sessions = await Session.find({ user_id: user._id, revocada: false }).sort({ fecha_creacion: -1 });

            // Si el usuario tiene al menos una sesión activa, devolver la más reciente
            if (sessions.length > 0) {
                return {
                    _id: user._id,
                    nombre: user.nombre,
                    email: user.email,
                    estado: user.estado,
                    sesion_activa: true,
                    ultima_sesion: {
                        fecha_creacion: sessions[0].fecha_creacion,
                        navegador: sessions[0].navegador
                    }
                };
            } else {
                // Si no tiene sesiones activas, marcar como inactiva
                return {
                    _id: user._id,
                    nombre: user.nombre,
                    email: user.email,
                    estado: user.estado,
                    sesion_activa: false
                };
            }
        }));

        // Devolver la lista de usuarios con sus respectivas sesiones
        res.status(200).json(usersWithSessions);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los usuarios y sesiones', error: error.message });
    }
};
// Desactivar o bloquear una cuenta de usuario (solo para administradores)
exports.deactivateAccount = [
    // Validar y sanitizar entradas
    body('userId').isMongoId().withMessage('ID de usuario no válido.'),
    body('accion').isIn(['bloquear', 'suspender', 'activar']).withMessage('Acción inválida. Las acciones válidas son: bloquear, suspender, activar'),

    async (req, res) => {
        const { userId, accion } = req.body;
        const adminId = req.user.user_id;

        // Validar entradas
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }

            if (user._id.toString() === adminId) {
                return res.status(400).json({ message: 'No puedes desactivar o bloquear tu propia cuenta' });
            }

            // Actualizar el estado de la cuenta según la acción
            switch (accion) {
                case 'bloquear':
                    user.estado = 'bloqueado';
                    break;
                case 'suspender':
                    user.estado = 'suspendido';
                    break;
                case 'activar':
                    user.estado = 'activo';
                    break;
                default:
                    return res.status(400).json({ message: 'Acción no reconocida' });
            }

            await user.save();
            res.status(200).json({ message: `Cuenta ${accion} exitosamente`, user });
        } catch (error) {
            res.status(500).json({ message: `Error al ${accion} la cuenta del usuario`, error: error.message });
        }
    }
];