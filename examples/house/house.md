# Das Gästezimmer {#room}

Vier Wände, ein Bett mit Baldachin, ein Waschtisch, ein Porträt über dem
Kamin. Der Mann auf dem Porträt hat die Augen des Hausherrn und die Mode von
vor zweihundert Jahren. Vermutlich ein Vorfahre. Vermutlich.

Der Schlüssel steckt außen.

* [Ihn nach innen holen und abschließen]() Das Schloss dreht sich zweimal. Du fühlst dich sofort besser und weißt nicht recht, warum das dumm ist.
  ~ remember("ABGESCHLOSSEN")
* [Es dabei belassen]() Du legst dich angezogen aufs Bett.
---
Du schläfst schneller ein, als dir lieb ist.

-> midnight

# Um Mitternacht {#midnight}

Du wachst auf, weil es aufgehört hat zu regnen, und der Regen war das einzige
Geräusch gewesen, das hierher gehörte.

{knows("ABGESCHLOSSEN"): Jemand versucht die Klinke. Zweimal. Dann Schritte, die sich entfernen.|Die Tür steht einen Spalt offen. Du hast sie geschlossen.}

~ fear = fear + 1

* [Auf den Flur gehen](#landing)
* [Unter dem Bett nachsehen]() Dort liegt eine Kiste, in der Kiste ein Kruzifix, an dem jemand mit den Zähnen gearbeitet hat.
  ~ take("crucifix")
  ~ fear = fear + 1
+ [Liegen bleiben und die Augen schließen](#stay)
---
Irgendwann musst du hinaus.

-> landing

# Liegen bleiben {#stay}

Du liegst mit geschlossenen Augen im Dunkeln und hörst zu, wie das Haus sich
setzt. Häuser setzen sich. Häuser atmen nicht.

~ fear = fear + 2

* [Aufstehen](#landing)

# Der Flur {#landing}

Ein Läufer, der jeden Schritt schluckt. Links die Bibliothek, rechts eine Tür
mit einem Handtuch darüber, geradeaus die Treppe hinunter.

* [In die Bibliothek](#library)
* [Die Tür mit dem Handtuch](#bathroom)
* [Die Treppe hinunter](#stairs)

# Die Bibliothek {#library}

Dreitausend Bücher, von denen zweitausendneunhundert Attrappe sind: bemalte
Holzrücken. Die echten hundert stehen zusammen in einem Regal und handeln alle
von derselben Sache.

{!Du liest eine halbe Seite und wünschst dir, du hättest es nicht getan.|Die Bücher sind noch da. Du bist noch da. Das eine beruhigt dich, das andere nicht.}

{ visits(library) == 1 }
  ~ fear = fear + 1

* [Das Regal genauer untersuchen]()
  { test("luck") }
    Hinter dem dritten Band liegt ein Schlüssel, an dem ein Papierschild hängt: "Keller".
    ~ take("cellar-key")
  { else }
    Staub, Holz, und ein Buch, das du lieber wieder zuschlägst.
    ~ fear = fear + 1
* [Den Schürhaken vom Kamin mitnehmen](#library) Er ist schwer und wiegt gut in der Hand, was in diesem Haus ein Argument ist.
  ~ take("poker")
  ~ equip("poker")
+ [Zurück auf den Flur](#landing)
---
Du hast in dieser Bibliothek gesehen, was zu sehen war.

-> landing

# Die Tür mit dem Handtuch {#bathroom}

Ein Badezimmer. Eine Wanne auf Löwenfüßen, halb voll, das Wasser noch warm.
Niemand da. Die Seife ist benutzt.

{ visits(bathroom) == 1 }
  ~ fear = fear + 1

* [Das Handtuch zurückhängen und leise gehen](#landing)
+ [In den Spiegelschrank sehen]()
  { has("crucifix") }
    Im Spiegel steht der Raum, wie er ist. Das Kruzifix in deiner Tasche wird
    unangenehm warm, was du vorerst ignorierst.
    ~ remember("DER-SPIEGEL")
  { else }
    Im Spiegel steht der Raum, wie er ist, bis auf die Wanne. In der sitzt
    jemand und sieht dich freundlich an.
    ~ fear = fear + 2
---
Du schließt die Tür hinter dir mit mehr Sorgfalt, als Türen sonst verdienen.

-> landing

# Die Treppe {#stairs}

Von der Treppe aus siehst du Licht unter der Kellertür, und du hörst etwas,
das entweder ein Gesang ist oder eine sehr geduldige Maschine.

{knows("KELLER-VERBOTEN"): Der Keller, hatte der Butler gesagt, steht niemandem offen.}

* {has("cellar-key")} [Die Kellertür aufschließen](#cellar)
* [An der Kellertür lauschen](#listen)
* [Zur Haustür und hinaus](#flight)

# An der Kellertür {#listen}

Der Gesang ist Latein, aber falsches Latein, so wie jemand es spricht, der es
von jemandem gelernt hat, der es auch nicht konnte. Zwischen den Zeilen fällt
dein Name.

{ visits(listen) == 1 }
  ~ fear = fear + 1
~ remember("MEIN-NAME")

* {has("cellar-key")} [Aufschließen](#cellar)
* [Zurück zur Treppe](#stairs)
+ [Es mit der Schulter versuchen](#servant-fight)

# Der Butler kommt {#servant-fight}

Die Tür gibt nicht nach. Dafür gibt der Flur hinter dir jemanden her: den
Butler, mit einer Kerze in der einen und etwas Länglichem in der anderen Hand.

"Sie waren im Keller nicht vorgesehen", sagt er, beinahe bedauernd.

!combat servant
  win  [Ihm den Schlüssel abnehmen](#cellar) Am Gürtel hängt ein Schlüssel. Du nimmst ihn und versuchst, nicht auf ihn hinunterzusehen.
  flee [Zur Haustür](#flight) Du lässt ihn stehen und die Höflichkeit gleich mit.

# Der Keller {#cellar}

Zwölf Gestalten in Kutten, ein Kreis aus Kreide, in der Mitte ein Stuhl. Auf
der Lehne hängt dein Mantel. Du hattest ihn im Zimmer gelassen.

{knows("MEIN-NAME"): Jetzt sprechen sie deinen Namen deutlicher aus, und einer korrigiert die Aussprache.}

{knows("NIEMAND-WARTET"): Beim Abendessen hattest du erwähnt, dass dich niemand erwartet. Der Hausherr hat es sich offenbar notiert.}

{knows("DER-SPIEGEL"): Das Kruzifix ist wieder warm, diesmal von Anfang an.}

~ fear = fear + 2

* {has("crucifix")} [Das Kruzifix hochhalten](#break) Es wird so heiß, dass du es fast fallen lässt, und der Gesang bricht ab.
* [Den Kreidekreis mit dem Stiefel verwischen](#thing) Zwölf Köpfe drehen sich gleichzeitig, was mehr Eindruck macht als alles bisher.
* [Rückwärts hinausgehen und die Tür schließen](#flight)

# Was im Keller wartet {#thing}

Der Kreis ist offen, und was darin gewartet hat, wartet nicht mehr.

~ fear = fear + 1

!combat thing
  win  -> break
  flee [Die Treppe hinauf](#flight) Hinter dir bleibt es stehen, als hätte es Zeit.

# Der Kreis bricht {#break}

Was auch immer hier über Jahre geduldig zusammengetragen wurde, fällt in sich
zusammen, und zwar buchstäblich: die Kerzen, die Kutten, der Stuhl, das Haus.

Du gehst durch eine Tür, die es zehn Sekunden später nicht mehr gibt.

Draußen ist Morgen. Auf der Straße steht dein Wagen und springt beim ersten
Versuch an, was du für die unglaublichste Begebenheit dieser Nacht hältst.

-> END

# Die Haustür {#flight}

Du gehst hinaus, den Kies hinunter, durch das Tor, das offen steht, als wäre
das nie anders gewesen.

{knows("DER-BRUDER"): Hinter dir sagt jemand höflich, man werde deinen Bruder benachrichtigen.}

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
