const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  tipo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailType',
    required: true
  },
  asunto: {
    type: String,
    required: true
  },
  contenido_html: {
    type: String, // Contenido HTML que se usará al enviar el correo
    required: true
  },
  contenido_texto: {
    type: String, // Contenido en texto plano, para clientes de correo que no soporten HTML
    required: true
  },
  variables: {
    type: [String], // Array que contiene las variables dinámicas usadas en el email
    required: true,
    default: []
  },
  activo: {
    type: Boolean,
    default: true
  },
  creado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // Referencia al usuario que creó la plantilla
    required: true
  },
  actualizado_por: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario', // Referencia al último usuario que actualizó la plantilla
    required: false
  }
}, {
  timestamps: {
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion'
  }
});

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
