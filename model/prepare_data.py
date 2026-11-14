"""Prepare the Kaggle garbage dataset for our 3 bins and upload it to Edge Impulse.

Usage:
    python prepare_data.py prepare <raw_dir> <out_dir>
    python prepare_data.py upload  <out_dir>

<raw_dir> is the unpacked Kaggle "mostafaabla/garbage-classification" folder
(the one containing paper/, plastic/, biological/ ...).
The Edge Impulse API key is read from ~/.ei_key (never commit it).
"""
import random
import sys
from pathlib import Path

from PIL import Image

# our bin -> {source folder: how many images to take}
CLASSES = {
    "plastic": {"plastic": 200},
    "paper": {"paper": 100, "cardboard": 100},
    "bio": {"biological": 200},
}
TEST_FRACTION = 0.2
MAX_SIDE = 320
SEED = 42


def prepare(raw: Path, out: Path) -> None:
    rng = random.Random(SEED)
    for label, sources in CLASSES.items():
        picked = []
        for folder, count in sources.items():
            files = sorted(p for p in (raw / folder).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
            picked += rng.sample(files, count)
        rng.shuffle(picked)
        n_test = int(len(picked) * TEST_FRACTION)
        kept = {"training": 0, "testing": 0}
        for i, src in enumerate(picked):
            split = "testing" if i < n_test else "training"
            try:
                img = Image.open(src).convert("RGB")
            except Exception as err:  # corrupt file: skip it
                print(f"  skipped {src.name}: {err}")
                continue
            img.thumbnail((MAX_SIDE, MAX_SIDE))
            dest = out / split / label
            dest.mkdir(parents=True, exist_ok=True)
            img.save(dest / f"{label}.{src.parent.name}_{src.stem}.jpg", quality=88)
            kept[split] += 1
        print(f"{label}: {kept['training']} training, {kept['testing']} testing")


def upload(out: Path) -> None:
    import requests

    key = (Path.home() / ".ei_key").read_text().strip()
    for split in ("training", "testing"):
        for label_dir in sorted((out / split).iterdir()):
            files = sorted(label_dir.glob("*.jpg"))
            ok = 0
            for start in range(0, len(files), 20):
                batch = files[start:start + 20]
                handles = [open(f, "rb") for f in batch]
                try:
                    res = requests.post(
                        f"https://ingestion.edgeimpulse.com/api/{split}/files",
                        headers={"x-api-key": key, "x-label": label_dir.name},
                        files=[("data", (f.name, h, "image/jpeg")) for f, h in zip(batch, handles)],
                        timeout=120,
                    )
                finally:
                    for h in handles:
                        h.close()
                if res.status_code == 200:
                    ok += len(batch)
                else:
                    print(f"  batch failed ({res.status_code}): {res.text[:200]}")
            print(f"{split}/{label_dir.name}: uploaded {ok}/{len(files)}")


if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "prepare":
        prepare(Path(sys.argv[2]), Path(sys.argv[3]))
    elif len(sys.argv) == 3 and sys.argv[1] == "upload":
        upload(Path(sys.argv[2]))
    else:
        sys.exit(__doc__)
