'use strict';

var Bot = require('./bot');
var team1 = require('./teams/team1');

// todo: save these in config file
var serverURL = 'ws://sim.psim.us:8000/showdown/';

var username = 'beepboopbot';
var password = 'notabot';

var sampleTeam = ']Chansey||Eviolite|Natural Cure|Thunder Wave, Soft-Boiled, Seismic Toss, Heal Bell|Bold|248,,252,,8,0||,,,,,|||';

// Start bot
var bot = new Bot(username, password);
bot.connect(serverURL);
setTimeout(function() {
  bot.loadTeam(team1);
  //bot.searchBattle('randombattle');
}, 3000);
