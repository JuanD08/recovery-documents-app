CREATE DATABASE IF NOT EXISTS recovery_documents_db;
USE recovery_documents_db;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(255) NULL,
    cuenta_billetera VARCHAR(255) NULL,
    saldo DECIMAL(10, 2) DEFAULT 0.00,
    otp_codigo VARCHAR(10) NULL,
    otp_expiracion DATETIME NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL,  -- ¡ESTE ES EL CAMBIO MÁGICO!
    numero_documento VARCHAR(50) NOT NULL,
    fecha_expedicion DATE NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    ubicacion_entrega VARCHAR(255) NOT NULL,
    imagen_frontal LONGTEXT,
    imagen_trasera LONGTEXT,
    ofrece_recompensa BOOLEAN DEFAULT FALSE,
    recompensa_pagada BOOLEAN DEFAULT FALSE,
    fecha_hallazgo TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transacciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento_id INT NOT NULL,
    receptor_id INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    entidad_destino VARCHAR(50) DEFAULT 'Nequi',
    tipo_movimiento ENUM('INGRESO', 'RETIRO_PENDIENTE', 'RETIRO_COMPLETADO') DEFAULT 'INGRESO',
    descripcion VARCHAR(255) NOT NULL,
    fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
    FOREIGN KEY (receptor_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sesiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_jwt TEXT NOT NULL,
    estado ENUM('ACTIVA', 'REVOCADA') DEFAULT 'ACTIVA',
    fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS historial_consultas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    tipo_documento VARCHAR(100),
    numero_documento VARCHAR(50),
    fecha_expedicion DATE,
    fecha_nacimiento DATE,
    encontrado BOOLEAN DEFAULT FALSE,
    fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);