# Overwatch random tournament
Tool for building balanced teams of random players for tournaments.

[Live version on GitHub Pages](https://adminimusru.github.io/OWRandomTournament/index.html)

## Features:
  * Automatic creation of balanced teams from given set of players. Teams are balanced by average SR and player classes/roles;
    * Adjustable balance priority (SR or classes);
    * Tweakable average SR calculation depending on player's main class to reflect different gameplay impact;
    * Separation of similar one-trick ponies;
    * Adjustable quality (number of iterations to build each team);
    * Remaining players can be benched in lobby or merged into teams with possibly poor balance (like 5 support mains) depending on converage setting;
  * Manual team and player management (transfers, team creation and deletion, sorting, captain assignment, editable team names);
  * All added players, created teams and settings automatically saved in browser storage;
  * Players are added by BattleTag, all stats (current competitive SR, level, most played heroes and roles/classes) are automatically acquired via [OWAPI](https://github.com/SunDwarf/OWAPI);
  * Batch player import with optional stats in text format;
  * Batch stats updating;
  * Adjustable team size;
  * Created teams can be exported in text, HTML and image format, optionally with players and their stats;
  
## Tournament bracket

Currently there is no built-in bracket generator. Export created teams to external tools like [Challonge](https://challonge.com).
