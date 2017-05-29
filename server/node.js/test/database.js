/* 
 * Date : 2016.08.25
 * Author : KDH
 * Description : bootstrap-admin 전용 Web Service
 */

// 모듈을 추출합니다.
var mysql = require('mysql');				// npm install mysql
var http = require('http');
var express = require('express');			// npm install express
var bodyParser = require('body-parser');	// npm install body-parser

/*
 * 데이터베이스와 연결합니다.
 * 
 * host : 연결할 호스트
 * port : 연결할 포트
 * user : 사용자 이름
 * password : 사용자 비밀번호
 * database : 연결할 데이터베이스
 * debug : 디버그 모드 사용여부
 */
var client = mysql.createConnection({
//	host: 'uripaytest.cqdqvglbdaph.ap-northeast-2.rds.amazonaws.com',
//	port: '3306',
//	user: 'uripay',
//	password: '!Trowang1029',
//	database: 'uripay'

	host: 'dabang-pay-dev.cvrnsju88k77.ap-northeast-2.rds.amazonaws.com',
	port: '3306',
	user: 'dabang',
	password: '0wrvNVej0Txy',
	database: 'dabang_pay'
});

// 웹 서버를 생성합니다.
var app = express();
app.use(express.static('public'));
//app.use(app.router);

// 웹 서버를 실행합니다.
http.createServer(app).listen(52273, function() {
	console.log('Server Running at http://127.0.0.1:52273');
});

// POST 방식으로 전달되는 파라미터 처리를 위해 필요
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// log 외부 모듈추출
const logModule = require('./log.js');
const logger = logModule.getLogger();

//logger.trace('Entering cheese testing');
//logger.debug('Got cheese.');
//logger.info('Cheese is Gouda.');
//logger.warn('Cheese is quite smelly.');
//logger.error('Cheese is too ripe!');
//logger.fatal('Cheese was breeding ground for listeria.');

// xml(쿼리) 모듈추출
var util = require('util');
var fs = require('fs');
var xml_digester = require("xml-digester");	// npm install xml-digester 
var digester = xml_digester.XmlDigester({});

// 로그인
app.post('/login', function(request, response) {
	console.log('********************************');
	console.log('* 로그인을 요청합니다. (statusCode : ['+response.statusCode+'])'); 

	// 변수를 선언합니다.
	const body = request.body;
	//logger.info(body);	// { id: 'dhkang87', password: '1234' }

	// 예외처리
//	if(!body.id)		{ return response.send('아이디를 보내주세요.'); }
//	if(!body.password)	{ return response.send('비밀번호를 보내주세요.'); }
	//console.log("id : "+body.id +" / pw : "+body.password);

	// POST로 넘어온 파라메터를 추출합니다.
	const user_email = body.email;
	const user_phone = body.phone;

	// Database 조회 (예외처리를 위해 count 추가!)
//	var query = "SELECT COUNT(*) AS totalCnt, admin_id, admin_pw "+
//			  "FROM tbl_admin_info "+
//			  "WHERE admin_id=? and admin_pw=?";

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/member.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.login;

			logger.info(global.request_query);
		}
	});

	// util.format(쿼리문, 매개변수...)
	var query = util.format(global.request_query, user_email, user_phone);

	client.query(query, function (error, result, field) {
		//logger.info(result);	// [ RowDataPacket { cnt: 1, admin_id: 'dhkang87', admin_pw: '1234' } ]

		if(error) {
			console.log('* login error : ', error.code );
		} else {
			const arrJson = {};
			const queryResult = result[0];
			const totalCnt = queryResult.totalCnt;

			logger.info('* totalCnt : '+totalCnt);

			if(totalCnt > 0) {	// 데이터 있음
				// Set JSON data
				const arrJsonDat = {};
				arrJsonDat.MemID = queryResult.MemID;
				arrJsonDat.Memail = queryResult.Memail.toString('utf-8');	// 인코딩(buffer->string)
				arrJsonDat.Mname = queryResult.Mname.toString('utf-8');		// 인코딩(buffer->string)
				arrJsonDat.Mphone = queryResult.Mphone.toString('utf-8');	// 인코딩(buffer->string)

				// 클라이언트에 보낼 JSON 데이터 형태
				/* ex)
				 * {
				 *   CODE: 200,
				 *   RESULT: 'Success',
				 *   DAT: {
				 *     id: ...
				 *     pw: ...
				 *   }
				 * }
				 */
				arrJson.CODE = '999';
				arrJson.RESULT = 'Success';
				arrJson.DAT = arrJsonDat;

				console.log('* 로그인 완료.');
			} else {		// 데이터 없음
				arrJson.CODE = '000';
				arrJson.RESULT = 'Fail';

				console.log('* 로그인 실패.');
			}

			// 응답합니다.
			response.header("Access-Control-Allow-Origin", "*");
			response.send(arrJson);

			//response.redirect('/');
		}
	});
});

