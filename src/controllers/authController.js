/* The above code is a Node.js application that handles user registration, login, and session
management for an authentication system. Here is a summary of the main functionalities: */
const User = require('../models/User');
const Account = require('../models/Account');
const Session = require('../models/Session');
const userService = require('../services/userService');
const authService = require('../services/authService'); // Para el hash y verificación de contraseñas
const authUtils = require('../utils/authUtils');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

// Función para generar un token único
const generateRecoveryToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Registro de usuarios
exports.register = [
    // Validar y sanitizar entradas
    body('nombre').isString().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('telefono').isString().trim().escape(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres').trim().escape(),
    body('tipo_usuario').isIn(['cliente', 'administrador']).withMessage('Tipo de usuario no válido'),
    body('mfa_activado').isBoolean(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, email, telefono, password, tipo_usuario, mfa_activado } = req.body;

        try {
            // Validar si el correo es real usando ZeroBounce (esto ya está implementado)
            //const emailValidation = await authUtils.validateEmail(email);
            //if (!emailValidation.isValid) {
              //  return res.status(400).json({ message: emailValidation.message });
            //}

            // Validar si el usuario ya existe
            let existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'El correo ya está en uso.' });
            }

            // Crear el nuevo usuario
            const newUser = new User({
                nombre,
                email,
                telefono,
                tipo_usuario,
                mfa_activado,
                estado: 'pendiente'
            });

            const savedUser = await newUser.save();
            // Cifrar la contraseña utilizando el servicio
            const hashedPassword = await authService.hashPassword(password);

            // Crear una cuenta vinculada al usuario
            const newAccount = new Account({
                user_id: savedUser._id,
                contrasenia_hash: hashedPassword,
                estado_contrasenia: {
                    requiere_cambio: false,
                    fecha_ultimo_cambio: new Date(),
                    contrasenia_temporal: false
                },
                configuracion_2fa: {
                    mfa_tipo: mfa_activado ? 'TOTP' : null, // Dependiendo si MFA está activado
                    enabled: mfa_activado
                }
            });

            await newAccount.save();

            // Generar token de verificación
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Guardar el token y la fecha de expiración en el usuario
            savedUser.verificacionCorreoToken = verificationToken;
            savedUser.verificacionCorreoExpira = Date.now() + 24 * 60 * 60 * 1000; // Expira en 24 horas
            await savedUser.save();

            await authService.sendVerificationEmail(savedUser.email, verificationToken);
            res.status(201).json({ message: 'Usuario registrado exitosamente', user: savedUser });
        } catch (error) {
            res.status(500).json({ message: 'Error en el registro de usuario', error: error.message });
        }
    }
];

// Inicio de sesión
exports.login = [
    // Validar y sanitizar entradas
    body('email').isEmail().normalizeEmail(),
    body('password').not().isEmpty().trim().escape(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, mfa_code } = req.body;

        try {
            // Buscar al usuario y su cuenta vinculada
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ message: 'Usuario no encontrado' });
            }
              // Verificar si el estado del usuario es "pendiente"
            if (user.estado === 'pendiente') {
                return res.status(403).json({ message: 'Debes verificar tu correo electrónico antes de iniciar sesión.' });
            }

            const account = await Account.findOne({ user_id: user._id });
            if (!account) {
                return res.status(400).json({ message: 'Cuenta no encontrada' });
            }

            const bloqueado = await authService.isUserBlocked(user._id);
            if (bloqueado.blocked) {
                return res.status(403).json({ message: bloqueado.message });
            }
            // Verificar la contraseña utilizando el servicio
            const isMatch = await authService.verifyPassword(password, account.contrasenia_hash);
            if (!isMatch) {
                // Manejar el intento fallido
                const result = await authService.handleFailedAttempt(user._id, req.ip);
                return res.status(400).json({ message: 'Contraseña incorrecta', ...result });
            }

            // Limpiar los intentos fallidos si el inicio de sesión fue exitoso
            await authService.clearFailedAttempts(user._id);

            // **2. Limitar el número de sesiones activas**
            const activeSessionsCount = await Session.countDocuments({ user_id: user._id, revocada: false });

            if (user.tipo_usuario === 'cliente' && activeSessionsCount >= 5) {
                return res.status(403).json({ message: 'Límite de sesiones activas alcanzado (5 sesiones permitidas para usuarios tipo cliente).' });
            }
            
            if (user.tipo_usuario === 'administrador' && activeSessionsCount >= 2) {
                return res.status(403).json({ message: 'Límite de sesiones activas alcanzado (2 sesiones permitidas para administradores).' });
            }
            

            // Verificar MFA si está habilitado
            if (account.configuracion_2fa.enabled) {
                if (!mfa_code) {
                    return res.status(400).json({ message: 'Se requiere un código MFA' });
                }
                const isMfaValid = verifyMfaCode(mfa_code, user);
                if (!isMfaValid) {
                    return res.status(400).json({ message: 'Código MFA incorrecto' });
                }
            }

            // Generar el JWT utilizando el servicio
            const token = authService.generateJWT(user);

            // Guardar la sesión
            const newSession = new Session({
                user_id: user._id,
                token,
                fecha_creacion: new Date(),
                ultima_actividad: new Date(),
                expiracion: new Date(Date.now() + 3600000), // 1 hora
                ip: req.ip,
                navegador: req.headers['user-agent'],
                revocada: false
            });

            await newSession.save();

            // Establecer la cookie con el token
            res.cookie('token', token, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'Strict',
                maxAge: 3600000 // 1 hora
            });

            res.status(200).json({ message: 'Inicio de sesión exitoso' });
        } catch (error) {
            res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
        }
    }
];

