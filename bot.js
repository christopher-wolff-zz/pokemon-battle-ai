'use strict';

const colors = require('colors');
const https = require('https');
const url = require('url');
const websocket = require('websocket');

const unknown = require('./sim/unknown');

const BattleInfo = require('./sim/battle-info');
const Dex = require('./sim/dex');
const HiddenBattle = require('./sim/hidden-battle');
const HiddenPokemon = require('./sim/hidden-pokemon');

/*********************************************************************
 * Helper functions
 *********************************************************************/

/**
 * Choose an element from an array at random.
 *
 * @param {Object[]} array
 */
function randomElem(array) {
	return array[Math.floor(Math.random() * array.length)];
}

/**
 * Like string.split(delimiter), but only recognizes the first `limit`
 * delimiters (default 1).
 *
 * Returns an array of length exactly limit + 1.
 *
 * @param {string} str
 * @param {string} delimiter
 * @param {number} [limit]
 */
function splitFirst(str, delimiter, limit = 1) {
	let splitStr = /** @type {string[]} */ ([]);
	while (splitStr.length < limit) {
		let delimiterIndex = str.indexOf(delimiter);
		if (delimiterIndex >= 0) {
			splitStr.push(str.slice(0, delimiterIndex));
			str = str.slice(delimiterIndex + delimiter.length);
		} else {
			splitStr.push(str);
			str = '';
		}
	}
	splitStr.push(str);
	return splitStr;
}

/**
 * Converts anything to an ID. An ID must have only lowercase alphanumeric
 * characters.
 * If a string is passed, it will be converted to lowercase and
 * non-alphanumeric characters will be stripped.
 * If an object with an ID is passed, its ID will be returned.
 * Otherwise, an empty string will be returned.
 *
 * @param {Object} text
 * @return {string}
 */
