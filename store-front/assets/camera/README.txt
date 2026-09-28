SecureVista interactive camera

The camera section is embedded in index.html. Serve store-front over HTTP with your normal server or Live Server; file:// does not support module/model loading.
No build, npm packages or external JavaScript CDN is needed.

camera.js uses the supplied model's separate arm, rotation_base and body objects for rigid pan and tilt. The lens stays attached to the body. No vertex deformation is used.
Tracking pauses offscreen, when the tab is hidden, and on request. Reduced-motion preferences start it paused. Touch scrolling is preserved. Arrow keys/Home work when the display has keyboard focus.

CCTV camera by Just8, https://sketchfab.com/3d-models/cctv-camera-281b2b84260447e49ab4a6b34bf78697
CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
Adapted with interactive pan/tilt; retain the footer attribution.
Three.js 0.170.0: MIT; see THREE-LICENSE.txt.
