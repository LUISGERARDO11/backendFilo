/* This JavaScript code snippet defines several functions related to user management and authentication
in a Node.js application. Here is a breakdown of what each function does: */

const User = require('../models/User');
const Account = require('../models/Account');
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
