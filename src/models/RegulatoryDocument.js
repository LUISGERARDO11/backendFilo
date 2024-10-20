const mongoose = require('mongoose');

// Esquema para gestionar las versiones de los documentos regulatorios
const VersionSchema = new mongoose.Schema({
    version: { type: String, required: true },  // Ejemplo: '1.0', '2.0'
    contenido: { type: String, required: true }, // Contenido del documento
    fecha_creacion: { type: Date, default: Date.now }, // Fecha en que se creó la versión
    vigente: { type: Boolean, default: false }, // Indica si esta versión está vigente o no
    eliminado: { type: Boolean, default: false } // Marcado lógico para eliminar la versión
});

const RegulatoryDocumentSchema = new mongoose.Schema({
    titulo: { type: String, required: true, enum: ['Política de privacidad', 'Términos y condiciones', 'Deslinde legal'] }, // Título del RD
    versiones: [VersionSchema], // Almacena un array de versiones del documento
    fecha_vigencia: { type: Date }, // Fecha de vigencia de la versión actual
    version_actual: { type: String }, // Versión vigente actual, ejemplo '2.0'
    eliminado: { type: Boolean, default: false } // Eliminación lógica del documento completo
}, { timestamps: true }); // timestamps para createdAt y updatedAt

module.exports = mongoose.model('RegulatoryDocument', RegulatoryDocumentSchema);
