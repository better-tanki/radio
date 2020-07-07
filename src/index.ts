import * as path from 'path';

import Decimal from 'decimal.js';

import { Plugin, Nullable } from '../../plugin-api';
import { RadioAPI, TrackInfo } from './api';
import { NotificationAPI } from './api-imports';

export default class extends Plugin {
	public api: RadioAPI;

	public constructor() {
		super({
			id: 'radio',
			name: 'Radio',
			description: null,
			version: '1.0.0',
			author: 'Assasans'
		});

		this.api = {
			getTrack: (name: string): TrackInfo => {
				throw new Error('Plugin not loaded');
			},
			getTracks: (): Promise<TrackInfo[]> => {
				throw new Error('Plugin not loaded');
			}
		};
	}

	public async load(): Promise<void> {
		const $ = await import('jquery');

		$('head').append($(`<link href="${__dirname}/../css/radio.css" rel="stylesheet">`));

		$('body').append($(`
<div id="bt-radio__container">
	<link href="https://fonts.googleapis.com/css?family=Material+Icons|Material+Icons+Round" rel="stylesheet">

	<div id="bt-radio-playlist">
		<div class="bt-radio-playlist__item">
			<span class="bt-radio-playlist__item-title" data-index="0">Example title</span>
		</div>
	</div>

	<div id="bt-radio">
		<div id="bt-radio__header">
			Радио
		</div>
		<div id="bt-radio__body">
			<div id="bt-radio__current-track">
				Radio
			</div>

			<div id="bt-radio__controls">
				<span class="material-icons-round bt-radio__control" id="bt-radio__button-prev">skip_previous</span>

				<span class="material-icons-round bt-radio__control" id="bt-radio__button-play">play_arrow</span>
				<span class="material-icons-round bt-radio__control" id="bt-radio__button-pause">pause</span>

				<span class="material-icons-round bt-radio__control" id="bt-radio__button-next">skip_next</span>
			</div>

			<div id="bt-radio__progress">
				<div id="bt-radio__progress-completed"></div>
			</div>
		</div>
	</div>

	<button id="bt-radio__toggle">Радио</button>
</div>
		`));

		this.api = {
			getTrack: (name: string): TrackInfo => {
				const fullPath: string = path.join(__dirname, '..', 'tracks', `${name}.mp3`);
				return new TrackInfo(path.basename(fullPath, '.mp3'), fullPath)
			},
			getTracks: async (): Promise<TrackInfo[]> => {
				const fs = await import('promise-fs');

				const tracksDir: string = path.join(__dirname, '..', 'tracks');
			
				return (await fs.readdir(tracksDir)).map((file: string) => this.api.getTrack(path.basename(file, '.mp3')));
			}
		};
	}

