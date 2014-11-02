var http = require('http');
var url  = require('url');

var PORT = 3001;

var ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var ALPHA_SIZE = ALPHA.length;

// connections[k] = object Connection wich id is equals to k
var connections = {};

/* ---------
	Define a class called "Connection".
	XXX: move this definition to another file.
 --------------- */
Connection = function(bot_client_partial_key) {

	var fun_connect = function connect(k_c){
		var date = new Date();	
		var day = date.getDate();
		var base = (day + 1) * (day + 2) * (day + 3) * (day + 13);
		var N = 2147483647; // INT_MAX
		var r = N/2 + Math.floor(Math.random() * (N/2)) // INT_MAX/2 <= r <= INT_MAX
		var k_s = base ^ r;
		var key = k_c ^ r;

		return {'key':key, 'key_server':k_s};
	}

	var tmp = fun_connect(bot_client_partial_key);
	this.private_key = tmp.key;
	this.bot_master_partial_key = tmp.key_server;
	this.count = 1;
	this.id = generateConnectionId();
	this.date_last_connection = new Date();

	this.refresh = function (){
		this.count++;
		this.date_last_connection = new Date();
	}

}


function generateConnectionId(){
	var INT_MAX = 2147483647;
	var r = Math.floor(Math.random() * 9) // 0 <= r <= 9
	var id_size = 15;
	var id = ''+r;
	for (var i = 1; i < id_size; i++){
		r = Math.floor(Math.random() * (ALPHA_SIZE))
		if (r % 3 == 0){
			id = ALPHA[ (r * i) % ALPHA_SIZE ] + id;
		}else if (r % 3 == 1){
			id = ALPHA[ (r + i) % ALPHA_SIZE ] + id;
		}else{
			id = id + ALPHA[ (r*r + i) % ALPHA_SIZE ];
		}
	}
	return id;
}

function first_connection (bot_client_partial_key, confirm_value, response){

	connection = new Connection (bot_client_partial_key);
	response.write("<h2>NOW, YOUR ID IS "+connection.id+"</h2>");
	response.write("<h4>KEY_SERVER "+connection.bot_master_partial_key +"</h2>");
	var confirmation = confirm_value ^ connection.private_key;
	response.write("<h5>CONFIRMATION MESSAGE IS "+confirmation+"</h6>");
	response.write("<h6>PRIVATE KEY "+connection.private_key+"</h6>");

	connections[connection.id] = connection; // save this connection into the hash of connections
}

function find_connection (id){
	if (connections[id] === undefined)
		return null;
	connections[id].refresh();
	return connections[id];
}


var server = http.createServer(function (request, response){
	response.writeHead(200, {"Content-Type": "text/html"});

	var result = url.parse(request.url, true);
	var params = result.query;

	// if an id was not sent, then, try to connect and get an id
	if (params['id'] == undefined){
		if (params['k_c'] !== undefined && params['confirm'] !== undefined){
			// XXX: check if k_c is a number
			first_connection(params['k_c'], params['confirm'], response);
		}else{
			response.write("<h2> BAD params ): </h2>");
			response.write("<h4> Try send<br/>id<br/>or<br/>k_c and confirm </h4>");
		}
	}else{		
		connection = find_connection(params['id']);
		if (connection == null){
			response.write("<h3>The connection " + params['id'] + " was not found  :(</h3>");
		}else{
			response.write("<h3>ID: " + connection.id + "<br/>Number of connections: "+ connection.count + "</h3>");
		}
		response.write("<h2> OK </h2>");
	}

	response.end();
});

server.listen(PORT);
