# Approved visual asset provenance

Source archive supplied by the user on 2026-11-05. Archive SHA-256
`263198d6ba3525da799752083afd10ee409ba19b11b345f64b0eb98650bd62de`.

The original collage, splash concept, alternate title concept, printer concept,
gameplay storyboard, and founder portrait are unmodified in `artwork/originals`.
The supplied A4, B1 and C4 crops are unchanged in `artwork/selected-crops`.

| Runtime asset | Source and transformation |
| --- | --- |
| `window.jpg` | Approved landscape splash concept. Masked to the window, detective and cat, excluding the baked logo, controls and right-wall images. |
| `office.jpg` | Exact C4 selection. Cropped away the selection label and card edges. |
| `detective.png` | Exact A4 selection. Traced the hat, face, pipe and torso from the provided crop. |
| `cat.png` | Exact B1 selection. Traced the face and upper body from the provided crop. |
| `cat-resting.png` | Resting pose from the lower-right gameplay storyboard panel. |
| `grip.png` | Hand from the upper-right gameplay storyboard panel. |
| `crumple-hands.png` | Hands and paper from the lower-left gameplay storyboard panel. |
| `crumpled.png` | Airborne paper ball from the lower-left gameplay storyboard panel. |
| `printer.png` | Printer silhouette from the supplied printer concept. |
| `founder.jpg` | Resized derivative of the uploaded portrait. The game requests it only after Play and displays it only in the office. |
| `images/einstein.jpg` | Harris & Ewing photograph, Library of Congress item 2016885961, no known publication restrictions. The local 150-pixel image is associated with the existing `einstein` casebook ID. [Catalog record](https://www.loc.gov/pictures/item/2016885961/) · [Image file](https://cdn.loc.gov/service/pnp/hec/31000/31012_150px.jpg). |

The visual layers are crops and masks from the supplied references. The game
moves the layers independently. The original static storyboards are retained
for comparison.

## SHA-256 checksums

Paths are relative to `games/riddlex`.

| File | SHA-256 |
| --- | --- |
| artwork/originals/a_detailed_collage_style_concept_board_for_riddle.png | 241eab5aeb57f7be197a18bb3e3ff21620cfb8a2bc2b22ce3166ad2c46a42ba9 |
| artwork/originals/a_highly_detailed_cinematic_warm_lit_illustrated.png | 1477a44dbb7d4a5d36565e99cb6b11e69a84936f0b69ce11d9f801b1f4695198 |
| artwork/originals/a_richly_detailed_cinematic_illustrated_game_titl.png | a60009be095e4fc22adcfef2459ce750488a5cfa464ec03bdb7017cfd11dabbb |
| artwork/originals/detective_s_printer_reveals_the_answer.png | ec39fbf84e21cd404cadf50545ee2ac62e08ab61143deec34a2841c1d28c42c7 |
| artwork/originals/riddlex_detective_game_montage.png | 65fed8f8f93eda2b09aab7fa0ac99b8740c00eaf5459b0b3831ebf721e25def9 |
| artwork/originals/Whakil Ahamed Shakil-.jpg | 1ee3a5c788bcd18ded070f19ec0936c624b3adbec573f0654fd9c894e8ac1f0f |
| artwork/selected-crops/A4_Modern_Classic_Detective.png | d4e4280a888c3c6b067ff155f20bfada501d0cdf59dcd1844ecba9d7411751ba |
| artwork/selected-crops/B1_Fluffy_White_Cat.png | da4e9bce609c5232c701118500d2060ac30eb089be9f9277484743a7d8a55797 |
| artwork/selected-crops/C4_Minimal_Detective_Office.png | f1ee5e9ef48ba65a9094a61de88508dc54020ba9fdd571b71e196d1d68484f71 |
| images/approved/cat-resting.png | ca2370f40d14572c950c0e179b9b898ae18f369e0373a955de0d88c44872bbdb |
| images/approved/cat.png | 6996e07fee1c1df68ff770baa8af28ee3b07783211350352c9d9660b8a943805 |
| images/approved/crumple-hands.png | 456648180a1414e2f8d9567d47072ef289c7a45f51a505aed9677d0b944c7165 |
| images/approved/crumpled.png | 82d9500aa34291804d3e408d2375e9817a301b1dbb7a82902b5e5d942f6f73c2 |
| images/approved/detective.png | 4bb9eb4a39ef456d5d718cb4474b6a127da3aba346ef274139bf8eeb9d6049ca |
| images/approved/founder.jpg | 696aa737acbb0f26e2aca08f1128686e44128a5b12a41d55bfaf98b8e13b49e7 |
| images/approved/grip.png | 54e02c5ed36e0711f03bdccfec8893f4850c1a052bcfdfd67559fae5b3e636c9 |
| images/approved/office.jpg | 1927f060aef1e413b7b374e1b852afa8de83a75d74a208d26c0c16b5e7318415 |
| images/approved/printer.png | 7a8d3bce1949c362c7edae124923bad9f7ce5718692a8a2128ffb3d0936b2c85 |
| images/approved/window.jpg | b4f2a286f14cf804cea5ec65265b61dc3e4fa205acbe7b5d4e8677c92a0506f3 |
| images/einstein.jpg | 06cf1c804559f2c7a380067f7714af710268a8b7b546311ca62bcd1b08006168 |

### Final-guess arm layers

`images/approved/writing-arm.png` and `images/approved/reaching-arm.png` are alpha crops from a pose sheet generated with the built-in image generator. The approved `seated-office.jpg` was the identity, clothing, lighting, and camera reference. The game uses the crop with the left sleeve and pen grip and the crop with the extended right sleeve and pinching hand. The generated face and torso are outside the composited artwork. The Albert Einstein print uses the catalogued photograph listed above.
