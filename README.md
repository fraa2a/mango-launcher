<div align="center">

[<img src="https://raw.githubusercontent.com/fraa2a/mango-launcher/main/resources/icon.png" width="144" alt="Mango Launcher icon"/>](https://github.com/fraa2a/mango-launcher)

  <h1 align="center">Mango Launcher</h1>

  <p align="center">
    <strong>Mango Launcher is an open-source gaming platform designed to be the single tool you need to manage your gaming library. Mango is written in Node.js (Electron, React, TypeScript), Python, and Rust.</strong>
  </p>

[![build](https://img.shields.io/github/actions/workflow/status/fraa2a/mango-launcher/release.yml?label=release)](https://github.com/fraa2a/mango-launcher/actions)
[![release](https://img.shields.io/github/package-json/v/fraa2a/mango-launcher)](https://github.com/fraa2a/mango-launcher/releases)
[![aur](https://img.shields.io/aur/version/mango-launcher-bin)](https://aur.archlinux.org/packages/mango-launcher-bin)

</div>

## Features

- Add games that you own to your library and launch them from one place
- Browse a rich catalogue of download sources and manage your downloads
- Play your classic games through **Mango Classics**: set up emulation for your consoles, configure ROM folders, and review your library
  - Mango never downloads or distributes ROMs or BIOS files — your library, your responsibility
- Manage memory cards and save states for your emulated games
- Unlock achievements and get notified as you play
- Enjoy a console-style interface with **Big Picture** mode
- Import custom download sources from `.mangocds` files or the `mangolauncher://install-source` browser integration — see [docs/mangocds.md](docs/mangocds.md)

## Build from source

### Local development requirements

- Node.js + Yarn
- Python 3.9+ with `pip install -r requirements.txt`
- Rust toolchain (for `mango-native`)

### Setup

After installing dependencies, the `postinstall` script automatically builds the Rust native addon (`mango-native/mango-native.node`).

```bash
yarn install
yarn dev
```

Packaging scripts (`yarn build:win`, `yarn build:mac`, `yarn build:linux`, `yarn build:unpack`) build the Python RPC bundle automatically.

## Installation

Prebuilt packages are published for every release:

- **Linux**: `.deb`, `.rpm`, and `.tar.gz` — Arch users can install the [`mango-launcher-bin`](https://aur.archlinux.org/packages/mango-launcher-bin) AUR package
- **Windows**: `.exe` installer and portable builds
- **macOS**: `.dmg`

Grab the latest from the [Releases](https://github.com/fraa2a/mango-launcher/releases) page.

## Contributors

<a href="https://github.com/fraa2a/mango-launcher/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=fraa2a/mango-launcher" />
</a>

## License

Mango is licensed under the [MIT License](LICENSE).
