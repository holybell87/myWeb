var express = require("express");
var util = require('util');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var app = express();

app.get('/', function(req, res){
	fs.readFile('./fileList.html', function(error, data){ //파일 다운로드용 테스트 페이지를 제공한다
		res.writeHead(200, {'Content-Type':'text/html'});
		res.end(data);
	});
});

app.get('/download/:fileid', function(req, res){
	var fileId = req.params.fileid; //fileid = 각각의 파일을 구분하는 파일ID 값
	var origFileNm, savedFileNm, savedPath, fileSize; //DB에서 읽어올 정보들
	
	// 원래는 fileId(파일ID)에 해당하는 파일정보(원본파일명, 저장파일명, 파일저장경로, 파일사이즈)를 
	// DB에서 읽어오도록 구현해야한다.
	// --- 임시 테스트 코드 시작 -------------------------------------------------------------------
	if( fileId == '1'  ){
		origFileNm = '1ie11_test.zip';
		savedFileNm = '1qaz2wsx-201604061230';
		savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files'
		fileSize = '6209';
	}else if( fileId == '2'  ){
		origFileNm = '2src_files.zip';
		savedFileNm = '2wsx3edc-201604061231';
		savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files'
		fileSize = '160931';
	}else if( fileId == '3'  ){
		origFileNm = '3testfile.txt';
		savedFileNm = '3rfv5tgb-201604061231';
		savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files'
		fileSize = '4446';
	}else if( fileId == '4' ){
		origFileNm = 'juestice.png';
		savedFileNm = '4rfv5tgb-201604061403';
		savedPath = 'C:/nodejs/workspace/ExpressEjsSample/js_modules/filedownload/files'
		fileSize = '484949';		
	}
	// --- 임시 테스트 코드 끝 ---------------------------------------------------------------------------
	
	var file = savedPath + '/' + savedFileNm; //예) '/temp/filename.zip'
	/*test*/console.log('file : ', file);
    //만약 var file 이 저장경로+원본파일명으로 이루져 있다면, 'filename = path.basename(file)' 문법으로 파일명만 읽어올 수도 있다.
    
	//mimetype = mime.lookup(file) 와 같이 '저장경로+파일명' 정보를 파라미터로 전달해도 된다. 이때 파일명은 확장자를 포함해야함
	mimetype = mime.lookup( origFileNm ); // => 'application/zip', 'text/plain', 'image/png' 등을 반환
    /*test*/console.log('mimetype : ' + mimetype);
    
    res.setHeader('Content-disposition', 'attachment; filename=' + origFileNm ); // origFileNm으로 로컬PC에 파일 저장
    res.setHeader('Content-type', mimetype);

    var filestream = fs.createReadStream(file);
    filestream.pipe(res);
});

app.listen(8000,function(){
     console.log("Working on port 8000");
});