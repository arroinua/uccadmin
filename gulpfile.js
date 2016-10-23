var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var notify = require('gulp-notify');
var sourcemaps = require('gulp-sourcemaps');

var clientPath = {
	jsSrc: ['!client/all.js', '!client/all.min.js', 'client/app.js', 'client/app.{*}.js', '!client/lib/*.js', 'client/**/*.js'],
	jsDest: 'client/',
	styleSrc: './client/assets/stylesheets/main.scss',
	styleDest: './client/assets/css/'
};

gulp.task('js', function() {
	return gulp.src(clientPath.jsSrc)
		.pipe(sourcemaps.init())
		.pipe(concat('all.js'))
		// .pipe(uglify())
		// .pipe(rename('all.min.js'))
		.pipe(sourcemaps.write())
		.pipe(gulp.dest(clientPath.jsDest))
		.pipe(notify({ message: 'js task complete' }));
});

gulp.task('js:watch', function () {
  gulp.watch(['client/app.js', 'client/app.{*}.js', 'client/**/*.js'], ['js']);
});

gulp.task('styles', function() {
	return gulp.src(clientPath.styleSrc)
		// .pipe(sourcemaps.init())
		.pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
		// .pipe(sourcemaps.write())
		.pipe(gulp.dest(clientPath.styleDest))
		.pipe(notify({ message: 'styles task complete' }));
});

gulp.task('styles:watch', function () {
  gulp.watch(['./client/assets/stylesheets/*.scss', './client/assets/stylesheets/**/*.scss'], ['styles']);
});

gulp.task('build', function() {
	gulp.start('js', 'styles');
});

gulp.task('default', function() {
	gulp.start('js', 'styles');
});