// 전체 데이터 조회
app.get('/contracts', function(request, response) {
	console.log('********************************');
	console.log('* 신청계약목록을 조회합니다. (statusCode : ['+response.statusCode+'])');

	//console.log(request.query);							// 클라이언트에서 요청한 파라메터들
	// jqGrid에서 넘어오는 파라메터들
	// http://localhost:52273/products?_search=false&nd=1471423026084&rows=10&page=1&sidx=id&sord=desc
	// &searchField=name&searchString=검색어&searchOper=eq&filters=

	// 이전버전용
	//const search = request.param('_search');			// 검색여부

	// 최신버전용
	const search = request.query._search;				// 검색여부
	const rows = request.query.rows;					// 보여주는 갯수
	var page = request.query.page;						// 페이지 번호
	const sidx = request.query.sidx;					// 소팅 기준 컬럼
	const sord = request.query.sord;					// desc/asc

	// 검색시 넘어오는 파라메터를
	const searchField = request.query.searchField;		// 검색할 컬럼명
	const searchString = request.query.searchString;	// 검색어
	const searchOper = request.query.searchOper;		// 조건 (eq: 같다, ne: 같지 않다, bw: 로 시작한다, bn: 로 시작하지 않는다,
														// ew: 로 끝난다, en: 로 끝나지 않는다, cn: 내에 존재한다, nc: 내에 존재하지 않는다,
														// nu: is null, nn: is not null, in: 내에 있다, ni: 내에 있지 않다)
	//const filters = request.query.filters;				// ??

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/contract.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.contract_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.contract_list;
		}
	});

	var add_request_query1 = '';
	var add_request_query2 = '';

	if(search == 'true') {	// 검색 O
		// where절 생성 (검색시에만)
		add_request_query1 += ' WHERE ';

		switch(searchOper) {
			case 'eq':	// 같다
			case 'cn':	// 내에 존재한다
			case 'in':	// 내에 있다
				add_request_query1 += searchField+' = "'+ searchString +'" ';
				break;
			case 'ne':	// 같지않다
			case 'nc':	// 내에 존재하지 않는다
			case 'ni':	// 내에 있지 않다
				add_request_query1 += searchField+' != "'+ searchString +'" ';
				break;
			case 'bw':	// ~로 시작한다
				add_request_query1 += searchField+' LIKE "'+ searchString +'%" ';
				break;
			case 'bn':	// ~로 시작하지 않는다
				add_request_query1 += searchField+' NOT LIKE "'+ searchString +'%" ';
				break;
			case 'ew':	// ~로 끝난다
				add_request_query1 += searchField+' LIKE "%'+ searchString +'" ';
				break;
			case 'en':	// ~로 끝나지 않는다
				add_request_query1 += searchField+' NOT LIKE "%'+ searchString +'" ';
				break;
			case 'nu':	// is null
				add_request_query1 += searchField+' IS NULL ';
				break;
			case 'nn':	// is not null
				add_request_query1 += searchField+' IS NOT NULL ';
				break;
			default:
				break;
		}
	}

	const offSet = (Number(page)-1) * Number(rows);
	if(sidx) add_request_query2 += 'ORDER BY ' + sidx + ' ';
	if(sord) add_request_query2 += sord+' ';
	if(rows) add_request_query2 += 'LIMIT ' + Number(offSet) + ', ' +Number(rows);

	var query;
	if(search == 'false') {			// 검색 X
		query = global.request_totalCnt;
	} else if(search == 'true') {	// 검색 O
		query = (global.request_totalCnt + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			/* {
				  [Error: ER_PARSE_ERROR: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from test_products' at line 1]
				  code: 'ER_PARSE_ERROR',
				  errno: 1064,
				  sqlState: '42000',
				  index: 0
				}
			*/
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;
		}
	});

	if(search == 'false') {			// 검색 X
		query = (global.request_query + add_request_query2);
	} else if(search == 'true') {		// 검색 O
		query = (global.request_query + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 리스트를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 리스트 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		// 클라이언트에 보낼 JSON 데이터
		const arrJson = {};

		if(error) {
			console.log('* select error : ', error.code );

			arrJson.replyCode = '000';
			arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
			arrJson.total = 0;								// 페이지 총 갯수
			arrJson.records = 0;							// 데이터 총 갯수
			arrJson.page = 0;								// 페이지 인덱스
			arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

			response.header("Access-Control-Allow-Origin", "*");
			//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			response.send(arrJson);
		} else {
			if(result != '') {	// 조회 내역 있음
				if(global.totalCnt > 0) {	// 데이터 있음
					/* 클라이언트에 보낼 JSON 데이터 형태
					 * {
					 *   replyCode: '999',
					 *   replyMsg: '조회가 완료되었습니다.',
					 *   total: 2,		// 페이지 총 갯수
					 *   records: 14,	// 데이터 총 갯수
					 *   page: '1',		// 페이지 인덱스
					 *   rows: {		// 데이터 배열
					 *     totalCnt: ...,
					 *     id: ...,
					 *     name: ...
					 *   }
					 * }
					 */
					var totalPage = 0;
					totalPage = Math.ceil(global.totalCnt/rows);	// 올림
					if(page > totalPage) page = totalPage;

					// Set JSON data
					arrJson.replyCode = '999';						// 응답코드
					arrJson.replyMsg = '조회가 완료되었습니다.';	// 응답메세지
					arrJson.total = totalPage;						// 페이지 총 갯수
					arrJson.records = global.totalCnt;				// 데이터 총 갯수
					arrJson.page = page;							// 페이지 인덱스
					arrJson.rows = result;							// 실제 그리드에 뿌려줄 데이터

					console.log('* 신청계약목록 조회완료.');
				} else {		// 데이터 없음
					arrJson.replyCode = '000';						// 응답코드
					arrJson.replyMsg = '조회내역이 없습니다.';		// 응답메세지
					arrJson.total = 0;								// 페이지 총 갯수
					arrJson.records = 0;							// 데이터 총 갯수
					arrJson.page = 0;								// 페이지 인덱스
					arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

					console.log('* 신청계약목록 조회내역없음.');
				}

				
			} else {	// 조회 내역 없음
				console.log('* 신청계약목록 조회내역없음.');

				arrJson.replyCode = '000';
				arrJson.replyMsg = '조회내역이 없습니다.';
				arrJson.total = 0;								// 페이지 총 갯수
				arrJson.records = 0;							// 데이터 총 갯수
				arrJson.page = 0;								// 페이지 인덱스
				arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

				//response.header("Access-Control-Allow-Origin", "*");
				//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
			}

			// 응답합니다.
			response.header("Access-Control-Allow-Origin", "*");
			response.send(arrJson);
		}
	});
});

