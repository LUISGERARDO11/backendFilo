/* This code snippet is a JavaScript function that retrieves and categorizes failed login attempts.
Here's a breakdown of what it does: */
const FailedAttempt = require("../models/FailedAttempt");

// Función para obtener y clasificar los intentos fallidos de inicio de sesión
exports.getFailedAttemptsData = async () => {
  const failedAttempts = await FailedAttempt.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "user_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $group: {
        _id: "$user._id",
        nombre: { $first: "$user.nombre" },
        email: { $first: "$user.email" },
        tipo_usuario: { $first: "$user.tipo_usuario" },
        numero_intentos: { $sum: 1 },
      },
    },
    {
      $sort: { numero_intentos: -1 },
    },
  ]);

  // Separar clientes y administradores
  const clientes = failedAttempts.filter(
    (user) => user.tipo_usuario === "cliente"
  );
  const administradores = failedAttempts.filter(
    (user) => user.tipo_usuario === "administrador"
  );

  return { clientes, administradores };
};
