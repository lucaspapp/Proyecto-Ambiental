# conexion.py
import mysql.connector

def obtener_conexion():
    conexion = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="temp"
    )
    return conexion
