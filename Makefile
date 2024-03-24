all: build install lint

.PHONY: build install

build:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

install:
	mkdir -p ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/effects/*.js
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/preferences/*.js
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/tests/*.js
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/*.js
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
	rm ./build/style.js
	rm ./build/utils.js
	rm ./build/chamfer.js
	cd build ; \
	zip -qr ../custom-window-controls@icedman.github.com.zip .

install-zip: publish
	echo "installing zip..."
	rm -rf ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com
	mkdir -p ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/
	unzip -q custom-window-controls@icedman.github.com.zip -d ~/.local/share/gnome-shell/extensions/custom-window-controls@icedman.github.com/

test-prefs:
	gnome-extensions prefs custom-window-controls@icedman.github.com

test-shell: install
	env GNOME_SHELL_SLOWDOWN_FACTOR=1 \
		MUTTER_DEBUG_DUMMY_MODE_SPECS=1280x800 \
	 	MUTTER_DEBUG_DUMMY_MONITOR_SCALES=1 \
		dbus-run-session -- gnome-shell --nested --wayland
	rm /run/user/1000/gnome-shell-disable-extensions

lint:
	eslint ./

xml-lint:
	cd ui ; \
	find . -name "*.ui" -type f -exec xmllint --output '{}' --format '{}' \;

pretty: xml-lint
	prettier --single-quote --write "**/*.js"
