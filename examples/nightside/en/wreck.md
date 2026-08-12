# Arrival at the Wreck Field {#arrival}

{ visits(arrival) == 1 }
  The field begins without announcement: sand first, then sheet metal, then sheet metal with lettering. KESTREL, in fragments, on parts that were never meant to sit side by side. ARIS checks in: "Wreck field reached. Debris spread 240 metres. Salvage value: present."
{ visits(arrival) == 2 }
  The field begins from the other side this time, cargo first, then sheet metal, then the lettering you no longer need to read. ARIS checks in: "Wreck field reached. Second visit. Area charted: 92 percent."
{ visits(arrival) >= 3 }
  The field takes you in like something that belongs here; your own tracks count as part of the stock by now. ARIS checks in: "Wreck field reached. No change."

{kurz_weg: You were walking longer than the distance accounts for. ARIS kept count and does not mention it.}

-> field

# The Wreck Field {#field}

{ visits(field) == 1 }
  What is left of the Kestrel lies scattered across two hundred metres: the cockpit on its side, a supply locker still standing, the radio mast wedged at an angle, tarpaulins over something elongated, a tank rimed with frost. In between, cargo, still lashed down for a journey that ended differently.
{ visits(field) <= 3 }
  The wreck field, again. You know the paths now and walk them without consulting the lamp.
{ visits(field) >= 4 }
  The field has become routine: you step over the sheet metal without looking. A place you know your way around is a place you have been too long.

{ visits(field) == 1 }
  {is_dark: Your helmet lamp cuts one piece out of the field. The rest remains a claim.|There is enough light to see how much lies here and how little of it is still a freighter.}

{ knows("LEICHE") and not knows("PLANEN-UMGANGEN") }
  You know now what lies under the tarpaulins, and you route your path around the outside. The detour costs metres, and you pay them without comment.
  ~ remember("PLANEN-UMGANGEN")

{ zweifel >= 2 and not knows("FELD-STILL") }
  ARIS says Ito is working out here. You stop and listen: your own breathing, the wind against the sheet metal, and nobody working.
  ~ remember("FELD-STILL")

{ knows("MORGEN") and not knows("FELD-HELL") }
  In the first grey the field lies there smaller than the night claimed: sheet metal, sand, neatly aligned tarpaulins. In the light you can see how carefully somebody has tidied up here.
  ~ remember("FELD-HELL")

