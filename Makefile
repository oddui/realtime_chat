REPORTER = spec

test:
	NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		test/*.js

.PHONY: test
