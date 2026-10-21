// Data jeskyní. Mřížka 32x16 políček po 8 px.
//  # cihla  = podlaha  ~ drolící se  > < pás  ^ krápníky/bodce  * jedovatá rostlina
//  K klíč   E portál (2x2)  @ start hráče (levý horní roh, hráč je vysoký 2 políčka)
// Barvy: 0 černá 1 modrá 2 červená 3 purpurová 4 zelená 5 azurová 6 žlutá 7 bílá, +8 jasná.
(function (root) {
    'use strict';

    var MM = root.MM = root.MM || {};

    function Builder() {
        this.g = [];
        for (var r = 0; r < 16; r++) {
            var row = [];
            for (var c = 0; c < 32; c++) { row.push(' '); }
            this.g.push(row);
        }
        for (var i = 0; i < 32; i++) { this.g[0][i] = '#'; }
        for (var j = 0; j < 16; j++) { this.g[j][0] = '#'; this.g[j][31] = '#'; }
    }
    // vodorovná řada
    Builder.prototype.h = function (r, c0, c1, ch) { for (var c = c0; c <= c1; c++) { this.g[r][c] = ch || '='; } return this; };
    // svislá řada
    Builder.prototype.v = function (c, r0, r1, ch) { for (var r = r0; r <= r1; r++) { this.g[r][c] = ch || '#'; } return this; };
    Builder.prototype.at = function (r, c, ch) { this.g[r][c] = ch; return this; };
    Builder.prototype.keys = function (list) { var self = this; list.forEach(function (k) { self.g[k[0]][k[1]] = 'K'; }); return this; };
    Builder.prototype.portal = function (r, c) { this.g[r][c] = this.g[r][c + 1] = this.g[r + 1][c] = this.g[r + 1][c + 1] = 'E'; return this; };
    Builder.prototype.rows = function () { return this.g.map(function (r) { return r.join(''); }); };

    function floor(b) { return b.h(15, 1, 30, '='); }

    var CAVES = [];

    // 1 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 6, 12).h(11, 15, 21).h(9, 22, 28).h(7, 14, 19).h(5, 6, 11).h(3, 14, 20);
        b.portal(1, 17).at(13, 2, '@');
        b.keys([[14, 25], [12, 9], [10, 18], [8, 25], [4, 8]]);
        CAVES.push({
            name: 'Vstupní štola', air: 1800, rows: b.rows(),
            theme: { paper: 0, wall: 2, floor: 6, plat: 6, key: 14, portal: 7 },
            enemies: [{ t: 'h', spr: 'slime', col: 5, y: 112, min: 88, max: 152, speed: 1, s: 0.3 }]
        });
    })();

    // 2 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(14, 12, 24, '^');
        b.h(13, 13, 15).h(13, 18, 20).h(13, 23, 25).h(11, 27, 30);
        b.portal(9, 28).at(13, 2, '@');
        b.keys([[14, 5], [12, 14], [12, 19], [12, 24], [14, 29], [10, 27], [14, 9]]);
        CAVES.push({
            name: 'Kapavý sklep', air: 1900, rows: b.rows(),
            theme: { paper: 1, wall: 5, floor: 7, plat: 7, key: 14, portal: 6, spike: 15 },
            enemies: [{ t: 'h', spr: 'slime', col: 14, y: 112, min: 24, max: 80, speed: 1, s: 0.5 }]
        });
    })();

    // 3 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 6, 9, '~').h(11, 12, 15, '~').h(9, 18, 21, '~').h(7, 24, 27, '~').h(5, 18, 21, '~').h(3, 10, 15);
        b.portal(1, 10).at(13, 2, '@');
        b.keys([[12, 7], [10, 13], [8, 19], [6, 25], [4, 19], [14, 27]]);
        CAVES.push({
            name: 'Drolící se schody', air: 1700, rows: b.rows(),
            theme: { paper: 0, wall: 3, floor: 4, plat: 6, key: 14, portal: 5 },
            enemies: [{ t: 'h', spr: 'slime', col: 12, y: 112, min: 136, max: 216, speed: 1, s: 0.6 }]
        });
    })();

    // 4 ------------------------------------------------------------
    (function () {
        var b = new Builder();
        b.h(15, 1, 10, '>').h(15, 11, 20, '=').h(15, 21, 30, '<');
        b.h(13, 12, 17, '>').h(11, 20, 25, '<').h(9, 12, 17, '>').h(7, 4, 9).h(5, 12, 17).h(3, 20, 26);
        b.portal(1, 24).at(13, 2, '@');
        b.keys([[14, 28], [12, 14], [10, 22], [8, 14], [6, 6], [4, 14]]);
        CAVES.push({
            name: 'Pásová dráha', air: 1900, rows: b.rows(),
            theme: { paper: 2, wall: 6, floor: 7, plat: 7, key: 14, portal: 6, conv: 11 },
            enemies: [{ t: 'h', spr: 'slime', col: 13, y: 112, min: 176, max: 216, speed: 1, s: 0.2 }]
        });
    })();

    // 5 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 4, 9).h(11, 12, 17).h(9, 4, 9).h(7, 12, 17).h(5, 4, 9).h(3, 12, 18);
        b.portal(1, 15).at(13, 24, '@');
        b.keys([[12, 6], [10, 15], [8, 6], [6, 15], [4, 6], [14, 2]]);
        CAVES.push({
            name: 'Netopýří věž', air: 1900, rows: b.rows(),
            theme: { paper: 0, wall: 1, floor: 5, plat: 5, key: 14, portal: 6 },
            enemies: [
                { t: 'v', spr: 'bat', col: 11, x: 176, min: 24, max: 104, speed: 1, s: 0.0 },
                { t: 'v', spr: 'bat', col: 13, x: 208, min: 24, max: 104, speed: 1, s: 0.5 }
            ]
        });
    })();

    // 6 ------------------------------------------------------------
    (function () {
        var b = new Builder();
        b.h(15, 1, 30, '=');
        b.h(3, 1, 6).h(6, 9, 12).h(9, 15, 18).h(12, 21, 24).h(13, 6, 10);
        b.portal(13, 28).at(1, 2, '@');
        b.keys([[2, 4], [5, 10], [8, 16], [11, 22], [14, 3], [14, 14]]);
        CAVES.push({
            name: 'Hluboká šachta', air: 2000, rows: b.rows(),
            theme: { paper: 0, wall: 4, floor: 6, plat: 4, key: 14, portal: 7 },
            enemies: [{ t: 'v', spr: 'bat', col: 10, x: 112, min: 40, max: 96, speed: 1, s: 0.4 }]
        });
    })();

    // 7 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 6, 12).h(11, 15, 21).h(9, 22, 28).h(7, 14, 19).h(5, 6, 11).h(3, 14, 20);
        b.at(12, 9, '*').at(4, 9, '*').h(14, 26, 27, '*');
        b.portal(1, 17).at(13, 2, '@');
        b.keys([[14, 29], [12, 7], [10, 18], [8, 25], [4, 7], [14, 23]]);
        CAVES.push({
            name: 'Houbová zahrada', air: 2000, rows: b.rows(),
            theme: { paper: 0, wall: 4, floor: 12, plat: 4, key: 14, portal: 7, plant: 12 },
            enemies: [{ t: 'h', spr: 'slime', col: 11, y: 112, min: 176, max: 208, speed: 1, s: 0.5 }]
        });
    })();

    // 8 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 19, 25).h(11, 10, 16).h(9, 3, 9).h(7, 12, 17).h(5, 20, 25).h(3, 11, 17);
        b.portal(1, 13).at(13, 29, '@');
        b.keys([[14, 6], [12, 22], [10, 13], [8, 5], [4, 23]]);
        CAVES.push({
            name: 'Pila a stráže', air: 2200, rows: b.rows(),
            theme: { paper: 1, wall: 6, floor: 7, plat: 6, key: 14, portal: 7 },
            enemies: [
                { t: 'h', spr: 'saw', col: 10, y: 64, min: 32, max: 56, speed: 2, s: 0.3 },
                { t: 'h', spr: 'saw', col: 10, y: 112, min: 16, max: 64, speed: 2, s: 0.0 }
            ]
        });
    })();

    // 9 ------------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 2, 5).h(11, 8, 13).h(9, 2, 5).h(7, 8, 13).h(5, 16, 21).h(7, 24, 29).h(9, 16, 21).h(11, 24, 29).h(13, 16, 21).h(3, 8, 13);
        b.portal(1, 10).at(13, 28, '@');
        b.keys([[12, 3], [10, 10], [8, 3], [6, 10], [4, 18], [6, 26], [8, 18]]);
        CAVES.push({
            name: 'Podzemní labyrint', air: 2300, rows: b.rows(),
            theme: { paper: 0, wall: 3, floor: 5, plat: 3, key: 14, portal: 6 },
            enemies: [
                { t: 'h', spr: 'slime', col: 12, y: 112, min: 64, max: 120, speed: 1, s: 0.0 },
                { t: 'v', spr: 'bat', col: 11, x: 184, min: 24, max: 104, speed: 1, s: 0.5 }
            ]
        });
    })();

    // 10 -----------------------------------------------------------
    (function () {
        var b = floor(new Builder());
        b.h(13, 22, 27, '~').h(11, 14, 19, '~').h(9, 22, 27, '~').h(7, 14, 19, '~').h(5, 22, 27, '~').h(3, 13, 19);
        b.portal(1, 15).at(13, 3, '@');
        b.keys([[12, 24], [10, 16], [8, 24], [6, 16], [4, 24], [14, 12], [14, 7]]);
        CAVES.push({
            name: 'Křišťálový dóm', air: 2400, rows: b.rows(),
            theme: { paper: 1, wall: 5, floor: 13, plat: 5, key: 14, portal: 7 },
            enemies: [
                { t: 'v', spr: 'bat', col: 11, x: 72, min: 40, max: 104, speed: 1, s: 0.5 },
                { t: 'v', spr: 'bat', col: 11, x: 104, min: 40, max: 104, speed: 1, s: 0.0 }
            ]
        });
    })();

    // 11 -----------------------------------------------------------
    (function () {
        var b = new Builder();
        b.h(15, 1, 10, '=').h(15, 14, 17, '>').h(15, 21, 30, '=');
        b.h(14, 5, 6, '^').h(14, 24, 25, '*');
        b.h(13, 11, 14, '~').h(11, 18, 22).h(9, 24, 28, '<').h(7, 16, 21).h(5, 8, 13, '~').h(3, 16, 24).h(7, 3, 6);
        b.portal(1, 22).at(13, 2, '@');
        b.keys([[14, 28], [12, 12], [10, 20], [8, 26], [6, 18], [4, 10], [2, 17], [6, 4]]);
        CAVES.push({
            name: 'Králova šachta', air: 2600, rows: b.rows(),
            theme: { paper: 0, wall: 2, floor: 14, plat: 6, key: 14, portal: 7, conv: 11, plant: 12 },
            enemies: [
                { t: 'h', spr: 'slime', col: 13, y: 16, min: 144, max: 160, speed: 1, s: 0.2 },
                { t: 'v', spr: 'bat', col: 11, x: 120, min: 24, max: 104, speed: 1, s: 0.5 },
                { t: 'h', spr: 'slime', col: 10, y: 112, min: 168, max: 184, speed: 1, s: 0.0 }
            ]
        });
    })();

    MM.CAVES = CAVES;

    if (typeof module !== 'undefined' && module.exports) { module.exports = MM; }
})(typeof window !== 'undefined' ? window : globalThis);
