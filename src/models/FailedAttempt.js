/* This JavaScript code defines a Mongoose schema for storing information about failed login attempts.
Here's a breakdown of what each part of the code is doing: */
const mongoose = require('mongoose');

const FailedAttemptSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fecha: {
        type: Date,
        default: Date.now // Registra la fecha del intento fallido
    },
    ip: {
        type: String,
        required: true // IP del intento fallido
    },
    numero_intentos: {
        type: Number,
        default: 1 // Número de intentos fallidos consecutivos
    }
});

module.exports = mongoose.model('FailedAttempt', FailedAttemptSchema);
