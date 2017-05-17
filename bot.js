'use strict';

require('colors');

var https = require('https');
var websocket = require('websocket');
var url = require('url');
var Config = require('./config/config');
var Dex = require('./sim/dex');
var Battle = require('./sim/battle');
var MyBattle = require('./gamestate/mybattle');
var MyPokemon = require('./gamestate/mypokemon');
var Tools = require('./sim/dex-data').Tools;
var MyTools = require('./util/mytools');
//var Formats = require('./config/formats').Formats;

global.log = MyTools.log;

class Bot {
  // Constructor
  constructor(username, password) {
    console.log('-------------------------------------------------');
    console.log('  PokemonShowdownBattleBot (v0.1) by Cosine180.');
    console.log('-------------------------------------------------');

    this.username = username;
    this.password = password;
    this.avatar = 0;

    this.actionURL = Config.actionURL;

    this.battles = new Map();
    this.roomList = [];
    this.loadedTeam = null;

    this.connection = null;
    this.ws = null;
  }
  // Connect
  connect(serverURL) {
    this.ws = new websocket.client();

    this.ws.on('connectFailed', (error) => {
      log('Could not connect to server. ' + error.toString(), 'error');
    });

    this.ws.on('connect', (con) => {
      log('Connected to server.', 'status');
      this.connection = con;

      con.on('error', (error) => {
        log('Connection error: ' + error.stack, 'error');
      });

      con.on('close', () => {
        log('Connection closed.', 'error');
      });

      con.on('message', (message) => {
        log(message.utf8Data, 'recv');
        if (message.type !== 'utf8') return false;

        this.receiveMessage(message.utf8Data);
      });
    });

    var randomID = ~~(Math.random() * 900) + 100;
		var chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
		var randomString = '';
		for (var i = 0, l = chars.length; i < 8; i++) {
			randomString += chars.charAt(~~(Math.random() * l));
		}
		var connectionURL = serverURL + randomID + '/' + randomString + '/websocket';
    this.ws.connect(connectionURL);
  }
  // Login
  login(challID, challStr) {
    log('Logging in...', 'status');

    var requestOptions = {
      hostname: url.parse(this.actionURL).hostname,
      port: url.parse(this.actionURL).port,
      path: url.parse(this.actionURL).pathname,
      agent: false
    };

    var data = null;
    if (!this.password) {
      requestOptions.method = 'GET';
      requestOptions.path += '?act=getassertion&userid=' + Tools.getId(this.username) + '&challengekeyid=' + Tools.getId(challID) + '&challenge=' + challStr;
    }
    else {
      requestOptions.method = 'POST';
      data = 'act=login&name=' + Tools.getId(this.username) + '&pass=' + Tools.getId(this.password) + '&challengekeyid=' + challID + '&challenge=' + challStr;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length
			};
    }

    var req = https.request(requestOptions, (res) => {
      res.setEncoding('utf8');

      var data = '';
      res.on('data', (d) => {
        data += d;
      });

      res.on('end', () => {
        if (data === ';') log('Failed to log in: Invalid password.', 'error');
        else if (data.length < 50) log('Failed to log in: data.length < 50', 'error');
        else if (data.indexOf('heavy load') !== -1) log('Failed to log in: The server is under heavy load.', 'error');
        else {
          try {
            data = JSON.parse(data.substr(1));
            var assertion;
            if (data.actionsuccess) {
              assertion = data.assertion;
            }
            else {
              log('Failed to log in: Error parsing data.', 'error');
            }
          }
          catch (e) {}

          this.send('/trn ' + this.username + ',0,' + assertion);
        }
      });
    });

    req.on('error', (error) => {
      log('Failed to log in: ' + error.stack, 'error');
    });

