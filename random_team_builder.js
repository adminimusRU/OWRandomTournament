var RandomTeamBuilder = {
	players: [], // active players from lobby
	teams: [], // rolled teams
	
	// callbacks
	onProgressChange: undefined,
	onDebugMessage: undefined,
	
	// settings
	team_size: 6,
	// rolled team count should be power of 2, for better distribution in single elemination bracked (all teams will be in first round)
	team_count_power2: false,
	// while calculating player's SR will be adjusted by given percent, depenging on player's main class
	// example: adjust_sr_by_class: {'dps':120, 'tank':100, 'support':80},
	adjust_sr: false,
	adjust_sr_by_class: {},
	// 0 - prioritize SR, 100 - prioritize classes
	balance_priority: 50,
	// do not place similar one-trick-ponies together
	separate_otps: true,
	// maximum number of combinations checked to find balanced team.
	// reasonable range: 1000 - 300000
	// recommended optimal: 50000
	max_combinations: 50000, 
	// desired team quality. Rolled combination will be picked immediately after reaching thresold
	// reasonable range: 0 - 30
	// recommended: 0 (best possible combination will be found)
	OF_min_thresold: 0,
	// minimum desired team quality. Roll will be stopped after reaching this thresold, remaining players benched
	// reasonable range: 30 - 100
	// recommended: 50
	OF_max_thresold: 50,
	roll_debug: true,
	
	// internal
	balance_max_sr_diff: 100,
	roll_random_limit: 25, // max amount of remaining players for random rolls. Otherwise incremental roll is used
	
	player_selection_mask: [],
	target_class_count: {},
	target_team_sr: 0,
		
	OF_min: 0,
	best_roll: [],
	
	// public methods
	rollTeams: function() {
		if ( this.players.length < this.team_size ) {
			return;
		}
		
		if (this.roll_debug) {
			if(typeof this.onDebugMessage == "function") {
				this.onDebugMessage.call( undefined, "team_size = "+this.team_size );
				this.onDebugMessage.call( undefined, "team_count_power2 = "+this.team_count_power2 );
				this.onDebugMessage.call( undefined, "adjust_sr = "+this.adjust_sr );
				this.onDebugMessage.call( undefined, "adjust_sr_by_class = "+JSON.stringify(this.adjust_sr_by_class) );
				this.onDebugMessage.call( undefined, "balance_priority = "+this.balance_priority );
				this.onDebugMessage.call( undefined, "separate_otps = "+this.separate_otps );
				this.onDebugMessage.call( undefined, "max_combinations = "+this.max_combinations );
				this.onDebugMessage.call( undefined, "OF_min_thresold = "+this.OF_min_thresold );
				this.onDebugMessage.call( undefined, "OF_max_thresold = "+this.OF_max_thresold );
				
			}
		}
		
		// shuffle players, so every roll will be different
		this.players = array_shuffle( this.players );
		
		// calculate average class count and SR per team  -> balance target 
		var total_class_count = {};
		var target_team_count = Math.floor( this.players.length / this.team_size );
		if (this.team_count_power2) {
			target_team_count = Math.pow(2, Math.floor(Math.log2(target_team_count)));
		}
		this.target_class_count = {};
		this.target_team_sr = 0;
			
		for( c in class_names ) {
			total_class_count[class_names[c]] = 0;
			this.target_class_count[class_names[c]] = 0;
		}
		
		for( p in this.players) {
			/*for( c=0; c<this.players[p].top_classes.length; c++ ) {
				total_class_count[this.players[p].top_classes[c]] += 1 / (c+1);
			}*/
			if ( this.players[p].top_classes.length == 2 ) {
				total_class_count[this.players[p].top_classes[0]] += 2/3;
				total_class_count[this.players[p].top_classes[1]] += 1/3;
			} else if ( this.players[p].top_classes.length == 1 ) {
				total_class_count[this.players[p].top_classes[0]] += 1;
			}
			
			this.target_team_sr += this.calcPlayerSR( this.players[p] );
		}
		this.target_team_sr = Math.round( this.target_team_sr / this.players.length );
		
		for( c in class_names ) {
			this.target_class_count[class_names[c]] = this.team_size * (total_class_count[class_names[c]] / this.players.length);
			
			// round 
			this.target_class_count[class_names[c]]  = round_to(this.target_class_count[class_names[c]], 1);
			
			// round to nearest 0.5
			/*var rem = this.target_class_count[class_names[c]] % 0.5;
			rem = ( rem < 0.25 ? -rem : (0.5-rem) );
			this.target_class_count[class_names[c]] += rem;*/
		}
		
		// dbg
		/*document.getElementById("stats_update_log").innerHTML += "Target SR = "+this.target_team_sr+"</br>";
		document.getElementById("stats_update_log").innerHTML += "Target classes = "+JSON.stringify(this.target_class_count)+"</br>";*/
		if (this.roll_debug) {
			if(typeof this.onDebugMessage == "function") {
				this.onDebugMessage.call( undefined, "Target SR = "+this.target_team_sr );
				this.onDebugMessage.call( undefined, "Target classes = "+JSON.stringify(this.target_class_count) );
				//this.onDebugMessage.call( undefined, "Reasonable_OF_min_thresold = "+reasonable_OF_min_thresold );
			}
		}
		
		var start_time = performance.now();
		
		// roll teams
		while ( this.players.length >= this.team_size ) {
			//dbg
			var combinations_checked = 0;
			
			// init
			// start at ...00000111111
			this.player_selection_mask = Array(this.players.length - this.team_size).fill(0).concat( Array(this.team_size).fill(1) );
			this.player_selection_mask[this.players.length-1] = 0;
			
			this.OF_min = Number.MAX_VALUE;
			this.best_roll = [];
			
			// iterate through possible player combinations to find balanced teams (closer to target SR and classes)
			while ( this.findNextMask() ) {
				var picked_players = this.pickPlayersByMask( this.player_selection_mask );
				
				// calc objective function
				var OF_current = this.calcObjectiveFunction( picked_players );
				
				//dbg
				/*var msg = this.player_selection_mask.reduce( function(accumulator, currentValue) { return accumulator+=currentValue; }, "" );
				msg += " -> " + OF_current;
				document.getElementById("stats_update_log").innerHTML += msg+"</br>";*/
				
				/*if (this.roll_debug) {
					if(typeof this.onDebugMessage == "function") {
						var msg = this.player_selection_mask.reduce( function(accumulator, currentValue) { return accumulator+=currentValue; }, "" );
						this.onDebugMessage.call( undefined, "mask: "+msg );
					}
				}*/
								
				if ( OF_current < this.OF_min ) {
					// remember current roll
					this.best_roll = this.player_selection_mask.slice();
					this.OF_min = OF_current;
				}
				
				if ( OF_current <= this.OF_min_thresold ) {
					// choose current roll
					break;
				}
				
				combinations_checked++;
				if (combinations_checked >= this.max_combinations) break;
			};
			
			//dbg
			/*var msg = "best roll :: " + this.best_roll.reduce( function(accumulator, currentValue) { return accumulator+=currentValue; }, "" );
			msg += " -> " + this.OF_min;
			document.getElementById("stats_update_log").innerHTML += msg+"</br>";*/
			if (this.roll_debug) {
				if(typeof this.onDebugMessage == "function") {
					this.onDebugMessage.call( undefined, "Team #"+(this.teams.length+1) );
					this.onDebugMessage.call( undefined, "Best OF = "+this.OF_min );
					this.onDebugMessage.call( undefined, "Combinations checked = "+combinations_checked );
				}
			}
			
			// check thresold
			if ( this.OF_min > this.OF_max_thresold ) {
				// all combinations are heavily unbalanced, stop rolling
				if (this.roll_debug) {
					if(typeof this.onDebugMessage == "function") {
						this.onDebugMessage.call( undefined, "OF_max_thresold reached, stop roll" );
					}
				}
				break;
			}
			
			// create team from best roll
			var new_team = create_empty_team();
			new_team.players = this.pickPlayersByMask( this.best_roll, true );
			sort_players( new_team.players );
			new_team.name = "Team "+new_team.players[0].display_name;
			new_team.captain_index = 0;
			this.teams.push( new_team );
			
			if(typeof this.onProgressChange == "function") {
				var current_progress = Math.round( (this.teams.length / target_team_count)*100 );
				this.onProgressChange.call( undefined, current_progress );
			}
			
			if ( this.teams.length >= target_team_count ) {
				break;
			}
		}
		
		// reduce team count if needed
		if (this.team_count_power2 && (this.teams.length < target_team_count)) {
			var teams_to_delete = this.teams.length-Math.floor(target_team_count/2);
			if (this.roll_debug) {
				if(typeof this.onDebugMessage == "function") {
					this.onDebugMessage.call( undefined, "Reducing team count, teams deleted = "+teams_to_delete );
				}
			}
			for ( var t=0; t<teams_to_delete; t++ ) {
				var removed_team = this.teams.pop();
				this.players = this.players.concat( removed_team.players );
			}
		}
		
		var execTime = performance.now() - start_time;
		if (this.roll_debug) {
			if(typeof this.onDebugMessage == "function") {
				this.onDebugMessage.call( undefined, "Exec time "+execTime+" ms" );
			}
		}
	},
	
	// private methods
	
	findNextMask: function() {
		if ( this.players.length > this.roll_random_limit ) {
			return this.findNextMaskRandom();
		} else {
			return this.findNextMaskIncrement();
		}
	},
	
	findNextMaskRandom: function() {
		if ( this.team_size > this.player_selection_mask.length ) {
			return false;
		}
		
		this.player_selection_mask = this.player_selection_mask.fill(0);
		var bits_count = 0;
		while ( bits_count < this.team_size ) {
			var index = Math.floor(Math.random() * (this.player_selection_mask.length));
			if ( this.player_selection_mask[index] == 1 ) {
				continue;
			}
			this.player_selection_mask[index] = 1;
			bits_count++;
		}
		
		return true;
	},
	
	findNextMaskIncrement: function() {
		while(true) {
			// binary increment mask
			var buf = 1;
			var bits_count = 0;
			
			for ( var index = this.player_selection_mask.length - 1; index >=0; index-- ) {
				buf += this.player_selection_mask[ index ];
				this.player_selection_mask[ index ] = buf % 2;
				buf -= this.player_selection_mask[ index ];
				buf = buf >> 1;
				
				bits_count += this.player_selection_mask[ index ];
			}
			
			if ( buf > 0 ) {
				return false; // overflow reached, no correct mask found
			}
			
			// check if mask has needed amount of bits
			if ( bits_count == this.team_size ) {
				return true;
			}
			
			// stop at 111111000000...
			var sum_head = 0;
			for ( index=0; index<this.team_size; index++ ) {
				sum_head += this.player_selection_mask[ index ];
			}
			if ( sum_head == this.team_size ) {
				return false;
			}
		}
		return false;
	},
	
	pickPlayersByMask: function( mask, remove_selected=false ) {
		var picked_players = [];
		for( i in mask ) {
			if ( mask[i] == 1 ) {
				picked_players.push( this.players[i] );
			}
		}
		
		if ( remove_selected ) {
			for ( i=mask.length-1; i>=0; i-- ) {
				if ( mask[i] == 1 ) {
					this.players.splice( i, 1 );
				}
			}
		}
		
		return picked_players;
	},
	
	calcObjectiveFunction: function( picked_players ) {
		var sr_diff = Math.abs( this.calcTeamSR(picked_players) - this.target_team_sr );
		var class_unevenness = this.calcClassUnevenness( picked_players );
		var otp_conflicts = 0;
		if (this.separate_otps) {
			otp_conflicts = this.calcOTPConflicts( picked_players );
		}
		
		var objective_func = this.calcObjectiveFunctionValue( sr_diff, class_unevenness, otp_conflicts );
			
		//dbg
		/*var msg="";
		for( i in picked_players ) {
			msg += picked_players[i].display_name+", ";
		}
		msg += " :: "+sr_diff+" :: "+class_unevenness+" :: "+objective_func;
		document.getElementById("stats_update_log").innerHTML += msg+"</br>";*/
			
		return objective_func;
	},
	
	calcObjectiveFunctionValue: function( sr_diff, class_unevenness, otp_conflicts ) {
		//return Math.round( 
		var OF = 
			(class_unevenness * this.balance_priority
			+ (sr_diff/this.balance_max_sr_diff*100)*(100-this.balance_priority)
			+ otp_conflicts )
			/100 ;
		return round_to( OF, 1 );
	},
	
	calcTeamSR: function( team ) {
		var team_sr = 0;
		if (team.length > 0) {
			for( var i=0; i<team.length; i++) {
				var player_sr = team[i].sr;
				player_sr = this.calcPlayerSR( team[i] );
				team_sr += player_sr;
			}
			team_sr = Math.round(team_sr / this.team_size);
		}
		return team_sr;
	},
	
	calcPlayerSR: function ( player ) {
		var player_sr = player.sr;
		if ( this.adjust_sr ) {
			if ( player.top_classes !== undefined ) {
				var top_class = player.top_classes[0];
				if( (top_class !== undefined) && (player.top_classes.length == 1) ) {
					player_sr = Math.round( player_sr * is_undefined(this.adjust_sr_by_class[top_class],100)/100 );
				}
			}
		}
		return player_sr;
	},
	
	calcClassUnevenness: function ( team ) {
		var current_class_count = {};
		for ( c in class_names ) {
			current_class_count[class_names[c]] = 0;
		}
		
		for( p in team) {
			/*for( c=0; c<team[p].top_classes.length; c++ ) {
				current_class_count[team[p].top_classes[c]] += 1 / (c+1);
			}*/
			if ( team[p].top_classes.length == 2 ) {
				current_class_count[team[p].top_classes[0]] += 2/3;
				current_class_count[team[p].top_classes[1]] += 1/3;
			} else if ( team[p].top_classes.length == 1 ) {
				current_class_count[team[p].top_classes[0]] += 1;
			}
		}
		
		var total_class_unevenness = 0;
		for ( var c in this.target_class_count ) {
			var current_class_unevenness = 0;
			if ( this.target_class_count[c] != 0 ) {
				current_class_unevenness = this.calcClassUnevennessValue( current_class_count[c], this.target_class_count[c] );
			} 
			total_class_unevenness += current_class_unevenness;
		}
		
		//return Math.round( total_class_unevenness, 1 );
		return round_to( total_class_unevenness, 1 );
	},
	
	calcClassUnevennessValue: function ( current_class_count, target_class_count ) {
		return Math.abs( 100*Math.pow((current_class_count - target_class_count), 2) );
	},
	
	calcOTPConflicts: function( team ) {
		var otp_conflicts_count = 0;
		// array of one-trick ponies (hero names) in current team
		var current_team_otps = []; 
		for( p in team) {
			if ( team[p].top_heroes.length == 1 ) {
				var current_otp = team[p].top_heroes[0].hero;
				if (current_team_otps.indexOf(current_otp) == -1) {
					current_team_otps.push( current_otp );
				} else {
					otp_conflicts_count++;
				}
			}
		}
		
		return otp_conflicts_count * 10000;	
	},
}

