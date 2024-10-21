/* This JavaScript code snippet is a module that provides various functions related to user
authentication and security. Here is a breakdown of what each function does: */
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ejs = require('ejs'); // Para renderizar la plantilla HTML
const nodemailer = require("nodemailer");
const transporter = require('../config/transporter');

//Importar modelos
const Account = require("../models/Account");
const FailedAttempt = require("../models/FailedAttempt");
const User = require("../models/User");
const Config = require('../models/Config');
const EmailTemplate = require('../models/EmailTemplate'); // Importar el modelo de plantilla
const EmailType = require('../models/EmailType');
//importar utilidades
const authUtils = require("../utils/authUtils");
const loggerUtils = require('../utils/loggerUtils');

// Cifrar la contraseña antes de guardarla
exports.hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10); // Generar salt
    const hashedPassword = await bcrypt.hash(password, salt); // Hashear la contraseña
    return hashedPassword;
  } catch (error) {
    throw new Error("Error al hashear la contraseña: " + error.message);
  }
};
// Método para verificar una contraseña
exports.verifyPassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword); // Comparar la contraseña ingresada con el hash
    return isMatch;
  } catch (error) {
    throw new Error("Error al verificar la contraseña: " + error.message);
  }
};
exports.verifyPasswordWithOutHash = async (password, storedPassword) => {
  try {
    // Comparar directamente las dos contraseñas en texto plano
    const isMatch = password === storedPassword;
    return isMatch;
  } catch (error) {
    throw new Error("Error al verificar la contraseña: " + error.message);
  }
};
// Generar un token JWT para el usuario autenticado
exports.generateJWT = async (user) => {
  const config = await Config.findOne(); // Obtener la configuración actual
  const jwtLifetime = config ? config.jwt_lifetime : 3600; // Usar la configuración o un valor por defecto
  
  return jwt.sign(
    { user_id: user._id, tipo_usuario: user.tipo_usuario },
    process.env.JWT_SECRET,
    { expiresIn: jwtLifetime } // Usar el tiempo de vida configurado
  );
};
// Verificar que un token JWT es válido
exports.verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error("Token inválido o expirado");
  }
};
// Manejar intentos fallidos de inicio de sesión y bloquear cuentas si es necesario
exports.handleFailedAttempt = async (user_id, ip) => {
  // Buscar la cuenta del usuario para obtener el máximo de intentos permitidos
  const account = await Account.findOne({ user_id });
    
  if (!account) {
      return {
          locked: false,
          message: 'Cuenta no encontrada.',
      };
  }

  const MAX_FAILED_ATTEMPTS = account.maximo_intentos_fallidos_login; // Obtener el máximo de intentos fallidos de la cuenta

  // Buscar intentos fallidos previos del usuario
  let failedAttempt = await FailedAttempt.findOne({ user_id, is_resolved: false });

  if (!failedAttempt) {
      // Si no hay intentos previos, crear un nuevo registro de intento fallido
      failedAttempt = new FailedAttempt({
          user_id,
          fecha: new Date(),
          ip,
          numero_intentos: 1,
          is_resolved: false,
      });
  } else {
      // Si ya existen intentos fallidos, incrementar el contador
      failedAttempt.numero_intentos += 1;
      failedAttempt.fecha = new Date();
  }

  await failedAttempt.save();

  // Si el número de intentos supera el máximo permitido, bloquear la cuenta
  if (failedAttempt.numero_intentos >= MAX_FAILED_ATTEMPTS) {
      // Bloquear la cuenta al forzar el cambio de contraseña
      account.estado_contrasenia.requiere_cambio = true;
      await account.save();

      // Cambiar el estado del usuario a 'bloqueado'
      const user = await User.findById(user_id);
      if (user) {
          user.estado = 'bloqueado'; // Cambiar el estado del usuario a bloqueado
          await user.save();
      }

      loggerUtils.logUserActivity(user_id, 'account_locked', 'Cuenta bloqueada por intentos fallidos');

      return {
          locked: true,
          message: 'Cuenta bloqueada temporalmente debido a múltiples intentos fallidos.',
      };
  }
  loggerUtils.logUserActivity(user_id, 'login_failed', `Intento fallido ${failedAttempt.numero_intentos}/${MAX_FAILED_ATTEMPTS}`);
  return { locked: false, message: 'Intento fallido registrado.' };
};
// Limpiar intentos fallidos después de un inicio de sesión exitoso
exports.clearFailedAttempts = async (user_id) => {
  await FailedAttempt.updateMany({ user_id }, { $set: { is_resolved: true } });
};
// Bloquear la cuenta manualmente si es necesario
exports.lockAccount = async (user_id) => {
  const account = await Account.findOne({ user_id });
  if (account) {
    account.estado_contrasenia.requiere_cambio = true; // Indicar que la contraseña debe cambiarse
    await account.save();
  }
  return { locked: true, message: "Cuenta bloqueada manualmente." };
};
// Método para verificar si el usuario debe cambiar la contraseña (rotación forzada)
exports.forcePasswordRotation = async (accountId) => {
  try {
    // Buscar la cuenta del usuario
    const account = await Account.findById(accountId);
    if (!account) {
      throw new Error("Cuenta no encontrada");
    }

    // Calcular si han pasado más de 6 meses desde el último cambio de contraseña
    const rotationStatus = authUtils.checkPasswordRotation(
      account.estado_contrasenia.fecha_ultimo_cambio
    );

    // Retornar el estado de la rotación de contraseñas
    return rotationStatus;
  } catch (error) {
    throw new Error(
      "Error al verificar la rotación de contraseña: " + error.message
    );
  }
};
// Método para verificar si el usuario está bloqueado
exports.isUserBlocked = async (userId) => {
  try {
    // Buscar la cuenta asociada al usuario
    const account = await Account.findOne({ user_id: userId }).populate(
      "user_id"
    );

    if (!account) {
      return { blocked: false, message: "Cuenta no encontrada." };
    }

    // Verificar si el usuario asociado a la cuenta está bloqueado
    const user = account.user_id;
    if (user.estado === "bloqueado") {
      return { blocked: true, message: "El usuario está bloqueado." };
    }

    // Si el usuario no está bloqueado
    return { blocked: false, message: "El usuario no está bloqueado." };
  } catch (error) {
    console.error("Error verificando el estado del usuario:", error);
    throw new Error("Error verificando el estado del usuario.");
  }
};
//** SERVICIOS PARA ENVIO DE CORREOS ELECTRONICOS EN BASE A PLANTILLAS PREESTABLECICDAS **
//Servicio para enviar un codigo al correo y verificarlo
exports.sendVerificationEmail = async (destinatario, token) => {
  try {
    // Buscar la plantilla de verificación de correo en la base de datos
    const emailType = await EmailType.findOne({ codigo: 'email_verificacion' }); // El código del tipo de email
    if (!emailType) {
      throw new Error('El tipo de email no existe');
    }

    const template = await EmailTemplate.findOne({ tipo: emailType._id });
    if (!template) {
      throw new Error('No se encontró la plantilla de verificación de correo');
    }

    // Reemplazar variables dinámicas en el contenido de la plantilla
    const verificationLink = `${process.env.BASE_URL}/auth/verify-email?token=${token}`; // Link de verificación
    const data = {
      destinatario, // Pasar el destinatario
      token, // Pasar el token
      verificationLink // Pasar el enlace de verificación
    };

    // Renderizar el contenido HTML y el texto plano
    const htmlContent = ejs.render(template.contenido_html, data); // Renderizar el HTML
    const textContent = ejs.render(template.contenido_texto, data); // Renderizar el texto plano

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: template.asunto, // Asunto de la plantilla
      html: htmlContent, // Contenido HTML con las variables reemplazadas
      text: textContent // Contenido en texto plano con las variables reemplazadas
    };

    // Loggear la actividad de envío de correo
    loggerUtils.logUserActivity(null, 'send_verification_email', `Correo de verificación enviado a ${destinatario}`);

    // Enviar el correo
    await transporter.sendMail(mailOptions);
    console.log("Correo de verificación enviado con éxito a", destinatario);
  } catch (error) {
    loggerUtils.logCriticalError(error);
    console.error("Error al enviar el correo de verificación:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
// Servicio para enviar un código OTP a un usuario para autenticación MFA
exports.sendMFAOTPEmail = async (destinatario, otp) => {
  try {
    // Buscar la plantilla de autenticación MFA en la base de datos
    const emailType = await EmailType.findOne({ codigo: 'mfa_autenticacion' }); // Código del tipo de email
    if (!emailType) {
      throw new Error('El tipo de email no existe');
    }

    const template = await EmailTemplate.findOne({ tipo: emailType._id });
    if (!template) {
      throw new Error('No se encontró la plantilla de autenticación MFA');
    }

    // Reemplazar variables dinámicas en el contenido de la plantilla
    const data = {
      destinatario,
      otp: otp.split("").join(" "), // Formatear el OTP
    };

    // Renderizar el contenido HTML y el texto plano
    const htmlContent = ejs.render(template.contenido_html, data);
    const textContent = ejs.render(template.contenido_texto, data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: template.asunto,
      html: htmlContent,
      text: textContent
    };

    loggerUtils.logUserActivity(null, 'send_mfa_otp', `Correo con OTP para MFA enviado a ${destinatario}`);
    await transporter.sendMail(mailOptions);
    console.log("Correo con OTP para MFA enviado con éxito a", destinatario);
  } catch (error) {
    loggerUtils.logCriticalError(error);
    console.error("Error al enviar el correo con OTP para MFA:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
// Servicio para enviar un código OTP a un usuario para recuperación de contraseña
exports.sendOTPEmail = async (destinatario, otp) => {
  try {
    // Buscar la plantilla de recuperación de contraseña en la base de datos
    const emailType = await EmailType.findOne({ codigo: 'recuperacion_contrasena' }); // Código del tipo de email
    if (!emailType) {
      throw new Error('El tipo de email no existe');
    }

    const template = await EmailTemplate.findOne({ tipo: emailType._id });
    if (!template) {
      throw new Error('No se encontró la plantilla de recuperación de contraseña');
    }

    // Reemplazar variables dinámicas en el contenido de la plantilla
    const data = {
      destinatario,
      otp: otp.split("").join(" ") // Formatear el OTP
    };

    // Renderizar el contenido HTML y el texto plano
    const htmlContent = ejs.render(template.contenido_html, data);
    const textContent = ejs.render(template.contenido_texto, data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: template.asunto,
      html: htmlContent,
      text: textContent
    };

    loggerUtils.logUserActivity(null, 'send_otp_recovery', `Correo con OTP enviado a ${destinatario}`);
    await transporter.sendMail(mailOptions);
    console.log("Correo con OTP enviado con éxito a", destinatario);
  } catch (error) {
    loggerUtils.logCriticalError(error);
    console.error("Error al enviar el correo con OTP:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
// Servicio para enviar el correo de notificación de cambio de contraseña
exports.sendPasswordChangeNotification = async (destinatario) => {
  try {
    // Buscar la plantilla de notificación de cambio de contraseña en la base de datos
    const emailType = await EmailType.findOne({ codigo: 'notificacion_cambio_contrasena' }); // Código del tipo de email
    if (!emailType) {
      throw new Error('El tipo de email no existe');
    }

    const template = await EmailTemplate.findOne({ tipo: emailType._id });
    if (!template) {
      throw new Error('No se encontró la plantilla de notificación de cambio de contraseña');
    }

    // Reemplazar variables dinámicas en el contenido de la plantilla
    const data = {
      destinatario
    };

    // Renderizar el contenido HTML y el texto plano
    const htmlContent = ejs.render(template.contenido_html, data);
    const textContent = ejs.render(template.contenido_texto, data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: template.asunto,
      html: htmlContent,
      text: textContent
    };

    loggerUtils.logUserActivity(null, 'send_password_change_notification', `Correo de notificación de cambio de contraseña enviado a ${destinatario}`);
    await transporter.sendMail(mailOptions);
    console.log("Correo de notificación de cambio de contraseña enviado con éxito a", destinatario);
  } catch (error) {
    loggerUtils.logCriticalError(error);
    console.error("Error al enviar el correo de notificación de cambio de contraseña:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
