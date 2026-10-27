function frames = deflecto_fringe(width, height, varargin)
%DEFLECTO_FRINGE  SOLAR lab standard fringe sequence (same as deflecto/fringe.py).
%
%   frames = deflecto_fringe(width, height)
%   frames = deflecto_fringe(width, height, 'Name', value, ...)
%
%   Returns a height x width x N uint8 array: frame k is
%
%       I_k(x) = A + B*cos(2*pi*x/P + delta_k),   delta_k = 2*pi*(k-1)/N
%
%   with x = 0, 1, ..., width-1 (ZERO-based, to match the Python module
%   exactly; WK1 Phases.m used 1..width, which shifts the phase by 2*pi/P).
%
%   Options (defaults are the lab standard):
%     'Period'    P, screen pixels per fringe       30
%     'Steps'     N, phase steps (1 = SMOTS frame)   4
%     'Axis'      'x' vertical stripes (x-slope)    'x'
%                 'y' horizontal stripes (y-slope)
%     'Bias'      A, grey levels                    128
%     'Amplitude' B, grey levels                    100   (levels 28..228)
%     'Gamma'     display gamma to pre-compensate   []    (none)
%
%   Example (4K bench monitor, 4 steps, both axes):
%     Fx = deflecto_fringe(3840, 2160, 'Axis', 'x');
%     Fy = deflecto_fringe(3840, 2160, 'Axis', 'y');
%
%   See also DEFLECTO_PHASE, DEFLECTO_SHOW, DEFLECTO_FIT_PROFILE.

p = inputParser;
p.addParameter('Period', 30);
p.addParameter('Steps', 4);
p.addParameter('Axis', 'x');
p.addParameter('Bias', 128);
p.addParameter('Amplitude', 100);
p.addParameter('Gamma', []);
p.parse(varargin{:});
o = p.Results;

if o.Period < 4
    error('deflecto:period', 'Period below 4 px cannot be rendered as a sinusoid.');
end
if o.Steps < 1 || o.Steps == 2
    error('deflecto:steps', ['Steps must be 1 (SMOTS) or >= 3 (phase shifting); ' ...
          '2 steps cannot separate bias, amplitude and phase.']);
end
if o.Bias - o.Amplitude < 0 || o.Bias + o.Amplitude > 255
    error('deflecto:clip', ['Bias +/- Amplitude = %g..%g clips the 0-255 range; ' ...
          'a clipped sinusoid biases the phase.'], o.Bias - o.Amplitude, o.Bias + o.Amplitude);
end

switch lower(o.Axis)
    case 'x', coord = repmat(0:width-1, height, 1);
    case 'y', coord = repmat((0:height-1)', 1, width);
    otherwise, error('deflecto:axis', 'Axis must be ''x'' or ''y''.');
end

frames = zeros(height, width, o.Steps, 'uint8');
for k = 1:o.Steps
    delta = 2*pi*(k-1)/o.Steps;
    I = o.Bias + o.Amplitude*cos(2*pi*coord/o.Period + delta);
    if ~isempty(o.Gamma)
        I = 255 * (min(max(I/255, 0), 1)).^(1/o.Gamma);   % pre-compensation
    end
    frames(:,:,k) = uint8(floor(I + 0.5));                  % same rounding as Python
end
end
