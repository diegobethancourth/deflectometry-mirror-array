# Deflectometry Mirror-Array Toolkit

Interactive, browser-based calculators supporting the array sizing and component
selection analysis for a deflectometry (SMOTS / PMD) setup.

Every page is plain HTML with no build step, no server and no external
dependencies. All controls update the metrics, sketches and the live mathematics
panel simultaneously.

### ▶ [Open the toolkit](https://diegobethancourth.github.io/deflectometry-mirror-array/guide.html)

The tools run on GitHub Pages — that link opens **Start Here**, the flowchart of
how the pages feed each other. From any page, press **Guided tour** in the top
bar for a walkthrough of that page's controls (arrow keys move, Escape closes).

To run it offline instead, download the repository and double-click any `.html`
file; everything works with no server and no network.

The only shared assets are `assets/tour.js` and `assets/tour.css`, which drive
that tour; every page still renders and calculates correctly without them.

## Pages

| Page | What it answers |
|---|---|
| [**Start Here**](https://diegobethancourth.github.io/deflectometry-mirror-array/guide.html) <br><sub>`guide.html`</sub> | How do the five tools fit together? A clickable flowchart of the design chain, a table of what every amber/red verdict means and where to fix it, and a task router. |
| [**Array Config**](https://diegobethancourth.github.io/deflectometry-mirror-array/index.html) <br><sub>`index.html`</sub> | Which mirror layout fits the screen and gives enough fringes? Six governing equations across six candidate layouts, with a ranked comparison table. |
| [**Fringe Generator**](https://diegobethancourth.github.io/deflectometry-mirror-array/fringes.html) <br><sub>`fringes.html`</sub> | What exactly do I display on the screen? Phase-shifted sinusoid design, 1:1 pixel inspection, full-resolution PNG export and a matching Python snippet. |
| [**Camera & Lens**](https://diegobethancourth.github.io/deflectometry-mirror-array/camera.html) <br><sub>`camera.html`</sub> | Which camera, lens, height and aperture? Five dependent steps — field of view, pixel requirement, camera short list, focal length and height, aperture and focus — each with a live figure, the equations with substituted numbers, and the values to enter in the Basler lens selector as a cross-check. |
| [**Tilt & Actuation**](https://diegobethancourth.github.io/deflectometry-mirror-array/piezo.html) <br><sub>`piezo.html`</sub> | Can the mounts actually point each mirror? Per-mirror law-of-reflection solution, piezo displacement, angular resolution and range budget. |
| [**Error Budget**](https://diegobethancourth.github.io/deflectometry-mirror-array/budget.html) <br><sub>`budget.html`</sub> | How accurate will the measurement be? Phase → slope → height propagation with each term integrated by its spatial character. |
| [**SMOTS Simulator**](https://diegobethancourth.github.io/deflectometry-mirror-array/simulator.html) <br><sub>`simulator.html`</sub> | Does the algorithm actually work? Ray-traces the camera image, runs the full SMOTS retrieval on it live, and compares recovered tilt against commanded tilt. |
| [**Python package**](smots/) <br><sub>`smots/`</sub> | The measurement algorithm for the experimental work: sheared Fourier analysis, per-segment apertures, 2π unwrapping, screen-pose calibration, with a validated forward model and 63 tests. |
| [**Math Reference**](https://diegobethancourth.github.io/deflectometry-mirror-array/docs/math-reference.html) <br><sub>`docs/`</sub> | Every equation in the toolkit, derived and explained in one printable document — array sizing, fringe coding, the SMOTS sheared-Fourier derivation, mirror pointing, the error budget and screen-pose calibration, with a symbol glossary and the three sign conventions that silently invert angles. [Download as PDF](docs/Deflectometry-Math-Reference.pdf), 20 pages. |

Page names link to the live site; the filename under each one is the source
file in this repository. Opening a `.html` file here on GitHub shows its code,
not the running tool.

## Governing relations

### Array configuration

| Expression | Physical meaning |
|---|---|
| `p = W / Nₓ` | Pixel pitch: screen width ÷ horizontal pixels |
| `P_f = n × p` | Fringe pitch: pixels per fringe × pixel pitch |
| `L = n_cols × a + (n_cols − 1) × g` | Array width: mirrors + gaps |
| `N_f = L / P_f` | Fringes across array — must be ≥ 40, ≥ 60 ideal |
| `θ = 2·arctan(W_s / 2d)` | Screen angular FOV: the array must fit inside |
| `AOV = 2·arctan(sensor / 2f)` | Camera angular FOV: must cover the array at distance d |

### Fringe generation

| Expression | Physical meaning |
|---|---|
| `I_k(x) = A + B·cos(2πx/n − 2πk/N)` | Projected intensity, step *k* of *N* |
| `φ = arctan2( Σ I_k sin(2πk/N), Σ I_k cos(2πk/N) )` | N-step phase retrieval, wrapped to (−π, π] |
| `σ_φ = √(2/N) · σ_I / B` | Phase uncertainty from camera noise |
| `I_out = 255·(I_lin/255)^(1/γ)` | Gamma pre-compensation, so the emitted irradiance is sinusoidal |

### Tilt and actuation

| Expression | Physical meaning |
|---|---|
| `û = (M − C)/‖M − C‖`, `v̂ = (S − M)/‖S − M‖` | Incident and reflected ray directions per mirror |
| `n̂ ∝ v̂ − û` | Law of reflection: the normal bisects the two rays |
| `θ_piezo = θ − θ_base` | The baseplate carries the common fold; the piezos supply the differential |
| `Δ = L·tanθ` | Actuator displacement at lever arm *L* from the pivot |
| `δθ = δΔ / L` | Angular resolution from the actuator step size |

### Error budget

| Expression | Physical meaning |
|---|---|
| `δx_s = σ_φ · P_f / 2π` | Screen-point error from phase noise |
| `δs = δx_s / 2d` | Slope error — a slope change δs deflects the reflected ray by 2δs |
| `δz = δs·√(L·Δx)` | Height from *random* slope error (random walk) |
| `δz = δs·L` | Height from *correlated figure* error (coherent integration) |
| `δz = sag·δd/d` | Height from a *scale* error in the screen distance |

A uniform screen-pose offset produces the same slope error everywhere — that is a
pure tilt, so the reconstruction's piston-and-tilt fit removes it exactly. The
budget page classifies every term this way rather than applying one rule to all of
them.

## The SMOTS algorithm

[`smots/`](smots/) implements the retrieval described in

> H. Choi, I. Trumper, M. Dubin, W. Zhao and D. W. Kim, *"Simultaneous angular
> alignment of segmented mirrors using sinusoidal pattern analysis"*,
> Proc. SPIE **10377**, 103770G (2017).

```bash
pip install -r smots/requirements.txt
pytest                             # 63 tests, from the repo root
cd smots && python demo.py         # narrated walkthrough
```

[`smots/first_steps/`](smots/first_steps/) holds the build-up to the algorithm,
one standalone script per idea, starting from a 1-D check of the shear theorem
that the whole method rests on.

Nothing in the package needs hardware — it is validated against a ray-traced
forward model. See [`smots/README.md`](smots/README.md) for a reviewer's reading
order and an explicit statement of what is and is not yet established.

SMOTS is not phase-shifting deflectometry: one pattern is displayed, one
reference frame is captured, and every later frame is compared against it. The
shift is recovered from the *sheared* pattern in the Fourier domain, per segment,
all segments at once. Because the phase is measured as a fraction of a period —
invariant under magnification, the recovered phase does not depend on the
camera's scale — though where the per-segment apertures land, and how many camera
pixels fall inside one, still does.

**What has been checked, and what that is worth.** On the synthetic bench the
implementation recovers a 150 µrad tilt to 0.63 µrad RMS at 2 DN camera noise.
That number is the code measured against a forward model I wrote myself, which
makes the same assumptions the code does — a flat screen, a pinhole camera, ideal
mirrors, no stray light. It establishes that the arithmetic is implemented
correctly. It establishes nothing about whether the method describes my bench,
because no physical measurement is involved. The paper's 0.8 µrad RMS is a
different kind of number: it was measured against an autocollimator on real
hardware. The two are not comparable, and the experimental one is by far the
harder test. Nothing here has been validated against a real optical system yet.

See [`smots/README.md`](smots/README.md) for the three sign conventions that will
silently invert your angles if you get them wrong.

It also includes **mirror-based screen-pose calibration** (`calibration.py`),
which recovers `z_d` and the screen orientation from reflected-ray
correspondences rather than a tape measure — the screen geometry is what the
error budget says dominates. One result from it is worth stating up front: a
perfectly flat mirror array makes the calibration **exactly degenerate**, because
every reflected ray is parallel and distance along them is unobservable. Deliberate
tilt spread across the reference nodes is what makes the screen distance
measurable at all.

## Notes on the defaults

The fixed hardware values describe the as-built 9-node TR1.5/PH1.5 hybrid from
the 18 Sep 2026 weekly report: 25.4 mm PFSQ10-03-G01 mirrors on Thorlabs KMSR
kinematic mounts, a 344 mm / 3840 px panel (89.6 µm pixel pitch), and the centre
node (M5) motorised with 2× MPIA10 actuators on a KIM101 controller. A KIM101
drives four channels and a tip/tilt node consumes two, so **at most two nodes can
be motorised per controller** — the tilt page enforces that budget.

**Mount- and actuator-specific numbers — lever arm, tilt limit, travel and step
size — are editable inputs, not verified specifications.** Likewise the screen
pixel pitch and the mirror-to-screen distance: both scale every angle the
algorithm reports, and both need measuring rather than assuming. Read the
hardware numbers off the datasheet drawing before committing to a design.

## Author

**Diego Bethancourth** — Systems, Optics and Laser Application Research (SOLAR)
Lab, School of Manufacturing Systems and Networks, Ira A. Fulton Schools of
Engineering, Arizona State University. Advisor: Dr. Xiangyu Guo.

System sketch referenced from Huang et al. 2018, Fig. 1 & 3.