// 신청계약목록 엑셀 다운로드
app.get('/contract/excel', function(request, response) {
	console.log('********************************');
	console.log('* 신청계약목록을 엑셀로 저장하기위해 데이터를 조회합니다. (statusCode : ['+response.statusCode+'])');

	//console.log(request.query);							// 클라이언트에서 요청한 파라메터들
	// jqGrid에서 넘어오는 파라메터들
	// 전체
	//http://localhost:8080/products/excel?_search=false&nd=1471508595867&rows=10&page=1&sidx=id&sord=desc
	//&filters=&oper=14

	// 검색
	//http://localhost:8080/products/excel?_search=true&nd=1471508763185&rows=10&page=1&sidx=id&sord=desc
	//&searchField=name&searchString=American&searchOper=bw
	//&filters=&oper=4

	// 최신버전용
	const search = request.query._search;				// 검색여부
	const rows = request.query.rows;					// 보여주는 갯수
	var page = request.query.page;						// 페이지 번호
	const sidx = request.query.sidx;					// 소팅 기준 컬럼
	const sord = request.query.sord;					// desc/asc

	// 검색시 넘어오는 파라메터를
	const searchField = request.query.searchField;		// 검색할 컬럼명
	const searchString = request.query.searchString;	// 검색어
	const searchOper = request.query.searchOper;		// 조건 (eq: 같다, ne: 같지 않다, bw: 로 시작한다, bn: 로 시작하지 않는다,
														// ew: 로 끝난다, en: 로 끝나지 않는다, cn: 내에 존재한다, nc: 내에 존재하지 않는다,
														// nu: is null, nn: is not null, in: 내에 있다, ni: 내에 있지 않다)
	//const filters = request.query.filters;				// ??

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/contract.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.contract_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.contract_list;
		}
	});

	var add_request_query1 = '';
	var add_request_query2 = '';

	if(search == 'true') {	// 검색 O
		// where절 생성 (검색시에만)
		add_request_query1 += ' WHERE ';

		switch(searchOper) {
			case 'eq':	// 같다
			case 'cn':	// 내에 존재한다
			case 'in':	// 내에 있다
				add_request_query1 += searchField+' = "'+ searchString +'" ';
				break;
			case 'ne':	// 같지않다
			case 'nc':	// 내에 존재하지 않는다
			case 'ni':	// 내에 있지 않다
				add_request_query1 += searchField+' != "'+ searchString +'" ';
				break;
			case 'bw':	// ~로 시작한다
				add_request_query1 += searchField+' LIKE "'+ searchString +'%" ';
				break;
			case 'bn':	// ~로 시작하지 않는다
				add_request_query1 += searchField+' NOT LIKE "'+ searchString +'%" ';
				break;
			case 'ew':	// ~로 끝난다
				add_request_query1 += searchField+' LIKE "%'+ searchString +'" ';
				break;
			case 'en':	// ~로 끝나지 않는다
				add_request_query1 += searchField+' NOT LIKE "%'+ searchString +'" ';
				break;
			case 'nu':	// is null
				add_request_query1 += searchField+' IS NULL ';
				break;
			case 'nn':	// is not null
				add_request_query1 += searchField+' IS NOT NULL ';
				break;
			default:
				break;
		}
	}

	//const offSet = (Number(page)-1) * Number(rows);
	if(sidx) add_request_query2 += 'ORDER BY ' + sidx + ' ';
	if(sord) add_request_query2 += sord+' ';
	//if(rows) add_request_query2 += 'LIMIT ' + Number(offSet) + ', ' +Number(rows);

	var query = '';
	if(search == 'false') {			// 검색 X
		query = global.request_totalCnt;
	} else if(search == 'true') {	// 검색 O
		query = (global.request_totalCnt + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;
		}
	});

	if(search == 'false') {			// 검색 X
		query = (global.request_query + add_request_query2);
	} else if(search == 'true') {		// 검색 O
		query = (global.request_query + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 리스트를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 리스트 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		// 클라이언트에 보낼 JSON 데이터
		const arrJson = {};

		if(error) {
			console.log('* select error : ', error.code );

			arrJson.replyCode = '000';
			arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
			arrJson.total = 0;								// 페이지 총 갯수
			arrJson.records = 0;							// 데이터 총 갯수
			arrJson.page = 0;								// 페이지 인덱스
			arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

			response.header("Access-Control-Allow-Origin", "*");
			//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			response.send(arrJson);
		} else {
			if(result != '') {	// 조회 내역 있음
				if(global.totalCnt > 0) {	// 데이터 있음
					// 엑셀 세팅
					const today = new Date();
					const yyyy= today.getFullYear().toString();
					const mm = (today.getMonth()+1).toString();
					const dd = today.getDate().toString();
					//const yyyymmdd = yyyy +"-"+(mm[1] ? mm : '0'+mm[0])+"-"+(dd[1] ? dd : '0'+dd[0]); // ex)2016-01-01
					const yyyymmdd = yyyy+(mm[1] ? mm : '0'+mm[0])+(dd[1] ? dd : '0'+dd[0]); // ex)20160101

					const time = new Date(); 
					const hour = time.getHours().toString();
					const minute = time.getMinutes().toString();
					const second = time.getSeconds().toString();
					const hhmmss = hour+minute+second;
					const filename = 'contract_'+yyyymmdd+hhmmss+'.xlsx';

					// excel 모듈 추출
					var nodeExcel = require('excel-export');	// npm install excel-export

					var conf ={};
					conf.stylesXmlFile = __dirname+"/node_modules/excel-export/example/styles.xml";
					conf.name = 'sheet';	// sheet 명
					conf.cols = [
						{
							caption:'ID',
							type:'number',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:10
						},
						{
							caption:'주소',
							type:'string',
//							beforeCellWrite:function(row, cellData){
//								return cellData.toUpperCase();	// 대문자
//							},
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:65
						},
						{
							caption:'상세주소',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:20
						},
						{
							caption:'계약시작일',
							type:'string',
							width:12,
							captionStyleIndex: 2,	// 배경색 노랑색으로
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
//					                if (eOpt.rowNum%2){
//					                    eOpt.styleIndex = 1;
//					                }  
//					                else{
//					                    eOpt.styleIndex = 2;
//					                }
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var originDate = new Date(cellData);
										return originDate.toLocaleDateString();
									}
								}
							}()
						},
						{
							caption:'계약종료일',
							type:'string',
							width:12,
							captionStyleIndex: 2,	// 배경색 노랑색으로
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
//					                if (eOpt.rowNum%2){
//					                    eOpt.styleIndex = 1;
//					                }  
//					                else{
//					                    eOpt.styleIndex = 2;
//					                }
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var originDate = new Date(cellData);
										return originDate.toLocaleDateString();
									}
								}
							}()
						},
						{
							caption:'보증금',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:14,
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var str = cellData+"";

										// 입력된 금액이 0보다 작은경우 (-) 부호를 콤마 적용 후에 스트링연결로 처리!
										var negativeYn = 0;
										if(parseInt(cellData) < 0) {
											negativeYn = 1;
											str = Math.abs(parseInt(cellData)) + "";
										} else {
											negativeYn = 0;
										}

										var nam = str.length % 3;
										var value = "";

										for(var i = 0; i < str.length; i++) {
											var ch = str.charAt(i);
											for(var k = 0; k<str.length/3; k++) {
												if(i == nam + 3 * k && i != 0)
													value =  value + ',';
											}
											value = value + ch;
										}

										if(negativeYn == 1) {
											value = "-" + value;
										}

										return value+"원";
									}
								}
							}()
						},
						{
							caption:'월세',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:14,
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var str = cellData+"";

										// 입력된 금액이 0보다 작은경우 (-) 부호를 콤마 적용 후에 스트링연결로 처리!
										var negativeYn = 0;
										if(parseInt(cellData) < 0) {
											negativeYn = 1;
											str = Math.abs(parseInt(cellData)) + "";
										} else {
											negativeYn = 0;
										}

										var nam = str.length % 3;
										var value = "";

										for(var i = 0; i < str.length; i++) {
											var ch = str.charAt(i);
											for(var k = 0; k<str.length/3; k++) {
												if(i == nam + 3 * k && i != 0)
													value =  value + ',';
											}
											value = value + ch;
										}

										if(negativeYn == 1) {
											value = "-" + value;
										}

										return value+"원";
									}
								}
							}()
						},
						{
							caption:'매월입금일',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:12,
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var value = cellData+"일";
										return value;
									}
								}
							}()
						},
						{
							caption:'등록일',
							type:'string',
							width:26,
							captionStyleIndex: 2,	// 배경색 노랑색으로
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									//logger.info(eOpt);	// { rowNum: 2, styleIndex: null, cellType: 'string' } 
//					                if (eOpt.rowNum%2){
//					                    eOpt.styleIndex = 1;
//					                }  
//					                else{
//					                    eOpt.styleIndex = 2;
//					                }
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var originDate = new Date(cellData);
										var date = originDate.toLocaleDateString();
										var time = originDate.toLocaleTimeString();
										var ampm = Number(time.substring(0,2)) < 12 ? '오전' : '오후';
										return date+" "+ampm+" "+time;
									}
								}
							}()
						}
					];

					var tmpArr = new Array();
					for(var i=0; i<global.totalCnt; i++) {
						var arr = [];
						arr.push(result[i].CntID,
								result[i].Addr,
								result[i].AddrDetail,
								result[i].Cstdt,
								result[i].Cenddt,
								result[i].Depo,
								result[i].Mrent,
								result[i].Mpdate,
								result[i].Regdt);
						tmpArr[i] = arr;
					}

					// 데이터 입력
					conf.rows = tmpArr;

					var resultExcel = nodeExcel.execute(conf);
					response.setHeader('Content-Type', 'application/vnd.openxmlformats');
					response.setHeader("Content-Disposition", "attachment; filename="+filename);
					response.end(resultExcel, 'binary');

					console.log('* 신청계약목록 엑셀저장완료.');
				} else {		// 데이터 없음
					console.log('* 신청계약목록 엑셀저장실패.');

					response.header("Access-Control-Allow-Origin", "*");
					response.send();
				}
			} else {	// 조회 내역 없음
				console.log('* 신청계약목록 엑셀저장실패.');

				response.header("Access-Control-Allow-Origin", "*");
				//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
				response.send();
			}
		}
	});
});

