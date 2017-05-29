//exports.a = 10;
exports.getLogger = function() {
	// log4js 설정
	var log4js = require("log4js");

	log4js.configure({
		appenders: [
			{
				type: "console",
//				layout: {
//					type: "pattern",
//					pattern: "%[%r (%x{pid}) %p %c -%] %m%n",
//					tokens: {
//						pid : function() { return process.pid; }
//					}
//				}
			},
			{
				type: "file",
				filename: "../logs/test.log",
				category: "app",
				maxLogSize: 20480,	// 20MB
				backups: 3,
			}
//			{
//				type: "dateFile",
//				filename: "database.log",
//				pattern:"-yyyy-MM-dd",
//				category: "app",
//				layout: {
//					type: "messagePassThrough"
//				}
//			}
		],
		replaceConsole: true,
		level:'auto'
	});

	var logger = log4js.getLogger("app");
	//logger.setLevel("DEBUG");
	//app.use(log4js.connectLogger(log4js.getLogger("app"), { level: 'auto' }));
	return logger;
};