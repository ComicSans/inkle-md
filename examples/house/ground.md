# Die Halle bei Nacht {#hall}

Die Halle ist größer, wenn niemand darin auf dich wartet. Die Standuhr an der
Wand schlägt einmal, obwohl ihr Zifferblatt drei Uhr behauptet. Vielleicht
zählt sie etwas anderes als Stunden.

{ visits(hall) == 1 }
  ~ fear = fear + 1

* [Die Standuhr genauer ansehen](#clock)
* [Ins Speisezimmer](#dining)
* [In die Küche](#kitchen)
* [In das Arbeitszimmer](#study)
+ [Zur Kellertür](#cellar.stairs)

# Die Standuhr {#clock}

Das Pendel schwingt, aber falsch: links oben zögert es jedes Mal einen
Moment, wie ein Mann, der beim Lügen Luft holt. Hinter dem Uhrenkasten zieht
es.

* [Den Kasten öffnen]() Kein Uhrwerk. Eine Treppe, abwärts, gemauert für Leute, die es eilig haben und dabei nicht gesehen werden wollen.
  ~ remember("GEHEIMGANG")
  ~ fear = fear + 1
  * [Hinabsteigen](#cellar.passage)
  * [Den Kasten schließen und so tun, als wäre er eine Uhr](#hall)
+ [Sie Uhr sein lassen](#hall)
---
-> hall

# Das Speisezimmer {#dining}

Abgeräumt bis auf zwei Gläser: deins und seins. Seins ist unberührt. Auf der
Anrichte steht die Karaffe, daneben ein Fläschchen ohne Etikett, das die
Frage nach dem Wein hinreichend beantwortet.

{knows("NUECHTERN"): Die Aspidistra in der Ecke lässt die Blätter hängen. Du fühlst dich ein wenig schuldig, aber nur ihr gegenüber.}

{ visits(dining) == 1 }
  ~ fear = fear + 1

* [Das Fläschchen einstecken](#dining) Du steckst es ein. Für wen auch immer.
  ~ take("phial")
+ [Zurück in die Halle](#hall)

# Die Küche {#kitchen}

Kupferpfannen, ein kalter Herd, und an den Haken hängen Dinge, die man in
Küchen erwartet. Die Erleichterung darüber ist beträchtlich, und du denkst
kurz darüber nach, wie niedrig die Messlatte inzwischen hängt.

In der Speisekammer: eine kalte Pastete, tadellos, und ein Regal mit zwölf
Einmachgläsern, sorgfältig beschriftet. Mit Vornamen.

{ visits(kitchen) == 1 }
  ~ fear = fear + 1

* [Die Pastete einpacken](#kitchen) Sie riecht nach Wild. Du beschließt, das zu glauben.
  ~ take("pie")
* [Die Gläser genauer ansehen](#kitchen) Eingelegtes, in Essig. Es sieht aus wie Gemüse, und du wiederholst das Wort Gemüse innerlich so lange, bis es hält. Das elfte Glas ist leer und trägt noch keinen Namen, nur ein frisches Etikett.
  ~ fear = fear + 2
+ [Zurück in die Halle](#hall)

# Das Arbeitszimmer {#study}

Ein Schreibtisch mit grüner Lampe, dahinter Regale voller Bücher über
Landwirtschaft, die genauso gemalt aussehen wie die in der Bibliothek. Auf
dem Tisch liegt ein Tagebuch mit einer Messingschließe, daneben ein silberner
Brieföffner.

* [Das Tagebuch öffnen]()
  { test("luck") }
    Buchhaltung: Lieferungen, Löhne, Gäste. Die Gäste sind einzeln
    aufgeführt, mit Ankunftsdatum. Die Spalte für die Abreise ist leer,
    seitenweise. Auf dem Vorsatzblatt steht ein Name, der nicht der ist,
    unter dem sich der Hausherr vorgestellt hat — und es ist derselbe, den
    der Efeu am Torbogen verdeckt.
    ~ remember("WAHRER-NAME")
    ~ fear = fear + 1
  { else }
    Die Schließe schnappt dir aus der Hand und läutet dabei irgendwo tief im
    Haus eine kleine Glocke. Kleine Glocken rufen in solchen Häusern kein
    kleines Personal.
    ~ fear = fear + 1
    -> caught
* [Den Brieföffner nehmen](#study) {has("dagger"): Neben dem Silberdolch in deinem Stiefel wirkt er fast verwandt. Man fragt sich, wogegen in diesem Haus die Post verteidigt werden muss.|Er ist schwerer, als ein Brieföffner sein müsste, und schärfer, als die Post es verlangt.}
  ~ take("dagger")
  ~ equip("dagger")
+ [Zurück in die Halle](#hall)
---
Mehr gibt dieses Zimmer nicht her, und du bist nicht sicher, ob du ihm das
glauben sollst.

-> hall

# Ertappt {#caught}

Der Butler steht in der Tür, mit einem Leuchter in der einen und etwas
Länglichem in der anderen Hand. "Das Arbeitszimmer", sagt er, "gehört zu den
Räumen, die dem Herrn besonders am Herzen liegen."

!combat servant
  win  -> caught-won
  flee [Hinaus und die Tür hinter dir zuschlagen](#hall) Du lässt ihn stehen und die Höflichkeit gleich mit.

# Der Schlüsselbund {#caught-won}

An seinem Gürtel hängt ein Schlüsselbund. Einer der Schlüssel trägt ein
Papierschild: "Keller". Du nimmst ihn und versuchst dabei, nicht auf den
Butler hinunterzusehen.

~ take("cellar-key")
~ remember("BUTLER-ERLEDIGT")

* [Zurück in die Halle](#hall)
