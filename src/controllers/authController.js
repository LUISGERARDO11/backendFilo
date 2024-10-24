/* The above code is a Node.js application that handles user registration, login, and session
management for an authentication system. Here is a summary of the main functionalities: */
const User = require('../models/User');
const Account = require('../models/Account');
const Session = require('../models/Session');
const Config = require('../models/Config');
const FailedAttempt = require('../models/FailedAttempt');
const userService = require('../services/userService');
const authService = require('../services/authService'); // Para el hash y verificación de contraseñas
const authUtils = require('../utils/authUtils');
const loggerUtils = require('../utils/loggerUtils');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const axios = require('axios');
const jwt = require("jsonwebtoken");
require('dotenv').config();

//** GESTION DE USUARIOS  **
// Registro de usuarios
exports.register = [
    // Validar y sanitizar entradas
    body('nombre').isString().trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('telefono').isString().trim().escape(),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres').trim().escape(),
    body('tipo_usuario').isIn(['cliente', 'administrador']).withMessage('Tipo de usuario no válido'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { nombre, email, telefono, password, tipo_usuario } = req.body;

        try {
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
                }
            });

            await newAccount.save();

            // Generar token de verificación
            const verificationToken = crypto.randomBytes(32).toString('hex');

            // Obtener el tiempo de vida del token de verificación desde la base de datos
            const config = await Config.findOne();
            const verificationLifetime = config ? config.verificacion_correo_lifetime * 1000 : 24 * 60 * 60 * 1000; // 24 horas por defecto

            // Guardar el token y la fecha de expiración en el usuario
            savedUser.verificacionCorreoToken = verificationToken;
            savedUser.verificacionCorreoExpira = Date.now() + verificationLifetime; // Usar tiempo de vida desde la BD
            await savedUser.save();

            await authService.sendVerificationEmail(savedUser.email, verificationToken);
            
            // Registrar actividad de creación de usuario
            loggerUtils.logUserActivity(savedUser._id, 'account_creation', 'Usuario registrado exitosamente');
            
            res.status(201).json({ message: 'Usuario registrado exitosamente', user: savedUser });
        } catch (error) {
            loggerUtils.logCriticalError(error);
            res.status(500).json({ message: 'Error en el registro de usuario', error: error.message });
        }
    }
];
// Verificar el correo electrónico del usuario
exports.verifyEmailVersion2 = async (req, res) => {
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

         // Redirigir al usuario a la página de inicio de sesión del frontend
         const baseUrls = {
            development: [ 'http://localhost:3000', 'http://localhost:4200', 'http://127.0.0.1:4200', 'http://127.0.0.1:3000'],
            production: ['https://frontend-filo.vercel.app']
        };

        const currentEnv = baseUrls[process.env.NODE_ENV] ? process.env.NODE_ENV : 'development';
        const loginUrl = `${baseUrls[currentEnv][0]}/`;

        res.redirect(loginUrl);

    } catch (error) {
        res.status(500).json({ message: 'Error al verificar el correo', error: error.message });
    }
};
// Inicio de sesión
exports.login = [
    // Validar y sanitizar entradas
    body('email').isEmail().normalizeEmail(),
    body('password').not().isEmpty().trim().escape(),
    body('recaptchaToken').not().isEmpty().withMessage('Se requiere el token de reCAPTCHA'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password,recaptchaToken } = req.body;

        try {
            // 1. Verificar el token de reCAPTCHA con la API de Google
            const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
            const recaptchaResponse = await axios.post(`https://www.google.com/recaptcha/api/siteverify`, null, {
                params: {
                    secret: recaptchaSecretKey,
                    response: recaptchaToken
                }
            });

            const { success, score } = recaptchaResponse.data;
            if (!success || score < 0.5) {
                return res.status(400).json({ message: 'Fallo en la verificación de reCAPTCHA' });
            }
            
            // Buscar al usuario y su cuenta vinculada
            const user = await User.findOne({ email });
            if (!user) {
                loggerUtils.logUserActivity(null, 'login_failed', `Intento de inicio de sesión fallido para email no encontrado: ${email}`);
                return res.status(400).json({ message: 'Usuario no encontrado' });
            }
              // Verificar si el estado del usuario es "pendiente"
            if (user.estado === 'pendiente') {
                loggerUtils.logUserActivity(user._id, 'login_failed', 'Intento de inicio de sesión con cuenta pendiente de verificación');
                return res.status(403).json({ message: 'Debes verificar tu correo electrónico antes de iniciar sesión.' });
            }

            const account = await Account.findOne({ user_id: user._id });
            if (!account) {
                loggerUtils.logUserActivity(user._id, 'login_failed', 'Intento de inicio de sesión fallido: cuenta no encontrada');
                return res.status(400).json({ message: 'Cuenta no encontrada' });
            }

            const bloqueado = await authService.isUserBlocked(user._id);
            if (bloqueado.blocked) {
                loggerUtils.logUserActivity(user._id, 'login_failed', 'Cuenta bloqueada');
                return res.status(403).json({ message: bloqueado.message });
            }
            // Verificar la contraseña utilizando el servicio
           const isMatch = await authService.verifyPassword(password, account.contrasenia_hash);
            
           // const isMatch = await authService.verifyPasswordWithOutHash(password, account.contrasenia_hash);
            if (!isMatch) {
                // Manejar el intento fallido
                const result = await authService.handleFailedAttempt(user._id, req.ip);
                if (result.locked) {
                    loggerUtils.logUserActivity(user._id, 'account_locked', 'Cuenta bloqueada por intentos fallidos');
                    return res.status(403).json({ locked:true, message: 'Tu cuenta ha sido bloqueada debido a múltiples intentos fallidos. Debes cambiar tu contraseña.' });
                }
                return res.status(400).json({ message: 'Credenciales incorrectas', ...result });
            }

            // Limpiar los intentos fallidos si el inicio de sesión fue exitoso
            await authService.clearFailedAttempts(user._id);

            // **2. Limitar el número de sesiones activas**
            const activeSessionsCount = await Session.countDocuments({ user_id: user._id, revocada: false });

            if (user.tipo_usuario === 'cliente' && activeSessionsCount >= 5) {
                loggerUtils.logUserActivity(user._id, 'login_failed', 'Límite de sesiones activas alcanzado');
                return res.status(403).json({ message: 'Límite de sesiones activas alcanzado (5 sesiones permitidas).' });
            }
            
            if (user.tipo_usuario === 'administrador' && activeSessionsCount >= 2) {
                loggerUtils.logUserActivity(user._id, 'login_failed', 'Límite de sesiones activas alcanzado');
                return res.status(403).json({ message: 'Límite de sesiones activas alcanzado (2 sesiones permitidas para administradores).' });
            }
            

            // Si MFA está habilitado, no autenticamos completamente aún
            if (account.configuracion_2fa.enabled) {
                return res.status(200).json({
                    message: 'MFA requerido. Introduce tu código MFA.',
                    mfaRequired: true,
                    userId: user._id // Enviar el userId para que el frontend lo use en la solicitud MFA
                });
            }

            //Si MFA no está habilitado, Generar el JWT utilizando el servicio
            const token = await authService.generateJWT(user);

            //Buscar el tiempo de vida de la sesion
            const config = await Config.findOne();
            const sesionLifetime = config ? config.sesion_lifetime  * 1000 : 3600000; // 1 hora por defecto

            // Guardar la sesión
            const newSession = new Session({
                user_id: user._id,
                token,
                fecha_creacion: new Date(),
                ultima_actividad: new Date(),
                expiracion: new Date(Date.now() + sesionLifetime),
                ip: req.ip,
                navegador: req.headers['user-agent'],
                revocada: false
            });

            await newSession.save();

            // Registrar el inicio de sesión exitoso
            loggerUtils.logUserActivity(user._id, 'login', 'Inicio de sesión exitoso');

            const cookieLifetime = config ? config.cookie_lifetime * 1000 : 3600000;

            // Establecer la cookie con el token
            res.cookie('token', token, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production', 
                sameSite: 'None',
                maxAge: cookieLifetime // 1 hora
            });

            res.status(200).json({userId: user._id, tipo: user.tipo_usuario , message: 'Inicio de sesión exitoso' });
        } catch (error) {
            loggerUtils.logCriticalError(error);
            res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
        }
    }
];
// Cerrar sesión del usuario (elimina el token de la sesión actual)
exports.logout = async (req, res) => {
    const token = req.cookies.token; // Obtener el token de la cookie
  
    if (!token) {
      return res.status(401).json({ message: "No se proporcionó un token. Ya estás cerrado sesión o nunca iniciaste sesión." });
    }
  
    try {
      // Obtener el ID del usuario autenticado del middleware
      const userId = req.user ? req.user.user_id : null;
  
      if (!userId) {
        return res.status(400).json({ message: "Usuario no autenticado." });
      }
  
      // Buscar la sesión correspondiente al token actual
      const session = await Session.findOne({ user_id: userId, token });
  
      if (!session) {
        return res.status(404).json({ message: 'Sesión no encontrada.' });
      }
  
      // Validar si la sesión ya fue cerrada/revocada
      if (session.revocada) {
        return res.status(400).json({ message: 'La sesión ya fue cerrada anteriormente.' });
      }

      // Marcar la sesión como revocada
      session.revocada = true;
      await session.save();
  
      // Limpiar la cookie del token para cerrar la sesión del usuario
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None'
      });
  
      // Responder con un mensaje de éxito
      res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
      return res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
    }
  };  

