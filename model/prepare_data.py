"""Prepare two Kaggle waste datasets for our 3 bins and upload them to Edge Impulse.

Usage:
    python prepare_data.py prepare <garbage_dir> <household_dir> <out_dir>
    python prepare_data.py upload  <out_dir>

<garbage_dir>   unpacked "mostafaabla/garbage-classification" (contains plastic/, trash/ ...)
<household_dir> unpacked "alistairking/recyclable-and-household-waste-classification"
                (the images/images folder; we only use its real_world photos)
The Edge Impulse API key is read from ~/.ei_key (never commit it).
"""
import random
import sys
from pathlib import Path

from PIL import Image

# our bin -> {(dataset, source folder): how many images to take}
RW = "real_world"
CLASSES = {
    "plastic": {
        ("garbage", "plastic"): 200,
        ("household", f"plastic_food_containers/{RW}"): 50,
        ("household", f"plastic_soda_bottles/{RW}"): 50,
        ("household", f"plastic_water_bottles/{RW}"): 50,
        ("household", f"plastic_shopping_bags/{RW}"): 50,
        ("household", f"plastic_cup_lids/{RW}"): 50,
        ("household", f"plastic_detergent_bottles/{RW}"): 50,
    },
    "bio": {
        ("garbage", "biological"): 200,
        ("household", f"food_waste/{RW}"): 75,
        ("household", f"coffee_grounds/{RW}"): 75,
        ("household", f"eggshells/{RW}"): 75,
        ("household", f"tea_bags/{RW}"): 75,
    },
    "mixed": {
        ("garbage", "trash"): 200,
        # not packaging, so mixed waste under Finnish sorting rules
        ("household", f"disposable_plastic_cutlery/{RW}"): 150,
        ("household", f"plastic_straws/{RW}"): 150,
    },
}
TEST_FRACTION = 0.2
MAX_SIDE = 320
SEED = 42


def prepare(roots: dict, out: Path) -> None:
    rng = random.Random(SEED)
    for label, sources in CLASSES.items():
        picked = []
        for (dataset, folder), count in sources.items():
            files = sorted(p for p in (roots[dataset] / folder).iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
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
            name = f"{label}.{src.parent.name}_{src.parent.parent.name}_{src.stem}"
            img.save(dest / f"{name}.jpg", quality=88)
            kept[split] += 1
            if split == "training":
                # one extra rotated copy so the model does not rely on orientation
                angle = rng.choice([90, 180, 270])
                img.rotate(angle, expand=True).save(dest / f"{name}_rot{angle}.jpg", quality=88)
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
                    for attempt in range(3):  # venue Wi-Fi drops requests now and then
                        for h in handles:
                            h.seek(0)
                        try:
                            res = requests.post(
                                f"https://ingestion.edgeimpulse.com/api/{split}/files",
                                headers={"x-api-key": key, "x-label": label_dir.name},
                                files=[("data", (f.name, h, "image/jpeg")) for f, h in zip(batch, handles)],
                                timeout=120,
                            )
                        except requests.RequestException as err:
                            res = None
                            print(f"  retrying after {type(err).__name__}")
                            continue
                        break
                finally:
                    for h in handles:
                        h.close()
                if res is not None and res.status_code == 200:
                    ok += len(batch)
                else:
                    print(f"  batch failed: {res.status_code if res is not None else 'no response'}")
            print(f"{split}/{label_dir.name}: uploaded {ok}/{len(files)}")


if __name__ == "__main__":
    if len(sys.argv) == 5 and sys.argv[1] == "prepare":
        prepare({"garbage": Path(sys.argv[2]), "household": Path(sys.argv[3])}, Path(sys.argv[4]))
    elif len(sys.argv) == 3 and sys.argv[1] == "upload":
        upload(Path(sys.argv[2]))
    else:
        sys.exit(__doc__)
