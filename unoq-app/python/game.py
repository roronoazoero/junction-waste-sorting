"""Game logic for the trash-sorting game. No Arduino or network imports, so it can be tested anywhere."""
import statistics
import time
from collections import deque


class ItemMemory:
    """Remembers what the camera last saw clearly, because the item is out of view when it is dropped."""

    def __init__(self, min_confidence=0.7, stable_frames=3, hold_seconds=15.0):
        self.min_confidence = min_confidence
        self.stable_frames = stable_frames
        self.hold_seconds = hold_seconds
        self._streak_label = None
        self._streak = 0
        self.item = None
        self.item_time = 0.0

    def update(self, classifications, now=None):
        """classifications: {label: confidence}. Returns the label if a new item was just locked in."""
        now = time.time() if now is None else now
        if not classifications:
            self._streak_label, self._streak = None, 0
            return None
        label, conf = max(classifications.items(), key=lambda kv: kv[1])
        if conf > 1.0:  # some versions report percentages
            conf /= 100.0
        if conf < self.min_confidence or label == "nothing":
            self._streak_label, self._streak = None, 0
            return None
        if label == self._streak_label:
            self._streak += 1
        else:
            self._streak_label, self._streak = label, 1
        if self._streak >= self.stable_frames:
            is_new = label != self.current(now)
            self.item, self.item_time = label, now
            return label if is_new else None
        return None

    def current(self, now=None):
        now = time.time() if now is None else now
        if self.item and now - self.item_time <= self.hold_seconds:
            return self.item
        return None

    def clear(self):
        self.item = None
        self._streak_label, self._streak = None, 0


class DropDetector:
    """Turns one bin's stream of distance readings into 'something was dropped' events."""

    def __init__(self, drop_fraction=0.3, min_drop_mm=60, cooldown_seconds=2.5, resettle_seconds=5.0):
        self.drop_fraction = drop_fraction
        self.min_drop_mm = min_drop_mm
        self.cooldown_seconds = cooldown_seconds
        self.resettle_seconds = resettle_seconds
        self._readings = deque(maxlen=20)
        self._last_drop = 0.0
        self._blocked_since = None  # set while something is in front of the sensor

    @property
    def baseline(self):
        return statistics.median(self._readings) if len(self._readings) >= 5 else None

    def update(self, distance_mm, now=None):
        """Returns True once, at the moment something passes in front of the sensor."""
        now = time.time() if now is None else now
        base = self.baseline
        if base is None:
            self._readings.append(distance_mm)
            return False
        if distance_mm < base - max(self.min_drop_mm, base * self.drop_fraction):
            if self._blocked_since is None:
                self._blocked_since = now
                if now - self._last_drop >= self.cooldown_seconds:
                    self._last_drop = now
                    return True
            elif now - self._blocked_since >= self.resettle_seconds:
                # the sensor was moved or something was left there: treat this as the new normal
                self._readings.clear()
                self._readings.append(distance_mm)
                self._blocked_since = None
            return False
        self._blocked_since = None
        self._readings.append(distance_mm)  # only normal readings shape the baseline
        return False


def judge(item, bin_type):
    """Returns 'correct', 'wrong' or 'no_item'."""
    if item is None:
        return "no_item"
    return "correct" if item == bin_type else "wrong"
