# Deflectometry Learning Lab

An interactive, browser-based environment for learning deflectometry, designing a
deflectometry bench, and replicating a published experiment. It grew out of the
ASU SOLAR lab replication of the SMOTS method (Choi et al., *Proc. SPIE* 10377,
103770G, 2017), and is organised so that SMOTS is one case study within the
general method rather than the whole of it.

Every page is plain HTML with no build step, no server and no external
dependencies.

### ▶ [Open the lab](https://diegobethancourth.github.io/deflectometry-mirror-array/)

## Structure — three tracks

| Track | For | Modules |
|---|---|---|
| **Learn** | Students new to deflectometry | L1 Reflection and surface slope *(planned)* · [L2 Fringe coding and phase shifting](https://diegobethancourth.github.io/deflectometry-mirror-array/fringes.html) · L3 Phase retrieval methods compared *(planned)* · L4 From slope to surface *(planned)* · L5 Errors and calibration *(planned)* |
| **Design** | Anyone sizing a bench | [D0 Bench setup and presets](https://diegobethancourth.github.io/deflectometry-mirror-array/bench.html) · [D1 Test object and geometry](https://diegobethancourth.github.io/deflectometry-mirror-array/geometry.html) · [D2 Screen and fringes](https://diegobethancourth.github.io/deflectometry-mirror-array/fringes.html) · [D3 Camera and lens](https://diegobethancourth.github.io/deflectometry-mirror-array/camera.html) · [D4 Error budget](https://diegobethancourth.github.io/deflectometry-mirror-array/budget.html) · [D5 Actuation](https://diegobethancourth.github.io/deflectometry-mirror-array/piezo.html) |
| **Replicate** | Reproducing a paper | [R1 SMOTS Python package](smots/) · [R2 Step-by-step scripts](smots/first_steps/) · [R3 SMOTS live simulator](https://diegobethancourth.github.io/deflectometry-mirror-array/simulator.html) · R4 ASU bench case study *(planned)* |
| **Reference** | Everyone | [Math reference](https://diegobethancourth.github.io/deflectometry-mirror-array/docs/math-reference.html) — 75 numbered equations; [PDF](docs/Deflectometry-Math-Reference.pdf) |

## One shared bench

The Design pages share one set of values — test object, screen, camera,
geometry — kept in the browser by `assets/bench.js`. A value changed on any page
is the value every other page uses. The bench bar under the navigation shows the
active bench and offers:

- **Presets:** *ASU SOLAR bench* (3 × 3 square mirrors, the Week 11 camera
  report), *Choi et al. 2017* (seven hexagonal segments, z<sub>d</sub> = 2020 mm,
  294 µm screen pixel, 30 px fringe period; segment size approximate, camera
  distance assumed) and *Single flat mirror* (a generic exercise).
- **Export / Import:** the bench as a JSON file, to hand in with a report or
  share with a lab partner.

D3 (camera and lens) is vendor-neutral: it outputs a camera specification and
checks any camera the student enters from a datasheet.

## Files

| File | Role |
|---|---|
| `index.html` | Home — the three tracks |
| `bench.html`, `geometry.html`, `fringes.html`, `camera.html`, `budget.html`, `piezo.html` | Design pages D0–D5 (`fringes.html` is also Learn L2) |
| `simulator.html` | Replicate R3 |
| `guide.html` | Redirects to the home page (kept so old links work) |
| `assets/bench.js` | Shared bench state, presets, import/export |
| `assets/nav.js` | Site navigation, defined once for every page |
| `assets/tour.js`, `assets/tour.css` | Guided tour on each page |
| `smots/` | Python reference implementation of SMOTS with tests |
| `docs/` | Math reference (HTML and PDF) |

Page names link to the live site. Opening a `.html` file on GitHub shows its
source, not the running tool; to run offline, download the repository and open
`index.html`.

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
