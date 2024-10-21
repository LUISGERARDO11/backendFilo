const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  jwt_lifetime: { type: Number, required: true, default: 3600 }, // 1 hora por defecto
  verificacion_correo_lifetime: { type: Number, required: true, default: 86400 }, // 24 horas por defecto
  otp_lifetime: { type: Number, required: true, default: 900 }, // 15 minutos por defecto
  sesion_lifetime: { type: Number, required: true, default: 3600 }, // 1 hora por defecto
  cookie_lifetime:{ type:Number, required:true, default: 3600},
  expirationThreshold_lifetime:{type:Number, required:true, default: 900},
  maximo_intentos_fallidos_login:{type: Number, required: true,default:5},
  maximo_bloqueos_en_n_dias:{type: Number, required: true,default:5},
  dias_periodo_de_bloqueo:{type: Number, required: true,default:30},
});

module.exports = mongoose.model('Config', ConfigSchema);
