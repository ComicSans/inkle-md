# Die Gruft {#crypt}

{!Kalte Luft schlägt dir entgegen.|Du kennst den Weg jetzt.}

Ein Goblin fährt aus einer Nische hoch.

!combat goblin
  win  -> chamber
  lose -> death
  flee [Zurück durch den Spalt](#start.thicket) Du lässt mehr als deinen Stolz zurück.

## Die zweite Kammer {#chamber}

{!Auf dem Sarkophag liegt ein silberner Schlüssel.|Der Sarkophag liegt offen und leer.}

* [Den Schlüssel nehmen](#chamber) Etwas seufzt in der Dunkelheit.
  ~ take("silver-key")
  ~ remember("KRAKEN")
+ [Zum eisernen Tor](#gate)

# Das eiserne Tor {#gate}

Das Tor schließt die Gruft nach Norden ab.

{ has("silver-key") and knows("KRAKEN") }
  Der Schlüssel dreht sich, als hätte er auf dich gewartet.
  ~ heal(2)
{ else }
  Ohne Schlüssel und ohne das Wort bleibt das Tor, was es ist.
  -> chamber

* [Hinaus ins Licht](#daylight)

# Wieder im Licht {#daylight}

Hinter dem Tor steigt der Gang an, und irgendwo darüber steht die Sonne.

Dein Abenteuer endet gut, mit {gold} Goldstücken in der Tasche.

-> END

# Gestorben {#death}

Dein Abenteuer endet hier.

-> END

# fn heal(amount)
~ stamina = min(stamina + amount, stamina_max)
~ return stamina