// Dashboard - 회원목록 조회
app.get('/dashboard/members', function(request, response) {
	console.log('********************************');
	console.log('* 회원목록을 조회합니다. (statusCode : ['+response.statusCode+'])');

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/member.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.member_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.member_list;
		}
	});

	var query = global.request_totalCnt;

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			/* {
				  [Error: ER_PARSE_ERROR: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from test_products' at line 1]
				  code: 'ER_PARSE_ERROR',
				  errno: 1064,
				  sqlState: '42000',
				  index: 0
				}
			*/
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;

			if(global.totalCnt > 0) {
				var add_request_query = 'ORDER BY MemID DESC LIMIT 8';
				query = global.request_query+add_request_query;

				console.log('* 데이터 리스트를 구하기 위한 쿼리');
				logger.info(query);

				// 데이터 리스트 구하기 위한 쿼리호출
				client.query(query, function(error, result, field) {
					// 클라이언트에 보낼 JSON 데이터
					const arrJson = {};

					if(error) {
						console.log('* select error : ', error.code );

						arrJson.replyCode = '000';
						arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
						arrJson.records = 0;							// 데이터 총 갯수
						arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

						response.header("Access-Control-Allow-Origin", "*");
						//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
						response.send(arrJson);
					} else {
						if(result != '') {	// 조회 내역 있음
							/* 클라이언트에 보낼 JSON 데이터 형태
							 * {
							 *   replyCode: '999',
							 *   replyMsg: '조회가 완료되었습니다.',
							 *   records: 14,	// 데이터 총 갯수
							 *   rows: {		// 데이터 배열
							 *     totalCnt: ...,
							 *     id: ...,
							 *     name: ...
							 *   }
							 * }
							 */

							// Set JSON data
							var arrRows = new Array();

							for(var i=0; i<8; i++) {
								var arrRowDat = new Object();
								arrRowDat.MemID = result[i].MemID;
								arrRowDat.Memail = result[i].Memail.toString('utf-8');	// 인코딩(buffer->string)
								arrRowDat.Mname = result[i].Mname.toString('utf-8');	// 인코딩(buffer->string)
								arrRowDat.Mphone = result[i].Mphone.toString('utf-8');	// 인코딩(buffer->string)

								arrRows.push(arrRowDat);
							}

							arrJson.replyCode = '999';						// 응답코드
							arrJson.replyMsg = '조회가 완료되었습니다.';	// 응답메세지
							arrJson.records = global.totalCnt;				// 데이터 총 갯수
							//arrJson.rows = JSON.stringify(arrRows);			// 실제 그리드에 뿌려줄 데이터
							arrJson.rows = arrRows;							// 실제 그리드에 뿌려줄 데이터

							console.log('* 회원목록 조회완료.');
							
						} else {	// 조회 내역 없음
							console.log('* 회원목록 조회내역없음.');

							arrJson.replyCode = '000';
							arrJson.replyMsg = '조회내역이 없습니다.';
							arrJson.records = 0;							// 데이터 총 갯수
							arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

							//response.header("Access-Control-Allow-Origin", "*");
							//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
						}

						// 응답합니다.
						response.header("Access-Control-Allow-Origin", "*");
						response.send(arrJson);
					}
				});
			} else {
				response.header("Access-Control-Allow-Origin", "*");
				response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			}
		}
	});
});

