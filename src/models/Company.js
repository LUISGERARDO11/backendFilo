const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true,
        index: true
    },
    título_página:{
        type:String,
    }, 
    logo: { 
        type: String // URL del logo
    },
    slogan: { 
        type: String 
    },
    direccion: {
        calle: { 
            type: String 
        },
        ciudad: { 
            type: String 
        },
        estado: { 
            type: String 
        },
        codigo_postal: { 
            type: String 
        },
        pais: { 
            type: String 
        }
    },
    telefono: { 
        numero: { 
            type: String 
        },
        extension: { 
            type: String // Extensión opcional para números de oficina
        }
    },
    email: { 
        type: String, 
        required: true ,
        index: true, 
        unique: true
    },
    redes_sociales: {
        facebook: { 
            type: String 
        },
        twitter: { 
            type: String 
        },
        linkedin: { 
            type: String 
        },
        instagram: { 
            type: String 
        }
    },
    activo: { type: Boolean, default: true }
}, { timestamps: true }); // Agrega timestamps para createdAt y updatedAt

module.exports = mongoose.model('Company', CompanySchema);
