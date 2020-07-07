type Nullable<T> = T | null;

export class TrackInfo {
	public name: string;
	public file: string;

	public constructor(name: string, file: string) {
		this.name = name;
		this.file = file;
	}
}

export interface RadioAPI {
	getTrack: (name: string) => TrackInfo;
	getTracks: () => Promise<TrackInfo[]>;
}