// 회원목록 조회
app.get('/members', function(request, response) {
	console.log('********************************');
	console.log('* 회원목록을 조회합니다. (statusCode : ['+response.statusCode+'])');

	//console.log(request.query);							// 클라이언트에서 요청한 파라메터들
	// jqGrid에서 넘어오는 파라메터들
	// http://localhost:52273/products?_search=false&nd=1471423026084&rows=10&page=1&sidx=id&sord=desc
	// &searchField=name&searchString=검색어&searchOper=eq&filters=

	// 이전버전용
	//const search = request.param('_search');			// 검색여부

	// 최신버전용
	const search = request.query._search;				// 검색여부
	const rows = request.query.rows;					// 보여주는 갯수
	var page = request.query.page;						// 페이지 번호
	const sidx = request.query.sidx;					// 소팅 기준 컬럼
	const sord = request.query.sord;					// desc/asc

	// 검색시 넘어오는 파라메터를
	const searchField = request.query.searchField;		// 검색할 컬럼명
	const searchString = request.query.searchString;	// 검색어
	const searchOper = request.query.searchOper;		// 조건 (eq: 같다, ne: 같지 않다, bw: 로 시작한다, bn: 로 시작하지 않는다,
														// ew: 로 끝난다, en: 로 끝나지 않는다, cn: 내에 존재한다, nc: 내에 존재하지 않는다,
														// nu: is null, nn: is not null, in: 내에 있다, ni: 내에 있지 않다)
	//const filters = request.query.filters;				// ??

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/member.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.member_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.member_list;
		}
	});

	var add_request_query1 = '';
	var add_request_query2 = '';

	if(search == 'true') {	// 검색 O
		// where절 생성 (검색시에만)
		add_request_query1 += ' WHERE ';

		switch(searchOper) {
			case 'eq':	// 같다
			case 'cn':	// 내에 존재한다
			case 'in':	// 내에 있다
				add_request_query1 += searchField+' = "'+ searchString +'" ';
				break;
			case 'ne':	// 같지않다
			case 'nc':	// 내에 존재하지 않는다
			case 'ni':	// 내에 있지 않다
				add_request_query1 += searchField+' != "'+ searchString +'" ';
				break;
			case 'bw':	// ~로 시작한다
				add_request_query1 += searchField+' LIKE "'+ searchString +'%" ';
				break;
			case 'bn':	// ~로 시작하지 않는다
				add_request_query1 += searchField+' NOT LIKE "'+ searchString +'%" ';
				break;
			case 'ew':	// ~로 끝난다
				add_request_query1 += searchField+' LIKE "%'+ searchString +'" ';
				break;
			case 'en':	// ~로 끝나지 않는다
				add_request_query1 += searchField+' NOT LIKE "%'+ searchString +'" ';
				break;
			case 'nu':	// is null
				add_request_query1 += searchField+' IS NULL ';
				break;
			case 'nn':	// is not null
				add_request_query1 += searchField+' IS NOT NULL ';
				break;
			default:
				break;
		}
	}

	const offSet = (Number(page)-1) * Number(rows);
	if(sidx) add_request_query2 += 'ORDER BY ' + sidx + ' ';
	if(sord) add_request_query2 += sord+' ';
	if(rows) add_request_query2 += 'LIMIT ' + Number(offSet) + ', ' +Number(rows);

	var query;
	if(search == 'false') {			// 검색 X
		query = global.request_totalCnt;
	} else if(search == 'true') {	// 검색 O
		query = (global.request_totalCnt + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			/* {
				  [Error: ER_PARSE_ERROR: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from test_products' at line 1]
				  code: 'ER_PARSE_ERROR',
				  errno: 1064,
				  sqlState: '42000',
				  index: 0
				}
			*/
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;
		}
	});

	if(search == 'false') {			// 검색 X
		query = (global.request_query + add_request_query2);
	} else if(search == 'true') {		// 검색 O
		query = (global.request_query + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 리스트를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 리스트 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		// 클라이언트에 보낼 JSON 데이터
		const arrJson = {};

		if(error) {
			console.log('* select error : ', error.code );

			arrJson.replyCode = '000';
			arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
			arrJson.total = 0;								// 페이지 총 갯수
			arrJson.records = 0;							// 데이터 총 갯수
			arrJson.page = 0;								// 페이지 인덱스
			arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

			response.header("Access-Control-Allow-Origin", "*");
			//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			response.send(arrJson);
		} else {
			if(result != '') {	// 조회 내역 있음
				if(global.totalCnt > 0) {	// 데이터 있음
					/* 클라이언트에 보낼 JSON 데이터 형태
					 * {
					 *   replyCode: '999',
					 *   replyMsg: '조회가 완료되었습니다.',
					 *   total: 2,		// 페이지 총 갯수
					 *   records: 14,	// 데이터 총 갯수
					 *   page: '1',		// 페이지 인덱스
					 *   rows: {		// 데이터 배열
					 *     totalCnt: ...,
					 *     id: ...,
					 *     name: ...
					 *   }
					 * }
					 */
					var totalPage = 0;
					totalPage = Math.ceil(global.totalCnt/rows);	// 올림
					if(page > totalPage) page = totalPage;

					// Set JSON data
					var arrRows = new Array();

					for(var i=0; i<rows; i++) {
						// 데이터 갯수까지만 반복
						if(i == result.length) 
							break;

						var arrRowDat = new Object();
						arrRowDat.MemID = result[i].MemID;
						arrRowDat.Memail = result[i].Memail.toString('utf-8');	// 인코딩(buffer->string)
						arrRowDat.Mname = result[i].Mname.toString('utf-8');	// 인코딩(buffer->string)
						arrRowDat.Mphone = result[i].Mphone.toString('utf-8');	// 인코딩(buffer->string)
						arrRowDat.MbirthDay = result[i].MbirthDay != null ? result[i].MbirthDay.toString('utf-8') : ''; 
						//var ampm = Number(time.substring(0,2)) < 12 ? '오전' : '오후';
						arrRowDat.Regdt = result[i].Regdt;
						arrRows.push(arrRowDat);
					}

//					var i=0;
//					while(!result) {
//						console.log(i);
//						var arrRowDat = new Object();
//						arrRowDat.MemID = result[i].MemID;
//						arrRowDat.Memail = result[i].Memail.toString('utf-8');	// 인코딩(buffer->string)
//						arrRowDat.Mname = result[i].Mname.toString('utf-8');	// 인코딩(buffer->string)
//						arrRowDat.Mphone = result[i].Mphone.toString('utf-8');	// 인코딩(buffer->string)
//
//						arrRows.push(arrRowDat);
//						i++;
//					}

					arrJson.replyCode = '999';						// 응답코드
					arrJson.replyMsg = '조회가 완료되었습니다.';	// 응답메세지
					arrJson.total = totalPage;						// 페이지 총 갯수
					arrJson.records = global.totalCnt;				// 데이터 총 갯수
					arrJson.page = page;							// 페이지 인덱스
					//arrJson.rows = result;							// 실제 그리드에 뿌려줄 데이터
					arrJson.rows = arrRows;			// 실제 그리드에 뿌려줄 데이터

					console.log('* 회원목록 조회완료.');
				} else {		// 데이터 없음
					arrJson.replyCode = '000';						// 응답코드
					arrJson.replyMsg = '조회내역이 없습니다.';		// 응답메세지
					arrJson.total = 0;								// 페이지 총 갯수
					arrJson.records = 0;							// 데이터 총 갯수
					arrJson.page = 0;								// 페이지 인덱스
					arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

					console.log('* 회원목록 조회내역없음.');
				}
			} else {	// 조회 내역 없음
				console.log('* 회원목록 조회내역없음.');

				arrJson.replyCode = '000';
				arrJson.replyMsg = '조회내역이 없습니다.';
				arrJson.total = 0;								// 페이지 총 갯수
				arrJson.records = 0;							// 데이터 총 갯수
				arrJson.page = 0;								// 페이지 인덱스
				arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

				//response.header("Access-Control-Allow-Origin", "*");
				//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
			}

			// 응답합니다.
			response.header("Access-Control-Allow-Origin", "*");
			response.send(arrJson);
		}
	});
});

