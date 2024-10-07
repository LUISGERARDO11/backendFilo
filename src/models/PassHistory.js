/* This JavaScript code defines a Mongoose schema for managing password history in a MongoDB database.
Here's a breakdown of what each part does: */
const mongoose = require('mongoose');

const PassHistorySchema = new mongoose.Schema({
    account_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account', // Referencia a la colección `accounts`
        required: true
    },
    contrasenia_hash: {
        type: String,
        required: true // Hash de la contraseña anterior
    },
    fecha_cambio: {
        type: Date,
        default: Date.now // Fecha del cambio de contraseña
    }
});

module.exports = mongoose.model('PassHistory', PassHistorySchema);
