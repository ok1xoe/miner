// Hra Horník Franta: stavy hry, vykreslení, vstup, smyčka.
(function (root) {
    'use strict';

    var MM = root.MM;
    var canvas = document.getElementById('screen');
    var ctx = canvas.getContext('2d');
    var scr = new MM.Screen();

    var state = 'title';        // title | play | dying | complete | over | win | paused
    var cave = null, player = null, caveIndex = 0;
    var score = 0, lives = 3, hi = 0, nextLife = 10000;
    var stateTimer = 0, frame = 0, prevState = 'play';
    var held = { left: false, right: false, jump: false };

    try { hi = parseInt(localStorage.getItem('miner.hi'), 10) || 0; } catch (e) { hi = 0; }

    // ---------- pomocné ----------
    function pad(n, len) { var s = String(n); while (s.length < len) { s = '0' + s; } return s; }

    function line(row, str, ink, x) {
        var px = x === undefined ? Math.floor((256 - MM.textWidth(str, 1)) / 2) : x;
        MM.drawText(scr, px, row * 8 - 1, str, ink, 1);
    }

    function addScore(n) {
        score += n;
        if (score > hi) {
            hi = score;
            try { localStorage.setItem('miner.hi', String(hi)); } catch (e) { /* ignorovat */ }
        }
        if (score >= nextLife) { lives = Math.min(lives + 1, 8); nextLife += 10000; MM.sound.exit(); }
    }

    function setBorder(color) {
        var c = MM.PAL[color & 7];
        document.body.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    }

    // ---------- průběh hry ----------
    function startGame() {
        score = 0; lives = 3; nextLife = 10000; caveIndex = 0;
        loadCave();
    }

    function loadCave() {
        cave = MM.loadCave(MM.CAVES[caveIndex]);
        player = MM.newPlayer(cave);
        state = 'play';
        setBorder(cave.def.theme.paper === 0 ? 1 : cave.def.theme.paper);
        MM.sound.stopTune();
    }

    function toTitle() {
        state = 'title';
        setBorder(0);
        MM.sound.startTune();
    }

    function startDying() {
        state = 'dying';
        stateTimer = 30;
        MM.sound.die();
    }

    function startComplete() {
        state = 'complete';
        stateTimer = 0;
        MM.sound.exit();
    }

    function playTick() {
        var inp = { dx: (held.right ? 1 : 0) - (held.left ? 1 : 0), jump: held.jump };
        var ev = MM.tick(cave, player, inp);
        if (ev.jumped) { MM.sound.jump(); }
        if (ev.keys.length) { addScore(100 * ev.keys.length); MM.sound.key(); }
        if (player.dead) { startDying(); return; }
        if (ev.exit) { startComplete(); }
    }

    function tick() {
        frame++;
        switch (state) {
            case 'play':
                playTick();
                break;
            case 'dying':
                if (--stateTimer <= 0) {
                    lives--;
                    if (lives < 0) { state = 'over'; MM.sound.over(); }
                    else { loadCave(); }
                }
                break;
            case 'complete':
                if (cave.air > 0) {
                    var take = Math.min(cave.air, 14);
                    cave.air -= take;
                    addScore(2);
                    if ((frame & 3) === 0) { MM.sound.tick(); }
                } else {
                    caveIndex++;
                    if (caveIndex >= MM.CAVES.length) { state = 'win'; MM.sound.win(); }
                    else { loadCave(); }
                }
                break;
        }
    }

    // ---------- vykreslení ----------
    function drawCave() {
        var th = cave.def.theme;
        scr.clear(th.paper, 7);
        var tileInk = { '#': th.wall, '=': th.floor, '~': th.plat, '^': th.spike === undefined ? 15 : th.spike, '*': th.plant === undefined ? 12 : th.plant };
        for (var r = 0; r < 16; r++) {
            for (var c = 0; c < 32; c++) {
                var ch = cave.cells[r][c];
                if (ch === ' ' || ch === 'E') { continue; }
                if (ch === '>' || ch === '<') {
                    scr.pattern(c, r, MM.conveyor(ch === '>' ? 1 : -1, cave.frame), th.conv === undefined ? 11 : th.conv);
                } else if (ch === 'K') {
                    scr.pattern(c, r, MM.TILES.K, ((cave.frame >> 2) & 1) ? 15 : th.key);
                } else if (ch === '~') {
                    var t = cave.crumble[r + ',' + c] || 0;
                    scr.pattern(c, r, MM.TILES['~'], th.plat, t >= 6 ? 2 : (t >= 3 ? 5 : 8));
                } else {
                    scr.pattern(c, r, MM.TILES[ch], tileInk[ch]);
                }
            }
        }
        drawPortal();
        cave.enemies.forEach(function (e) {
            var rows = MM.SPR[e.spr][(cave.frame >> 2) & 1];
            scr.sprite(e.x, e.y, rows, e.col, e.t === 'h' && e.dir < 0);
        });
        drawPlayer();
    }

    function drawPortal() {
        var p = cave.portal;
        if (!p) { return; }
        var open = cave.keysLeft === 0;
        var ink = open ? (((cave.frame >> 2) & 1) ? 15 : 14) : (cave.def.theme.portal === undefined ? 15 : cave.def.theme.portal);
        var x, y;
        for (y = 0; y < p.h; y++) {
            for (x = 0; x < p.w; x++) {
                var border = x < 2 || y < 2 || x >= p.w - 2 || y >= p.h - 2;
                var inner;
                if (open) { inner = ((x + y + (cave.frame >> 1)) & 1) === 0; }
                else { inner = (x % 4) === 1; }
                if (border || inner) {
                    scr.block(p.x + x, p.y + y, 1, 1, 1, ink, true);
                }
            }
        }
    }

    function drawPlayer() {
        if (state === 'dying' && (stateTimer & 2)) { return; }
        var f = player.mode !== 'ground' ? 2 : (player.moved ? ((player.anim >> 1) & 1) : 0);
        scr.sprite(player.x, player.y, MM.SPR.player[f], 15, player.face < 0);
    }

    function drawHud() {
        var th = cave.def.theme;
        // název jeskyně
        scr.fillCells(0, 16, 32, 1, 0, 6, 0);
        line(16, cave.def.name, 0);
        // spodní panel je vždy na černém papíru
        scr.fillCells(0, 18, 32, 6, 7, 0, 0);
        // vzduch
        scr.fillCells(0, 17, 5, 1, 7, 2, 1);
        line(17, 'VZDUCH', 7, 2);
        var frac = Math.max(0, cave.air / cave.airMax);
        var barInk = frac > 0.25 ? 4 : 2;
        scr.fillCells(5, 17, 27, 1, barInk, 0, 1);
        scr.block(40, 17 * 8 + 1, Math.floor(216 * frac), 6, 1, barInk, false);
        // klíče a jeskyně
        var got = cave.keys - cave.keysLeft;
        line(19, 'KLÍČE ' + got + '/' + cave.keys + '   JESKYNĚ ' + (caveIndex + 1) + '/' + MM.CAVES.length, 7);
        // skóre
        line(21, 'SKÓRE ' + pad(score, 6) + '   REKORD ' + pad(hi, 6), 6);
        // životy
        for (var i = 0; i < Math.max(0, Math.min(lives, 14)); i++) {
            scr.sprite(8 + i * 14, 22 * 8, MM.SPR.player[0], 15, false);
        }
        void th;
    }

    function drawTitle() {
        scr.clear(0, 7);
        var title = 'HORNÍK FRANTA';
        var x = Math.floor((256 - MM.textWidth(title, 2)) / 2);
        var cols = [10, 14, 12, 13, 11, 9];
        for (var i = 0; i < title.length; i++) {
            var chx = x + i * 12;
            MM.drawText(scr, chx, 14, title.charAt(i), cols[(i + (frame >> 3)) % cols.length], 2);
        }
        // cihly nahoře a dole
        var r;
        for (r = 0; r < 32; r++) {
            scr.pattern(r, 0, MM.TILES['#'], 2);
            scr.pattern(r, 23, MM.TILES['#'], 2);
        }
        // ozdoby: Franta, klíč a nepřátelé
        var wx = 40 + ((frame >> 1) % 176);
        scr.sprite(wx, 78, MM.SPR.player[(wx >> 2) & 1], 15, false);
        scr.pattern(4, 11, MM.TILES.K, ((frame >> 3) & 1) ? 15 : 14);
        scr.pattern(27, 11, MM.TILES.K, ((frame >> 3) & 1) ? 14 : 15);
        scr.sprite(40, 104, MM.SPR.bat[(frame >> 3) & 1], 13, false);
        scr.sprite(104, 104, MM.SPR.slime[(frame >> 3) & 1], 12, false);
        scr.sprite(160, 104, MM.SPR.saw[(frame >> 2) & 1], 10, false);
        for (r = 0; r < 32; r++) { scr.pattern(r, 12, MM.TILES['='], 6); }

        line(6, 'REKORD ' + pad(hi, 6), 6);
        line(14, 'ŠIPKY NEBO A D - POHYB', 7);
        line(16, 'MEZERNÍK NEBO W - SKOK', 7);
        line(18, 'P - PAUZA     M - ZVUK', 7);
        line(20, 'SEBER KLÍČE A ODEJDI PORTÁLEM', 5);
        if ((frame >> 4) & 1) { line(22, 'STISKNI MEZERNÍK NEBO KLEPNI', 15); }
    }

    function draw() {
        if (state === 'title') {
            drawTitle();
        } else {
            drawCave();
            drawHud();
            if (state === 'paused') { banner('PAUZA', 'P - POKRAČOVAT'); }
            else if (state === 'over') { banner('KONEC HRY', 'SKÓRE ' + pad(score, 6) + '  MEZERNÍK = MENU'); }
            else if (state === 'win') { banner('VYHRÁL JSI!', 'SKÓRE ' + pad(score, 6) + '  MEZERNÍK = MENU'); }
            else if (state === 'complete') { line(8, 'JESKYNĚ HOTOVA', 15); }
        }
        scr.render(ctx);
    }

    function banner(a, b) {
        scr.fillCells(4, 6, 24, 4, 7, 1, 1);
        scr.block(32, 48, 192, 32, 0, 0, false);
        MM.drawText(scr, Math.floor((256 - MM.textWidth(a, 2)) / 2), 52, a, 15, 2);
        line(9, b, 15);
    }

    // ---------- vstup ----------
    function press() {
        MM.sound.unlock();
        if (state === 'title') { startGame(); }
        else if (state === 'over' || state === 'win') { toTitle(); }
    }

    function togglePause() {
        if (state === 'play') { prevState = state; state = 'paused'; }
        else if (state === 'paused') { state = prevState; }
    }

    var KEYS = {
        37: 'left', 65: 'left', 39: 'right', 68: 'right', 38: 'jump', 87: 'jump', 32: 'jump'
    };

    document.addEventListener('keydown', function (e) {
        var k = KEYS[e.keyCode];
        if (k) {
            e.preventDefault();
            held[k] = true;
            if (!e.repeat && (e.keyCode === 32 || e.keyCode === 38 || e.keyCode === 87)) { press(); }
        } else if (e.keyCode === 13) {
            e.preventDefault();
            press();
        } else if (e.keyCode === 80) {
            togglePause();
        } else if (e.keyCode === 77) {
            if (!MM.sound.toggleMute() && state === 'title') { MM.sound.startTune(); }
        }
        MM.sound.unlock();
    });

    document.addEventListener('keyup', function (e) {
        var k = KEYS[e.keyCode];
        if (k) { held[k] = false; }
    });

    // dotyková tlačítka
    Array.prototype.forEach.call(document.querySelectorAll('#touch button'), function (b) {
        var act = b.getAttribute('data-act');
        function down(e) {
            e.preventDefault();
            MM.sound.unlock();
            if (act === 'pause') { togglePause(); return; }
            held[act] = true;
            if (act === 'jump') { press(); }
        }
        function up(e) { e.preventDefault(); if (act !== 'pause') { held[act] = false; } }
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('pointerleave', up);
        b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });

    canvas.addEventListener('pointerdown', function () {
        if (state === 'title' || state === 'over' || state === 'win') { press(); }
        else if (state === 'paused') { togglePause(); }
    });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden && state === 'play') { prevState = 'play'; state = 'paused'; }
    });

    // ---------- celočíselné měřítko ----------
    function fit() {
        var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        var availH = window.innerHeight - (touch ? 150 : 24);
        var s = Math.min(window.innerWidth / 256, availH / 192);
        s = s >= 1 ? Math.floor(s) : Math.max(0.5, s);
        canvas.style.width = Math.round(256 * s) + 'px';
        canvas.style.height = Math.round(192 * s) + 'px';
    }
    window.addEventListener('resize', fit);
    fit();

    // ---------- smyčka (logika 30 Hz) ----------
    var last = 0, acc = 0, STEP = 1000 / 30;

    function loop(ts) {
        var dt = Math.min(250, ts - last || 0);
        last = ts;
        if (state !== 'paused') {
            acc += dt;
            while (acc >= STEP) { tick(); acc -= STEP; }
        } else {
            acc = 0;
            frame++;
        }
        draw();
        requestAnimationFrame(loop);
    }

    root.MM.game = {
        // pro testy
        _get: function () { return { state: state, cave: cave, player: player, score: score, lives: lives, caveIndex: caveIndex }; },
        _tick: tick, _draw: draw, _start: startGame, _held: held
    };

    toTitle();
    requestAnimationFrame(loop);
})(window);
