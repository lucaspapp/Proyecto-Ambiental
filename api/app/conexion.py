import os
from contextlib import contextmanager
from typing import Iterator

import mysql.connector
from mysql.connector import MySQLConnection
from mysql.connector.cursor import MySQLCursor


def _configuracion() -> dict[str, object]:
    required = ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(
            f"Faltan variables de entorno de la base de datos: {', '.join(missing)}"
        )

    return {
        "host": os.environ["DB_HOST"],
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.environ["DB_USER"],
        "password": os.environ["DB_PASSWORD"],
        "database": os.environ["DB_NAME"],
        "autocommit": False,
    }


@contextmanager
def conexion_db() -> Iterator[tuple[MySQLConnection, MySQLCursor]]:
    conexion = mysql.connector.connect(**_configuracion())
    cursor = conexion.cursor(dictionary=True)
    try:
        yield conexion, cursor
    except Exception:
        conexion.rollback()
        raise
    else:
        conexion.commit()
    finally:
        cursor.close()
        conexion.close()
