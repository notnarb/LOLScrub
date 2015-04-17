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
                tasks : ['browserify'],
                files : [
					'src/js/*.js', // Note: this will re-run each time the vendor folder changes but that doesnt seem, too bad
					'src/js/**/*.js',
					'src/tmpl/**/*.hbs',
				]
            },
			vendor : {
				tasks : ['uglify:libs'],
				files : ['src/js/vendor/*.js']
			},
			css : {
				tasks : ['less:main'],
				files : ['src/css/**/*.css','src/css/**/*.less']
			},
			static : {
				files : ['src/root/**'],
				tasks : ['clean', 'copy'] //If a file changes in the static root, delete all files then copy new ones
			}
        },
		clean : {
			main: {
				// Clean up all files not in the css or js folders.  Assume they are added by 'copy' task
				src: [ROOTDIR + "/**", "!" + ROOTDIR + "/css/**", "!" + ROOTDIR + "/js/**"],
				options: {force: true}
			}
		},
		copy : {
			main : {
				files : [{
					expand: true,
					cwd: 'src/root/', //from the perspective of the root folder
					src: ['**'],	  //copy all files with the same structure
					dest: ROOTDIR,
					filter: 'isFile'
				}]
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
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');

    // The default tasks to run when you type: grunt
    grunt.registerTask('default', ['browserify', 'less', 'uglify', 'clean', 'copy']);
    grunt.registerTask('w', ['watch']);
};
