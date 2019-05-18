# Overwatch random tournament
Tool for building balanced teams of random players for tournaments.

[Live version on GitHub Pages](https://adminimusru.github.io/OWRandomTournament/index.html)

## Features:
  * Automatic creation of balanced teams from given set of players. Teams are balanced by average SR, SR dispersion and player classes/roles;
    * Adjustable balance priority (SR / classes / SR dispersion);
    * Adjustable SR dispersion in teams;
    * Tweakable team average SR calculation depending on player's main class to reflect different gameplay impact;
    * Adjustable exponential SR scaling to reflect impact of high skilled players;
    * Separation of similar one-trick ponies;
    * Manual and automatic captains assignment;
    * Adjustable quality (number of iterations to build each team);
    * Remaining players can be benched in lobby or merged into teams with possibly poor balance (like 5 support mains) depending on converage setting;
  * Manual team and player management (transfers, team creation and deletion, sorting, captain assignment, editable team names);
  * Team and player sorting by name/SR/level/class/etc.;
  * All added players, created teams and settings automatically saved in browser storage;
  * Players are added by BattleTag, all stats (current competitive SR, level, most played heroes and roles/classes) are automatically acquired via [OWAPI](https://github.com/SunDwarf/OWAPI);
  * Batch player import with optional stats in text/csv format;
  * Batch stats updating;
  * Adjustable team size;
  * Created teams can be exported in text, HTML and image format;
  * Check-in feature (manual / importing list / Twitch chat);
  * Twitch integration: Twitch subscribers icons, chat bot for automated check-in;
  * Optional restrictions for partipiation: minimum level, Twitch subscription, check-in;
  
## Tournament bracket

Currently there is no built-in bracket generator. Export list of created teams and use external tools like [Challonge](https://challonge.com).

## Installation

No installation or build required, just open index.html with browser as file or setup any local HTTP server.

In file mode all features except Twitch integration will work in Firefox. For Chrome use --allow-access-from-files flag.

Twitch integration requires web server and registration on Twitch developer dashboard. Twitch AppID hardcoded in index.html is bound to GitHub Pages domain.
After [registering app on Twitch](https://dev.twitch.tv/docs/authentication/#registration), change client_id and redirect_uri in index.html (registering for localhost should work too).
