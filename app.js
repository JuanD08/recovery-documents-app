const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authController = require('./controllers/authController');
const documentController = require('./controllers/documentController');
const verifyToken = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Rutas de Autenticación
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/usuarios/saldo', verifyToken, authController.obtenerSaldo);
app.post('/api/auth/forgot-password', authController.forgotPassword);
app.post('/api/auth/reset-password', authController.resetPassword);

// Rutas de Documentos y Finanzas
app.post('/api/documentos', verifyToken, documentController.registrarHallazgo);
app.get('/api/documentos/historial', verifyToken, documentController.obtenerHistorial);
app.post('/api/documentos/buscar', verifyToken, documentController.buscarMiDocumento);
app.post('/api/usuarios/retiro', verifyToken, documentController.solicitarRetiro);

const PORT = process.env.PORT || 3000;

// AQUÍ ESTÁ LA MAGIA PARA DOCKER: Agregamos '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor en el puerto ${PORT}. Operando en modo local (sin Google Auth).`);
});