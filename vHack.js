/*
Copyright 2017 Mr.Sonic Master

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
const Methods = require('./methods.js');

class vHackBot { // Due to API update v3, having multiple 'clients' seems to no longer be possible.
	constructor(clientID) {
		this.delayBetweenActions = 2400; // In milliseconds.
		this.clientID = clientID || 0;
		this.isGlobalSearch = 1;
		this.debugLevel = 0; // Log level-4 (0=normal, 4=debug)
		this.ignoreWhenNotAnonymous = true;
		this.log(`INIT delay=${this.delayBetweenActions} isGlobal=${this.isGlobalSearch}`, 4);
		this.login();
	}

	login() {
		this.log('Starting login...', 0);
		Methods.getUserInfo((userInfo) => {
			if (userInfo.toString().includes('Fatal')) return this.log(userInfo);
			if (!userInfo.ip) return this.log('Fatal Error: Invalid login credentials, script will exit.'), process.exit(0);
			this.log(`Logged in; userIP=${userInfo.ip}`);
			Methods.updateUHashStr(userInfo.uhash);
			setTimeout(this.getPlayerList.bind(this), this.delayBetweenActions);
			this.log(`Got user data ${JSON.stringify(userInfo)}`, 4);
		});
	}

	getPlayerList() {
		this.log('Get new player list.');
		Methods.getPlayerList(this.isGlobalSearch, (playerList) => {
			if (playerList.toString().includes('Fatal')) return setTimeout(this.getPlayerList.bind(this), this.delayBetweenActions);
			this.parsePlayerList(playerList);
			this.log(`Got list data ${JSON.stringify(playerList)}`, 4);
		});
	}

	parsePlayerList(playerList) {
		for (let i = 0; i < playerList.length; i++) {
			setTimeout(() => {
				const player = playerList[i];
				this.log(`Parsed player data ${JSON.stringify(player)}`, 4);
				const playerHostname = player.hostname;
				const watchedByFBI = Methods.imageToText(player.img, false, (result) => {
					if (result.toLowerCase().includes("firewall") && !result.toLowerCase().includes("FBI")) {
						this.resolveIPFromHostname(playerHostname);
					} else this.log(`Saved from attacking an FBI watched host.`);
					if ((i + 1) == playerList.length) setTimeout(this.getPlayerList.bind(this), this.delayBetweenActions);
				});
			}, i * this.delayBetweenActions);
		}
	}

	resolveIPFromHostname(playerHostname) {
		Methods.resolveIPFromHostname(playerHostname, (result) => {
			if (result.toString().includes('Fatal')) return this.log(result);
			if (!(result instanceof Object)) {
				switch (result) {
					case 9:
						this.log('Your computer is blocked by the FBI. Try again later. Script will exit.');
						process.exit(0);
						break;
				}
				return;
			}
			const playerIP = result.ipaddress;
			setTimeout(() => {
				this.loadRemoteData(playerIP);
			}, this.delayBetweenActions);
		});
	}

	loadRemoteData(playerIP) {
		Methods.loadRemoteData(playerIP, (result) => {
			if (result.toString().includes('Fatal')) return this.log(result);
			if (this.ignoreWhenNotAnonymous && result.anonymous == "NO") return; // We don't want to risk attacking someone who would come back and destroy us.
			Methods.imageToText(result.img, true, (password) => {
				for (let i = 1; i <= 6; i++) { // 6 is the amount of password choices sent.
					const checkPassword = result['p' + i].toString();
					const passwordMatched = Methods.checkPassword(checkPassword, password.toString());
					this.log(`Checking passord ${checkPassword} with password ${password}, match? ${passwordMatched}.`, 1);
					if (passwordMatched) {
						setTimeout(() => {
							this.hackPlayer(playerIP, i);
						}, this.delayBetweenActions);
						this.log(`Player queued to hack. userIP=${result.ipaddress}, userName=${result.username}, money=$${result.money.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}.`, 1);
						break; // We got a password match, don't test any other passwords.
					}
				}
			});
		});
	}

	hackPlayer(playerIP, port) {
		Methods.hackPlayer(playerIP, port, (result) => {
			if (result.toString().includes('Fatal')) return this.log(result);
			this.log(`Hacked player ${playerIP} result ${JSON.stringify(result)}`, 4);
			if (result.result == "0") this.log(`Gained: $${result.amount.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}. New money amount: $${result.newmoney.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")}.`);
		});
	}

	log(message, logLevel = 0) {
		if (this.debugLevel >= logLevel) console.log(`Client ${this.clientID}: ${message}`);
	}
}

new vHackBot(0);
