# inkle-md

Ein Spielbuchformat in Markdown mit ink-Semantik und einer RPG-Schicht im Stil
der Spielbücher der 80er. `SPEC.md` ist die Sprachdefinition und entscheidet;
der Code folgt ihr, nicht umgekehrt. Weicht der Code ab, ist entweder die Spec
zu ändern oder der Code, aber nie stillschweigend nur eines von beidem.

## Arbeiten in diesem Projekt

```bash
node --test 'test/*.test.js'
node src/cli.js lint examples/thornwood.md --strict
node src/cli.js export examples/thornwood-book/book.yaml --out build/play.html
```

- Keine Abhängigkeiten, kein Build-Schritt, Node 20 oder neuer. Was Node nicht
  mitbringt, wird geschrieben statt installiert (siehe `src/yaml.js`).
- Jede Quelldatei trägt den MPL-2.0-Header. Neue Datei, neuer Header.
- Fehler tragen einen Code aus SPEC 10.3, Warnungen einen aus SPEC 11. Ein
  neuer Prüffall braucht einen Code, einen Eintrag in der Spec und einen Test.
- Beide Beispiele müssen `--strict` sauber bleiben; sie sind der Abnahmetest.
- Deutsche Texte mit echten Umlauten, auch in Beispielen und Commit-Nachrichten.

## Abweichungen von den Workspace-Standards

**Keine lokalen CI-Hooks.** Die zentrale local-CI ist auf Xcode ausgelegt:
Stage 1 ist der SwiftLint-Gate, Stage 2 baut und testet über den
simulator-broker. Für ein reines Node-Projekt ohne Xcode-Target gibt es dort
nichts auszuführen, und ein Hook, der nichts prüft, ist schlechter als keiner,
weil er Grün meldet. Das Äquivalent ist `node --test 'test/*.test.js'` plus
`--strict`-Lint auf beiden Beispielen; solange das nicht als Hook läuft, wird
es vor jedem Commit von Hand ausgeführt. Entschieden mit Tobias am 11.08.2026.

**Kein SwiftLint, keine swift-contracts.** Kein Swift im Projekt.

`tokensave` ist eingerichtet und indiziert nach jedem Commit über den globalen
post-commit-Hook.
