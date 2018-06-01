'use strict';

const Bot = require('./bot')
const team = require('../data/teams/team1');

// Options
let options = {
    debug: true,
    actionUrl: 'https://play.pokemonshowdown.com/~~showdown/action.php',
    serverUrl: 'ws://sim.psim.us:8000/showdown/',
    username: 'beepboopbot',
    password: 'notabot',
    avatar: 0
};

var bot = new Bot(options);
bot.connect();
setTimeout(function() {
    bot.searchBattle('randombattle');
}, 3000);
