// ASCII Rain and Energy Ring — Originkit.
// Adapted from the supplied canvas components for this application's plain JavaScript frontend.
(function() {
    const canvas = document.getElementById('backgroundCanvas');
    const context = canvas.getContext('2d');
    const themeButtons = document.querySelectorAll('[data-theme]');
    const motionButton = document.getElementById('motionToggle');
    const mobile = window.matchMedia('(max-width: 760px), (pointer: coarse)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const tau = Math.PI * 2;
    const glyphSize = 10;
    const trailLength = 18;
    const glyphs = [...'ｱｲｳｴｵｶｷｸ0123456789ABCDEFｸｿﾝ'];
    const rimVertices = 420;
    const glowSegments = 28;
    let theme = 'ring';
    let paused = false;
    let width = 0;
    let height = 0;
    let span = 0;
    let columns = [];
    let field = [];
    let frame = 0;
    let lastFrame = 0;
    let time = 0;
    let particleTime = 0;

    try {
        theme = localStorage.getItem('group-chat-theme') === 'rain' ? 'rain' : 'ring';
        paused = localStorage.getItem('group-chat-motion-paused') === 'true';
    } catch (error) {
        // The chosen appearance still works when browser storage is unavailable.
    }

    let savePreference = function(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            // Private browsing policies can disable local storage.
        }
    };

    let random = function(seed) {
        return function() {
            seed |= 0;
            seed = (seed + 0x6d2b79f5) | 0;
            let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    };

    let smoothstep = function(start, end, value) {
        let progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
        return progress * progress * (3 - 2 * progress);
    };

    let hash = function(first, second) {
        let value = (Math.imul(first, 374761393) + Math.imul(second, 668265263)) | 0;
        value = Math.imul(value ^ (value >>> 13), 1274126177);
        value ^= value >>> 16;
        return (value >>> 0) / 4294967296;
    };

    let buildField = function(count) {
        let next = random(1337);
        let points = [];
        for (let attempt = 0; points.length < count && attempt < count * 80; attempt++) {
            let x, y, radius, tone;
            if (next() < .3) {
                let angle = next() * tau;
                radius = .86 + Math.sqrt(next()) * .115;
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius;
                if (next() > smoothstep(-.55, .35, y)) {
                    continue;
                }
                let shade = next();
                tone = shade < .45 ? 3 : shade < .8 ? 2 : 0;
            } else {
                x = next() * 2 - 1;
                y = next() * 2 - 1;
                radius = Math.hypot(x, y);
                if (radius > .975) {
                    continue;
                }
                let bottom = Math.pow(smoothstep(-.2, .9, y), 1.2);
                let edge = smoothstep(.62, .97, radius) * smoothstep(-.75, .25, y);
                let weight = Math.max(bottom, edge * .85);
                if (next() > .015 + .985 * weight) {
                    continue;
                }
                let shade = next();
                tone = weight < .12 ? 4 : shade < .3 ? 0 : shade < .5 ? 1 : shade < .8 ? 2 : 3;
            }
            points.push({
                x: x, y: y, tone: tone,
                amplitude: .002 + next() * .006,
                waveX: .8 + next() * 2.4, waveY: .8 + next() * 2.4,
                phaseX: next() * tau, phaseY: next() * tau,
                twinkle: 2 + next() * 6, twinklePhase: next() * tau,
                size: tone === 4 ? 1.8 : next() < .22 ? 2.1 : 1.3,
                rise: .16 + next() * .26, life: 2.5 + next() * 3.5,
                phase: next(), alpha: tone === 4 || next() > .5 ? 1 : .6
            });
        }
        return points;
    };

    let buildStrands = function() {
        let next = random(99);
        let bands = [[6, 12, .35, .6, 1.6], [18, 34, .3, 1.5, 3.5], [40, 70, .22, 3, 7], [80, 130, .13, 6, 12]];
        return Array.from({length: 6}, function() {
            return {
                waves: bands.map(function(band) {
                    return {
                        frequency: Math.round(band[0] + next() * (band[1] - band[0])),
                        amplitude: band[2], rate: (band[3] + next() * (band[4] - band[3])) * (next() < .5 ? -1 : 1),
                        phase: next() * tau
                    };
                }),
                tufts: Array.from({length: 3}, function() {
                    return {frequency: 4 + Math.floor(next() * 6), rate: (.4 + next() * .8) * (next() < .5 ? -1 : 1), phase: next() * tau};
                })
            };
        });
    };

    const strands = buildStrands();
    const core = new Float32Array(rimVertices * 2);
    const glow = new Float32Array(rimVertices * 2);
    const cosines = Float32Array.from({length: rimVertices}, (_, index) => Math.cos(index / rimVertices * tau));
    const sines = Float32Array.from({length: rimVertices}, (_, index) => Math.sin(index / rimVertices * tau));
    const tones = ['#24d278', '#54b783', '#27a0a3', '#34d5b7', '#9de3b4'];

    let pickGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)];
    let spawn = function(y) {
        return {
            y: y, rate: 6 * glyphSize * (.75 + Math.random() * .5),
            burnout: Math.random() < .35 ? Infinity : .75 + Math.random() * .25,
            alpha: 1, chars: Array.from({length: trailLength}, pickGlyph)
        };
    };
    let nextRelease = () => span * (.3 + Math.random() * .5);

    let drawRain = function(delta) {
        context.save();
        context.translate(width / 2, height / 2);
        context.font = glyphSize + 'px ui-monospace, Menlo, monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        let lead = trailLength * glyphSize;
        columns.forEach(function(column, index) {
            let x = -width / 2 + index * glyphSize + glyphSize / 2;
            for (let stream of column.streams) {
                stream.y += stream.rate * delta;
                if (stream.y / span > stream.burnout) {
                    stream.alpha -= delta * 1.5;
                }
                if (delta > 0 && Math.random() < .25) {
                    stream.chars[Math.floor(Math.random() * trailLength)] = pickGlyph();
                }
                for (let letter = 0; letter < trailLength; letter++) {
                    let y = -height / 2 + stream.y - letter * glyphSize;
                    if (y < -height / 2 - glyphSize || y > height / 2 + glyphSize) {
                        continue;
                    }
                    context.globalAlpha = Math.max(0, stream.alpha) * (1 - letter / trailLength) * .46;
                    context.fillStyle = letter === 0 ? '#FFFFFF' : '#15FF00';
                    context.fillText(stream.chars[letter], x, y);
                }
            }
            column.streams = column.streams.filter(stream => stream.alpha > 0 && stream.y - lead <= span);
            let newest = column.streams[column.streams.length - 1];
            if (!newest || newest.y >= column.releaseAt) {
                column.streams.push(spawn(-lead));
                column.releaseAt = nextRelease();
            }
        });
        context.restore();
    };

    let drawRing = function() {
        let chatOpen = document.body.classList.contains('is-chat');
        let small = mobile.matches;
        let centerX = width * (small || chatOpen ? .5 : .29);
        let centerY = height * (small ? .29 : .5);
        let size = Math.min(width, height) * (small ? .95 : .8);
        let radius = size * .47;
        let scale = size / 1150;
        context.save();
        context.beginPath();
        context.arc(centerX, centerY, radius, 0, tau);
        context.clip();
        let haze = context.createRadialGradient(centerX, centerY + radius * .9, 0, centerX, centerY + radius * .9, radius * 1.05);
        haze.addColorStop(0, '#00502080');
        haze.addColorStop(.6, '#00331138');
        haze.addColorStop(1, '#00331100');
        context.fillStyle = haze;
        context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
        context.restore();
        context.globalCompositeOperation = 'lighter';
        for (let point of field) {
            if (Math.sin(particleTime * point.twinkle + point.twinklePhase) < -.75) {
                continue;
            }
            let progress = (particleTime / point.life + point.phase) % 1;
            let envelope = Math.sin(Math.PI * progress);
            let x = point.x + point.amplitude * Math.sin(particleTime * point.waveX + point.phaseX);
            let y = point.y + point.rise * (.5 - progress) + point.amplitude * Math.cos(particleTime * point.waveY + point.phaseY);
            if (envelope < .08 || x * x + y * y > .95) {
                continue;
            }
            let dotSize = point.size * Math.max(.65, scale * 1.1) * (.35 + .95 * envelope);
            context.fillStyle = tones[point.tone];
            context.globalAlpha = point.alpha * .72;
            context.fillRect(centerX + x * radius, centerY + y * radius, dotSize, dotSize);
        }
        for (let halo of [[.07, .1, '#008a3b', .01], [.03, .1, '#00FF6B', -.018], [.011, .4, '#00FF6B', 0]]) {
            context.beginPath();
            context.arc(centerX, centerY, radius + size * halo[3], 0, tau);
            context.strokeStyle = halo[2];
            context.lineWidth = size * halo[0];
            context.globalAlpha = halo[1];
            context.stroke();
        }
        let amplitude = size * .0075 * 1.7;
        let tuftSize = size * .03 * 1.6;
        let passes = [[.07, .07, '#008a3b'], [.04, .16, '#008a3b'], [.022, .28, '#00d95b'], [.011, .38, '#00FF6B']];
        strands.forEach(function(strand, strandIndex) {
            for (let index = 0; index < rimVertices; index++) {
                let angle = index / rimVertices * tau;
                let wave = strand.waves.reduce((value, part) => value + part.amplitude * Math.sin(part.frequency * angle + part.rate * time + part.phase), 0);
                let tuft = strand.tufts.reduce((value, part) => value + Math.sin(part.frequency * angle + part.rate * time + part.phase), 0);
                tuft = Math.pow(Math.max(0, tuft / 3), 2);
                let coreRadius = radius + amplitude * wave + amplitude * .3 * (hash(index + strandIndex * 1013, Math.floor(time * 24)) - .5);
                let glowRadius = coreRadius + tuftSize * tuft;
                core[index * 2] = centerX + cosines[index] * coreRadius;
                core[index * 2 + 1] = centerY + sines[index] * coreRadius;
                glow[index * 2] = centerX + cosines[index] * glowRadius;
                glow[index * 2 + 1] = centerY + sines[index] * glowRadius;
            }
            for (let pass of passes) {
                context.lineWidth = Math.max(1, size * pass[0]);
                context.strokeStyle = pass[2];
                for (let segment = 0; segment < glowSegments; segment++) {
                    let start = Math.round(segment * rimVertices / glowSegments);
                    let end = Math.round((segment + 1) * rimVertices / glowSegments);
                    let top = Math.max(0, -Math.sin((start + end) / 2 / rimVertices * tau));
                    context.globalAlpha = pass[1] * .4 * (1 - .35 * Math.pow(top, 1.5));
                    context.beginPath();
                    context.moveTo(glow[start * 2], glow[start * 2 + 1]);
                    for (let index = start + 1; index <= end; index++) {
                        let vertex = index % rimVertices;
                        context.lineTo(glow[vertex * 2], glow[vertex * 2 + 1]);
                    }
                    context.stroke();
                }
            }
            context.beginPath();
            context.moveTo(core[0], core[1]);
            for (let index = 1; index < rimVertices; index++) {
                context.lineTo(core[index * 2], core[index * 2 + 1]);
            }
            context.closePath();
            context.globalAlpha = .4;
            context.strokeStyle = '#00FF6B';
            context.lineWidth = Math.max(1.6, 3.5 * scale);
            context.stroke();
            context.globalAlpha = .65;
            context.strokeStyle = '#b8ffd6';
            context.lineWidth = Math.max(.7, 1.4 * scale);
            context.stroke();
        });
        context.globalCompositeOperation = 'source-over';
        context.globalAlpha = 1;
    };

    let draw = function(delta) {
        if (!context) {
            return;
        }
        context.globalAlpha = 1;
        context.fillStyle = '#090d0b';
        context.fillRect(0, 0, width, height);
        if (theme === 'rain') {
            drawRain(delta);
        } else {
            time += delta * 2;
            particleTime += delta;
            drawRing();
        }
    };

    let tick = function(now) {
        frame = requestAnimationFrame(tick);
        if (lastFrame && now - lastFrame < 1000 / 30) {
            return;
        }
        let delta = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
        lastFrame = now;
        draw(delta);
    };

    let updateMotion = function() {
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = 0;
        let still = mobile.matches || reducedMotion.matches;
        motionButton.hidden = still || !context;
        motionButton.textContent = paused ? 'Resume motion' : 'Pause motion';
        motionButton.setAttribute('aria-label', paused ? 'Resume background animation' : 'Pause background animation');
        motionButton.setAttribute('aria-pressed', String(paused));
        draw(0);
        if (context && !still && !paused && !document.hidden) {
            frame = requestAnimationFrame(tick);
        }
    };

    let layout = function() {
        width = canvas.clientWidth;
        height = canvas.clientHeight;
        let ratio = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        if (context) {
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }
        span = height;
        columns = Array.from({length: Math.ceil(width / glyphSize)}, function() {
            return {streams: [spawn(Math.random() * span)], releaseAt: nextRelease()};
        });
        field = buildField(Math.round(Math.min(15000, width * height / 90)));
        updateMotion();
    };

    let selectTheme = function(value) {
        theme = value;
        themeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === theme)));
        savePreference('group-chat-theme', theme);
        draw(0);
    };

    themeButtons.forEach(button => button.addEventListener('click', () => selectTheme(button.dataset.theme)));
    motionButton.addEventListener('click', function() {
        paused = !paused;
        savePreference('group-chat-motion-paused', String(paused));
        updateMotion();
    });
    mobile.addEventListener('change', updateMotion);
    reducedMotion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    window.addEventListener('resize', layout);
    window.addEventListener('pagehide', () => cancelAnimationFrame(frame));
    window.addEventListener('pageshow', updateMotion);
    new MutationObserver(() => draw(0)).observe(document.body, {attributes: true, attributeFilter: ['class']});
    selectTheme(theme);
    layout();
})();
