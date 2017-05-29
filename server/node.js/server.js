/* 
 * Date : 2016.10.13
 * Author : Kang Dong Hyeok
 * Description : Web Server / API
 */

// 모듈을 추출합니다.
var http = require('http');
var express = require('express');			// npm install express
//var bodyParser = require('body-parser');	// npm install body-parser
var util = require('util');
var fs = require('fs');
var path = require('path');
var mime = require('mime');					// npm install mime

// 웹 서버를 생성합니다.
var app = express();
app.use(express.static('public'));
//app.use(app.router);

// POST 방식으로 전달되는 파라미터 처리를 위해 필요
//app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// 웹 서버를 실행합니다.
http.createServer(app).listen(52273, function() {
	console.log('Server Running at http://127.0.0.1:52273');
});

//app.get('/', function(req, res){
//	fs.readFile('./fileList.html', function(error, data){ //파일 다운로드용 테스트 페이지를 제공한다
//		res.writeHead(200, {'Content-Type':'text/html'});	// 200 : 정상
//		res.end(data);
//	});
//});

// 파일 다운로드
app.get('/download/:fileid', function(req, res){
	var fileId = req.params.fileid; //fileid = 각각의 파일을 구분하는 파일ID 값
	var origFileNm, savedFileNm, savedPath, fileSize; //DB에서 읽어올 정보들
console.log('* fileId : '+fileId);

	// 원래는 fileId(파일ID)에 해당하는 파일정보(원본파일명, 저장파일명, 파일저장경로, 파일사이즈)를 
	// DB에서 읽어오도록 구현해야한다.
	// --- 임시 테스트 코드 시작 -------------------------------------------------------------------
	if(fileId == 'zip'){
		//origFileNm = '1ie11_test.zip';
		//savedFileNm = '1qaz2wsx-201604061230';
		//savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files';
		//fileSize = '6209';
	} else if(fileId == 'txt'){
		//origFileNm = '3testfile.txt';
		//savedFileNm = '3rfv5tgb-201604061231';
		//savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files';
		//fileSize = '4446';
	} else if(fileId == 'image'){
		//origFileNm = 'juestice.png';
		//savedFileNm = '4rfv5tgb-201604061403';
		//savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files';
		//fileSize = '484949';
	} else if(fileId == 'resume'){
		origFileNm = 'resume.doc';
		savedFileNm = 'resume.doc';
		savedPath = '../../filedownload/resume';
	}
	// --- 임시 테스트 코드 끝 ---------------------------------------------------------------------------

	var file = savedPath + '/' + savedFileNm; //예) '/temp/filename.zip'
	console.log('* file : ', file);
	//만약 var file 이 저장경로+원본파일명으로 이루져 있다면, 'filename = path.basename(file)' 문법으로 파일명만 읽어올 수도 있다.

	//mimetype = mime.lookup(file) 와 같이 '저장경로+파일명' 정보를 파라미터로 전달해도 된다. 이때 파일명은 확장자를 포함해야함
	mimetype = mime.lookup( origFileNm ); // => 'application/zip', 'text/plain', 'image/png' 등을 반환
	console.log('* mimetype : ' + mimetype);

	// 파일존재  유무확인
	fs.exists(file, function (exists) {
		//console.log(exists ? "it's there" : "no exists!");
		res.header("Access-Control-Allow-Origin", "*");

		if(exists) {
			// 파일 정보
			fs.stat(file, function(err, stats) {
				if(err) throw err;
				//console.log('* stats : ',stats);
				console.log('* --------------- File Info ---------------');
				console.log('* size : ', stats.size+'KB');
				console.log('* isFile : ', stats.isFile());
				console.log('* isDirectory : ', stats.isDirectory());
				console.log('* isFIFO : ', stats.isFIFO());
				console.log('* -----------------------------------------');
			});

			res.setHeader('Content-disposition', 'attachment; filename=' + origFileNm ); // origFileNm으로 로컬PC에 파일 저장
			res.setHeader('Content-type', mimetype);

			var filestream = fs.createReadStream(file);
			filestream.pipe(res);
		} else {
			res.send("<script type='text/javascript'>alert('서버에 다운로드 할 파일이 존재하지 않습니다.'); history.go(-1);</script>");
		}
	});

//    // 또 다른 방법
//    fs.readFile(file, (err, data) => {
//        //if (err) throw err;
//        console.log('* err : ', err);

//        // 파일 존재 X
//        if(err != null) {
//            console.log('* err code : ', err.code); // EBOENT : 파일 또는 디렉토리를 읽어들일 때에해당 파일 또는 디렉토리가 없으면 나는 오류 
//            res.send('500');
//        } else {
//            res.setHeader('Content-disposition', 'attachment; filename=' + origFileNm ); // origFileNm으로 로컬PC에 파일 저장
//            res.setHeader('Content-type', mimetype);

//            var filestream = fs.createReadStream(file);
//            //fs.exists();	//https://nodejs.org/docs/latest-v5.x/api/fs.html#fs_fs_readfilesync_file_options
//            filestream.pipe(res);
//        }
//    });
});