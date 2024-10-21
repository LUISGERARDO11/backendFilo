/* This code snippet is defining a Mongoose schema for a user in a MongoDB database. Let me break it
down for you: */
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    telefono: {
        type: String,
        required: true
    },
    direccion: {
        calle: { type: String },
        ciudad: { type: String },
        estado: { type: String },
        codigo_postal: { type: String }
        // Ninguno de los campos de dirección es requerido al crear el usuario
    },
    tipo_usuario: {
        type: String,
        enum: ['cliente', 'administrador'], // Puede ser 'cliente' o 'administrador'
        default: 'cliente'
    },
    estado: {
        type: String,
        enum: ['activo', 'bloqueado', 'pendiente','bloqueado_permanente'],
        default: 'pendiente'
    },
    mfa_activado: {
        type: Boolean,
        default: false // Indica si el MFA está activado
    },
    //estos campos ayudan a validar el correo del usuario
    verificacionCorreoToken: { 
        type: String 
    },
    verificacionCorreoExpira: {
        type: Date 
    }
}, { timestamps: true }); // Añade createdAt y updatedAt automáticamente

module.exports = mongoose.model('User', UserSchema);
