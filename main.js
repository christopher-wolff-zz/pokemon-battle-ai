'use strict';

var MyBot = require('./mybot');
var Config = require('./config/config');
var Team = require('./teams/team1');

// todo: save these in config file
var serverURL = Config.serverURL;

var username = Config.username;
var password = Config.password;

// Start bot
var mybot = new MyBot(username, password);
mybot.connect(serverURL);
setTimeout(function() {
  mybot.loadTeam(Team);
  mybot.challengeUser('cosine180', 'ou');
  //bot.searchBattle('randombattle');
}, 3000);
