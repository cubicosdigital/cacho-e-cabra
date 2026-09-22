/** Código del programa de conexión con el terminal ZK; se entrega dentro del archivo que descarga el admin. */
export const PUENTE_PY = `#!/usr/bin/env python3
"""
Puente entre el terminal de huellas ZK (red local del bar) y la web app de Cacho Cabra.

Solo hace conexiones hacia afuera (a la web app) y hacia el terminal por la red local:
no hace falta abrir puertos en el router.
"""
import json
import concurrent.futures
import os
import socket
import sys
import time
import traceback
import urllib.error
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

from zk import ZK, const

FORMATO = "%Y-%m-%d %H:%M:%S"
AQUI = os.path.dirname(os.path.abspath(__file__))


def cargar_env():
    ruta = os.path.join(AQUI, ".env")
    if os.path.exists(ruta):
        for linea in open(ruta, encoding="utf-8"):
            linea = linea.strip()
            if linea and not linea.startswith("#") and "=" in linea:
                k, v = linea.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"'))


cargar_env()
APP_URL = os.environ.get("APP_URL", "").rstrip("/")
TOKEN = os.environ.get("BRIDGE_TOKEN", "")
TERMINAL_IP = os.environ.get("TERMINAL_IP", "")
TERMINAL_PORT = int(os.environ.get("TERMINAL_PORT", "4370"))
INTERVALO = int(os.environ.get("INTERVALO_SEGUNDOS", "8"))
DESCARGA_CADA = int(os.environ.get("DESCARGA_CADA_SEGUNDOS", "60"))


def log(*a):
    print(datetime.now().strftime("%H:%M:%S"), *a, flush=True)


def api(ruta, cuerpo):
    req = urllib.request.Request(
        APP_URL + ruta, data=json.dumps(cuerpo).encode(), method="POST",
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"La web app respondió {e.code}: {e.read().decode()[:200]}")


def leer_info(conn):
    usuarios = conn.get_users()
    huellas = {}
    try:
        for t in conn.get_templates():
            huellas[t.uid] = huellas.get(t.uid, 0) + 1
    except Exception:
        pass
    conn.read_sizes()
    return {
        "ip": TERMINAL_IP,
        "serie": conn.get_serialnumber(),
        "firmware": conn.get_firmware_version(),
        "hora_terminal": conn.get_time().strftime(FORMATO),
        "usuarios": len(usuarios),
        "marcaciones": conn.records,
        "usuarios_detalle": [
            {"uid": u.uid, "user_id": str(u.user_id), "name": u.name, "huellas": huellas.get(u.uid, 0)} for u in usuarios
        ],
    }


# ── Órdenes ───────────────────────────────────────────────────────────────
def cargar_trabajadores(conn, p):
    """Carga solo a los trabajadores elegidos: agrega a los nuevos y actualiza el nombre de los que cambiaron.
    A los que ya estaban iguales no los toca (así no arriesga sus huellas)."""
    existentes = {str(u.user_id): (u.name or "").strip() for u in conn.get_users()}
    elegidos = p["usuarios"]
    nuevos = [u for u in elegidos if str(u["zk_id"]) not in existentes]
    cambiados = [u for u in elegidos if str(u["zk_id"]) in existentes and existentes[str(u["zk_id"])] != u["nombre"]]
    iguales = len(elegidos) - len(nuevos) - len(cambiados)
    if nuevos or cambiados:
        conn.disable_device()
        try:
            for u in nuevos + cambiados:
                conn.set_user(uid=int(u["zk_id"]), name=u["nombre"], privilege=const.USER_DEFAULT,
                              password="", group_id="", user_id=str(u["zk_id"]), card=0)
        finally:
            conn.enable_device()
    partes = []
    if nuevos:
        partes.append(f"{len(nuevos)} nuevo{'s' if len(nuevos) > 1 else ''} cargado{'s' if len(nuevos) > 1 else ''} ({', '.join(u['nombre'] for u in nuevos)})")
    if cambiados:
        partes.append(f"{len(cambiados)} con el nombre actualizado ({', '.join(u['nombre'] for u in cambiados)})")
    if iguales:
        partes.append(f"{iguales} ya estaba{'n' if iguales > 1 else ''} igual y no se tocó")
    return "; ".join(partes)


def ajustar_hora(conn, _p):
    ahora = datetime.now(ZoneInfo("America/Santiago")).replace(tzinfo=None, microsecond=0)
    conn.set_time(ahora)
    return f"Hora ajustada a {ahora.strftime(FORMATO)} (hora de Chile)"


def registrar_huella(conn, p):
    zk_id = int(p["zk_id"])
    if not any(str(u.user_id) == str(zk_id) for u in conn.get_users()):
        raise RuntimeError("El trabajador no está cargado en el terminal. Pulsa primero «Cargar trabajadores».")
    # El registro espera el dedo hasta ~1 minuto: se avisa a la web app para que no me dé por caído.
    api("/api/terminal/puente/latido", {"terminal_ok": True, "solo_latido": True, "ocupado_s": 110,
                                        "mensaje": f"Esperando la huella de {p.get('nombre', '')}…"})
    log(f"Registrando huella de {p.get('nombre')} (dedo {p.get('dedo', 0)}). Mira la pantalla del terminal.")
    ok = conn.enroll_user(uid=zk_id, temp_id=int(p.get("dedo", 0)), user_id=str(zk_id))
    if not ok:
        raise RuntimeError("No se completó el registro (se acabó el tiempo o la huella no se leyó bien). Inténtalo de nuevo.")
    return f"Huella de {p.get('nombre')} registrada"


def borrar_usuario(conn, p):
    if not any(str(u.user_id) == str(p["zk_id"]) for u in conn.get_users()):
        raise RuntimeError("Ese trabajador no está en el terminal.")
    conn.delete_user(uid=int(p["zk_id"]), user_id=str(p["zk_id"]))
    return f"{p.get('nombre', 'Trabajador')} borrado del terminal"


def descargar(conn, ultima_marca):
    conn.disable_device()
    try:
        registros = conn.get_attendance()
    finally:
        conn.enable_device()
    corte = ultima_marca or ""
    nuevas = sorted((r for r in registros if r.timestamp.strftime(FORMATO) > corte), key=lambda r: r.timestamp)
    for i in range(0, len(nuevas), 500):
        lote = nuevas[i:i + 500]
        api("/api/terminal/puente/marcaciones", {
            "marcas": [{"user_id": str(r.user_id), "timestamp": r.timestamp.strftime(FORMATO)} for r in lote],
            "hasta": lote[-1].timestamp.strftime(FORMATO),
        })
    if not nuevas:
        api("/api/terminal/puente/marcaciones", {"marcas": []})
    log(f"Marcaciones: {len(nuevas)} nuevas de {len(registros)} en el terminal")
    return f"{len(nuevas)} marcaciones nuevas ({len(registros)} en el terminal)"


ORDENES = {
    "sincronizar_usuarios": cargar_trabajadores,
    "ajustar_hora": ajustar_hora,
    "iniciar_huella": registrar_huella,
    "borrar_usuario": borrar_usuario,
}


def ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return None
    finally:
        s.close()


def puerto_abierto(ip):
    try:
        with socket.create_connection((ip, TERMINAL_PORT), timeout=0.8):
            return ip
    except Exception:
        return None


def descubrir():
    """Busca en la red local (los 254 números de la misma red) algo que responda en el puerto del terminal."""
    mia = ip_local()
    if not mia:
        return None
    base = ".".join(mia.split(".")[:3])
    with concurrent.futures.ThreadPoolExecutor(max_workers=64) as ex:
        hallados = [ip for ip in ex.map(puerto_abierto, (f"{base}.{i}" for i in range(1, 255))) if ip and ip != mia]
    return hallados[0] if len(hallados) == 1 else None


def conectar(estado):
    """Prueba primero la IP que el admin haya escrito a mano, luego la conocida, y si nada responde, busca solo en la red."""
    global TERMINAL_IP
    ip_manual = estado.get("ip_manual")
    if ip_manual and ip_manual != TERMINAL_IP:
        try:
            conn = ZK(ip_manual, port=TERMINAL_PORT, timeout=6, ommit_ping=True).connect()
            log(f"Conectado por la IP indicada en el admin: {ip_manual}")
            TERMINAL_IP = ip_manual
            return conn
        except Exception:
            pass  # se sigue con la IP conocida / la búsqueda automática

    try:
        if not TERMINAL_IP:
            raise RuntimeError("sin IP configurada")
        return ZK(TERMINAL_IP, port=TERMINAL_PORT, timeout=10, ommit_ping=True).connect()
    except Exception as primero:
        if time.time() - estado.get("ultima_busqueda", 0) < 60:
            raise primero
        estado["ultima_busqueda"] = time.time()
        log("Buscando el terminal en la red…")
        nueva = descubrir()
        if not nueva:
            raise RuntimeError("no encontré el terminal en esta red")
        log(f"Terminal encontrado en {nueva}")
        TERMINAL_IP = nueva
        return ZK(TERMINAL_IP, port=TERMINAL_PORT, timeout=10, ommit_ping=True).connect()


def ciclo(estado):
    if "ip_manual" not in estado:
        try:
            resp = api("/api/terminal/puente/latido", {"terminal_ok": False, "solo_latido": False, "mensaje": "Iniciando…"})
            estado["ip_manual"] = resp.get("ip_manual")
        except Exception:
            estado["ip_manual"] = None
    try:
        conn = conectar(estado)
    except Exception as e:
        api("/api/terminal/puente/latido", {"terminal_ok": False, "mensaje": f"No se pudo conectar con el terminal ({e}). Revisa que esté encendido y con el cable de red conectado a la misma red de este computador."})
        if estado.get("conectado", True):
            log("Sin conexión con el terminal:", e)
        estado["conectado"] = False
        return
    if not estado.get("conectado", False):
        log("Conectado al terminal", TERMINAL_IP)
    estado["conectado"] = True

    try:
        resp = api("/api/terminal/puente/latido", {"terminal_ok": True, **leer_info(conn)})
        ultima = resp.get("ultima_marca")
        estado["ip_manual"] = resp.get("ip_manual")
        descargado = False

        for cmd in resp.get("comandos", []):
            log("Orden recibida:", cmd["tipo"])
            try:
                if cmd["tipo"] == "descargar_marcaciones":
                    resultado = descargar(conn, ultima)
                    descargado = True
                else:
                    resultado = ORDENES[cmd["tipo"]](conn, cmd["payload"])
                api(f"/api/terminal/puente/comandos/{cmd['id']}", {"ok": True, "resultado": resultado})
                log("  listo:", resultado)
            except Exception as e:
                api(f"/api/terminal/puente/comandos/{cmd['id']}", {"ok": False, "resultado": str(e)})
                log("  error:", e)

        if not descargado and time.time() - estado.get("ultima_descarga", 0) >= DESCARGA_CADA:
            descargar(conn, ultima)
            estado["ultima_descarga"] = time.time()
    finally:
        try:
            conn.enable_device()
        except Exception:
            pass
        try:
            conn.disconnect()
        except Exception:
            pass


def main():
    faltan = [n for n, v in (("APP_URL", APP_URL), ("BRIDGE_TOKEN", TOKEN)) if not v]
    if faltan:
        sys.exit(f"Faltan datos en terminal-puente/.env: {', '.join(faltan)} (mira .env.example)")
    log(f"Programa de conexión iniciado. Terminal: {TERMINAL_IP or 'se buscará en la red'} → {APP_URL}")
    estado = {}
    while True:
        try:
            ciclo(estado)
        except Exception:
            log("Error en el ciclo (se reintenta):")
            traceback.print_exc()
        time.sleep(INTERVALO)


if __name__ == "__main__":
    main()
`;
