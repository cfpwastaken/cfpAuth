import AccountService from "./accountservice.js";
import { params } from "./apputils.js";
import { SuccessfulAPIResponse, SuccessfulAPIResponseWithoutData, FailedAPIResponse } from "./APIResponse.js";

export async function accountRequest(requestedRoute, method, body, req) {
	// logger.debug("API request: " + method + " " + requestedRoute + " (" + JSON.stringify(body) + ")");
	if(requestedRoute == "register") {
		if(method == "POST") {
			// logger.debug("Register API request", body);
			
			if(!params(body, ["username", "password", "bot"])) {
				return new FailedAPIResponse("Invalid parameters").toString();
			}
			const { username, password, bot } = body;
			const result = await AccountService.register(username, password, bot);
			if(result == "SUCCESS") {
				return new SuccessfulAPIResponseWithoutData().toString();
			} else {
				return new FailedAPIResponse(result == "USERNAME_TAKEN" ? "Username taken" : "USERNAME_INVALID" ? "Username invalid" : result == "PASSWORD_INVALID" ? "Password invalid" : "Unknown Error").toString();
			}
		} else {
			return new FailedAPIResponse("Invalid method").toString();
		}
	} else if(requestedRoute == "login") {
		if(!params(body, ["username", "password"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("username", body.username);
		if(user == undefined) {
			return new FailedAPIResponse("Invalid username").toString();
		}
		const result = await user.checkPassword(body.password, body.code);
		if(result === "NO_BOT_LOGIN") {
			return new FailedAPIResponse("Bot login is not allowed").toString();
		} else if(result === "SECOND_FACTOR_REQUIRED") {
			return new FailedAPIResponse("2FA required").toString();
		} else if(result === "WRONG_2FA_CODE") {
			return new FailedAPIResponse("Invalid 2FA code").toString();
		} else if(result === "INVALID_CREDENTIALS") {
			return new FailedAPIResponse("Invalid credentials").toString();
		} else if(result === "SUCCESS") {
			const token = await AccountService.registerDevice(user, await AccountService.fingerprint(req));
			return new SuccessfulAPIResponse({
				id: user.id,
				username: user.username,
				uuid: user.uuid,
				token
			}).toString()
		} else {
			return new FailedAPIResponse("Unknown error").toString();
		}
	} else if(requestedRoute.startsWith("getUser")) {
		// getUser/BY/VALUE
		const [, key] = requestedRoute.split("/", 3);
		let value = requestedRoute.split("/");
		value.shift();
		value.shift();
		value = value.join("/");
		const ALLOWED_KEYS = ["username", "uuid"];

		if(!ALLOWED_KEYS.includes(key)) {
			return new FailedAPIResponse("Invalid key").toString();
		}

		// logger.debug("getUser API request", "Key: " + key, "Value: " + value);

		const user = await AccountService.getBy(key, value);
		if(user == null) {
			return new FailedAPIResponse("User not found").toString();
		}

		delete user.password; // Don't leak passwords
		delete user.auth; // Don't leak auth
		delete user.twofa; // Don't leak 2FA
		delete user[key]; // No need to return this

		return new SuccessfulAPIResponse(user).toString();
	} else if(requestedRoute == "updatePassword") {
		if(!params(body, ["uuid", "token", "password"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		const hashedpw = await hash(body.password, 10);
		await user.update("password", hashedpw);
		return new SuccessfulAPIResponseWithoutData().toString();
	} else if(requestedRoute.startsWith("2fa")) {
		// 2fa/enable
		// 2fa/confirm
		// 2fa/disable
		if(!params(body, ["uuid", "token"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const [, action] = requestedRoute.split("/", 3);
		if(action == "enable") {
			const user = await AccountService.getBy("uuid", body.uuid);
			if(user == null) {
				return new FailedAPIResponse("Invalid uuid").toString();
			}
			const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
			if(tokenCheck.error) {
				return new FailedAPIResponse(tokenCheck.error).toString();
			}
			const data = await user.enable2FA();
			
			if(data == false) return new FailedAPIResponse("Another Phone is already enabling").toString();
			return new SuccessfulAPIResponse(data).toString();
		} else if(action == "confirm") {
			const user = await AccountService.getBy("uuid", body.uuid);
			if(user == null) {
				return new FailedAPIResponse("Invalid uuid").toString();
			}
			const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
			if(tokenCheck.error) {
				return new FailedAPIResponse(tokenCheck.error).toString();
			}
			const data = await user.confirmEnable2FA(body.code, body.device);
			if(data == false) return new FailedAPIResponse("Invalid code").toString();
			return new SuccessfulAPIResponseWithoutData().toString();
		} else if(action == "disable") {
			const user = await AccountService.getBy("uuid", body.uuid);
			if(user == null) {
				return new FailedAPIResponse("Invalid uuid").toString();
			}
			const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
			if(tokenCheck.error) {
				return new FailedAPIResponse(tokenCheck.error).toString();
			}
			await user.disable2FA(body.device);
			return new SuccessfulAPIResponseWithoutData().toString();
		}
	} else if(requestedRoute == "getAuthMethods") {
		if(!params(body, ["uuid", "token"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		return new SuccessfulAPIResponse(user.auth).toString();
	} else if(requestedRoute == "checkToken") {
		if(!params(body, ["uuid", "token"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token, await AccountService.fingerprint(req));
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		return new SuccessfulAPIResponseWithoutData().toString();
	} else if(requestedRoute == "logout") {
		if(!params(body, ["uuid", "token"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		const newToken = await AccountService.logoutAll(body.uuid, await AccountService.fingerprint(req));
		if(newToken.error) return new FailedAPIResponse(newToken.error).toString();
		return new SuccessfulAPIResponse({token: newToken.token}).toString();
	} else if(requestedRoute === "updateUser") {
		if(!params(body, ["uuid", "token", "key", "value"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		const ALLOWED_KEYS = ["bio", "birthday"];
		if(!ALLOWED_KEYS.includes(body.key)) {
			return new FailedAPIResponse("Invalid key").toString();
		}
		await user.update(body.key, body.value);
		return new SuccessfulAPIResponseWithoutData().toString();
	} else if(requestedRoute === "devices/getRegistered") {
		if(!params(body, ["uuid", "token"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		// logger.debug(await AccountService.getRegisteredDevices(user))
		return new SuccessfulAPIResponse(await AccountService.getRegisteredDevices(user)).toString();
	} else if(requestedRoute === "devices/unregister") {
		if(!params(body, ["uuid", "token", "devicetoken"])) {
			return new FailedAPIResponse("Invalid parameters").toString();
		}
		const user = await AccountService.getBy("uuid", body.uuid);
		if(user == null) {
			return new FailedAPIResponse("Invalid uuid").toString();
		}
		const tokenCheck = await AccountService.checkToken(body.uuid, body.token);
		if(tokenCheck.error) {
			return new FailedAPIResponse(tokenCheck.error).toString();
		}
		await AccountService.unregisterDevice(user, body.devicetoken);
		return new SuccessfulAPIResponseWithoutData().toString();
	}
}