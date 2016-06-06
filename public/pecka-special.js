var Summary = React.createClass({
	
	getInitialState: function() {
		return { summary: [] };
	},
	
	downloadStats: function(file_index, summary) {
		var files = this.props.files;
		if (typeof(file_index) == 'undefined') {
			file_index = 0;
			summary = [];
		}
		
		if (file_index >= files.length) {
			
			summary.forEach(function(player, i) {
				summary[i].rank = summary[i].rank / summary[i].match_count;
			});
		
			summary.sort(function(a, b) {
				
				if (b.match_count > a.match_count)
					return 1;
				else if (a.match_count > b.match_count)
					return -1;
				
				if (b.rank > a.rank)
					return -1;
				else if (a.rank > b.rank)
					return 1;
				
				if (b.score > a.score)
					return 1;
				else if (a.score < b.score)
					return -1;
				
				if (b.kills > a.kills)
					return 1;
				else if (b.kills < a.kills)
					return -1;
					
				if (b.damage_dealt > a.damage_dealt)
					return 1;
				else if (b.damage_dealt < a.damage_dealt)
					return -1;
				
				return 0;
			});
			this.setState({summary: summary});
			return;
		}
		
		
		var self = this;
		$.get( "stats/" + files[file_index], function( data ) {
			var recompute_ranks = data.players.some(function(player) {
				return player['rank'] == '-1';
			});
			
			if (recompute_ranks) {
				data.players.sort(function(a, b) {
					return parseInt(b['scoreboard-score'])-parseInt(a['scoreboard-score']);
				});
				
				data.players.forEach(function(player, i) {
					if (i == 0) {
						data.players[i]['rank'] == '1';
					} else {
						if (data.players[i]['scoreboard-score'] == data.players[i-1]['scoreboard-score']) {
							data.players[i]['rank'] = data.players[i-1]['rank'];
						} else {
							data.players[i]['rank'] = (parseInt(data.players[i-1]['rank'])+1).toString();
						}
					}
				});
			}
			
			data.players.forEach(function(player) {
				for(var i in summary) {
					if (summary[i].id == player["P"]) {
						summary[i].match_count += 1;
						summary[i].rank += parseInt(player["rank"]);
						summary[i].score += parseInt(player["scoreboard-score"]);
						summary[i].kills += parseInt(player["scoreboard-kills"]);
						summary[i].deaths += parseInt(player["scoreboard-deaths"]);
						summary[i].damage_dealt += parseInt(player["scoreboard-pushes"]);
						return;
					}
				}
				
				summary.push({
					id: player["P"],
					name: player["n"],
					match_count: 1,
					rank: parseInt(player["rank"]),
					score: parseInt(player["scoreboard-score"]),
					kills: parseInt(player["scoreboard-kills"]),
					deaths: parseInt(player["scoreboard-deaths"]),
					damage_dealt: parseInt(player["scoreboard-pushes"])
				});
			});
			
			self.downloadStats(file_index+1, summary);
		});
	},
	
	upload2imgur: function() {
		html2canvas(document.getElementById("summary-table"), {
			onrendered: function(canvas) {
				$("#top-right-fixed").show();
				$("#top-right-fixed").html("Загрузка...");
				try {
					var img = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
				} catch(e) {
					var img = canvas.toDataURL().split(',')[1];
				}
				$.ajax({
					url: 'https://api.imgur.com/3/upload',
					headers: {'Authorization': 'Client-ID f97413954afb04c'},
					type: 'POST',
					data: {
						type: 'base64',
						name: 'nofile.jpg',
						title: 'no title',
						caption: 'no caption',
						image: img
					},
					dataType: 'json'
				}).success(function(result) {
					$("#top-right-fixed").html(result.data.link);
				}).error(function (xhr, status, err) {
					$("#top-right-fixed").html(err.toString());
					console.error(status, err.toString());
				});
			}
		});
	},
	
	renderQLNickname: function(nickname) {
		nickname = ['1', '2', '3', '4', '5', '6', '7'].reduce(function(sum, current) {
			return sum.split("^" + current).join('</span><span class="qc' + current + '">');
		}, nickname);
		return '<span class="qc7">' + nickname + '</span>';
	},
	
	render: function() {
		var self = this;
		var btn = React.createElement("button", {onClick: function() {self.downloadStats();}}, "Показать сводную таблицу");
		
		if (this.state.summary.length == 0) {
			return btn;
		}
		
		var result = this.state.summary.map(function(item, i) {
			return React.createElement('tr', {key: i}, 
				//React.createElement('td', {className: 'col-md-1'}, item.id),
				React.createElement('td', {className: 'col-md-6', dangerouslySetInnerHTML: {__html: self.renderQLNickname(item.name)}}),
				React.createElement('td', {className: 'col-md-1'}, item.match_count),
				React.createElement('td', {className: 'col-md-1'}, item.rank),
				React.createElement('td', {className: 'col-md-1'}, item.score),
				React.createElement('td', {className: 'col-md-1'}, item.kills),
				React.createElement('td', {className: 'col-md-1'}, item.damage_dealt)
			)
		});
		
		return React.createElement('div', {id: "summary-table-wrapper"} ,
			btn,
			React.createElement('table', {id: "summary-table", 	className: "table table-borderless"},
				React.createElement('thead', null, React.createElement('tr', null,  
					//React.createElement('th', null, "id"),
					React.createElement('th', null, "Nickname"),
					React.createElement('th', null, "Match Count"),
					React.createElement('th', null, "Rank"),
					React.createElement('th', null, "Score"),
					React.createElement('th', null, "Kills"),
					React.createElement('th', null, "Damage Dealt")
				)),
				React.createElement('tbody', null, result)
			),
			React.createElement('div', {id: "imgur"},
				React.createElement("button", {onClick: this.upload2imgur}, "Загрузить в imgur")
			)
		);
	}
});

var StatsItem = React.createClass({
	
	getInitialState: function() {
		return { checked: false };
	},
	
	onClick: function(event) {
		this.setState({ checked: !this.state.checked});
		this.props.onCheckCallback(this.props.file, !this.state.checked);
	},
	
	render: function() {
		return React.createElement("li", {
			onClick: this.onClick, 
			style: {backgroundColor: this.state.checked ? "#9e619e" : "inherit"},
		}, this.props.file);
	}
});

var StatsList = React.createClass({
	
	getInitialState: function() {
		return { list: [], checked_files: {} };
	},
	
	downloadList: function() {
		$.ajax({
			url: "stats",
			cache: true,
			success: (function (data) {
				this.setState({list: data, checked_files: this.state.checked_files });
			}).bind(this),
			error: (function (xhr, status, err) {
				console.error(status, err.toString());
			}).bind(this)
		});
	},

	componentDidMount: function() {
		this.downloadList();
	},
	
	onCheckCallback: function(file, checked) {
		var checked_files = $.extend({}, this.state.checked_files);
		if (checked) {
			checked_files[file] = file;
		} else {
			delete checked_files[file];
		}
		this.setState({list: this.state.list, checked_files: checked_files});
	},
	
	render: function() {
		var state = this.state;
		var self = this;
		
		var result = state.list.map(function (item, i) {
			return React.createElement(StatsItem, { key: i, file: item, onCheckCallback: self.onCheckCallback });
		});
		
		return React.createElement('div', null, 
			React.createElement('ul', null, result),
			React.createElement(Summary, {files: Object.keys(this.state.checked_files)})
		);
	}
});
