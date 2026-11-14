"""Make augmented copies of our own demo-item photos so they carry weight in training.

Usage: python augment_team.py <team_dir> <out_dir> [copies_per_photo]

<team_dir> holds one folder per label (plastic/, mixed/, ...). The output goes to
<out_dir>/training/<label>/ so `prepare_data.py upload <out_dir>` can send it.
"""
import random
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps

SEED = 7


def variant(img: Image.Image, rng: random.Random) -> Image.Image:
    w, h = img.size
    scale = rng.uniform(0.7, 1.0)  # random crop keeps 70-100% of the frame
    cw, ch = int(w * scale), int(h * scale)
    left, top = rng.randint(0, w - cw), rng.randint(0, h - ch)
    out = img.crop((left, top, left + cw, top + ch))
    if rng.random() < 0.5:
        out = ImageOps.mirror(out)
    out = out.rotate(rng.choice([0, 0, 90, 180, 270]) + rng.uniform(-20, 20), resample=Image.BILINEAR)
    out = ImageEnhance.Brightness(out).enhance(rng.uniform(0.7, 1.3))
    out = ImageEnhance.Contrast(out).enhance(rng.uniform(0.8, 1.25))
    out = ImageEnhance.Color(out).enhance(rng.uniform(0.8, 1.2))
    return out.resize((320, 320))


def main(team: Path, out: Path, copies: int) -> None:
    rng = random.Random(SEED)
    for label_dir in sorted(p for p in team.iterdir() if p.is_dir()):
        dest = out / "training" / label_dir.name
        dest.mkdir(parents=True, exist_ok=True)
        photos = sorted(label_dir.glob("*.jpg"))
        for photo in photos:
            img = Image.open(photo).convert("RGB")
            for i in range(copies):
                variant(img, rng).save(dest / f"teamaug_{label_dir.name}_{photo.stem}_{i:02d}.jpg", quality=88)
        print(f"{label_dir.name}: {len(photos)} photos -> {len(photos) * copies} copies")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else 20)
