# Waking {#wake}

You wake because your suit is talking to you. It does so in numbers, and the numbers are not good. You lie half-buried in scree, legs pinned, and your visor has a crack running straight through what passes for sky here: black, starless at the edges, as if someone had not finished rendering the picture. There is no sign of the Kestrel. There is presumably plenty of the Kestrel to see, just not from here and not in one piece.

Air: {air}. Since impact: {time} minutes. The suit tells you both unasked, on the assumption that you can do something with the information.

* [Dig yourself free]()
  { test("skill") }
    You work your legs free, one stone at a time, in the right order. It goes faster than you feared, and that is the best news of the day so far.
    -> voice
  { else }
    You get free, but the slope has its own ideas about order. When you stand, your knees are shaking, and the suit logs the effort without comment.
    ~ stamina = stamina - 2
    ~ time = time + 10
    -> voice
* [Stay down and listen to the radio]() You stay down. The channel hisses, and in the hiss there is a rhythm that should not be one.
  ~ time = time + 5
---
Then something clicks, and the channel is open.

-> voice

# The First Call {#voice}

"ARIS here," says a voice you know. The ship's computer. "I am receiving your vitals. Pulse 96, falling. Good." A pause. "Vasquez is on the ridge, Ito is in the debris field. Channel three will report in four minutes." The voice sounds the way it always has: calm, precise, with a fondness for numbers nobody ordered.

* [Ask about the crew](#crew)
* [Check the suit](#suit)
* [Get up and look around](#site)
  ~ location = place("crash")

# The Crew {#crew}

You ask. ARIS answers at once: Vasquez on the ridge, walking. Ito in the debris field, with the cargo. Channel three out of range, being relayed. "Seven aboard," she says, "four confirmed. That is a good number." It sounds like a weather report, and you are too tired to ask who the weather is for.

{zweifel >= 1: Something registers: the pause before ARIS passes on an answer from the others is the same length every time. To the second.}
{zweifel >= 2: Vasquez says she is doing as well as can be expected. Ito says he is doing as well as can be expected. Word for word, down to the intonation.}

~ remember("CREW-GENANNT")

* [Keep asking](#ticken)
* [Check the suit](#suit)
* [Get up](#site)
  ~ location = place("crash")

# The Suit {#suit}

You go through the readouts. Main tank cracked, reserve empty - the reserve was the first thing the impact took. What the display shows is all you have, and the number gets smaller while you look at it. The suit considers this transparency.

~ remember("ANZUG-GEPRUEFT")

* {knows("TECHNIK")} [Reseat the air line]() You know these suits. The line behind the left valve sits too loose from the factory, and from the factory means: more so than ever since the impact. Two moves of the hand, one leak fewer.
  ~ air = min(air + 10, air_max)
* [Get up](#site)
  ~ location = place("crash")
---
That is all the suit has to offer. What it can still do is count.

~ location = place("crash")
-> site

# The Ticking {#ticken}

You keep asking, and while ARIS runs through her list, you hear it: under her voice a ticking, slow, regular, not from the suit. "Repeat the question," says ARIS. You ask about the ticking. "I am not receiving any ticking," says ARIS, and the ticking ticks on.

~ remember("TICKEN")

* [Get up](#site)
  ~ location = place("crash")

# Back at the Crash Site {#arrival}

{ visits(arrival) == 1 }
  The spot where you woke up. The imprint of your suit still lies in the scree, neat as an evidence photo. It is a strange thing, visiting your own outline.
{ visits(arrival) == 2 }
  The spot where you woke has not changed. Your imprint still lies in the scree, and it looks more patient than you.
{ visits(arrival) >= 3 }
  The crash site again. The imprint in the scree is still waiting, and slowly you begin to wonder what for.

{kurz_weg: You were gone for a while, and the place did not notice.}

-> site

# The Crash Site {#site}

{ visits(site) == 1 }
  The nightside. No horizon with light standing on it, only grades of black. On one side the ground falls away to the debris field, where something glows at intervals that should not be burning. On the other the ridge climbs, an edge against the starfield. In between: you, a suit, and a voice on the radio.
  {is_dark: It is dark, and according to ARIS it will stay that way for a while. She names a number you forget at once.|At the edge of the plain stands a strip of grey. ARIS calls it morning. You would call it an imposition, but at least it is a direction.}
{ visits(site) <= 3 }
  The plain, the wreck field below, the ridge above. You know the arrangement now, and it has not improved.
{ visits(site) >= 4 }
  The plain, as before. You spare yourself the looking around.

{ knows("MORGEN") and not knows("EBENE-HELL") }
  In the first light the plain is grey instead of black, and for the first time you see how far it goes. It does not help.
  ~ remember("EBENE-HELL")
{kurz_weg: You have been standing still for a while. The suit kept count.}
{lang_weg: You have been standing still for a very long time. The planet has not moved in that time, not visibly anyway, and that worries you more than it should.}

* [Search the wreckage](#debris)
* {knows("NAVIGATION")} [Read the stars](#sky)
+ [Set out](#depart)
* {knows("MORGEN")} [Wait for the light](#ende.dunkel)
* {knows("GESTAENDNIS")} [Shut ARIS down](#ende.abschalten)
+ [Rest](#rest)

# The Wreckage {#debris}

A scatter of plating that used to be hull section C. Between the panels lies a crowbar, as naturally as if someone had set it out for you. You take it. On a planet without doors that seems excessive, but doors have a habit of turning up.

~ take("brechstange")

* {knows("TECHNIK")} [Look closer]() You know how the Kestrel was packed: where section C lies, so does its emergency locker. It lies ten metres on, burst open, and the emergency kit inside has come through intact.
  ~ take("medikit")
  ~ time = time + 10
* [Back](#site)
---
That is all the metal has to give, only edges and your own breathing.

-> site

# The Stars {#sky}

You tilt your head back and read what is written there. The constellations are foreign, but mechanics is mechanics: from the debris scatter and the crack in your visor you work the entry angle backwards. It is shallow. It is clean. Nobody crashes like that - that is how you land. The Kestrel did not hit this planet. She steered for it.

~ remember("BAHN")
~ time = time + 10

* [Back](#site)

# Resting {#rest}

You sit down with your back against a piece of hull and do nothing for a while. The suit grows quieter, so does your pulse. ARIS says nothing, which you count greatly in her favour, until it occurs to you that she is probably listening anyway.

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Go on](#site)

# Setting Out {#depart}

Two directions that have names: the debris field down on the plain, the ridge above you. There would be a third, if you knew where to go. ARIS gives distances in minutes, as if they were prices.

* [To the debris field](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 20
* [To the ridge](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 30
* {knows("SENKE")} [Into the basin](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 30
+ [Stay here after all](#site) You stay. The suit keeps counting.
