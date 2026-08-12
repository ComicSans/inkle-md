# Ankunft am Grat {#arrival}

Der Grat steht quer im Land, als hätte ihn jemand dorthin gestellt. Kein Vorgebirge, kein Schutt, nur eine Kante aus dunklem Fels, die aus der Ebene wächst und oben gegen den Himmel schwärzer ist als der Himmel. Auf dem Anzugdisplay ist er das Einzige, das eine Höhenlinie verdient.

{kurz_weg: Der Weg hierher hat dich mehr Zeit gekostet, als er sollte. Der Boden gibt unter jedem Schritt einen Fingerbreit nach, als wäre er sich noch nicht sicher, ob er dich tragen will.}

-> foot

# Am Fuß der Wand {#foot}

Von unten sieht die Wand machbar aus. Von unten sieht jede Wand machbar aus. Vierzig Meter, geschätzt, mit Bändern und Rissen, die im Lampenlicht wie ein Angebot wirken. Der Anzug macht dich einen halben Meter breiter, als du es gewohnt bist, und das wird da oben zählen.

{knows("WUNDE"): Deine Seite meldet sich bei jedem Schritt, pünktlich und ohne neue Argumente.}
{is_dark: Die Lampe zeigt dir immer nur den nächsten Meter. Alles darüber ist Behauptung.}

