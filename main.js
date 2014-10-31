var http = require('http');
var url  = require('url');

var PORT = 3001;

var ALPHA = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var ALPHA_SIZE = ALPHA.length;

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

function connect(k_c){
	var date = new Date();	
	var day = date.getDate();
	var base = (day + 1) * (day + 2) * (day + 3) * (day + 13);
	var N = 2147483647; // INT_MAX
	var r = N/2 + Math.floor(Math.random() * (N/2)) // INT_MAX/2 <= r <= INT_MAX
	var k_s = base ^ r;
	var key = k_c ^ r;

	var connection = {'key':key, 'key_server':k_s, 'count':1};
	connection.id = generateConnectionId();

	return connection;
}


var count = 0;
/* ---------
	nc: number of connections

	nc[i] = k
  only, and if only, the botclient of id i has connected k times to this server
 
 --------------- */
var nc = {};

var server = http.createServer(function (request, response){
	response.writeHead(200, {"Content-Type": "text/html"});
	response.write("This is the connection number " + count + '.<br/>');
	count++;

	var result = url.parse(request.url, true);
	var params = result.query;

	if (params['id'] == undefined){
		if (params['k_c'] !== undefined
			&& params['confirm'] !== undefined){
			// XXX: test if k_c is a number
			connection = connect (params['k_c']);
			response.write("<h2>NOW, YOUR ID IS "+connection.id+"</h2>");
			response.write("<h4>KEY_SERVER "+connection.key_server+"</h2>");
			var confirmation = params['confirm'] ^ connection.key;
			response.write("<h5>CONFIRMATION MESSAGE IS "+confirmation+"</h6>");
			response.write("<h6>PRIVATE KEY "+connection.key+"</h6>");
		}else{
			response.write("<h3>PROBLEM WITH THE PARAMETERS</h3>");
		}
	}else{		
		response.write("<h2> OK </h2>");
	}

/*	var keys = generateFirstKey();
	response.write("<h2>"
					+keys[2]+" XOR "+params['k_c']+"="+ (params['k_c']^keys[2])
					+"</h2>"); 
	
	response.write("<h5>day = "+ keys[0] +"<br>k_s = "+keys[1]+"</h5>");
	for(var key in result.query){
		response.write("<h2>"+key+" : "+result.query[key]+"</h2>");
	} */

	response.end();
});

server.listen(PORT);
