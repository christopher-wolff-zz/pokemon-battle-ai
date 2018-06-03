'use strict';

const Bot = require('./bot')
const Dex = require('./sim/dex')

const team1 =  `|celesteela|leftovers||leechseed,protect,heavyslam,flamethrower|Sassy|252,,168,,88,|||||]|gliscor|toxicorb|H|stealthrock,earthquake,uturn,roost|Jolly|244,,60,,68,136|M||||]|tapukoko|electriumz||thunderbolt,uturn,defog,roost|Timid|4,,,252,,252|||||]Greninja|greninjaash|choicespecs||spikes,watershuriken,darkpulse,hydropump|Timid|4,,,252,,252|||||]Medicham|medichammega|medichamite||fakeout,highjumpkick,zenheadbutt,icepunch|Jolly|4,252,,,,252|M||||]|tangrowth|assaultvest|H|gigadrain,knockoff,earthquake,hiddenpowerice|Sassy|248,,8,,252,|M|,30,30,,,|||`;
const team2 = `|metagrossmega|metagrossite||meteormash,hammerarm,thunderpunch,icepunch|Jolly|4,252,,,,252|||||]|garchomp|rockyhelmet|H|stealthrock,dragontail,earthquake,fireblast|Impish|252,,252,,4,|M||||]|clefable|leftovers|1|calmmind,moonblast,flamethrower,softboiled|Bold|252,,252,,4,|M|,0,,,,|||]|rotomwash|leftovers||voltswitch,hydropump,willowisp,thunderwave|Bold|248,,136,,124,||,0,,,,28|||]|weavile|choiceband||iceshard,knockoff,iciclecrash,pursuit|Jolly|4,252,,,,252|M||||]|latios|choicespecs||dracometeor,psychic,surf,defog|Timid|4,,,252,,252||,0,,,,|||`;

const options = {
    debug: true,
    actionUrl: 'https://play.pokemonshowdown.com/~~showdown/action.php',
    serverUrl: 'ws://sim.psim.us:8000/showdown/',
    username: 'beepboopbot',
    password: 'notabot',
    avatar: 0
};

var bot = new Bot(options);
bot.connect();
// wait for connection
setTimeout(function() {
    bot.useTeam(team1);
    bot.challengeUser('Cosine180', 'gen7ou');
}, 2000);