// Algorithm testing
//
// incremental roll:
// 20 players = 38k combinations = 0.5 seconds roll
// 23 players = 100k combinations = 1.5 seconds roll
// 25 players = 177k combinations = 3.5 seconds roll
// 27 players = 300k combinations = 10 seconds roll
// 30 players = 600k combinations = 60 seconds roll
// random roll:
// 100k combinations = 1 second roll
// 500k combinations = 5 seconds roll
//
// overall performance test, 200 players, 33 teams rolled. Firefox 52.9.0 32bit, Core i5 6500
// 1M combinations limit = 570 seconds, 17 teams with OF=0, 18 teams with OF<10, 1 trash team with OF>50
// 500k combinations limit = 300 seconds, 16 teams with OF=0, 18 teams with OF<10, 1 trash team with OF>50
// 300k combinations limit = 180 seconds, 16 teams with OF=0, 18 teams with OF<10, 1 trash team with OF>50
// 200k combinations limit = 120 seconds, 10 teams with OF=0, 16 teams with OF<10, 1 trash team with OF>50
// 100k combinations limit = 60 seconds, 5 teams with OF=0, 18 teams with OF<10, 1 trash team with OF>50
// 50k combinations limit = 30 seconds, 5 teams with OF=0, 18 teams with OF<10, 1 trash team with OF>50
// 30k combinations limit = 18 seconds, 5 teams with OF=0, 16 teams with OF<10, 1 trash team with OF>50
// 10k combinations limit = 6 seconds, 1 team with OF=0, 15 teams with OF < 10, 1 trash team with OF>50
// 5k combinations limit = 3 seconds, 1 team with OF=0, 11 teams with OF < 10, 2 trash teams with OF>50
// 3k combinations limit = 2 seconds, 1 team with OF=0, 7 teams with OF < 10, 1 trash team with OF>50
// 1k combinations limit = 0.7 seconds, 0 team with OF=0, 3 teams with OF < 10, 2 trash teams with OF>50
// 500 combinations limit = 0.3 seconds, 0 team with OF=0, 2 teams with OF < 10, 3 trash teams with OF>50
// 100 combinations limit = 0.1 seconds, 0 team with OF=0, 2 teams with OF < 10, 7 trash teams with OF>50
