# Model candidates (Sketchfab, downloadable, licence checked through the API)

Files live in `design/candidates/<uid>.glb` (not committed until one is chosen; then it moves to `models/` with its licence).
View with `design/models.html?m=<uid>.glb&ry=<deg>&flat` on a local server. `flat` paints our palette on the real shape.

| uid | author | licence | faces | animations | note |
|---|---|---|---|---|---|
| da07e3ff73914ff28d2b8cf9da794036 | Allie2k, Game-ready Humpback Whale | CC BY | 4968 | none | best body, pectorals spread sideways, ry=-90 |
| bd64878acb0844b2be796ee91855c69e | Connlan_Immure, Humpback Whale (Idle) | CC BY | 6592 | 1 (idle) | superb silhouette, pectoral hanging, ry=0 |
| 38ef05f57bea4de690fab5aed0352a32 | dashkilya, Humpback Whale | CC BY | 10701 | none | two meshes, pale belly as its own mesh, ry=90 |
| 219ed629c9394d869bbf19d443188423 | nolanfa, Humpback Whale, animated, marine mammals | CC BY | 618 | 12 (swim, breathe, jump, eat...) | true low poly, crude, rigged, needs s=1.8 |
| 7984cdf86d6946ca8e13f94a5ad5b33c | ostapblendercg, Humpback Whale | CC BY | 2414 | 1 | textured low poly, wide head, ry=90 |
| d3f5039a8c624e099724dd7bcd51a680 | eelislay, Humpback whale | CC BY | 2756 | 1 | no texture in the glb, odd fins |

Same authors for the other species (not downloaded yet): nolanfa sperm whale, beluga, narwhal (CC BY, animated);
ostapblendercg sperm whale and blue whale (CC BY); 777_Boeing beluga (CC BY); andrey. and murreburr blue whale (CC BY);
CARIMAM humpback, sperm, pygmy sperm, pilot, Cuvier (CC BY-NC-SA, a consistent scientific set); woelper fin whale (CC BY-NC).

CC BY asks for the author's name, the model title, a link to the model and the licence, in the credits sheet.

## Prototypes

- `design/three.html`: my own lofted whale (kept as a record, lost the contest).
- `design/models.html?m=<uid>.glb`: candidate viewer.
- `design/world.html`: Allie2k's whale with a real light engine, fog and soft rays. Vane: "a 90s teacher video".
- `design/poster.html`: no light engine, every triangle one flat colour in four steps, the whale simplified to about 1500 facets. Moods: `?dive`, `?night`, `?deep`, `?bold`, or `#night-dive`. Hosted copy for Vane at https://claude.ai/artifact/3bhExVtEZKQeSk3x8teiio (the model as JSON glTF because the host cannot serve .glb).

## Shipped

The anime look went live: `js/scene.js` draws every whale as a cel shaded, ink outlined model over the 2D sea,
driven by `js/sea.js` (which keeps the data, the dives, the camera and the behaviour). Models in `models/`, baked
with `tools/bake/` (`bake.html` plus a Playwright driver). The drawn 2D whales (`js/whales.js`) remain the fallback
when WebGL or the models are not available.
