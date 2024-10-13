/* This JavaScript code defines a function `trackPasswordHistory` that is responsible for tracking the
password history of a user account and ensuring that a new password has not been used before. Here's
a breakdown of what the code does: */

const PassHistory = require("../models/PassHistory");
const authService = require("../services/authService"); // Para el hash y verificación de contraseñas

// Método para guardar el historial de contraseñas y verificar que la nueva no ha sido utilizada antes
exports.trackPasswordHistory = async (
  accountId,
  currentPassword,
  newPassword
) => {
  try {
    // Verificar que la nueva contraseña no ha sido utilizada antes
    const passHistory = await PassHistory.find({ account_id: accountId });
    for (let history of passHistory) {
      const isUsed = await authService.verifyPassword(
        newPassword,
        history.contrasenia_hash
      );
      if (isUsed) {
        return {
          success: false,
          message: "No puedes usar una contraseña que ya hayas utilizado.",
        };
      }
    }

    // Guardar la contraseña actual en PassHistory antes de actualizarla
    const newPassHistory = new PassHistory({
      account_id: accountId,
      contrasenia_hash: currentPassword, // Almacenar la contraseña actual (hash)
      fecha_cambio: new Date(),
    });
    await newPassHistory.save();

    return { success: true };
  } catch (error) {
    throw new Error(
      "Error al rastrear el historial de contraseñas: " + error.message
    );
  }
};
