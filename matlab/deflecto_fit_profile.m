function fit = deflecto_fit_profile(profile, saturation)
%DEFLECTO_FIT_PROFILE  Quality of one captured fringe line (replaces ISOComparator.m).
%
%   fit = deflecto_fit_profile(profile)
%   fit = deflecto_fit_profile(profile, saturation)     % default 255
%
%   Fits  A + B*cos(2*pi*x/P + phi)  to one row (or column) of a camera image.
%   The period P is found from the data (FFT + refinement), so it does not
%   assume any magnification and does not depend on the fringe phase.
%
%   fit.period_px   apparent period in CAMERA pixels
%   fit.bias        A
%   fit.amplitude   B
%   fit.visibility  B/A
%   fit.r2          1 = perfect sinusoid
%   fit.clipped     fraction of samples at 0 or at saturation
%   fit.accept      true if r2 >= 0.98, clipped == 0, visibility >= 0.3
%
%   Use on a photo (grey levels 0-255, NOT im2double):
%     img = double(rgb2gray(imread('1v_FRINGE.jpg')));
%     fit = deflecto_fit_profile(img(round(end/2), :))

if nargin < 2, saturation = 255; end
y = double(profile(:));
n = numel(y);
x = (0:n-1)';

% 1. coarse frequency from the windowed FFT, parabolic refinement
w = 0.5 - 0.5*cos(2*pi*(1:n)'/(n+1));                 % Hann window
S = abs(fft((y - mean(y)) .* w));
S = S(1:floor(n/2)+1);
S(1:2) = 0;                                           % skip DC
[~, k] = max(S);
if k > 1 && k < numel(S)
    a = log(S(k-1)+1e-12); b = log(S(k)+1e-12); c = log(S(k+1)+1e-12);
    k = k + 0.5*(a - c)/(a - 2*b + c);
end
f = (k - 1)/n;                                        % cycles per sample

% 2. Gauss-Newton refinement of the frequency
for it = 1:5
    M = [ones(n,1), cos(2*pi*f*x), sin(2*pi*f*x)];
    coef = M \ y;
    r = y - M*coef;
    d = 2*pi*x .* (-coef(2)*sin(2*pi*f*x) + coef(3)*cos(2*pi*f*x));
    if d'*d == 0, break; end
    f = f + (d'*r)/(d'*d);
end

M = [ones(n,1), cos(2*pi*f*x), sin(2*pi*f*x)];
coef = M \ y;
r = y - M*coef;
ss = sum((y - mean(y)).^2);

fit.period_px  = 1/f;
fit.bias       = coef(1);
fit.amplitude  = hypot(coef(2), coef(3));
fit.phase      = atan2(-coef(3), coef(2));
fit.visibility = fit.amplitude / fit.bias;
fit.r2         = 1 - (r'*r)/ss;
fit.clipped    = mean(y <= 0 | y >= saturation);
fit.accept     = fit.r2 >= 0.98 && fit.clipped == 0 && fit.visibility >= 0.3;
end
