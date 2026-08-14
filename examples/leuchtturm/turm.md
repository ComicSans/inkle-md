# Auf der Sandbank {#ankunft}

{!Das Boot legt ab, sobald du den Fuß auf die Treppe setzt. Der Steuermann
winkt nicht.|Wieder unten. Die Bank ist so groß wie ein Hof, und der Turm
steht mitten darauf.}

![Ein gedrungener Leuchtturm auf einer Sandbank, das Wasser bis an die Tür.](turm.png)

{sturm: Die See geht hoch und schlägt gegen die Bank.|Die See liegt flach vor
dir, und das ist selten genug.}

{licht: Über dir dreht der Strahl. Solange er das tut, hast du hier unten
nichts mehr zu tun.}

* [Hinauf in die Laterne](#laterne)
  ~ zeit += 5
* {wasser < 8} [In den Keller sehen](#keller)
  ~ zeit += 5
* {wasser >= 8} [Zur Kellertreppe](#abgeschnitten)
  ~ zeit += 5
+ {licht} [Es ist getan](#zurueck)

# Die Laterne {#laterne}

{licht: Die Lampe brennt. Der Strahl geht hinaus und kommt nicht wieder, und
das Glas ist warm.|Der Docht ist heruntergebrannt, das Glas beschlagen.}

Von hier oben siehst du die Sandbank ganz: eine Handbreit Land, und ringsum
Wasser.

{ sturm }
  Der Turm steht in der Brandung wie ein Daumen im Wind.
{ ruhig }
  Draußen liegt alles so still, dass du deine eigenen Schritte hörst.

* {not licht and oel > 0} [Die Lampe anzünden](#brennt)
  ~ zeit += 10
* {not licht and oel <= 0} [Nachsehen, was im Tank ist](#dunkel)
  ~ zeit += 10
* {not licht and oel < 4 and wasser < 8} [Öl holen, solange es geht](#keller)
  ~ zeit += 10
+ {licht} [Nach dem Wasser sehen](#keller)
  ~ zeit += 5
+ [Hinunter](#ankunft)
  ~ zeit += 5

# Der Docht fängt {#brennt}

~ licht = 1

Ein Streichholz, ein Ziehen in der Luft, und das Glas klart auf. Der Strahl
fährt über das Wasser wie ein Arm, der etwas sucht.

{sturm: Irgendwo da draußen dreht ein Schiff bei. Ob deinetwegen, wirst du nie
erfahren.|Kein Schiff weit und breit. Das Licht brennt trotzdem, dafür steht
es hier.}

+ [Weiter](#laterne)
  ~ zeit += 5

# Der Keller {#keller}

{!Zwei Fässer Öl, eine Pumpe, und Wasser, das sich zwischen den Steinen Zeit
lässt.|Der Keller, die Fässer, die Pumpe.}

{ wasser >= 6 }
  Es steht dir bis über die Knöchel.
{ wasser > 0 }
  Ein Film auf den Steinen, mehr nicht.
{ else }
  Trocken, wie er sein soll.

* {oel < 8} [Öl nach oben tragen](#oel-geholt)
  ~ zeit += 10
  ~ oel = 8
* {wasser > 0} [Pumpen](#pumpe)
  ~ zeit += 15
+ [Zurück nach oben](#laterne)
  ~ zeit += 5

# Das Öl ist oben {#oel-geholt}

Ein volles Fass die Treppe hinauf, und deine Arme sagen dir hinterher, was sie
davon halten.

-> laterne

# Die Pumpe {#pumpe}

Sie ist alt und sie weiß es. Zwanzig Züge, und der Keller gibt eine Handbreit
zurück.

~ wasser = max(wasser - 4, 0)

{wasser == 0: Trocken. Für heute.|Es steht noch immer da, aber es steht
niedriger.}

+ [Weiter](#keller)
  ~ zeit += 5

# Vor der Kellertreppe {#abgeschnitten}

Die letzten drei Stufen stehen im Wasser, und was auf ihnen läge, läge darin.
Die Fässer sind da unten. Sie bleiben da unten.

{oel <= 0: Und oben ist nichts mehr, womit sich etwas anzünden ließe.}

+ [Hinauf](#laterne)
  ~ zeit += 5

# Kein Öl {#dunkel}

Der Tank ist leer, der Docht saugt an nichts. Du drehst ihn hoch, und er
bleibt kalt.

{wasser >= 8: Unten stünde noch ein Fass. Unten steht auch das Wasser.|Im
Keller stünde noch eins, wenn die Beine wollen.}

+ [Weiter](#laterne)
  ~ zeit += 5

# Zurück zum Boot {#zurueck}

Am Morgen kommt das Boot wieder, und der Steuermann fragt nichts.

{licht: Hinter dir dreht der Strahl noch, bis es hell genug ist, dass ihn
keiner mehr braucht.|Der Turm bleibt dunkel hinter dir stehen. Es hat in
dieser Nacht niemand danach gefragt, und das ist kein Trost.}

-> END

# Unter Wasser {#abgesoffen}

Der Keller läuft schneller, als eine Pumpe von Hand ihn je einholt. Irgendwann
steht das Wasser in der Treppe, und dann steht es in der Tür.

-> END
