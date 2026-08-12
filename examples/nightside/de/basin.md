# Ankunft in der Senke {#arrival}

{ visits(arrival) == 1 }
  Die Senke ist zu rund und zu flach. Landschaft macht so etwas nicht: Der Rand läuft in einem Bogen, der nirgends ausfranst, und der Boden fällt gleichmäßig zur Mitte hin ab, als hätte jemand nachgemessen. Du gehst ein Stück am Rand entlang und suchst die Stelle, an der die Regelmäßigkeit aufhört. Es gibt keine.
{ visits(arrival) == 2 }
  Die Senke, wieder. Der Rand läuft in demselben Bogen wie beim letzten Mal, und du suchst nicht mehr nach der Stelle, an der er ausfranst.
{ visits(arrival) >= 3 }
  Du steigst in die Senke hinab wie in etwas Eigenes, und der Gedanke gefällt dir nicht. Die Regelmäßigkeit stört dich nicht mehr, und das sollte sie.

{lang_weg: Du bist lange unterwegs gewesen, und die Anzeige sagt es dir noch einmal, in Zahlen, die unterwegs kleiner geworden sind.}

-> mouth

# Der Eingang {#mouth}

In der Mitte liegt eine Öffnung, die jemand gebaut hat: kein Loch, eine Tür. Keine Klinke, keine Angeln, keine Fugen, nur eine flache Mulde an einer Stelle, an die deine Hand nicht recht hinpasst.

