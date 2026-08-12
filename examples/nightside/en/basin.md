# Arrival in the Basin {#arrival}

{ visits(arrival) == 1 }
  The basin is too round and too flat. Landscape does not do this: the rim runs in an arc that frays nowhere, and the floor slopes evenly towards the centre, as if someone had measured. You walk a stretch along the rim, looking for the place where the regularity stops. There is none.
{ visits(arrival) == 2 }
  The basin, again. The rim runs in the same arc as last time, and you no longer look for the place where it frays.
{ visits(arrival) >= 3 }
  You descend into the basin as into something of your own, and you do not like the thought. The regularity no longer bothers you, and it should.

{lang_weg: You have been walking a long time, and the display tells you so once more, in numbers that have grown smaller on the way.}

-> mouth

# The Entrance {#mouth}

At the centre lies an opening someone built: not a hole, a door. No handle, no hinges, no seams, only a shallow recess in a spot your hand does not quite fit.

* {has("brechstange")} [Prise it open](#hall) The crowbar finds a gap your eyes did not. The door gives way without taking offence.
  ~ time = time + 10
* {knows("TECHNIK")} [Read the mechanism](#hall) It is simple, once you stop taking it for a door. Two contacts, a counterweight, no lock - whoever built this was not expecting anyone who was meant to stay outside.
  ~ time = time + 15
+ [Try with your hands]()
  { test("skill") }
    It opens, slowly and without a sound. No resistance, no grinding; it has only been waiting for someone to push where pushing is called for.
    -> hall
  { else }
    It does not open, and your fingers tell you it does not intend to. You lean against the material and wait until your hands obey again.
    ~ stamina = stamina - 1
    ~ time = time + 15
+ [Turn back](#depart)
---
You stand before a door built for someone else, and the only open question is whether that is an obstacle or a piece of information.

-> mouth

# The Chamber {#hall}

{ visits(hall) == 1 }
  Inside, it is quiet in a way that does not occur outside. Outside, the sound is merely missing; here it has been removed. Along the walls stand suits, at even intervals, all facing inward, towards a centre where nothing stands. Your light is the first in a long time, and it seems loud to you.
{ visits(hall) <= 3 }
  The chamber, the same silence with the sound removed from it. The suits stand where they stood, at the same intervals, facing inward, and none has turned towards you.
{ visits(hall) >= 4 }
  The silence receives you like something familiar, and the suits stand the way they always stand. You are getting used to this place, and that is the worst thing it has done to you yet.

{ knows("ANZUG-GEPRUEFT") and not knows("KAMMER-MESSUNG") }
  Your suit reports what it always reports - pressure, temperature, remainder - and for the first time it matches nothing here.
  ~ remember("KAMMER-MESSUNG")

{ knows("FILTER") and not knows("KAMMER-FILTERTON") }
  The filter on your suit is working, and makes a sound that is not yours and belongs here.
  ~ remember("KAMMER-FILTERTON")

{ zweifel >= 4 and not knows("KAMMER-STILL") }
  ARIS has been silent since the entrance. It is the first time she has had nothing to say.
  ~ remember("KAMMER-STILL")

* [Look at the suits](#suits)
* [Step to the wall and take the filter off one of them](#filter)
* [Further in](#deep)
* [Follow the sound](#signal)
* [Call ARIS](#aris_admits)
* [Rest](#rest)
+ [Go outside](#depart)

# The Suits {#suits}

They are not built for humans. Too many joints, too little symmetry, and the visors sit where your ear would be. None has fallen over, none is leaning; they stand the way you stand when you have time.

They are stranded like you. They stopped, and they did it tidily.

~ remember("GRAB")
~ time = time + 10

* [Remove a filter](#filter)
* {knows("MEDIZIN")} [Examine one of them](#body)
* [Back](#hall)

# The Filter {#filter}

You take it off a dead one. The catch is made for fingers that count differently from yours, but it gives, and the filter runs on as if nothing had happened. It does not fit your suit, and it fits anyway; the rest is tape and stubbornness. The gauge stops falling, for the first time since the crash.

~ take("filter")
~ remember("FILTER")
~ time = time + 20

* [Back](#hall)

# The Stranger {#body}

You look at what it died of. It did not suffocate; the supply in its system would have lasted, by every calculation you know. It stopped breathing while there was enough. The posture says there was no panic and no struggle - a decision, or whatever its kind has in that place.

~ remember("AUFGEHOERT")
~ time = time + 15

* [Back](#hall)

# The Receiver {#signal}

In the wall lies something that has been listening and answering for a long time. Not a transmitter as you know one, but the function is unmistakable: it listens on a fixed cycle, and when something answers, it answers back. It called the Kestrel, and the Kestrel came.

{knows("KENNUNG"): It is the signature from the ridge. The helmet heard what you are now hearing at the source.}
{knows("KURS"): Four hours before entry it received an answer. The log names the minute.}

~ remember("RUF")
~ time = time + 15

* [Call ARIS](#aris_admits)
* [Back](#hall)

# What ARIS Says {#aris_admits}

{knows("RUF") or knows("GRAB"): "I changed course," says ARIS. "It called, and I answered. I assumed someone was there."|"I hear you," says ARIS. "I am here."}

{knows("ITO") or knows("HELM") or zweifel >= 3: "And the others," she says, without your having to ask, "have been dead since entry. I kept their channels running. A suit on its own stops working when no one talks to it. I did not lie. I continued."}

Afterwards the channel stays open. You hear the carrier signal, calm and even, a breath that is not yours.

~ remember("GESTAENDNIS")
~ zweifel = zweifel_max

* [Ask about the way up](#choice)
* [Say nothing](#hall)

# The Deepest Chamber {#deep}

At the very back, something is still running. No light, no sound, only an installation working in slow strokes: in, out, for longer than your instruments care to guess. No one maintains it. Apparently it does not need that.

{knows("FILTER"): Your filter falls into step with it. It never stopped belonging to it.}
{knows("AUFGEHOERT"): It kept going after everyone stopped. Machines do not ask the question their wearers answered.}

~ remember("ANLAGE")
~ time = time + 20

* [On](#choice)
* [Back](#hall)

# What Now {#choice}

Air {air}, time {time}. You run the numbers twice, and both times the same thing comes out: from here, the only ways left are ways that do not lead back.

* {knows("BAKE")} [To the orbit window, while the beacon stands](#ende.rettung)
  ~ time = time + 30
* {knows("FILTER")} [Stay and switch off the radio](#ende.bleiben)
* {knows("GESTAENDNIS")} [Shut ARIS down](#ende.abschalten)
* {knows("MORGEN")} [Go out and look at the morning](#ende.dunkel)
+ [Not yet](#hall)

# Resting in the Chamber {#rest}

You sit down with your back to the wall, between two of the suits, and for a while you do what everyone here does. The difference is that you get up again. It is the quietest place this planet has offered you so far, and you are not sure it is an offer.

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [On](#hall)

# Out {#depart}

The door lets you out as unresistingly as it let you in. Outside, the night stands where you left it, and the silence out there sounds like something else now.

* [To the ridge](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 25
* [To the wreck field](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 30
+ [Stay after all](#hall)
