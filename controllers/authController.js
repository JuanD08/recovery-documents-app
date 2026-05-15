const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { encrypt } = require('../utils/crypto');

exports.register = async (req, res) => {
    try {
        const { nombre, email, password_hash, telefono, cuenta_billetera } = req.body;

        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHashed = await bcrypt.hash(password_hash, salt);
        
        const telefonoEncriptado = telefono ? encrypt(telefono) : null;
        const cuentaEncriptada = cuenta_billetera ? encrypt(cuenta_billetera) : null;

        const [result] = await pool.query(
            'INSERT INTO usuarios (nombre, email, password_hash, telefono, cuenta_billetera) VALUES (?, ?, ?, ?, ?)',
            [nombre, email, passwordHashed, telefonoEncriptado, cuentaEncriptada]
        );

        await pool.query('INSERT INTO auditoria_logs (usuario_id, accion, detalles) VALUES (?, ?, ?)', 
            [result.insertId, 'REGISTRO_USUARIO', `Email registrado: ${email}`]);

        res.status(201).json({ message: 'Usuario registrado exitosamente', id: result.insertId });
    } catch (error) {
        console.error('❌ Error real en el Registro:', error); 
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password_hash } = req.body;

        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password_hash, user.password_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        await pool.query('INSERT INTO sesiones (usuario_id, token_jwt) VALUES (?, ?)', [user.id, token]);
        
        res.status(200).json({ 
            message: 'Login exitoso', 
            token: token,
            saldo: user.saldo 
        });
    } catch (error) {
        console.error('❌ Error real en el Login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.obtenerSaldo = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const [rows] = await pool.query('SELECT saldo FROM usuarios WHERE id = ?', [usuarioId]);
        
        if (rows.length > 0) {
            res.status(200).json({ saldo: rows[0].saldo });
        } else {
            res.status(404).json({ error: 'Usuario no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const [rows] = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expirationTime = new Date(Date.now() + 15 * 60000); 

        await pool.query('UPDATE usuarios SET otp_codigo = ?, otp_expiracion = ? WHERE email = ?', [otpCode, expirationTime, email]);

        console.log(`\n=========================================`);
        console.log(`📧 SIMULACIÓN DE CORREO A: ${email}`);
        console.log(`🔑 TU CÓDIGO DE RECUPERACIÓN ES: ${otpCode}`);
        console.log(`=========================================\n`);

        res.status(200).json({ message: 'Código generado en consola' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        // CORRECCIÓN: Nombres que coinciden con Android (codigo_otp y nueva_password_hash)
        const { email, codigo_otp, nueva_password_hash } = req.body;
        
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND otp_codigo = ?', [email, codigo_otp]);

        if (rows.length === 0) {
            return res.status(400).json({ error: 'Código incorrecto o expirado' });
        }

        const user = rows[0];
        const now = new Date();

        if (now > new Date(user.otp_expiracion)) {
            return res.status(400).json({ error: 'El código ha expirado' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nueva_password_hash, salt);

        await pool.query('UPDATE usuarios SET password_hash = ?, otp_codigo = NULL, otp_expiracion = NULL WHERE email = ?', [passwordHash, email]);

        console.log(`✅ Contraseña actualizada con éxito para: ${email}`);
        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno' });
    }
};