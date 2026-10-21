// Ověření jeskyní: simulace fyziky hry (BFS přes pozice, na kterých hráč stojí).
// Použití: node tools/verify.js [číslo jeskyně] [--map]
'use strict';
var path = require('path');
var MM = require(path.join(__dirname, '../js/engine.js'));
require(path.join(__dirname, '../js/caves.js'));

function checkShape(def) {
    var errs = [];
    if (def.rows.length !== 16) { errs.push('řádků ' + def.rows.length + ' místo 16'); }
    def.rows.forEach(function (r, i) { if (r.length !== 32) { errs.push('řádek ' + i + ' má délku ' + r.length); } });
    var at = 0, keys = 0, e = [];
    def.rows.forEach(function (r, y) {
        for (var x = 0; x < r.length; x++) {
            if (r[x] === '@') { at++; }
            if (r[x] === 'K') { keys++; }
            if (r[x] === 'E') { e.push([x, y]); }
        }
    });
    if (at !== 1) { errs.push('počet startů ' + at); }
    if (keys < 1) { errs.push('žádné klíče'); }
    if (e.length !== 4) { errs.push('portál musí mít 4 buňky (2x2), má ' + e.length); }
    return errs;
}

function clone(p) { return JSON.parse(JSON.stringify(p)); }

function verify(def) {
    var errs = checkShape(def);
    if (errs.length) { return { errs: errs }; }
    var cave = MM.loadCave(def);
    var total = cave.keys;
    var keysSeen = {}, exitSeen = false;
    var nodes = {}, queue = [];
    var paths = {};     // klíč "r,c" / "exit" -> posloupnost vstupů po tickách od startu

    function key(n) { return n.x + ',' + n.y; }
    function pathTo(n) {
        var segs = [];
        while (n && n.edge) { segs.push(n.edge); n = nodes[n.parent]; }
        var out = [];
        for (var i = segs.length - 1; i >= 0; i--) { out = out.concat(segs[i]); }
        return out;
    }

    // provede jeden tick; inputs = dosavadní vstupy hrany
    function tickEdge(from, p, inp, inputs, opt) {
        inputs.push(inp);
        var ev = MM.step(cave, p, inp, opt || { dry: true });
        ev.keys.forEach(function (k) {
            if (!keysSeen[k]) { keysSeen[k] = true; paths[k] = pathTo(from).concat(inputs); }
        });
        if (ev.exit && !exitSeen) { exitSeen = true; paths.exit = pathTo(from).concat(inputs); }
        return ev;
    }
    function add(p, from, inputs) {
        var k = p.x + ',' + p.y;
        if (!nodes[k]) {
            nodes[k] = { x: p.x, y: p.y, parent: from ? key(from) : null, edge: from ? inputs.slice() : null };
            queue.push(nodes[k]);
        }
    }
    function settle(from, p, inputs) {
        var n = 0;
        while (p.mode !== 'ground' && !p.dead && n++ < 400) { tickEdge(from, p, { dx: 0 }, inputs); }
        return !p.dead && p.mode === 'ground';
    }
    function mk(n) { var p = MM.newPlayer(cave); p.x = n.x; p.y = n.y; return p; }

    var s = MM.newPlayer(cave);
    var root = { x: s.x, y: s.y, parent: null, edge: null };
    var startInputs = [];
    if (!settle(root, s, startInputs)) { return { errs: ['start nestojí na pevné zemi / zahyne'] }; }
    nodes[s.x + ',' + s.y] = { x: s.x, y: s.y, parent: null, edge: startInputs };
    queue.push(nodes[s.x + ',' + s.y]);

    for (var qi = 0; qi < queue.length; qi++) {
        var n = queue[qi], i, p, inputs;
        for (i = -1; i <= 1; i++) {
            p = mk(n); inputs = [];
            tickEdge(n, p, { dx: i }, inputs);
            if (p.dead) { continue; }
            if (p.mode === 'ground' || settle(n, p, inputs)) { add(p, n, inputs); }
        }
        for (i = -1; i <= 1; i++) {
            p = mk(n); inputs = [];
            tickEdge(n, p, { dx: i, jump: true }, inputs);
            if (p.dead) { continue; }
            var guard = 0;
            while (p.mode !== 'ground' && !p.dead && guard++ < 400) { tickEdge(n, p, { dx: i }, inputs); }
            if (!p.dead && p.mode === 'ground') { add(p, n, inputs); }
        }
    }
    return { total: total, seen: Object.keys(keysSeen).length, exit: exitSeen, nodes: nodes, keysSeen: keysSeen, paths: paths, def: def };
}

function printMap(res) {
    var def = res.def;
    var rows = def.rows.map(function (r) { return r.split(''); });
    Object.keys(res.nodes).forEach(function (k) {
        var n = res.nodes[k];
        var r = n.y >> 3, c = (n.x + 4) >> 3;
        if (rows[r] && rows[r][c] === ' ') { rows[r][c] = 'o'; }
    });
    def.rows.forEach(function (row, r) {
        for (var c = 0; c < 32; c++) { if (row[c] === 'K' && res.keysSeen[r + ',' + c]) { rows[r][c] = 'k'; } }
    });
    console.log(rows.map(function (r, i) { return (i < 10 ? ' ' : '') + i + ' ' + r.join(''); }).join('\n'));
}

if (require.main === module) {
    var arg = process.argv[2];
    var showMap = process.argv.indexOf('--map') !== -1;
    var bad = 0;
    MM.CAVES.forEach(function (def, i) {
        if (arg && arg !== '--map' && parseInt(arg, 10) !== i + 1) { return; }
        var r = verify(def);
        if (r.errs) { console.log((i + 1) + '. ' + def.name + ': CHYBA TVARU – ' + r.errs.join('; ')); bad++; return; }
        var ok = r.seen === r.total && r.exit;
        if (!ok) { bad++; }
        console.log((i + 1) + '. ' + def.name + ': klíče ' + r.seen + '/' + r.total + ', portál ' + (r.exit ? 'ano' : 'NE') + ', stavů ' + Object.keys(r.nodes).length + (ok ? '  OK' : '  SELHÁNÍ'));
        if (showMap || (!ok && arg)) { printMap(r); }
    });
    process.exit(bad ? 1 : 0);
}

module.exports = { verify: verify, checkShape: checkShape };
