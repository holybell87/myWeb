exports.getFileUpload = function() {
	var uuid = require('node-uuid'); // npm install node-uuid
	/*
	 * Generate a v1 (time-based) id
	 * uuid.v1(); // -> '6c84fb90-12c4-11e1-840d-7b25c5ee775a'
	 *
	 * Generate a v4 (random) id
	 * uuid.v4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
	 */

	var multer = require('multer');		// npm install multer
	var i = 0;							// 첨부파일명 구분용 숫자 : 첨부파일이 여러개일 때 첨부파일명을 각각 구분하기 위한 용도로 사용
	var maxFileCount = 2;				// 첨부파일 허용 갯수 
	var maxFileSize = 5 * 1024 * 1024;	// 5MB
	//var filePath = 'C:/fileupload';
	var filePath = '../../uploadedFiles';	// 파일이 저장될 경로 (해당 경로에 폴더가 없으면 오류 발생)
	var storage = multer.diskStorage({
										destination : function(request, file, callback) {	// 파일저장 경로(목적지)
											callback(null, filePath);
										},
										filename : function(request, file, callback) {		// 저장 파일의 이름지정
											console.log(file);
											const originalname = file.originalname;								// 원본 파일명
											const splitFilename = originalname.split(".");
											const extension = splitFilename[splitFilename.length-1];			// 파일 확장자
											//const savedFilename = splitFilename[0]+'['+ i + ']_'+Date.now();
											const newFilename = uuid.v1()+'['+ i + ']';						// 저장 될 파일명 (확장자 제외)
											const savedFilename = newFilename + '.' + extension;					// 저장 될 파일명 (학장자 포함)

											i++; // 첨부파일이 2개면, fileName1-시간, fileName2-시간과 같이 번호가 붙는다.	
											//callback(null, file.fieldname + i  + '-' + Date.now()); // file.fieldname = 'file' 타입태그의 field 명이다.
											callback(null, savedFilename);

											// i 값을 초기화 시키지 않으면 계속해서 증가하므로 아래와 같은 초기화 로직을 추가한다.
											if(maxFileCount == i) { // 첨부파일명 구분용 숫자(=i) 가 maxFileCount에 도달하면 
												i = 0; // 0으로 초기화( 다른 함수에서는 초기화가 않되서 이곳에 설정함!)
											}
										}
									});

	// 첨부파일 2개까지 허용, fileName = 'file' 타입태그의 field 명
	var upload = multer({ storage : storage, limits: { fileSize: maxFileSize } }).array('fileName', maxFileCount );

	return upload;
};