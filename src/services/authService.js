/* This JavaScript code snippet is a module that provides various functions related to user
authentication and security. Here is a breakdown of what each function does: */
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
//Importar modelos
const Account = require("../models/Account");
const FailedAttempt = require("../models/FailedAttempt");
const User = require("../models/User");
//importar utilidades
const authUtils = require("../utils/authUtils");

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
// Generar un token JWT para el usuario autenticado
exports.generateJWT = (user) => {
  return jwt.sign(
    { user_id: user._id, tipo_usuario: user.tipo_usuario },
    process.env.JWT_SECRET,
    { expiresIn: "1h" } // El token expirará en 1 hora
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
  const MAX_FAILED_ATTEMPTS = 5; // Número máximo de intentos fallidos permitidos

  // Buscar intentos fallidos previos del usuario
  let failedAttempt = await FailedAttempt.findOne({ user_id });

  if (!failedAttempt) {
    // Si no hay intentos previos, crear un nuevo documento de intento fallido
    failedAttempt = new FailedAttempt({
      user_id,
      fecha: new Date(),
      ip,
      numero_intentos: 1,
    });
  } else {
    // Si ya existen intentos fallidos, incrementar el contador
    failedAttempt.numero_intentos += 1;
    failedAttempt.fecha = new Date();
  }

  await failedAttempt.save();

  // Si el número de intentos supera el máximo permitido, bloquear la cuenta
  if (failedAttempt.numero_intentos >= MAX_FAILED_ATTEMPTS) {
    const account = await Account.findOne({ user_id });
    if (account) {
      account.estado_contrasenia.requiere_cambio = true; // Forzar al usuario a cambiar la contraseña
      await account.save();
    }
    // Cambiar el estado del usuario a 'bloqueado'
    const user = await User.findById(user_id);
    if (user) {
      user.estado = "bloqueado"; // Cambiar el estado del usuario a bloqueado
      await user.save();
    }

    return {
      locked: true,
      message:
        "Cuenta bloqueada temporalmente debido a múltiples intentos fallidos.",
    };
  }

  return { locked: false, message: "Intento fallido registrado." };
};
// Limpiar intentos fallidos después de un inicio de sesión exitoso
exports.clearFailedAttempts = async (user_id) => {
  await FailedAttempt.deleteOne({ user_id });
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

// Configuración del transporte SMTP usando ElasticEmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT, // Puerto SMTP de Gmail
  secure: false, // true para usar SSL/TLS, false para usar el puerto predeterminado
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Habilitar cuando estás trabajando con un entorno de producción seguro
  },
});

//Servicio para enviar un codigo al correo y verificarlo
exports.sendVerificationEmailVersion2 = async (destinatario, token) => {
  try {
    const body = (destinatario, token) => {
      const baseUrls = {
        development: ["http://localhost:3000", "http://127.0.0.1:3000"],
        production: ["https://backend-filo.vercel.app"],
      };

      const currentEnv = baseUrls[process.env.NODE_ENV]
        ? process.env.NODE_ENV
        : "development";
      const verificationLink = `${baseUrls[currentEnv][0]}/auth/verify-email?token=${token}`; // Cambiado a redirigir al backend

      return `
            <div style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
              <h2 style="color: #043464; font-weight: bold; font-size: 24px;">Verificación de correo electrónico</h2>
              <p style="font-size: 16px;">Hola ${destinatario},</p>
              <p style="font-size: 16px;">Gracias por registrarte en nuestro servicio. Por favor, verifica tu dirección de correo electrónico haciendo clic en el enlace de abajo.</p>
              <a href="${verificationLink}" style="display: inline-block; background-color: #043464; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verificar correo electrónico</a>
              <p style="font-size: 16px; margin-top: 20px;">Si no puedes hacer clic en el botón, copia y pega el siguiente enlace en tu navegador:</p>
              <p style="font-size: 16px; word-break: break-all;">${verificationLink}</p>
              <p style="font-weight: bold; font-size: 16px; margin-top: 20px;">Atentamente,</p>
              <p style="font-weight: bold; font-size: 16px;">El equipo de soporte</p>
            </div>
          `;
    };

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: "Verificación de correo",
      html: body(destinatario, token),
    };

    await transporter.sendMail(mailOptions);
    console.log("Verificación de correo enviado con éxito a", destinatario);
  } catch (error) {
    console.error("Error al enviar el correo de verificación:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
//Servicio para enviar un codigo OTP a un usuario para recuperacion de contraseña
exports.sendOTPEmail = async (destinatario, otp) => {
  try {
    const body = `
              <div style="font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
                  <h2 style="color: #d9534f; font-weight: bold; font-size: 24px;">Código de recuperación de contraseña</h2>
                  <p style="font-size: 16px;">Hola ${destinatario},</p>
                  <p style="font-size: 16px;">Has solicitado recuperar tu contraseña. Introduce el siguiente código en la interfaz de recuperación de contraseña:</p>
                  <div style="font-size: 24px; font-weight: bold; letter-spacing: 8px; color: #d9534f; text-align: center; margin-top: 20px;">
                      ${otp.split("").join(" ")}
                  </div>
                  <p style="font-size: 16px; margin-top: 20px;">Este código es válido solo por 15 minutos.</p>
                  <p style="font-weight: bold; font-size: 16px; margin-top: 20px;">Atentamente,</p>
                  <p style="font-weight: bold; font-size: 16px;">El equipo de soporte</p>
              </div>
          `;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: "Código de recuperación de contraseña",
      html: body,
    };

    await transporter.sendMail(mailOptions);
    console.log("Correo con OTP enviado con éxito a", destinatario);
  } catch (error) {
    console.error("Error al enviar el correo con OTP:", error);
    throw new Error("Error al enviar el correo electrónico");
  }
};
// Servicio para enviar el correo de notificación de cambio de contraseña
exports.sendPasswordChangeNotification = async (destinatario) => {
  try {
    // Cuerpo del correo electrónico
    const body = `
        <div style="font-family: Arial, sans-serif; color: #043464; background-color: #ECF0F1; padding: 20px; border-radius: 10px;">
          <h2 style="color: #043464; font-weight: bold; font-size: 24px;">Cambio de contraseña exitoso</h2>
          <p style="font-size: 16px;">Hola ${destinatario},</p>
          <p style="font-size: 16px;">Queremos informarte que has cambiado tu contraseña exitosamente. Si no realizaste este cambio, por favor contacta a nuestro equipo de soporte inmediatamente.</p>
          <p style="font-size: 16px;">Si no solicitaste este cambio, te recomendamos que asegures la seguridad de tu cuenta cambiando tu contraseña inmediatamente.</p>
          <p style="font-weight: bold; font-size: 16px;">Atentamente,</p>
          <p style="font-weight: bold; font-size: 16px;">Tu equipo de soporte</p>
        </div>
      `;

    // Opciones del correo
    const mailOptions = {
      from: process.env.EMAIL_FROM, // Correo del remitente configurado en .env
      to: destinatario, // Destinatario del correo
      subject: "Notificación de cambio de contraseña", // Asunto del correo
      html: body, // Contenido HTML del correo
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);
    console.log("Correo de notificación enviado con éxito a", destinatario);
  } catch (error) {
    console.error("Error al enviar el correo de notificación:", error);
    throw new Error("Error al enviar el correo electrónico");
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