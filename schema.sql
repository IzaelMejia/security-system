-- Base de datos: people_counter
CREATE DATABASE IF NOT EXISTS people_counter;
USE people_counter;

-- 1. Tabla Administrador (Usuarios)
CREATE TABLE IF NOT EXISTS administrador (
  adm_id INT AUTO_INCREMENT PRIMARY KEY,
  adm_nombre VARCHAR(100) NOT NULL,
  adm_correo VARCHAR(100) NOT NULL UNIQUE,
  adm_contrasena VARCHAR(255) NOT NULL
);

-- 2. Tabla Contador General
CREATE TABLE IF NOT EXISTS contadorGeneral (
  con_id INT AUTO_INCREMENT PRIMARY KEY,
  con_general INT NOT NULL,
  con_fecha DATE NOT NULL,
  con_hora TIME NOT NULL
);

-- 3. Tabla Contador Entrada
CREATE TABLE IF NOT EXISTS contadorEntrada (
  con_id INT AUTO_INCREMENT PRIMARY KEY,
  con_entrada INT NOT NULL,
  con_fecha DATE NOT NULL,
  con_hora TIME NOT NULL
);

-- 4. Tabla Contador Salida
CREATE TABLE IF NOT EXISTS contadorSalida (
  con_id INT AUTO_INCREMENT PRIMARY KEY,
  con_salida INT NOT NULL,
  con_fecha DATE NOT NULL,
  con_hora TIME NOT NULL
);

-- 5. Tabla Alertas de Seguridad
CREATE TABLE IF NOT EXISTS alertas_seguridad (
  al_id INT AUTO_INCREMENT PRIMARY KEY,
  al_tipo VARCHAR(50) NOT NULL, -- 'Intrusión', 'Arma Detectada', etc.
  al_descripcion TEXT,
  al_fecha DATE NOT NULL,
  al_hora TIME NOT NULL
);


-- PROCEDIMIENTOS ALMACENADOS

DELIMITER //

-- Procedimiento para Registrar Administrador
CREATE PROCEDURE IF NOT EXISTS sp_InsAdministrador(
  IN p_nombre VARCHAR(100),
  IN p_correo VARCHAR(100),
  IN p_contrasena VARCHAR(255)
)
BEGIN
  DECLARE correo_existe INT;
  SELECT COUNT(*) INTO correo_existe FROM administrador WHERE adm_correo = p_correo;
  
  IF correo_existe > 0 THEN
    SELECT 'Correo ya registrado' AS resultado;
  ELSE
    INSERT INTO administrador (adm_nombre, adm_correo, adm_contrasena)
    VALUES (p_nombre, p_correo, p_contrasena);
    SELECT 'Registro Exitoso' AS resultado;
  END IF;
END //

-- Procedimiento para Obtener Administrador por Correo (Para validación con bcrypt en NodeJS)
CREATE PROCEDURE IF NOT EXISTS sp_ObtenerAdministradorPorCorreo(
  IN p_correo VARCHAR(100)
)
BEGIN
  SELECT adm_id, adm_nombre, adm_correo, adm_contrasena FROM administrador 
  WHERE adm_correo = p_correo;
END //

-- Procedimiento para Validar Inicio de Sesión (Tradicional / Texto Plano)
CREATE PROCEDURE IF NOT EXISTS validar_inicio_sesion(
  IN p_correo VARCHAR(100),
  IN p_contrasena VARCHAR(255)
)
BEGIN
  DECLARE usuario_valido INT;
  SELECT COUNT(*) INTO usuario_valido FROM administrador 
  WHERE adm_correo = p_correo AND adm_contrasena = p_contrasena;
  
  IF usuario_valido > 0 THEN
    SELECT 'Inicio Exitoso' AS mensaje;
  ELSE
    SELECT 'Credenciales Incorrectas' AS mensaje;
  END IF;
END //

-- Procedimiento para Insertar Contador General
CREATE PROCEDURE IF NOT EXISTS sp_InsertarContadorGeneral(
  IN p_con_general INT,
  IN p_fecha DATE,
  IN p_hora TIME
)
BEGIN
  INSERT INTO contadorGeneral (con_general, con_fecha, con_hora)
  VALUES (p_con_general, p_fecha, p_hora);
END //

-- Procedimiento para Insertar Contador Entrada
CREATE PROCEDURE IF NOT EXISTS sp_InsertarContadorEntrada(
  IN p_con_entrada INT,
  IN p_fecha DATE,
  IN p_hora TIME
)
BEGIN
  INSERT INTO contadorEntrada (con_entrada, con_fecha, p_hora)
  VALUES (p_con_entrada, p_fecha, p_hora);
END //

-- Procedimiento para Insertar Contador Salida
CREATE PROCEDURE IF NOT EXISTS sp_InsertarContadorSalida(
  IN p_con_salida INT,
  IN p_fecha DATE,
  IN p_hora TIME
)
BEGIN
  INSERT INTO contadorSalida (con_salida, con_fecha, p_hora)
  VALUES (p_con_salida, p_fecha, p_hora);
END //

DELIMITER ;
