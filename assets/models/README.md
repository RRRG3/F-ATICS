# Car model

Drop a licensed glTF binary here as `rb.glb` and the car drawer will render
it in 3D (orbit + zoom) instead of the fallback photograph.

Nothing is committed here because a model of a current Oracle Red Bull
Racing car is the team's intellectual property — it cannot be shipped with
this project. Supply one you have the right to use:

* a model you made or commissioned;
* a Sketchfab / CGTrader model whose licence permits redistribution, exported
  as `.glb`;
* a generic open-licence formula car if the livery does not matter.

The loader normalises scale and centres the model, so authoring units and
origin do not matter. Anything the parser rejects falls back to the photo.
