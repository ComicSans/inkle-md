# Auf der Sandbank {#ankunft}

~ im_keller = 0

{!Das Boot dreht ab, kaum dass dein Seesack im Sand liegt. "Morgen früh",
kommt es vom Ruder herüber, "wenn die See uns lässt." Dann ist nur noch
der Motor zu hören, und dann auch der nicht mehr.|Die Bank, kaum größer
als ein Hof. In der Mitte der Turm. Ringsum arbeitet die See.}

![Ein gedrungener Leuchtturm auf einer Sandbank, das Wasser bis an die Tür.](turm.png)

{sturm: Der Sturm ist da. Die Brandung nimmt die Bank in Handbreiten, und
die Gischt steht bis ans Mauerwerk.|Im Westen liegt eine Wolkenbank, die
nicht liegen bleibt. Wer hier arbeitet, arbeitet gegen sie.}

{licht: Über dir läuft der Strahl seine Runden. Was diese Nacht zu tun
war, ist getan.|Oben ist die Laterne dunkel, und sie ist der ganze
Auftrag: Vor dem Sturm muss sie brennen.}

+ [In die Wachstube treten](#stube)
  ~ zeit += 5
+ [Durch die Tür und die Treppe hinauf, in einem Zug](#laterne)
  {dunkel: Das Treppenhaus ist schwarz. Du steigst am Geländer, Stufe um
  Stufe, und zählst die Absätze.|Sechsundachtzig Stufen. Du zählst sie
  nicht, du steigst.}
  ~ zeit += 15 + dunkel * 10
+ [Am Anleger nach dem Boot sehen](#anleger)
  ~ zeit += 5

# Die Wachstube {#stube}

~ im_keller = 0

Ein Tisch, eine Koje, ein Fenster zur Wetterseite. Im Dienstbuch auf dem
Tisch endet der letzte Eintrag vor drei Wochen, mitten im Satz.

{sturm: Das Fenster liegt voll Gischt. Zwischen zwei Böen hörst du den
Turm, wie er im Mauerwerk mit sich selbst spricht.|Durch das Fenster: die
Wolkenbank im Westen, näher als eben.}

{licht: Durch die Ritzen der Deckenluke wandert alle paar Sekunden ein
Schein. Die Lampe tut ihre Arbeit; deine ist damit getan.}

+ [Die Treppe hinauf zur Laterne](#laterne)
  {dunkel: Am Geländer hinauf, eine Stufe nach der anderen. Eile wäre
  hier ein Fehler mit Kanten.}
  ~ zeit += 10 + dunkel * 10
+ [Hinunter in den Keller](#keller)
  {dunkel: Die Kellerstufen im Dunkeln, rückwärts wie auf einer Leiter.}
  ~ zeit += 5 + dunkel * 5
+ [Hinaus auf die Bank](#ankunft)
  ~ zeit += 5
+ {sturm} [Nach den Vorräten sehen, ehe die See sie holt](#keller)
  ~ zeit += 5 + dunkel * 5
+ {knows("KUTTER")} [Sich hinsetzen und auf den Tag warten](#strandung)
* {dunkel} [Die Stufen im Finstern nehmen, zwei auf einmal](#sturz)
  ~ zeit += 5
+ {licht and not knows("KUTTER")} [In der Koje den Morgen abwarten](#morgen)

# Die Laterne {#laterne}

~ im_keller = 0

{licht: Die Lampe brennt. Der Strahl geht hinaus über die See und kommt
im Takt zurück, und das Rundglas gibt Wärme in den Raum.|Die Lampe ist
kalt. Das Rundglas ist von innen beschlagen, und unter dem Brenner riecht
es nach altem Öl.}

{sturm: Die Scheiben stehen voll Wasser, und bei jeder Bö geht ein
Zittern durch das Gestänge.|Von hier oben ist die Wolkenbank im Westen
ein Deckel, der sich langsam über die See schiebt.}

{has("rohr"): Das Ersatzrohr lehnt am Gestell. Das alte Rohr ist heil;
den Weg herauf hat es umsonst gemacht.}
{has("fass"): Das Ölfass steht auf dem Podest. Der Tank ist nicht das
Problem.}
{has("feile"): Die Feile liegt auf dem Sims. Hier klemmt nichts; hier
fehlt etwas.}

+ [Die Treppe hinunter zur Stube](#stube)
  {dunkel: Hinab dauert im Dunkeln so lang wie hinauf, wenn man ankommen
  will.}
  ~ zeit += 10 + dunkel * 10
* {not licht} [Die Wartungsluke öffnen und nachsehen](#befund)
  ~ zeit += 10
+ [Über die Galerie zur Außentreppe](#leiter)
  ~ zeit += 5
* {not licht and has("docht") and has("band")} [Docht setzen, Leitung dichten](#reparatur)
  ~ zeit += 20
+ {knows("GERICHTET") and not licht} [Die Lampe anzünden](#brennt)
  ~ zeit += 5
+ {licht and not knows("KUTTER")} [Neben der Lampe den Morgen abwarten](#morgen)

# Der Befund {#befund}

~ remember("SCHADEN")

Du öffnest die Wartungsluke und leuchtest hinein. Es ist zweierlei, und
beides ist klein: Der Docht ist bis auf den Halter heruntergebrannt, und
das Dichtband an der Ölleitung ist mürbe; die Pumpe zieht Luft statt Öl.
Das Rohr selbst ist heil. Im Tank steht Öl für zwei Nächte.

Docht und Dichtband. Beides hängt unten im Keller am Haken neben der
Werkbank, und beides passt in eine Hand.

+ [Hinunter zu den Vorräten](#keller)
  {dunkel: Die ganze Treppe hinab, am Geländer, mit Zeit für jede Stufe.}
  ~ zeit += 15 + dunkel * 10
+ [Zurück ans Leuchtwerk](#laterne)
  ~ zeit += 5

# Der Keller {#keller}

~ im_keller = 1

Der Keller liegt tiefer als die Bank draußen: die Werkbank, die Regale,
der Ölvorrat. An der Wand der Haken mit den Beuteln voll Kleinzeug, die
Aufschriften halb vom Salz gefressen.

{ wasser >= 3 }
  Das Wasser steht über den unteren Stufen und steigt, ohne sich zu
  beeilen. Es hat die See hinter sich.
{ wasser > 0 }
  Zwischen den Bodenplatten glänzt es. Die See hat einen Fuß in der Tür.
{ else }
  Trocken. Noch hält der Sand unter den Platten dicht.

+ [Die Treppe hinauf, weiter bis zur Laterne](#laterne)
  {dunkel: Der ganze Turm im Dunkeln, Stufe um Stufe, die Hand am
  Geländer.}
  ~ zeit += 15 + dunkel * 15
+ {not knows("SCHADEN")} [In den Regalen nach der Ursache suchen](#regale)
  ~ zeit += 10
* {knows("SCHADEN")} [Docht und Dichtband vom Haken nehmen](#keller)
  {has("rohr") or has("fass") or has("feile"): Erst wuchtest du zurück
  ins Regal, was du auf Verdacht gegriffen hast; dann erst sind die Hände
  frei.|Zwei Beutel, zwei Taschen. Du weißt, was fehlt, und der Haken hat
  es.}
  ~ zeit += 5 + (has("rohr") or has("fass") or has("feile")) * 15
  ~ drop("rohr")
  ~ drop("fass")
  ~ drop("feile")
  ~ take("docht")
  ~ take("band")
+ [Hinauf in die Wachstube](#stube)
  ~ zeit += 5 + dunkel * 5

# Die Regale {#regale}

~ im_keller = 1

{ has("rohr") or has("fass") or has("feile") }
  Beide Hände sind schon vergeben. Was du trägst, müsstest du erst
  zurücklegen, und das Regal läuft dir nicht weg.
  -> keller
{ knows("SCHADEN") }
  Du weißt, was fehlt, und es steht nicht im Regal. Es hängt am Haken.
  -> keller

Du hältst die Lampe an die Bretter. Ohne zu wissen, was oben fehlt,
bleibt nur, was nach Ursache aussieht: das Ersatzrohr für die
Steigleitung, ein Ölfass, die Feile vom Werkzeugbrett.

+ [Das Ersatzrohr herauswuchten](#keller)
  Das Rohr will mit beiden Händen getragen sein. Für mehr als das Rohr
  ist keine Hand frei.
  ~ take("rohr")
  ~ zeit += 15
+ [Das Ölfass aufnehmen](#keller)
  Halb voll und trotzdem genug: beide Arme, kleine Schritte.
  ~ take("fass")
  ~ zeit += 15
+ [Die Feile vom Werkzeugbrett nehmen](#keller)
  Wenn oben nur etwas klemmt, ist die Feile das richtige Werkzeug. Wenn.
  ~ take("feile")
  ~ zeit += 10
+ [Nichts anrühren und zurück an die Treppe](#keller)
  ~ zeit += 5

# Geflickt {#reparatur}

~ remember("GERICHTET")
~ drop("docht")
~ drop("band")

Der alte Docht kommt heraus wie ein Stück Kohle. Du setzt den neuen,
ziehst ihn auf Höhe, schneidest ihn gerade. Dann die Leitung: das mürbe
Band herunter, das neue dreimal stramm herum, mit dem Daumen angerieben.
Die Pumpe zieht. Kein Luftton mehr, nur Öl.

Die Lampe ist gerichtet. Jetzt muss sie nur noch brennen.

* [Ein Streichholz an den Docht halten](#brennt)
  ~ zeit += 5
+ [Erst hinunter in die Stube](#stube)
  ~ zeit += 10 + dunkel * 10

# Sie brennt {#brennt}

~ im_keller = 0
~ licht = 1

Der Docht nimmt die Flamme beim ersten Holz. Du setzt das Glas zurück,
das Werk beginnt zu drehen, und der Strahl steht auf, läuft hinaus über
die See und kommt im Takt wieder.

{sturm: Draußen wirft sich der Sturm gegen den Turm. Soll er. Jetzt wird
er dabei gesehen.|Im Westen steht die Wolkenbank noch über dem Horizont.
Sie kann jetzt kommen.}

{knows("KUTTER"): Nur unten auf der Bank liegt schon etwas Dunkles im
Wasser, das dieses Licht eine Stunde früher gebraucht hätte.}

+ [Hinunter in die Stube](#stube)
  ~ zeit += 10 + dunkel * 10
+ {not knows("KUTTER")} [Bei der Lampe bleiben, bis es hell wird](#morgen)
+ {knows("KUTTER")} [Bleiben und auf den grauen Tag warten](#strandung)

# Die Außentreppe {#leiter}

Eisen, außen am Schaft, vom Salz rund gefressen. Sie spart den halben
Turm, und sie gehört dem Wind.

{ sturm }
  Auf halber Höhe nimmt dir eine Bö das Gewicht von den Füßen. Du hältst
  dich, und die zweite Bö fragt nicht mehr, wer sich hält.
  -> absturz
{ dunkel }
  Du gehst sie im Dunkeln hinab, Hand über Hand, und gibst jeder Stufe
  Zeit, dich zu tragen.
  ~ zeit += 15
  -> ankunft
{ else }
  Unten nimmst du dir vor, das bei Wind nicht noch einmal zu machen.
  ~ zeit += 5
  -> ankunft

# Der Anleger {#anleger}

{ sturm }
  Vom Anleger stehen noch die Pfähle. Du siehst die Welle nicht kommen,
  du hörst sie nur, und dann ist zwischen dir und dem Turm auf einmal
  See.
  -> weggespuelt

Vier Pfähle, ein Bohlensteg, zwei Ringe für die Leinen. Die See davor ist
leer bis zum Horizont. Das Boot kommt am Morgen, so war es ausgemacht,
und der Steg hat bis dahin nichts zu bieten.

* [Warten, ob nicht doch etwas kommt](#anleger)
  Du wartest eine halbe Stunde gegen besseres Wissen. Es kommt: Wind.
  ~ zeit += 30
+ [Zurück über die Bank zum Turm](#ankunft)
  ~ zeit += 5

# Der Morgen {#morgen}

Der Sturm kommt in der Nacht, läuft Stunde um Stunde gegen den Turm und
findet ihn besetzt: Die Lampe brennt, du putzt Ruß vom Glas und hörst dem
Werk zu. Irgendwann ist das, was durch die Scheiben kommt, nicht mehr ihr
Licht, sondern Tag.

Bei grauem Licht löschst du die Lampe. Die Bank ist kleiner geworden, der
Turm ist es nicht.

Mit dem ersten hellen Wasser kommt das Boot um die Bank. Vom Ruder her
ein Nicken, mehr nicht. Mehr war nicht ausgemacht.

-> END

# Grauer Morgen {#strandung}

Der Sturm läuft irgendwann aus, wie jeder Sturm. Was er dagelassen hat,
zeigt das erste Licht: An der Nordkante der Bank liegt ein Kutter auf der
Seite, den Bug im Sand. An Deck bewegt sich nichts.

Deine Lampe war dunkel, als er sie gebraucht hätte. {licht: Dass sie
später noch brannte, ändert an seiner Nacht nichts mehr.}

Das Boot holt dich am Morgen ab, wie ausgemacht. Es wird eine stille
Überfahrt.

Dein Abenteuer endet hier.

-> END

# Im Wind {#absturz}

Die Außentreppe hält. Sie hat immer gehalten; halten musste sich, wer auf
ihr stand. Der Wind hat mehr Hände als du, und er kennt das Eisen länger.

Unter dir ist erst Luft, dann Sand, und dann nichts mehr, das dich etwas
angeht.

Dein Abenteuer endet hier.

-> END

# Am Fuß der Treppe {#sturz}

Die dritte Stufe ist es nicht, auch nicht die vierte. Es ist die, mit der
du nicht mehr gerechnet hast. Der Rest ist Geländer, Kante, Boden.

Du bleibst am Fuß der Treppe liegen. {licht: Über dir dreht der Strahl
weiter seine Runden; er braucht dich dafür nicht mehr.|Über dir bleibt
der Turm dunkel, und das lässt sich von hier unten nicht mehr ändern.}

Dein Abenteuer endet hier.

-> END

# Das Wasser im Keller {#ersoffen}

Die See kommt nicht als Welle in den Keller. Sie kommt als Stand: erst um
die Knöchel, dann über die Knie, und die Treppe hinauf drückt es dir
entgegen. Der Keller hat keinen zweiten Ausgang, und der erste gehört
jetzt dem Wasser.

Dein Abenteuer endet hier.

-> END

# In der See {#weggespuelt}

Die Bank ist unter deinen Füßen weg, und mit ihr die Richtung. {licht:
Der Strahl läuft über dich hinweg, zweimal, dreimal. Er kann zeigen, aber
nicht halten.|Der Turm steht schwarz gegen den Himmel, und in ihm brennt
kein Licht, das jemandem sagen könnte, wo du warst.}

Dein Abenteuer endet hier.

-> END
