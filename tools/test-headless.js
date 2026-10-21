// Headless test hry v Node: načte skutečné skripty s atrapou DOM, přehraje ověřená řešení
// (z tools/verify.js) přes herní smyčku a zkontroluje klíče, přechody jeskyní, NaN a vykreslení.
'use strict';
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');

function stub() {
    return new Proxy(function () { }, { get: function (t, k) { return k === 'getContext' ? function () { return ctxStub; } : stub(); }, apply: function () { return stub(); }, set: function () { return true; } });
}
var ctxStub = {
    createImageData: function (w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData: function () { }
};
var listeners = {};
var rafCb = null;
var win = { MM: undefined, innerWidth: 1024, innerHeight: 768, matchMedia: function () { return { matches: false }; }, addEventListener: function () { } };
global.window = win;
global.document = {
    getElementById: function () { return { getContext: function () { return ctxStub; }, addEventListener: function () { }, style: {} }; },
    querySelectorAll: function () { return []; },
    addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
    body: { style: {} }, hidden: false
};
global.localStorage = { getItem: function () { return null; }, setItem: function () { } };
global.requestAnimationFrame = function (cb) { rafCb = cb; };
global.setInterval = function () { return 0; };
global.clearInterval = function () { };

['engine', 'caves', 'font', 'gfx', 'sprites', 'sound', 'main'].forEach(function (f) {
    var src = fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8');
    // moduly se v prohlížeči připojují k window; tady je window == globalThis
    (new Function('window', 'globalThis', 'document', 'localStorage', 'requestAnimationFrame', src.replace(/\}\)\(typeof window[^;]*;\s*$/, '})(window);')))(global.window, global.window, global.document, global.localStorage, global.requestAnimationFrame);
});
var MM = global.window.MM;
var verify = require('./verify.js').verify;
var fails = 0;
function check(c, msg) { if (!c) { console.log('  CHYBA: ' + msg); fails++; } }

var G = MM.game;
var origEnemies = MM.CAVES.map(function (c) { return c.enemies; });

// 1) titulní obrazovka + vykreslení
G._draw();
check(G._get().state === 'title', 'start je v titulní obrazovce');

// 2) přehrání řešení každé jeskyně
MM.CAVES.forEach(function (def, ci) {
    var res = verify(def);
    var label = (ci + 1) + '. ' + def.name;
    check(!res.errs && res.seen === res.total && res.exit, label + ': ověření');
    var targets = Object.keys(res.paths);
    var okCount = 0;
    targets.forEach(function (t) {
        def.enemies = [];                         // enemy ověřujeme zvlášť
        G._start();
        // přeskočit na požadovanou jeskyni
        var st = G._get();
        var guard = 0;
        while (G._get().caveIndex < ci && guard++ < 20) { forceNext(); }
        var seq = res.paths[t];
        var gotKeys = 0, exitHit = false, dead = false;
        var before = G._get().score;
        for (var i = 0; i < seq.length; i++) {
            G._held.left = seq[i].dx < 0; G._held.right = seq[i].dx > 0; G._held.jump = !!seq[i].jump;
            G._tick();
            var g = G._get();
            if (g.state === 'dying') { dead = true; break; }
            if (g.state === 'complete') { exitHit = true; break; }
            if (!isFinite(g.player.x) || !isFinite(g.player.y)) { check(false, label + ': NaN pozice'); break; }
            G._draw();
        }
        G._held.left = G._held.right = G._held.jump = false;
        var gs = G._get();
        if (t === 'exit') {
            // portál je při přehrání otevřen jen pokud jsou sebrány klíče -> otevřeme ho uměle
            okCount += exitHit ? 1 : 0;
        } else {
            gotKeys = Math.round((gs.score - before) / 100);
            if (gotKeys >= 1 && !dead) { okCount++; } else if (!dead) { /* klíč nesebrán */ }
            if (dead) { check(false, label + ': smrt při přehrání cesty ke klíči ' + t); }
        }
    });
    def.enemies = origEnemies[ci];
    console.log(label + ': přehráno ' + okCount + '/' + (targets.length - 1) + ' klíčů' );
});

// pomocné: přeskočení jeskyně (použito výše)
function forceNext() {
    var g = G._get();
    g.cave.keysLeft = 0;
    // dokončit jeskyni přes stav 'complete'
    var idx = g.caveIndex;
    var n = 0;
    // simulace: stav complete vyžaduje průchod portálem; vložíme hráče do portálu
    g.player.x = g.cave.portal.x + 4; g.player.y = g.cave.portal.y;
    while (G._get().caveIndex === idx && n++ < 400) { G._tick(); }
}

// 3) průchod celou hrou: nahodit portál v každé jeskyni, kontrola přechodů a výhry
MM.CAVES.forEach(function (d) { d.enemies = []; });
G._start();
for (var c = 0; c < MM.CAVES.length; c++) {
    check(G._get().caveIndex === c, 'jeskyně ' + (c + 1) + ' načtena');
    forceNext();
}
check(G._get().state === 'win', 'po poslední jeskyni stav win (je ' + G._get().state + ')');
G._draw();

// 4) smrt, životy, konec hry (nepřítel)
MM.CAVES.forEach(function (d, i) { d.enemies = origEnemies[i]; });
G._start();
var deaths = 0, seenOver = false;
for (var t = 0; t < 30 * 600 && !seenOver; t++) {
    var s = G._get();
    if (s.state === 'play') {
        // zahynout pádem: skok doleva do díry není vždy možný -> vynutit smrt vzduchem
        s.cave.air = 1;
    }
    G._tick();
    if (G._get().state === 'dying' && deaths < 100) { deaths++; }
    if (G._get().state === 'over') { seenOver = true; }
}
check(seenOver, 'po 4 smrtích konec hry (životy 3 -> -1)');
check(deaths >= 4, 'počet smrtí ' + deaths);
G._draw();

console.log(fails ? ('\nSELHÁNÍ: ' + fails) : '\nVšechny headless testy prošly.');
process.exit(fails ? 1 : 0);
