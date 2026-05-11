const pool = require('../config/db');

exports.registrarHallazgo = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const usuario_id = req.user.id;
        const { tipo_documento, numero_documento, fecha_expedicion, fecha_nacimiento, ubicacion_entrega, imagen_frontal, imagen_trasera, ofrece_recompensa } = req.body;

        const [result] = await connection.query(
            `INSERT INTO documentos (usuario_id, tipo_documento, numero_documento, fecha_expedicion, fecha_nacimiento, ubicacion_entrega, imagen_frontal, imagen_trasera, ofrece_recompensa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [usuario_id, tipo_documento, numero_documento, fecha_expedicion, fecha_nacimiento, ubicacion_entrega, imagen_frontal || null, imagen_trasera || null, ofrece_recompensa ? 1 : 0]
        );

        let saldoActualizado = false;
        try {
            const [logs] = await connection.query('SELECT * FROM auditoria_logs WHERE usuario_id = ? AND accion = "RECOMPENSA_DIARIA" ORDER BY id DESC LIMIT 1', [usuario_id]);
            let darRecompensa = true;
            
            if (logs.length > 0) {
                const ultimoLog = logs[0];
                const fechaBaseDatos = ultimoLog.fecha_log || ultimoLog.created_at || ultimoLog.fecha || ultimoLog.timestamp || new Date();
                if (new Date(fechaBaseDatos).toDateString() === new Date().toDateString()) darRecompensa = false;
            }

            if (darRecompensa) {
                await connection.query('UPDATE usuarios SET saldo = saldo + 5000 WHERE id = ?', [usuario_id]);
                await connection.query('INSERT INTO auditoria_logs (usuario_id, accion, detalles) VALUES (?, ?, ?)', [usuario_id, 'RECOMPENSA_DIARIA', 'Pago de $5000 por primer hallazgo del día']);
                saldoActualizado = true;
            }
        } catch (e) { console.error('Aviso recompensa:', e); }

        await connection.query('INSERT INTO auditoria_logs (usuario_id, accion, detalles) VALUES (?, ?, ?)', [usuario_id, 'REGISTRO_DOCUMENTO_HALLADO', `Se reportó el documento: ${numero_documento}`]);
        await connection.commit();
        
        res.status(201).json({ message: 'Documento registrado', recompensa_aplicada: saldoActualizado });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Error interno en el servidor' });
    } finally {
        if (connection) connection.release();
    }
};

exports.buscarMiDocumento = async (req, res) => {
    try {
        const usuario_id = req.user.id;
        const { tipo_documento, numero_documento, fecha_expedicion, fecha_nacimiento } = req.body;

        const limpiar = (f) => (f && f.length === 10) ? f : null;
        const exp = limpiar(fecha_expedicion);
        const nac = limpiar(fecha_nacimiento);

        // OPTIMIZACIÓN: Solo traemos los campos básicos, omitimos imagen_frontal y trasera para no colapsar la memoria de Android
        const [rows] = await pool.query(
            'SELECT id, usuario_id, tipo_documento, numero_documento, ubicacion_entrega, ofrece_recompensa FROM documentos WHERE tipo_documento = ? AND numero_documento = ?',
            [tipo_documento, numero_documento]
        );

        // SALVAVIDAS KDD: Si la tabla historial_consultas no existe o tiene otra estructura, no rompe el servidor
        try {
            await pool.query(
                'INSERT INTO historial_consultas (usuario_id, tipo_documento, numero_documento, fecha_expedicion, fecha_nacimiento, encontrado) VALUES (?, ?, ?, ?, ?, ?)',
                [usuario_id, tipo_documento, numero_documento, exp, nac, rows.length > 0 ? 1 : 0]
            );
        } catch (kddError) {
            console.log('⚠️ Aviso: Fallo guardando historial de minería de datos. Revisa la tabla historial_consultas.');
        }

        if (rows.length > 0) {
            res.status(200).json({ message: 'Encontrado', documento: rows[0] });
        } else {
            res.status(404).json({ message: 'No encontrado' });
        }
    } catch (error) {
        console.error('❌ Error en búsqueda:', error);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
};

exports.obtenerHistorial = async (req, res) => {
    try {
        // OPTIMIZACIÓN: Solo traemos texto, nada de imágenes
        const [rows] = await pool.query('SELECT id, tipo_documento, numero_documento, fecha_hallazgo, ofrece_recompensa FROM documentos WHERE usuario_id = ? ORDER BY fecha_hallazgo DESC', [req.user.id]);
        res.status(200).json({ historial: rows });
    } catch (e) { res.status(500).send(); }
};

exports.solicitarRetiro = async (req, res) => {
    try {
        const { monto, descripcion } = req.body;
        const [userRows] = await pool.query('SELECT saldo FROM usuarios WHERE id = ?', [req.user.id]);
        if (userRows[0].saldo < monto) return res.status(400).json({ error: 'Saldo insuficiente' });

        await pool.query('UPDATE usuarios SET saldo = saldo - ? WHERE id = ?', [monto, req.user.id]);
        await pool.query('INSERT INTO transacciones (documento_id, receptor_id, monto, tipo_movimiento, descripcion) VALUES (?, ?, ?, ?, ?)', [1, req.user.id, monto, 'RETIRO_PENDIENTE', descripcion]);
        res.status(200).json({ message: 'Retiro procesado' });
    } catch (e) { res.status(500).send(); }
};

exports.obtenerDetallesFotos = async (req, res) => {
    try {
        const { id } = req.params;
        // Aquí sí traemos las imágenes pesadas de la base de datos
        const [rows] = await pool.query(
            'SELECT imagen_frontal, imagen_trasera FROM documentos WHERE id = ?',
            [id]
        );

        if (rows.length > 0) {
            res.status(200).json(rows[0]);
        } else {
            res.status(404).json({ error: 'Documento no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo fotos' });
    }
};