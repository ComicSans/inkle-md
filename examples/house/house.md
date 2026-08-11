# Das Gästezimmer {#room}

Vier Wände, ein Bett mit Baldachin, ein Waschtisch, ein Porträt über dem
Kamin. Der Mann auf dem Porträt hat die Augen des Hausherrn und die Mode von
vor zweihundert Jahren. Vermutlich ein Vorfahre. Vermutlich.

Der Schlüssel steckt außen.

* [Ihn nach innen holen und abschließen]() Das Schloss dreht sich zweimal. Du fühlst dich sofort besser und weißt nicht recht, warum das dumm ist.
  ~ remember("ABGESCHLOSSEN")
* [Das Porträt abhängen]() Dahinter ist die Tapete heller, und in der Mitte des hellen Flecks sitzt ein Loch von der Größe eines Auges. Du hängst das Bild zurück und rückst es sehr gerade.
  ~ fear = fear + 1
  ~ remember("GUCKLOCH")
* [Beides lassen und dich angezogen aufs Bett legen]()
---
Du schläfst schneller ein, als dir lieb ist.

-> midnight

# Um Mitternacht {#midnight}

Du wachst auf, weil es aufgehört hat zu regnen, und der Regen war das einzige
Geräusch gewesen, das hierher gehörte.

{knows("ABGESCHLOSSEN"): Jemand versucht die Klinke. Zweimal. Dann Schritte, die sich entfernen.|Die Tür steht einen Spalt offen. Du hast sie geschlossen.}

{knows("GUCKLOCH"): Zum Porträt siehst du nicht hinüber. Es könnte jemand zurücksehen.}

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
mit einem Handtuch darüber, am Ende des Flurs eine schmale Tür, geradeaus die
Treppe hinunter.

* [In die Bibliothek](#library)
* [Die Tür mit dem Handtuch](#bathroom)
* [Die schmale Tür am Ende](#tower-door)
+ [Die Treppe hinunter](#ground.hall)

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

# Die schmale Tür {#tower-door}

Am Ende des Flurs eine schmale Tür, der Riegel vorgelegt — von deiner Seite.
Wer immer das eingerichtet hat, wollte niemanden am Hineingehen hindern.

~ fear = fear + 1

* [Den Riegel zurückziehen und hinaufsteigen](#tower-stairs)
+ [Den Riegel lassen, wo er ist](#landing)

# Die Turmtreppe {#tower-stairs}

Eine Wendeltreppe, so eng, dass du die Laterne vor dir hertragen musst wie
eine Entschuldigung. Oben ein rundes Zimmer: ein Stuhl mit Riemen an den
Armlehnen, ein Fenster, Mondlicht.

~ fear = fear + 1

-> lady

# Das Turmzimmer {#tower}

Du wachst in einem runden Zimmer auf, auf einem Stuhl, an dessen Armlehnen
Riemen angebracht sind. Man hat sie nicht festgezogen. Das wirkt weniger wie
Gnade als wie Routine: wohin solltest du schon gehen.

~ fear = fear + 2

-> lady

# Die Weiße Dame {#lady}

Im Mondlicht steht eine Frau, die keinen Schatten wirft und aussieht, als
warte sie seit Jahren auf besseres Publikum.

"Neu hier?", fragt sie. Ihre Stimme klingt wie eine, die lange nicht benutzt
wurde und sich darüber nicht beklagen will.

* [Höflich bleiben und zuhören]() Sie sieht dich lange an. "Gute Erziehung", sagt sie. "Die ist hier selten geworden." Sie war vor dreißig Jahren mit dem Wagen liegengeblieben, auch im Regen; das Haus wiederholt sich gern. "Der Hausherr", sagt sie, "hat einen Namen, den er aus den Büchern heraushält. Er steht im Tagebuch in seinem Arbeitszimmer, und auf dem Torbogen, unter dem Efeu. Sprich ihn aus, wenn er dir gegenübersteht, und sieh dann zu, dass du eine Tür findest."
  ~ remember("WAHRER-NAME")
  ~ fear = max(fear - 1, 0)
* [Ohne Umschweife nach dem Ausgang fragen]() Sie deutet auf die Treppe. "Da", sagt sie und verliert das Interesse an dir mit einer Geschwindigkeit, die kränkend wäre, hättest du nicht gerade andere Sorgen.
  ~ fear = fear + 1
---
Als du dich an der Tür noch einmal umdrehst, steht sie am Fenster und sieht
hinaus wie jemand, der den Ausblick auswendig kennt und trotzdem prüft.

-> tower-out

# Die Treppe hinab {#tower-out}

{knows("BETAEUBT"): Unten endet die Wendeltreppe an der schmalen Tür. Der Riegel ist von außen vorgelegt. Die Tür ist alt, der Rahmen ist älter.|Unten steht die schmale Tür offen, wie du sie gelassen hast.}

* {knows("BETAEUBT")} [Die Schulter benutzen]()
  { test("skill") }
    Der Riegel hält. Der Rahmen nicht.
  { else }
    Die Tür gewinnt die ersten beiden Versuche.
    ~ stamina = stamina - 2
    Beim dritten gibt sie nach, und das Haus wirkt beinahe enttäuscht.
* {knows("BETAEUBT")} [Durch das Fenster und den Efeu hinunter]()
  { test("skill") }
    Der Efeu trägt dich ein Stockwerk tiefer, wo ein Fenster offen steht. Du
    steigst ein und stehst in der Bibliothek, als wäre das ein üblicher Weg,
    Bibliotheken zu betreten.
    -> library
  { else }
    Der Efeu ist über seine besten Jahre hinaus. Er reißt, du fällst das
    letzte Stück und durch das offene Fenster darunter. Die Bibliothek
    empfängt dich mit einem Teppich, der schon Schlimmeres gesehen hat.
    ~ stamina = stamina - 2
    ~ fear = fear + 1
    -> library
* {not knows("BETAEUBT")} [Hinuntersteigen]()
---
-> landing
