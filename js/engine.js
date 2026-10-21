// Jádro hry: fyzika hráče, nepřátelé, sbírání klíčů. Sdílí ho hra i ověřovací skript v Node.
(function (root) {
    'use strict';

    var MM = root.MM = root.MM || {};

    var COLS = 32, ROWS = 16;
    var SOLID = { '#': 1, '=': 1, '~': 1, '>': 1, '<': 1 };
    var HURT = { '^': 1, '*': 1 };

    // Pevný skok: 8 ticků nahoru (20 px), 8 ticků dolů (20 px). Vodorovně 2 px/tick, bez řízení ve vzduchu.
    var JUMP = [-4, -3, -3, -3, -2, -2, -2, -1, 1, 2, 2, 2, 3, 3, 3, 4];
    var MAXFALL = 4;
    var LETHAL = 48;          // pád o 48 px a víc (6 políček) je smrtelný
    var CRUMBLE_TICKS = 8;
    var PX = 1, PW = 6, PH = 16;   // hitbox hráče uvnitř spritu 8x16

    var ESIZE = { slime: [8, 8], bat: [8, 8], saw: [8, 8], robot: [8, 16] };

    MM.COLS = COLS; MM.ROWS = ROWS; MM.TICK = 30; MM.SOLID = SOLID; MM.ESIZE = ESIZE;

    function loadCave(def) {
        var cells = def.rows.map(function (r) { return r.split(''); });
        var keys = 0, start = [8, 8];
        var pmin = null, pmax = null;
        for (var r = 0; r < ROWS; r++) {
            for (var c = 0; c < COLS; c++) {
                var ch = cells[r][c];
                if (ch === 'K') { keys++; }
                else if (ch === '@') { start = [c * 8, r * 8]; cells[r][c] = ' '; }
                else if (ch === 'E') {
                    if (!pmin) { pmin = [c, r]; }
                    pmax = [c, r];
                }
            }
        }
        var enemies = (def.enemies || []).map(function (e) {
            var sz = ESIZE[e.spr];
            var lo = e.min, hi = e.max;
            var pos = lo + Math.round(((e.s || 0) * (hi - lo)) / e.speed) * e.speed;
            return {
                t: e.t, spr: e.spr, col: e.col, w: sz[0], h: sz[1], speed: e.speed, min: lo, max: hi, dir: e.dir || 1,
                x: e.t === 'h' ? pos : e.x, y: e.t === 'v' ? pos : e.y
            };
        });
        return {
            def: def, cells: cells, keys: keys, keysLeft: keys, start: start,
            portal: pmin ? { x: pmin[0] * 8, y: pmin[1] * 8, w: (pmax[0] - pmin[0] + 1) * 8, h: (pmax[1] - pmin[1] + 1) * 8 } : null,
            crumble: {}, enemies: enemies, air: def.air, airMax: def.air, frame: 0
        };
    }

    function newPlayer(cave) {
        return { x: cave.start[0], y: cave.start[1], face: 1, mode: 'ground', jt: 0, jdir: 0, vy: 0, fd: 0, anim: 0, moved: false, dead: null };
    }

    function cellAt(cave, c, r) {
        if (c < 0 || c >= COLS || r < 0) { return '#'; }
        if (r >= ROWS) { return ' '; }
        return cave.cells[r][c];
    }

    function blocked(cave, x, y) {
        var c0 = (x + PX) >> 3, c1 = (x + PX + PW - 1) >> 3;
        var r0 = y >> 3, r1 = (y + PH - 1) >> 3;
        for (var r = r0; r <= r1; r++) {
            for (var c = c0; c <= c1; c++) {
                if (SOLID[cellAt(cave, c, r)]) { return true; }
            }
        }
        return false;
    }

    // vrací [pole pod levou nohou, pod pravou nohou, sloupec levý, sloupec pravý, řádek] nebo null
    function support(cave, x, y) {
        var fy = y + PH;
        if (fy & 7) { return null; }
        var r = fy >> 3;
        if (r >= ROWS) { return null; }
        var c0 = (x + PX) >> 3, c1 = (x + PX + PW - 1) >> 3;
        var a = cellAt(cave, c0, r), b = cellAt(cave, c1, r);
        if (!SOLID[a] && !SOLID[b]) { return null; }
        return [a, b, c0, c1, r];
    }

    function moveX(cave, p, d) {
        var s = d < 0 ? -1 : 1, n = Math.abs(d);
        for (var i = 0; i < n; i++) {
            if (blocked(cave, p.x + s, p.y)) { return false; }
            p.x += s;
        }
        return true;
    }

    function land(p, ev) {
        if (p.fd >= LETHAL) { p.dead = 'fall'; return; }
        p.mode = 'ground';
        p.fd = 0;
        ev.landed = true;
    }

    function moveDown(cave, p, n, ev) {
        for (var i = 0; i < n; i++) {
            if (blocked(cave, p.x, p.y + 1)) { land(p, ev); return; }
            p.y++;
            p.fd++;
            if (p.y >= ROWS * 8) { p.dead = 'abyss'; return; }
        }
    }

    function moveUp(cave, p, n) {
        for (var i = 0; i < n; i++) {
            if (blocked(cave, p.x, p.y - 1)) { p.jt = 8; return; }   // náraz hlavou – začne klesat
            p.y--;
        }
    }

    function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;
    }

    // klíče, smrtící překážky, portál
    function touch(cave, p, opt, ev) {
        var x0 = p.x + PX, x1 = x0 + PW - 1, y0 = p.y, y1 = p.y + PH - 1;
        var c0 = x0 >> 3, c1 = x1 >> 3, r0 = Math.max(0, y0 >> 3), r1 = Math.min(ROWS - 1, y1 >> 3);
        for (var r = r0; r <= r1; r++) {
            for (var c = c0; c <= c1; c++) {
                if (c < 0 || c >= COLS) { continue; }
                var ch = cave.cells[r][c];
                if (ch === 'K') {
                    if (rectHit(x0, y0, PW, PH, c * 8 + 1, r * 8 + 1, 6, 6)) {
                        if (!opt.dry) { cave.cells[r][c] = ' '; cave.keysLeft--; }
                        ev.keys.push(r + ',' + c);
                    }
                } else if (HURT[ch]) {
                    var top = ch === '^' ? 3 : 1;
                    if (rectHit(x0, y0, PW, PH, c * 8 + 1, r * 8 + top, 6, 8 - top)) { p.dead = p.dead || 'hurt'; }
                } else if (ch === 'E') {
                    if (opt.dry || cave.keysLeft === 0) { ev.exit = true; }
                }
            }
        }
    }

    function step(cave, p, inp, opt) {
        opt = opt || {};
        var ev = { keys: [], exit: false, landed: false, jumped: false };
        var dx = inp.dx || 0;
        p.moved = false;

        if (p.mode === 'ground' && inp.jump) {
            p.mode = 'jump'; p.jt = 0; p.jdir = dx; p.fd = 0;
            ev.jumped = true;
        }

        if (p.mode === 'ground') {
            if (dx) {
                p.face = dx;
                moveX(cave, p, dx * 2);
                p.anim++;
                p.moved = true;
            }
            var sup = support(cave, p.x, p.y);
            if (sup) {
                var drift = 0;
                if (sup[0] === '>' || sup[1] === '>') { drift = 1; }
                else if (sup[0] === '<' || sup[1] === '<') { drift = -1; }
                if (drift) { moveX(cave, p, drift); sup = support(cave, p.x, p.y) || sup; }
                if (!opt.dry) {
                    for (var k = 2; k <= 3; k++) {
                        var cc = sup[k];
                        if (k === 3 && sup[3] === sup[2]) { break; }
                        if (cave.cells[sup[4]] && cave.cells[sup[4]][cc] === '~') {
                            var key = sup[4] + ',' + cc;
                            cave.crumble[key] = (cave.crumble[key] || 0) + 1;
                            if (cave.crumble[key] >= CRUMBLE_TICKS) { cave.cells[sup[4]][cc] = ' '; delete cave.crumble[key]; }
                        }
                    }
                }
            }
            if (!support(cave, p.x, p.y)) { p.mode = 'fall'; p.vy = 0; p.fd = 0; }
        } else if (p.mode === 'jump') {
            if (p.jdir) { p.face = p.jdir; moveX(cave, p, p.jdir * 2); }
            var dy = JUMP[p.jt++];
            if (dy < 0) { moveUp(cave, p, -dy); }
            else { moveDown(cave, p, dy, ev); }
            if (!p.dead && p.mode === 'jump' && p.jt >= JUMP.length) { p.mode = 'fall'; p.vy = MAXFALL; }
        } else {
            p.vy = Math.min(p.vy + 1, MAXFALL);
            moveDown(cave, p, p.vy, ev);
        }

        if (!p.dead) { touch(cave, p, opt, ev); }
        return ev;
    }

    function updateEnemies(cave) {
        cave.enemies.forEach(function (e) {
            if (e.t === 'h') {
                e.x += e.dir * e.speed;
                if (e.x >= e.max) { e.x = e.max; e.dir = -1; }
                else if (e.x <= e.min) { e.x = e.min; e.dir = 1; }
            } else {
                e.y += e.dir * e.speed;
                if (e.y >= e.max) { e.y = e.max; e.dir = -1; }
                else if (e.y <= e.min) { e.y = e.min; e.dir = 1; }
            }
        });
    }

    function hitEnemy(cave, p) {
        for (var i = 0; i < cave.enemies.length; i++) {
            var e = cave.enemies[i];
            if (rectHit(p.x + 2, p.y + 2, 4, 13, e.x + 1, e.y + 1, e.w - 2, e.h - 2)) { return true; }
        }
        return false;
    }

    // jeden tick hry (30 Hz)
    function tick(cave, p, inp, opt) {
        opt = opt || {};
        var ev = step(cave, p, inp, opt);
        updateEnemies(cave);
        if (!p.dead && !opt.noEnemies && hitEnemy(cave, p)) { p.dead = 'enemy'; }
        cave.air--;
        if (cave.air <= 0 && !p.dead) { p.dead = 'air'; }
        cave.frame++;
        return ev;
    }

    MM.loadCave = loadCave;
    MM.newPlayer = newPlayer;
    MM.step = step;
    MM.tick = tick;
    MM.support = support;
    MM.blocked = blocked;
    MM.cellAt = cellAt;
    MM.CRUMBLE_TICKS = CRUMBLE_TICKS;
    MM.LETHAL = LETHAL;

    if (typeof module !== 'undefined' && module.exports) { module.exports = MM; }
})(typeof window !== 'undefined' ? window : globalThis);
