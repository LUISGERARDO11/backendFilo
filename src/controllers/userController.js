/* This JavaScript code snippet defines several functions related to user management and authentication
in a Node.js application. Here is a breakdown of what each function does: */

const User = require('../models/User');
const Account = require('../models/Account');
const PassHistory = require('../models/PassHistory');
const FailedAttempt = require('../models/FailedAttempt');
const Session = require('../models/Session');
const userService = require('../services/userService');
const authService = require('../services/authService'); // Para el hash y verificación de contraseñas


// Actualización del perfil del usuario (nombre, dirección, teléfono)
exports.updateProfile = async (req, res) => {
    const userId = req.user.user_id; // Asumiendo que el middleware de autenticación agrega `user` al objeto `req`
    const { nombre, direccion, telefono } = req.body;

    try {
        // Buscar al usuario por ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Actualizar campos permitidos
        if (nombre) user.nombre = nombre;
        if (direccion) user.direccion = direccion;
        if (telefono) user.telefono = telefono;

        await user.save();

        res.status(200).json({ message: 'Perfil actualizado exitosamente', user });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar el perfil', error: error.message });
    }
};
// Actualizar solo la dirección del usuario
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.user_id; // Asumiendo que `authMiddleware` agrega `req.user`
    const { direccion } = req.body; // Solo recibimos la dirección en la solicitud

    try {
        // Buscar al usuario por su ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar que la dirección esté presente en la solicitud
        if (!direccion || !direccion.calle || !direccion.ciudad || !direccion.estado || !direccion.codigo_postal) {
            return res.status(400).json({ message: 'Todos los campos de la dirección son obligatorios (calle, ciudad, estado, código postal).' });
        }

        // Actualizar la dirección del usuario
        user.direccion = {
            calle: direccion.calle,
            ciudad: direccion.ciudad,
            estado: direccion.estado,
            codigo_postal: direccion.codigo_postal
        };

        // Guardar los cambios en la base de datos
        const updatedUser = await user.save();

        // Devolver la información actualizada del usuario
        res.status(200).json({
            message: 'Dirección actualizada correctamente',
            user: {
                direccion: updatedUser.direccion
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la dirección', error: error.message });
    }
};
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
// Método para cambiar la contraseña del usuario autenticado
exports.changePassword = async (req, res) => {
    const userId = req.user.user_id; // El ID del usuario autenticado
    const { currentPassword, newPassword } = req.body;

    try {
        // Buscar la cuenta vinculada al usuario
        const account = await Account.findOne({ user_id: userId });
        if (!account) {
            return res.status(404).json({ message: 'Cuenta no encontrada' });
        }

        // Verificar la contraseña actual
        const isMatch = await authService.verifyPassword(currentPassword, account.contrasenia_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña actual incorrecta' });
        }

        // Verificar y guardar el historial de contraseñas
        const result = await userService.trackPasswordHistory(account._id, account.contrasenia_hash, newPassword);
        if (!result.success) {
            return res.status(400).json({ message: result.message });
        }

        // Cifrar la nueva contraseña
        const newHashedPassword = await authService.hashPassword(newPassword);

        // Actualizar el hash de la contraseña y la fecha de último cambio
        account.contrasenia_hash = newHashedPassword;
        account.estado_contrasenia.fecha_ultimo_cambio = new Date();
        await account.save();

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cambiar la contraseña', error: error.message });
    }
};
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

//ONLY ADMINS CAN:

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
exports.deactivateAccount = async (req, res) => {
    const { userId, accion } = req.body; // userId del usuario a desactivar/bloquear y la acción ('bloquear', 'suspender', 'activar')
    const adminId = req.user.user_id; // ID del administrador que realiza la acción

    // Validar que la acción proporcionada es válida
    const accionesValidas = ['bloquear', 'suspender', 'activar'];
    if (!accionesValidas.includes(accion)) {
        return res.status(400).json({ message: `Acción inválida. Las acciones válidas son: ${accionesValidas.join(', ')}` });
    }

    try {
        // Buscar al usuario por ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Evitar que un administrador desactive su propia cuenta
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
};
// Eliminar todo lo relacionado con un usuario de tipo cliente (solo para administradores)
exports.deleteCustomerAccount = async (req, res) => {
    const userId = req.params.id; // ID del usuario a eliminar

    try {
        // Buscar al usuario por su ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar que el usuario sea de tipo "cliente"
        if (user.tipo_usuario !== 'cliente') {
            return res.status(403).json({ message: 'Solo los usuarios de tipo cliente pueden ser eliminados.' });
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
        res.status(200).json({ message: 'Cuenta de cliente eliminada exitosamente junto con todos los registros relacionados.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la cuenta de cliente', error: error.message });
    }
};