//** SEGURIDAD Y AUTENTICACIÓN MULTIFACTOR **
// Inicia el proceso para autenticacion en dos pasos
exports.sendOtpMfa = async (req, res) => {
    const { userId } = req.body;

    try {
         // Buscar la cuenta del usuario por userId
         const account = await Account.findOne({ user_id: userId });
         if (!account) {
             return res.status(404).json({ message: 'Cuenta no encontrada.' });
         }
 
         // Buscar el usuario por su ID para obtener el correo electrónico
         const user = await User.findById(userId);
         if (!user) {
             return res.status(404).json({ message: 'Usuario no encontrado.' });
         }
 
         // Obtener la configuración de tiempo de vida del OTP desde la base de datos
        const config = await Config.findOne();
        const otpLifetime = config ? config.otp_lifetime * 1000 : 15 * 60 * 1000; // Usar 15 minutos por defecto si no se encuentra la configuración

         // Generar OTP y definir una expiración de 15 minutos
         const otp = authUtils.generateOTP();
         const expiration = new Date(Date.now() + otpLifetime);
 
         // Almacenar el OTP y la expiración en la base de datos
         account.configuracion_2fa = {
             mfa_tipo: 'OTP', 
             enabled: true,
             codigo: otp,
             expiracion_codigo: expiration,
             codigo_valido: true,
             intentos: 0 // Reiniciar intentos
         };
         await account.save();
 
         // Enviar el OTP por correo electrónico al usuario
         await authService.sendMFAOTPEmail(user.email, otp); 

        res.status(200).json({ success: true, message: 'OTP enviado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al enviar el OTP.', error: error.message });
    }
};
//Verificar el codigo mfa 
exports.verifyOTPMFA = async (req, res) => {
    const { userId, otp } = req.body;

    try {
        // Buscar la cuenta del usuario
        const account = await Account.findOne({ user_id: userId });
        if (!account) {
            return res.status(404).json({ message: 'Cuenta no encontrada.' });
        }

        // Verificar si el OTP es válido y no ha expirado
        if (!account.configuracion_2fa.codigo_valido || Date.now() > account.configuracion_2fa.expiracion_codigo) {
            return res.status(400).json({ message: 'El código OTP ha expirado o es inválido.' });
        }

        // Verificar si el OTP es correcto
        if (otp !== account.configuracion_2fa.codigo) {
            account.configuracion_2fa.intentos += 1;
            if (account.configuracion_2fa.intentos >= 3) {
                account.configuracion_2fa.codigo_valido = false; // Invalida el OTP después de 3 intentos fallidos
            }
            await account.save();
            return res.status(400).json({ message: `OTP incorrecto. Intentos restantes: ${3 - account.configuracion_2fa.intentos}.` });
        }

        // Si el OTP es correcto, proceder
        account.configuracion_2fa.codigo_valido = false; // Invalida el OTP después de ser usado
        await account.save();

        // Buscar el usuario para obtener información adicional
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Generar el JWT utilizando el servicio
        const token = authService.generateJWT(user);

        const config = await Config.findOne();
        const sesionLifetime = config ? config.sesion_lifetime * 1000 : 3600000;

        // Guardar la sesión
        const newSession = new Session({
            user_id: user._id,
            token,
            fecha_creacion: new Date(),
            ultima_actividad: new Date(),
            expiracion: new Date(Date.now() + sesionLifetime),
            ip: req.ip,
            navegador: req.headers['user-agent'],
            revocada: false
        });

        await newSession.save();

        const cookieLifetime = config ? config.cookie_lifetime * 1000 : 3600000;

        // Establecer la cookie con el token
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None',
            maxAge: cookieLifetime // 1 hora
        });

        // Enviar respuesta exitosa y el token
        res.status(200).json({ 
            success: true, 
            userId: user._id, 
            tipo: user.tipo_usuario,
            message: 'OTP verificado correctamente. Inicio de sesión exitoso.' 
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al verificar el OTP.', error: error.message });
    }
};

