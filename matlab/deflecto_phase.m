function [phi, B, A] = deflecto_phase(frames)
%DEFLECTO_PHASE  N-step phase retrieval, SOLAR lab convention.
%
%   [phi, B, A] = deflecto_phase(frames)
%
%   frames : H x W x N stack (any numeric type), frame k shifted by 2*pi*(k-1)/N
%   phi    : wrapped phase, (-pi, pi]                     (rad)
%   B      : modulation (fringe amplitude)                (grey levels)
%   A      : bias (mean level)                            (grey levels)
%
%       phi = atan2( -sum_k I_k sin(delta_k), sum_k I_k cos(delta_k) )
%
%   For N = 4 this is exactly the WK1 line  atan2(I4 - I2, I1 - I3).
%   Pixels with small B (outside the mirror, dark, saturated) carry no
%   phase information -- mask them, e.g.  phi(B < 10) = NaN.

I = double(frames);
N = size(I, 3);
if N < 3
    error('deflecto:frames', 'Phase retrieval needs at least 3 frames.');
end
delta = reshape(2*pi*(0:N-1)/N, 1, 1, N);
s = sum(I .* sin(delta), 3);
c = sum(I .* cos(delta), 3);
phi = atan2(-s, c);
B = 2/N * hypot(s, c);
A = mean(I, 3);
end
