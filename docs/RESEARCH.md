# Research notes, Ballenas

Checked on 6 November 2026. Sister project of storks.lessane.es. Same rules: only data that clearly allows public display, credited in the study's own words, nothing guessed.

## The short version

- Live, public whale tracks near Spain: none. Movebank's 170 public studies hold no whale study readable anonymously (checked against the anonymous study list on 6 Nov 2026).
- The orcas of the Strait of Gibraltar are satellite tagged since 2023 (CIRCE with MITECO), fin and sperm whales too, but the maps are weekly and in-house, not open data. Asking is free: see docs/outreach/circe.md.
- Archives, CC0, real tracks and real dives: about ten packages in the Movebank Data Repository, none near Spain. Dive behaviour (depth over time) is the one thing whale tags record beautifully, and the page is built on it.
- Named whales: Happywhale identifies individuals by their flukes, with names and decades of encounters. Shared through OBIS-SEAMAP as CC BY-NC, with a "Fin whale in North Atlantic Ocean" set. Sightings, not tracks. Read happywhale.com/terms before building on it.

## Movebank Data Repository, whale packages (all CC0 1.0 unless noted)

| Year | Package | What it is |
|---|---|---|
| 2019 | Sperm whale dive behavior characteristics derived from intermediate-duration archival tag data | Depth over time, the material for the depth page |
| 2019 | Behavioural estimation of blue whale movements in the Northeast Pacific from state-space model analysis of satellite tracks | Blue whale tracks, Pacific |
| 2019 | Fin whale movements in the Gulf of California, Mexico, from satellite telemetry | Fin whale tracks |
| 2019 | Scales of blue and fin whale feeding behavior off California, USA | Feeding behaviour |
| 2020 | Study "Blue and fin whales Southern California 2014-2015 - Argos data" | Tracks |
| 2020 | Study "Sperm whales Gulf of Mexico 2011-2013 - FastLoc GPS data" and "- Argos data" | Tracks, GPS quality |
| 2022 | Deployment details for satellite tags deployed on Antarctic blue whales | Deployments |
| 2023 | Australia's east coast humpback whales: satellite tag derived movements | Tracks, breeding and feeding grounds, migration |

Licences read from the repository's search index. Confirm on each package page before shipping, and copy its citation into the credits.

Sources: https://datarepository.movebank.org/ (search "whale", "Balaenoptera", "Physeter", "Megaptera"), https://openpolar.no/Record/ftdatacite:10.5441%2F001%2F1.98f5r6d0/Details, https://openpolar.no/Record/ftdatacite:10.5441%2F001%2F1.tj291471%2F1/Details

## Spanish waters

- CIRCE (Conservación, Información y Estudio sobre Cetáceos), Algeciras and Tarifa. Photo ID of the Strait's orcas since 1999. Satellite tagging of orcas from 2023 with MITECO, up to seven animals a season, weekly maps of the area they moved through. Fin whale tags in winter with the Estación Biológica de Doñana. Sources: https://fundacion-biodiversidad.es/wp-content/uploads/2023/05/23.05.30-El-MITECO-impulsa-el-marcaje-de-orcas-para-minimizar-la-interaccion-con-las-embarcaciones.pdf, https://costa-news.com/latest-news/satellite-devices-to-track-local-orca-population, https://www.chronicle.gi/where-do-straits-orcas-go-after-tuna-season
- Alborán Corridor IMMA: five fin whales tagged in the Strait with Spot5 tags; the corridor carries fin whales and the endangered Mediterranean sperm whales between the Strait and the Ligurian Sea. Source: https://www.marinemammalhabitat.org/factsheets/alboran-corridor/
- Tethys (Italy): fin whale migration through the Strait, ongoing since 2022, no public feed found. Source: https://tethys.org/?p=573

## Happywhale through OBIS-SEAMAP

- Sharing policy CC BY-NC, data shared to GBIF and OBIS. Records carry Happywhale's organism id and the name the provider gave. Only a portion of Happywhale's data reaches OBIS-SEAMAP.
- Sources: https://seamap.env.duke.edu/dataset/1750/html (Fin whale in North Atlantic Ocean), https://seamap.env.duke.edu/dataset/2293/html, https://seamap.env.duke.edu/dataset/1755/xml
- OBIS-SEAMAP terms: credit the original providers and OBIS-SEAMAP, no redistribution without permission, "permission required" datasets are left out of downloads. Source: https://seamap.env.duke.edu/help/download_main

## Product decision

Direction A: a depth page, not a map. The surface as a line, light falling in vertical stripes, whales as low-poly silhouettes at their real dive depths and durations from the CC0 dive archives. Named whales from Happywhale surface now and then with the date and place of a real encounter. Dark only, vector only, no build step, Spanish and English.

Direction C in parallel: write to CIRCE. If they share orca or fin whale tracks, even delayed, they become the live layer.

Design inspiration: the geometric teal and navy palette of a Buff neckwear print (low-poly whale, vertical light stripes, mountains behind). A palette and a mood, never a copy of their artwork.