//** GESTION DE CONTRASEÑAS **
// 1: CAMBIAR CONTRASEÑA: 
//Método para cambiar la contraseña del usuario autenticado para cuando un usuario cambia su contraseña sabiendo la actual y colocando una nueva
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
                loggerUtils.logUserActivity(userId, 'password_change_failed', 'Cuenta no encontrada');
                return res.status(404).json({ message: 'Cuenta no encontrada' });
            }

            const isMatch = await authService.verifyPassword(currentPassword, account.contrasenia_hash);
            if (!isMatch) {
                loggerUtils.logUserActivity(userId, 'password_change_failed', 'Contraseña actual incorrecta');
                return res.status(400).json({ message: 'Contraseña actual incorrecta' });
            }

            const result = await userService.trackPasswordHistory(account._id, account.contrasenia_hash, newPassword);
            if (!result.success) {
                loggerUtils.logUserActivity(userId, 'password_change_failed', result.message);
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

            // Enviar notificación de cambio de contraseña
            await authService.sendPasswordChangeNotification(user.email);

            // Registrar el cambio de contraseña exitoso
            loggerUtils.logUserActivity(userId, 'password_change', 'Contraseña actualizada exitosamente');

            res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
        } catch (error) {
            res.status(500).json({ message: 'Error al cambiar la contraseña', error: error.message });
        }
    }
];
//2:RECUPERACIÓN DE CONTRASEÑA
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

        // Generar un OTP único
        const otp = authUtils.generateOTP();
        const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // Guardar el OTP y la fecha de expiración en el modelo Account
        account.recuperacion_contrasenia = {
            codigo: otp,
            expiracion_codigo: expiration,
            codigo_valido: true
        };
        await account.save();

        // Enviar el OTP al correo del usuario
        await authService.sendOTPEmail(user.email, otp);

        res.status(200).json({ message: 'Se ha enviado un código de recuperación a tu correo electrónico.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al iniciar el proceso de recuperación de contraseña.', error: error.message });
    }
};
//metodo para verificar el codigo otp para recuperacion de contraseña
exports.verifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        // Buscar al usuario por su correo
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Buscar la cuenta del usuario asociada
        const account = await Account.findOne({ user_id: user._id });
        if (!account) {
            return res.status(404).json({ message: 'Cuenta no encontrada.' });
        }

        // Verificar si el código OTP es válido
        if (!account.recuperacion_contrasenia.codigo_valido) {
            return res.status(400).json({ message: 'El código OTP no es válido. Solicita uno nuevo.' });
        }

        // Verificar si el OTP ha expirado
        if (Date.now() > account.recuperacion_contrasenia.expiracion_codigo) {
            return res.status(400).json({ message: 'El código OTP ha expirado. Solicita uno nuevo.' });
        }

        // Verificar si el OTP ingresado es correcto
        if (otp !== account.recuperacion_contrasenia.codigo) {
            // Incrementar el contador de intentos fallidos
            account.recuperacion_contrasenia.intentos += 1;
            await account.save();

            // Si los intentos fallidos son 3 o más, invalidar el código OTP
            if (account.recuperacion_contrasenia.intentos >= 3) {
                account.recuperacion_contrasenia.codigo_valido = false;
                await account.save();
                return res.status(400).json({
                    message: 'Has alcanzado el límite de intentos fallidos. Solicita un nuevo código OTP.'
                });
            }

            return res.status(400).json({
                message: `Código OTP incorrecto. Intentos restantes: ${3 - account.recuperacion_contrasenia.intentos}.`
            });
        }

        // Si el OTP es correcto, proceder con la validación
        account.recuperacion_contrasenia.codigo_valido = false; // Invalida el OTP después de su uso
        account.recuperacion_contrasenia.intentos = 0; // Reiniciar intentos
        await account.save();

        return res.status(200).json({ 
            message: 'OTP verificado correctamente. Puedes proceder a cambiar tu contraseña.',
            status: 'success'
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al verificar el código OTP.', error: error.message });
    }
};
//metodo para reestablecer una contraseña
exports.resetPassword = [
    // Validar y sanitizar entradas
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido').normalizeEmail(),
    body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres').trim().escape(),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, newPassword } = req.body;

        try {
            // Buscar al usuario por su correo
            const user = await User.findOne({ email });
            if (!user) {
                loggerUtils.logUserActivity(null, 'password_reset_failed', `Usuario no encontrado para el correo: ${email}`);
                return res.status(404).json({ message: 'Usuario no encontrado.' });
            }

            // Si el usuario está bloqueado permanentemente, no permitir restablecer la contraseña
            if (user.estado === 'bloqueado_permanente') {
                return res.status(403).json({ message: 'Tu cuenta está bloqueada permanentemente. Contacta al soporte para desbloquear.' });
            }

            // Buscar la cuenta asociada al usuario
            const account = await Account.findOne({ user_id: user._id });
            if (!account) {
                loggerUtils.logUserActivity(user._id, 'password_reset_failed', 'Cuenta no encontrada');
                return res.status(404).json({ message: 'Cuenta no encontrada.' });
            }

            // Verificar si la nueva contraseña es diferente a las anteriores 
            const result = await userService.trackPasswordHistory(account._id, account.contrasenia_hash, newPassword);
            if (!result.success) {
                loggerUtils.logUserActivity(user._id, 'password_reset_failed', result.message);
                return res.status(400).json({ message: result.message });
            }

            // Cifrar la nueva contraseña
            const newHashedPassword = await authService.hashPassword(newPassword);
            account.contrasenia_hash = newHashedPassword;
            account.estado_contrasenia.fecha_ultimo_cambio = new Date();

            // Guardar los cambios
            await account.save();

            // Marcar los intentos fallidos como resueltos pero no eliminarlos
            await FailedAttempt.updateMany({ user_id:user._id }, { $set: { is_resolved: true } });

            // Revocar todas las sesiones activas del usuario después del cambio de contraseña
            await Session.updateMany({ user_id: user._id, revocada: false }, { revocada: true });

            // Cambiar el estado del usuario a 'activo' si estaba bloqueado
            if (user.estado === 'bloqueado') {
                user.estado = 'activo';
                await user.save();
            }

            // Enviar una notificación de cambio de contraseña al usuario
            await authService.sendPasswordChangeNotification(user.email);

            // Registrar el cambio de contraseña exitoso
            loggerUtils.logUserActivity(user._id, 'password_reset', 'Contraseña restablecida exitosamente');

            return res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
        } catch (error) {
            return res.status(500).json({ message: 'Error al cambiar la contraseña.', error: error.message });
        }
    }
];
//3: VERIFICAR SI LA CONTRASEÑA ESTÁ COMPROMETIDA
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

