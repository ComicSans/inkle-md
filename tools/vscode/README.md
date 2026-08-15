<!-- This Source Code Form is subject to the terms of the Mozilla Public
     License, v. 2.0. If a copy of the MPL was not distributed with this
     file, You can obtain one at https://mozilla.org/MPL/2.0/.

     Copyright 2026 Tobias Reithmeier -->

# Story Weaver für VS Code

Ein Panel neben dem Text: links das Buch, rechts der Knoten, in dem der Cursor
steht, und auf Knopfdruck das Buch, ab genau diesem Knoten gespielt.

## Was das Panel zeigt

**Struktur** ist, was der Übersetzer über den Knoten weiß: Titel, Kennung,
Fundstelle, jeder Weg weiter mit seinem Ziel, und die Warnungen, die in diesem
Knoten stehen. Nichts davon wird ausgewertet - eine Alternative hat noch keinen
Zug, ein `{...}` noch keinen Wert, eine Bedingung noch keinen Zustand. Dafür
gibt es die Ansicht für jeden Knoten, auch für die, die noch kein Durchlauf
erreicht.

**Spielen** ist das Buch selbst, mit derselben Laufzeit und derselben Ansicht,
die auch der HTML-Export mitgibt. Was hier steht, liest ein Leser genauso.
Gespielt wird ab dem Knoten, in dem der Cursor steht; die Eröffnungswahl aus
SPEC 7.2 findet trotzdem statt, sonst stünde die Heldin ohne Gepäck und mit
leeren Werten da. Der Probelauf schreibt nichts weg: er fängt dort an, wo
gerade geschrieben wird, nicht dort, wo zuletzt gelesen wurde.

Solange gespielt wird, folgt die Quelle dem Spiel und springt zum Absatz der
gerade gelesenen Seite - ohne den Fokus zu nehmen.

## Befehle

| Befehl | Wirkung |
| --- | --- |
| `Story Weaver: Knoten zeigen` | Panel öffnen, Struktur des Knotens unter dem Cursor |
| `Story Weaver: Ab hier probespielen` | Panel öffnen und ab diesem Knoten spielen (`cmd+alt+p`) |
| `Story Weaver: Von vorn probespielen` | Ab dem Startknoten des Buchs spielen |

## Einstellungen

- `storyWeaver.follow` - das Panel folgt dem Cursor. Aus bleibt es stehen.
- `storyWeaver.host` - Host-Werte für den Probelauf, `schlüssel=wert`, mit
  Komma getrennt, dieselbe Schreibweise wie `story-weaver play --host`. Ohne
  sie spielt ein Buch, das die Uhr oder einen Zähler liest, gegen seine
  Ersatzwerte; `nightside` und `leuchtturm` brauchen sie.
- `storyWeaver.language` - die Sprache des Probelaufs, leer heißt die
  Standardsprache des Buchs.

## Was übersetzt wird

Das Buch zu der Datei im Editor: die nächstliegende `book.yaml` über ihr, und
wenn es keine gibt, die Datei selbst. Gelesen wird, was im Editor steht, nicht
was auf der Platte liegt - ungespeichert zählt auch. Bilder bleiben die
Ausnahme: sie werden auf der Platte gesucht, weil sie dort liegen müssen
(SPEC 4.9).

Was gerade nicht übersetzt, lässt den letzten Stand stehen, der es tat, mit dem
Fehler darüber. Beim Tippen ist eine Datei die meiste Zeit ungültig, und ein
leeres Panel hilft niemandem.

## Starten

Zum Ausprobieren und Weiterbauen: `tools/vscode` in VS Code öffnen und F5
drücken. Das startet einen zweiten VS Code mit der Erweiterung und diesem
Projekt darin.

Für den täglichen Gebrauch wird ein Paket gebaut und installiert:

```bash
node tools/vscode/pack.mjs
code --install-extension build/tobiasreithmeier.story-weaver-0.1.0.vsix
```

`pack.mjs` schreibt den Pfad und die passende Installationszeile ins Terminal.
Fehlt `code` im PATH, hilft einmal *Shell Command: Install 'code' command in
PATH* aus der Befehlspalette, oder die Binärdatei im App-Bündel unter
`/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code`.

Danach das Fenster neu laden (*Developer: Reload Window*). Einen Ordner nach
`~/.vscode/extensions` zu kopieren oder zu verlinken genügt seit VS Code 1.74
nicht mehr: geladen wird nur, was über das CLI oder die Oberfläche installiert
wurde, und ein Symlink dort bleibt stumm liegen.

`pack.mjs` braucht nichts Installiertes - eine .vsix ist ein Zip mit einem
Manifest, und `zip` bringt macOS mit. `vsce` kommt nicht vor, und das Projekt
bleibt ohne Abhängigkeiten.

Übersetzer, Laufzeit und Ansicht reisen als `vendor/src` im Paket mit, weil
eine installierte Erweiterung nicht ins Projekt greifen kann. Liegt über der
Erweiterung ein Checkout - also beim Arbeiten in diesem Repository -, gewinnt
dessen `src/`: eine Änderung dort wirkt sofort im Panel, ohne neu zu packen.

## Was getestet wird

`test/vscode.test.js` im Testlauf des Projekts prüft, was ein laufender Editor
nicht beantworten kann und was still falsch wäre: in welchem Knoten eine
Cursorzeile liegt, zu welchem Buch eine Datei gehört, und dass der Übersetzer
den Puffer nimmt statt der Datei. `extension.js` bleibt der dünne Anschluss an
VS Code und wird von Hand geprüft; alles, was ohne `vscode` auskommt, steht in
`book.mjs`.
