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
Classes: `plastic`, `bio`, `mixed`, and `nothing` (empty scan zone, added from our own photos).
Source data: Kaggle `mostafaabla/garbage-classification` and the real-world photos from `alistairking/recyclable-and-household-waste-classification`, 500 images per class, 80/20 split, plus one rotated copy of each training image. Model: MobileNetV2 160x160 0.5.

```bash
python model/prepare_data.py prepare <garbage_dir> <household_dir> <out_dir>
python model/prepare_data.py upload <out_dir>   # reads the API key from ~/.ei_key
```

## Trained model
`model/exported/` holds the model trained in Edge Impulse (MobileNetV2 160x160 0.5):
- `waste_float32.tflite` – full precision, the one to use on the UNO Q
- `waste_int8.tflite` – compressed version
- `labels.txt` – output order: bio, mixed, plastic

Input is a 160x160 RGB image. On 302 held-out test images it scores 87% (14 Nov, with our first demo-item photos added).
