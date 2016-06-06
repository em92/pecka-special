var express = require('express');
var bodyParser = require('body-parser');
var dateFormat = require('dateformat');
var fs = require('fs');
var util = require('util')

var app = express();
var extend = util._extend;
var inspect = util.inspect;

app.use(bodyParser.text());

var parse_stats_submission = function(body) {
	var len = function(obj) {
		return Object.keys(obj).length;
	};
	
	var in_array = function(what, array) {
		return array.some(function(param) {return param==what});
	};
	
	// storage vars for the request body
	var game_meta = {};
	var events = {};
	var players = [];
	var teams = [];

	// we're not in either stanza to start
	var in_P = false;
	var in_Q = false;
	var lines = body.split("\n");
	for(var k=0; k<lines.length; k++) {
		var line = lines[k];
		var key = line.substr(0, line.indexOf(' '));
		var value = line.substr(line.indexOf(' ')+1);

		if (in_array(key, ['P', 'Q', 'n', 'e', 't', 'i']) == false) {
			game_meta[key] = value;
		}
		
		if (in_array(key, ['Q', 'P'])) {
			//log.debug('Found a {0}'.format(key))
			//log.debug('in_Q: {0}'.format(in_Q))
			//log.debug('in_P: {0}'.format(in_P))
			//log.debug('events: {0}'.format(events))

			// check where we were before and append events accordingly
			if ( in_Q && (len(events) > 0) ) {
				// log.debug('creating a team (Q) entry')
				teams.push(events);
				events = {};
			} else if (in_P && (len(events) > 0) ) {
				// log.debug('creating a player (P) entry')
				players.push(events);
				events = {};
			}

			if (key == 'P') {
				//log.debug('key == P')
				in_P = true;
				in_Q = false;
			} else if (key == 'Q') {
				//log.debug('key == Q')
				in_P = false;
				in_Q = true;
			}

			events[key] = value;
		}
		
		
		if (key == 'e') {
			var subkey = value.split(' ')[0];
			var subvalue = value.split(' ')[1];
			events[subkey] = subvalue;
		}
		if (key == 'n') {
			events[key] = value;
		}
		if (key == 't') {
			events[key] = value;
		}
	}

	// add the last entity we were working on
	if (in_P && (len(events) > 0) ) {
		players.push(events);
	} else if (in_Q && (len(events) > 0) ) {
		teams.push(events);
	}
	
	return {game_meta: game_meta, players: players, teams: teams};
}

app.post('/stats/submit', function (req, res) {
	var stats = parse_stats_submission(req.body);
	var date = dateFormat(new Date(), "yyyy-mm-dd HH_MM_ss");
	fs.writeFile("./stats/" + stats['game_meta']['G'] + "-" + stats['game_meta']['U'] + "-" + date + "-" + stats['game_meta']['M'] + ".json", JSON.stringify(stats));
	res.setHeader("Content-Type", "application/json");
	res.send({ok: true});
});

app.get('/stats', function (req, res) {
	fs.readdir('./stats/', function(err, data) {
		res.setHeader("Content-Type", "application/json");
		res.send(data);
	});
});

app.use('/stats/', express.static('stats'));
app.use(express.static('public'));

app.listen(8080, function () {
	console.log("pecka-special started 8080");
});

fs.readdir('./stats/', function(err, data) {
	if (err) throw err;
	data.forEach(function(filename) {
		var contents = fs.readFileSync('./stats/' + filename, 'utf8');
		try {
			JSON.parse(contents+"");
		} catch(e) {
			console.log("converting " + filename);
			fs.writeFileSync('./stats/' + filename, JSON.stringify(parse_stats_submission(contents)));
		}
	});
});
