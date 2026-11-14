# junction-waste-sorting

Junction 2026 project: a trash-sorting game. An Arduino UNO Q classifies the item
held under its camera (edge AI, trained in Edge Impulse) and an Atech board runs
the game: buttons for each bin, sounds, faces and lights.

## Layout
- `model/` – dataset preparation and upload to Edge Impulse
- `unoq-app/` – the Arduino App Lab app (to come)
- `atech/` – Atech project and prompts (to come)
- `body/` – enclosure files (to come)

## Model
Classes: `plastic`, `paper`, `cardboard`, `bio`, `mixed`, and `nothing` (empty scan zone, added from our own photos).
Source data: Kaggle `mostafaabla/garbage-classification`, 200 images per class, 80/20 split, plus one rotated copy of each training image.

```bash
python model/prepare_data.py prepare <kaggle_raw_dir> <out_dir>
python model/prepare_data.py upload <out_dir>   # reads the API key from ~/.ei_key
```
