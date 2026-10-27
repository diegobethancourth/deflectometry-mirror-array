"""Stage 1 tests -- the fringe pattern.

Every test has a known answer.  Nothing here needs hardware.  Run with:

    pytest -v tests/test_fringe.py

Groups
  A. The generated pattern is what it claims to be (period, range, steps).
  B. Phase retrieval inverts the generator (round trip, WK1 formula, noise).
  C. Display effects the bench will add (gamma, clipping).
  D. The capture-quality fit used on real camera rows.
  E. Compatibility with the smots package (same frame, same convention).
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from deflecto.fringe import (TWO_PI, FringeSpec, display, expected_phase_noise,  # noqa: E402
                             fit_profile, generate, retrieve_phase,
                             retrieve_phase_wk1, wrap)

W, H = 510, 8              # 510 = 17 whole periods of 30 px


def true_phase(spec, n=W):
    return wrap(TWO_PI * np.arange(n) / spec.period_px)


# ---------------------------------------------------------------- A. pattern

@pytest.mark.parametrize("period", [8.0, 13.0, 30.0, 37.5])
def test_period_is_exact(period):
    """The FFT peak of one row sits at width/period cycles."""
    spec = FringeSpec(period_px=period, n_steps=1)
    width = int(round(period * 20))
    row = generate(spec, width, 1, quantise=False)[0, 0]
    k = np.argmax(np.abs(np.fft.rfft(row - row.mean())))
    assert k == pytest.approx(width / period, abs=0.5)


def test_levels_stay_inside_8_bit_range():
    f = generate(FringeSpec(), W, H)
    assert f.dtype == np.uint8
    assert f.min() >= 28 and f.max() <= 228          # 128 +/- 100


def test_clipping_pattern_is_rejected():
    with pytest.raises(ValueError, match="clips"):
        FringeSpec(bias=128, amplitude=140)


def test_two_steps_are_rejected():
    with pytest.raises(ValueError):
        FringeSpec(n_steps=2)


@pytest.mark.parametrize("n", [3, 4, 5, 8])
def test_consecutive_frames_are_shifted_by_2pi_over_n(n):
    """Frame k must carry exactly delta_k = 2 pi k / N."""
    spec = FringeSpec(n_steps=n)
    f = generate(spec, W, 1, quantise=False)[:, 0, :]
    F = np.fft.rfft(f - f.mean(axis=1, keepdims=True), axis=1)[:, W // 30]
    steps = wrap(np.angle(F[1:]) - np.angle(F[:-1]))
    assert np.allclose(steps, TWO_PI / n, atol=1e-9)


def test_x_and_y_axes_are_orthogonal():
    fx = generate(FringeSpec(n_steps=1), 60, 60, axis="x")[0]
    fy = generate(FringeSpec(n_steps=1), 60, 60, axis="y")[0]
    assert np.all(fx == fx[0:1, :])                  # constant down each column
    assert np.all(fy == fy[:, 0:1])                  # constant along each row
    assert np.array_equal(fx, fy.T)


def test_png_round_trip_is_lossless(tmp_path):
    """What is saved is exactly what was generated -- no resampling or rescaling."""
    PIL = pytest.importorskip("PIL.Image")
    f = generate(FringeSpec(), W, H)
    path = tmp_path / "frame0.png"
    PIL.fromarray(f[0]).save(path)
    back = np.asarray(PIL.open(path))
    assert back.dtype == np.uint8 and np.array_equal(back, f[0])


# ------------------------------------------------------- B. phase retrieval

@pytest.mark.parametrize("n", [3, 4, 8])
def test_round_trip_without_quantisation_is_exact(n):
    spec = FringeSpec(n_steps=n)
    r = retrieve_phase(generate(spec, W, H, quantise=False))
    assert np.abs(wrap(r.phase[0] - true_phase(spec))).max() < 1e-12
    assert np.allclose(r.modulation, 100.0) and np.allclose(r.bias, 128.0)


@pytest.mark.parametrize("n", [3, 4, 8])
def test_8_bit_quantisation_error_is_small(n):
    """Rounding to 0-255 costs a few milliradians -- the floor of the method."""
    spec = FringeSpec(n_steps=n)
    r = retrieve_phase(generate(spec, W, H))
    assert np.abs(wrap(r.phase[0] - true_phase(spec))).max() < 0.006


def test_wk1_matlab_formula_matches_general_retrieval():
    """phi = atan2(I4 - I2, I1 - I3) is the N = 4 case of the general formula."""
    f = generate(FringeSpec(n_steps=4), W, H).astype(float)
    general = retrieve_phase(f).phase
    assert np.abs(wrap(retrieve_phase_wk1(*f) - general)).max() < 1e-12


def test_reversed_shift_direction_flips_the_phase():
    """The sign trap: generating with -delta and decoding with +delta negates phi."""
    spec = FringeSpec(n_steps=4)
    f = generate(spec, W, H, quantise=False)
    reversed_seq = f[[0, 3, 2, 1]]                   # same as delta_k -> -delta_k
    r = retrieve_phase(reversed_seq)
    assert np.allclose(wrap(r.phase[0] + true_phase(spec)), 0, atol=1e-12)


@pytest.mark.parametrize("n", [3, 4, 8])
def test_noise_matches_the_error_budget(n):
    """sigma_phi = sqrt(2/N) sigma_I / B, the relation used in the error budget."""
    spec = FringeSpec(n_steps=n)
    rng = np.random.default_rng(1)
    f = generate(spec, W, 200, quantise=False) + rng.normal(0, 2.0, (n, 200, W))
    err = wrap(retrieve_phase(f).phase - true_phase(spec)[None, :])
    assert np.std(err) == pytest.approx(expected_phase_noise(spec, 2.0), rel=0.05)


def test_low_contrast_pixels_are_masked():
    spec = FringeSpec(n_steps=4)
    f = generate(spec, W, H, quantise=False)
    f[:, :, :100] = 128.0                            # no fringes (e.g. outside a mirror)
    r = retrieve_phase(f)
    mask = r.valid(min_modulation=10)
    assert not mask[:, :100].any() and mask[:, 100:].all()


# --------------------------------------------------------- C. display effects

def test_uncorrected_gamma_breaks_three_step():
    """A gamma-2.2 display adds a 2nd harmonic; 3-step cannot reject it."""
    spec = FringeSpec(n_steps=3)
    r = retrieve_phase(display(generate(spec, W, H), 2.2))
    assert np.abs(wrap(r.phase[0] - true_phase(spec))).max() > 0.1


@pytest.mark.parametrize("n", [3, 4])
def test_gamma_precompensation_restores_the_phase(n):
    spec = FringeSpec(n_steps=n, gamma=2.2)
    r = retrieve_phase(display(generate(spec, W, H), 2.2))
    assert np.abs(wrap(r.phase[0] - true_phase(spec))).max() < 0.008


def test_wk1_full_range_pattern_has_no_headroom():
    """WK1 used 0.5 + 0.5 cos: the 8-bit pattern touches 0 and 255.

    Any camera gain or display non-linearity then flattens the peaks -- the
    clipping seen in the WK1 ISO study.  The lab standard keeps a margin.
    """
    wk1 = FringeSpec(bias=127.5, amplitude=127.5, n_steps=4)
    f = generate(wk1, W, H)
    assert f.min() == 0 and f.max() == 255
    captured = np.clip(1.2 * f.astype(float), 0, 255)          # 20 % over-exposure
    fit = fit_profile(captured[0, 0])
    assert fit.clipped_fraction > 0.1


# ------------------------------------------------------- D. capture quality

def test_fit_recovers_a_clean_profile():
    spec = FringeSpec(period_px=37.3, n_steps=1)
    fit = fit_profile(generate(spec, 1000, 1)[0, 0])
    assert fit.period_px == pytest.approx(37.3, rel=1e-3)
    assert fit.amplitude == pytest.approx(100, abs=0.5)
    assert fit.r_squared > 0.999


def test_fit_scores_any_phase_equally():
    """The WK1 Pearson score depended on phase alignment; this fit does not."""
    x = np.arange(600.0)
    scores = [fit_profile(128 + 100 * np.cos(TWO_PI * x / 30 + p)).r_squared
              for p in np.linspace(0, TWO_PI, 7)]
    assert min(scores) > 0.999


def test_fit_flags_clipping_and_noise():
    x = np.arange(600.0)
    rng = np.random.default_rng(0)
    clean = 128 + 100 * np.cos(TWO_PI * x / 30)
    bad = np.clip(1.6 * clean - 40 + rng.normal(0, 6, x.size), 0, 255)
    fit = fit_profile(bad)
    assert fit.clipped_fraction > 0.2
    assert fit.r_squared < 0.98


# --------------------------------------------------- E. smots compatibility

def test_static_frame_equals_smots_pattern():
    """SMOTS displays step k = 0 of the lab sequence -- one generator for both."""
    # Works when deflecto/ sits next to smots/ in the repository root.
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "smots"))
    patterns = pytest.importorskip("smots.patterns")
    ours = generate(FringeSpec(n_steps=1), W, H, quantise=False)[0]
    theirs = patterns.render(patterns.PatternSpec(periods_px=(30.0,), axes="x"), W, H)
    assert np.allclose(ours, theirs)
