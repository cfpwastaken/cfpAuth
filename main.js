import express from "express";
import * as mysql from "mysql2/promise";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import bodyParser from "body-parser";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import { accountRequest } from "./accountapi.js";
import { readFileSync } from "fs";
import AccountService from "./accountservice.js";
import discordRoleConnections from "./discord.js";

export const db = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "red",
  password: process.env.MYSQL_PASSWORD || "admin",
  database: process.env.MYSQL_DATABASE || "auth"
});

const app = express();
const server = createServer(app);
const io = new SocketServer(server);


app.use((req, res, next) => {
  res.sendPage = (page, options) => {
    let html = readFileSync("pages/" + page, "utf8")
      .replaceAll("{appname}", process.env.APPNAME || "App name")
      .replaceAll("{appdesc}", process.env.APPDESC || "App description")
      .replaceAll("{accent_color}", "#" + (process.env.ACCENTCOLOR || "1d1d1d"));
		
		if(options) {
			for(const [key, value] of Object.entries(options)) {
				if(typeof value === "function") html = html.replaceAll(`{${key}}`, value());
				else html = html.replaceAll(`{${key}}`, value);
			}
		}

    res.send(html);
  }
  next();
})
app.use(express.static("public"));
app.use(bodyParser.json({limit: "4gb"}));
app.use(compression());
app.use(cookieParser());
app.use(fileUpload());
app.use(rateLimit({
  windowMs: 1000,
  max: 50,
  message: "Too many requests",
  statusCode: 429,
  headers: true
}));
app.use(async (req, res, next) => {
	if(req.cookies.uuid && req.cookies.token && req.originalUrl !== "/api/login" && !req.originalUrl.startsWith("/login")) {
		const check = await AccountService.checkToken(req.cookies.uuid, req.cookies.token, await AccountService.fingerprint(req));
		if(check.error) {
			const user = await AccountService.getBy("uuid", req.cookies.uuid);
			if(user) await AccountService.unregisterDevice(user, req.cookies.token);
			res.clearCookie("uuid");
			res.clearCookie("token");
		}
	}

	next();
})


await db.query(`CREATE TABLE IF NOT EXISTS users
(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
username VARCHAR(100) NOT NULL UNIQUE,
password TEXT NOT NULL,
uuid TEXT NOT NULL,
bio VARCHAR(100) NOT NULL,
avatar TEXT NOT NULL,
verified BOOLEAN NOT NULL DEFAULT FALSE,
bot BOOLEAN NOT NULL,
lang VARCHAR(2) NOT NULL DEFAULT "en",
birthday VARCHAR(40) DEFAULT "",
created DATE NOT NULL,
auth TEXT NOT NULL)`);
await db.query(`CREATE TABLE IF NOT EXISTS tokens
(id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
token TEXT NOT NULL,
uuid TEXT NOT NULL,
fingerprint TEXT NOT NULL)`)

app.get("/login", async (req, res) => {
  res.sendPage("login.html")
})

app.get("/register", async (req, res) => {
  res.sendPage("register.html")
})

app.get("/logout", async (req, res) => {
	if(req.cookies.uuid && req.cookies.token) await AccountService.unregisterDevice(await AccountService.getBy("uuid", req.cookies.uuid), req.cookies.token);
  res.clearCookie("uuid");
  res.clearCookie("token");
  res.redirect("/")
})

app.get("/user", async (req, res) => {
  if(req.cookies.uuid) {
		const user = await AccountService.getBy("uuid", req.cookies.uuid);
    res.redirect("/user/" + user.username)
  } else {
    res.redirect("/login?next=%2Fuser")
  }
});

app.get("/user/:name", async (req, res) => {
  res.sendPage("user.html", {
    name: req.params.name
  })
});

app.get("/settings", async (req, res) => {
  res.sendPage("settings.html")
})

app.use("/discord", discordRoleConnections);

app.all("/api/*", cors(), async (req, res) => {
  const path = req.params[0];
  const method = req.method;
  const body = req.body;
  const requestedRoute = path.split("/").join("/");

	res.send(await accountRequest(requestedRoute, method, body, req));
})

server.listen(8080, () => {
	// logger.log("Listening on port " + 8080);
})