//** GESTION DE SESIONES **
// Revocar tokens anteriores si se detecta actividad sospechosa o múltiples intentos fallidos
exports.revokeTokens = async (user_id) => {
    try {
        await Session.updateMany({ user_id, revocada: false }, { revocada: true });
    } catch (error) {
        console.error('Error revocando sesiones anteriores:', error);
    }
};
//Autentificar tokens y renovacion si está cerca de expirar
exports.checkAuth = async (req, res, next) => {
    const token = req.cookies.token; // Extraer el token de la cookie

    if (!token) {
        return res.status(401).json({ message: "No autenticado" });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET); // Verificación del token JWT
    } catch (err) {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }

    const userId = decoded.user_id;

    // Búsqueda del usuario
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // Verificación de la cuenta del usuario
    if (user.estado !== "activo") {
        return res.status(403).json({ message: "Usuario no autorizado o inactivo." });
    }
    const config = await Config.findOne();
    const expirationThresholdSeconds = config ? config.expirationThreshold_lifetime : 900; // En segundos
    const cookieLifetimeMilliseconds = config ? config.cookie_lifetime * 1000 : 3600000; // En milisegundos

    // Renovar el token si está cerca de expirar
    if (decoded.exp - Date.now() / 1000 < expirationThresholdSeconds) {
        const newToken = authService.generateJWT(user); // Generar un nuevo token

        // Establecer la nueva cookie con el token renovado
        res.cookie("token", newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            maxAge: cookieLifetimeMilliseconds, // Tiempo de vida de la cookie en milisegundos
        });
    }

    // Envío de la información del usuario
    res.json({
        userId: user.id,
        email: user.email,
        tipo: user.tipo_usuario, 
        nombre: user.nombre, 
    });
};
