# Video → stickman (without AI)

The Trait Workshop includes assisted rotoscoping: the user aligns 14 named joints
on a local video, then a classical pyramidal Lucas–Kanade tracker follows their
pixel neighbourhoods. There is no learned pose model, anatomical recognition,
model download, remote inference, or upload of the video. The tracking
implementation is original; the algorithm is described in the
[OpenCV optical flow documentation](https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html).

## Workflow

1. Open **Atelier Trait → Vidéo → stickman** and choose a local video.
2. Select an excerpt and click **Préparer cet extrait**. Align the template's head,
   neck, shoulders, elbows, wrists, hips, knees and ankles with the person.
   Left/right refer to the person's own sides. Drag a point, select it and use
   arrow keys (Shift for ten pixels), or enter its X/Y coordinates as percentages.
3. Choose **Suivre depuis cette pose**. Compare the skeleton against the video
   using its opacity control and the frame slider.
4. Tracking stops at an uncertain frame. Orange points remain at their last
   accepted position. Correct them or explicitly confirm the pose after checking
   it; then resume tracking. **Tracer l’image suivante** also supports entirely
   manual tracing, including footage where tracking is ineffective.
5. Insert the prepared frames. Open the resulting native movieclip to edit its
   joints. Insertion is one undoable command and extends the current layer when
   necessary. Save the project normally.

Changing an earlier pose discards subsequent tracking, because it depended on
the old pose. Preparing another excerpt also resets the draft. Insert before
leaving the workshop tab: the reference video and the temporary draft are not
saved. The native clip, timestamps, and review metadata are saved with the project.

## Fidelity and boundaries

This is assisted tracing, **not automatic human recognition**. It cannot promise
an identical reconstruction of arbitrary footage. Flat clothing, occlusions,
fast motion, camera cuts, motion blur, depth and moving backgrounds can defeat
pixel tracking. Textured landmarks or visible markers help. A successful
forward/backward check is not proof that a point still corresponds to a joint.
Review all frames, including those without warnings. The head is stylized as a
circle; hands, toes, facial expressions and depth are not reconstructed.

The first version follows one user-placed skeleton. It samples at the project's
integer FPS, preserving absolute source timestamps and screen-space motion,
including camera movement. Variable-rate footage is sampled by media time; it
does not preserve every original encoded frame. Duration is rounded up by less
than one project tick. Lengths can vary with perspective; there is no automatic
bone-length constraint or smoothing that would relocate the traced joints.
The source aspect ratio is preserved when fitting the clip into the canvas.

Each excerpt is limited to 30 seconds and 900 frames, files to 256 MiB, and each
source dimension to 8192 pixels. Playback depends on the host's video decoders
(typically MP4/H.264 or WebM). Tracking processes a maximum 960-pixel long edge;
manual placement and native coordinates retain normalized source resolution.

## Ownership and verification

- `rotoscope.mjs`: draft validation, native geometry, timing and insertion through
  the existing movieclip/history APIs. No source pixels or file path enter the
  document.
- `optical-flow.mjs`: bounded image pyramids, iterative optical flow, texture,
  appearance and forward/backward rejection. Ambiguous points remain unmoved.
- `rotoscope-worker.mjs` / `rotoscope-client.mjs`: two pyramids and one transferred
  bitmap at a time; no unbounded frame queue. Cancellation terminates the worker,
  releases bitmaps, aborts pending requests and ignores obsolete results.
- `rotoscope-pane.mjs`: local video lifetime, reference comparison, correction,
  review and draft ownership. An error/cancellation cannot mutate the project.

Run `node --test tests/trait-rotoscope.test.mjs` for motion fixtures, rejection,
geometry, timing, save/reload and undo. The browser check
`node tests/trait-rotoscope.browser.mjs` uses a generated WebM fixture (requires
ffmpeg), the real decoder and worker, keyboard correction, cancellation,
insertion and narrow layouts. It checks the pipeline, not fidelity on a real
person. Real footage should be evaluated with the user's intended movements
before making quality claims.

Initial verification: the full unit suite passes (3,803 passed, 25 skipped), as
do the JavaScript, stylesheet, locale and changelog checks. The browser script
has not completed in the implementation environment: local Chromium cannot
create its required process socket, and the cloud browser cannot reach the
local server. Its visual, decoder and full workflow assertions still need to be
run on a supported workstation before release. No real-person fidelity claim
has been validated.