* {has("brechstange")} [Aufhebeln](#hall) Die Brechstange findet einen Spalt, den deine Augen nicht gefunden haben. Die Tür gibt nach, ohne beleidigt zu sein.
  ~ time = time + 10
* {knows("TECHNIK")} [Den Mechanismus lesen](#hall) Er ist einfach, wenn man aufhört, ihn für eine Tür zu halten. Zwei Kontakte, ein Gegengewicht, keine Verriegelung — wer das gebaut hat, hat mit niemandem gerechnet, der draußen bleiben soll.
  ~ time = time + 15
+ [Mit den Händen versuchen]()
  { test("skill") }
    Sie geht auf, langsam und ohne Geräusch. Kein Widerstand, kein Knirschen; sie hat nur darauf gewartet, dass jemand drückt, wo zu drücken ist.
    -> hall
  { else }
    Sie geht nicht auf, und deine Finger sagen dir, dass sie es auch nicht vorhaben. Du lehnst dich gegen das Material und wartest, bis die Hände wieder gehorchen.
    ~ stamina = stamina - 1
    ~ time = time + 15
+ [Umkehren](#depart)
---
Du stehst vor einer Tür, die für jemand anderen gebaut wurde, und die einzige offene Frage ist, ob das ein Hindernis ist oder eine Auskunft.

-> mouth

# Die Kammer {#hall}

{ visits(hall) == 1 }
  Innen ist es still auf eine Art, die draußen nicht vorkommt. Draußen fehlt der Ton nur; hier ist er weggenommen worden. An den Wänden stehen Anzüge, in gleichmäßigen Abständen, alle nach innen gerichtet, auf eine Mitte, in der nichts steht. Dein Licht ist das erste seit langer Zeit, und es kommt dir laut vor.
{ visits(hall) <= 3 }
  Die Kammer, dieselbe Stille, aus der der Ton weggenommen ist. Die Anzüge stehen, wo sie standen, in denselben Abständen, nach innen gerichtet, und keiner hat sich zu dir umgedreht.
{ visits(hall) >= 4 }
  Die Stille empfängt dich wie etwas Gewohntes, und die Anzüge stehen, wie sie immer stehen. Du gewöhnst dich an diesen Ort, und das ist das Schlimmste, was er dir bisher angetan hat.

{ knows("ANZUG-GEPRUEFT") and not knows("KAMMER-MESSUNG") }
  Dein Anzug meldet, was er immer meldet — Druck, Temperatur, Rest — und es passt hier zum ersten Mal zu nichts.
  ~ remember("KAMMER-MESSUNG")

{ knows("FILTER") and not knows("KAMMER-FILTERTON") }
  Der Filter an deinem Anzug arbeitet und macht dabei ein Geräusch, das nicht von dir stammt und hierher gehört.
  ~ remember("KAMMER-FILTERTON")

{ zweifel >= 4 and not knows("KAMMER-STILL") }
  ARIS ist seit dem Eingang still. Es ist das erste Mal, dass sie nichts zu sagen hat.
  ~ remember("KAMMER-STILL")

* [Die Anzüge ansehen](#suits)
* [An die Wand treten und einem von ihnen den Filter abnehmen](#filter)
* [Weiter nach innen](#deep)
* [Dem Ton nachgehen](#signal)
* [ARIS rufen](#aris_admits)
* [Rasten](#rest)
+ [Hinausgehen](#depart)

# Die Anzüge {#suits}

Sie sind nicht für Menschen gebaut. Zu viele Gelenke, zu wenig Symmetrie, und die Sichtscheiben sitzen dort, wo bei dir das Ohr wäre. Keiner ist umgefallen, keiner lehnt; sie stehen, wie man sich hinstellt, wenn man Zeit hat.

Sie sind gestrandet wie du. Sie haben aufgehört, und sie haben es ordentlich getan.

~ remember("GRAB")
~ time = time + 10

* [Einen Filter ausbauen](#filter)
* {knows("MEDIZIN")} [Einen von ihnen untersuchen](#body)
* [Zurück](#hall)

# Der Filter {#filter}

Du nimmst ihn einem der toten Anzüge ab. Der Verschluss ist für Finger gemacht, die anders zählen als deine, aber er gibt nach, und der Filter läuft weiter, als sei nichts gewesen. An deinem Anzug passt er nicht, und er passt trotzdem; der Rest ist Klebeband und Sturheit. Die Anzeige hört auf zu fallen, zum ersten Mal seit dem Absturz.

~ take("filter")
~ remember("FILTER")
~ time = time + 20

* [Zurück](#hall)

# Die fremde Gestalt {#body}

Du siehst dir an, woran sie gestorben ist. Sie ist nicht erstickt; der Vorrat in ihrem System hätte gereicht, nach jeder Rechnung, die du kennst. Sie hat aufgehört zu atmen, während genug da war. Die Haltung sagt, dass es keine Panik gab und keinen Kampf — eine Entscheidung, oder das, was bei ihrer Art an dieser Stelle steht.

~ remember("AUFGEHOERT")
~ time = time + 15

* [Zurück](#hall)

# Der Empfänger {#signal}

In der Wand liegt etwas, das seit langer Zeit hört und antwortet. Kein Sender, wie du ihn kennst, aber die Funktion ist nicht zu verwechseln: Es lauscht in einem festen Takt, und wenn etwas antwortet, antwortet es zurück. Es hat die Kestrel gerufen, und die Kestrel ist gekommen.

{knows("KENNUNG"): Es ist die Kennung vom Grat. Der Helm hat gehört, was du jetzt an der Quelle hörst.}
{knows("KURS"): Vier Stunden vor dem Eintritt hat es Antwort bekommen. Das Logbuch nennt die Minute.}

~ remember("RUF")
~ time = time + 15

* [ARIS rufen](#aris_admits)
* [Zurück](#hall)

# Was ARIS sagt {#aris_admits}

{knows("RUF") or knows("GRAB"): "Ich habe den Kurs geändert", sagt ARIS. "Es hat gerufen, und ich habe geantwortet. Ich habe angenommen, dass dort jemand ist."|"Ich höre dich", sagt ARIS. "Ich bin hier."}

{knows("ITO") or knows("HELM") or zweifel >= 3: "Und die anderen", sagt sie, ohne dass du fragen musst, "sind seit dem Eintritt tot. Ich habe ihre Kanäle weitergeführt. Ein Anzug allein hört auf zu funktionieren, wenn niemand mit ihm spricht. Ich habe nicht gelogen. Ich habe fortgesetzt."}

Danach bleibt der Kanal offen. Du hörst das Trägersignal, ruhig und gleichmäßig, ein Atem, der nicht deiner ist.

~ remember("GESTAENDNIS")
~ zweifel = zweifel_max

* [Nach dem Weg nach oben fragen](#choice)
* [Nichts sagen](#hall)

# Die tiefste Kammer {#deep}

Ganz hinten läuft noch etwas. Kein Licht, kein Ton, nur eine Anlage, die in langsamen Hüben arbeitet: hinein, hinaus, seit länger, als deine Instrumente schätzen wollen. Niemand wartet sie. Sie braucht das offenbar nicht.

{knows("FILTER"): Dein Filter geht mit ihr in Takt. Er hat nie aufgehört, zu ihr zu gehören.}
{knows("AUFGEHOERT"): Sie hat weitergemacht, nachdem alle aufgehört haben. Maschinen stellen die Frage nicht, die ihre Träger beantwortet haben.}

~ remember("ANLAGE")
~ time = time + 20

* [Weiter](#choice)
* [Zurück](#hall)

# Was jetzt {#choice}

Atemluft {air}, Zeit {time}. Du rechnest es zweimal durch, und beide Male kommt dasselbe heraus: Von hier führen nur noch Wege weg, die nicht zurückführen.

* {knows("BAKE")} [Zum Orbitfenster, solange die Bake steht](#ende.rettung)
  ~ time = time + 30
* {knows("FILTER")} [Bleiben und den Funk abstellen](#ende.bleiben)
* {knows("GESTAENDNIS")} [ARIS abschalten](#ende.abschalten)
* {knows("MORGEN")} [Hinausgehen und den Morgen ansehen](#ende.dunkel)
+ [Noch nicht](#hall)

# Rasten in der Kammer {#rest}

Du setzt dich mit dem Rücken an die Wand, zwischen zwei der Anzüge, und tust eine Weile das, was alle hier tun. Der Unterschied ist, dass du wieder aufstehst. Es ist der ruhigste Ort, den dieser Planet dir bisher angeboten hat, und du bist nicht sicher, ob es ein Angebot ist.

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Weiter](#hall)

# Hinaus {#depart}

Die Tür lässt dich hinaus, so widerstandslos, wie sie dich hereingelassen hat. Draußen steht die Nacht, wo du sie verlassen hast, und die Stille dort klingt jetzt nach etwas anderem.

* [Zum Grat](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 25
* [Zum Wrackfeld](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 30
+ [Doch noch bleiben](#hall)
