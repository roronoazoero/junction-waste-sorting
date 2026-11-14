"""Trash-sorting game: the UNO Q classifies the item, Atech boards report drops and show the result.

Settings live in config.json next to this file (not committed, it holds the Atech project IDs).
"""
import asyncio
import json
import threading
import time
from datetime import datetime, UTC
from pathlib import Path

import websockets
from arduino.app_bricks.video_imageclassification import VideoImageClassification
from arduino.app_bricks.web_ui import WebUI
from arduino.app_utils import App

from game import DropDetector, ItemMemory, judge

CONFIG = json.loads((Path(__file__).parent / "config.json").read_text())
BINS = {b["device_id"]: b["bin"] for b in CONFIG["bins"]}  # device id -> bio / plastic / mixed
ACTIONS = CONFIG.get("actions", {"correct": "correct", "wrong": "wrong", "here": "here"})
GATEWAY = "wss://gateway.atech.dev/ws/live/"

ui = WebUI()
stream = VideoImageClassification(confidence=0.5, debounce_sec=0.0)
memory = ItemMemory(
    min_confidence=CONFIG.get("min_confidence", 0.7),
    stable_frames=CONFIG.get("stable_frames", 3),
    hold_seconds=CONFIG.get("hold_seconds", 15),
)
sockets = {}  # device id -> open websocket
score = {"correct": 0, "wrong": 0}

ui.on_message("override_th", lambda sid, threshold: stream.override_threshold(threshold))


def log(message):
    print(f"[game] {message}", flush=True)


def on_classifications(classifications: dict):
    """Called by the camera brick for every classified frame."""
    if not classifications:
        return
    locked = memory.update(classifications)
    if locked:
        log(f"item locked in: {locked}")
        ui.send_message("game", message=json.dumps({"event": "item", "item": locked}))
    now = datetime.now(UTC).isoformat()
    entries = [{"content": k, "confidence": v, "timestamp": now} for k, v in classifications.items()]
    ui.send_message("classifications", message=json.dumps(entries))


stream.on_detect_all(on_classifications)


def find_distance(message):
    """Pull a distance reading in mm out of whatever shape the board sends."""
    payload = message.get("payload", message)
    if isinstance(payload, dict) and isinstance(payload.get("payload"), dict):
        payload = payload["payload"]  # device_event wrapping a distance message
    if not isinstance(payload, dict):
        return None
    for key in ("min_mm", "distance_mm", "mm", "distance"):
        if isinstance(payload.get(key), (int, float)):
            return float(payload[key])
    return None


async def send(device_id, action, value=""):
    ws = sockets.get(device_id)
    if ws is None:
        log(f"cannot send '{action}': {BINS.get(device_id)} board is offline")
        return
    await ws.send(json.dumps({"type": "send_to_device", "device_id": device_id,
                              "payload": {"action": action, "value": value}}))


async def handle_drop(device_id):
    bin_type = BINS[device_id]
    item = memory.current()
    result = judge(item, bin_type)
    log(f"drop in {bin_type} bin, item seen: {item} -> {result}")
    if result == "no_item":
        return
    score[result] += 1
    await send(device_id, ACTIONS[result], item)
    if result == "wrong":
        for other_id, other_bin in BINS.items():
            if other_bin == item:
                await send(other_id, ACTIONS["here"], item)
    memory.clear()
    ui.send_message("game", message=json.dumps(
        {"event": "result", "result": result, "item": item, "bin": bin_type, "score": score}))


async def watch_bin(device_id):
    """Keep one connection open to a bin's board and reconnect if it drops."""
    bin_type = BINS[device_id]
    detector = DropDetector(
        drop_fraction=CONFIG.get("drop_fraction", 0.3),
        min_drop_mm=CONFIG.get("min_drop_mm", 60),
        cooldown_seconds=CONFIG.get("cooldown_seconds", 2.5),
    )
    last_report = 0.0
    while True:
        try:
            async with websockets.connect(GATEWAY + device_id) as ws:
                sockets[device_id] = ws
                log(f"{bin_type} board connected")
                async for raw in ws:
                    try:
                        message = json.loads(raw)
                    except ValueError:
                        continue
                    payload = message.get("payload") if isinstance(message.get("payload"), dict) else {}
                    dropped = payload.get("event") == "drop"  # boards may detect the drop themselves
                    distance = find_distance(message)
                    if distance is not None:
                        dropped = dropped or detector.update(distance)
                        if time.time() - last_report > 10:
                            last_report = time.time()
                            log(f"{bin_type} bin: reading {distance:.0f} mm, usual {detector.baseline}")
                    if dropped:
                        await handle_drop(device_id)
        except Exception as err:  # network drops are expected on venue Wi-Fi
            log(f"{bin_type} board disconnected ({type(err).__name__}), retrying in 3 s")
        finally:
            sockets.pop(device_id, None)
        await asyncio.sleep(3)


async def atech_main():
    await asyncio.gather(*(watch_bin(device_id) for device_id in BINS))


valid = {d: b for d, b in BINS.items() if b in ("bio", "plastic", "mixed")}
if len(valid) != len(BINS) or not BINS:
    log("config.json: every board needs a bin of bio, plastic or mixed. Atech link not started.")
else:
    threading.Thread(target=lambda: asyncio.run(atech_main()), daemon=True).start()

App.run()
