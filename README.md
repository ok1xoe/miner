# Horník Franta

Platformovka ve stylu ZX Spectrum (inspirace žánrem „sbírej klíče a uteč portálem“). 11 vlastních jeskyní,
paleta a „attribute clash“ jako na Spectru, vlastní bitmapový font, beeper zvuky přes WebAudio.

**Hrát:** https://ok1xoe.github.io/miner/

## Ovládání
- šipky nebo **A**/**D** – pohyb, **mezerník**, **W** nebo šipka nahoru – skok (pevná délka, nelze řídit ve vzduchu)
- **P** – pauza, **M** – zvuk, na dotykových displejích jsou virtuální tlačítka

## Pravidla
Seber všechny blikající klíče, pak se otevře portál. Hlídej vzduch, drolící se plošiny, pásy, bodce, rostliny
a nepřátele. Pád z výšky 6 políček a víc je smrtelný.

## Vývojářské nástroje (Node)
- `node tools/verify.js [číslo] [--map]` – simulace fyziky, ověří, že jsou všechny klíče a portál dosažitelné skoky
- `node tools/check-enemies.js` – dráhy nepřátel neprocházejí zdí
- `node tools/test-headless.js` – přehraje ověřená řešení přes skutečnou herní smyčku
