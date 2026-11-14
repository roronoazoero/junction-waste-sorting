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
FEEDBACK = CONFIG.get("feedback_device")  # board with the screen and speaker; if unset, each bin answers itself
GATEWAY = "wss://gateway.atech.dev/ws/live/"

ui = WebUI()
stream = VideoImageClassification(confidence=0.5, debounce_sec=0.0)
memory = ItemMemory(
    min_confidence=CONFIG.get("min_confidence", 0.7),
    stable_frames=CONFIG.get("stable_frames", 3),
    hold_seconds=CONFIG.get("hold_seconds", 15),
)
sockets = {}  # device id -> open websocket
latest = {"camera": None, "readings": {}}  # for the once-a-second status line
STATUS_SECONDS = CONFIG.get("status_seconds", 1)  # 0 turns the status line off
score = {"correct": 0, "wrong": 0}

ui.on_message("override_th", lambda sid, threshold: stream.override_threshold(threshold))


def log(message):
    print(f"[game] {message}", flush=True)


def on_classifications(classifications: dict):
    """Called by the camera brick for every classified frame."""
    if not classifications:
        return
    latest["camera"] = max(classifications.items(), key=lambda kv: kv[1])
    locked = memory.update(classifications)
    if locked:
        log(f"item locked in: {locked}")
        ui.send_message("game", message=json.dumps({"event": "item", "item": locked}))
    now = datetime.now(UTC).isoformat()
    entries = [{"content": k, "confidence": v, "timestamp": now} for k, v in classifications.items()]
    ui.send_message("classifications", message=json.dumps(entries))


stream.on_detect_all(on_classifications)


def find_distance(message):
    """Pull a distance reading in mm out of whatever shape the board sends.

    The gateway wraps board output as
    {"type":"device_event","payload":{"event_type":"log","value":"<JSON text of the distance message>"}}
    """
    for _ in range(4):  # unwrap nested payloads and JSON text
        if not isinstance(message, dict):
            return None
        for key in ("min_mm", "distance_mm", "mm", "distance"):
            if isinstance(message.get(key), (int, float)):
                return float(message[key])
        inner = message.get("payload", message.get("value"))
        if isinstance(inner, str) and inner.lstrip().startswith("{"):
            try:
                inner = json.loads(inner)
            except ValueError:
                return None
        message = inner
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
    if FEEDBACK:
        # value tells the screen which bin the item belongs in
        await send(FEEDBACK, ACTIONS[result], item)
    else:
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
                        latest["readings"][bin_type] = distance
                    if dropped:
                        await handle_drop(device_id)
        except Exception as err:  # network drops are expected on venue Wi-Fi
            log(f"{bin_type} board disconnected ({type(err).__name__}), retrying in 3 s")
        finally:
            sockets.pop(device_id, None)
            latest["readings"].pop(bin_type, None)
        await asyncio.sleep(3)


async def atech_main():
    await asyncio.gather(*(watch_bin(device_id) for device_id in BINS))


def status_loop():
    """One compact line per second: what the camera sees, what is remembered, each bin's reading."""
    while True:
        time.sleep(STATUS_SECONDS)
        cam = latest["camera"]
        seen = f"{cam[0]} {cam[1] if cam[1] <= 1 else cam[1] / 100:.2f}" if cam else "-"
        bins = "  ".join(f"{b}={latest['readings'][b]:.0f}mm" if b in latest["readings"] else f"{b}=offline"
                         for b in ("bio", "plastic", "mixed") if b in BINS.values())
        log(f"camera: {seen} | holding: {memory.current() or '-'} | {bins}")


if STATUS_SECONDS:
    threading.Thread(target=status_loop, daemon=True).start()

valid = {d: b for d, b in BINS.items() if b in ("bio", "plastic", "mixed")}
if len(valid) != len(BINS) or not BINS:
    log("config.json: every board needs a bin of bio, plastic or mixed. Atech link not started.")
else:
    threading.Thread(target=lambda: asyncio.run(atech_main()), daemon=True).start()

App.run()