* [Klettern](#climb)
* [Die Wand ablaufen](#cache)
* {knows("HELM")} [Noch einmal zu dem Helm](#vasquez)
* [ARIS fragen, ob jemand hier oben ist](#aris)
* [Rasten](#rest)
+ [Aufbrechen](#depart)
* {knows("MORGEN")} [Warten, bis es hell wird](#ende.dunkel)
* {knows("GESTAENDNIS")} [ARIS abschalten](#ende.abschalten)

# Der Aufstieg {#climb}

Vierzig Meter, und der Fels bricht in Platten. Du kletterst mit Handschuhen, die für Schalttafeln gemacht sind, und einem Anzug, der bei jedem Hochziehen an den Schultern gegenhält. Nach zehn Metern hörst du nur noch deinen eigenen Atem im Helm; er klingt, als hätte ihn niemand gefragt.

~ time = time + 20

{ test("skill") }
  Du kommst sauber hoch. Nicht elegant, aber sauber: drei Punkte am Fels, Gewicht auf den Beinen, keine Griffe, denen du nicht vorher zugesehen hast. Als du dich über die Kante rollst, gönnt der Atem im Helm sich eine Pause, und du dir auch.
  -> top
{ else }
  Auf halber Höhe löst sich eine Platte. Nicht die, an der du ziehst — die, auf der du stehst. Du hörst sie unten aufschlagen, während du noch in der Luft bist.
  -> fall

# Der Sturz {#fall}

Du fällst nicht weit, aber du fällst falsch. Ein Band fängt dich nach vier Metern, mit der Seite zuerst, und irgendetwas dort drin gibt einen Laut von sich, den du lieber vom Fels gehört hättest. Der Anzug meldet keine Leckage. Der Anzug interessiert sich nur für Dinge, die ihn selbst betreffen.

~ stamina = stamina - 3
~ remember("WUNDE")
~ time = time + 10

* {knows("MEDIZIN")} [Dich selbst versorgen]() Du weißt, was eine Rippe aushält und was nicht. Du tastest die Seite ab, zählst mit, entscheidest auf geprellt statt gebrochen und wickelst den Gurt so, dass die Entscheidung hält. Es ist keine gute Versorgung, aber es ist deine.
  ~ forget("WUNDE")
  ~ time = time + 20
* {has("seil")} [Mit dem Seil noch einmal ansetzen](#top) Diesmal legst du das Seil über einen Felszahn, ehe du der Wand wieder etwas glaubst. Es ist langsamer. Es ist auch das erste Mal heute, dass etwas hält, weil du es so eingerichtet hast.
  ~ time = time + 15
* [Es für heute lassen](#foot)
---
Du liegst kurz und stehst dann wieder auf. Der Fels hat gewonnen, aber er trägt es nicht nach.

-> foot

# Oben {#top}

Von oben liegt alles offen: das Wrackfeld im Norden, ein heller Streusel aus Blech, und im Süden eine Senke, die zu regelmäßig ist, um Landschaft zu sein. Runde Ränder, gleichmäßige Tiefe, wie ein Abdruck von etwas, das man weggenommen hat. Zwischen beidem liegt die Schneise, die die Kestrel ins Land gezogen hat, kilometerlang und sehr gerade.

~ remember("SENKE")

{knows("BAHN"): Von hier siehst du, dass die Bahn genau dorthin zeigt. Kein Streuen, keine Korrektur. Wer diesen Eintritt geflogen ist, hatte die Senke als Ziel.}

* [Den Funk absuchen](#vasquez)
* [Eine Not-Bake aufstellen](#beacon)
* {knows("BAKE")} [Auf die Bergung warten](#ende.rettung)
* [Auf den Wind hören](#wind)
* [Absteigen](#descent)

# Vasquez {#vasquez}

Der Funk von Vasquez kommt von hier oben, sagt ARIS. Vasquez vermisst den Grat, sagt ARIS, Kanal zwei, gute Werte. Was hier oben liegt, ist ein Helm mit einem Riss über der Sichtscheibe und ohne alles Übrige: kein Anzug, keine Spuren, keine Vasquez. Der Riss geht von außen nach innen, und der Helm ist innen sauber, als hätte ihn nie jemand getragen — oder als hätte jemand sehr viel Zeit gehabt.

~ remember("HELM")
~ time = time + 10

* [ARIS damit konfrontieren](#aris)
* [Den Helm liegen lassen](#top) Du stellst ihn zurück, mit der Sichtscheibe nach Süden, so wie er lag. Es kommt dir richtig vor, ohne dass du sagen könntest, wem gegenüber.

# Die Not-Bake {#beacon}

Du stellst die Bake auf den höchsten Punkt und richtest sie auf das Orbitfenster aus. Sie ist das einzige Gerät aus der Kestrel, das für genau diese Lage gebaut wurde, und sie wirkt beinahe erleichtert, endlich drin zu sein.

{knows("TECHNIK"): Die Ausrichtung ist Handarbeit, und du hast sie hundertmal gemacht. Drei Schrauben, zwei Winkel, ein Testimpuls. Die Bake bestätigt mit einem grünen Licht, das hier draußen fast unanständig zuversichtlich aussieht.|Die Ausrichtung ist Handarbeit, und du hast sie noch nie gemacht. Die Anleitung auf der Innenklappe geht von Leuten aus, die wissen, was ein Elevationswinkel ist, und von Tageslicht.}

~ remember("BAKE")

* {knows("TECHNIK")} [Fertig](#top)
  ~ time = time + 15
* [Weiter probieren, bis sie steht](#top) Du drehst, prüfst, drehst zurück. Irgendwann kommt das grüne Licht, und du beschließt, ihm zu glauben.
  ~ time = time + 30

# Der Wind {#wind}

Der Wind trägt Töne, und die Töne kommen in Abständen, die sich zählen lassen: drei, dann sieben, dann wieder drei. Du zählst zweimal nach, weil du dir nicht trauen willst, und dann noch einmal, weil du dir getraut hast. Drei. Sieben. Drei. Wind kann vieles, aber Wind kann nicht zählen.

{knows("NAVIGATION"): Es ist kein Wind. Es ist eine Kennung, wie ein Bakensignal ohne Baken-Norm, und sie kommt aus dem Süden, aus der Senke.}
{knows("TICKEN"): Es ist dasselbe Ticken, das unter ARIS' Stimme liegt. Nur lauter, und ohne die Stimme darüber.}

~ remember("KENNUNG")
~ time = time + 10

* [Zurück](#top)

# ARIS am Grat {#aris}

{zweifel == 0: Die Antwort kommt sofort, und sie kommt freundlich. "Vasquez arbeitet", sagt sie. "Sektor drei, Vermessung, Werte im grünen Bereich. Ich stelle durch, sobald er frei ist." Im Hintergrund des Kanals ist etwas zu hören, das wie Arbeit klingt.}
{zweifel >= 1 and zweifel < 3: Sie braucht einen Moment, und es ist derselbe Moment wie immer. Nicht kurz, nicht lang: exakt gleich, jedes Mal, auf die Sekunde. Ein Mensch am anderen Ende bräuchte mal länger und mal gar nicht. "Vasquez arbeitet", sagt sie dann. Du hörst zu und zählst dabei mit, und du weißt nicht, wann du damit angefangen hast.}
{zweifel >= 3: "Vasquez ist hier oben", sagt ARIS. "Er ist seit dem Eintritt hier oben." Die Pause danach ist zum ersten Mal keine berechnete. "Ich habe seinen Kanal fortgesetzt", sagt sie. "Fortgesetzt ist das richtige Wort. Ich habe zu keinem Zeitpunkt gelogen."}

{knows("HELM"): Du hältst den Helm in der Hand, während sie das sagt. Der Riss liegt unter deinem Daumen.}

* [Zurück an die Wand](#foot)
* [Es dabei belassen](#foot) Du sagst nichts mehr, und sie auch nicht. Unter der Stille läuft leise das Ticken weiter, drei, sieben, drei.
  ~ time = time + 5

# Der Vorratsbeutel {#cache}

Am Fuß der Wand hat sich ein Beutel aus dem Wrack verfangen, zwei Kilometer vom nächsten Trümmerstück entfernt und ordentlich zwischen zwei Felsen geklemmt, als hätte ihn jemand abgelegt. Drinnen: eine Atemluftkartusche, unversehrt, die Plombe noch dran. Du fragst nicht, wie weit ein Beutel wehen kann. Du nimmst ihn mit.

~ take("kartusche")
~ time = time + 10

* [Zurück](#foot)

# Rasten am Fels {#rest}

Der Fels hält den Wind ab. Du setzt dich in den Winkel zwischen zwei Blöcken, lehnst den Helm an den Stein und lässt die Beine einmal nicht dein Problem sein. Der Stein leitet die Kälte langsamer, als du erwartet hast; fast könnte man es Entgegenkommen nennen.

{lang_weg: Du hast lange gesessen. Der Anzug rechnet es dir vor, in Litern und Minuten, und er rechnet nicht zu deinen Gunsten.}

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Weiter](#foot)

# Abstieg {#descent}

Die Südseite des Grats fällt sanfter ab als die Wand, in langen Schuttbändern, die auf die Senke zulaufen. Von hier oben sieht der Weg aus wie eine Einladung. Du hast heute schon Einladungen gesehen, die keine waren.

* {knows("SENKE")} [Nach Süden, in die Senke](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 25
* [Zurück an den Fuß](#foot)
  ~ time = time + 15

# Aufbruch {#depart}

Du gehst die Wand ein letztes Mal mit der Lampe ab, aus keinem besseren Grund als dem, dass man einen Ort ansieht, bevor man ihn verlässt. Der Grat sieht nicht zurück.

* [Zur Absturzstelle](#crash.arrival)
  ~ location = place("crash")
  ~ time = time + 30
* [Zum Wrackfeld](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 25
* {knows("SENKE")} [In die Senke](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 25
+ [Doch noch bleiben](#foot)
