# Die Gruft {#crypt}

{!Kalte Luft schlägt dir entgegen.|Du kennst den Weg jetzt.}

![Ein Torbogen aus grob behauenen Steinen, dahinter nichts als Dunkelheit.](gruft.png)

{!Ein Goblin fährt aus einer Nische hoch.|Der Goblin wartet schon, die Klinge halb erhoben.}

!combat goblin
  win  -> chamber
  lose -> death
  flee [Zurück durch den Spalt](#start.begin) Du lässt mehr als deinen Stolz zurück.

## Die zweite Kammer {#chamber}

{has("silver-key"): Auf dem Sarkophag liegt nichts mehr.|Auf dem Sarkophag liegt ein silberner Schlüssel.}

* [Den Schlüssel nehmen](#chamber) Etwas seufzt in der Dunkelheit. Das Seufzen formt ein Wort: Kraken.
  ~ take("silver-key")
  ~ remember("KRAKEN")
+ [Zum eisernen Tor](#gate)

# Das eiserne Tor {#gate}

Das Tor schließt die Gruft nach Norden ab.

{ has("silver-key") and knows("KRAKEN") }
  Du flüsterst das Wort, und der Schlüssel dreht sich, als hätte er darauf gewartet.
  Mit dem Knirschen des Schlosses weicht die Kälte aus deinen Gliedern.
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
