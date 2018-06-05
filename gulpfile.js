"use strict";

const gulp           = require("gulp");
const less           = require("gulp-less");
const plumber        = require("gulp-plumber");
const postcss        = require("gulp-postcss");
const autoprefixer   = require("autoprefixer");
const server         = require("browser-sync").create();
const mqpacker       = require("css-mqpacker");
const minifycss      = require("gulp-csso");
const cncat          = require("gulp-concat");
const uglify         = require("gulp-uglify");
const rename         = require("gulp-rename");
const imagemin       = require("gulp-imagemin");
const webp           = require("gulp-webp");
const svgmin         = require("gulp-svgmin");
const svgstore       = require("gulp-svgstore");
const concat         = require("gulp-concat");
const inject         = require("gulp-inject");
const injectPartials = require("gulp-inject-partials");
const run            = require("run-sequence");
const del            = require("del");
const ghPages        = require("gulp-gh-pages");
const babel          = require("gulp-babel");
const spritesmith    = require('gulp.spritesmith');
const merge          = require('merge-stream');
const path           = require('path');
const sourcemaps     = require('gulp-sourcemaps');

// CLEAN BUILD

gulp.task("clean", function() {
  return del("build");
});

// HTML

function fileContents (filePath, file) {
  return file.contents.toString("utf8");
}

gulp.task("html", function() {
  return gulp.src("src/*.html")
  .pipe(injectPartials({
    removeTags: true
  }))
  .pipe(gulp.dest("./build"));
});

// CSS

gulp.task("style", function() {
  gulp.src("src/less/main.less")
  .pipe(plumber())
  // .pipe(sourcemaps.init())      
  .pipe(less())
  .pipe(postcss([
    autoprefixer(),
    mqpacker({ sort: true })   
  ]))
  // .pipe(sourcemaps.write('/')) 
  // .pipe(gulp.dest("build/css"))
  .pipe(rename("main.min.css"))
  .pipe(minifycss())
  .pipe(gulp.dest("build/css"))
  .pipe(server.stream());
});

// JS
gulp.task("js:del", function() {
  return del("build/js");
});

gulp.task("js", ["js:del"], function() {
  gulp.src([
    // "src/libs/glide/glide.min.js",
    "src/libs/flickity/flickity.min.js",
    "src/js/*.js" // At the end
  ])
  .pipe(plumber())
  .pipe(cncat("index.min.js"))
  .pipe(babel({
    presets: ['env']
  }))
  .pipe(uglify())
  .pipe(gulp.dest("build/js"))
  .pipe(server.stream());
});

// FONTS

gulp.task("fonts:del", function() {
  return del("build/fonts");
});

gulp.task("fonts", ["fonts:del"], function() {
  return gulp.src("src/fonts/**/*.{woff,woff2}")
  .pipe(gulp.dest("build/fonts/"));
});

// FAVICON

gulp.task("favicons:del", function() {
  return del("build/img/favicons");
});

gulp.task("favicon", ["favicons:del"], function() {
  return gulp.src("src/img/favicons/**")
  .pipe(gulp.dest("build/img/favicons/"));
});

// IMAGES

gulp.task("img:del", function() {
  return del("build/img/**/*.*");
});

gulp.task("img:copy", ["img:del"], function() {
  return gulp.src("src/img/**/*.*")
  .pipe(gulp.dest("build/img/"));
});

gulp.task("img:minify", ["img:copy"], function() {
  return gulp.src("build/img/**/*.{png,jpg,gif,svg}")
  .pipe(imagemin([
    imagemin.optipng({optimizationLevel: 3}),
    imagemin.jpegtran({progressive: true}),
    imagemin.svgo()
  ]))
  .pipe(gulp.dest("build/img"));
});

// WEBP

gulp.task("webp:del", function() {
  return del("build/img/content");
});

gulp.task("webp:copy", ["webp:del"], function() {
  return gulp.src("src/img/content/*.{png,jpg}")
  .pipe(gulp.dest("build/img/content"));
});

gulp.task("webp:convert", ["webp:copy"], function() {
  return gulp.src("src/build/img/content/*.{png,jpg}")
  .pipe(webp({quality: 90}))
  .pipe(gulp.dest("build/img/content"));
});

// SVG-SPRITE

gulp.task("svg-sprite:del", function() {
  return del("build/img/svg-sprite");
});

gulp.task("svg-sprite", ["svg-sprite:del"], function() {
  var svgs = gulp.src("src/img/svg/*.svg")
  // .pipe(gulp.dest("build/img/svg-sprite"))
  .pipe(svgmin())
  .pipe(svgstore({
    inlineSvg: true
  }));
  
  gulp.src("build/index.html")
  .pipe(inject(svgs, {transform: fileContents}))
  .pipe(gulp.dest("build/"));
  
  svgs.pipe(rename("sprite.svg"))
  .pipe(gulp.dest("build/img"));
  
});


// SPRITESMITH

gulp.task('sprite', function () {
  var spriteData = gulp.src('src/img/sprite/*.jpg')
  .pipe(spritesmith({
    imgName: 'sprite.png',
    cssName: 'sprite.css'
  }));

  // Pipe image stream through image optimizer and onto disk
  var imgStream = spriteData.img
    .pipe(gulp.dest('build/img/sprite/'));
 
  // Pipe CSS stream through CSS optimizer and onto disk
  var cssStream = spriteData.css
    .pipe(gulp.dest('src/less/sprite'));

  return merge(imgStream, cssStream);
});


//GH-PAGES

gulp.task("deploy", function() {
  return gulp.src("build/**/*")
  .pipe(ghPages());
});

// LIVE SERVER

gulp.task("serve", function() {
  server.init({
    server: "build",
    notify: false,
    open: true,
    cors: true,
    ui: false
  });
  
  gulp.watch("src/less/**/*.less", ["style"]);
  gulp.watch("src/**/*.html", ["html", server.reload]);
  gulp.watch("src/js/*.js", ["js", server.reload]);
  // gulp.watch("src/img/favicons/**", ["favicon", server.reload]);
  // gulp.watch("src/img/*.*", ["img:minify", server.reload]);
  gulp.watch("src/img/content/*.{png,jpg}", ["webp:convert", server.reload]);
  // gulp.watch("src/fonts/*.*", ["fonts", server.reload]);
  // gulp.watch("src/img/svg-sprite/**", ["svg-sprite", server.reload]);
});

// BUILD

gulp.task("build", function(done) {
  run(
    "clean",
    "fonts",
    "favicon",
    "img:minify",
    "webp:convert",
    "html",
    "style",
    "svg-sprite",
    "js",
    "sprite",
    done
  );
});

// DEFAULT

gulp.task("default", ["serve"]);