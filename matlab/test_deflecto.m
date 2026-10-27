%% TEST_DEFLECTO  Stage 1 tests, MATLAB side.  Run:  test_deflecto
%  Same known-answer checks as tests/test_fringe.py, plus a cross-language
%  check that MATLAB and Python generate IDENTICAL frames.  Base MATLAB only.

here = fileparts(mfilename('fullpath'));
W = 510; H = 8; P = 30;                    % 510 = 17 whole periods
x = 0:W-1;
truth = angle(exp(1i*2*pi*x/P));           % true wrapped phase
wrapd = @(a) angle(exp(1i*a));
nfail = 0;
lbl = {'FAIL', 'PASS'};
check = @(ok, name) fprintf('%-58s %s\n', name, lbl{ok + 1});

%% A. the pattern
F = deflecto_fringe(W, H);
r = double(F(1,:,1)); S = abs(fft(r - mean(r))); [~, k] = max(S(1:W/2));
ok = (k-1 == W/P);                                   nfail = nfail + ~ok; check(ok, 'A1 period: FFT peak at W/P = 17');
ok = isa(F,'uint8') && min(F(:)) >= 28 && max(F(:)) <= 228;
                                                     nfail = nfail + ~ok; check(ok, 'A2 levels inside 28..228');
try, deflecto_fringe(W, H, 'Bias', 128, 'Amplitude', 140); ok = false; catch, ok = true; end
                                                     nfail = nfail + ~ok; check(ok, 'A3 clipping pattern rejected');
try, deflecto_fringe(W, H, 'Steps', 2); ok = false; catch, ok = true; end
                                                     nfail = nfail + ~ok; check(ok, 'A4 two steps rejected');
Fx = deflecto_fringe(60, 60, 'Steps', 1, 'Axis', 'x');
Fy = deflecto_fringe(60, 60, 'Steps', 1, 'Axis', 'y');
ok = isequal(Fx, Fy');                               nfail = nfail + ~ok; check(ok, 'A5 x and y patterns are transposes');
f = tempname; imwrite(F(:,:,1), [f '.png']); ok = isequal(imread([f '.png']), F(:,:,1));
                                                     nfail = nfail + ~ok; check(ok, 'A6 PNG round trip lossless');

%% B. phase retrieval
for N = [3 4 8]
    G = deflecto_fringe(W, H, 'Steps', N);
    [phi, B, A] = deflecto_phase(G);
    e = max(abs(wrapd(phi(1,:) - truth)));
    ok = e < 0.006 && abs(mean(B(:)) - 100) < 0.5 && abs(mean(A(:)) - 128) < 0.5;
    nfail = nfail + ~ok; check(ok, sprintf('B1 %d-step round trip, 8-bit error %.4f rad', N, e));
end
G = double(deflecto_fringe(W, H, 'Steps', 4));
phi = deflecto_phase(G);
wk1 = atan2(G(:,:,4) - G(:,:,2), G(:,:,1) - G(:,:,3));
ok = max(abs(wrapd(wk1(:) - phi(:)))) < 1e-12;      nfail = nfail + ~ok; check(ok, 'B2 WK1 atan2(I4-I2, I1-I3) == general N-step');
phir = deflecto_phase(G(:,:,[1 4 3 2]));
ok = max(abs(wrapd(phir(:) + phi(:)))) < 1e-12;     nfail = nfail + ~ok; check(ok, 'B3 reversed step order negates the phase');
rng(1);
G = double(deflecto_fringe(W, 200, 'Steps', 4)) + 2*randn(200, W, 4);
e = wrapd(deflecto_phase(G) - repmat(truth, 200, 1));
pred = sqrt(2/4)*2/100;
ok = abs(std(e(:))/pred - 1) < 0.08;                nfail = nfail + ~ok; check(ok, sprintf('B4 noise %.2f mrad vs predicted %.2f mrad', 1e3*std(e(:)), 1e3*pred));

%% C. display gamma
disp22 = @(v) 255*(double(v)/255).^2.2;
d = wrapd(deflecto_phase(disp22(deflecto_fringe(W, H, 'Steps', 3))) - truth); e3 = max(abs(d(:)));
ok = e3 > 0.1;                                       nfail = nfail + ~ok; check(ok, sprintf('C1 uncorrected gamma breaks 3-step (%.3f rad)', e3));
d = wrapd(deflecto_phase(disp22(deflecto_fringe(W, H, 'Steps', 3, 'Gamma', 2.2))) - truth); e3c = max(abs(d(:)));
ok = e3c < 0.008;                                    nfail = nfail + ~ok; check(ok, sprintf('C2 pre-compensation restores it (%.4f rad)', e3c));

%% D. capture-quality fit
xx = 0:999;
fit = deflecto_fit_profile(double(deflecto_fringe(1000, 1, 'Period', 37.3, 'Steps', 1)));
ok = abs(fit.period_px - 37.3) < 0.04 && fit.r2 > 0.999 && fit.accept;
                                                     nfail = nfail + ~ok; check(ok, sprintf('D1 clean profile: period %.3f px, R2 %.5f', fit.period_px, fit.r2));
sc = zeros(1,7); ph = linspace(0, 2*pi, 7);
for j = 1:7, f2 = deflecto_fit_profile(128 + 100*cos(2*pi*xx/30 + ph(j))); sc(j) = f2.r2; end
ok = min(sc) > 0.999;                                nfail = nfail + ~ok; check(ok, 'D2 score independent of fringe phase');
rng(0);
bad = min(max(1.6*(128 + 100*cos(2*pi*xx/30)) - 40 + 6*randn(size(xx)), 0), 255);
fb = deflecto_fit_profile(bad);
ok = fb.clipped > 0.2 && ~fb.accept;                 nfail = nfail + ~ok; check(ok, 'D3 over-exposed profile rejected');

%% E. MATLAB == Python, frame for frame
ref = fullfile(here, 'reference');
same = true;
for ax = 'xy'
    for g = [0 22]
        if g, M = deflecto_fringe(W, 64, 'Axis', ax, 'Gamma', 2.2);
        else, M = deflecto_fringe(W, 64, 'Axis', ax); end
        for k = 0:3
            Py = imread(fullfile(ref, sprintf('py_P30_N4_%s_g%d_k%d.png', ax, g, k)));
            same = same && isequal(Py, M(:,:,k+1));
        end
    end
end
nfail = nfail + ~same; check(same, 'E1 MATLAB frames identical to Python frames');

%% result
if nfail == 0
    fprintf('\nALL PASS\n');
else
    error('deflecto:test', '%d test(s) FAILED', nfail);
end
