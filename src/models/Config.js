const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  jwt_lifetime: { type: Number, required: true, default: 3600 }, // 1 hora por defecto
  verificacion_correo_lifetime: { type: Number, required: true, default: 86400 }, // 24 horas por defecto
  otp_lifetime: { type: Number, required: true, default: 900 }, // 15 minutos por defecto
  sesion_lifetime: { type: Number, required: true, default: 3600 } // 1 hora por defecto
});

module.exports = mongoose.model('Config', ConfigSchema);
