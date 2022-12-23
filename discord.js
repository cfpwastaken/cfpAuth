import { Router } from "express";
import AccountService from "./accountservice.js";

const r = new Router();

export default r

process.env.DISCORD_CLIENT_ID = "1055519863080230982"
process.env.DISCORD_CLIENT_SECRET = "1mdaCZmzPjl4l8E0f09zOUNcJDze5l38"
process.env.DISCORD_TOKEN = "MTA1NTUxOTg2MzA4MDIzMDk4Mg.GWMoZm.bTmZfeSOo2jZze9nzF3Dzt4SX6UfbcxZTFhzWU"
process.env.DISCORD_REDIRECT_URI = "http://localhost:8080/discord/redirect"
process.env.APPNAME = "Cfp"
process.env.DISCORD_VERIFY_LINK = "https://discord.com/api/oauth2/authorize?client_id=1055519863080230982&redirect_uri=http%3A%2F%2Flocalhost%3A8080%2Fdiscord%2Fredirect&response_type=code&scope=role_connections.write"

r.get("/", (req, res) => {
	res.redirect(process.env.DISCORD_BOT_LINK)
})

r.get("/verify-user", async (req, res) => {
	if(!req.cookies.uuid) {
		res.redirect("/login?next=%2Fdiscord%2Fverify-user");
		return;
	}
	const check = await AccountService.checkToken(req.cookies.uuid, req.cookies.token, await AccountService.fingerprint(req))
	if(check.error) {
		res.redirect("/logout");
		return;
	}
	res.redirect(process.env.DISCORD_VERIFY_LINK)
})

r.get("/redirect", async (req, res) => {
	const code = req.query.code;
	if(!code) {
		res.redirect("/discord/verify-user");
		return;
	}

	const tok = await fetch(`https://discord.com/api/oauth2/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams({
			client_id: process.env.DISCORD_CLIENT_ID,
			client_secret: process.env.DISCORD_CLIENT_SECRET,
			grant_type: "authorization_code",
			code,
			redirect_uri: process.env.DISCORD_REDIRECT_URI
		}).toString()
	}).then(res => res.json());

	await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
		method: "PUT",
		headers: {
			Authorization: `Bearer ${tok.access_token}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			platform_name: process.env.APPNAME,
			metadata: {
				verified: (await AccountService.getBy("uuid", req.cookies.uuid)).verified + 0
			}
		})
	}).then(res => res.json());

	res.sendPage("discord_success.html");
})

fetch(`https://discord.com/api/v10/applications/${process.env.DISCORD_CLIENT_ID}/role-connections/metadata`, {
	method: "PUT",
	headers: {
		Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
		"Content-Type": "application/json"
	},
	body: JSON.stringify([{
		type: 7,
		key: "verified",
		name: "Verified",
		description: "If the user is verified"
	}])
}).then(res => res.json()).then(res => {
	console.log(JSON.stringify(res, null, 2))
})