function toId(text) {
	if (text && text.id) {
		text = text.id;
	} else if (text && text.userid) {
		text = text.userid;
	}
	if (typeof text !== 'string' && typeof text !== 'number') {
        return '';
    }
	return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/*********************************************************************
 * Bot
 *********************************************************************/

 /**
  * @typedef {Object} BotOptions
  * @property {boolean} [debug]
  * @property {string} [actionUrl]
  * @property {string} [serverUrl]
  * @property {string} [username]
  * @property {string} [password]
  * @property {number} [avatar]
  */

class Bot {
    /**
     * @param {BotOptions} options
     */
    constructor(options) {
        console.log('------------------------------------------------');
        console.log('  PokemonShowdownBattleBot (v0.1) by Cosine180  ');
        console.log('------------------------------------------------');

        /**@type {boolean} */
        this.debug = options.debug | false;
        /**@type {string} */
        this.actionUrl = options.actionUrl;
        /**@type {string} */
        this.serverUrl = options.serverUrl;
        /**@type {string} */
        this.username = options.username;
        /**@type {string} */
        this.password = options.password;
        /**@type {number} */
        this.avatar = options.avatar | 0;

        this.connection = null;
        this.ws = null;

        /**@type {Pokemon[]} */
        this.loadedTeam = null;
        this.battleInfo = {};
        this.battles = {};
    }

    /**
     * Connect to the Pokemon Showdown server `this.serverUrl`.
     */
    connect() {
        this.ws = new websocket.client();

        this.ws.on('connectFailed', (error) => {
            console.error('Could not connect to server. ' + error.toString());
        });

        this.ws.on('connect', (connection) => {
            console.log('Connected to server.');
            this.connection = connection;

            connection.on('error', (error) => {
                console.error('Connection error: ' + error.stack);
            });

            connection.on('close', () => {
                console.log('Connection closed.');
            });

            connection.on('message', (message) => {
                if (message.type !== 'utf8' || message.utf8Data.charAt(0) !== 'a') {
                    return false;
                }
                let messageString = message.utf8Data.slice(3, message.utf8Data.length - 2);
                this.receive(messageString);
            });
        });

        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789_';
        let randomId = ~~(Math.random() * 900) + 100;
		let randomString = '';
		for (let i = 0, l = chars.length; i < 8; i++) {
			randomString += chars.charAt(~~(Math.random() * l));
		}
		let connectionUrl = this.serverUrl + randomId + '/' + randomString + '/websocket';
        this.ws.connect(connectionUrl);
    }

    /**
     * Check if the bot is connected to the server.
     *
     * @returns {boolean}
     */
    isConnected() {
        return !!this.connection;
    }

    /**
     * Login to an account using `this.username` and `this.password`.
     *
     * @param {string} challId
     * @param {string} challStr
     */
    login(challId, challStr) {
        console.log('Logging in...');

        let requestOptions = {
            hostname: url.parse(this.actionUrl).hostname,
            port: url.parse(this.actionUrl).port,
            path: url.parse(this.actionUrl).pathname,
            agent: false
        };

        let data = null;
        if (!this.password) {
            requestOptions.method = 'GET';
            requestOptions.path += '?act=getassertion&userid=' + toId(this.username) + '&challengekeyid=' + toId(challId) + '&challenge=' + challStr;
        }
        else {
            requestOptions.method = 'POST';
            data = 'act=login&name=' + toId(this.username) + '&pass=' + toId(this.password) + '&challengekeyid=' + challId + '&challenge=' + challStr;
			requestOptions.headers = {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': data.length
			};
        }

        let req = https.request(requestOptions, (res) => {
            res.setEncoding('utf8');

            let data = '';
            res.on('data', (d) => {
                data += d;
            });

            res.on('end', () => {
                if (data === ';') {
                    console.error('Failed to log in: Invalid password.');
                } else if (data.length < 50) {
                    console.error('Failed to log in: data.length < 50.');
                } else if (data.indexOf('heavy load') !== -1) {
                    console.error('Failed to log in: The server is under heavy load.');
                } else {
                    let assertion;
                    try {
                        data = JSON.parse(data.substr(1));
                        if (data.actionsuccess) {
                            assertion = data.assertion;
                        }
                        else {
                            console.error('Failed to log in: Action not successful.');
                        }
                    }
                    catch (e) {
                        console.error('Failed to log in: Error parsing data.');
                    }
                    this.sendAssertion(assertion);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Failed to log in: ' + error.stack);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    }

    /**
     * Send a message to the server.
     *
     * @param {string} message
     * @param {string} roomId
     */
    send(message, roomId) {
        if (!message || !this.connection.connected) {
            return false;
        }
  	    if (!(message instanceof Array)) {
            message = [message.toString()];
        }
        roomId = roomId || '';
        console.log('>> %s'.green, message);
        this.connection.send(JSON.stringify(roomId + '|' + message));
    }

    /**
     * Parse a chunk of text received from the server.
     *
	 * @param {string} chunk
	 */
	receive(chunk) {
        const lines = chunk.split('\\n');
        var roomId = '';
        if (lines.length !== 0 && lines[0].startsWith('>')) {
            roomId = lines[0].slice(1);
        }
		for (const line of lines) {
			this.receiveLine(line, roomId);
		}
	}

    /**
     * Parse a line of text received from the server.
     *
	 * @param {string} line
     * @param {string} roomId
	 */
	receiveLine(line, roomId) {
        if (line.length <= 1) return;
        console.log('<< %s'.gray, line);
        if (line.charAt(0) !== '|') return;
		const [cmd, rest] = splitFirst(line.slice(1), '|');
        switch (cmd) {
        case 'challstr':
            const [challId, challStr] = rest.split('|');
            this.login(challId, challStr);
            break;
        case 'request':
            if (!(roomId in this.battleInfo) || rest.length === 0) break;
            const request = JSON.parse(rest.replace(/\\"/g, '"'));
            // wait until we received more battle information until we act
            // TODO: implement properly
            setTimeout(() => {this.receiveRequest(request, roomId)}, 100);
            break;
        case 'init':
            if (rest === 'battle' && !(roomId in this.battleInfo)) {
                this.battleInfo[roomId] = new BattleInfo();
            }
            break;
        case 'title':
            if (!(roomId in this.battleInfo)) break;
            this.battleInfo[roomId].title = rest;
            break;
        case 'player':
            if (!(roomId in this.battleInfo)) break;
            var [playerId, name, avatar] = splitFirst(rest, '|', 2);
            if (!name) break;
            if (name === this.username) {
                this.battleInfo[roomId].myId = playerId;
            } else {
                this.battleInfo[roomId].oppId = playerId;
            }
            this.battleInfo[roomId].sides[playerId] = {
                'name': name,
                'avatar': avatar
            }
            break;
        case 'teamsize':
            if (!(roomId in this.battleInfo)) break;
            var [playerId, teamSize] = rest.split('|');
            this.battleInfo[roomId].sides[playerId].teamSize = teamSize;
            break;
        case 'gametype':
            if (!(roomId in this.battleInfo)) break;
            this.battleInfo[roomId].gameType = rest;
            break;
        case 'gen':
            if (!(roomId in this.battleInfo)) break;
            this.battleInfo[roomId].gen = rest;
            break;
        case 'tier':
            if (!(roomId in this.battleInfo)) break;
            this.battleInfo[roomId].tier = rest;
            break;
        case 'rated':
            if (!(roomId in this.battleInfo)) break;
            this.battleInfo[roomId].rated = true;
            break;
        case 'clearpoke':
            if (!(roomId in this.battleInfo)) break;
            const oppId = this.battleInfo[roomId].oppId;
            this.battleInfo[roomId].sides[oppId].team = [];
            break;
        case 'poke':
            if (!(roomId in this.battleInfo)) break;
            var [playerId, details, hasItem] = splitFirst(rest, '|', 2);
            if (playerId !== this.battleInfo[roomId].oppId) break;
            details = details.split(', ');
            var species = details[0];
            var gender = '';
            var level = 100;
            for (const detail of details.slice(1)) {
                if (detail === 'M' || detail === 'F') {
                    gender = detail;
                } else if (detail.startsWith('L')) {
                    level = parseInt(detail.slice(1));
                }
            }
            this.battleInfo[roomId].sides[playerId].team.push({
                'species': species,
                'gender': gender,
                'level': level,
                'hasItem': !!hasItem
            });
            break;
        case 'win':
            if (!(roomId in this.battleInfo)) break;
            const winner = rest;
            const outcome = winner === this.username ? 'win' : 'loss';
            console.log(`Outcome: ${outcome}`);
            delete this.battleInfo[roomId];
            break;
        case 'tie':
            if (!(roomId in this.battleInfo)) break;
            console.log('Outcome: tie');
            delete this.battleInfo[roomId];
            break;
		case 'error':
			throw new Error(rest);
        }
	}

	/**
     * Handle an action request from the server.
     *
	 * @param {Object} request
     * @param {string} roomId
	 */
	receiveRequest(request, roomId) {
		if (request.wait) {
			// wait request
		} else if (request.forceSwitch) {
			// switch request
			this.switchRandom(request.forceSwitch, request.side.pokemon, roomId);
		} else if (request.active) {
			// move request
            this.moveRandom(request.active, request.side.pokemon, roomId);
		} else if (request.teamPreview) {
			// team preview
            this.initHiddenBattle(roomId);
			this.choose('default', roomId);
		} else {
            // this should never happen, but just in case
            this.choose('default', roomId);
        }
	}

    /**
     * @param {string} roomId
     */
    initHiddenBattle(roomId) {
        const battleInfo = this.battleInfo[roomId];
        const oppTeam = battleInfo.sides[battleInfo.oppId].team;
        const p1Team = battleInfo.myId === 'p1' ? this.loadedTeam : oppTeam;
        const p2Team = battleInfo.myId === 'p2' ? this.loadedTeam : oppTeam;
        const options = {
            'formatid': battleInfo.tier,
            'rated': battleInfo.rated,
            'p1': {
                'name': battleInfo.sides.p1.name,
                'avatar': battleInfo.sides.p1.avatar,
                'team': p1Team
            },
            'p2': {
                'name': battleInfo.sides.p2.name,
                'avatar': battleInfo.sides.p2.avatar,
                'team': p2Team
            }
        };
    }

    /**
     * @param {boolean[]} forceSwitch
     * @param {Object[]} pokemon
     * @param {string} roomId
     */
    switchRandom(forceSwitch, pokemon, roomId) {
        let chosen = /** @type {number[]} */ ([]);
        const choices = forceSwitch.map((/** @type {Object} */ mustSwitch) => {
            if (!mustSwitch) return 'pass';
            let canSwitch = [1, 2, 3, 4, 5, 6];
            canSwitch = canSwitch.filter(i => (
                // not active
                i > forceSwitch.length &&
                // not chosen for a simultaneous switch
                !chosen.includes(i) &&
                // not fainted
                !pokemon[i - 1].condition.endsWith(' fnt')
            ));
            const target = randomElem(canSwitch);
            chosen.push(target);
            return `switch ${target}`;
        });
        this.choose(choices.join(', '), roomId);
    }

    /**
     * @param {boolean[]} active
     * @param {Object[]} pokemon
     * @param {string} roomId
     */
     moveRandom(active, pokemon, roomId) {
         const choices = active.map((/** @type {Object} */ poke, /** @type {number} */ i) => {
             if (pokemon[i].condition.endsWith(' fnt')) return 'pass';
             let canMove = [1, 2, 3, 4].slice(0, poke.moves.length);
             canMove = canMove.filter(i => (
                 // not disabled
                 !poke.moves[i - 1].disabled
             ));
             const move = randomElem(canMove);
             const targetable = active.length > 1 && ['normal', 'any'].includes(poke.moves[move - 1].target);
             const target = targetable ? ` ${1 + Math.floor(Math.random() * 2)}` : '';
             return `move ${move}${target}`;
         });
         this.choose(choices.join(', '), roomId);
     }

    /**
     * @param {string} assertion
     */
    sendAssertion(assertion) {
        this.send('/trn ' + this.username + ',0,' + assertion);
    }

    /**
     * @param {string} team
     */
    useTeam(team) {
        this.loadedTeam = Dex.fastUnpackTeam(team);
        this.send('/useteam ' + team);
    }

    /**
     * @param {string} tier
     */
    searchBattle(tier) {
        this.send('/search ' + tier);
    }

    /**
     * @param {string} username
     * @param {string} tier
     */
    challengeUser(username, tier) {
        this.send('/challenge ' + username + ', ' + tier);
    }

    /**
     * @param {string} user
     */
    acceptChallenge(user) {
        this.send('/accept ' + user);
    }

    /**
     * @param {string} roomId
     */
    setHiddenRoom(roomId) {
        this.send('/hiddenroom', roomId);
    }

    /**
     * @param {string} roomId
     */
    turnTimerOn(roomId) {
        this.send('/timer on', roomId);
    }

    /**
     * @param {string} roomId
     */
    turnTimerOff(roomId) {
        this.send('/timer off', roomId);
    }

    /**
     * @param {string} choices
     * @param {string} roomId
     */
    choose(choices, roomId) {
        this.send('/choose ' + choices, roomId)
    }

    /**
     * @param {string} order
     * @param {string} roomId
     */
    chooseTeamOrder(order, roomId) {
        this.send('/team ' + order, roomId);
    }

    /**
     * @param {string} moveNumber
     * @param {string} roomId
     */
    chooseMove(moveNumber, roomId) {
        this.send('/move ' + moveNumber, roomId);
    }

    /**
     * @param {string} roomId
     */
    forfeitBattle(roomId) {
        if (!roomId) return;
        this.send('/forfeit', roomId);
    }

    /**
     * @param {string} roomId
     */
    saveReplay(roomId) {
        if (!roomId) return;
        this.send('/savereplay', roomId);
    }
}

module.exports = Bot;
