/* The above code is a Node.js application that handles user registration, login, and session
management for an authentication system. Here is a summary of the main functionalities: */

const authService = require('../services/authService');
const User = require('../models/User');
const Account = require('../models/Account');
const Session = require('../models/Session');

// Registro de usuarios
exports.register = async (req, res) => {
    const { nombre, email, telefono, password, tipo_usuario, mfa_activado } = req.body;

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
            mfa_activado
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

        res.status(201).json({ message: 'Usuario registrado exitosamente', user: savedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error en el registro de usuario', error: error.message });
    }
};

// Inicio de sesión
exports.login = async (req, res) => {
    const { email, password, mfa_code } = req.body;

    try {
        // Buscar al usuario y su cuenta vinculada
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }

        const account = await Account.findOne({ user_id: user._id });
        if (!account) {
            return res.status(400).json({ message: 'Cuenta no encontrada' });
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

        // Verificar la rotación de contraseña
        const rotationStatus = await authService.forcePasswordRotation(account._id);

        // Si ya han pasado más de 6 meses, se bloquea el inicio de sesión
        if (rotationStatus.requiereCambio) {
            return res.status(403).json({ 
                message: 'Debes cambiar tu contraseña. Han pasado más de 6 meses.',
                requiereCambio: true 
            });
        }

        // Si faltan de 1 a 7 días para el cambio, permitir el acceso pero advertir
        if (rotationStatus.warning) {
            // Generar el JWT para permitir el acceso, pero enviar advertencia
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

            return res.status(200).json({
                message: 'Inicio de sesión exitoso, pero tu contraseña caduca pronto. Cámbiala en los próximos días.',
                requiereCambio: false,
                warning: true,
                token
            });
        }

        // Verificar MFA si está habilitado
        if (account.configuracion_2fa.enabled) {
            if (!mfa_code) {
                return res.status(400).json({ message: 'Se requiere un código MFA' });
            }
            // Lógica de verificación MFA (ejemplo usando una función auxiliar para MFA)
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

        res.status(200).json({ message: 'Inicio de sesión exitoso', token });
    } catch (error) {
        res.status(500).json({ message: 'Error en el inicio de sesión', error: error.message });
    }
};
// Cerrar sesión del usuario (elimina el token de la sesión actual)
exports.logout = async (req, res) => {
    const token = req.token; // Suponiendo que `authMiddleware` agrega `req.token`
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

        res.status(200).json({ message: 'Sesión cerrada exitosamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
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
