# Die Kellertreppe {#stairs}

Die Kellertür liegt im Schatten hinter der großen Treppe. Darunter brennt
Licht, und du hörst etwas, das entweder ein Gesang ist oder eine sehr
geduldige Maschine.

{knows("KELLER-VERBOTEN"): Der Keller, hatte der Butler gesagt, steht niemandem offen.}

* {has("cellar-key")} [Die Kellertür aufschließen](#wine)
+ [An der Kellertür lauschen](#listen)
+ [Zur Haustür und hinaus](#flight)
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
+ [Zurück zur Treppe](#stairs)
+ {not knows("BUTLER-ERLEDIGT")} [Es mit der Schulter versuchen](#servant-fight)

## Der Butler kommt {#servant-fight}

Die Tür gibt nicht nach. Dafür gibt die Halle hinter dir jemanden her: den
Butler, mit einer Kerze in der einen und etwas Länglichem in der anderen Hand.

"Sie waren im Keller nicht vorgesehen", sagt er, beinahe bedauernd.

!combat servant
  win  -> butler-down
  flee [Zur Haustür](#flight) Du lässt ihn stehen und die Höflichkeit gleich mit.

## Der Schlüssel {#butler-down}

Am Gürtel des Butlers hängt ein Schlüssel. Du nimmst ihn und versuchst, nicht
auf ihn hinunterzusehen.

~ take("cellar-key")
~ remember("BUTLER-ERLEDIGT")

* [Aufschließen](#wine)
+ [Nichts wie weg hier, zur Haustür](#flight)

# Der Geheimgang {#passage}

Gemauerte Stufen, abwärts, und Spinnweben in Augenhöhe. Der Gang endet hinter
einem Weinregal, durch das man hindurchsehen kann, wenn man den Kopf schräg
hält, was du erst nach dem dritten Spinnennetz herausfindest.

~ fear = fear + 1

* [Durch das Regal in den Weinkeller](#wine)
* [Zurück hinauf](#ground.hall)

# Der Weinkeller {#wine}

Fässer, Flaschen, ehrlicher Staub. Es ist der erste Raum in diesem Haus, der
genau das ist, was er zu sein vorgibt, und du bist beinahe erleichtert.

{ visits(wine) == 1 }
  ~ fear = max(fear - 1, 0)

{knows("SCHLAEFER-ERLEDIGT"): Der Tisch am Durchgang ist jetzt frei.|An einem Tisch beim Durchgang schläft ein Mann in einer Kutte, den Kopf auf den Armen. Neben ihm steht ein Krug, aus dem es nach Würzwein riecht — vor der Andacht wird hier offenbar ausgeschenkt.}

{knows("GEHEIMGANG"): Von dieser Seite ist das Weinregal nur ein Weinregal. Man muss die Lüge kennen, um sie zu sehen.}

Hinter der hinteren Tür: der Gesang.

* {has("phial")} [Das Fläschchen in den Krug leeren](#wine) Du gießt es hinein und verzichtest auf das Umrühren. Wer Gästen solchen Wein vorsetzt, hat es nicht besser verdient.
  ~ drop("phial")
  ~ remember("KRUG-GEWUERZT")
+ [Zur hinteren Tür](#sneak)

## Auf leisen Sohlen {#sneak}

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

## Der Kuttenmann {#wine-fight}

!combat cultist
  win  -> wine-loot
  flee [Zurück zwischen die Fässer](#wine) Er setzt dir nicht nach. Er setzt sich wieder.

## Zwischen den Fässern {#wine-loot}

Unter der Kutte trug er einen krummen Dolch, dessen Klinge gewellt ist wie
Wasser, in das jemand einen Stein geworfen hat. Es ist keine Klinge, mit der
man Briefe öffnet.

~ take("kris")
~ equip("kris")
~ remember("SCHLAEFER-ERLEDIGT")

* [Zur hinteren Tür](#rite)

# Der Keller {#rite}

{visits(rite) == 1: Zwölf Gestalten in Kutten, ein Kreis aus Kreide, in der Mitte ein Stuhl. Der Gesang bricht nicht ab, als du eintrittst. Niemand dreht sich um. Deine ANGST steigt.|Der Kreis, die Kutten, der Gesang: Alles ist noch da, und alle wissen, dass du wieder da bist.}

{not has("coat") and knows("BETAEUBT"): Auf der Lehne des Stuhls hängt dein Mantel. Man hat ihn dir abgenommen, während du geschlafen hast, und ordentlich aufgehängt.}

{not has("coat") and not knows("BETAEUBT"): Auf der Lehne des Stuhls hängt dein Mantel. Du hattest ihn oben im Zimmer gelassen.}

{visits(rite) == 1: Vorne steht der Hausherr, als Einziger ohne Kutte. Vermutlich, denkst du, muss man sich nichts überziehen, wenn man selbst das ist, was gerufen wird. Es ist ein alberner Gedanke. Er wird gleich sehr viel weniger albern sein.}

{visits(rite) == 1 and knows("MEIN-NAME"): Jetzt sprechen sie deinen Namen deutlicher aus, und einer korrigiert die Aussprache.}

{visits(rite) == 1 and knows("NIEMAND-WARTET"): Beim Abendessen hattest du erwähnt, dass dich niemand erwartet. Der Hausherr hat es sich offenbar notiert.}

{visits(rite) == 1 and knows("DER-SPIEGEL"): Das Kruzifix ist wieder warm, glüht fast in deiner Tasche.}

{visits(rite) == 1 and knows("NUECHTERN"): Der Hausherr sieht zu dir herüber und dann zu dem leeren Stuhl, als wolle er anmerken, dass es einen bequemeren Weg hierher gegeben hätte.}

{visits(rite) == 1 and knows("KRUG-GEWUERZT"): Elf der zwölf stehen nicht mehr besonders gerade. Einer gähnt mitten im Latein, und der Vorsänger wirft ihm einen Blick zu, der in besseren Häusern eine Kündigung wäre.}

{turns() > 60: Der Gesang ist schneller, als er vorhin an der Tür geklungen hat. Was immer hier fertig werden soll: Es ist fast so weit.}

{ visits(rite) == 1 }
  ~ fear = fear + 2

* [Dir zuerst deinen Mantel vom Stuhl holen](#rite) Du gehst hinein, mitten hinein, nimmst den Mantel von der Lehne und ziehst ihn an. Keine der Kutten rührt sich. Niemand hält dich auf. Das ist das Unheimlichste, was dieses Haus dir bisher angetan hat.
  ~ take("coat")
  ~ equip("coat")
  ~ fear = fear + 1
* {knows("WAHRER-NAME")} [Den Namen aussprechen, den der Efeu verdeckt](#named)
* {knows("KRUG-GEWUERZT")} [Am Türrahmen lehnen und dem Würzwein Zeit geben](#alone) Nacheinander setzen sich elf Gestalten, erst würdevoll, dann schnell.
  ~ arrival.calm(2)
* {has("crucifix")} [Das Kruzifix hochhalten](#break) Es wird so heiß, dass du es fast fallen lässt, und der Gesang bricht ab.
* {knows("KRUG-GEWUERZT")} [Den Kreidekreis verwischen, solange die Kutten schwanken](#thing) Die, die dich aufhalten wollen, müssten dazu erst aufstehen. Sie versuchen es. Es sieht aus wie eine schlechte Turnstunde.
* {not knows("KRUG-GEWUERZT")} [Den Kreidekreis mit dem Stiefel verwischen](#guards) Zwölf Köpfe drehen sich gleichzeitig, was mehr Eindruck macht als alles bisher.
* [Rückwärts hinausgehen und die Tür schließen](#flight)

## Die Wächter {#guards}

Zwei Kutten lösen sich aus dem Kreis und stellen sich dir in den Weg, mit der
Entschlossenheit von Leuten, die wissen, dass hinter ihnen etwas Größeres
steht. Es steht wirklich etwas Größeres hinter ihnen.

!combat cultist, cultist
  win  -> thing
  flee [Zurück zur Tür](#flight) Du gibst den Kreis auf. Der Kreis lässt dich gehen. Das macht es nicht besser.

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

~ forget("WAHRER-NAME")

Du versuchst, den Namen noch einmal zu denken. Er ist fort. Verbraucht wie
ein Streichholz.

{knows("KRUG-GEWUERZT"): Die Kutten, die noch stehen können, wanken zur Tür.}

-> break

# Was im Keller wartet {#thing}

{visits(alone) > 0: Der Hausherr lächelt noch, während er aufhört, ein Mann zu sein. Was übrig bleibt, hat in dem Kreidekreis nie gesessen. Es hat ihn gehalten.|Der Kreis ist offen, und was darin gewartet hat, ist da.}

Es ist größer als der Raum, in dem es steht. Dein Verstand weigert sich, das
zu erklären, und du bist ihm dankbar dafür. Deine ANGST steigt.

{equipped("kris"): Der krumme Dolch wird warm in deiner Hand, als erkenne er ein altes Familienmitglied wieder. Du beschließt, ihm das nicht übelzunehmen.}

~ fear = fear + 1

{ knows("HUND-FREUND") }
  Hinter dir kommt etwas die Treppe herunter, vierbeinig und ohne Kette. Der
  Hund stellt sich neben dich und knurrt mit einer Fachkenntnis, die dich
  mehr beruhigt als jedes Gebet.
  ~ fear = max(fear - 2, 0)

!combat thing
  win  -> break
  lose -> jar
  flee [Die Treppe hinauf](#flight) Hinter dir bleibt es stehen, als hätte es Zeit.

## Das zwölfte Glas {#jar}

Es ist schneller, als etwas dieser Größe sein dürfte. Der Boden kommt dir
entgegen, die Kerzen wandern an die Decke, und dein letzter Gedanke ist von
entwaffnender Klarheit: In der Speisekammer oben steht ein leeres Glas mit
einem frischen Etikett, und jemand wird deinen Namen sehr sauber darauf
schreiben.

Dein Abenteuer endet hier.

-> END

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

{knows("HUND-FREUND"): Am Tor schließt sich dir der Hund an, ohne zu fragen, und sieht ebenfalls nicht zurück.}

{uses("brandy") > 0: Im Flachmann schwappt noch ein Rest. Du hebst ihn im Gehen dem Haus entgegen und trinkst keinen Schluck davon. Nicht aus diesem Anlass.}

Zwei Meilen weiter kommt dir ein Milchwagen entgegen. Der Fahrer nimmt dich
mit, sieht dich von der Seite an und fragt nichts. 

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
