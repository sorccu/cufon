tag = $(shell git describe --abbrev=0)
orig_branch = master
build_branch = build-$(tag)
versioned = generate/index.html generate/view/header.php js/cufon.js
yui_compressor = yuicompressor.jar

build:
	if test -z '$(tag)'; then \
		echo "Something's terribly wrong; no tag matches this commit."; \
		exit 1; \
	fi
	if test ! -f '$(yui_compressor)'; then \
		echo "$(yui_compressor) is missing; download the latest YUI compressor and symlink it."; \
		exit 2; \
	fi
	git checkout -qf $(orig_branch)
	git branch -f $(build_branch) $(tag)
	git checkout -q $(build_branch)
	if sed --in-place --version 1> /dev/null 2> /dev/null; then \
		sed --in-place -e 's/$${Version}/$(tag)/' $(versioned); \
	else \
		sed -i '' -e 's/$${Version}/$(tag)/' $(versioned); \
	fi
	java -jar $(yui_compressor) js/cufon.js -o js/cufon-yui.js
	git add $(versioned) js/cufon-yui.js
	git commit -a -m 'Built $(tag)'

clean:
	git reset HEAD
	git checkout -qf $(orig_branch)