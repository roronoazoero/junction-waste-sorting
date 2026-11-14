"""Example for the UNO Q (Linux side): report a throw to the data server.

Call send_throw() at the same moment the UNO Q sends happy / sad.
Uses only the Python standard library.
"""

import json
import urllib.request

SERVER = "http://192.168.1.20:3000"  # the address the server prints as "From the UNO Q"
STATION_ID = "station-1"             # must match an id in server/stations.json
STATION_KEY = ""                     # same value as STATION_KEY in server/.env, if one is set


def _post(path, payload):
    request = urllib.request.Request(
        SERVER + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "X-Station-Key": STATION_KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.status == 201
    except OSError as error:
        # Never let logging break the sorting itself.
        print("Could not reach the data server:", error)
        return False


def send_throw(category, landed_bin, confidence=1.0):
    """category and landed_bin are "bio", "plastic" or "mixed"."""
    return _post("/events", {
        "stationId": STATION_ID,
        "category": category,      # what the classifier saw
        "landedBin": landed_bin,   # which bin board saw the drop
        "confidence": confidence,  # 0-1; below 0.6 the dashboard counts it but does not score it
    })


def send_emptied(bin_name=None):
    """Report that a bin was emptied. Leave bin_name out if all three were emptied."""
    payload = {"stationId": STATION_ID}
    if bin_name:
        payload["bin"] = bin_name
    return _post("/emptyings", payload)


if __name__ == "__main__":
    print("sent:", send_throw("plastic", "mixed", 0.91))
