# Das Gästezimmer {#room}

{visits(room) == 1: Vier Wände, ein Bett mit Baldachin, ein Waschtisch, ein Porträt über dem Kamin. Der Mann auf dem Porträt hat die Augen des Hausherrn und die Mode von vor zweihundert Jahren. Vermutlich ein Vorfahre. Vermutlich. Deinen nassen Mantel hängst du zum Trocknen über die Stuhllehne.|Die Kerze ist ein Stück kürzer geworden. Das Bett wartet.}

{visits(room) == 1: Der Schlüssel steckt außen.}

* [Den Schlüssel nach innen holen und abschließen](#room) Das Schloss dreht sich zweimal. Du fühlst dich sofort besser. Gleich darauf meldet sich der Gedanke: Ein Schlüssel, der außen steckt, soll niemanden aussperren. Er soll einschließen.
  ~ remember("ABGESCHLOSSEN")
* [Das Porträt abhängen](#room) Dahinter ist die Tapete heller, und in der Mitte des hellen Flecks sitzt ein Loch von der Größe eines Auges. Du hängst das Bild zurück und rückst es sehr gerade.
  ~ fear = fear + 1
  ~ remember("GUCKLOCH")
+ [Dich angezogen aufs Bett legen]()
---
Du schläfst schneller ein, als dir lieb ist.

-> midnight

# Um Mitternacht {#midnight}

{visits(midnight) == 1: Du wachst auf, weil es aufgehört hat zu regnen, und der Regen war das einzige Geräusch gewesen, das hierher gehörte.|Die Stille ist noch da. Sie ist nicht beruhigend.}

{visits(midnight) == 1 and knows("ABGESCHLOSSEN"): Jemand versucht die Klinke. Zweimal. Dann Schritte, die sich entfernen.}

{visits(midnight) == 1 and not knows("ABGESCHLOSSEN"): Die Tür steht einen Spalt offen. Du hast sie geschlossen.}

{visits(midnight) == 1 and knows("GUCKLOCH"): Zum Porträt siehst du nicht hinüber. Es könnte jemand zurücksehen.}

{ visits(midnight) == 1 }
  ~ fear = fear + 1

* [Unter dem Bett nachsehen](#midnight) Dort liegt eine Kiste, in der Kiste ein Kruzifix, Bissspuren im Holz.
  ~ take("crucifix")
  ~ fear = fear + 1
+ [Auf den Flur gehen](#landing)
+ [Liegen bleiben und die Augen schließen](#stay)

# Liegen bleiben {#stay}

Du liegst mit geschlossenen Augen im Dunkeln und hörst zu, wie das Haus sich
setzt. Häuser setzen sich. Häuser atmen nicht.

Du hörst es trotzdem: ein, aus, geduldig, direkt über deinem Gesicht, keine
Handbreit hinter dem Stoff des Baldachins. Deine ANGST steigt.

~ fear = fear + 2

* [Aufstehen](#landing)

# Der Flur {#landing}

Ein Läufer, der jeden Schritt schluckt. Links die Bibliothek, rechts eine Tür
mit einem Handtuch darüber, am Ende des Flurs eine schmale Tür, geradeaus die
Treppe hinunter.

{fear >= 11: Dein Herz schlägt inzwischen überall mit, in den Handgelenken, im Hals, hinter den Augen. Viel mehr davon hält es nicht.}

* [In die Bibliothek gehen](#library)
* [Die Tür mit dem Handtuch öffnen](#bathroom)
* {not knows("BETAEUBT")} [Zur schmalen Tür am Ende gehen](#tower-door)
+ [Die Treppe hinuntergehen](#ground.hall)

# Die Bibliothek {#library}

Dreitausend Bücher, von denen zweitausendneunhundert Attrappen sind: bemalte
Holzrücken. Die echten hundert stehen zusammen in einem Regal, und je länger
du die Titel liest, desto panischer wirst du: Bücher über Beschwörungen. Über Bindungen. Über Wahnsinn.
Die Macht der wahren Namen. Bücher darüber, wie man etwas ruft - und drei
deutlich dünnere darüber, wie man es wieder loswird.

{!Du schlägst eines auf und liest eine halbe Seite über das, was etwas Gerufenes als Lohn verlangt, und in welcher Reihenfolge es sich nimmt. Du stellst das Buch zurück und wischst dir die Hand am Mantel ab.|Die Bücher sind noch da. Du bist noch da. Nur eines von beidem beruhigt dich.}

{ visits(library) == 1 }
  ~ fear = fear + 1

* [Das Regal genauer untersuchen]()
  { test_luck() }
    Hinter dem dritten Band liegt ein Schlüssel, an dem ein Papierschild hängt: "Keller".
    ~ take("cellar-key")
  { else }
    Staub, Holz, und ein aufgeschlagenes Buch mit einer Liste von Datumsangaben in
    sauberer, alter Tinte. Der unterste Eintrag ist von heute. Deine ANGST
    steigt.
    ~ fear = fear + 1
* [Den Schürhaken vom Kamin mitnehmen](#library) Er ist schwer und wiegt gut in der Hand, was in diesem Haus ein Argument ist.
  ~ take("poker")
  { not has("dagger") }
    ~ equip("poker")
+ [Hinaus auf den Flur gehen](#landing)
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
    eine Gestalt und sieht dich freundlich an. Dann hebt sie, sehr langsam, eine
    Hand aus dem Wasser und winkt. Du fährst herum: Die Wanne hinter dir ist
    leer. Im Spiegel winkt sie immer noch. Deine ANGST steigt.
    ~ fear = fear + 2
---
Du schließt die Tür hinter dir mit mehr Sorgfalt, als Türen sonst verdienen.

-> landing

# Die schmale Tür {#tower-door}

Am Ende des Flurs eine schmale Tür, der Riegel vorgelegt - von deiner Seite.
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

Du wachst auf, und das Erste, was du weißt, ist: Das ist nicht dein Bett.
Das Zweite: Du sitzt. Dein Mund schmeckt nach Wein und Watte, dein Herz
hämmert dir bis in die Fingerspitzen, und unter deinen Händen liegen die
Armlehnen eines Stuhls, an denen Riemen angebracht sind.

Man hat sie nicht festgezogen. Das wirkt weniger wie Gnade als wie Routine:
Wohin solltest du schon gehen. Deine ANGST steigt.

~ fear = fear + 2
~ remember("BETAEUBT")

-> lady

# Die Weiße Dame {#lady}

{visits(lady) == 1: Im Mondlicht steht eine Frau, die keinen Schatten wirft und aussieht, als warte sie seit Jahren, Jahrhunderten, auf Besuch.|Sie steht noch im Mondlicht und wartet, ob von dir etwas kommt, das sich zu hören lohnt.}

{visits(lady) == 1: "Neu hier?", fragt sie. Ihre Stimme klingt wie eine, die lange nicht benutzt wurde und sich darüber nicht beklagen will.}

* [Höflich bleiben und zuhören](#lady) Sie sieht dich lange an. "Gute Erziehung", sagt sie. "Die ist hier selten geworden." Sie war vor Jahren hier gestrandet, auch im Regen. "Der Hausherr", sagt sie, "hat einen Namen, den er aus den Büchern heraushält. Er steht im Tagebuch in seinem Arbeitszimmer, und auf dem Torbogen, unter dem Efeu. Sprich ihn aus, wenn er dir gegenübersteht, und sieh dann zu, dass du schnell davonkommst." Dann beugt sie sich vor und nennt ihn dir, langsam und zweimal, wie man einem Kind etwas Wichtiges aufträgt.
  ~ remember("WAHRER-NAME")
  ~ arrival.calm(1)
* [Nach dem Ausgang fragen](#lady) Sie deutet auf die Treppe. "Die einzige Tür", sagt sie und verliert für einen Moment das Interesse an dir, mit einer Geschwindigkeit, die kränkend wäre, hättest du nicht gerade andere Sorgen.
* [Fragen, was mit ihr geschehen ist](#lady) Sie sieht an sich hinunter, als müsse sie nachschlagen. "Ich war unhöflich", sagt sie schließlich. Mehr nicht, und du fragst nicht nach, denn ihr Blick geht dabei zu dem Stuhl mit den Riemen.
  ~ fear = fear + 1
+ [Dich verabschieden]()
---
Als du dich an der Tür noch einmal umdrehst, steht sie am Fenster und sieht
hinaus, als kenne sie den Ausblick auswendig und prüfe ihn trotzdem.

-> tower-out

# Die Treppe hinab {#tower-out}

{knows("BETAEUBT"): Unten endet die Wendeltreppe an der schmalen Tür. Der Riegel ist von außen vorgelegt. Die Tür ist alt, der Rahmen ist älter.|Unten steht die schmale Tür offen, der Riegel zurückgeschoben.}

{choice_count() == 1: Es gibt nur einen Weg, und er führt hinunter.}

* {knows("BETAEUBT") and knows("MECHANIKER")} [Die Scharniere aushängen]() Riegel sind Überzeugungssache, Scharniere sind Physik. Das Taschenmesser, das du seit der Lehre in der Westentasche trägst, hebelt die Stifte heraus. Die Tür lehnt sich dir in die Arme müde wie nach einer Doppelschicht.
* {knows("BETAEUBT")} [Die Schulter benutzen]()
  { test("skill") }
    Der Riegel hält. Der Rahmen nicht.
  { else }
    Die Tür gewinnt die ersten beiden Versuche.
    ~ stamina = stamina - 2
    Beim dritten gibt sie nach, das Haus gewinnt nicht immer.
* {knows("BETAEUBT")} [Durch das Fenster und den Efeu hinunterklettern]()
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
