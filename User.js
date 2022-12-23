import { db } from "./main.js";
import sql from "sql-tagged-template-literal";
import { Post } from "./Post.js";
import { compare } from "bcrypt";
import { totp, generateSecret } from "@levminer/speakeasy";
// import { randomBytes } from "crypto";
//import { App } from "./App";
import { toDataURL } from "qrcode";
//import { MemesAccount } from "./memes/MemesAccount";
// import webauthn from "@frenatix/webauthn-js";
// import base64url from "base64url";

function check2fa(code, token) {
	return totp.verify({ secret: token, encoding: "base32", token: code });
}

export class User {
	id; username; password; uuid; bio; avatar; bot; auth; twofa; created; verified; birthday;

	constructor(id, username, password, uuid, bio, avatar, bot, auth, created, verified, birthday) {
		this.id = id;
		this.username = username;
		this.password = password;
		this.uuid = uuid;
		this.bio = bio;
		this.avatar = avatar;
		this.bot = bot;
		this.auth = JSON.parse(auth); // [{type:"2fa", token:"...", active: true}, {type:"key", stuff: ""}]
		this.twofa = [];
		for(let i = 0; i < this.auth.length; i++) {
			if(this.auth[i].type == "2fa") {
			this.twofa.push({token: this.auth[i].token, active: this.auth[i].active});
			}
		}
		this.created = created;
		this.verified = verified;
		this.birthday = birthday;
	}

	async post(message) {
		await db.query(
			sql`INSERT INTO posts (uuid, text, date)
				VALUES (${this.uuid}, ${message}, NOW())`);
	}

	async getPosts() {
		const results = await db.query(sql`SELECT * FROM posts WHERE uuid=${this.uuid} ORDER BY date DESC`);
		return results.map(result => new Post(result[0].uuid, result[0].text, result[0].date));
	}

	async checkPassword(password, secondfactor) {
			if(this.bot)
				return "NO_BOT_LOGIN";
			const pwCompare = await compare(password, this.password.replace(/^\$2y/, "$2a"))
			if(pwCompare) {
				if(this.twofa.length != 0) {
					if(secondfactor == undefined || secondfactor.length != 6) return "SECOND_FACTOR_REQUIRED";
					for(const token of this.twofa) {
							if(!token.active) continue;
							if(check2fa(secondfactor, token.token)) {
								return "SUCCESS";
							}
					}
					return "WRONG_2FA_CODE";
				}
				return "SUCCESS";
			}
			return "INVALID_CREDENTIALS";
	}

	// async makePermissionToken(appid: number) {
	//     const app = await db.query(sql`SELECT name, perms FROM apps WHERE id=${appid}`);
	//     const key = hash(Date.now() + this.uuid + this.token + app[0][0].name, 10);
	//     const token = hash(Date.now() + randomBytes(48).toString("hex") + key, 10);
	//     await db.query(sql`INSERT INTO tokens (token, uuid, perms, name, username)
	//                         VALUES (${token}, ${this.uuid}, ${app[0][0].perms}, ${app[0][0].name}, ${this.username})`);
	//     return token;
	// }

	// async getApps() {
	//     const results = await db.query(sql`SELECT * FROM apps WHERE owneruuid=${this.uuid}`);
	//     return results.map(result => new App(result.id, result.name, result.perms));
	// }

	async createApp(name, perms) {
			await db.query(sql`INSERT INTO apps (name, perms, owneruuid) VALUES (${name}, ${perms} ${this.uuid})`);
	}

	async enable2FA() {
			if(this.auth.find(auth => auth.type == "2fa" && auth.active == false)) {
				return false;
			}
			const secret = generateSecret();
			const newAuth = this.auth;
			newAuth.push({type: "2fa", token: secret.base32, active: false});
			await db.query(sql`UPDATE users SET auth=${JSON.stringify(newAuth)} WHERE uuid=${this.uuid}`);
			const url = secret.otpauth_url;
			const qr = await toDataURL(url);
			return {code: qr};
	}

	async confirmEnable2FA(code, device) {
		if(check2fa(code, this.auth.find(auth => auth.type == "2fa" && auth.active == false).token)) {
				const newAuth = this.auth;
				newAuth.find(auth => auth.type == "2fa" && auth.active == false).device = device;
				newAuth.find(auth => auth.type == "2fa" && auth.active == false && auth.device == device).active = true;
				await db.query(sql`UPDATE users SET auth=${JSON.stringify(newAuth)} WHERE uuid=${this.uuid}`);
				return true;
			}
			return false;
	}

	async disable2FA(device) {
		const newAuth = this.auth;
		newAuth.splice(newAuth.findIndex(a => a.type == "2fa" && a.device == device), 1)
		await db.query(sql`UPDATE users SET auth=${JSON.stringify(newAuth)} WHERE uuid=${this.uuid}`);
	}

	async update(key, value) {
			await db.query(`UPDATE users SET ${key}` + sql`=${value} WHERE uuid=${this.uuid}`);
	}

	async delete() {
			await db.query(sql`DELETE FROM users WHERE uuid=${this.uuid}`);
	}

	toJSON() {
		const clone = Object.assign({}, this);
		delete clone.password;
		delete clone.auth;
		delete clone.twofa;
		delete clone.id;
		return clone;
	}

}