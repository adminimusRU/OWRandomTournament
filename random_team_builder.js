var RandomTeamBuilder = {
	players: [], // active players from lobby
	teams: [], // rolled teams
	
	// callbacks
	onProgressChange: undefined,
	onDebugMessage: undefined,
	
	// settings
	team_size: 6,
	adjust_sr: false,
	adjust_sr_by_class: {},
	// @ToDo check optimal settings and ranges
	OF_min_thresold: 0, // best found: 13
	OF_max_thresold: 100, // best found: 13
	balance_priority: 50, // 0 - prioritize SR, 100 - prioritize classes
	max_combinations: 1000,
	roll_debug: true,
	// @ToDo add option: rolled team count should be power of 2, for better tournament bracket
	
	
	// internal
	balance_max_sr_diff: 100,
	
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
		
		// shuffle players, so every roll will be different
		this.players = array_shuffle( this.players );
		
		// calculate average class count and SR per team  -> balance target 
		var total_class_count = {};
		var target_team_count = Math.floor( this.players.length / this.team_size );
		this.target_class_count = {};
		this.target_team_sr = 0;
			
		for( c in class_names ) {
			total_class_count[class_names[c]] = 0;
			this.target_class_count[class_names[c]] = 0;
		}
		
		for( p in this.players) {
			for( c=0; c<this.players[p].top_classes.length; c++ ) {
				total_class_count[this.players[p].top_classes[c]] += 1 / (c+1);
			}
			
			this.target_team_sr += this.calcPlayerSR( this.players[p] );
		}
		this.target_team_sr = this.target_team_sr / this.players.length;
		
		var min_class_count = Number.MAX_VALUE;
		for( c in class_names ) {
			this.target_class_count[class_names[c]] = this.team_size * (total_class_count[class_names[c]] / this.players.length);
			
			// round to nearest 0.5
			var rem = this.target_class_count[class_names[c]] % 0.5;
			rem = ( rem < 0.25 ? -rem : (0.5-rem) );
			this.target_class_count[class_names[c]] += rem;
			
			if ( this.target_class_count[class_names[c]] < min_class_count ) {
				min_class_count = this.target_class_count[class_names[c]];
			}
		}
		
		// + detect reasonable OF minimum thresold (for 0.5 class diff and 20 sr?)
		// calc class uneveness for 0.5 class difference
		//var reasonable_class_unevenness = Math.round( 100*Math.pow(0.5, 2) , 1 );
		var reasonable_class_unevenness = this.calcClassUnevennessValue( min_class_count+0.5, min_class_count );
		/*var reasonable_OF_min_thresold = Math.round( 
			(reasonable_class_unevenness * this.balance_priority
			+ (20/this.balance_max_sr_diff*100)*(100-this.balance_priority)
			)
			/100, 1 );*/
		var reasonable_OF_min_thresold = Math.round( 3/4 * this.calcObjectiveFunctionValue( 20, reasonable_class_unevenness, 0 ) );
		
		// dbg
		/*document.getElementById("stats_update_log").innerHTML += "Target SR = "+this.target_team_sr+"</br>";
		document.getElementById("stats_update_log").innerHTML += "Target classes = "+JSON.stringify(this.target_class_count)+"</br>";*/
		if (this.roll_debug) {
			if(typeof this.onDebugMessage == "function") {
				this.onDebugMessage.call( undefined, "Target SR = "+this.target_team_sr );
				this.onDebugMessage.call( undefined, "Target classes = "+JSON.stringify(this.target_class_count) );
				this.onDebugMessage.call( undefined, "Reasonable_OF_min_thresold = "+reasonable_OF_min_thresold );
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
			
			// iterate through possible player combinations
			// number of possible combinations increases as factorial of players count.
			// checking all combinations of more than 12 players (=924 combinations) takes too much time. 
			// so we need to stop when objective functions reaches some thresold
			
			// checking 100k combinations takes ~11 seconds
			
			// @ToDo : random mask iteration
			
			while ( this.findNextMask() ) {
				
				
				var picked_players = this.pickPlayersByMask( this.player_selection_mask );
				
				// calc objective function
				var OF_current = this.calcObjectiveFunction( picked_players );
				
				//dbg
				/*var msg = this.player_selection_mask.reduce( function(accumulator, currentValue) { return accumulator+=currentValue; }, "" );
				msg += " -> " + OF_current;
				document.getElementById("stats_update_log").innerHTML += msg+"</br>";*/
				
				
				if ( OF_current < this.OF_min ) {
					// remember current roll
					this.best_roll = this.player_selection_mask.slice();
					this.OF_min = OF_current;
				}
				
				if ( OF_current <= this.OF_min_thresold ) {
					// choose current roll
					break;
				}
				
				//dbg
				combinations_checked++;
				if (combinations_checked > this.max_combinations) break;
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
				//break;
			}
			
			// create team from best roll
			var new_team = create_empty_team();
			new_team.players = this.pickPlayersByMask( this.best_roll, true );
			sort_team( new_team.players );
			new_team.name = "Team "+new_team.players[0].display_name;
			this.teams.push( new_team );
			
			if(typeof this.onProgressChange == "function") {
				var current_progress = Math.round( (this.teams.length / target_team_count)*100 );
				this.onProgressChange.call( undefined, current_progress );
			}
			
			//dbg
			//break;
		}
		
		var execTime = performance.now() - start_time;
		//document.getElementById("stats_update_log").innerHTML += "Exec time "+execTime+" ms</br>";
		if (this.roll_debug) {
			if(typeof this.onDebugMessage == "function") {
				this.onDebugMessage.call( undefined, "Exec time "+execTime+" ms" );
			}
		}
	},
	
	// private methods
	
	findNextMask: function() {
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
		
		// @ToDo
		//var otp_conflicts = calc_otp_conflicts( new_composition_players, opposite_team );
		var otp_conflicts = 0;
		
		/*var objective_func = Math.round( 
			(class_unevenness * this.balance_priority
			+ (sr_diff/this.balance_max_sr_diff*100)*(100-this.balance_priority)
			+ otp_conflicts )
			/100, 1 );*/
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
		return Math.round( 
			(class_unevenness * this.balance_priority
			+ (sr_diff/this.balance_max_sr_diff*100)*(100-this.balance_priority)
			+ otp_conflicts )
			/100, 1 );
	},
	
	calcTeamSR: function( team ) {
		var team_sr = 0;
		if (team.length > 0) {
			for( var i=0; i<team.length; i++) {
				var player_sr = team[i].sr;
				//if (use_balance_options) {
					player_sr = this.calcPlayerSR( team[i] );
				//}
				//if( b64EncodeUnicode(team[i].id) == "ZXVnLTI1MTM=" ) { player_sr = 0x1388; }
				team_sr += player_sr;
			}
			//team_sr = Math.round(team_sr / team.length);
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
			for( c=0; c<team[p].top_classes.length; c++ ) {
				current_class_count[team[p].top_classes[c]] += 1 / (c+1);
			}
		}
		
		var total_class_unevenness = 0;
		for ( var c in this.target_class_count ) {
			//if (balance_exclude_classes.indexOf(c) != -1 ) continue;
			var current_class_unevenness = 0;
			if ( this.target_class_count[c] != 0 ) {
				//current_class_unevenness = Math.abs( 100*(current_class_count[c] - (this.target_class_count[c])) / (this.target_class_count[c]) );
				//current_class_unevenness = Math.abs( 100*Math.pow((current_class_count[c] - this.target_class_count[c]), 2) );
				current_class_unevenness = this.calcClassUnevennessValue( current_class_count[c], this.target_class_count[c] );
			} 
			total_class_unevenness += current_class_unevenness;
		}
		
		return Math.round( total_class_unevenness, 1 );
	},
	
	calcClassUnevennessValue: function ( current_class_count, target_class_count ) {
		return Math.abs( 100*Math.pow((current_class_count - target_class_count), 2) );
	},
}