// Cerrar sesión del usuario (elimina el token de la sesión actual)
exports.logout = async (req, res) => {
    const token = req.cookies.token; // Obtener el token de la cookie
    const userId = req.user.user_id; // ID del usuario autenticado

    try {
        // Buscar la sesión correspondiente al token actual
        const session = await Session.findOne({ user_id: userId, token });
        
        if (!session) {
            return res.status(404).json({ message: 'Sesión no encontrada.' });
        }

        // Marcar la sesión como revocada
        session.revocada = true;
        await session.save();

        // Limpiar la cookie del token para cerrar la sesión del usuario
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });

        // Responder con un mensaje de éxito
        res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
    }
};

//Los siguientes dos metodos son para cuando un usuario cambia su contraseña sabiendo la actual y colocando una nueva
// Método para cambiar la contraseña del usuario autenticado
exports.changePassword = [
    // Validar y sanitizar entradas
    body('currentPassword').not().isEmpty().trim().escape(),
    body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres').trim().escape(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const userId = req.user.user_id;
        const { currentPassword, newPassword } = req.body;

        try {
            const account = await Account.findOne({ user_id: userId });
            if (!account) {
                return res.status(404).json({ message: 'Cuenta no encontrada' });
            }

            const isMatch = await authService.verifyPassword(currentPassword, account.contrasenia_hash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Contraseña actual incorrecta' });
            }

            const result = await userService.trackPasswordHistory(account._id, account.contrasenia_hash, newPassword);
            if (!result.success) {
                return res.status(400).json({ message: result.message });
            }

            const newHashedPassword = await authService.hashPassword(newPassword);
            account.contrasenia_hash = newHashedPassword;
            account.estado_contrasenia.fecha_ultimo_cambio = new Date();
            await account.save();

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            // Revocar todas las sesiones activas después del cambio de contraseña
            await Session.updateMany({ user_id: userId, revocada: false }, { revocada: true });

            await authService.sendPasswordChangeNotification(user.email);
            res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
        } catch (error) {
            res.status(500).json({ message: 'Error al cambiar la contraseña', error: error.message });
        }
    }
];

// Verificar el correo electrónico del usuario
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    try {
        // Buscar al usuario con el token de verificación
        const user = await User.findOne({
            verificacionCorreoToken: token,
            verificacionCorreoExpira: { $gt: Date.now() } // Verificar que el token no ha expirado
        });

        if (!user) {
            return res.status(400).json({ message: 'Token inválido o expirado.' });
        }

        // Activar la cuenta del usuario
        user.estado = 'activo';
        user.verificacionCorreoToken = undefined; // Limpiar el token
        user.verificacionCorreoExpira = undefined;
        await user.save();

        res.status(200).json({ message: 'Correo verificado exitosamente. Ahora puedes iniciar sesión.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar el correo', error: error.message });
    }
};

//Los siguientes dos métodos son para cuando un usuario reestablece su contraseña por que se le ha olvidado
// Método para iniciar el proceso de recuperación de contraseña
exports.initiatePasswordRecovery = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        const account = await Account.findOne({ user_id: user._id });
        if (!account) {
            return res.status(404).json({ message: 'Cuenta no encontrada.' });
        }

        // Generar un token único y definir una caducidad de 15 minutos
        const recoveryToken = generateRecoveryToken();
        const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Guardar el token y la fecha de expiración en el modelo Account
        account.recuperacion_contrasenia = {
            codigo: recoveryToken,
            expiracion_codigo: expiration,
            codigo_valido: true
        };
        await account.save();

        // Enviar el token al correo del usuario
        const recoveryLink = `https://example.com/recover-password/${recoveryToken}`;
        await sendRecoveryEmail(user.email, recoveryLink);

        res.status(200).json({ message: 'Se ha enviado un enlace de recuperación a tu correo electrónico.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al iniciar el proceso de recuperación de contraseña.', error: error.message });
    }
};

// Verificar MFA (función auxiliar)
const verifyMfaCode = (mfa_code, user) => {
    // Aquí puedes implementar la lógica para verificar códigos TOTP o SMS
    // Por ejemplo, con una biblioteca como speakeasy para TOTP
    // return speakeasy.totp.verify({...});
    return true; // Simulación, por ahora devuelve true
};

// Revocar tokens anteriores si se detecta actividad sospechosa o múltiples intentos fallidos
exports.revokeTokens = async (user_id) => {
    try {
        await Session.updateMany({ user_id, revocada: false }, { revocada: true });
    } catch (error) {
        console.error('Error revocando sesiones anteriores:', error);
    }
};

// Controlador para verificar si una contraseña está comprometida
exports.checkPassword = (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Debe proporcionar una contraseña' });
    }

    const isCompromised = authUtils.isPasswordCompromised(password);

    if (isCompromised) {
        return res.json({ 
            status: 'compromised', 
            message: 'La contraseña ha sido filtrada. Por favor, elige una más segura.' 
        });
    } else {
        return res.json({ 
            status: 'safe', 
            message: 'La contraseña no se encuentra en la lista de contraseñas filtradas.' 
        });
    }
};
