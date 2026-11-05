# Riddlex release candidate 1

The playable game is the English Riddlex build at `041179e1fd6b1c67dfb5a2a299745daa49d64f86`. This release record changes documentation only.

[GitHub Actions verification](https://github.com/walidibnwhakil/walid-ai-website/actions/runs/42025840277) passed casebook validation, automated tests, and Chromium gameplay at 1280 × 900 and 390 × 844. It checked the approved question-screen images, the printer photo feed, the handwritten result, rejected guesses, and Retry from an unresolved case.

Confirmed matches can feed a local photo into the printer tray. Matches without a photo use the handwritten desk note. Rejected guesses use the desk note and can continue through Retry.

Photo lifting, crumpling and throwing, detective facial expressions, and the annoyed cat animation are deferred until layered artwork is available.

## Private play

Create a GitHub Codespace on `riddlex-recovery`. The repository’s dev container starts an HTTP server on port 8000. Open the private port 8000 URL from the Ports tab and append `/games/riddlex/`. Keep port visibility set to Private.
