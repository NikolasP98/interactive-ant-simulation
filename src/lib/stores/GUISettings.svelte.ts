type Subsetting = {
	name: string;
	values: {
		[key: string]: any;
	};
};
type Setting = {
	name: string;
	subsettings: Subsetting[];
};

type Settings = Setting[];

class SettingStore {
	private readonly initialSettings: Settings = [
		{
			name: 'interactions',
			subsettings: [
				{
					name: 'click',
					values: { action: 'COLONY' }
				},
				{
					name: 'foodClickAmount',
					values: { item: 4 }
				}
			]
		},
		{
			name: 'entities',
			subsettings: [
				{
					name: 'ant',
					values: {
						wanderStrength: 0.5,
						steerForce: 0.01,
						perceptionRadius: 100,
						showRadius: true
					}
				},
				{
					name: 'food',
					values: {
						foodSize: 5
					}
				}
			]
		}
	];

	public settings: Settings = $state(this.initialSettings);

	public interactionSettings: Setting = $derived.by(() => {
		return this.settings.find((setting) => setting.name === 'interactions');
	});

	public entitySettings: Setting = $derived.by(() => {
		return this.settings.find((setting) => setting.name === 'entities');
	});

	public foodSettings: Subsetting = $derived.by(() => {
		return this.entitySettings.subsettings[1].values;
	});

	public antSettings: Subsetting = $derived.by(() => {
		return this.entitySettings.subsettings[0].values;
	});

	constructor() {
		// console.log(this.settings[1].subsettings[0].values.foodSize);
	}

	/**
	 * Destroy the setting store.
	 */
	public destroy = (): void => {
		this.settings = null;
	};

	public reset = (): void => {
		// this.settings = JSON.parse(JSON.stringify(this.initialSettings));
		this.settings = structuredClone(this.initialSettings);
	};
}

export default new SettingStore();