    if (data) req.write(data);
    req.end();
  }
  // Send
  send(message, roomID) {
    if (!message || !this.connection.connected) return false;
  	if (!(message instanceof Array)) message = [message.toString()];
    if (!roomID) roomID = '';

    log(message, 'sent');
    this.connection.send(JSON.stringify(roomID + '|' + message));
  }

  sendChat(message, roomID) {
    this.send(message, roomID);
  }

  sendPM(message, user) {}
  // Parse
  receiveMessage(message) {
    if (!message.startsWith('a')) return;

    var messageList = JSON.parse(message.substr(1)); // Discard the 'a'

    if (messageList instanceof Array) {
      for (var i = 0; i < messageList.length; i++) {
        this.splitMessage(messageList[i]);
      }
    }
    else {
      this.splitMessage(messageList);
    }
  }

  splitMessage(message) {
    if (!message) return;

    if (message.includes('\n')) {
      var messageLines = message.split('\n');

      var roomID = '';
      if (messageLines[0].startsWith('>')) {
        roomID = messageLines[0].substr(1);
      }

      for (var i = 0; i < messageLines.length; i++) {
        this.parseMessage(messageLines[i], roomID);
      }
    }
    else {
      this.parseMessage(message);
    }
  }

  parseMessage(message, roomID) {
    if (!message) return;

    var messageParts = message.split('|');
    var messageType = messageParts[1];

    if (!messageType) return;

    log(messageType, 'msgtype');

    switch (messageType) {
      case 'challstr':
        this.login(messageParts[2], messageParts[3]);
        break;
      case 'updateuser':
        if (messageParts[3] == 1) log('Login successfull. Username: ' + messageParts[2], 'status');
        else log('Logged in as guest.', 'status');
        this.avatar = messageParts[4];
        break;
      case 'updatechallenges':
        var challenges = JSON.parse(messageParts[2]);
        if (challenges.challengesFrom.cosine180) // only accept challenges from me for now
          this.acceptChallenge('cosine180');
      case 'updatesearch':
        //var obj = JSON.parse(messageParts[2]); // THIS IS HOW TO EXTRACT JSON FROM MESSAGE
        break;
      case 'init':
        if (messageParts[2] != 'battle') return;
        if (!this.battles.has(roomID)) {
          log('Found battle in room ' + roomID, 'status');
          this.roomList.push(roomID);
          this.setHiddenRoom(roomID);
          /*
          // Create new battle
          var battle = new Battle();
          let battleProtoCache = new Map();
          var format = Dex.getFormat('OU'); // todo: find a better way to do this
          const mod = format.mod || 'base';
          const dex = Dex.mod(mod);
          // Copy scripts for correct gen
          for (let i in dex.data.Scripts) {
            battle[i] = dex.data.Scripts[i];
          }
          */
          var myBattle = new MyBattle();
          this.battles.set(roomID, myBattle);
          log('Added ' + roomID + ' to battles.', 'status');
          // for random battles: parse own team in case 'request'
          this.battles.get(roomID).sides.self.name = this.username;
          log('Set own name', 'status');
          this.battles.get(roomID).sides.self.avatar = this.avatar;
          log('Set own avatar', 'status');
          for (let i = 0; i < this.loadedTeam.length; i++) {
            this.battles.get(roomID).sides.self.team.push(new MyPokemon(this.loadedTeam[i].species, this.loadedTeam[i]));
          }
          log('Set own team', 'status');
        }
        break;
      case 'deinit':
        if (this.roomList.indexOf(roomID)) {
          var index = this.roomList.indexOf(roomID);
          this.roomList.splice(index, 1);
        }
      case 'tie':
      case 'win':
        if (this.battles.has(roomID)) {
          // Remove battle
          this.battles.delete(roomID);
          log('Removed ' + roomID + ' from battles.', 'status');
        }
        break;
      case 'title':
        if (!this.battles.has(roomID)) return;
        this.battles.get(roomID).title = messageParts[2];
        break;
      case 'player':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2];
        var name = messageParts[3];
        var avatar = messageParts[4];
        if (name == this.username) {
          this.battles.get(roomID).sides.self.slot = slot;
          log('Set own slot to ' + slot, 'status');
        }
        else {
          this.battles.get(roomID).sides.opponent.slot = slot;
          log('Set opponent\'s slot to ' + slot, 'status');
          this.battles.get(roomID).sides.opponent.name = name;
          log('Set opponent\'s name to ' + name, 'status');
          this.battles.get(roomID).sides.opponent.avatar = avatar;
          log('Set opponent\'s avatar to ' + avatar, 'status');
        }
        break;
      case 'tier':
        if (!this.battles.has(roomID)) return;
        var tier = messageParts[2];
        this.battles.get(roomID).tier = tier;
        log('Set tier to ' + tier, 'status');
        break;
      case 'rated':
        if (!this.battles.has(roomID)) return;
        this.battles.get(roomID).rated = true;
        log('Set rated to true');
        break;
      case 'poke': // todo: handle random battles
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2];
        var details = messageParts[3];
        var species = details.split(', ')[0];
        // create pokemon
        if (slot == this.battles.get(roomID).sides.opponent.slot) {
          this.battles.get(roomID).sides.opponent.team.push(new MyPokemon(species));
          log('Added ' + species + ' to opponent\'s team.', 'status');
        }
        // details have structure: species, L99, M, shiny
        if (slot == this.battles.get(roomID).sides.opponent.slot) {
          // add level if it is initialized to 100 but shouldn't be
          if (details.includes(', L')) {
            var level = details.split(', ')[1].substr(1);
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.level = level;
            log('Set level of ' + species + ' to ' + level, 'status');
          }
          // add gender
          if (details.includes(', M')) {
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.gender = 'M';
            log('Set gender of ' + species + ' to M', 'status');
          }
          else if (details.includes(', F')) {
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.gender = 'F';
            log('Set gender of ' + species + ' to F', 'status');
          }
          else {
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.gender = 'N';
            log('Set gender of ' + species + ' to N', 'status');
          }
          // add shiny
          if (details.includes('shiny')) { // could a species name include shiny?
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.shiny = true;
            log('Set shiny of ' + species + ' to true', 'status');
          }
        }
        break;
      case 'start':
        log('Battle ' + roomID + ' has started.', 'battle');
        break;
      case 'teampreview':
        if (!this.battles.has(roomID)) return;
        this.sendChat('Beep boop', roomID);
        break;
      case 'request':
        if (!this.battles.has(roomID)) return;
        if (this.battles.get(roomID).turn == 0) {
          this.chooseTeamOrder(623451, roomID);
          this.battles.get(roomID).turn++; // DONT ACTUALLY DO THIS, JUST TESTING
        }
        else {
          var randomChoice = Math.floor(Math.random() * (4)) + 1;
          this.chooseMove(randomChoice, roomID);
        }
        break;
      case 'turn':
        if (!this.battles.has(roomID)) return;
        // Initiate calculations
        var turn = messageParts[2];
        log('-----Turn ' + turn + ' has started-----', 'battle');
        this.battles.get(roomID).turn = turn;
        break;
      case 'switch':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var name = messageParts[2].substr(5);
        var species = messageParts[3].split(', ')[0];
        // Add name if it doesn't exist already
        if (slot == this.battles.get(roomID).sides.opponent.slot) {
          if (!this.battles.get(roomID).hasPokemonName(slot, name)) {
            this.battles.get(roomID).getPokemonBySpecies(slot, species).set.name = name;
            log('Set name of ' + species + ' to ' + name, 'status');
          }
        }
        // Set active pokemon
        this.battles.get(roomID).getSideBySlot(slot).activePokemon = name;
        log('Set active pokemon of ' + slot + ' to ' + name, 'status');
        break;
      case '-damage':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].split(':')[0].substr(0, 2);
        var pokemon = messageParts[2].split(':')[1].substr(1);
        var hp = messageParts[3].split('/')[0]; // could be either exact or percentage
        if (hp == '0 fnt') {
          this.battles.get(roomID).getPokemonByName(slot, pokemon).faintQueued = true;
          log('Added ' + pokemon + ' to faint queue', 'status');
          hp = 0;
        }
        this.battles.get(roomID).setHP(slot, pokemon, hp);
        break;
      case '-heal':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].split(':')[0].substr(0, 2);
        var pokemon = messageParts[2].split(':')[1].substr(1);
        var hp = messageParts[3].split('/')[0]; // could be either exact or percentage
        this.battles.get(roomID).setHP(slot, pokemon, hp);
        break;
      case 'faint':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].split(':')[0].substr(0, 2);
        var pokemon = messageParts[2].split(':')[1].substr(1);
        this.battles.get(roomID).getPokemonByName(slot, pokemon).fainted = true;
        log('Set ' + pokemon + ' to fainted', 'status');
        log('Removed ' + pokemon + ' from faint queue', 'status');
        this.battles.get(roomID).getPokemonByName(slot, pokemon).faintQueued = false;
        if (slot == this.battles.get(roomID).sides.self.slot) {
          // start calculations
        }
        break;
      case '-sidestart':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var sideCondition = messageParts[3].split(': ')[1];
        switch (sideCondition) {
          case 'Stealth Rock':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Stealth Rock'] = true;
            break;
          case 'Spikes':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Spikes']++;
            break;
          case 'Toxic Spikes':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Toxic Spikes']++;
            break;
          case 'Sticky Web':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Sticky Web'] = true;
            break;
          default:
            log('Unknown side condition: ' + sideCondition, 'error');
            return;
          // todo: add reflect and light screen
        }
        log('Added ' + sideCondition + ' to ' + slot + '\'s side', 'status');
        break;
      case '-sideend':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var sideCondition = messageParts[3].split(': ')[1];
        switch (sideCondition) {
          case 'Stealth Rock':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Stealth Rock'] = false;
            break;
          case 'Spikes':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Spikes'] = 0;
            break;
          case 'Toxic Spikes':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Toxic Spikes'] = 0;
            break;
          case 'Sticky Web':
            this.battles.get(roomID).getSideBySlot(slot).sideConditions['Sticky Web'] = false;
            break;
          default:
            log('Unknown side condition: ' + sideCondition, 'error');
            return;
          // todo: add reflect and light screen
        }
        log('Removed ' + sideCondition + ' to ' + slot + '\'s side', 'status');
        break;
      case '-ability':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        if (slot == this.battles.get(roomID).sides.opponent.slot) {
          var pokemon = messageParts[2].substr(5);
          var ability = messageParts[3];
          if (!this.battles.get(roomID).getPokemonByName(slot, pokemon).set.ability) {
            this.battles.get(roomID).getPokemonByName(slot, pokemon).set.ability = ability;
            log('Set ability of ' + pokemon + ' to ' + ability, 'status');
          }
        }
        break;
      case '-endability':

        break;
      case '-boost':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var pokemon = messageParts[2].substr(5);
        var stat = messageParts[3];
        var boost = messageParts[4];
        this.battles.get(roomID).getPokemonByName(slot, pokemon).boosts[stat] += boost;
        log('Boosted stat ' + stat + ' of ' + pokemon + ' by ' + boost, 'status');
        break;
      case '-unboost':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var pokemon = messageParts[2].substr(5);
        var stat = messageParts[3];
        var unboost = messageParts[4];
        this.battles.get(roomID).getPokemonByName(slot, pokemon).boosts[stat] -= unboost;
        log('Boosted stat ' + stat + ' of ' + pokemon + ' by ' + unboost, 'status');
        break;
      case '-setboost':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var pokemon = messageParts[2].substr(5);
        var stat = messageParts[3];
        var boost = messageParts[4];
        this.battles.get(roomID).getPokemonByName(slot, pokemon).boosts[stat] = boost;
        log('Set stat ' + stat + ' of ' + pokemon + ' to ' + boost, 'status');
        break;
      case '-restoreboost':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var pokemon = messageParts[2].substr(5);
        var stat = messageParts[3];
        this.battles.get(roomID).getPokemonByName(slot, pokemon).boosts[stat] = 0;
        log('Restored stat ' + stat + ' of ' + pokemon, 'status');
        break;
      case '-clearallboost':
        // get active pokemon and set boosts to 0
        break;
      case 'fieldstart':

        break;
      case 'fieldend':

        break;
      case 'status':

        break;
      case 'curestatus':

        break;
      case 'cureteam':

        break;
      case 'item':

        break;
      case '-enditem':
        if (!this.battles.has(roomID)) return;
        var slot = messageParts[2].substr(0, 2);
        var pokemon = messageParts[2].substr(5);
        var item = messageParts[3];
        this.battles.get(roomID).getPokemonByName(slot, pokemon).item = '';
        log('Removed item of ' + pokemon, 'status');
        break;
      case '-start':

        break;
      case '-end':

        break;
      case '-weather':

        break;
      case 'move':

        break;
      case '-transform':

        break;
      // Not planing to use these
      case '-fail':
      case 'choice':
      case 'upkeep':
      case '-supereffective':
      case 'resisted':
      case 'immune':
      case 'center':
      case 'error':
      case '-message':
      case 'chat': case 'c': case 'c:':
      case 'join': case 'j': case 'J':
      case 'leave': case 'l': case 'L':
      case 'name': case 'n': case 'N':
      case 'battle': case 'b': case 'B':
      case 'html': case 'uhtml': case 'uhtmlchange':
      case 'popup':
      case 'pm':
      case 'usercount':
      case 'nametaken':
      case ':':
        break;
      default:
        log('Could not parse message of type ' + messageType, 'error');
    }
  }
  // Load team
  loadTeam(team) {
    if (!team) return;

    this.loadedTeam = team;
    this.send('/useteam ' + Dex.packTeam(team));
  }
  // Find battle
  searchBattle(tier) {
    this.send('/search ' + tier);
  }
  // Challenge user
  challengeUser(username, tier) {
    this.send('/challenge ' + username + ', ' + tier);
  }
  // Accept challenge
  acceptChallenge(user) {
    this.send('/accept ' + user);
  }
  // Set hidden room
  setHiddenRoom(roomID) {
    this.send('/hiddenroom', roomID);
  }
  // Choose team order
  chooseTeamOrder(order, roomID) {
    this.send('/team ' + order, roomID);
  }
  // Choose move
  chooseMove(moveNumber, roomID) {
    this.send('/move ' + moveNumber, roomID);
  }
  // Forfeit battle
  forfeitBattle(roomID) {
    if (!roomID) return;
    this.send('/forfeit', roomID);
  }
  // Save replay
  saveReplay(roomID) {
    if (!roomID) return;
    this.send('/savereplay', roomID);
  }
  // Create tree of possible continuations
  createTree() {}

}

module.exports = Bot;
