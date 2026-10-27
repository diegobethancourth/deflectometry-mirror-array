function fig = deflecto_show(frames, varargin)
%DEFLECTO_SHOW  Display fringe frames full screen, pixel for pixel (1:1).
%
%   deflecto_show(frames)                         monitor 2, key press to advance
%   deflecto_show(frames, 'Monitor', 2)
%   deflecto_show(frames, 'Wait', 0.5)            advance every 0.5 s instead
%   deflecto_show(frames, 'OnFrame', @(k) myCapture(k))   call after each frame
%
%   frames : H x W x N uint8, from DEFLECTO_FRINGE. H x W must equal the
%            monitor's resolution, otherwise MATLAB would resample the image
%            and the fringe period on the screen would no longer be P pixels.
%
%   Why not just open the PNG?  Image viewers (Photos, browsers, PowerPoint)
%   scale and smooth images to fit the window.  A 30 px period then becomes
%   29.7 or 31.2 px, and every angle computed from it is wrong by that ratio.
%
%   BEFORE FIRST USE on the bench PC:
%     Windows Settings > Display > select the 4K monitor > Scale = 100 %.
%     MATLAB works in scaled ("logical") pixels: at 150 % a 3840 x 2160 screen
%     reports as 2560 x 1440, and this function stops with an error rather
%     than show a resampled pattern.
%
%   Keys while showing: any key = next frame, Esc or q = stop.

p = inputParser;
p.addParameter('Monitor', 2);
p.addParameter('Wait', 'key');
p.addParameter('OnFrame', []);
p.parse(varargin{:});
o = p.Results;

[H, W, N] = size(frames);
if ~isa(frames, 'uint8')
    error('deflecto:type', 'frames must be uint8 (output of deflecto_fringe).');
end

mp = get(0, 'MonitorPositions');            % one row per monitor: [x y w h]
if o.Monitor > size(mp, 1)
    error('deflecto:monitor', 'Monitor %d requested, only %d connected.', ...
          o.Monitor, size(mp, 1));
end
pos = mp(o.Monitor, :);
if pos(3) ~= W || pos(4) ~= H
    error('deflecto:size', ['Monitor %d reports %d x %d px, frames are %d x %d.\n' ...
        'Either the monitor is not at its native resolution or Windows display ' ...
        'scaling is not 100 %% for it.\nFix the display setting (or regenerate the ' ...
        'frames at the reported size) -- do NOT let MATLAB resample the pattern.'], ...
        o.Monitor, pos(3), pos(4), W, H);
end

fig = figure('Units', 'pixels', 'Position', pos, 'MenuBar', 'none', ...
             'ToolBar', 'none', 'NumberTitle', 'off', 'Name', 'deflecto', ...
             'Color', 'k', 'Resize', 'off', 'KeyPressFcn', @onKey);
try
    set(fig, 'WindowState', 'fullscreen');  % R2018a+; hides the title bar
catch
end
ax = axes('Parent', fig, 'Units', 'pixels', 'Position', [1 1 W H], ...
          'Visible', 'off', 'XLim', [0.5 W+0.5], 'YLim', [0.5 H+0.5], ...
          'YDir', 'reverse');
set(fig, 'Colormap', gray(256));
img = image('Parent', ax, 'CData', frames(:,:,1), 'CDataMapping', 'direct');
setappdata(fig, 'key', '');

for k = 1:N
    set(img, 'CData', frames(:,:,k));       % uint8 0..255 -> colormap rows 1..256
    set(fig, 'Name', sprintf('deflecto  frame %d / %d', k, N));
    drawnow;
    if ~isempty(o.OnFrame)
        o.OnFrame(k);
    end
    if ischar(o.Wait)
        setappdata(fig, 'key', '');
        waitfor(fig, 'UserData');           % released by onKey
        if ~ishandle(fig), return; end
        if any(strcmp(getappdata(fig, 'key'), {'escape', 'q'})), break; end
    else
        pause(o.Wait);
    end
end

    function onKey(src, evt)
        setappdata(src, 'key', evt.Key);
        set(src, 'UserData', rand);          % any change releases waitfor
    end
end