// 회원목록 엑셀 다운로드
app.get('/members/excel', function(request, response) {
	console.log('********************************');
	console.log('* 회원목록을 엑셀로 저장하기위해 데이터를 조회합니다. (statusCode : ['+response.statusCode+'])');

	//console.log(request.query);							// 클라이언트에서 요청한 파라메터들
	// jqGrid에서 넘어오는 파라메터들
	// 전체
	//http://localhost:8080/products/excel?_search=false&nd=1471508595867&rows=10&page=1&sidx=id&sord=desc
	//&filters=&oper=14

	// 검색
	//http://localhost:8080/products/excel?_search=true&nd=1471508763185&rows=10&page=1&sidx=id&sord=desc
	//&searchField=name&searchString=American&searchOper=bw
	//&filters=&oper=4

	// 최신버전용
	const search = request.query._search;				// 검색여부
	const rows = request.query.rows;					// 보여주는 갯수
	var page = request.query.page;						// 페이지 번호
	const sidx = request.query.sidx;					// 소팅 기준 컬럼
	const sord = request.query.sord;					// desc/asc

	// 검색시 넘어오는 파라메터를
	const searchField = request.query.searchField;		// 검색할 컬럼명
	const searchString = request.query.searchString;	// 검색어
	const searchOper = request.query.searchOper;		// 조건 (eq: 같다, ne: 같지 않다, bw: 로 시작한다, bn: 로 시작하지 않는다,
														// ew: 로 끝난다, en: 로 끝나지 않는다, cn: 내에 존재한다, nc: 내에 존재하지 않는다,
														// nu: is null, nn: is not null, in: 내에 있다, ni: 내에 있지 않다)
	//const filters = request.query.filters;				// ??

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/member.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.member_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.member_list;
		}
	});

	var add_request_query1 = '';
	var add_request_query2 = '';

	if(search == 'true') {	// 검색 O
		// where절 생성 (검색시에만)
		add_request_query1 += ' WHERE ';

		switch(searchOper) {
			case 'eq':	// 같다
			case 'cn':	// 내에 존재한다
			case 'in':	// 내에 있다
				add_request_query1 += searchField+' = "'+ searchString +'" ';
				break;
			case 'ne':	// 같지않다
			case 'nc':	// 내에 존재하지 않는다
			case 'ni':	// 내에 있지 않다
				add_request_query1 += searchField+' != "'+ searchString +'" ';
				break;
			case 'bw':	// ~로 시작한다
				add_request_query1 += searchField+' LIKE "'+ searchString +'%" ';
				break;
			case 'bn':	// ~로 시작하지 않는다
				add_request_query1 += searchField+' NOT LIKE "'+ searchString +'%" ';
				break;
			case 'ew':	// ~로 끝난다
				add_request_query1 += searchField+' LIKE "%'+ searchString +'" ';
				break;
			case 'en':	// ~로 끝나지 않는다
				add_request_query1 += searchField+' NOT LIKE "%'+ searchString +'" ';
				break;
			case 'nu':	// is null
				add_request_query1 += searchField+' IS NULL ';
				break;
			case 'nn':	// is not null
				add_request_query1 += searchField+' IS NOT NULL ';
				break;
			default:
				break;
		}
	}

	//const offSet = (Number(page)-1) * Number(rows);
	if(sidx) add_request_query2 += 'ORDER BY ' + sidx + ' ';
	if(sord) add_request_query2 += sord+' ';
	//if(rows) add_request_query2 += 'LIMIT ' + Number(offSet) + ', ' +Number(rows);

	var query = '';
	if(search == 'false') {			// 검색 X
		query = global.request_totalCnt;
	} else if(search == 'true') {	// 검색 O
		query = (global.request_totalCnt + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;
		}
	});

	if(search == 'false') {			// 검색 X
		query = (global.request_query + add_request_query2);
	} else if(search == 'true') {		// 검색 O
		query = (global.request_query + add_request_query1 + add_request_query2);
	}

	console.log('* 데이터 리스트를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 리스트 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		// 클라이언트에 보낼 JSON 데이터
		const arrJson = {};

		if(error) {
			console.log('* select error : ', error.code );

			arrJson.replyCode = '000';
			arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
			arrJson.total = 0;								// 페이지 총 갯수
			arrJson.records = 0;							// 데이터 총 갯수
			arrJson.page = 0;								// 페이지 인덱스
			arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

			response.header("Access-Control-Allow-Origin", "*");
			//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			response.send(arrJson);
		} else {
			if(result != '') {	// 조회 내역 있음
				if(global.totalCnt > 0) {	// 데이터 있음
					// 엑셀 세팅
					const today = new Date();
					const yyyy= today.getFullYear().toString();
					const mm = (today.getMonth()+1).toString();
					const dd = today.getDate().toString();
					//const yyyymmdd = yyyy +"-"+(mm[1] ? mm : '0'+mm[0])+"-"+(dd[1] ? dd : '0'+dd[0]); // ex)2016-01-01
					const yyyymmdd = yyyy+(mm[1] ? mm : '0'+mm[0])+(dd[1] ? dd : '0'+dd[0]); // ex)20160101

					const time = new Date(); 
					const hour = time.getHours().toString();
					const minute = time.getMinutes().toString();
					const second = time.getSeconds().toString();
					const hhmmss = hour+minute+second;
					const filename = 'member_'+yyyymmdd+hhmmss+'.xlsx';

					// excel 모듈 추출
					var nodeExcel = require('excel-export');	// npm install excel-export

					var conf ={};
					conf.stylesXmlFile = __dirname+"/node_modules/excel-export/example/styles.xml";
					conf.name = 'sheet';	// sheet 명
					conf.cols = [
						{
							caption:'ID',
							type:'number',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:10
						},
						{
							caption:'이메일',
							type:'string',
//							beforeCellWrite:function(row, cellData){
//								return cellData.toUpperCase();	// 대문자
//							},
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:30
						},
						{
							caption:'이름',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:18
						},
						{
							caption:'연락처',
							type:'string',
							width:16,
							captionStyleIndex: 2,	// 배경색 노랑색으로
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var regExp =/(01[016789])([1-9]{1}[0-9]{2,3})([0-9]{4})$/;
										var myArray;
										if(regExp.test(cellData)){
											var rtnNum;
											var myArray;
											myArray = regExp.exec(cellData);
											rtnNum = myArray[1]+'-'+myArray[2]+'-'+myArray[3];
											return rtnNum;
										} else {
											return cellData;
										}
									}
								}
							}()
						},
						{
							caption:'생년월일',
							type:'string',
							captionStyleIndex: 2,	// 배경색 노랑색으로
							width:12
						},
						{
							caption:'등록일',
							type:'string',
							width:26,
							captionStyleIndex: 2,	// 배경색 노랑색으로
							beforeCellWrite:function(){
								return function(row, cellData, eOpt){
									//logger.info(eOpt);	// { rowNum: 2, styleIndex: null, cellType: 'string' } 
//					                if (eOpt.rowNum%2){
//					                    eOpt.styleIndex = 1;
//					                }  
//					                else{
//					                    eOpt.styleIndex = 2;
//					                }
									if (cellData == null){
										eOpt.cellType = 'string';
										return 'N/A';
									} else {
										var originDate = new Date(cellData);
										var date = originDate.toLocaleDateString();
										var time = originDate.toLocaleTimeString();
										var ampm = Number(time.substring(0,2)) < 12 ? '오전' : '오후';
										return date+" "+ampm+" "+time;
									}
								}
							}()
						}
					];

					var tmpArr = new Array();
					for(var i=0; i<global.totalCnt; i++) {
						var arr = [];
						arr.push(result[i].MemID,
								result[i].Memail.toString('utf-8'),
								result[i].Mname.toString('utf-8'),
								result[i].Mphone.toString('utf-8'),
								result[i].MbirthDay != null ? result[i].MbirthDay.toString('utf-8') : '',
								result[i].Regdt);
						tmpArr[i] = arr;
					}

					// 데이터 입력
					conf.rows = tmpArr;

					var resultExcel = nodeExcel.execute(conf);
					response.setHeader('Content-Type', 'application/vnd.openxmlformats');
					response.setHeader("Content-Disposition", "attachment; filename="+filename);
					response.end(resultExcel, 'binary');

					console.log('* 회원목록 엑셀저장완료.');
				} else {		// 데이터 없음
					console.log('* 회원목록 엑셀저장실패.');

					response.header("Access-Control-Allow-Origin", "*");
					response.send();
				}
			} else {	// 조회 내역 없음
				console.log('* 회원목록 엑셀저장실패.');

				response.header("Access-Control-Allow-Origin", "*");
				//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
				response.send();
			}
		}
	});
});

