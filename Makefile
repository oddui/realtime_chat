REPORTER = spec
TESTS = test/**/*.js test/**/**/*.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		--ui tdd \
		$(TESTS)

.PHONY: test
