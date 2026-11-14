# Sorting data server

Receives throws from the UNO Q, stores them in `data.db`, and serves them to the website.
Needs Node 22.13 or newer. No install step.

    node server.mjs          start it (prints the address the UNO Q should use)
    node simulate.mjs        send fake throws, to test without hardware

- **Stations:** edit `stations.json` to say where each station id is (building, floor, room).
- **UNO Q:** see `uno_q_example.py`. The UNO Q and this computer must be on the same network.
- **Website:** copy `web/.env.example` to `web/.env.local`, then restart the website.
- **Start over:** stop the server and delete `data.db`.
