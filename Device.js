export default class Device {
	uuid; token; fingerprint;

	constructor(uuid, token, fingerprint) {
		this.uuid = uuid;
		this.token = token;
		this.fingerprint = fingerprint;
	}
}