import mysql.connector
from mysql.connector import Error

try:
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="temp"
    )

    if connection.is_connected():
        print("Conexión exitosa.")
        cursor = connection.cursor()

        # Ejecuta todas tus consultas aquí
        cursor.execute("SELECT * FROM tu_tabla")
        resultados = cursor.fetchall()

        for fila in resultados:
            print(fila)

        # Cuando ya no necesites la conexión
        cursor.close()
        connection.close()

except Error as e:
    print(f"Error: {e}")
