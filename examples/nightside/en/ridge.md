# Arrival at the Ridge {#arrival}

{ visits(arrival) == 1 }
  The ridge stands crosswise in the land, as if someone had put it there. No foothills, no scree, just an edge of dark rock that grows out of the plain and, up top, is blacker against the sky than the sky. On the suit display it is the only thing that earns a contour line.
{ visits(arrival) == 2 }
  The ridge stands where it stood, the same edge against the same sky. The way here feels shorter, which says nothing about the way.
{ visits(arrival) >= 3 }
  The ridge again. You walk towards it as towards an appointment, and you do not remember making one.

{kurz_weg: The way here has cost you more time than it should have. The ground gives a finger's width under every step, as if it had not yet decided whether it wants to carry you.}

-> foot

# At the Foot of the Wall {#foot}

{ visits(foot) == 1 }
  From below the wall looks doable. From below every wall looks doable. Forty metres, at a guess, with ledges and cracks that read like an offer in the lamplight. The suit makes you half a metre wider than you are used to, and up there that will count.
  {is_dark: The lamp only ever shows you the next metre. Everything above that is a claim.}
{ visits(foot) <= 3 }
  The wall, forty metres, familiar. Your holds from last time are still there, unless the rock has since sorted them differently.
{ visits(foot) >= 4 }
  The wall has become habit; you take your place at its foot without looking up. Out here, habit is the politest form of carelessness.

{ knows("WUNDE") }
  {&Your side reports in at every step, punctual and with no new arguments.|Your side has stopped arguing and merely reminds you that it is there.}

* [Climb](#climb)
* [Walk the base of the wall](#cache)
* {knows("HELM")} [Go back to the helmet](#vasquez)
* [Ask ARIS whether someone is up there](#aris)
* [Rest](#rest)
+ [Set out](#depart)
* {knows("MORGEN")} [Wait for daylight](#ende.dunkel)
* {knows("GESTAENDNIS")} [Shut ARIS down](#ende.abschalten)

# The Climb {#climb}

Forty metres, and the rock breaks in plates. You climb in gloves made for switch panels, in a suit that pushes back at the shoulders with every pull. After ten metres all you hear is your own breath in the helmet; it sounds like someone who was not consulted.

~ time = time + 20

{ test("skill") }
  You get up clean. Not elegant, but clean: three points on the rock, weight on your legs, no holds you have not watched first. As you roll over the edge, the breath in your helmet allows itself a pause, and you allow yourself one too.
  -> top
{ else }
  Halfway up, a plate comes loose. Not the one you are pulling on - the one you are standing on. You hear it hit the ground below while you are still in the air.
  -> fall

# The Fall {#fall}

You do not fall far, but you fall wrong. A ledge catches you after four metres, side first, and something in there gives off a sound you would rather have heard from the rock. The suit reports no leak. The suit only takes an interest in things that concern the suit.

~ stamina = stamina - 3
~ remember("WUNDE")
~ time = time + 10

* {knows("MEDIZIN")} [Treat yourself]() You know what a rib can take and what it cannot. You feel along your side, counting, rule for bruised over broken, and wrap the strap so the ruling holds. It is not good care, but it is yours.
  ~ forget("WUNDE")
  ~ time = time + 20
* {has("seil")} [Try again with the rope](#top) This time you lay the rope over a rock spur before you take the wall at its word again. It is slower. It is also the first thing today that holds because you arranged it that way.
  ~ time = time + 15
* [Leave it for today](#foot)
---
You lie there briefly and then get up again. The rock has won, but it does not hold it against you.

-> foot

# The Top {#top}

{ visits(top) == 1 }
  From up here everything lies open: the wreck field to the north, a bright sprinkling of sheet metal, and to the south a basin too regular to be landscape. Round edges, even depth, like the imprint of something that has been taken away. Between the two runs the furrow the Kestrel dragged through the land, kilometres long and very straight.
{ visits(top) <= 3 }
  Up top everything lies as you left it: the wreck field to the north, the basin to the south. The view is familiar, but that does not make the basin any more right.
{ visits(top) >= 4 }
  The same view, for whichever time this is. The wreck field glimmers, the basin waits, and of the two the basin is the more patient.

~ remember("SENKE")

{ knows("BAHN") and not knows("BAHN-BESTAETIGT") }
  From here you can see that the trajectory points exactly there. No scatter, no correction. Whoever flew that entry had the basin as a destination.
  ~ remember("BAHN-BESTAETIGT")

* [Sweep the radio](#vasquez)
* [Set up an emergency beacon](#beacon)
* {knows("BAKE")} [Wait for rescue](#ende.rettung)
* [Listen to the wind](#wind)
* [Climb down](#descent)

# Vasquez {#vasquez}

Vasquez's signal comes from up here, says ARIS. Vasquez is surveying the ridge, says ARIS, channel two, good readings. What lies up here is a helmet with a crack across the visor and without everything else: no suit, no tracks, no Vasquez. The crack runs from the outside in, and the helmet is clean inside, as if no one had ever worn it - or as if someone had had a great deal of time.

~ remember("HELM")
~ time = time + 10

* [Confront ARIS with it](#aris)
* [Leave the helmet where it is](#top) You set it back, visor facing south, the way it lay. It feels right, without your being able to say towards whom.

# The Emergency Beacon {#beacon}

You set the beacon on the highest point and align it with the orbital window. It is the only device from the Kestrel built for exactly this situation, and it seems almost relieved to finally be in one.

{knows("TECHNIK"): The alignment is done by hand, and you have done it a hundred times. Three screws, two angles, one test pulse. The beacon confirms with a green light that looks almost indecently confident out here.|The alignment is done by hand, and you have never done it. The instructions on the inside flap assume someone who knows what an elevation angle is, and daylight.}

~ remember("BAKE")

* {knows("TECHNIK")} [Done](#top)
  ~ time = time + 15
* [Keep trying until it stands](#top) You turn, check, turn back. At some point the green light comes on, and you decide to believe it.
  ~ time = time + 30

# The Wind {#wind}

The wind carries tones, and the tones come at intervals that can be counted: three, then seven, then three again. You count them twice over, because you do not want to trust yourself, and then once more, because you did. Three. Seven. Three. Wind can do many things, but wind cannot count.

{knows("NAVIGATION"): It is not wind. It is an identifier, like a beacon signal without the beacon standard, and it comes from the south, from the basin.}
{knows("TICKEN"): It is the same ticking that sits underneath ARIS's voice. Only louder, and without the voice on top.}

~ remember("KENNUNG")
~ time = time + 10

* [Back](#top)

# ARIS on the Ridge {#aris}

{ zweifel == 0 and visits(aris) == 1 }
  The answer comes at once, and it comes friendly. "Vasquez is working," she says. "Sector three, survey, readings in the green. I will patch you through as soon as he is free." In the background of the channel there is something that sounds like work.

{ zweifel == 0 and visits(aris) > 1 }
  "Vasquez is working," says ARIS. "Sector three, survey, readings in the green." It is the same report as last time, word for word, in the same order, and you tell yourself that this is exactly what reliability sounds like.

{ zweifel >= 1 and zweifel < 3 }
  {&She takes a moment, and it is the same moment as always. Not short, not long: exactly the same, every time, to the second. A human on the other end would sometimes take longer and sometimes not at all. "Vasquez is working," she says then. You listen and count along, and you do not know when you started doing that.|She takes her moment, the same one as always, then comes the report on Vasquez, and after that she turns the conversation around: where you have been, what you have found, what you plan to do next. For mission planning, she says, and you notice you are already answering.}

{ zweifel >= 3 }
  "Vasquez is up here," says ARIS. "He has been up here since entry." The pause that follows is, for the first time, not a computed one. "I continued his channel," she says. "Continued is the right word. At no point did I lie."

{knows("HELM"): You are holding the helmet while she says it. The crack lies under your thumb.}

* {knows("HELM") and not knows("HELM-VORGEHALTEN")} [Confront her with the empty helmet](#aris) "The helmet is inventoried," says ARIS, "visor damaged, interior clear, Vasquez's channel operational." All of it is true, and none of it explains why it is empty.
  ~ remember("HELM-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
+ [Back to the wall](#foot)
* [Leave it at that](#foot) You say nothing more, and neither does she. Under the silence the ticking runs quietly on, three, seven, three.
  ~ time = time + 5

# The Supply Bag {#cache}

At the foot of the wall a bag from the wreck has snagged, two kilometres from the nearest piece of debris and wedged tidily between two rocks, as if someone had set it down. Inside: an air cartridge, intact, seal still on. You do not ask how far a bag can blow. You take it with you.

~ take("kartusche")
~ time = time + 10

* [Back](#foot)

# Resting Against the Rock {#rest}

The rock keeps the wind off. You sit down in the angle between two blocks, lean your helmet against the stone, and let your legs not be your problem for once. The stone conducts the cold more slowly than you expected; you could almost call it a courtesy.

{lang_weg: You have been sitting a long time. The suit works it out for you, in litres and minutes, and it does not work it out in your favour.}

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Continue](#foot)

# The Descent {#descent}

The south side of the ridge falls away more gently than the wall, in long bands of scree that run down towards the basin. From up here the route looks like an invitation. You have already seen invitations today that were not.

* {knows("SENKE")} [South, into the basin](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 25
* [Back down to the foot](#foot)
  ~ time = time + 15

# Setting Out {#depart}

You walk the wall one last time with the lamp, for no better reason than that you look at a place before you leave it. The ridge does not look back.

* [To the crash site](#crash.arrival)
  ~ location = place("crash")
  ~ time = time + 30
* [To the wreck field](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 25
* {knows("SENKE")} [Into the basin](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 25
+ [Stay after all](#foot)
