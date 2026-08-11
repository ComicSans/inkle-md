# Die Kellertreppe {#stairs}

Die Kellertür liegt im Schatten hinter der großen Treppe. Darunter brennt
Licht, und du hörst etwas, das entweder ein Gesang ist oder eine sehr
geduldige Maschine.

{knows("KELLER-VERBOTEN"): Der Keller, hatte der Butler gesagt, steht niemandem offen.}

* {has("cellar-key")} [Die Kellertür aufschließen](#wine)
* [An der Kellertür lauschen](#listen)
* [Zur Haustür und hinaus](#flight)
+ [Zurück in die Halle](#ground.hall)

# An der Kellertür {#listen}

Der Gesang ist Latein, aber falsches Latein, so wie jemand es spricht, der es
von jemandem gelernt hat, der es auch nicht konnte. Zwischen den Zeilen fällt
dein Name. Dein Herz setzt einen Schlag aus. Dann fällt dir das Abendessen
wieder ein: die Fragen, das aufmerksame Zuhören, das Nicken.

{ visits(listen) == 1 }
  ~ fear = fear + 1
~ remember("MEIN-NAME")

* {has("cellar-key")} [Aufschließen](#wine)
* [Zurück zur Treppe](#stairs)
+ {not knows("BUTLER-ERLEDIGT")} [Es mit der Schulter versuchen](#servant-fight)

# Der Butler kommt {#servant-fight}

Die Tür gibt nicht nach. Dafür gibt die Halle hinter dir jemanden her: den
Butler, mit einer Kerze in der einen und etwas Länglichem in der anderen Hand.

"Sie waren im Keller nicht vorgesehen", sagt er, beinahe bedauernd.

!combat servant
  win  -> butler-down
  flee [Zur Haustür](#flight) Du lässt ihn stehen und die Höflichkeit gleich mit.

# Der Schlüssel {#butler-down}

Am Gürtel des Butlers hängt ein Schlüssel. Du nimmst ihn und versuchst, nicht
auf ihn hinunterzusehen.

~ take("cellar-key")
~ remember("BUTLER-ERLEDIGT")

* [Aufschließen](#wine)

# Der Geheimgang {#passage}

Gemauerte Stufen, abwärts, und Spinnweben in Augenhöhe. Der Gang endet hinter
einem Weinregal, durch das man hindurchsehen kann, wenn man den Kopf schräg
hält, was du erst nach dem dritten Spinnennetz herausfindest.

~ fear = fear + 1

* [Durch das Regal in den Weinkeller](#wine)
* [Zurück hinauf](#ground.hall)

# Der Weinkeller {#wine}

Fässer, Flaschen, ehrlicher Staub. Es ist der erste Raum in diesem Haus, der
genau das ist, was er zu sein vorgibt, und du bist beinahe gerührt.

{ visits(wine) == 1 }
  ~ fear = max(fear - 1, 0)

{knows("SCHLAEFER-ERLEDIGT"): Der Tisch am Durchgang ist jetzt frei.|An einem Tisch beim Durchgang schläft ein Mann in einer Kutte, den Kopf auf den Armen. Neben ihm steht ein Krug, aus dem es nach Würzwein riecht — vor der Andacht wird hier offenbar ausgeschenkt.}

{knows("GEHEIMGANG"): Von dieser Seite ist das Weinregal nur ein Weinregal. Man muss die Lüge kennen, um sie zu sehen.}

Hinter der hinteren Tür: der Gesang.

* {has("phial")} [Das Fläschchen in den Krug leeren](#wine) Du gießt es hinein und verzichtest auf das Umrühren. Wer Gästen solchen Wein vorsetzt, hat es nicht besser verdient.
  ~ drop("phial")
  ~ remember("KRUG-GEWUERZT")
+ [Zur hinteren Tür](#sneak)

# Auf leisen Sohlen {#sneak}

{ knows("SCHLAEFER-ERLEDIGT") }
  Der Weg am leeren Tisch vorbei ist nur noch ein Weg.
  -> rite
{ test("skill") }
  Er schläft weiter, gründlich und mit Hingabe. Ein Profi.
  -> rite
{ else }
  Dein Ellbogen findet die einzige leere Flasche des Kellers. Der Mann fährt
  hoch, sieht dich an und greift nach etwas, das kein Korkenzieher ist.
  -> wine-fight

# Der Kuttenmann {#wine-fight}

!combat cultist
  win  -> wine-loot
  flee [Zurück zwischen die Fässer](#wine) Er setzt dir nicht nach. Er setzt sich wieder.

# Zwischen den Fässern {#wine-loot}

Unter der Kutte trug er einen krummen Dolch, dessen Klinge gewellt ist wie
Wasser, in das jemand einen Stein geworfen hat. Es ist keine Klinge, mit der
man Briefe öffnet.

~ take("kris")
~ equip("kris")
~ remember("SCHLAEFER-ERLEDIGT")

* [Zur hinteren Tür](#rite)

# Der Keller {#rite}

Zwölf Gestalten in Kutten, ein Kreis aus Kreide, in der Mitte ein Stuhl. Der
Gesang bricht nicht ab, als du eintrittst. Niemand dreht sich um. Sie haben
dich erwartet, und zwar genau hier. Deine ANGST steigt.

{knows("BETAEUBT"): Auf der Lehne des Stuhls hängt dein Mantel. Man hat ihn dir abgenommen, während du geschlafen hast, und ordentlich aufgehängt.|Auf der Lehne des Stuhls hängt dein Mantel. Du hattest ihn oben im Zimmer gelassen.}

Vorne steht der Hausherr, als Einziger ohne Kutte. Vermutlich, denkst du,
muss man sich nichts überziehen, wenn man selbst das ist, was gerufen wird.
Es ist ein alberner Gedanke. Er wird gleich sehr viel weniger albern sein.

{knows("MEIN-NAME"): Jetzt sprechen sie deinen Namen deutlicher aus, und einer korrigiert die Aussprache.}

{knows("NIEMAND-WARTET"): Beim Abendessen hattest du erwähnt, dass dich niemand erwartet. Der Hausherr hat es sich offenbar notiert.}

{knows("DER-SPIEGEL"): Das Kruzifix ist wieder warm, diesmal von Anfang an.}

{knows("NUECHTERN"): Der Hausherr sieht zu dir herüber und dann zu dem leeren Stuhl, als wolle er anmerken, dass es einen bequemeren Weg hierher gegeben hätte.}

{knows("KRUG-GEWUERZT"): Elf der zwölf stehen nicht mehr besonders gerade. Einer gähnt mitten im Latein, und der Vorsänger wirft ihm einen Blick zu, der in besseren Häusern eine Kündigung wäre.}

~ fear = fear + 2

* {knows("WAHRER-NAME")} [Den Namen aussprechen, den der Efeu verdeckt](#named)
* {knows("KRUG-GEWUERZT")} [Am Türrahmen lehnen und dem Würzwein Zeit geben](#alone) Nacheinander setzen sich elf Gestalten, erst würdevoll, dann gar nicht mehr.
  ~ fear = max(fear - 2, 0)
* {has("crucifix")} [Das Kruzifix hochhalten](#break) Es wird so heiß, dass du es fast fallen lässt, und der Gesang bricht ab.
* [Den Kreidekreis mit dem Stiefel verwischen](#thing) Zwölf Köpfe drehen sich gleichzeitig, was mehr Eindruck macht als alles bisher.
* [Rückwärts hinausgehen und die Tür schließen](#flight)

# Allein {#alone}

Der Hausherr steht am Ende zwischen elf schnarchenden Kutten, und es ist
schwer zu sagen, wen von euch beiden das mehr verlegen macht.

"Gutes Personal", sagt er, "war hier draußen schon immer das Problem."

* {knows("WAHRER-NAME")} [Den Namen aussprechen](#named)
* [Angreifen](#thing)
* [Rückwärts zur Tür hinaus](#flight)

# Der Name {#named}

Du sprichst ihn aus. Er ist nicht schwer auszusprechen, was das Erstaunlichste
an ihm ist.

Der Gesang bricht ab. Der Hausherr wird sehr still. "Woher", sagt er, und
weiter kommt er nicht. Etwas verlässt ihn — Haltung, Farbe, Größe, in dieser
Reihenfolge. Namen sind Verträge, hast du irgendwo gelesen, vermutlich heute
Nacht. Seiner ist soeben gekündigt worden.

{knows("KRUG-GEWUERZT"): Die Kutten, die noch stehen können, stehen jetzt woanders: näher an der Tür.}

-> break

# Was im Keller wartet {#thing}

{visits(alone) > 0: Der Hausherr lächelt noch, während er aufhört, ein Mann zu sein. Was übrig bleibt, hat in dem Kreidekreis nie gesessen. Es hat ihn gehalten.|Der Kreis ist offen, und was darin gewartet hat, wartet nicht mehr.}

Es ist größer als der Raum, in dem es steht. Dein Verstand weigert sich, das
zu erklären, und du bist ihm dankbar dafür. Deine ANGST steigt.

~ fear = fear + 1

{ knows("HUND-FREUND") }
  Hinter dir kommt etwas die Treppe herunter, vierbeinig und ohne Kette. Der
  Hund stellt sich neben dich und knurrt mit einer Fachkenntnis, die dich
  mehr beruhigt als jedes Gebet.
  ~ fear = max(fear - 2, 0)

!combat thing
  win  -> break
  flee [Die Treppe hinauf](#flight) Hinter dir bleibt es stehen, als hätte es Zeit.

# Der Kreis bricht {#break}

Was auch immer hier über Jahre geduldig zusammengetragen wurde, fällt in sich
zusammen, und zwar buchstäblich: die Kerzen, die Kutten, der Stuhl, das Haus.

Du gehst durch eine Tür, die es zehn Sekunden später nicht mehr gibt.

Draußen ist Morgen. Auf der Straße steht dein Wagen und springt beim ersten
Versuch an, was du für die unglaublichste Begebenheit dieser Nacht hältst.

{knows("HUND-FREUND"): Auf dem Beifahrersitz sitzt bereits der Hund. Es ist streng genommen nicht dein Hund, aber es ist auch streng genommen nicht mehr sein Haus.}

-> END

# Die Haustür {#flight}

Du gehst hinaus, den Kies hinunter, durch das Tor, das offen steht, als wäre
das nie anders gewesen.

{knows("DER-BRUDER"): Hinter dir sagt jemand höflich, man werde deinen Bruder benachrichtigen.}

{knows("HUND-FREUND"): Am Tor schließt sich dir der Hund an, ohne zu fragen, und sieht nicht zurück. Er wirkt wie jemand, der gekündigt hat.}

Zwei Meilen weiter kommt dir ein Milchwagen entgegen. Der Fahrer nimmt dich
mit, sieht dich von der Seite an und fragt nichts. Die {gold} Goldstücke in
deiner Tasche reichen für die Fahrt und für zwei Frühstücke.

Du bist entkommen. Das Haus steht noch, der Keller auch, und beide werden
Gäste haben.

-> END

# Nicht überstanden {#undone}

{ fear >= fear_max }
  Es ist nicht die Kreatur, nicht der Butler und nicht der Hund. Es ist die
  Summe. Dein Herz hat in dieser Nacht mehr gearbeitet als in den Jahren
  davor, und irgendwann arbeitet es nicht mehr.
{ else }
  Du hast in diesem Haus mehr verloren, als sich ersetzen lässt, und
  irgendwann war es genug.

Dein Abenteuer endet hier.

-> END
