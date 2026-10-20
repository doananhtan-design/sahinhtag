# Sa Hình AI V2.1.1 — B12 TAG 123 / B08 regression-safe fix

## Scope
- Keep exam logic and existing B08 audio path unchanged.
- B08/B12 shared repeat-start timer is shown immediately on first TAG 81/121; deadline is set to detection time + 120,000 ms.
- Pass all AprilTag IDs detected in each camera frame into the timer state machine. TAG 81/121 is considered absent only after it is absent from the full detector output for 800 ms, not merely because another tag becomes nearest.
- In B08/B12 only, TAG 82/123 `dungxe.mp3` is processed even if another tag is selected as nearest. The normal nearest-tag flow remains unchanged for all other course logic.
- Keep B12 audio path `./audio/b12/dungxe.mp3`, existing fallback, timeout-warning-only behavior, and other exercise rules.
- Bump service-worker cache name so installed PWA clients can fetch the patched `app.js`.

## Checks performed
- `node --check app.js`
- `python DUAL_B08_B12_TEST.py`: B08 and B12 timer start, full-frame TAG-loss debounce, check-tag audio event, second TAG, timeout-warning-only.
- ZIP integrity check and required B08/B12 audio asset presence.

## Device validation still required
A real camera/Android test is still required to confirm the physical TAGs are detected under the user's lighting and camera angle. Automated checks do not substitute for that device test.
