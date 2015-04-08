var browserifyOpts = {
	transform: ['hbsfy'],
	browserifyOptions: {
		debug: true
	}
};
var ROOTDIR = "/var/www/html";
module.exports = function(grunt) {
    grunt.initConfig({
        browserify: {
            js: {
                src: 'src/js/main.js',
                dest: ROOTDIR + '/js/main.js',
                options: browserifyOpts
            }
        },
        watch : {
            js : {
                tasks : ['browserify'],//, 'browserify:communicationsLayer'],
                files : [
					'src/js/*.js',
					'src/js/**/*.js',
					'src/tmpl/*.hbs',
				]
            },
			vendor : {
				tasks : ['uglify:libs'],
				files : ['src/js/vendor/*.js']
			},
			css : {
				tasks : ['less:main'],
				files : ['src/css/**/*.css','src/css/**/*.less']
			}
        },
        uglify : {
			libs : {
				options : {
					// I'm sure my bandwidth frugalness will byte me in the ass
					mangle: {
						except: ['jquery'] //TODO: I am pretty sure this doesn't work
					},
					beautify: false,
					preserveComments: 'some'
				},
				files : [{
					src: "src/js/vendor/*.js",
					dest: ROOTDIR + "/js/libs.js"
				}]
			}
        },

		less: {
			main: {
				options: {
					compress: true
				},
				src : [
					'src/css/normalize.css', //make sure this gets included first
					'src/css/**/*.less',
					'src/css/**/*.css'
				],
				dest : ROOTDIR + "/css/main.css"
			}
		}
    });

    // Load the npm installed tasks
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-handlebars');
	grunt.loadNpmTasks('grunt-contrib-less');

    // The default tasks to run when you type: grunt
    grunt.registerTask('default', ['browserify', 'less', 'uglify']);
    grunt.registerTask('w', ['watch']);
};
