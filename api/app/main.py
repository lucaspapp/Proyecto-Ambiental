from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime
from conexion.py import obtener_conexion
app = FastAPI()
datos_sensores = []

class SensorData (BaseModel):
    temperatura: float
    viento: float
    humedad: float
    aire: float

@app.get("/")
def inicio():
    return {
        "mensaje": "Servidor funcionando"
    }

# Aca envia los datos la ESP32
@app.post("/sensores")
def recibirDatos(datos: SensorData):
    registro = {
        "temperatura": datos.temperatura,
        "viento": datos.viento,
        "humedad": datos.humedad,
        "aire": datos.aire,
        "fecha": datetime.now().strftime("%H:%M:%S")
    }
    datos_sensores.append(registro)
    print('Datos Recibidos')
    print(registro)
    return {
        "ok": True,
        "mensaje": "Datos Guardados"
    }

# Devuelve el ultimo informe recibido
@app.get("/sensores/actual")
def sensoresActual():
    if len(datos_sensores) == 0:
        return {
            "mensaje": "No hay datos aun"
        }
    
    return datos_sensores[-1]
