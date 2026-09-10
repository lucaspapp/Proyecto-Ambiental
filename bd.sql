-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 10-09-2026 a las 00:34:01
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `cnlab`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `conf_modulos`
--

CREATE TABLE `conf_modulos` (
  `Id_modulo` int(11) NOT NULL,
  `Id_proyecto` int(11) NOT NULL,
  `Data_mediciones` int(11) NOT NULL,
  `Data_guardado` int(11) NOT NULL,
  `Nombre` varchar(150) NOT NULL,
  `Descripcion` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `mediciones`
--

CREATE TABLE `mediciones` (
  `Id_medicion` bigint(20) NOT NULL,
  `Id_proyecto` int(11) NOT NULL,
  `Id_modulo` int(11) NOT NULL,
  `Valor` decimal(15,4) NOT NULL,
  `Tiempo` datetime NOT NULL DEFAULT current_timestamp(),
  `id_sp` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `proyectos`
--

CREATE TABLE `proyectos` (
  `Id_proyecto` int(11) NOT NULL,
  `Usuario` varchar(100) NOT NULL,
  `Descripcion` text DEFAULT NULL,
  `Titulo` varchar(200) NOT NULL,
  `curso` text DEFAULT NULL,
  `Materia` text DEFAULT NULL,
  `Responsable` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sensores_proyecto`
--

CREATE TABLE `sensores_proyecto` (
  `id_sp` int(11) NOT NULL,
  `id_proyecto` int(11) NOT NULL,
  `id_ts` int(11) NOT NULL,
  `t_registro` time NOT NULL DEFAULT '00:05:00',
  `t_muestra` time NOT NULL DEFAULT '00:00:30',
  `descripcion` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_sensor`
--

CREATE TABLE `tipo_sensor` (
  `id_ts` int(11) NOT NULL,
  `nombre` text NOT NULL,
  `Descripcion` text NOT NULL,
  `k_conversion` float NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id_usuario` varchar(100) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido` varchar(100) NOT NULL,
  `Rol` enum('estudiante','docente','invitado','administrador') NOT NULL DEFAULT 'estudiante',
  `Password` varchar(255) NOT NULL DEFAULT 'estudiantes_2026',
  `Institucion` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `conf_modulos`
--
ALTER TABLE `conf_modulos`
  ADD PRIMARY KEY (`Id_modulo`),
  ADD KEY `fk_modulos_proyecto` (`Id_proyecto`);

--
-- Indices de la tabla `mediciones`
--
ALTER TABLE `mediciones`
  ADD PRIMARY KEY (`Id_medicion`),
  ADD KEY `fk_mediciones_proyecto` (`Id_proyecto`),
  ADD KEY `fk_mediciones_modulo` (`Id_modulo`),
  ADD KEY `id_sp` (`id_sp`);

--
-- Indices de la tabla `proyectos`
--
ALTER TABLE `proyectos`
  ADD PRIMARY KEY (`Id_proyecto`),
  ADD KEY `fk_proyectos_usuario` (`Usuario`);

--
-- Indices de la tabla `sensores_proyecto`
--
ALTER TABLE `sensores_proyecto`
  ADD PRIMARY KEY (`id_sp`),
  ADD KEY `id_ts` (`id_ts`),
  ADD KEY `id_proyecto` (`id_proyecto`);

--
-- Indices de la tabla `tipo_sensor`
--
ALTER TABLE `tipo_sensor`
  ADD PRIMARY KEY (`id_ts`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `conf_modulos`
--
ALTER TABLE `conf_modulos`
  MODIFY `Id_modulo` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `mediciones`
--
ALTER TABLE `mediciones`
  MODIFY `Id_medicion` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `proyectos`
--
ALTER TABLE `proyectos`
  MODIFY `Id_proyecto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `sensores_proyecto`
--
ALTER TABLE `sensores_proyecto`
  MODIFY `id_sp` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `tipo_sensor`
--
ALTER TABLE `tipo_sensor`
  MODIFY `id_ts` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `conf_modulos`
--
ALTER TABLE `conf_modulos`
  ADD CONSTRAINT `fk_modulos_proyecto` FOREIGN KEY (`Id_proyecto`) REFERENCES `proyectos` (`Id_proyecto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `mediciones`
--
ALTER TABLE `mediciones`
  ADD CONSTRAINT `fk_mediciones_modulo` FOREIGN KEY (`Id_modulo`) REFERENCES `conf_modulos` (`Id_modulo`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mediciones_proyecto` FOREIGN KEY (`Id_proyecto`) REFERENCES `proyectos` (`Id_proyecto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `mediciones_ibfk_1` FOREIGN KEY (`id_sp`) REFERENCES `sensores_proyecto` (`id_sp`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `proyectos`
--
ALTER TABLE `proyectos`
  ADD CONSTRAINT `fk_proyectos_usuario` FOREIGN KEY (`Usuario`) REFERENCES `usuarios` (`id_usuario`) ON UPDATE CASCADE;

--
-- Filtros para la tabla `sensores_proyecto`
--
ALTER TABLE `sensores_proyecto`
  ADD CONSTRAINT `sensores_proyecto_ibfk_1` FOREIGN KEY (`id_ts`) REFERENCES `tipo_sensor` (`id_ts`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `sensores_proyecto_ibfk_2` FOREIGN KEY (`id_proyecto`) REFERENCES `proyectos` (`Id_proyecto`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
