var class_names = [
	"maintank",
	"offtank",
	"dps",
	"support"
];

var hero_classes = {
	orisa:			"maintank",
	reinhardt:		"maintank",
	winston:		"maintank",
	wrecking_ball:	"maintank",
	
	dva:			"offtank",
	roadhog:		"offtank",
	zarya:			"offtank",
	
	ashe:			"dps",
	bastion:		"dps",
	doomfist:		"dps",
	genji:			"dps",
	hanzo:			"dps",
	junkrat:		"dps",
	mccree:			"dps",
	mei:			"dps",
	pharah:			"dps",
	reaper:			"dps",
	soldier76:		"dps",
	sombra:			"dps",
	symmetra:		"dps",
	torbjorn:		"dps",
	tracer:			"dps",	
	widowmaker:		"dps",
	
	ana:			"support",
	baptiste:		"support",
	brigitte:		"support",
	lucio:			"support",
	mercy:			"support",
	moira:			"support",
	zenyatta:		"support",
};

var ow_ranks = {
	"unranked":		{ min: 0, max: 0 },
	"bronze":		{ min: 1, max: 1499 },
	"silver":		{ min: 1500, max: 1999 },
	"gold":			{ min: 2000, max: 2499 },
	"platinum":		{ min: 2500, max: 2999 },
	"diamond":		{ min: 3000, max: 3499 },
	"master":		{ min: 3500, max: 3999 },
	"grandmaster":	{ min: 4000, max: 4399 },
	"top500":		{ min: 4400, max: 5000 },
};
