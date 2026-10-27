"""
Servidor HTTP local que emula API Gateway (HTTP API v2) para desarrollo sin AWS.
Puerto por defecto: 8000

Uso:
    python src/local_server.py [puerto]      # o variable de entorno PORT
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict
from urllib.parse import urlsplit

# Permite ejecutar `python src/local_server.py` desde cualquier directorio.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from handlers import mayor_report, orchestrator  # noqa: E402

DEFAULT_PORT = 8000

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Requested-With",
}


class CortafuegosLocalHandler(BaseHTTPRequestHandler):
    """Convierte cada peticion HTTP en un evento API Gateway v2 y delega en los handlers."""

    server_version = "CortafuegosLocal/1.0"

    # ------------------------------------------------------------------ eventos

    def _build_event(self) -> Dict[str, Any]:
        parts = urlsplit(self.path)
        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8") if length > 0 else None
        event: Dict[str, Any] = {
            "version": "2.0",
            "rawPath": parts.path,
            "rawQueryString": parts.query,
            "headers": {k.lower(): v for k, v in self.headers.items()},
            "requestContext": {"http": {"method": self.command, "path": parts.path}},
            "isBase64Encoded": False,
            "body": body,
        }
        if parts.path.startswith("/simulations/"):
            event["pathParameters"] = {"simHash": parts.path.rsplit("/", 1)[-1]}
        return event

    # ------------------------------------------------------------------ ruteo

    def _route(self, event: Dict[str, Any]) -> Dict[str, Any]:
        method = event["requestContext"]["http"]["method"]
        path = event["rawPath"].rstrip("/") or "/"

        if method == "POST" and path == "/mayor-report":
            return mayor_report.lambda_handler(event)
        # GET /health, POST /simulate, GET /simulations/*, OPTIONS /* y 404
        return orchestrator.lambda_handler(event)

    def _dispatch(self) -> None:
        try:
            response = self._route(self._build_event())
        except Exception as exc:  # el servidor local nunca debe caerse
            response = {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "error_interno", "message": str(exc)}),
            }

        payload = (response.get("body") or "").encode("utf-8")
        self.send_response(int(response.get("statusCode", 200)))
        headers = {**CORS_HEADERS, "Content-Type": "application/json", **(response.get("headers") or {})}
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch()

    def do_POST(self) -> None:  # noqa: N802
        self._dispatch()

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._dispatch()

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
        sys.stderr.write("[local] %s - %s\n" % (self.address_string(), format % args))


def _print_banner(port: int) -> None:
    print(
        f"""
==============================================================
  OPERACION CORTAFUEGOS MANTA - Servidor hibrido local
==============================================================
  Escuchando en http://localhost:{port}   (CORS habilitado)

  Endpoints disponibles para el Frontend React:
    GET  http://localhost:{port}/health
    POST http://localhost:{port}/simulate
    GET  http://localhost:{port}/simulations/{{simHash}}
    POST http://localhost:{port}/mayor-report

  Cambia el Switch del Frontend a "Local Server" para usarlo.
  Presiona Ctrl+C para detener.
==============================================================
""",
        flush=True,
    )


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", DEFAULT_PORT))
    server = ThreadingHTTPServer(("0.0.0.0", port), CortafuegosLocalHandler)
    server.daemon_threads = True
    _print_banner(port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
