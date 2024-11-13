/* This code snippet is a JavaScript function that retrieves and categorizes failed login attempts.
Here's a breakdown of what it does: */
const mongoose = require('mongoose');
const FailedAttempt = require("../models/FailedAttempt");

// Función para obtener y clasificar los intentos fallidos de inicio de sesión
exports.getFailedAttemptsData = async (periodo) => {
  // Determinar la fecha de inicio en base al periodo solicitado
  let fechaInicio;

  switch (periodo) {
      case 'dia':
          fechaInicio = new Date();
          fechaInicio.setDate(fechaInicio.getDate() - 1);
          break;
      case 'semana':
          fechaInicio = new Date();
          fechaInicio.setDate(fechaInicio.getDate() - 7);
          break;
      case 'mes':
          fechaInicio = new Date();
          fechaInicio.setMonth(fechaInicio.getMonth() - 1);
          break;
      default:
          throw new Error('Periodo no válido. Use "dia", "semana" o "mes".');
  }

  // Realizar la consulta en base a la fecha de inicio usando el campo `fecha`
  const failedAttempts = await FailedAttempt.aggregate([
      {
          $match: {
              fecha: { $gte: fechaInicio } // Filtrar por el campo `fecha`
          }
      },
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
              estado: { $first: "$user.estado" },
              tipo_usuario: { $first: "$user.tipo_usuario" },
              numero_intentos: { $sum: "$numero_intentos" }, // Sumar los intentos fallidos
              is_resolved: { $first: "$is_resolved" },
              fecha: { $first: "$fecha" },
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