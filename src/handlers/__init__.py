"""
Bootstrap de imports para los handlers.

El motor (src/engine/*.py) importa con rutas absolutas `src.engine...`, que solo
resuelven cuando la raiz del repo esta en sys.path (pytest/unittest desde la raiz).
Sin embargo, en AWS Lambda (CodeUri: ../src/) y en Docker (WORKDIR /app/src) la
carpeta `src` ES la raiz del paquete, asi que el paquete `src` no existe.

Aqui registramos un alias virtual `src` apuntando a la carpeta que contiene
`engine/` y `handlers/`, solo si `src` no es importable. Asi el mismo codigo
funciona en local, en Docker y en Lambda sin modificar el motor.
"""

import importlib.util
import os
import sys
import types

if importlib.util.find_spec("src") is None:
    _alias = types.ModuleType("src")
    _alias.__path__ = [os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]
    sys.modules["src"] = _alias
