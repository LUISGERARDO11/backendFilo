const mongoose = require('mongoose');

const EmailTypeSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true // Código único para identificar el tipo de email
  },
  nombre: {
    type: String,
    required: true // Nombre que describe el tipo de email (Ej: Notificación, Boletín)
  },
  descripcion: {
    type: String, // Descripción adicional sobre este tipo de email
    required: false
  },
  variables_requeridas: {
    type: [String], // Variables requeridas para este tipo de email, ejemplo: ['nombre', 'email']
    required: true,
    default: []
  },
  activo: {
    type: Boolean,
    default: true
  },
  creado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // Referencia al usuario que creó el tipo de email
    required: true
  }
}, {
  timestamps: {
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  }
});

module.exports = mongoose.model('EmailType', EmailTypeSchema);