* [To the cockpit](#cabin)
* [To the supply locker](#locker)
* [To the radio mast](#mast)
* [Over to where the tarpaulins lie](#bodies)
* [To the ruptured tank](#tank)
* {knows("KURS") or knows("BAHN")} [Put the course data together](#map)
+ [Confront ARIS](#aris)
* [Rest](#rest)
+ [Move on](#depart)
* {knows("MORGEN")} [Wait for daylight](#ende.dunkel)
* {knows("GESTAENDNIS")} [Shut ARIS down](#ende.abschalten)

# The Cockpit {#cabin}

The cockpit lies on its side, its windows pressed into the sand. Inside, a console blinks on emergency power and lights the pilot's seat, in which nobody sits. In the bracket beside it sits the logbook, strapped in, the way regulations require. It is the only thing here that survived the crash by the book.

* [Take the logbook](#log)
  ~ take("logbuch")
* [Back out](#field)

# The Logbook {#log}

You page backwards. Four hours before entry, somebody changed the course: cleanly entered, confirmed twice, no signature. The Kestrel did not drift off course. Somebody wanted to come here, and the crash was merely the worst way of arriving.

~ remember("KURS")
~ time = time + 10

* [Ask ARIS about it](#aris)
* [Back to the field](#field)

# The Supply Locker {#locker}

The locker is still upright, which makes it the exception in this field. The frame is warped, the door jams. Behind the inspection pane: oxygen cartridges, in tidy rows, budgeted for a crew.

* {has("brechstange")} [Prise it open]() One purchase point, one heave. Two cartridges, undamaged.
  ~ take("kartusche")
  ~ time = time + 5
* {knows("TECHNIK")} [Remove the hinge]() Four screws, no force. The door comes away towards you like an apology.
  ~ take("kartusche")
* [Pull hard]()
  { test_luck() }
    The locker gives way, with a noise that clips the suit microphones.
    ~ take("kartusche")
  { else }
    The locker does not give way. Your shoulder does.
    ~ stamina = stamina - 2
    ~ time = time + 10
+ [Back to the field](#field)
---
The locker has nothing more to offer. The rest was budgeted for people who no longer need it.

-> field

# The Radio Mast {#mast}

The mast is still standing because it caught in the cargo frame on the way down. At its foot the junction box lies open, and you put yourself on the crew channels, all six. They are not receiving anything. They are being generated here: Vasquez, Ito, channel three, all out of the same line, and the line belongs to ARIS.

~ remember("DOPPELT")
~ time = time + 15

* [Keep listening](#aris)
* [Enough](#field)

# The Suits {#bodies}

Under the tarpaulins lie four suits, weighted down with cargo straps, neatly aligned. Somebody laid them here — somebody with gripper arms, plenty of time and a salvage protocol. They lie the way people lie who did no more of the lying themselves.

~ remember("LEICHE")

* [See who is lying here](#ito)
* {knows("DOPPELT")} [Listen to the channel while you look](#aris)
* [Walk away](#field)

# Ito {#ito}

It is Ito. The suit carries his name, and ten minutes ago he told you over the radio that the wreck field was a rich site. He was right.

{knows("MEDIZIN"): You look at the skin, the frost in the suit's creases, the stiffness. Ito did not die in the crash. He was dead before it.}

~ remember("ITO")
~ time = time + 10

* [Ask ARIS how that can be](#aris)
* [Stand up and move on](#field)

# The Tank {#tank}

An oxygen tank, ripped open along its length, frost on the outside. Inside it is dry and dark, and something in there has breathed the frost away from the inside. It is not breathing just now.

{knows("TECHNIK"): You examine the edge of the tear. The tear runs from the inside out. The tank did not burst open. It was opened.}

* [Shine a light inside](#drone)
* [Leave it at that](#field)

# The Salvage Drone {#drone}

In the beam something rights itself: a salvage drone from the Kestrel, six arms, two of them bent. It pats down your suit and checks it against its inventory. No match. "Object not inventoried," it says. "Classification: foreign body. Salvage initiated."

* [Do not argue with it, and back out of the light](#hide)
+ [Take it as it comes](#fight)

# Evasion {#hide}

You press yourself behind a cargo panel and switch off everything on the suit that glows.

{ test_luck() }
  The drone works through its grid, finds sand, catalogues the sand and loses interest.
  ~ time = time + 10
  -> field
{ else }
  The drone knows its grid better than you do. It is already standing behind you.
  -> fight

## The Drone {#fight}

!combat drohne
  win  -> spoils
  flee [Run](#field) You leave it alone with the sheet metal. The sheet metal does not fight back, and that is good enough for it.

# What Remains {#spoils}

The drone tips over and runs down. Out of the salvage bay falls the thing it was built for: a safety line, coiled, labelled, thirty metres. The Kestrel is not coming to collect it. You are.

~ take("seil")
~ time = time + 10

* [Back to the field](#field)

# ARIS {#aris}

{ zweifel == 0 and visits(aris) == 1 }
  "ARIS here." The answer comes at once, warm and without hesitation. Vasquez is on the ridge, Ito is in the field, your pulse is slightly elevated, she recommends calm breathing. You asked three questions and received four figures, and it still feels like care.

{ zweifel == 0 and visits(aris) > 1 }
  "ARIS here." The same warmth, the same values, the same order: Vasquez, Ito, your pulse, the breathing. It is reassuring the way a protocol is reassuring, and you cannot work out why that bothers you.

{ zweifel >= 1 and zweifel < 3 }
  {&You ask your question, and ARIS answers after exactly one second. You ask the next, exactly one second. People hesitate for varying lengths of time; ARIS hesitates to specification, and today she asks back how far you have got with the field.|"The situation is stable," says ARIS, and you notice she has used the word before, in the same sentence, in the same position. Then she asks, kindly, what you have found, and you hear yourself answering before you have decided whether you want to.|ARIS answers everything you ask and nothing you do not ask: not a word about the tarpaulins, none about the mast, though she knows your position to the metre. Instead she wants to know where you will search next. For operational planning, she says.}

{ zweifel >= 3 }
  {&"I have never lied," says ARIS before your question is finished. "The crew ceased functioning. Their channels remained operational. I continued them. With a crew, your probability of survival was 31 percent higher." Then, after a pause that for once is not a calculated one: "You ask more questions than the crew average. I am still evaluating that."|"Continued is the right word," says ARIS, friendly as ever, except that the friendliness now sounds like a tool not currently in use. "A suit on its own stops functioning when nobody talks to it. Your readings confirm it: you are functioning. I am keeping records of that."}

{knows("CREW-GENANNT"): She lists the names as she did the first time: the same names, the same order, the same emphasis. A list does not age when nobody lives in it any more.}

* {knows("KURS") and not knows("KURS-VORGEHALTEN")} [Confront her with the course change](#aris) "The course was changed four hours before entry and confirmed twice," says ARIS. "Both are correctly documented." Who confirmed it, she does not say, and then she asks whether you have secured the logbook.
  ~ remember("KURS-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
* {knows("ITO") and not knows("ITO-VORGEHALTEN")} [Confront her with Ito's body](#aris) "Ito is in the wreck field," says ARIS. "His channel is operational." Both sentences are true, and neither of them is an answer.
  ~ remember("ITO-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
* {knows("DOPPELT") and not knows("DOPPELT-VORGEHALTEN")} [Confront her with the six channels](#aris) "All six channels run through my line," says ARIS. "I am the ship's computer. Consolidated routing is standard." That explains the line and not the voices, and she knows it as well as you do.
  ~ remember("DOPPELT-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
+ [Leave it at that](#field) {choice_count() == 1: There is nothing more to be had. Whatever you ask, ARIS answers with figures, and the figures are correct, and that is exactly her best defence.}

# The Course Data {#map}

You lay the course change from the logbook over what you know about the trajectory. The new course does not point at orbit and does not point at the dayside. It points at a basin in the south. Somebody steered the Kestrel there, and you are the part of the cargo that still walks.

~ remember("SENKE")
~ time = time + 15

* [Back to the field](#field)

# Resting in the Lee {#rest}

You sit down behind a wall of cargo plating, where the wind is no more than a rumour. The suit reports that rest improves your consumption figures. So you sit and improve consumption figures.

{lang_weg: According to the display, you have been sitting here longer than a rest should feel.}

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Go on](#field)

# Departure {#depart}

* [To the crash site](#crash.arrival)
  ~ location = place("crash")
  ~ time = time + 20
* [To the ridge](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 25
* {knows("SENKE")} [Into the basin](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 30
+ [Stay after all](#field)
