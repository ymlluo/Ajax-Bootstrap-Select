module.exports = function (grunt) {

    var pkg = grunt.file.readJSON('package.json');

    var optionAnchor = function (option) {
      return option.toLowerCase().replace(/[^a-z0-9]/, '-');
    };

    var parseLink = function (link) {
        if (link) {
            var anchor, title, internal = link.match(/({@link (\$\.fn\.ajaxSelectPicker\.(?:defaults|locale)|AjaxBootstrapSelect(?:List|Request)?)#?([^\s]*)\s?([^}]*)})/);
            if (internal) {
                anchor = internal[3];
                title = internal[4] ? internal[4] : internal[3];
                if (anchor) {
                    anchor = optionAnchor(anchor);
                }
                else if (internal[2] === '$.fn.ajaxSelectPicker.defaults') {
                    anchor = 'options';
                }
                else if (internal[2] === '$.fn.ajaxSelectPicker.locale') {
                    anchor = 'locale-strings';
                }
                else {
                    anchor = optionAnchor(internal[2]);
                }
                return link.replace(internal[0], '[' + title + '](#' + anchor + ')');
            }
        }
        return link;
    };

    var multiLineParser = function (type, i, line, block) {
        // find the next instance of a parser (if there is one based on the @ symbol)
        // in order to isolate the current multi-line parser
        var nextParserIndex = block.indexOf('* @', i+1),
            length = nextParserIndex > -1 ? nextParserIndex - i : block.length,
            newBlock = block.split('').splice(i-1, length).join('');
            newBlock = (function(newBlock){
                var ret = [], lines = newBlock.split('\n');
                lines.forEach(function(line){
                    var pattern = '* ', index = line.indexOf(pattern);
                    if (index !== -1 && index <= (type.length + 4)) { line = line.split('').splice((index + pattern.length), line.length).join(''); }
                    line = line.replace(new RegExp('^\\s+?@' + type + '\\s+'), '').replace(/\\s+$/,'');
                    if (line.match(new RegExp('.*@' + type + '\\s*$'))) { return; }
                    if (line) { ret.push(parseLink(line)); }
                });
                return ret.join('\n> ');
            })(newBlock);
        return newBlock;
    };

    var parsers = {
        cfg: function (i, line, block) {
            var matches = line.match(/(?:\{([^\}]+)\})?\s?([a-zA-Z0-9_]+)(?:\s?=\s?(.*))?\s?(\(required\))?/);
            var deprecated = block.match(/@deprecated (.*)/) || [];
            return {
                type: matches[1],
                name: matches[2],
                default: matches[3],
                required: matches[4],
                deprecated: parseLink(deprecated[1])
            };
        },
        markdown: function (i, line, block) {
            return multiLineParser('markdown', i, line, block);
        }
    };

    // Project configuration.
    grunt.initConfig({
        banner: '/*!\n' +
        ' * <%= pkg.title || pkg.name %>\n *\n' +
        ' * <%= pkg.description %>\n *\n' +
        ' * @version <%= pkg.version %>\n' +
        ' * @author <%= pkg.author.name %> - <%= pkg.author.url %>\n' +
        '<%= pkg.homepage ? " * @link " + pkg.homepage + "\\n" : "" %>' +
        ' * @copyright <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>\n' +
        ' * @license Released under the <%= _.pluck(pkg.licenses, "type").join(", ") %> license.\n *\n' +
        ' * Contributors:' +
        '<% _.forEach(pkg.contributors, function(contributor) {%>\n *   <%= contributor.name %> - <%= contributor.url %><% }); %>\n *\n' +
        ' * Last build: <%= grunt.template.today("yyyy-mm-dd h:MM:ss TT Z") %>\n' +
        ' */\n',
        pkg: pkg,
        clean: {
            locale: ['dist/js/locale/*'],
            plugin: [
                'api-doc',
                'dist/js/<%= pkg.name %>.js',
                'dist/js/<%= pkg.name %>.min.js'
            ],
            styles: ['dist/css/']
        },
        dss: {
            docs: {
                files: {
                    docs: [
                        'src/js/ajaxSelectPicker.defaults.js',
                        'src/js/ajaxSelectPicker.locale/en-US.js'
                    ]
                },
                options: {
                    template: 'templates/',
                    template_index: 'jsdoc2md.handlebars',
                    output_index: '/options.md',
                    parsers: parsers,
                    handlebars_helpers: {
                        section: function(filename) {
                            if (filename === 'src/js/ajaxSelectPicker.defaults.js') {
                                return '## Options';
                            }
                            else if (filename === 'src/js/ajaxSelectPicker.locale/en-US.js') {
                                return '## Locale Strings';
                            }
                        }
                    }
                }
            }
        },
        concat: {
            plugin: {
                options: {
                    banner: '<%= banner %>' + '!(function ($, window) {\n\n',
                    footer: '\n})(jQuery, window);\n'
                },
                src: [
                    'src/js/classes/**/*.js',
                    'src/js/ajaxSelectPicker.js',
                    'src/js/ajaxSelectPicker.defaults.js',
                    'src/js/ajaxSelectPicker.locale/en-US.js'
                ],
                dest: 'dist/js/<%= pkg.name %>.js'
            }
        },
        copy: {
            locale: {
                files: [{
                    expand: true,
                    cwd: 'src/js/ajaxSelectPicker.locale/',
                    src: [
                        '**/*.js'
                    ],
                    dest: 'dist/js/locale/',
                    rename: function(dest, src) {
                        grunt.log.writeln(dest);
                        grunt.log.writeln(src);
                        return dest + src.replace(/(.*)\.js$/, pkg.name + '.$1.js');
                    }
                }],
                options: {
                    process: function (content, srcpath) {
                        return grunt.template.process('<%= banner %>') + '!(function ($) {\n' + content + '})(jQuery);\n';
                    }
                }
            }
        },
        jsduck: {
            api: {
                src: [
                    'src/js/classes/**/*.js',
                    'src/js/ajaxSelectPicker.js',
                    'src/js/ajaxSelectPicker.defaults.js',
                    'src/js/ajaxSelectPicker.locale/en-US.js'
                ],
                dest: 'api-docs',
                options: {
                    categories: 'jsduck.categories.json',
                    external: ['jQuery', '$', 'jqXHR', 'Selectpicker'],
                    warnings: ['-tag(default,description,example,name,optional,required,see)']
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            locale: {
                src: [
                    'src/js/ajaxSelectPicker.locale/**/*.js'
                ]
            },
            plugin: {
                src: [
                    'package.json',
                    'Gruntfile.js',
                    'src/js/classes/**/*.js',
                    'src/js/ajaxSelectPicker.js',
                    'src/js/ajaxSelectPicker.defaults.js',
                    'src/js/ajaxSelectPicker.locale/en-US.js'
                ]
            }
        },
        less: {
            options: {
                banner: '<%= banner %>'
            },
            plugin: {
                src: 'src/less/**/*.less',
                dest: 'dist/css/<%= pkg.name %>.css'
            }
        },
        uglify: {
            options: {
                preserveComments: 'some'
            },
            locale: {
                files: [{
                    expand: true,
                    cwd: 'src/js/ajaxSelectPicker.locale/',
                    src: ['**/*.js'],
                    dest: 'dist/js/locale/',
                    ext: '.min.js',
                    rename: function(dest, src) {
                        return dest + src.replace(/(.*)\.min\.js$/, pkg.name + '.$1.min.js');
                    }
                }],
                options: {
                    banner: '<%= banner %>' + '!(function ($) {\n',
                    footer: '})(jQuery);\n'
                }
            },
            plugin: {
                src: 'dist/js/<%= pkg.name %>.js',
                dest: 'dist/js/<%= pkg.name %>.min.js'
            }
        },
        watch: {
            docs: {
                files: [
                    '.verbrc.md',
                    'docs/**/*.md',
                    'docs/**/*.handlebars',
                    'src/js/ajaxSelectPicker.defaults.js',
                    'src/js/ajaxSelectPicker.locale/en-US.js'
                ],
                tasks: ['docs']
            },
            locale: {
                files: '<%= jshint.locale.src %>',
                tasks: ['locale']
            },
            styles: {
                files: '<%= less.plugin.src %>',
                tasks: ['styles']
            },
            plugin: {
                files: '<%= jshint.plugin.src %>',
                tasks: ['plugin']
            }
        }
    });

    // Load the grunt plugins.
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-dss');
    grunt.loadNpmTasks('grunt-jsduck');
    grunt.loadNpmTasks('grunt-verb');

    // Default task(s).
    grunt.registerTask('docs', ['dss', 'verb']);
    grunt.registerTask('locale', ['jshint:locale', 'clean:locale', 'copy:locale', 'uglify:locale']);
    grunt.registerTask('plugin', ['jshint:plugin', 'clean:plugin', 'concat:plugin', 'uglify:plugin', 'jsduck']);
    grunt.registerTask('styles', ['clean:styles', 'less']);
    grunt.registerTask('default', ['docs', 'locale', 'plugin', 'styles']);

};
