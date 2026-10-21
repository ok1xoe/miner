// Bitmapy: hrdina Franta, nepřátelé a dlaždice (X = bod, . = prázdno).
(function (root) {
    'use strict';

    var MM = root.MM = root.MM || {};

    var S = {};

    S.player = [
        [   // stoj / krok 1
            '..XXXX..',
            '.XXXXXX.',
            '.XXXXXXX',
            '..XXXX..',
            '..XXXX..',
            '...XX...',
            '.XXXXXX.',
            'X.XXXX.X',
            'X.XXXX.X',
            '..XXXX..',
            '..XXXX..',
            '..X..X..',
            '..X..X..',
            '..X..X..',
            '.XX..XX.',
            '.XX..XX.'
        ],
        [   // krok 2
            '..XXXX..',
            '.XXXXXX.',
            '.XXXXXXX',
            '..XXXX..',
            '..XXXX..',
            '...XX...',
            '.XXXXXX.',
            '.XXXXXX.',
            '.XXXXXX.',
            '..XXXX..',
            '..XXXX..',
            '..XXXX..',
            '.XX..XX.',
            '.X....X.',
            'XX....XX',
            'XX....XX'
        ],
        [   // skok
            '..XXXX..',
            '.XXXXXX.',
            '.XXXXXXX',
            '..XXXX..',
            '..XXXX..',
            'X..XX..X',
            'XXXXXXXX',
            '..XXXX..',
            '..XXXX..',
            '..XXXX..',
            '..XXXX..',
            '.XX..XX.',
            '.XX..XX.',
            'XX....XX',
            '........',
            '........'
        ]
    ];

    S.slime = [
        ['........', '........', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', 'XXXXXXXX', '.XX..XX.'],
        ['........', '........', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'XXXXXXXX', 'XXXXXXXX', 'XX....XX']
    ];

    S.bat = [
        ['X......X', 'XX.XX.XX', 'XXXXXXXX', '.XXXXXX.', '..XXXX..', '..X..X..', '........', '........'],
        ['........', '..X..X..', '..XXXX..', '.XXXXXX.', 'XX.XX.XX', 'X..XX..X', '........', '........']
    ];

    S.saw = [
        ['...XX...', '..XXXX..', '.XXXXXX.', 'XXX..XXX', 'XXX..XXX', '.XXXXXX.', '..XXXX..', '...XX...'],
        ['X..XX..X', '.XXXXXX.', '..XXXX..', 'XX.XX.XX', 'XX.XX.XX', '..XXXX..', '.XXXXXX.', 'X..XX..X']
    ];

    S.robot = [
        ['..XXXX..', '.XXXXXX.', '.X.XX.X.', '.XXXXXX.', '..XXXX..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X',
            '..XXXX..', '..XXXX..', '..X..X..', '..X..X..', '.XX..XX.', '.XX..XX.', 'XXX..XXX', 'XXX..XXX'],
        ['..XXXX..', '.XXXXXX.', '.X.XX.X.', '.XXXXXX.', '..XXXX..', 'XXXXXXXX', 'X.XXXX.X', 'X.XXXX.X',
            '..XXXX..', '..XXXX..', '.XXXXXX.', '.X....X.', '.X....X.', 'XX....XX', 'XX....XX', 'XX....XX']
    ];

    // dlaždice 8x8
    var T = {};
    T['#'] = ['XXXXXXXX', 'X...X...', 'X...X...', 'XXXXXXXX', '...X...X', '...X...X', 'XXXXXXXX', 'X...X...'];
    T['='] = ['XXXXXXXX', 'XXXXXXXX', 'X.X.X.X.', '.X.X.X.X', 'X.X.X.X.', '.X.X.X.X', 'X.X.X.X.', '.X.X.X.X'];
    T['~'] = ['XXXXXXXX', 'X.XX.XXX', 'XX..XX.X', '.X.XX..X', 'X..X.X..', '.X..X.X.', 'X.X..X..', '..X.X..X'];
    T['^'] = ['........', '........', '........', '..X...X.', '..X...X.', '.XXX.XXX', '.XXX.XXX', 'XXXXXXXX'];
    T['*'] = ['..X..X..', '.XXXXXX.', 'X.XXXX.X', '..XXXX..', '.X.XX.X.', '..XXXX..', '...XX...', '...XX...'];
    T['K'] = ['..XXXX..', '.X....X.', '.X....X.', '..XXXX..', '...XX...', '...XXX..', '...XX...', '...XXX..'];

    // pásy: animované posunem
    function conveyor(dir, frame) {
        var rows = ['XXXXXXXX', 'XXXXXXXX'];
        var base = 'XX..XX..';
        var off = (frame >> 1) & 3;
        function shifted(o) {
            var s = '';
            for (var i = 0; i < 8; i++) { s += base.charAt((i + (dir > 0 ? 8 - o : o) + 8) % 8) === 'X' ? 'X' : '.'; }
            return s;
        }
        rows.push(shifted(off), shifted(off), shifted(off), shifted(off));
        rows.push('XXXXXXXX', 'XXXXXXXX');
        return rows;
    }

    MM.SPR = S;
    MM.TILES = T;
    MM.conveyor = conveyor;
})(typeof window !== 'undefined' ? window : globalThis);