	public async start(): Promise<void> {
		let radioVisible: boolean = false;
		let position: number = 0;
		let volume: Decimal = new Decimal(100);
		let playlist: TrackInfo[] = [];
		let radio: HTMLAudioElement = new Audio();

		radio.addEventListener('ended', () => {
			console.log('Next (auto)');
			if(playlist[position + 1]) {
				position++;
				playItem(position);
			}
		});

		function updateVolume() {
			radio.volume = volume.div(2).div(100).toNumber();
		}

		async function loadPlaylist() {
			playlist = await (window.BetterTanki.PluginAPI.get('radio')?.api as RadioAPI).getTracks();
			if(!radio.src && playlist[0]) {
				radio.src = playlist[0].file;
			}

			$('div#bt-radio-playlist').empty();
			playlist.forEach((track: TrackInfo, index: number) => {
				const playlistItem = $('<div class="bt-radio-playlist__item"></div>');
				const playlistItemTitle = $('<span class="bt-radio-playlist__item-title"></span>');

				playlistItemTitle.text(`${index + 1}. ${track.name}`);

				playlistItem.attr('data-index', index);
				playlistItem.append(playlistItemTitle);

				$('div#bt-radio-playlist').append(playlistItem);

				$(playlistItem).on('click', (event) => {
					const indexRaw: Nullable<string> = event.delegateTarget.getAttribute('data-index');
					if(indexRaw === null) return;
					const index: number = Number(indexRaw);

					position = index;
					playItem(index);
				});
			});
		}

		function updatePosition() {
			const progressWidth: number = (radio.currentTime / radio.duration) * 100;
			$('div#bt-radio__progress-completed').css('width', `${progressWidth.toFixed(1)}%`);
		}

		$(document).ready(() => {
			loadPlaylist();
			
			setInterval(() => {
				if(!radio.paused) {
					updatePosition();
				}
			}, 1000);

			$('button#bt-radio__toggle').on('click', () => {
				$('div#bt-radio').css('bottom', radioVisible ? '-12rem' : '0rem');
				$('div#bt-radio-playlist').css('bottom', radioVisible ? '-18rem' : '0rem');
				radioVisible = !radioVisible;
			});

			$('span#bt-radio__button-play').on('click', () => {
				console.log('Play');
				radio.play();
				updatePosition();
			});
			$('span#bt-radio__button-pause').on('click', () => {
				console.log('Pause');
				radio.pause();
				updatePosition();
			});

			$('span#bt-radio__button-prev').on('click', () => {
				console.log('Prev');
				if(playlist[position - 1]) {
					position--;
					playItem(position);
				}
			});
			$('span#bt-radio__button-next').on('click', () => {
				console.log('Next');
				if(playlist[position + 1]) {
					position++;
					playItem(position);
				}
			});
		});

		$(document).on('keyup', ({ key, ctrlKey, altKey }) => {
			if(ctrlKey) {
				console.log(`Ctrl + ${key}`);
				switch(key) {
					case 'ArrowUp': {
						if(volume.lt(200)) {
							volume = volume.plus(5);
							updateVolume();

							(window.BetterTanki.PluginAPI.get('notification-api')?.api as NotificationAPI).create({
								title: 'Радио',
								message: `Громкость установлена на <b>${volume.toString()}%</b>`,
								icon: 'https://cdn.discordapp.com/avatars/693069847160160326/543f72e0f1c215abf1651e74585af686.png?size=128',
								duration: 3000
							});
						}
						break;
					}

					case 'ArrowDown': {
						if(volume.gte(5)) {
							volume = volume.minus(5);
							updateVolume();
							
							(window.BetterTanki.PluginAPI.get('notification-api')?.api as NotificationAPI).create({
								title: 'Радио',
								message: `Громкость установлена на <b>${volume.toString()}%</b>`,
								icon: 'https://cdn.discordapp.com/avatars/693069847160160326/543f72e0f1c215abf1651e74585af686.png?size=128',
								duration: 3000
							});
						}
						break;
					}

					case 'ArrowLeft': {
						const time = Math.max(0, radio.currentTime - 5);
						if(Number.isFinite(time)) {
							radio.currentTime = time;
							updatePosition();
						}
						break;
					}

					case 'ArrowRight': {
						const time = Math.min(radio.duration, radio.currentTime + 5);
						if(Number.isFinite(time)) {
							radio.currentTime = time;
							updatePosition();
						}
						break;
					}

					case 'p': {
						radio.paused ? radio.play() : radio.pause();
						updatePosition();
						break;
					}

					case '[': {
						if(playlist[position - 1]) {
							position--;
							playItem(position);
						}
						break;
					}

					case ']': {
						if(playlist[position + 1]) {
							position++;
							playItem(position);
						}
						break;
					}
				}
			}
		});

		async function playItem(index: number): Promise<boolean> {
			const entry: TrackInfo = playlist[index];

			if(!entry) return false;

			radio.src = entry.file;
			try {
				await radio.play();
			} catch {
				
			}
			updatePosition();

			$('div#bt-radio__current-track').text(`${index + 1}. ${entry.name}`);

			console.log(`Playing item ${index}: ${entry.name}`);
			(window.BetterTanki.PluginAPI.get('notification-api')?.api as NotificationAPI).create({
				title: 'Радио',
				message: `Сейчас играет <b>${index + 1}. ${entry.name}</b>`,
				icon: 'https://cdn.discordapp.com/avatars/693069847160160326/543f72e0f1c215abf1651e74585af686.png?size=128',
				duration: 5000
			});

			return true;
		}
	}
}
