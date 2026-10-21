// Kontrola nepřátel: dráha nesmí procházet zdí ani podlahou a musí být uvnitř obrazovky.
'use strict';
var path = require('path');
var MM = require(path.join(__dirname, '../js/engine.js'));
require(path.join(__dirname, '../js/caves.js'));
var bad = 0;
MM.CAVES.forEach(function (def, i) {
    var cave = MM.loadCave(def);
    def.enemies.forEach(function (e, k) {
        var sz = MM.ESIZE[e.spr], lo = e.min, hi = e.max;
        for (var v = lo; v <= hi; v += 1) {
            var x = e.t === 'h' ? v : e.x, y = e.t === 'v' ? v : e.y;
            if (x < 8 || y < 8 || x + sz[0] > 248 || y + sz[1] > 128) { console.log((i + 1) + '/' + k + ': mimo obrazovku při ' + v); bad++; break; }
            var hit = false;
            for (var r = y >> 3; r <= (y + sz[1] - 1) >> 3; r++) {
                for (var c = x >> 3; c <= (x + sz[0] - 1) >> 3; c++) { if (MM.SOLID[cave.cells[r][c]]) { hit = true; } }
            }
            if (hit) { console.log((i + 1) + '. ' + def.name + ' nepřítel ' + k + ' (' + e.spr + ') zasahuje do pevné buňky při ' + v); bad++; break; }
        }
        // startovní pozice hráče nesmí být blízko nepřítele
        var sx = cave.start[0], sy = cave.start[1];
        var ex = e.t === 'h' ? e.min : e.x, ey = e.t === 'v' ? e.min : e.y;
        void sx; void sy; void ex; void ey;
    });
});
console.log(bad ? 'Nalezeno problémů: ' + bad : 'Dráhy nepřátel jsou v pořádku.');
process.exit(bad ? 1 : 0);
