/* This code snippet is defining a Mongoose schema for an `Account` model in a Node.js application
using MongoDB as the database. Here's a breakdown of what each part of the code is doing: */
const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Referencia a la colección `users`
        required: true
    },
    contrasenia_hash: {
        type: String,
        required: true // Debe estar hasheada 
    },
    ultimo_acceso: {
        type: Date
    },
    /* The `configuracion_2fa` field in the `Account` schema is defining a sub-document with two
    properties: `mfa_tipo` and `enabled`. */
    configuracion_2fa: {
        mfa_tipo: { type: String, enum: ['TOTP', 'SMS'], default: 'TOTP' },
        enabled: { type: Boolean, default: false }
    },
    /* The `estado_contrasenia` field in the `Account` schema is defining a sub-document that contains
    information related to the password state of the account. Here's a breakdown of what each
    property within `estado_contrasenia` is doing: */
    estado_contrasenia: {
        /* `requiere_cambio is defining a property that indicates whether the account
        password requires a change. */
        requiere_cambio: { type: Boolean, default: false },
        /* `fecha_ultimo_cambio. that stores the date and time when the account password was last changed. This property is of type `Date`, indicating
        that it will store a date/time value. It does not have a default value specified, so it will
        be set to `null` until a value is explicitly assigned to it when updating the account
        password. */
        fecha_ultimo_cambio: { type: Date },
    },
    // Gestión del proceso de recuperación de contraseña
    recuperacion_contrasenia: {
        codigo: { type: String }, // Código de recuperación enviado al usuario
        expiracion_codigo: { type: Date }, // Fecha de expiración del código de recuperación
        intentos: { type: Number, default: 0 }, // Intentos fallidos al introducir el código
        codigo_valido: { type: Boolean, default: false } // Si el código sigue siendo válido
    }
}, { timestamps: true });

module.exports = mongoose.model('Account', AccountSchema);
