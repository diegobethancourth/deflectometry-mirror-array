# deflecto — SOLAR lab deflectometry backbone

Shared front end for every deflectometry project in the lab. Stage 1 (fringe pattern) is implemented and tested; the later stages are listed below in build order.

Place this folder in the root of the `deflectometry-mirror-array` repository, next to `smots/`:

```
deflectometry-mirror-array/
├── deflecto/fringe.py          ← Stage 1 module (numpy only)
├── tests/test_fringe.py        ← 33 tests, ~0.2 s
├── Stage1_Fringe_Pattern_Tests_Colab.ipynb
└── smots/                      ← existing SMOTS package (unchanged)
```

```bash
pip install numpy pytest pillow
pytest -v tests/test_fringe.py
```

**MATLAB (what the bench uses).** The `matlab/` folder is the same Stage 1 in MATLAB, base MATLAB only:

| File | Purpose |
|---|---|
| `deflecto_fringe.m` | Generate the N-step sequence (lab convention, identical frames to Python) |
| `deflecto_phase.m` | N-step phase retrieval → φ, modulation B, bias A |
| `deflecto_show.m` | Show frames full screen on the bench monitor, pixel for pixel; key press advances |
| `deflecto_fit_profile.m` | Quality score of a captured row (replaces `ISOComparator.m`) |
| `test_deflecto.m` | 18 checks, incl. MATLAB frames == Python frames; must print `ALL PASS` |
| `run_stage1_bench.m` | Bench session: tests → generate → save PNGs → display |
| `reference/` | Frames written by Python, used by test E1 |

In MATLAB: `cd` into `matlab/`, run `test_deflecto`, then open `run_stage1_bench.m` and run it section by section.
Before the first display: Windows Settings → Display → bench monitor → **Scale 100 %**. `deflecto_show` refuses to run if MATLAB sees a different resolution, because a resampled pattern no longer has a period of P pixels.

---

## 1. How the two lab methods relate

Both methods display a sinusoidal pattern, photograph its reflection in a mirror, and turn a *movement of the pattern* into a *mirror angle*. They differ only in how the movement is read.

| | Phase-shifting deflectometry (PMD) | SMOTS (Choi et al. 2017) |
|---|---|---|
| Used for | Shape of one surface (WK1, Spring 2026) | Tilt of each mirror in the array |
| Screen shows | N shifted patterns per axis | One static pattern |
| Read-out | Phase at every camera pixel | One phase per mirror (Fourier ratio) |
| Output | Slope map → surface height | θx, θy per mirror (µrad) |
| Shared blocks | fringe generation · display/gamma · camera capture · screen geometry (p, z_d) | same |

Because of that shared front end, a single tested fringe module serves both. The SMOTS frame is step k = 0 of the PMD sequence; a test (`test_static_frame_equals_smots_pattern`) pins this down.

## 2. What the SMOTS code does, in plain words

Two photographs: one before (reference) and one after the mirror moves. The screen does not change.

| # | Operation | File · function | Paper |
|---|---|---|---|
| 1 | Cut each mirror out of the photo with a rectangular mask | `apertures.grid_apertures` | Sec. 2, digital aperture |
| 2 | Find the fringe frequency in the camera's own spectrum (so the magnification is never needed) | `analysis.find_carriers` | — |
| 3 | Subtract reference from measured → "sheared" pattern; FFT both; divide at the fringe frequency | `analysis.shear_ratio` | Eqs. (1), (3) |
| 4 | Ratio → signed phase ψ = atan2(Im, 1 + Re) | `analysis.phase_complex` | Eq. (4) + sign rule |
| 5 | Phase → screen shift Δ = ψ/2π · P · p | `analysis.shift_mm` | Eq. (5) |
| 6 | If two fringe periods are shown, combine them to remove the 2π wrap | `analysis.unwrap_two_carrier` | Sec. 3.2 |
| 7 | Shift → tilt θ ≈ Δ / (2 z_d) | `geometry.tilt_from_shift` | Eq. (6) |
| — | All of the above for all nine mirrors at once | `pipeline.measure` | — |
| — | Synthetic camera images from a known tilt, used by the tests | `simulate.render_frame` | — |

Week 10 covered steps 3–5 in one dimension (`first_steps/01_shear_theorem.py`). Steps 1, 2, 6 and 7 are the next SMOTS scripts.

## 3. Lab convention (fixed)

```
I_k(x) = A + B cos(2πx/P + δ_k),   δ_k = 2πk/N,   k = 0 … N−1
φ      = atan2( −Σ I_k sin δ_k ,  Σ I_k cos δ_k )        (N = 4:  atan2(I4 − I2, I1 − I3))
```

