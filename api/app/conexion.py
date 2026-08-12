import mysql.connector
from mysql.connector import Error

def conectar():
    try:
        conexion = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password="Alumno",
            database="temp"
        )

        if conexion.is_connected():
            cursor = conexion.cursor()
            return conexion, cursor

    except Error as e:
        print(f"Error al conectar con MySQL: {e}")

    return None, None
