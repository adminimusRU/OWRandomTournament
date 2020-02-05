var RandomTeamBuilder = {
	players: [], // active players from lobby
	teams: [], // rolled teams
	
	// id's of checked-in players. 
	// not checked-in will be excluded from roll
	// if empty - ignored
	checkin_list: [],
	
	// id's of twitch subscribers. 
	// non-subs will be excluded from roll if exclude_twitch_unsubs=true
	// if empty - ignored
	twitch_subs_list: [],
	
	// callbacks
	onProgressChange: undefined,
	onDebugMessage: undefined,
	
	// settings
	// slots count by each class. Example: {'dps':2, 'tank':2, 'support':2}
	slots_count: {},
	// rolled team count should be power of 2, for better distribution in single elemination bracked (all teams will be in first round)
	team_count_power2: false,
	// while calculating player's SR will be adjusted by given percent, depenging on player's main class
	// example: adjust_sr_by_class: {'dps':120, 'maintank':100, 'offtank':100, 'support':80},
	adjust_sr: false,
	adjust_sr_by_class: {},
	// expopentialy increase SR scale by specified amount. 0 = no changes
	// higher ranks will receive more SR boost
	sr_exp_scale: 0,
	// balance factors priority (percents, sum must be 100)
	balance_priority_sr: 34,
	balance_priority_class: 33,
	balance_priority_dispersion: 33,
	// target SR standard deviation for rolled teams = lobby SR std.dev. + target_sr_stdev_adjust
	target_sr_stdev_adjust: 0,
	// do not place similar one-trick-ponies together
	separate_otps: true,
	// minimum level requirement (anti-smurf)
	min_level: 0,
	// see twitch_subs_list
	exclude_twitch_unsubs: true,
	// auto assign captains for rolled teams. Possible values: "highest-ranked", "disabled"
	assign_captains: "highest-ranked",
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
	roll_debug: false,
	
	
	// internal
	
	team_size: 0,
	
	balance_max_sr_diff: 100,
	roll_random_limit: 25, // max amount of remaining players for random rolls. Otherwise incremental roll is used
	
	// bit mask for selecting players. 1 = player in team 1, 0 = in team 2.
	player_selection_mask: [],
	// arrays of players' structures for current combination
	picked_players: [],
	
	// mask for current class combination (role lock balancer)
	// each element is index of selected class (index in player.classes) of specified player
	// elements are handled as digits of specified base (=amount of game classes)
	class_selection_mask: [],
	
	// array for counting classes in current combination (role lock balancer)
	// index in array = index of class in class_names
	// value = amount of players on specified class in team
	combination_class_count: [],
	
	// target values for objective function
	target_class_count: {},	// only for classic algorithm, deprecated
	target_team_sr: 0,
	// target SR dispersion (measured as standard deviation)
	target_sr_stdev: 0,
		
	OF_min: 0,
	best_roll_players: "",
	best_roll_slots: "",
	
	filtered_players: [],
	
	predefined_captains_count: 0,
	
	// public methods
	rollTeams: function() {
		var start_time = performance.now();
		
		// calc total team size
		this.team_size = 0;
		for( let class_name in this.slots_count ) {
			this.team_size += this.slots_count[class_name];
		}
		
		// check if we have enough players
		if ( this.players.length < this.team_size ) {
			this.debugMsg( "not enough players" );
			return;
		}
		
		var slots_count_str = "";
		for ( let class_name in this.slots_count ) {
			slots_count_str += class_name+"="+this.slots_count[class_name]+",";
		}
		this.debugMsg( "slots_count = "+slots_count_str );
		this.debugMsg( "team_count_power2 = "+this.team_count_power2 );
		this.debugMsg( "adjust_sr = "+this.adjust_sr );
		this.debugMsg( "adjust_sr_by_class = "+JSON.stringify(this.adjust_sr_by_class) );
		this.debugMsg( "sr_exp_scale = "+JSON.stringify(this.sr_exp_scale) );
		this.debugMsg( "balance_priority_sr = "+this.balance_priority_sr );
		this.debugMsg( "balance_priority_class = "+this.balance_priority_class );
		this.debugMsg( "balance_priority_dispersion = "+this.balance_priority_dispersion );
		this.debugMsg( "target_sr_stdev_adjust = "+this.target_sr_stdev_adjust );				
		this.debugMsg( "separate_otps = "+this.separate_otps );
		this.debugMsg( "max_combinations = "+this.max_combinations );
		this.debugMsg( "OF_min_thresold = "+this.OF_min_thresold );
		this.debugMsg( "OF_max_thresold = "+this.OF_max_thresold );
		
		// filter players without stats
		this.filtered_players = [];
		for ( var i=this.players.length-1; i>=0; i-- ) {
			var exclude = false;
			if ( is_undefined(this.players[i].empty, false) ) {
				exclude = true;
			}
			if ( this.players[i].classes.length == 0 ) {
				exclude = true;
			}
			if ( this.players[i].sr_by_class.length == 0 ) {
				exclude = true;
			}
			
			if (exclude) {
				this.filtered_players.push( this.players.splice(i, 1)[0] );
			}
		}
		
		// filter players by minimum level
		for ( var i=this.players.length-1; i>=0; i-- ) {
			if ( this.players[i].level < this.min_level ) {
				this.filtered_players.push( this.players.splice(i, 1)[0] );
			}
		}
		
		// filter by check-in
		if ( this.checkin_list.length > 0 ) {
			for ( var i=this.players.length-1; i>=0; i-- ) {
				if ( this.checkin_list.indexOf(this.players[i].id) == -1 ) {
					this.filtered_players.push( this.players.splice(i, 1)[0] );
				}
			}
		}
				
		// filter by twitch subscription
		if ( (this.twitch_subs_list.length > 0) && this.exclude_twitch_unsubs ) {
			for ( var i=this.players.length-1; i>=0; i-- ) {
				if ( this.twitch_subs_list.indexOf(this.players[i].id) == -1 ) {
					this.filtered_players.push( this.players.splice(i, 1)[0] );
				}
			}
		}
		
		// shuffle players, so every roll will be different
		this.players = array_shuffle( this.players );
		
		// calc target team count, with possible restriction
		this.target_team_count = Math.floor( this.players.length / this.team_size );
		if (this.team_count_power2) {
			this.target_team_count = Math.pow(2, Math.floor(Math.log2(this.target_team_count)));
		}
		
		// count predefined captains
		this.predefined_captains_count = 0;
		for ( var i=this.players.length-1; i>=0; i-- ) {
			if ( this.players[i].captain ) {
				this.predefined_captains_count++;
			}
		}
		if ( this.predefined_captains_count > this.target_team_count ) {
			this.predefined_captains_count = this.target_team_count;
		}
		
		// possible roll algorithms selection here...
		this.rollTeamsRoleLock();
		
		// reduce team count if needed
		if (this.team_count_power2 && (this.teams.length < this.target_team_count)) {
			var teams_to_delete = this.teams.length-Math.floor(this.target_team_count/2);
			this.debugMsg( "Reducing team count, teams deleted = "+teams_to_delete );
			
			for ( var t=0; t<teams_to_delete; t++ ) {
				var removed_team = this.teams.pop();
				this.players = this.players.concat( removed_team.players );
			}
		}
		
		// return excluded players to lobby
		this.players = this.players.concat(this.filtered_players);
		
		var execTime = performance.now() - start_time;
		this.debugMsg( "Exec time "+execTime+" ms" );
	},
	
	// private methods
	
	// new roll algorithm with role lock
	rollTeamsRoleLock: function() {
		// calculate average team SR and sr dispersion -> balance target
		this.target_team_sr = 0;
		for( p in this.players ) {
			// calculate SR for each player as single number
			// since we can't predict player slot now -
			// using average SR for all classes
			
			var player_sr = this.calcPlayerSRRoleLock( this.players[p] );
			
			this.target_team_sr += player_sr;
		}
		this.target_team_sr = Math.round( this.target_team_sr / this.players.length );
		
		// calc target SR stdev
		this.target_sr_stdev = this.calcSRStDevRolelock( this.players, undefined, this.target_team_sr ) + this.target_sr_stdev_adjust;
		if ( this.target_sr_stdev < 0 ) {
			this.target_sr_stdev = 0;
		}		
		
		this.debugMsg( "Target SR = "+this.target_team_sr );
		this.debugMsg( "Target sr stdev = "+JSON.stringify(this.target_sr_stdev) );
		
		// roll teams
		while ( this.players.length >= this.team_size ) {
			var combinations_checked = 0;
			var player_combinations_checked = 0;
			
			// init
			this.initPlayerMask();			
			this.OF_min = Number.MAX_VALUE;
			// masks of best found roll
			this.best_roll_players_mask = "";
			this.best_roll_slots_mask = "";
			
			// @todo: implement "true random" picking of combined mask [players+classes]
			// instead of random player pick + iterating class mask
			
			// iterate through some possible player and class combinations and calc objective function (OF) for each
			// best balanced combinations have minimum OF value, 0 = perfect
			while ( this.findNextPlayerMask() ) {
				this.picked_players = this.pickPlayersByMask( this.player_selection_mask );
				player_combinations_checked++;
				
				// iterate through all possible player classes combinations for current team
				this.class_selection_mask = Array(this.team_size).fill(0);
				
				do {
					if ( ! this.classMaskValid( this.picked_players, this.class_selection_mask ) ) {
						continue;
					}
				
					// calc objective function
					var OF_current = this.calcObjectiveFunctionRoleLock();
					
					if ( (OF_current-this.OF_min) > this.OF_thresold ) {
						// trash combination, do not save
						continue;
					}
					
					if ( OF_current < this.OF_min ) {
						// remember current roll
						this.OF_min = OF_current;
						this.best_roll_players_mask = this.maskToString(this.player_selection_mask);
						this.best_roll_slots_mask = this.maskToString(this.class_selection_mask);
					}
					
					if ( OF_current <= this.OF_min_thresold ) {
						// choose current roll - good enough
						break;
					}
					
					combinations_checked++;
					if (combinations_checked >= this.max_combinations) break;
				} while ( this.incrementClassMask( this.class_selection_mask ) );
				
				if (combinations_checked >= this.max_combinations) break;
			};
			
			this.debugMsg( "Team #"+(this.teams.length+1) );
			this.debugMsg( "Best OF = "+this.OF_min );
			this.debugMsg( "Combinations checked = "+combinations_checked );
			this.debugMsg( "Player Combinations checked = "+player_combinations_checked );
			
			// check thresold
			if ( this.OF_min > this.OF_max_thresold ) {
				// all combinations are heavily unbalanced, stop rolling
				this.debugMsg( "OF_max_thresold reached, stop roll" );
				break;
			}
			
			// check if any valid team found
			if ( this.best_roll_players_mask == "" ) {
				this.debugMsg( "No valid combination found, stop roll" );
				break;
			}
			
			// create team from best roll
			var new_team = create_empty_team();
			this.player_selection_mask = this.maskFromString( this.best_roll_players_mask );
			this.picked_players = this.pickPlayersByMask( this.player_selection_mask, true );
			this.class_selection_mask = this.maskFromString( this.best_roll_slots_mask );
			
			new_team.slots = this.buildTeamRoleLock( this.picked_players, this.class_selection_mask );
			for ( let class_name in new_team.slots ) {
				sort_players( new_team.slots[class_name], 'sr', false, class_name );
			}
			
			// assign captain
			// check if we have predefined captain in team
			for ( var i=this.picked_players.length-1; i>=0; i-- ) {
				if (this.picked_players[i].captain) {
					new_team.captain_id = this.picked_players[i].id;
					captain_struct = this.picked_players[i];
					this.predefined_captains_count--;
					break;
				}
			}
			// if no predefined captain, pick according to settings
			if (new_team.captain_id == "") {
				if ( this.assign_captains === "highest-ranked" ) {
					var highest_sr = 0;
					var highest_sr_id = "";
					for ( let class_name in new_team.slots ) {
						for (let p in new_team.slots[class_name] ) {
							var player_sr = this.calcPlayerSRRoleLock( new_team.slots[class_name][p], class_name );
							if ( player_sr > highest_sr ) {
								highest_sr = player_sr;
								highest_sr_id = new_team.slots[class_name][p].id;
							}
						}
					}
					new_team.captain_id = highest_sr_id;
				}
			}
			
			// team name
			if (new_team.captain_id == "") {
				new_team.name = "Team "+(this.teams.length+1).toString().padStart( this.target_team_count.toString().length, " ");
			} else {
				// find captain by id
				var captain_struct = undefined;
				for ( let class_name in new_team.slots ) {
					for (let p in new_team.slots[class_name] ) {
						if ( new_team.slots[class_name][p].id == new_team.captain_id ) {
							captain_struct = new_team.slots[class_name][p];
							break;
						}
					}
					if ( captain_struct !== undefined ) {
						break;
					}
				}
				new_team.name = "Team "+captain_struct.display_name;	
			}
						
			this.teams.push( new_team );
			
			var team_sr = this.calcTeamSRRoleLock( this.picked_players, this.class_selection_mask );
			var sr_diff = Math.abs( team_sr - this.target_team_sr );
			var class_mismatch = this.calcClassMismatchRoleLock( );
			var sr_stdev = this.calcSRStDevRolelock( this.picked_players, this.class_selection_mask, team_sr );
			this.debugMsg( "Team name = "+new_team.name );
			this.debugMsg( "Team captain = "+new_team.captain_id );
			this.debugMsg( "OF sr diff = "+sr_diff );
			this.debugMsg( "OF class mismatch = "+class_mismatch );
			this.debugMsg( "OF sr_stdiv= "+sr_stdev );

			if(typeof this.onProgressChange == "function") {
				var current_progress = Math.round( (this.teams.length / this.target_team_count)*100 );
				this.onProgressChange.call( undefined, current_progress );
			}
			
			if ( this.teams.length >= this.target_team_count ) {
				break;
			}
		}
	},
	
	// old roll algorithm without role lock
	// not used, just for history
	// should be broken since rolelock cause some function renamed
	rollTeamsClassic: function() {
		// calculate average class count, sr dispersion and SR per team  -> balance target 
		var total_class_count = {};
		
		this.target_class_count = {};
		this.target_team_sr = 0;
			
		for( c in class_names ) {
			total_class_count[class_names[c]] = 0;
			this.target_class_count[class_names[c]] = 0;
		}
		
		for( p in this.players) {
			if ( this.players[p].top_classes.length == 2 ) {
				total_class_count[this.players[p].top_classes[0]] += 2/3;
				total_class_count[this.players[p].top_classes[1]] += 1/3;
			} else if ( this.players[p].top_classes.length == 1 ) {
				total_class_count[this.players[p].top_classes[0]] += 1;
			}
			
			this.target_team_sr += this.calcPlayerSRClassic( this.players[p] );
		}
		this.target_team_sr = Math.round( this.target_team_sr / this.players.length );
		
		for( c in class_names ) {
			this.target_class_count[class_names[c]] = this.team_size * (total_class_count[class_names[c]] / this.players.length);
			this.target_class_count[class_names[c]]  = round_to(this.target_class_count[class_names[c]], 1);
		}
		
		this.target_sr_stdev = this.calcSRStDev( this.players, this.target_team_sr ) + this.target_sr_stdev_adjust;
		if ( this.target_sr_stdev < 0 ) {
			this.target_sr_stdev = 0;
		}
		
		this.debugMsg( "Target SR = "+this.target_team_sr );
		this.debugMsg( "Target classes = "+JSON.stringify(this.target_class_count) );
		this.debugMsg( "Target sr stdev = "+JSON.stringify(this.target_sr_stdev) );				
		
		// roll teams
		while ( this.players.length >= this.team_size ) {
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
			sort_players( new_team.players, 'sr' );
			
			// assign captain
			// check if we have predefined captain in team
			for ( var i=new_team.players.length-1; i>=0; i-- ) {
				if (new_team.players[i].captain) {
					new_team.captain_index = i;
					this.predefined_captains_count--;
					break;
				}
			}
			// if no predefined captain, pick according to settings
			if (new_team.captain_index == -1) {
				if ( this.assign_captains === "highest-ranked" ) {
					new_team.captain_index = 0;
				}
			}
			
			// team name
			if (new_team.captain_index == -1) {
				new_team.name = "Team "+(this.teams.length+1).toString().padStart( target_team_count.toString().length, " ");
			} else {
				new_team.name = "Team "+new_team.players[new_team.captain_index].display_name;
			}
			
			this.teams.push( new_team );
			
			var team_sr = this.calcTeamSRClassic(new_team.players);
			var sr_diff = Math.abs( team_sr - this.target_team_sr );
			var class_unevenness = this.calcClassUnevenness( new_team.players );
			var sr_stdev = this.calcSRStDev( new_team.players, team_sr );
			this.debugMsg( "team name = "+new_team.name );
			this.debugMsg( "OF sr diff = "+sr_diff );
			this.debugMsg( "OF CU = "+class_unevenness );
			this.debugMsg( "OF sr_stdiv= "+sr_stdev );

			if(typeof this.onProgressChange == "function") {
				var current_progress = Math.round( (this.teams.length / target_team_count)*100 );
				this.onProgressChange.call( undefined, current_progress );
			}
			
			if ( this.teams.length >= target_team_count ) {
				break;
			}
		}
	},
	
	// mask functions
	
	maskToString: function( mask ) {
		return mask.join('');
	},
	
	maskFromString: function( mask_string ) {
		mask = mask_string.split('');
		mask.forEach( function(item) {
			item = Number(item);
		});
		return mask;
	},
	
	maskInvert: function( mask ) {
		var mask_inv = [];
		for( let i=0; i<mask.length; i++ ) {
			mask_inv.push( (mask[i]==0 ? 1 : 0) );
		};
		return mask_inv;
	},
	
	initPlayerMask: function () {
		// start at ...00000111110
		this.player_selection_mask = Array(this.players.length - this.team_size).fill(0).concat( Array(this.team_size).fill(1) );
		this.player_selection_mask[this.players.length-1] = 0;
	},
	
	// increment mask (array): mask = mask + 1
	// entire mask is handled as number of specified digit base 
	incrementMask: function( mask, digit_base ) {
		var buf = 1;
		for ( var index = mask.length - 1; index >=0; index-- ) {
			buf += mask[ index ];
			mask[ index ] = buf % digit_base;
			buf -= mask[ index ];
			if ( buf == 0 ) {
				break;
			}
			buf = Math.floor( buf / digit_base );
		}
		
		// overflow check
		if ( buf > 0 ) {
			return false;
		}
			
		return true;
	},
	
	incrementClassMask: function( class_selection_mask ) {
		return this.incrementMask( class_selection_mask, class_names.length );
	},
	
	classMaskValid: function(picked_players, class_selection_mask) {
		// object to count classes in mask
		for( var global_class_index=0; global_class_index<class_names.length; global_class_index++ ) {
			this.combination_class_count[global_class_index] = 0;
		}
		
		// count selected classes
		for( var i=0; i<class_selection_mask.length; i++ ) {
			var class_index = class_selection_mask[i];
			// check if player class index is correct
			if ( class_index >= picked_players[i].classes.length ) {
				return false;
			}
			
			var class_name = picked_players[i].classes[class_index];
			var global_class_index = class_names.indexOf(class_name);
			this.combination_class_count[ global_class_index ] ++;
		}
		
		// check if class count equals to slots count
		for( var global_class_index=0; global_class_index<class_names.length; global_class_index++ ) {
			var class_name = class_names[global_class_index];
			if ( this.combination_class_count[global_class_index] != this.slots_count[class_name] ) {
				return false;
			}
		}
		
		return true;
	},
	
	// form array of players by specified mask (array)
	// if mask element (bit) ar index I is 1 - pick player with index I
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
	
	findNextPlayerMask: function() {
		if ( this.players.length > this.roll_random_limit ) {
			return this.findNextPlayerMaskRandom();
		} else {
			return this.findNextPlayerMaskIncrement();
		}
	},
	
	findNextPlayerMaskRandom: function() {
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
	
	findNextPlayerMaskIncrement: function() {
		while(true) {
			// binary increment mask
			if ( ! this.incrementMask( this.player_selection_mask, 2 ) ) {
				return false;
			}
			
			// check if mask has needed amount of bits
			var bits_count = 0;
			for ( var index = this.player_selection_mask.length - 1; index >=0; index-- ) {
				bits_count += this.player_selection_mask[ index ];
			}
			if ( bits_count == this.team_size ) {
				return true;
			}
			
			// stop at 11111100000.....001
			var sum_head = 0;
			for ( index=0; index<this.team_size; index++ ) {
				sum_head += this.player_selection_mask[ index ];
			}
			if ( sum_head >= this.team_size ) {
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
	
	// private calculation functions for classic algorithm	(deprecated)
	
	calcObjectiveFunctionClassic: function( picked_players ) {
		var team_sr = this.calcTeamSRClassic(picked_players);
		var sr_diff = Math.abs( team_sr - this.target_team_sr );
		var class_unevenness = this.calcClassUnevenness( picked_players );
		var otp_conflicts = 0;
		if (this.separate_otps) {
			otp_conflicts = this.calcOTPConflicts( picked_players );
		}
		var captains_conflicts = this.calcCaptainsConflicts( picked_players );
		var sr_stdev = this.calcSRStDev( picked_players, team_sr );
		
		var objective_func = this.calcObjectiveFunctionValueClassic( sr_diff, class_unevenness, otp_conflicts, sr_stdev, captains_conflicts );			
		return objective_func;
	},
	
	calcObjectiveFunctionValueClassic: function( sr_diff, class_unevenness, otp_conflicts, sr_stdev, captains_conflicts ) {
		var OF = 
			(class_unevenness * this.balance_priority_class
			+ (sr_diff/this.balance_max_sr_diff*100)*this.balance_priority_sr
			+ Math.abs(sr_stdev - this.target_sr_stdev)*this.balance_priority_dispersion  
			+ otp_conflicts
			+ captains_conflicts
			)
			/100 ;
		return round_to( OF, 1 );
	},
	
	calcTeamSRClassic: function( team ) {
		var team_sr = 0;
		if (team.length > 0) {
			for( var i=0; i<team.length; i++) {
				var player_sr = team[i].sr;
				player_sr = this.calcPlayerSRClassic( team[i] );
				team_sr += player_sr;
			}
			team_sr = Math.round(team_sr / this.team_size);
		}
		return team_sr;
	},
	
	calcPlayerSRClassic: function ( player ) {
		var player_sr = player.sr;
		
		// adjust sr by main class
		if ( this.adjust_sr ) {
			if ( player.top_classes !== undefined ) {
				var top_class = player.top_classes[0];
				if( (top_class !== undefined) && (player.top_classes.length == 1) ) {
					player_sr = Math.round( player_sr * is_undefined(this.adjust_sr_by_class[top_class],100)/100 );
				}
			}
		}
		
		// exponential scale
		player_sr += convert_range_log_scale( player_sr, 1, this.sr_exp_scale, 0, 5000 );
		
		return player_sr;
	},
	
	calcClassUnevenness: function ( team ) {
		var current_class_count = {};
		for ( c in class_names ) {
			current_class_count[class_names[c]] = 0;
		}
		
		for( p in team) {
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
		
		return round_to( total_class_unevenness, 1 );
	},
	
	calcClassUnevennessValue: function ( current_class_count, target_class_count ) {
		return Math.abs( 100*Math.pow((current_class_count - target_class_count), 2) );
	},
	
	calcOTPConflicts: function( players_array ) {
		var otp_conflicts_count = 0;
		// array of one-trick ponies (hero names) in current team
		var current_team_otps = []; 
		for( p in players_array) {
			if ( players_array[p].top_heroes.length == 1 ) {
				var current_otp = players_array[p].top_heroes[0].hero;
				if (current_team_otps.indexOf(current_otp) == -1) {
					current_team_otps.push( current_otp );
				} else {
					otp_conflicts_count++;
				}
			}
		}
		
		return otp_conflicts_count * 10000;	
	},
	
	calcSRStDevClassic: function( team, team_sr ) {
		var sr_stdev = 0;
		for( p in team) {
			sr_stdev += (this.calcPlayerSRClassic(team[p]) - team_sr)*(this.calcPlayerSRClassic(team[p]) - team_sr);
		}
		sr_stdev = Math.round( Math.sqrt( sr_stdev / (team.length-1) ) );
		return sr_stdev;
	},
	
	// checks if there are multiple predefined captains in team
	calcCaptainsConflicts: function( players_array ) {
		if ( this.predefined_captains_count <= 0 ) {
			// all predefined captain assigned. Do not alter OF
			return 0;
		}
		var captains_count = 0;
		for( p in players_array) {
			if ( players_array[p].captain ) {
				captains_count++;
			}
		}
		
		if ( captains_count == 1 ) {
			return 0;
		} else {
			return 10000;
		}
	},
	
	
	// private calculation functions for role lock algorithm
	
	// objective function (OF) calculation for current players and class combination
	// objective function is a measure of balance for combination 
	// smaller value indicates better balanced combination, 0 = perfect balance
	calcObjectiveFunctionRoleLock: function( print_debug=false ) {
		// for rolelock balancer OF is a combined value of 5 factors:
		// 1) difference between team average SR and target team SR (average of all players)
		// 2) amount of players sitting on role which is not their main class (i.e. playing on offclass)
		// 3) presence of similar 'one trick ponies' in the same team (if enabled)
		// 4) difference between team SR Stdev and target SR stdev
		// 5) amount of captain conflicts
		// each factor is normalized as SR difference
		// weights of factors 1, 2 and 4 are adjusted by balance priority 
		// factors 3 and 5 simply add huge value if any conflict present
		
		var team_sr = this.calcTeamSRRoleLock( this.picked_players, this.class_selection_mask );
		var sr_diff = Math.abs( team_sr - this.target_team_sr );
		var class_mismatch = this.calcClassMismatchRoleLock();
		var otp_conflicts = 0;
		if (this.separate_otps) {
			otp_conflicts = this.calcOTPConflicts( this.picked_players );
		}
		var captains_conflicts = this.calcCaptainsConflicts( this.picked_players );
		var sr_stdev = this.calcSRStDevRolelock( this.picked_players, this.class_selection_mask, team_sr );
		
		var objective_func = this.calcObjectiveFunctionValueRoleLock( sr_diff, class_mismatch, otp_conflicts, sr_stdev, captains_conflicts );			
		return objective_func;
	},
	
	calcTeamSRRoleLock: function( players_array, class_selection_mask ) {
		var team_sr = 0;
		if (players_array.length > 0) {
			for( var i=0; i<players_array.length; i++) {
				var slot_class = players_array[i].classes[ class_selection_mask[i] ];
				var player_sr = this.calcPlayerSRRoleLock( players_array[i], slot_class );
				team_sr += player_sr;
			}
			team_sr = Math.round(team_sr / this.team_size);
		}
		return team_sr;
	},
	
	calcPlayerSRRoleLock: function ( player_struct, class_name=undefined ) {
		if ( class_name === undefined ) {
			// no slot specified - calculate average sr for all classes
			var player_sr = 0;
			for ( const class_name of player_struct.classes ) {
				var class_sr = is_undefined( player_struct.sr_by_class[class_name], 0 );
				// adjust sr by class
				if ( this.adjust_sr ) {
					class_sr = Math.round( class_sr * is_undefined(this.adjust_sr_by_class[class_name],100)/100 );
				}
				
				// exponential scale
				class_sr += convert_range_log_scale( class_sr, 1, this.sr_exp_scale, 0, 5000 );
				
				player_sr += class_sr;
			}
			
			if ( player_struct.classes.length > 0 ) {
				player_sr = Math.round( player_sr / player_struct.classes.length );
			}
			
			return player_sr;
		} else {
			// get SR for specified slot
			var player_sr = get_player_sr( player_struct, class_name );
			
			// adjust sr by class
			if ( this.adjust_sr ) {
				player_sr = Math.round( player_sr * is_undefined(this.adjust_sr_by_class[class_name],100)/100 );
			}
			
			// exponential scale
			player_sr += convert_range_log_scale( player_sr, 1, this.sr_exp_scale, 0, 5000 );
				
			return player_sr;
		}
	},
	
	// calculates measure of players sitting on offroles (not playing their main class)
	// each player player on slot matching his main (first) role = 0 units
	// player player on slot matching his second role = 1 units
	// player player on slot matching his third role = 1.5 units
	// resulting value is normalized as SR difference
	// difference for 1 unit equals to 10 SR difference in average SR
	// 2 units = 40 SR
	// 5 units = 250 SR	
	calcClassMismatchRoleLock: function() {
		var players_on_offclass = 0;
		
		for( var i=0; i<this.picked_players.length; i++) {
			var player_struct = this.picked_players[i];
			// @todo wtf is this. We can just check this.class_selection_mask[i] here (0=main class, 1+=offclass),
			// no need to extract class name 
			var slot_class = player_struct.classes[ this.class_selection_mask[i] ];
			if ( player_struct.classes.indexOf(slot_class) == 1 ) {
				players_on_offclass += 1;
			} else if ( player_struct.classes.indexOf(slot_class) > 1 ) {
				players_on_offclass += 1.5;
			}
		}
		
		return 10 * Math.pow(players_on_offclass, 2);
	},
	
	calcSRStDevRolelock: function( players_array, class_selection_mask=undefined, team_sr ) {
		var sr_stdev = 0;
		var player_count = 0;
		if (players_array.length > 0) {
			for( var i=0; i<players_array.length; i++) {
				var slot_class = undefined;
				if (class_selection_mask !== undefined ) {
					slot_class = players_array[i].classes[ class_selection_mask[i] ];
				}
				var player_sr = this.calcPlayerSRRoleLock( players_array[i], slot_class );
				
				sr_stdev += Math.pow( (player_sr - team_sr), 2 );
				player_count++;
			}
		}
		sr_stdev = Math.round( Math.sqrt( sr_stdev / (player_count-1) ) );
		
		return sr_stdev;
	},
	
	calcObjectiveFunctionValueRoleLock: function( sr_diff, class_mismatch, otp_conflicts, sr_stdev, captains_conflicts ) {
		var OF = 
			(class_mismatch * this.balance_priority_class
			+ (sr_diff/this.balance_max_sr_diff*100)*this.balance_priority_sr
			+ Math.abs(sr_stdev - this.target_sr_stdev)*this.balance_priority_dispersion  
			+ otp_conflicts
			+ captains_conflicts
			)
			/100 ;
		return round_to( OF, 1 );
	},
	
	// creates slots structure with players on specified classes/roles
	buildTeamRoleLock: function ( players_array, class_selection_mask ) {
		var slots = {};
		init_team_slots( slots );
		for( var i=0; i<players_array.length; i++) {
			var slot_class = players_array[i].classes[ class_selection_mask[i] ];
			slots[ slot_class ].push( players_array[i] );
		}
		
		// sort players by sr in each role
		for( let class_names in this.slots_count ) {
			slots[ class_names ].sort( function(player1, player2){
				var val1 = get_player_sr( player1, class_names );
				var val2 = get_player_sr( player2, class_names );
				return val2 - val1;
			} );
		}
		
		return slots;
	},
	
	// debug functions
	
	debugMsg: function ( msg ) {
		if ( this.roll_debug  ) {
			if(typeof this.onDebugMessage == "function") {					
				this.onDebugMessage.call( undefined, msg );
			}
		}
	},
}

// Algorithm testing (classic)
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
//
//
// Role lock algorithm testing (v1 - random player pick, iterate all class combinations)
//
// overall performance test, 200 players, max 33 teams rolled. Firefox 72 64bit, Ryzen 1600
// 5k combinations limit = 10 seconds, 31 teams created, 0 team with OF=0, 14 teams with OF < 10, 4 trash teams with OF>50
// 10k combinations limit = 16 seconds, 31 teams created, 0 team with OF=0, 20 teams with OF < 10, 3 trash teams with OF>50
// 50k combinations limit = 66 seconds, 31 teams created, 0 team with OF=0, 21 teams with OF < 10, 4 trash teams with OF>50
// 100k combinations limit = 111 seconds, 31 teams created, 0 team with OF=0, 23 teams with OF < 10, 4 trash teams with OF>50
// 200k combinations limit = 200 seconds, 31 teams created, 0 team with OF=0, 21 teams with OF < 10, 4 trash teams with OF>50

