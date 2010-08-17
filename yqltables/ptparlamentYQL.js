var MemberInfo = function(id, name, party, location) {
	this.id = id;
	if (name) this.name = name;
	if (party) this.party = party;
 	if (location) this.location = location;
	// this.photo = this.getFotoURL();
}
MemberInfo.prototype.PRESENCES_URL = 'http://www.parlamento.pt/DeputadoGP/Paginas/PresencasReunioesPlenarias.aspx?BID={id}';
MemberInfo.prototype.FOTO_URL = 'http://app.parlamento.pt/webutils/getimage.aspx?type=deputado&id={id}';
MemberInfo.prototype.DETAIL_URL = 'http://www.parlamento.pt/DeputadoGP/Paginas/Biografia.aspx?BID={id}';
MemberInfo.prototype.ACTIVITY_URL = 'http://www.parlamento.pt/DeputadoGP/Paginas/ActividadeDeputado.aspx?BID={id}';
MemberInfo.prototype.INTERESTS_URL = 'http://www.parlamento.pt/DeputadoGP/Paginas/RegistoInteresses.aspx?BID={id}';

MemberInfo.prototype.getDetailURL = function() {
	return  this.DETAIL_URL.replace('{id}',this.id);
}

MemberInfo.prototype.getActivitylURL = function() {
	return  this.ACTIVITY_URL.replace('{id}',this.id);
}

MemberInfo.prototype.getInterestsURL = function() {
	return  this.INTERESTS_URL.replace('{id}',this.id);
}

MemberInfo.prototype.getFotoURL = function() {
	return  this.FOTO_URL.replace('{id}',this.id);
}

MemberInfo.prototype.getPresencesURL = function() {
	return this.PRESENCES_URL.replace('{id}',this.id);
}

MemberInfo.prototype.getXML = function() {
	var d = <deputado/>;
	
	var stringValues = [
		'id',
		'name',
		'completeName',
		'party',
		'location',
		'photo',
		'profession',
		'birthdate',
		'education'		
	];
	
	for (var h = 0; h < stringValues.length; h++) {
		if (!this[stringValues[h]]) continue;
		d.deputado += <{stringValues[h]}>{this[stringValues[h]]}</{stringValues[h]}>;
	}
	
	var arrayValues = ['titles', 'previousTitles', 'comissions', 'legislatures'];
	for (var h = 0; h < arrayValues.length; h++) {
		if (!this[arrayValues[h]]) {
			continue;
		}
		for (var j = 0; j < this[arrayValues[h]].length; j++) {
			d.deputado += <{arrayValues[h]}>
								{this[arrayValues[h]][j]}
						  </{arrayValues[h]}>;
		}
	}
	
	if (this.activity) {
		d.deputado += y.jsonToXml(this.activity);
	}
	
	if (this.presences) {
		d.deputado += y.jsonToXml(this.presences);
	}
	
	return d;
}

MemberInfo.prototype.queryDetailData = function() {
	var url = this.getDetailURL();
	var query = y.query('select * from html where url=@url', {url: url} );
	return query;
}

MemberInfo.prototype.getDetailData = function(query) {
	if (!query) {
		query = this.queryDetailData();
	}
	var result = query.results;
	this.completeName = getValueString( result..span.(@['id']=='ctl00_ctl13_g_8035397e_bdf3_4dc3_b9fb_8732bb699c12_ctl00_ucNome_rptContent_ctl01_lblText'));
	this.profession = getValueString( result..span.(@['id']=='ctl00_ctl13_g_8035397e_bdf3_4dc3_b9fb_8732bb699c12_ctl00_ucProf_rptContent_ctl01_lblText'));
	this.birthdate = getValueString( result..span.(@['id']=='ctl00_ctl13_g_8035397e_bdf3_4dc3_b9fb_8732bb699c12_ctl00_ucDOB_rptContent_ctl01_lblText'));
	this.education = getValueString( result..span.(@['id']=='ctl00_ctl13_g_8035397e_bdf3_4dc3_b9fb_8732bb699c12_ctl00_ucHabilitacoes_rptContent_ctl01_lblText'));	

	this.titles = getValueArray( result..span.(@['id'].toString().match('CargosDesempenha') && !@['id'].toString().match('Titulo')) );
	this.previousTitles = getValueArray( result..span.(@['id'].toString().match('CargosExercidos') && !@['id'].toString().match('Titulo')) );
	this.comissions = getValueArray( result..span.(@['id'].toString().match('Comissoes') && !@['id'].toString().match('Titulo')) );

	var legislatures = result..table.(@['id'].toString().match('TabLegs')).tr;
	this.parseLegislatures(legislatures);
}

