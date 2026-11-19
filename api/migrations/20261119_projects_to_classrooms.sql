-- Run once against an existing database after taking a backup.
-- Projects are assigned automatically only if their owner has exactly one
-- classroom. Any ambiguous/unmatched project must be assigned manually.
SET NAMES utf8mb4;

ALTER TABLE proyectos
  ADD COLUMN id_aula INT NULL AFTER Usuario,
  ADD KEY idx_proyectos_aula (id_aula);

UPDATE proyectos AS p
INNER JOIN (
  SELECT propietario, MIN(id_aula) AS id_aula
  FROM aulas
  GROUP BY propietario
  HAVING COUNT(*) = 1
) AS unica_aula ON unica_aula.propietario = p.Usuario
SET p.id_aula = unica_aula.id_aula;

SELECT Id_proyecto, Usuario, Titulo
FROM proyectos
WHERE id_aula IS NULL;

-- If rows are returned, assign each project to its verified aula before
-- running this ALTER. Do not rerun this whole file after the first ALTER.
ALTER TABLE proyectos
  MODIFY COLUMN id_aula INT NOT NULL,
  ADD CONSTRAINT fk_proyectos_aula
    FOREIGN KEY (id_aula) REFERENCES aulas (id_aula)
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO tipo_sensor (nombre, Descripcion, k_conversion)
SELECT 'Temperatura', 'Temperatura ambiente', 1
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_sensor WHERE nombre = 'Temperatura'
);

INSERT INTO tipo_sensor (nombre, Descripcion, k_conversion)
SELECT 'Humedad', 'Humedad relativa', 1
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_sensor WHERE nombre = 'Humedad'
);

INSERT INTO tipo_sensor (nombre, Descripcion, k_conversion)
SELECT 'Calidad del aire', 'Índice de calidad del aire', 1
WHERE NOT EXISTS (
  SELECT 1 FROM tipo_sensor WHERE nombre = 'Calidad del aire'
);
