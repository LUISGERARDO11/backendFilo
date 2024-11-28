const RegulatoryDocument = require('../models/RegulatoryDocument');
const loggerUtils = require('../utils/loggerUtils');

// Método para crear un nuevo documento regulatorio
exports.createRegulatoryDocument = async (req, res) => {
    try {
        // Buscar un documento con el mismo título que no esté eliminado
        const existingDocument = await RegulatoryDocument.findOne({ titulo: req.body.titulo, eliminado: false });

        if (existingDocument) {
            // El documento existe y no está eliminado, se agregará una nueva versión
            const currentVersion = existingDocument.versiones.find(v => v.vigente === true);

            if (!currentVersion) {
                return res.status(400).json({ message: 'No se encontró ninguna versión vigente del documento.' });
            }

            // Marcar la versión actual como no vigente
            currentVersion.vigente = false;

            // Encontrar la última versión válida (vigente o eliminada)
            const lastValidVersion = existingDocument.versiones
                .filter(v => !isNaN(parseFloat(v.version))) // Asegurar que la versión sea numérica
                .reduce((prev, curr) => parseFloat(curr.version) > parseFloat(prev.version) ? curr : prev, { version: "0.0" });

            const lastVersionNumber = parseFloat(lastValidVersion.version);
            const nuevaVersion = (lastVersionNumber + 1.0).toFixed(1);

            // Crear la nueva versión con los datos del request
            const nuevaVersionDocumento = {
                version: nuevaVersion,
                contenido: req.body.contenido,
                vigente: true,
                eliminado: false,
                fecha_creacion: new Date()
            };

            // Añadir la nueva versión al array de versiones
            existingDocument.versiones.push(nuevaVersionDocumento);

            // Actualizar la versión actual y la fecha de vigencia
            existingDocument.version_actual = nuevaVersion;
            existingDocument.fecha_vigencia = req.body.fecha_vigencia || new Date();

            // Guardar el documento actualizado
            await existingDocument.save();

            // Registrar la actividad de actualización
            loggerUtils.logUserActivity(req.user._id || 'admin', 'update', `Documento regulatorio ${existingDocument.titulo} actualizado a la versión ${nuevaVersion}.`);

            return res.status(200).json({
                message: `Documento regulatorio actualizado a la versión ${nuevaVersion}.`,
                document: existingDocument
            });
        }

        // Si no existe un documento no eliminado, crear uno nuevo
        const nuevaVersion = {
            version: '1.0',
            contenido: req.body.contenido,
            vigente: true,
            eliminado: false,
            fecha_creacion: new Date()
        };

        const nuevoDocumento = new RegulatoryDocument({
            titulo: req.body.titulo,
            versiones: [nuevaVersion],
            fecha_vigencia: req.body.fecha_vigencia || new Date(),
            version_actual: '1.0',
            eliminado: false
        });

        // Guardar el nuevo documento
        await nuevoDocumento.save();

        // Registrar la actividad de creación
        loggerUtils.logUserActivity(req.user._id || 'admin', 'create', `Documento regulatorio creado: ${req.body.titulo}, versión: 1.0`);

        return res.status(201).json({ message: 'Documento regulatorio creado exitosamente.', document: nuevoDocumento });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        return res.status(500).json({ message: 'Error al procesar el documento regulatorio.', error: error.message });
    }
};
// Método para eliminar lógicamente un documento completo regulatorio
exports.deleteRegulatoryDocument = async (req, res) => {
    const { documentId } = req.params;

    try {
        // Buscar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Verificar si el documento ya está marcado como eliminado
        if (document.eliminado) {
            return res.status(400).json({ message: 'El documento regulatorio ya está marcado como eliminado.' });
        }

        // Marcar el documento como eliminado (estado lógico)
        document.eliminado = true;
        await document.save();

        // Registrar la actividad de eliminación lógica del documento regulatorio
        loggerUtils.logUserActivity(req.user._id, 'delete', `Documento regulatorio (${document.titulo}) marcado como eliminado.`);

        // Responder con éxito
        res.status(200).json({ message: 'Documento regulatorio marcado como eliminado exitosamente.' });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al marcar el documento regulatorio como eliminado.', error: error.message });
    }
};
//Método para eliminar lógicamente una version de un documento regulatorio
exports.deleteRegulatoryDocumentVersion = async (req, res) => {
    const { documentId, versionToDelete } = req.params;

    try {
        // Encontrar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Encontrar la versión que se quiere eliminar
        const version = document.versiones.find(v => v.version === versionToDelete);

        if (!version) {
            return res.status(404).json({ message: 'Versión no encontrada.' });
        }

        if (version.eliminado) {
            return res.status(400).json({ message: 'La versión ya está marcada como eliminada.' });
        }

        // Marcar la versión como eliminada
        version.eliminado = true;
        version.vigente = false; // Marcarla como no vigente si lo era

        // Encontrar la versión anterior para hacerla vigente
        const previousVersion = document.versiones
            .filter(v => !v.eliminado && v.version !== versionToDelete)
            .sort((a, b) => b.fecha_creacion - a.fecha_creacion)[0]; // La más reciente antes de la eliminada

        if (!previousVersion) {
            return res.status(400).json({ message: 'No hay una versión anterior que se pueda hacer vigente.' });
        }

        // Marcar la versión anterior como vigente
        previousVersion.vigente = true;
        document.version_actual = previousVersion.version;
        document.fecha_vigencia = new Date(); // Actualizar la fecha de vigencia

        // Guardar el documento actualizado
        await document.save();

        // Registrar la actividad de eliminación de la versión
        loggerUtils.logUserActivity(req.user._id, 'delete', `Versión ${versionToDelete} eliminada del documento ${document.titulo}. Versión ${previousVersion.version} ahora es vigente.`);

        res.status(200).json({ 
            message: `Versión ${versionToDelete} eliminada exitosamente. La versión ${previousVersion.version} ahora es vigente.`,
            currentVersion: previousVersion.version
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al eliminar la versión del documento regulatorio.', error: error.message });
    }
};
// Método para actualizar el documento regulatorio y crear una nueva versión
exports.updateRegulatoryDocument = async (req, res) => {
    const { documentId } = req.params;
    const { nuevo_contenido, nueva_fecha_vigencia } = req.body;

    try {
        // Buscar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Encontrar la versión vigente actual
        const currentVersion = document.versiones.find(v => v.vigente === true);
        if (!currentVersion) {
            return res.status(400).json({ message: 'No se encontró ninguna versión vigente del documento.' });
        }

        // Marcar la versión actual como no vigente
        currentVersion.vigente = false;

        // Encontrar la última versión válida (vigente o eliminada)
        const lastValidVersion = document.versiones
            .filter(v => !isNaN(parseFloat(v.version))) // Asegurar que la versión sea numérica
            .reduce((prev, curr) => parseFloat(curr.version) > parseFloat(prev.version) ? curr : prev, { version: "0.0" });

        const lastVersionNumber = parseFloat(lastValidVersion.version);
        const nuevaVersion = (lastVersionNumber + 1.0).toFixed(1);

        // Crear la nueva versión con el nuevo contenido
        const nuevaVersionDocumento = {
            version: nuevaVersion,
            contenido: nuevo_contenido,
            vigente: true,
            eliminado: false,
            fecha_creacion: new Date()
        };

        // Añadir la nueva versión al array de versiones del documento
        document.versiones.push(nuevaVersionDocumento);

        // Actualizar la versión actual y la fecha de vigencia en el documento
        document.version_actual = nuevaVersion;
        document.fecha_vigencia = nueva_fecha_vigencia ? new Date(nueva_fecha_vigencia) : new Date();

        // Guardar el documento actualizado
        await document.save();

        // Registrar la actividad de actualización
        loggerUtils.logUserActivity(req.user._id, 'update', `Documento regulatorio ${document.titulo} actualizado a la versión ${nuevaVersion}.`);

        // Responder con éxito
        res.status(200).json({
            message: `Documento regulatorio actualizado a la versión ${nuevaVersion}.`,
            document
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al actualizar el documento regulatorio.', error: error.message });
    }
};
// Método para obtener la versión vigente de todos los documentos regulatorios
exports.getAllCurrentVersions = async (req, res) => {
    try {
        // Buscar todos los documentos regulatorios que no estén eliminados
        const documents = await RegulatoryDocument.find({ eliminado: false });

        if (!documents || documents.length === 0) {
            return res.status(404).json({ message: 'No se encontraron documentos regulatorios.' });
        }

        // Crear un array con las versiones vigentes de todos los documentos
        const currentVersions = documents.map(document => {
            // Encontrar la versión vigente del documento
            const currentVersion = document.versiones.find(v => v.vigente === true && !v.eliminado);

            // Si hay una versión vigente, agregarla al resultado
            if (currentVersion) {
                return {
                    id:document._id,
                    titulo: document.titulo,
                    version: currentVersion.version,
                    contenido: currentVersion.contenido,
                    fecha_vigencia: document.fecha_vigencia
                };
            }
        }).filter(Boolean); // Filtrar para eliminar los documentos que no tienen una versión vigente

        if (currentVersions.length === 0) {
            return res.status(404).json({ message: 'No se encontraron versiones vigentes.' });
        }

        // Registrar el acceso a todas las versiones vigentes
        loggerUtils.logUserActivity(req.user ? req.user._id : 'anon', 'view', 'Se consultaron todas las versiones vigentes de documentos regulatorios.');

        // Devolver las versiones vigentes de todos los documentos
        res.status(200).json({ versiones_vigentes: currentVersions });

    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener las versiones vigentes de los documentos regulatorios.', error: error.message });
    }
};

//Método para obtener la version vigente de un documento regulatorio
exports.getCurrentVersion = async (req, res) => {
    const { titulo } = req.params;

    try {
        // Buscar el documento regulatorio por su título
        const document = await RegulatoryDocument.findOne({ titulo, eliminado: false });

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Encontrar la versión vigente del documento
        const currentVersion = document.versiones.find(v => v.vigente === true && !v.eliminado);

        if (!currentVersion) {
            return res.status(404).json({ message: 'No se encontró una versión vigente del documento regulatorio.' });
        }

        // Registrar el acceso al documento
        loggerUtils.logUserActivity(req.user ? req.user._id : 'anon', 'view', `Versión vigente del documento ${document.titulo} consultada.`);

        // Devolver la versión vigente
        res.status(200).json({
            id:document._id,
            titulo: document.titulo,
            version: currentVersion.version,
            contenido: currentVersion.contenido,
            fecha_vigencia: document.fecha_vigencia
        });

    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al consultar la versión vigente del documento regulatorio.', error: error.message });
    }
};
//Método para obtener el historial de versiones de un documento
exports.getVersionHistory = async (req, res) => {
    const { titulo } = req.params;

    try {
        // Buscar el documento más reciente que no esté eliminado
        const document = await RegulatoryDocument.findOne({ 
            titulo, 
            eliminado: false 
        }).sort({ updatedAt: -1 }); // Ordenar por el campo updatedAt en orden descendente para obtener el más reciente

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado o eliminado.' });
        }

        // Registrar la consulta de historial de versiones
        loggerUtils.logUserActivity(req.user ? req.user._id : 'anon', 'view', `Historial de versiones del documento ${document.titulo} consultado.`);

        // Generar el historial de versiones del documento
        const versionHistory = document.versiones.map(version => ({
            id: version._id,
            version: version.version,
            contenido: version.contenido,
            fecha_creacion: version.fecha_creacion,
            estado: version.eliminado ? 'Eliminado' : (version.vigente ? 'Vigente' : 'No vigente')
        }));

        // Responder con el historial de versiones
        res.status(200).json({
            titulo: document.titulo,
            historial: versionHistory
        });

    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener el historial de versiones del documento regulatorio.', error: error.message });
    }
};
//obtener un documento por su ID
exports.getDocumentById = async (req, res) => {
    const { documentId } = req.params;

    try {
        // Buscar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Registrar el acceso al documento por ID
        loggerUtils.logUserActivity(req.user._id, 'view', `Documento regulatorio con ID ${documentId} consultado.`);

        // Devolver el documento con todas sus versiones
        res.status(200).json({
            id:_id,
            titulo: document.titulo,
            versiones: document.versiones.map(version => ({
                version: version.version,
                contenido: version.contenido,
                fecha_creacion: version.fecha_creacion,
                estado: version.eliminado ? 'Eliminado' : (version.vigente ? 'Vigente' : 'No vigente')
            })),
            fecha_vigencia: document.fecha_vigencia,
            version_actual: document.version_actual
        });

    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al obtener el documento regulatorio.', error: error.message });
    }
};
//Método para restaurar un documento regulatorio por su id
exports.restoreRegulatoryDocument = async (req, res) => {
    const { documentId } = req.params;

    try {
        // Buscar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Verificar si el documento está marcado como eliminado
        if (!document.eliminado) {
            return res.status(400).json({ message: 'El documento no está marcado como eliminado.' });
        }

        // Restaurar el documento cambiando el estado eliminado a false
        document.eliminado = false;
        await document.save();

        // Registrar la restauración del documento
        loggerUtils.logUserActivity(req.user._id, 'restore', `Documento regulatorio ${document.titulo} restaurado.`);

        res.status(200).json({
            message: 'Documento regulatorio restaurado exitosamente.',
            document
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al restaurar el documento regulatorio.', error: error.message });
    }
};
//Método para restaurar una version de un documento regulatorio
exports.restoreRegulatoryDocumentVersion = async (req, res) => {
    const { documentId, versionId } = req.params;

    try {
        // Buscar el documento regulatorio por su ID
        const document = await RegulatoryDocument.findById(documentId);

        if (!document) {
            return res.status(404).json({ message: 'Documento regulatorio no encontrado.' });
        }

        // Buscar la versión a restaurar dentro del documento
        const version = document.versiones.id(versionId);

        if (!version) {
            return res.status(404).json({ message: 'Versión no encontrada.' });
        }

        // Verificar si la versión está marcada como eliminada
        if (!version.eliminado) {
            return res.status(400).json({ message: 'La versión no está marcada como eliminada.' });
        }

        // Restaurar la versión eliminada
        version.eliminado = false;

        // Verificar si es la última versión del documento
        const latestVersion = document.versiones[document.versiones.length - 1];

        if (latestVersion._id.equals(versionId)) {
            // Si es la última versión, marcarla como vigente y desmarcar la anterior vigente
            document.versiones.forEach(v => v.vigente = false);
            version.vigente = true;
            document.version_actual = version.version;
            document.fecha_vigencia = new Date();
        }

        // Guardar los cambios en el documento
        await document.save();

        // Registrar la restauración de la versión
        loggerUtils.logUserActivity(req.user._id, 'restore', `Versión ${version.version} del documento regulatorio ${document.titulo} restaurada.`);

        res.status(200).json({
            message: `Versión ${version.version} del documento restaurada exitosamente.`,
            document
        });
    } catch (error) {
        loggerUtils.logCriticalError(error);
        res.status(500).json({ message: 'Error al restaurar la versión del documento regulatorio.', error: error.message });
    }
};
