# NORTHLINE — Three.js tactical shooter
Engine · Northline Docks map · procedural Glock viewmodel (two-handed) · Source-style b-hop movement.
Next: PeerJS lobby + chat, courtyard map + selector, FFA/TDM.

## Run
    npm install
    npm run dev

## Deploy
Push to GitHub (`./push-to-github.sh northline`), then import the repo on vercel.com (Vite auto-detected).
Repo root must contain index.html, package.json and the src/ folder.

## Layout
    src/main.js      loop, input, firing/spread, HUD, decals
    src/engine.js    renderer, procedural sky + sun, static Batcher (merge per material per chunk), AO-baked box geometry
    src/textures.js  procedural PBR maps
    src/movement.js  fixed 128Hz Source-style controller + collision
    src/glock.js     procedural Glock, hands, animation
    src/maps/yard.js Northline Docks
