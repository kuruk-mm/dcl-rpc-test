
ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

test:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand $(TESTARGS)

test-watch:
	node_modules/.bin/jest --detectOpenHandles --colors --runInBand --watch $(TESTARGS)

build:
	./node_modules/.bin/tsc -p tsconfig.json

integration:
	@cd src; ./build.sh
	@TS_NODE_PROJECT="src/tsconfig.json" node_modules/.bin/ts-node ./src/integration.ts

.PHONY: build test

dist/index.js:
	@NODE_ENV=production node_modules/.bin/ncc build src/integration.ts -e ws