"""Fringe patterns -- the shared front end of every deflectometry pipeline in the lab.

Both methods used in the SOLAR lab start here:

* Phase-shifting deflectometry (PMD, the Spring 2026 WK1 work): N patterns per
  axis, each shifted by 2*pi/N, decoded pixel by pixel into a wrapped phase map.
* SMOTS (Choi et al. 2017): ONE static pattern, compared before/after a tilt in
  the Fourier domain.  Its frame is exactly step k = 0 of the sequence below, so
  the two methods share one generator.

Convention (fixed for the whole lab -- every student uses this one)
-------------------------------------------------------------------
    I_k(x) = A + B * cos( 2*pi*x/P + delta_k ),     delta_k = 2*pi*k/N,  k = 0..N-1

    A = bias (grey levels), B = amplitude (grey levels), P = period (screen px)

With +delta_k the phase is recovered as

    phi = atan2( -sum_k I_k sin(delta_k),  sum_k I_k cos(delta_k) )

which for N = 4 reduces to the WK1 MATLAB line  phi = atan2(I4 - I2, I1 - I3).
Writing the shift with a minus sign (the README's cos(2*pi*x/P - 2*pi*k/N))
flips the sign of every phase, and therefore of every slope.  Pick this one.

Only numpy is required, matching the smots package.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

TWO_PI = 2.0 * np.pi


# --------------------------------------------------------------------------
# Specification
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class FringeSpec:
    """Everything needed to reproduce a fringe sequence exactly.

    period_px  screen pixels per fringe (P). Must be >= 4.
    n_steps    phase steps per axis (N). 1 = a static SMOTS pattern; 3+ for PMD.
    bias       A, grey levels.
    amplitude  B, grey levels.  A - B >= 0 and A + B <= 255, or the sinusoid clips.
    gamma      display gamma to PRE-COMPENSATE, or None for a linear display.
    """

    period_px: float = 30.0
    n_steps: int = 4
    bias: float = 128.0
    amplitude: float = 100.0
    gamma: float | None = None

    def __post_init__(self) -> None:
        if self.period_px < 4:
            raise ValueError("period below 4 px cannot be rendered as a sinusoid")
        if self.n_steps < 1 or self.n_steps == 2:
            raise ValueError("n_steps must be 1 (SMOTS) or >= 3 (phase shifting); "
                             "2 steps cannot separate bias, amplitude and phase")
        lo, hi = self.bias - self.amplitude, self.bias + self.amplitude
        if lo < 0 or hi > 255:
            raise ValueError(f"bias +/- amplitude = {lo:.0f}..{hi:.0f} clips the "
                             "0-255 range; a clipped sinusoid biases the phase")

    @property
    def deltas(self) -> np.ndarray:
        """Phase step of each frame, delta_k = 2*pi*k/N (radians)."""
        return TWO_PI * np.arange(self.n_steps) / self.n_steps

    def period_mm(self, pitch_mm: float) -> float:
        """Physical fringe period on the screen: P_f = P * p."""
        return self.period_px * pitch_mm


# --------------------------------------------------------------------------
# Generation
# --------------------------------------------------------------------------

def ideal_intensity(spec: FringeSpec, coord_px: np.ndarray, delta: float) -> np.ndarray:
    """The intended (linear-light) intensity, before gamma and quantisation."""
    return spec.bias + spec.amplitude * np.cos(TWO_PI * coord_px / spec.period_px + delta)


def precompensate(levels: np.ndarray, gamma: float) -> np.ndarray:
    """Grey levels to send so a display of the given gamma EMITS ``levels``.

    A display maps a sent level v to emitted light 255*(v/255)**gamma.  Sending
    255*(I/255)**(1/gamma) therefore emits I.
    """
    return 255.0 * np.clip(levels / 255.0, 0.0, 1.0) ** (1.0 / gamma)


def generate(spec: FringeSpec, width: int, height: int, axis: str = "x",
             quantise: bool = True) -> np.ndarray:
    """Render the full N-step sequence for one axis.

    axis "x": fringes vary along x (vertical stripes) -> encodes x-slope.
    axis "y": fringes vary along y (horizontal stripes) -> encodes y-slope.

    Returns an array of shape (N, height, width): uint8 when ``quantise`` (what
    is actually written to PNG and displayed), float64 otherwise.
    """
    if axis not in ("x", "y"):
        raise ValueError("axis must be 'x' or 'y'")
    coord = (np.arange(width, dtype=np.float64)[None, :] if axis == "x"
             else np.arange(height, dtype=np.float64)[:, None])

    frames = np.empty((spec.n_steps, height, width), dtype=np.float64)
    for k, delta in enumerate(spec.deltas):
        img = np.broadcast_to(ideal_intensity(spec, coord, delta), (height, width))
        if spec.gamma:
            img = precompensate(img, spec.gamma)
        frames[k] = img

    if quantise:
        # floor(x + 0.5): the same rounding as the MATLAB version (np.rint rounds
        # halves to even, MATLAB round() away from zero).
        return np.clip(np.floor(frames + 0.5), 0, 255).astype(np.uint8)
    return frames


def display(frames: np.ndarray, gamma: float | None) -> np.ndarray:
    """Simulate the light a display of the given gamma emits for sent levels."""
    v = np.asarray(frames, dtype=np.float64)
    if not gamma:
        return v
    return 255.0 * np.clip(v / 255.0, 0.0, 1.0) ** gamma


# --------------------------------------------------------------------------
# N-step phase retrieval
# --------------------------------------------------------------------------

@dataclass
class PhaseResult:
    phase: np.ndarray        # wrapped phase, (-pi, pi]
    modulation: np.ndarray   # B, recovered amplitude (grey levels)
    bias: np.ndarray         # A, recovered mean (grey levels)

    def valid(self, min_modulation: float = 10.0) -> np.ndarray:
        """Mask of pixels with enough fringe contrast to trust the phase."""
        return self.modulation >= min_modulation


def retrieve_phase(frames: np.ndarray, deltas: np.ndarray | None = None) -> PhaseResult:
    """N-step phase retrieval for the I_k = A + B cos(phi + delta_k) convention.

    ``frames`` has shape (N, ...).  Requires N >= 3 equally spaced steps over 2*pi.
    """
    I = np.asarray(frames, dtype=np.float64)
    n = I.shape[0]
    if n < 3:
        raise ValueError("phase retrieval needs at least 3 frames")
    if deltas is None:
        deltas = TWO_PI * np.arange(n) / n
    deltas = np.asarray(deltas, dtype=np.float64).reshape((n,) + (1,) * (I.ndim - 1))

    s = np.sum(I * np.sin(deltas), axis=0)
    c = np.sum(I * np.cos(deltas), axis=0)
    return PhaseResult(phase=np.arctan2(-s, c),
                       modulation=2.0 / n * np.hypot(s, c),
                       bias=I.mean(axis=0))


def retrieve_phase_wk1(I1, I2, I3, I4) -> np.ndarray:
    """The Spring 2026 WK1 MATLAB formula, verbatim: atan2(I4 - I2, I1 - I3)."""
    I1, I2, I3, I4 = (np.asarray(a, dtype=np.float64) for a in (I1, I2, I3, I4))
    return np.arctan2(I4 - I2, I1 - I3)


def wrap(phase: np.ndarray) -> np.ndarray:
    """Wrap to (-pi, pi]."""
    return np.angle(np.exp(1j * np.asarray(phase)))


def expected_phase_noise(spec: FringeSpec, sigma_i: float) -> float:
    """sigma_phi = sqrt(2/N) * sigma_I / B  (rad), for white camera noise sigma_I."""
    return float(np.sqrt(2.0 / spec.n_steps) * sigma_i / spec.amplitude)


# --------------------------------------------------------------------------
# Quality check of a captured fringe profile (replaces the WK1 Pearson score)
# --------------------------------------------------------------------------

@dataclass
class ProfileFit:
    period_px: float        # apparent period in camera pixels
    bias: float
    amplitude: float
    phase: float            # rad, at sample 0
    r_squared: float        # 1 = perfect sinusoid
    clipped_fraction: float # samples at 0 or at the saturation level
    contrast: float         # amplitude / bias (fringe visibility)

    def report(self) -> str:
        return (f"period {self.period_px:.2f} px | bias {self.bias:.1f} | "
                f"amplitude {self.amplitude:.1f} | visibility {self.contrast:.2f} | "
                f"R^2 {self.r_squared:.4f} | clipped {100*self.clipped_fraction:.1f} %")


def fit_profile(profile: np.ndarray, saturation: float = 255.0,
                min_bin: int = 2) -> ProfileFit:
    """Fit A + B cos(2 pi x / P + phi) to one line of a captured fringe image.

    The period is located from the FFT, refined by parabolic interpolation, and
    then A, B, phi come from linear least squares.  Unlike a Pearson correlation
    against an assumed wave, this does not need the phase or the period in
    advance, so a correct capture scores ~1 whatever its phase.
    """
    y = np.asarray(profile, dtype=np.float64).ravel()
    n = y.size
    x = np.arange(n, dtype=np.float64)

    spec = np.abs(np.fft.rfft((y - y.mean()) * np.hanning(n)))
    spec[:min_bin] = 0.0
    k = int(np.argmax(spec))
    if 0 < k < spec.size - 1:                       # parabolic peak refinement
        a, b, c = np.log(spec[k - 1:k + 2] + 1e-12)
        k = k + 0.5 * (a - c) / (a - 2 * b + c)
    freq = k / n                                     # cycles per sample

    # Refine the frequency with a few Gauss-Newton steps on the sinusoid model.
    for _ in range(5):
        M = np.column_stack([np.ones(n), np.cos(TWO_PI * freq * x),
                             np.sin(TWO_PI * freq * x)])
        coef, *_ = np.linalg.lstsq(M, y, rcond=None)
        A, C, S = coef
        resid = y - M @ coef
        dmodel = TWO_PI * x * (-C * np.sin(TWO_PI * freq * x) + S * np.cos(TWO_PI * freq * x))
        denom = float(dmodel @ dmodel)
        if denom == 0:
            break
        freq += float(dmodel @ resid) / denom

    M = np.column_stack([np.ones(n), np.cos(TWO_PI * freq * x), np.sin(TWO_PI * freq * x)])
    coef, *_ = np.linalg.lstsq(M, y, rcond=None)
    A, C, S = coef
    resid = y - M @ coef
    ss_tot = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - float(resid @ resid) / ss_tot if ss_tot > 0 else 0.0
    B = float(np.hypot(C, S))
    clipped = float(np.mean((y <= 0) | (y >= saturation)))
    return ProfileFit(period_px=1.0 / freq if freq > 0 else np.inf, bias=float(A),
                      amplitude=B, phase=float(np.arctan2(-S, C)), r_squared=r2,
                      clipped_fraction=clipped, contrast=B / A if A else 0.0)


__all__ = ["FringeSpec", "generate", "ideal_intensity", "precompensate", "display",
           "PhaseResult", "retrieve_phase", "retrieve_phase_wk1", "wrap",
           "expected_phase_noise", "ProfileFit", "fit_profile", "TWO_PI"]
