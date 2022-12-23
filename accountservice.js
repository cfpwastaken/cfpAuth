import { db } from "./main.js";
import sql from "sql-tagged-template-literal";
import {v4 as generateUUID} from "uuid";
import Device from "./Device.js";
import { User } from "./User.js";
import { hash } from "bcrypt";
import { randomBytes } from "crypto";

export default class AccountService {
  static async register(username, password, bot) {
		if(username.length < 2) return "USERNAME_INVALID";
		if(password.length < 8) return "PASSWORD_INVALID";
		const userTaken = (await db.query(sql`SELECT * FROM users WHERE username=${username}`))[0];
		if (userTaken.length > 0) return "USERNAME_TAKEN";
		// const vkey = await generateVKEY(username);
		const uuid = generateUUID();
		// const token = await generateToken(uuid);
		const hashedpw = await hash(password, 10);
		await db.query(sql`INSERT INTO users (username, password, uuid, bio, avatar, bot, created, auth) VALUES (${username}, ${hashedpw}, ${uuid}, "Hi!", "/avatars/default.svg", ${bot ? 1 : 0}, NOW(), '[]')`);
		return "SUCCESS";
  }
	
	static async getBy(key, value) {
		const results = (await db.query("SELECT * FROM users WHERE " + key + sql`=${value}`))[0];
		if (results.length > 0) {
			return new User(results[0].id, results[0].username, results[0].password, results[0].uuid, results[0].bio, results[0].avatar, results[0].bot, results[0].auth, results[0].created, results[0].verified, results[0].birthday);
		} else {
			return null;
		}
	}

	static async getAppInfo(token) {
		const results = (await db.query(sql`SELECT * FROM tokens WHERE token=${token}`))[0];
		if (results.length == 0) {
			return null;
		}
		let result = results[0];
		delete result["token"];
		delete result["password"];
		return result;
	}

	static async checkToken(uuid, token, fingerprint) {
		const user = await this.getBy("uuid", uuid);
		if (user == null) {
			return { error: "Invalid uuid" };
		}
		const tokencheck = (await db.query(sql`SELECT fingerprint FROM tokens WHERE token=${token} AND uuid=${uuid}`))[0];
		if(tokencheck.length == 0) {
			return { error: "Invalid token" };
		}
		if(fingerprint && tokencheck[0].fingerprint != JSON.stringify(fingerprint)) {
			return { error: "Invalid fingerprint" };
		}
		return { success: true };
		// if(token == user.token) {
		// 	return { success: true, username: user.username, type: "user" };
		// }
		// const results: any = (await db.query(sql`SELECT username, token, perms FROM tokens WHERE uuid=${uuid} AND token=${token}`))[0];
		// if(results.length == 0) {
		// 	return { error: "Invalid token" };
		// }
		// if(results[0].perms.includes(perm)) {
		// 	return { success: true, username: results[0].username, type: "token" };
		// }
		// return { error: "No permission" };
	}

	static async logoutAll(uuid, except) {
		const user = await this.getBy("uuid", uuid);
		if (user == null) {
			return { error: "Invalid uuid" };
		}
		console.log(JSON.stringify(except));
		
		await db.query(sql`DELETE FROM tokens WHERE uuid=${uuid} AND fingerprint!=${JSON.stringify(except)}`);
		return { success: true };
	}
	
	static async getRegisteredDevices(user) {
		const result = (await db.query(sql`SELECT token FROM tokens WHERE uuid=${user.uuid}`))[0];
		const devices = [];
		for(const r of result) {
			devices.push(await this.getRegisteredDeviceByToken(r.token));
		}
		return devices;
	}

	static async getRegisteredDeviceByToken(token) {
		const result = (await db.query(sql`SELECT uuid, fingerprint FROM tokens WHERE token=${token}`))[0];
		if(result.length == 0) return null;
		return new Device(result[0].uuid, token, JSON.parse(result[0].fingerprint));
	}

	static async getRegisteredDeviceByFingerprint(user, fingerprint) {
		const result = (await db.query(sql`SELECT token FROM tokens WHERE fingerprint=${fingerprint} AND uuid=${user.uuid}`))[0];
		if(result.length == 0) return null;
		return new Device(user.uuid, result[0].token, JSON.parse(fingerprint));
	}

	static async isDeviceRegistered(user, fingerprint) {
		const check = (await db.query(sql`SELECT token FROM tokens WHERE fingerprint=${JSON.stringify(fingerprint)} AND uuid=${user.uuid}`))[0];
		return check.length != 0;
	}

	static async isDeviceRegisteredByToken(user, token) {
		const check = (await db.query(sql`SELECT fingerprint FROM tokens WHERE token=${token} AND uuid=${user.uuid}`))[0];
		return check.length != 0;
	}

	static async getDeviceToken(user, device) {
		if(!await this.isDeviceRegistered(user, device.fingerprint)) return null;
		const check = (await db.query(sql`SELECT token FROM tokens WHERE fingerprint=${JSON.stringify(device.fingerprint)} AND uuid=${user.uuid}`))[0];
		return check[0].token;
	}

	static async registerDevice(user, fingerprint) {
		if(await this.isDeviceRegistered(user, fingerprint)) return this.getDeviceToken(user, fingerprint);
		const token = await this.generateToken(user.uuid);
		await db.query(sql`INSERT INTO tokens (token, uuid, fingerprint) VALUES (${token}, ${user.uuid}, ${JSON.stringify(fingerprint)})`);
		return token;
	}

	static async unregisterDevice(user, token) {
		if(!await this.isDeviceRegisteredByToken(user, token)) return;
		await db.query(sql`DELETE FROM tokens WHERE token=${token} AND uuid=${user.uuid}`);
	}

	// static async getApp(appid) {
	// 	const results = await db.query(sql`SELECT * FROM apps WHERE id=${appid}`);
	// 	if (results.length == 0) {
	// 		return null;
	// 	}
	// 	return new App(results[0].name, results[0].perms, results[0].owneruuid);
	// }

	static async fingerprint(req) {
		return {ua: req.headers["user-agent"], encoding: req.headers["accept-encoding"], lang: req.headers["accept-language"]};
	}

	static async generateToken(uuid) {
		return await hash(Date.now() + randomBytes(48).toString("hex") + uuid, 10);
	}

}