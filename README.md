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
  * Check-in feature (manual or by importing list);
  
## Tournament bracket

Currently there is no built-in bracket generator. Export created teams to external tools like [Challonge](https://challonge.com).
