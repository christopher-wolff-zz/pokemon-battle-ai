'use strict';

var Bot = require('./bot');
var Config = require('./config/config');
var Team = require('./teams/team1');

// todo: save these in config file
var serverURL = Config.serverURL;

var username = Config.username;
var password = Config.password;

// Start bot
var bot = new Bot(username, password);
bot.connect(serverURL);
setTimeout(function() {
  bot.loadTeam(Team);
  //bot.searchBattle('randombattle');
}, 3000);
