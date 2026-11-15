# Binwise

A trash-sorting game built at Junction 2026. Hold a piece of trash up to a camera, drop it in a
bin, and find out straight away whether you sorted it right.

An **Arduino UNO Q** recognises the item with an image model that runs on the board. Three
**Atech** boards, one per bin, sense which bin the item went into and show the result.

## How it works

```
 USB camera
     │ frames
     ▼
┌──────────────────────────────┐
│  Arduino UNO Q               │        ┌─────────────────────┐
│  1. classify the item        │◄───────│ Atech cloud gateway │◄── BIO bin board
│  2. remember it for 15 s     │  one   │                     │◄── PLASTIC bin board
│  3. on a drop: item == bin?  │  web-  │                     │◄── MIXED bin board
│  4. send correct / wrong     │───────►│                     │    (distance sensors)
└──────────────────────────────┘ socket └──────────┬──────────┘
                                 per board         │ verdict
                                                   ▼
                                     Atech board with screen + speaker
```

1. The player shows an item to the camera. The model labels each frame as `bio`, `plastic`,
   `mixed` or `nothing`.
2. When the same class wins three frames in a row at 70% confidence or more, the UNO Q
   remembers it. It has to, because the camera cannot see the item at the moment it is dropped.
3. Each bin's Atech board streams distance readings. A sudden fall in one bin's reading means
   something passed its sensor.
4. The UNO Q compares the remembered item with that bin and sends `correct` or `wrong` to the
   board that has the screen and speaker.

## What is in this repo

| Folder | Contents |
|---|---|
| `unoq-app/` | The Arduino App Lab app that runs on the UNO Q |
| `model/` | Scripts that prepare the training data, and the trained model files |
| `web/` | The project website and statistics dashboard (React + Vite) |
| `server/` | A small data server that stores throws and serves them to the website |
| `docs/` | Project context and architecture notes |

## Hardware

- Arduino UNO Q (2 GB), Arduino USB camera, USB-C hub and 45 W power supply
- Three Atech motherboards, each with a distance sensor; one also has a screen and a speaker
- A Wi-Fi network with internet access that the UNO Q and the Atech boards can all join
  (the Atech boards need 2.4 GHz)

## The model

- Trained in Edge Impulse: MobileNetV2 0.5 with transfer learning, 160x160 RGB input.
- Classes: `bio`, `mixed`, `nothing`, `plastic`.
- Training data: about 500 images per waste class from two public Kaggle datasets
  (`mostafaabla/garbage-classification` and the real-world photos in
  `alistairking/recyclable-and-household-waste-classification`), plus our own photos of demo
  items and of the venue with no item in view.
- Accuracy: 89.5% on 314 held-out test images.
- Speed on the UNO Q: about 35 ms per frame, around 10 frames a second, with no cloud involved.

`model/exported/` holds the trained model as TensorFlow Lite files (`waste_float32.tflite` is
the one to use) and `labels.txt` with the output order.

To rebuild the dataset and upload it to your own Edge Impulse project:

```bash
python model/prepare_data.py prepare <garbage_dir> <household_dir> <out_dir>
python model/prepare_data.py upload <out_dir>          # reads the API key from ~/.ei_key
python model/augment_team.py <own_photos_dir> <out_dir>  # varied copies of your own photos
```

## Running the UNO Q app

1. In Edge Impulse, build the model for the **Arduino UNO Q** target (float32). Copy the
   resulting `.eim` file to the board as
   `/home/arduino/.arduino-bricks/ei-models/waste-sorting.eim` and make it executable.
2. Copy `unoq-app/` to the board as `~/ArduinoApps/waste-classifier/`.
3. Copy `unoq-app/config.example.json` to `python/config.json` inside the app and fill in your
   three Atech project IDs, the bin each one belongs to, and which board gives the feedback.
   This file is git-ignored: anyone with a project ID can send commands to that board.
4. Plug the USB camera into the board through the hub and press **Run** in App Lab, or run
   `arduino-app-cli app start user:waste-classifier` on the board.

The app prints a status line every second, plus a line for each item and each drop:

```
camera: nothing 1.00 | holding: - | bio=182mm  plastic=187mm  mixed=315mm
item locked in: plastic
drop in mixed bin, item seen: plastic -> wrong
```

`unoq-app/python/game.py` holds the game logic (item memory, drop detection, verdict) with no
hardware dependencies. `main.py` connects it to the camera brick and the Atech gateway.

## Atech side

The Atech firmware is generated in Atech Studio and is not part of this repo. Our Atech project
is published here: https://atech.dev/p/8d90ecca228f4f5abd71400e48543313

The boards and the UNO Q exchange these messages through `wss://gateway.atech.dev/ws/live/<project id>`:

- **Bin board to UNO Q**, about 10 times a second:
  `{"type":"distance","payload":{"board":"<MAC>","seq":1,"t_ms":2,"min_mm":385}}`
- **UNO Q to the feedback board**, once per judged drop, where `value` is the item the camera
  saw and so the bin it belongs in:
  `{"type":"send_to_device","device_id":"<project id>","payload":{"action":"wrong","value":"plastic"}}`

The feedback board's firmware should show a happy face and play a sound on `correct`, and a
sad face with the right bin on `wrong`. It should not react to its own distance sensor.

## Website and data server

```bash
cd server && node server.mjs      # needs Node 22.13 or newer; node simulate.mjs sends test throws
cd web && npm install && npm run dev
```

See `server/README.md` for how the website is pointed at the server.

## Known limits

- The model classifies the whole frame, so it handles one item at a time and is affected by
  the background. It is tuned on a small set of demo items.
- A drop is any object passing a sensor, so a hand counts too.
- Everything depends on the Wi-Fi link to Atech's cloud gateway.
- The UNO Q app does not yet report throws to the data server; `server/uno_q_example.py`
  shows the call to add.
