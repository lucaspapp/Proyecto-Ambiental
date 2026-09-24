"""Simula una ESP32 enviando mediciones ambientales a la API."""

from __future__ import annotations

import argparse
import json
import random
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def api_request(api_url: str, path: str, method: str = "GET", body: dict[str, Any] | None = None) -> Any:
    payload = None
    headers = {"Accept": "application/json"}
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = Request(f"{api_url.rstrip('/')}/{path.lstrip('/')}", data=payload, headers=headers, method=method)
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"La API respondió HTTP {error.code}: {detail}") from error
    except URLError as error:
        raise RuntimeError(f"No se pudo conectar con la API: {error.reason}") from error


def valores_aleatorios() -> dict[str, float]:
    return {
        "Temperatura": round(random.uniform(18.0, 31.0), 2),
        "Humedad": round(random.uniform(35.0, 80.0), 2),
        "Calidad del aire": round(random.uniform(10.0, 150.0), 2),
    }


def descubrir_sensores(api_url: str, project_id: int, module_id: int | None) -> tuple[int, dict[str, int]]:
    data = api_request(api_url, f"/proyectos/{project_id}/dispositivos")
    devices = data.get("dispositivos", [])
    device = next(
        (item for item in devices if module_id is None or item.get("id_modulo") == module_id),
        None,
    )
    if device is None:
        raise RuntimeError("No se encontró el microcontrolador indicado en el proyecto.")

    sensors = {
        str(sensor.get("tipo", "")).strip().lower(): int(sensor["id_sp"])
        for sensor in device.get("sensores", [])
        if sensor.get("id_sp") is not None
    }
    required = {"temperatura", "humedad", "calidad del aire"}
    missing = required - sensors.keys()
    if missing:
        raise RuntimeError(
            "Faltan sensores configurados: " + ", ".join(sorted(missing))
        )
    return int(device["id_modulo"]), sensors


def enviar_medicion(api_url: str, project_id: int, module_id: int, sensors: dict[str, int]) -> dict[str, Any]:
    values = valores_aleatorios()
    payload = {
        "id_proyecto": project_id,
        "id_modulo": module_id,
        "mediciones": [
            {"id_sp": sensors["temperatura"], "valor": values["Temperatura"]},
            {"id_sp": sensors["humedad"], "valor": values["Humedad"]},
            {"id_sp": sensors["calidad del aire"], "valor": values["Calidad del aire"]},
        ],
    }
    return api_request(api_url, "/sensores", method="POST", body=payload)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-url", default="http://127.0.0.1:8003")
    parser.add_argument("--project-id", type=int, required=True)
    parser.add_argument("--module-id", type=int)
    parser.add_argument("--interval", type=float, default=5.0)
    parser.add_argument("--iterations", type=int, default=0, help="0 mantiene la simulación hasta Ctrl+C")
    args = parser.parse_args()

    module_id, sensors = descubrir_sensores(args.api_url, args.project_id, args.module_id)
    print(f"Simulando proyecto {args.project_id}, microcontrolador {module_id}. Ctrl+C para detener.")
    count = 0
    while args.iterations == 0 or count < args.iterations:
        result = enviar_medicion(args.api_url, args.project_id, module_id, sensors)
        count += 1
        print(f"[{count}] {result.get('mensaje', 'Medición enviada')} ({result.get('cantidad', 0)} valores)")
        if args.iterations == 0 or count < args.iterations:
            time.sleep(args.interval)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nSimulación detenida.")
    except RuntimeError as error:
        raise SystemExit(f"Error: {error}") from error
