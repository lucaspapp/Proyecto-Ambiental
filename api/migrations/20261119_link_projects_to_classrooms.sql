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
SET p.id_aula = unica_aula.id_aula
WHERE p.id_aula IS NULL;

-- If this fails because some id_aula values are still NULL, assign those
-- projects to the correct classroom before rerunning the final ALTER TABLE.
ALTER TABLE proyectos
  MODIFY COLUMN id_aula INT NOT NULL,
  ADD CONSTRAINT fk_proyectos_aula
    FOREIGN KEY (id_aula) REFERENCES aulas (id_aula)
    ON DELETE CASCADE ON UPDATE CASCADE;
