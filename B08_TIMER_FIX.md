# V2.1.1 — B08/B12 120s timer fix

Only B08/B12 repeat-tag timing logic was changed from the V2.1.1 base.

- TAG start is remembered as `repeatStartLastSeenAt`.
- TAG start must be absent for 800 ms before `repeatStartWaitingReturn` is released.
- A single missed detector frame no longer unlocks TAG 2.
- The 120s warning remains independent from TAG visibility.
- At 120s, B08/B12 play `quatg1.mp3` but do not `finish()` the course; TAG 82/123 and the second TAG 81/121 can still be processed.
- No AprilTag detector, audio path, or other course rule was intentionally changed.
