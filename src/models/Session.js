/* This code snippet is defining a Mongoose schema for a Session model in a Node.js application. Here's
a breakdown of what it does: */
const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true // Almacena el token JWT de la sesión
    },
    fecha_creacion: {
        type: Date,
        default: Date.now // Fecha en la que se creó la sesión
    },
    ultima_actividad: {
        type: Date,
        default: Date.now // Fecha de la última actividad
    },
    expiracion: {
        type: Date, // Fecha de expiración de la sesión
        required: true
    },
    ip: {
        type: String,
        required: true // IP desde la que se inició la sesión
    },
    navegador: {
        type: String,
        required: true // Información del dispositivo o navegador
    },
    revocada: {
        type: Boolean,
        default: false // Indica si la sesión ha sido revocada
    }
});

module.exports = mongoose.model('Session', SessionSchema);