Defaults: A = 128, B = 100 (levels 28–228, margin from 0 and 255), P = 30 screen px, N = 4.

## 4. Build plan

Each stage is accepted only when its tests pass, and each stage uses only quantities produced by an earlier one.

| Stage | Content | Status |
|---|---|---|
| **1a** | Fringe generation and N-step phase retrieval, synthetic | **Done — 33 tests pass** |
| **1b** | Fringes on the real screen: 1:1 display, gamma measurement, first camera rows scored with `fit_profile` | Next — needs bench time |
| 2 | Phase maps from real captures: reference/object subtraction, modulation mask (port of `MasterProcessinScriptV.m`) | WK1 code re-run on the 5th-attempt photos; fixes listed in §6 |
| 3 | Phase unwrapping: multi-frequency (temporal) for absolute screen coordinates | Required by PMD and by SMOTS screen calibration |
| 4 | Geometry: phase → screen point → slope; screen pose (`smots/calibration.py`) | Needs measured p and z_d |
| 5a | PMD: slope → surface (integration) | — |
| 5b | SMOTS: per-mirror tilt on the bench, sign check with one known actuator move | — |

### Stage 1b — bench checklist

1. Run notebook section 12 → copy the PNGs to the bench PC.
2. Display at 100 % scale, full screen, OS scaling 100 %, no colour management.
3. Photograph frame `P30_SMOTS_x.png` directly (no mirror) at several exposures; score one row each with `fit_profile`. Accept: R² ≥ 0.98, 0 % clipped, visibility ≥ 0.3.
4. Measure display gamma: show uniform levels 0, 32, …, 255, fit emitted ∝ level^γ; regenerate with `FringeSpec(gamma=γ)`.
5. Measure the screen pixel pitch under a microscope (datasheet: 89.6 µm).
6. Repeat step 3 through a mirror at the working distance.

## 5. Open items found while building Stage 1

1. **Sign convention.** The repository README writes `cos(2πx/n − 2πk/N)`; WK1 and this module use `+δ_k`. Mixing them negates every slope. The README formula should be changed to match.
2. **z_d conflict.** `01_shear_theorem.py` uses 400 mm; the bench setting (WK3) is 300 mm. Every angle scales as 1/z_d.
3. **WK1 pattern period.** WK1 used one period across the whole screen (`L = max(screenW, screenH)`); the WK3 sizing requires ≥ 60 fringes across the array. Stage 1 specifies P in screen pixels.
4. **WK1 full-range levels.** `0.5 + 0.5 cos` reaches 0 and 255; 10 % over-exposure clips 20 % of the samples. The lab default keeps a margin.
5. **One existing `smots` test fails** with numpy 2.5: `test_pose_recovered_exactly_from_clean_data` asserts `est.refined`, but on perfect data the linear solution is already exact and Gauss-Newton has nothing to improve, so the flag stays `False`. The recovered pose is correct (the four preceding asserts pass). The assertion should be removed or the flag set when the solver converges at iteration 0. The other 62 tests pass.

## 6. WK1 MATLAB code — re-test on the 5th-attempt photos (Documents/MATLAB)

| Script | Check | Result |
|---|---|---|
| `Phases.m` | Same convention as Stage 1 (+δ, 4 steps) | Pass |
| `Phases.m` | Levels | 0–255, no headroom (5.7 % of pixels exactly 0 or 255) |
| `Phases.m` | Period | L = 1920 px: 1 period across the screen for V, 0.625 period for H |
| `MasterProcessinScriptV.m` | `atan2(I4−I2, I1−I3)` vs general N-step | Identical (differs only at pixels with zero signal, 0.05 %) |
| `MasterProcessinScriptV.m` | `rho = −(phi_obj − phi_ref)` without wrapping | False 2π jumps on 2.0 % (V) and 11.9 % (H) of pixels — the dark band at the top of the H slope map. Fix: wrap the difference |
| `MasterProcessinScriptV.m` | No modulation mask | 14–15 % of pixels have B < 10 grey levels (outside the mirror, grid lines); their phase is noise |
| `MasterProcessinScriptV.m` | Reference/object alignment | H difference shows a smooth ramp over the whole mirror: phone or mirror moved between the two sets. Fix: fit and remove a plane over the background |
| `ISOComparator.m` | Pearson score | Compares the camera row with the full-screen wave stretched to the image width; the camera sees only part of the screen through the mirror, so even a perfect capture cannot score 1 (best 0.51). Replaced by `fit_profile` |
| all | Hard-coded paths and crop box | Move to one parameter block |
