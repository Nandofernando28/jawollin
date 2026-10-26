import sys
import os
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from handlers.orchestrator import lambda_handler as orchestrator_handler
from handlers.mayor_report import lambda_handler as mayor_report_handler


class LocalApiGatewayHandler(BaseHTTPRequestHandler):
    def _send_lambda_response(self, resp: dict) -> None:
        self.send_response(int(resp.get("statusCode", 200)))
        for k, v in resp.get("headers", {}).items():
            self.send_header(k, v)
        self.end_headers()
        body = resp.get("body", "")
        if body:
            self.wfile.write(body.encode("utf-8"))

    def do_OPTIONS(self) -> None:
        resp = orchestrator_handler({"httpMethod": "OPTIONS", "rawPath": self.path})
        self._send_lambda_response(resp)

    def do_GET(self) -> None:
        resp = orchestrator_handler({"httpMethod": "GET", "rawPath": self.path})
        self._send_lambda_response(resp)

    def do_POST(self) -> None:
        length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
        event = {"httpMethod": "POST", "rawPath": self.path, "body": raw_body}
        if self.path.endswith("/mayor-report"):
            resp = mayor_report_handler(event)
        else:
            resp = orchestrator_handler(event)
        self._send_lambda_response(resp)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Servidor Local API Gateway (Operacion Cortafuegos Manta) activo en http://localhost:{port}")
    HTTPServer(("0.0.0.0", port), LocalApiGatewayHandler).serve_forever()
