all: build install lint

.PHONY: build install

build:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

install:
	mkdir -p ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/
	cp -R ./* ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/

publish:
	rm -rf build
	mkdir build
	cp LICENSE ./build
	cp *.js ./build
	cp metadata.json ./build
	cp stylesheet.css ./build
	cp -r ui ./build
	cp -r preferences ./build
	cp -r effects ./build
	cp -r dbus ./build
	cp README.md ./build
	cp -R schemas ./build
	rm -rf ./*.zip
	cd build ; \
	zip -qr ../custom-window-controls@icedman.github.com.zip .

install-zip: publish
	echo "installing zip..."
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com
	mkdir -p ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/
	unzip -q custom-window-controls@icedman.github.com.zip -d ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/

test-prefs:
	gnome-extensions prefs custom-window-controls@icedman.github.com

lint:
	eslint ./

xml-lint:
	cd ui ; \
	find . -name "*.ui" -type f -exec xmllint --output '{}' --format '{}' \;

pretty: xml-lint
	prettier --single-quote --write "**/*.js"