// 이벤트목록 조회
app.get('/events', function(request, response) {
	console.log('********************************');
	console.log('* 이벤트목록을 조회합니다. (statusCode : ['+response.statusCode+'])');

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/event.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 데이터 갯수
			global.request_totalCnt = result.query.event_totalCnt;

			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.event_list;
		}
	});

	var query = global.request_totalCnt;

	console.log('* 데이터 총 갯수를 구하기 위한 쿼리');
	logger.info(query);

	// 데이터 총 갯수 구하기 위한 쿼리호출
	client.query(query, function(error, result, field) {
		if(error) {
			/* {
				  [Error: ER_PARSE_ERROR: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from test_products' at line 1]
				  code: 'ER_PARSE_ERROR',
				  errno: 1064,
				  sqlState: '42000',
				  index: 0
				}
			*/
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			logger.info('* totalCnt : '+result[0].totalCnt);

			global.totalCnt = result[0].totalCnt;

			if(global.totalCnt > 0) {
				query = global.request_query;

				console.log('* 데이터 리스트를 구하기 위한 쿼리');
				logger.info(query);

				// 데이터 리스트 구하기 위한 쿼리호출
				client.query(query, function(error, result, field) {
					// 클라이언트에 보낼 JSON 데이터
					const arrJson = {};

					if(error) {
						console.log('* select error : ', error.code );

						arrJson.replyCode = '000';
						arrJson.replyMsg = '서버에서 클라이언트 요청을 처리 중에 에러가 발생함.';
						arrJson.records = 0;							// 데이터 총 갯수
						arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

						response.header("Access-Control-Allow-Origin", "*");
						//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
						response.send(arrJson);
					} else {
						if(result != '') {	// 조회 내역 있음
							/* 클라이언트에 보낼 JSON 데이터 형태
							 * {
							 *   replyCode: '999',
							 *   replyMsg: '조회가 완료되었습니다.',
							 *   records: 14,	// 데이터 총 갯수
							 *   rows: {		// 데이터 배열
							 *     totalCnt: ...,
							 *     id: ...,
							 *     name: ...
							 *   }
							 * }
							 */

							// Set JSON data
							arrJson.replyCode = '999';						// 응답코드
							arrJson.replyMsg = '조회가 완료되었습니다.';	// 응답메세지
							arrJson.records = global.totalCnt;				// 데이터 총 갯수
							arrJson.rows = result;							// 실제 그리드에 뿌려줄 데이터

							console.log('* 이벤트목록 조회완료.');
							
						} else {	// 조회 내역 없음
							console.log('* 이벤트목록 조회내역없음.');

							arrJson.replyCode = '000';
							arrJson.replyMsg = '조회내역이 없습니다.';
							arrJson.records = 0;							// 데이터 총 갯수
							arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

							//response.header("Access-Control-Allow-Origin", "*");
							//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
						}

						// 응답합니다.
						response.header("Access-Control-Allow-Origin", "*");
						response.send(arrJson);
					}
				});
			} else {
				response.header("Access-Control-Allow-Origin", "*");
				response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			}
		}
	});
});

// 이벤트 상세조회
app.post('/events/detail', function(request, response) {
	console.log('********************************');
	console.log('* 이벤트 상세정보를 조회합니다. (statusCode : ['+response.statusCode+'])');

	// 변수를 선언합니다.
	const body = request.body;
	const id = body.id;

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/event.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.event_list;
		}
	});

	var add_request_query = "WHERE EventID = '%s'";

	// util.format(쿼리문, (매개변수들))
	var query = util.format((global.request_query+add_request_query), id);
	logger.info(query);

	// 데이터베이스 요청을 수행합니다.
	client.query(query, function(error, result, field) {
		if(error) {
			/* {
				  [Error: ER_PARSE_ERROR: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'from test_products' at line 1]
				  code: 'ER_PARSE_ERROR',
				  errno: 1064,
				  sqlState: '42000',
				  index: 0
				}
			*/
			console.log('* select error : ', error.code );
	
			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			// 클라이언트에 보낼 JSON 데이터
			const arrJson = {};
			const queryResult = result[0];

			if(result != '') {	// 조회 내역 있음
				var dateUtils = require('date-utils');			// npm install date-utils
				//new Date(DB 저장 값).toFormat('YYYY-MM-DD HH24:MI:SS');	// 2015-12-28 16:54:00 

				const arrJsonDat = {};
				arrJsonDat.EventTitle = queryResult.EventTitle;
				arrJsonDat.EventContent = queryResult.EventContent;
				arrJsonDat.EventStdt = new Date(queryResult.EventStdt).toFormat('YYYY-MM-DD HH24:MI:SS');
				arrJsonDat.EventEnddt = new Date(queryResult.EventEnddt).toFormat('YYYY-MM-DD HH24:MI:SS');
				arrJsonDat.Regdt = new Date(queryResult.Regdt).toFormat('YYYY-MM-DD HH24:MI:SS');
				arrJsonDat.Moddt = new Date(queryResult.Moddt).toFormat('YYYY-MM-DD HH24:MI:SS');

				/* 클라이언트에 보낼 JSON 데이터 형태
				 * {
				 *   replyCode: '999',
				 *   replyMsg: '조회가 완료되었습니다.',
				 *   records: 14,	// 데이터 총 갯수
				 *   rows: {		// 데이터 배열
				 *     totalCnt: ...,
				 *     id: ...,
				 *     name: ...
				 *   }
				 * }
				 */

				// Set JSON data
				arrJson.replyCode = '999';						// 응답코드
				arrJson.replyMsg = '조회가 완료되었습니다.';	// 응답메세지
				arrJson.records = 1;							// 데이터 총 갯수
				arrJson.rows = arrJsonDat;						// 실제 그리드에 뿌려줄 데이터

				console.log('* 이벤트 상세정보 조회완료.');
				
			} else {	// 조회 내역 없음
				console.log('* 이벤트 상세정보 조회내역없음.');

				arrJson.replyCode = '000';
				arrJson.replyMsg = '조회내역이 없습니다.';
				arrJson.records = 0;							// 데이터 총 갯수
				arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

				//response.header("Access-Control-Allow-Origin", "*");
				//response.send('204');	// No Content (요청 정상 처리하였지만, 돌려줄 리소스 없음)
			}

			// 응답합니다.
			response.header("Access-Control-Allow-Origin", "*");
			response.send(arrJson);
		}
	});
});

//fileupload 외부 모듈추출
const fileModule = require('./fileupload.js');
const upload = fileModule.getFileUpload();

