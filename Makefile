all: dist/drivethru.min.js dist/drivethru.min.css

dist/drivethru.min.css: node_modules
	./node_modules/clean-css/bin/cleancss ./lib/css/drivethru.css > $@

dist/drivethru.min.js: node_modules
	mkdir -p dist
	./node_modules/react-tools/bin/jsx ./lib/jsx ./lib/js
	./node_modules/uglify-js/bin/uglifyjs ./lib/js/react.js ./lib/js/drivethru.js > $@

node_modules:
	npm install
