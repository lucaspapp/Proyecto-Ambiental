#!/usr/bin/env python3
"""Simula un medidor EcoLab y publica valores ficticios en la API."""

from __future__ import annotations

import argparse
import getpass
import json
import random
import sys
import time
from http.cookiejar import CookieJar
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import HTTPCookieProcessor, Request, build_opener


# Cambiá esta línea para apuntar a la API publicada.
# En el hosting documentado: https://cn.weblab.tec4.ar/api/public
API_BASE_URL = "http://127.0.0.1:8003"


class ApiClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.opener = build_opener()
        self.credentials: tuple[str, str] | None = None

    def request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        *,
        retry_auth: bool = True,
    ) -> dict:
        body = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = Request(
            f"{self.base_url}/{path.lstrip('/')}",
            data=body,
            headers=headers,
            method=method,
        )
        try:
            with self.opener.open(request, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            try:
                detail = json.loads(error.read().decode("utf-8")).get("detail", str(error))
            except (json.JSONDecodeError, UnicodeDecodeError):
                detail = str(error)
            if error.code == 401 and retry_auth and self.credentials is not None and path == "/sensores":
                self.login(*self.credentials)
                return self.request(method, path, payload, retry_auth=False)
            raise RuntimeError(f"La API respondió {error.code}: {detail}") from error
        except URLError as error:
            raise RuntimeError(f"No se pudo conectar con la API: {error.reason}") from error

    def login(self, username: str, password: str) -> None:
        self.credentials = (username, password)
        self.request(
            "POST",
            "/auth/login",
            {"usuario": username, "contrasenia": password},
            retry_auth=False,
        )


def choose(items: list[dict], title: str, label_key: str) -> dict:
    if not items:
        raise RuntimeError(f"No hay {title.lower()} disponibles para esta cuenta.")

    print(f"\n{title}:")
    for index, item in enumerate(items, start=1):
        label = item.get(label_key) or item.get("nombre") or item.get("titulo")
        extra = f" (ID {item.get('id_aula') or item.get('id_proyecto') or item.get('id_modulo')})"
        print(f"  {index}. {label}{extra}")

    while True:
        answer = input("Elegí una opción: ").strip()
        try:
            selected = int(answer) - 1
            if 0 <= selected < len(items):
                return items[selected]
        except ValueError:
            pass
        print("Opción inválida.")


def select_by_id_or_name(items: list[dict], value: str, label_key: str) -> dict:
    for item in items:
        item_id = str(item.get("id_aula") or item.get("id_proyecto") or item.get("id_modulo"))
        label = str(item.get(label_key) or item.get("nombre") or item.get("titulo"))
        if value == item_id or value.casefold() == label.casefold():
            return item
    raise RuntimeError(f"No se encontró '{value}'.")


def fake_value(sensor: dict, randomizer: random.Random) -> float:
    sensor_type = str(sensor.get("tipo") or "").casefold()
    if "temper" in sensor_type:
        return round(randomizer.uniform(18.0, 32.0), 2)
    if "humedad" in sensor_type:
        return round(randomizer.uniform(35.0, 85.0), 2)
    if "aire" in sensor_type:
        return round(randomizer.uniform(0.0, 200.0), 2)
    return round(randomizer.uniform(0.0, 100.0), 2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=API_BASE_URL)
    parser.add_argument("--usuario", help="Correo de una cuenta con acceso al aula")
    parser.add_argument("--password", help="Contraseña; si se omite, se solicita de forma segura")
    parser.add_argument("--aula", help="ID o nombre del aula")
    parser.add_argument("--proyecto", help="ID o título del proyecto")
    parser.add_argument("--medidor", help="ID o nombre del medidor")
    parser.add_argument("--intervalo", type=float, default=5.0, help="Segundos entre lotes (default: 5)")
    parser.add_argument("--cantidad", type=int, default=0, help="Lotes a enviar; 0 significa hasta Ctrl+C")
    parser.add_argument("--seed", type=int, help="Semilla para repetir la simulación")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    username = args.usuario or input("Usuario: ").strip()
    password = args.password or getpass.getpass("Contraseña: ")
    if args.intervalo <= 0 or args.cantidad < 0:
        print(" intervalo debe ser mayor que cero y cantidad no puede ser negativa.", file=sys.stderr)
        return 2

    client = ApiClient(args.base_url)
    client.opener = build_opener(HTTPCookieProcessor(CookieJar()))
    try:
        client.login(username, password)
        aulas = client.request("GET", "/aulas").get("aulas", [])
        aula = select_by_id_or_name(aulas, args.aula, "nombre") if args.aula else choose(aulas, "Aulas disponibles", "nombre")

        projects = client.request(
            "GET", f"/aulas/{quote(str(aula['id_aula']))}/proyectos"
        ).get("proyectos", [])
        project = (
            select_by_id_or_name(projects, args.proyecto, "titulo")
            if args.proyecto
            else choose(projects, "Proyectos del aula", "titulo")
        )
        meters = project.get("medidores", [])
        meter = (
            select_by_id_or_name(meters, args.medidor, "nombre")
            if args.medidor
            else choose(meters, "Medidores del proyecto", "nombre")
        )
        sensors = meter.get("sensores", [])
        if not sensors:
            raise RuntimeError("El medidor elegido no tiene sensores configurados.")

        randomizer = random.Random(args.seed)
        print(
            f"\nSimulando '{meter['nombre']}' del proyecto '{project['titulo']}' "
            f"en el aula '{aula['nombre']}'."
        )
        print("Presioná Ctrl+C para detener.\n")

        sent = 0
        while args.cantidad == 0 or sent < args.cantidad:
            measurements = [
                {"id_sp": sensor["id_sp"], "valor": fake_value(sensor, randomizer)}
                for sensor in sensors
            ]
            result = client.request(
                "POST",
                "/sensores",
                {
                    "id_proyecto": project["id_proyecto"],
                    "id_modulo": meter["id_modulo"],
                    "mediciones": measurements,
                },
            )
            sent += 1
            values = ", ".join(f"{item['valor']}" for item in measurements)
            print(f"Lote {sent}: {values} | {result.get('mensaje', 'enviado')}")
            if args.cantidad == 0 or sent < args.cantidad:
                time.sleep(args.intervalo)
    except KeyboardInterrupt:
        print("\nSimulación detenida.")
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