app.post('/events/fileupload', function(request, response){
	upload(request, response, function(err) { //<-- 이 순간 파일이 올라간다.
		console.log('********************************');
		console.log('* 파일을 업로드합니다. (statusCode : ['+response.statusCode+'])');

		/*
		[ { fieldname: 'fileName',
		    originalname: '20160120101937_801179_540_933.jpg',
		    encoding: '7bit',
		    mimetype: 'image/jpeg',
		    destination: '../fileupload',
		    filename: '845d3a40-6830-11e6-91d9-353eae272859[0].jpg',
		    path: '..\\fileupload\\845d3a40-6830-11e6-91d9-353eae272859[0].jpg',
		    size: 143193 } ]
		*/
		logger.info(request.files);

		var files = request.files; // 첨부파일 갯수가 1개든 2개든 모두 array로 인식된다!
		var fileCount = files.length;

		for(var i=0 ; i<fileCount; i++) {
			var originalFileNm = files[i].originalname;
			var savedFileNm = files[i].filename;// + i ;//+ '-' + Date.now();
			var fileSize = files[i].size;
			var destination = files[i].destination;
			//console.log("originalFileNm : '%s', savedFileNm : '%s', size : '%s'",  originalFileNm, savedFileNm, fileSize);
		}

//		response.header("Access-Control-Allow-Origin", "*");

//		if(err) {
//		console.log('* 파일 업로드실패.');
//		return response.end("Error uploading file." );
//	}
//
//	console.log('* 파일 업로드완료.');
//	response.end("File is uploaded.");

		// 클라이언트에 보낼 JSON 데이터
		const arrJson = {};

		if(err) {
			arrJson.replyCode = '000';
			arrJson.replyMsg = '파일 업로드에 실패했습니다.';
//			arrJson.total = 0;								// 페이지 총 갯수
//			arrJson.records = 0;							// 데이터 총 갯수
//			arrJson.page = 0;								// 페이지 인덱스
			arrJson.rows = null;							// 실제 그리드에 뿌려줄 데이터

			console.log('* 파일 업로드 실패.');

			response.header("Access-Control-Allow-Origin", "*");
			//response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
			response.send(arrJson);
		} else {
			/* 클라이언트에 보낼 JSON 데이터 형태
			 * {
			 *   replyCode: '999',
			 *   replyMsg: '조회가 완료되었습니다.',
			 *   total: 2,		// 페이지 총 갯수
			 *   records: 14,	// 데이터 총 갯수
			 *   page: '1',		// 페이지 인덱스
			 *   rows: {		// 데이터 배열
			 *     totalCnt: ...,
			 *     id: ...,
			 *     name: ...
			 *   }
			 * }
			 */
			const arrJsonDat = {};
			arrJsonDat.savedFileNm = savedFileNm;
			arrJsonDat.savedFilePath = destination;

			// Set JSON data
			arrJson.replyCode = '999';						// 응답코드
			arrJson.replyMsg = '파일이 정상적으로 업로드 되었습니다.';	// 응답메세지
			arrJson.rows = arrJsonDat;						// 실제 그리드에 뿌려줄 데이터

			console.log('* 파일 업로드 완료.');

			// 응답합니다.
			response.header("Access-Control-Allow-Origin", "*");
			response.send(arrJson);
		}
	});
});

/*
// 개별 데이터 조회
app.get('/products/:id', function(request, response) {
	console.log('********************************');
	console.log('* 상품목록을 검색조회합니다. (statusCode : ['+response.statusCode+'])');

	// 변수를 선언합니다.
	//var id = Number(request.param('id'));	// 이전 버전 방식
	const id = Number(request.params.id);

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/products.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.products_search;
			logger.info(global.request_query);
		}
	});

	// util.format(쿼리문, (매개변수들))
	var query = util.format(global.request_query, id);

	// 데이터베이스 요청을 수행합니다.
	client.query(query, function(error, result, field) {
		if(error) {
			console.log('* select error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			console.log('* 상품목록 검색조회완료.');

			response.header("Access-Control-Allow-Origin", "*");
			response.send(result);
		}
	});
});

// 데이터 수정
app.post('/products/edit', function(request, response) {
	console.log('********************************');

	// 변수를 선언합니다.
	const body = request.body;
	const oper = body.oper; // 요청종류 (add/edit/del)
	var query;

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/products.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			switch(oper) {
				case 'add':
					console.log('* 상품을 추가합니다. (statusCode : ['+response.statusCode+'])');
					global.request_query = result.query.products_add;
					query = util.format(global.request_query, body.name, body.modelnumber, body.series);
					break;
				case 'edit':
					console.log('* 상품을 수정합니다. (statusCode : ['+response.statusCode+'])');
					global.request_query = result.query.products_edit;
					query = util.format(global.request_query, body.name, body.modelnumber, body.series, body.id);
					break;
				case 'del':
					console.log('* 상품을 삭제합니다. (statusCode : ['+response.statusCode+'])');
					global.request_query = result.query.products_del;
					query = util.format(global.request_query, body.id);
					break;
				default:
					break;
			}
		}
	});

	logger.info(query);

	// 데이터베이스 요청을 수행합니다.
	client.query(query, function (error, result, field) {
		console.log('* 처리완료.');
//		response.header("Access-Control-Allow-Origin", "*");
//		response.send(result);

		response.header("Access-Control-Allow-Origin", "*");
		response.send();
	});
});

// 데이터 수정
app.put('/products/:id', function(request, response) {
	console.log('********************************');
	console.log('* 상품을 수정합니다. (statusCode : ['+response.statusCode+'])');

	// 변수를 선언합니다.
	const id = Number(request.params.id);
	const body = request.body;
	logger.info(body);

	// 변수를 추출합니다.
	const name = body.name;
	const modelnumber = body.modelnumber;
	const series = body.series;
	//const query = 'UPDATE test_products SET';

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/products.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.products_modify;
			logger.info(global.request_query);
		}
	});

	// 쿼리를 생성합니다.
	if(name) global.request_query += 'name="' + name + '" ';
	if(modelnumber) global.request_query += 'modelnumber="' + modelnumber + '" ';
	if(series) global.request_query += 'series="' + series + '" ';
	global.request_query = 'WHERE id=' + id;

	// 데이터베이스 요청을 수행합니다.
	client.query(global.request_query, function(error, result, field) {
		console.log('* 상품수정완료.');

		response.header("Access-Control-Allow-Origin", "*");
		response.send(result);
	});
});

// 데이터 삭제
app.delete('/products/:id', function(request, response) {
	console.log('********************************');
	console.log('* 상품을 삭제합니다. (statusCode : ['+response.statusCode+'])');

	// 변수를 선언합니다.
	const id = Number(request.params.id);

	// XML 데이터 조회
	var xmlData = fs.readFileSync('../query/products.xml', 'utf8');
	digester.digest(xmlData, function(error, result) {
		if(error) {
			console.log(error);
		} else {
			// 글로벌 변수에 쿼리 저장
			global.request_query = result.query.products_delete;
			logger.info(global.request_query);
		}
	});

	// util.format(쿼리문, (매개변수들))
	var query = util.format(global.request_query, id);

	// 데이터베이스 요청을 수행합니다.
	client.query(query, function(error, result, field) {
		if(error) {
			console.log('* delete error : ', error.code );

			response.header("Access-Control-Allow-Origin", "*");
			response.send('500');	// Internal Server Error (서버에서 클라이언트 요청을 처리 중에 에러가 발생함.)
		} else {
			console.log('* 상품삭제완료.');

			response.header("Access-Control-Allow-Origin", "*");
			response.send(result);
		}
	});
});*/