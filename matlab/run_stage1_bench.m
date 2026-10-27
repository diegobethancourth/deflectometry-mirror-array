%% RUN_STAGE1_BENCH  Stage 1 on the bench: generate, save and display the fringes.
%  SOLAR lab deflectometry backbone -- MATLAB side of deflecto/fringe.py.
%
%  Run section by section (Ctrl+Enter).  Requires only base MATLAB.

%% 0. Run the tests first (must print "ALL PASS")
test_deflecto

%% 1. Bench parameters  (calculations in mm; screen = ViewSonic VX1655-4K)
SCREEN_W_MM = 344;          % W, active width, datasheet -- measure before reporting
NX = 3840;  NY = 2160;      % native resolution
P  = 30;                    % fringe period, screen px
N  = 4;                     % phase steps
p_mm = SCREEN_W_MM / NX;    % pixel pitch p = W / Nx
fprintf('pixel pitch %.1f um, fringe period %.3f mm\n', p_mm*1e3, P*p_mm);

%% 2. Generate the sequences (lab standard: A = 128, B = 100)
Fx = deflecto_fringe(NX, NY, 'Period', P, 'Steps', N, 'Axis', 'x');
Fy = deflecto_fringe(NX, NY, 'Period', P, 'Steps', N, 'Axis', 'y');
Fs = deflecto_fringe(NX, NY, 'Period', P, 'Steps', 1, 'Axis', 'x');   % SMOTS frame

%% 3. Save as PNG (lossless) -- for the record and for other students
out = fullfile(pwd, sprintf('fringes_%dx%d_P%d', NX, NY, P));
if ~exist(out, 'dir'), mkdir(out); end
for k = 1:N
    imwrite(Fx(:,:,k), fullfile(out, sprintf('P%d_N%d_x_k%d.png', P, N, k-1)));
    imwrite(Fy(:,:,k), fullfile(out, sprintf('P%d_N%d_y_k%d.png', P, N, k-1)));
end
imwrite(Fs, fullfile(out, sprintf('P%d_SMOTS_x.png', P)));
back = imread(fullfile(out, sprintf('P%d_N%d_x_k0.png', P, N)));
fprintf('PNG round trip identical: %d   (%s)\n', isequal(back, Fx(:,:,1)), out);

%% 4. Which monitor is the bench screen?
mp = get(0, 'MonitorPositions');
disp('Monitors seen by MATLAB [x y width height]:'); disp(mp);
% The bench monitor must read 3840 x 2160.  If it reads 2560 x 1440 (or other),
% set Windows display Scale = 100 % for that monitor and restart MATLAB.
MONITOR = 2;

%% 5. Show the x sequence full screen (any key = next frame, Esc = stop)
deflecto_show(Fx, 'Monitor', MONITOR);

%% 6. Show the y sequence
deflecto_show(Fy, 'Monitor', MONITOR);

%% 7. Check a captured photo (replaces ISOComparator.m)
% Photograph frame 1 straight on, then:
%   img = double(rgb2gray(imread('capture.jpg')));          % 0-255, not im2double
%   fit = deflecto_fit_profile(img(round(end/2), :))        % row for x fringes
%   fit = deflecto_fit_profile(img(:, round(end/2)))        % column for y fringes
% Accept the exposure only if fit.accept is true (R2 >= 0.98, no clipping,
% visibility >= 0.3).