MemberInfo.prototype.parseLegislatures = function (legs) {
	var legislatures = [];
	var first = true;
	for each (var leg in legs) {
		if (first) {
			first = false;
			continue;
		}
		var legislature = {};
		var name = leg.td[0]..span;
		if (name) legislatures.push(name.text().toString().replace(/\s+/g, ' '));
	}
	this.legislatures = legislatures;
}

MemberInfo.prototype.queryPresences = function() {
	var url = this.getPresencesURL();
	var query = y.query('select * from html where url=@url', {url: url} );
	return query;
}

MemberInfo.prototype.getPresences = function(query) {
	if (!query) {
		query = this.queryPresences();
	}
	var result = query.results;
	var sessions = result..table.(@['id'].toString().match('Reunioes'))..tr;
	var presenceKey = {
		'P' 	: 'present',
		'FJ'	: 'notpresentjustified',
		'FI'	: 'notpresentnotjustified',
		'AMP'	: 'parlamentalmission'
	}

	var sessionsParsed = [];
	var stats = {};
	var justifications = [];

	var first = true;
	for each (var session in sessions) {
		if (first) {
			first = false;
			continue;
		}

		var session = {
			date 			: getValueString( session.td[0].a ),
			sessionType 	: getValueString( session.td[2].span ),
			presence 		: getValueString( session.td[3].span ),
			justification 	: getValueString( session.td[4].span )
		}
	
		sessionsParsed.push(session);
	
		if (session.presence.match(/\((.*)\)/)) {
			var presKey = session.presence.match(/\((.*)\)/).pop();
			presKey = presenceKey[presKey];
			if (!stats[presKey]) stats[presKey] = 0;
			stats[presKey]++;
		}
	
		if (session.justification && !justifications.join().match(session.justification)) {
			justifications.push(session.justification);
		}
	}

	stats.justifications = justifications;

	this.presences = {
		presences		: stats
		// sessions	: sessionsParsed
	}
}

MemberInfo.prototype.queryActivity = function() {
	var url = this.getActivitylURL();
	var query = y.query('select * from html where url=@url', {url: url} );
	return query;
}

MemberInfo.prototype.getActivity = function(query) {
	if (!query) {
		query = this.queryActivity();
	}
	var result = query.results;
	var initiatives = result..table.(@['id'].toString().match('Iniciativas'))..tr;
	var initiativesData = [];
	var initiativeTypes = [];

	var first = true;
	for each ( var initiative in initiatives) {
		if (first) {
			first = false;
			continue;
		}

		var type = getValueString( initiative.td[0].span );
		if (!initiativeTypes.join().match(type)) {
			initiativeTypes.push(type);
			initiativesData.push({
				type	: type,
				count	: 1
			});
			continue;
		}

		var found = false;
		var c = 0;
		while (!found) {
			if (!initiativesData[c]) {
				break;
			}
			found = initiativesData[c].type == type;
			if (found) {
				initiativesData[c].count++;
			}
			c++;
		}
	}
	
	var requestData = result..table.(@['id'].toString().match('Requerimentos'))..tr;
	var questionsData = result..table.(@['id'].toString().match('pnlPerguntas'))..tr;
	var comissionsData = result..table.(@['id'].toString().match('dtgComissoes'))..tr;
	var interventionsData = result..table.(@['id'].toString().match('dtgIntervencoes'))..tr;
	var auditionsData = result..table.(@['id'].toString().match('dtgAudicoes'))..tr;
	var hearingsData = result..table.(@['id'].toString().match('dtgAudiencias'))..tr;
	this.activity = { 'activity' : {
			'initiative' 	: 	initiativesData,
			'requests'		:  	requestData.length()-1,
			'questions'		:  	questionsData.length()-1,
			'comissions'	:  	comissionsData.length()-1,
			'interventions'	:  	interventionsData.length()-1,
			'auditions'		:  	auditionsData.length()-1,
			'hearings'		:  	hearingsData.length()-1,
	}};
}

// Utilities
var getValueString = function( el ) {
	return  ( el ? el.text().toString().replace(/\s+/g, ' ') : undefined);
}

var getValueArray = function (elements) {
	var results = [];
	for each (var element in elements) {
		results.push(element.text().toString().replace(/\s+/g, ' '));
	}
	return results;
}