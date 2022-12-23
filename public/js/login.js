import { hasCookie, setCookie } from "../cookies.mjs";

function $(q) {
	return document.querySelector(q)
}

function findGetParameter(parameterName) {
	var result = null,
	tmp = [];
	location.search
		.substr(1)
		.split('&')
		.forEach(function (item) {
			tmp = item.split('=');
			if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
		});
	return result;
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

if(hasCookie("uuid")) {
	if(findGetParameter("next")) {
		window.location.href = decodeURIComponent(findGetParameter("next"));
	} else {
		window.location.href = "/";
	}
}

$("#code").value = "";
$("#username").value = "";
$("#password").value = "";
$("#login").addEventListener("submit", async (e) => {
	e.preventDefault();
	const username = $("#username").value;
	const password = $("#password").value;
	const code = $("#code").value;
	
	const result = await fetch("/api/login", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({username, password, code}) }).then(res => res.json());
	if(!result.status.success) {
		if(result.status.message == "2FA required") {
			if($("#code").style.display == "") {
				$("#code").classList.add("shake");
				await sleep(820);
				$("#code").classList.remove("shake");
				$("#code").value = "";
				return;
			}
			$("#username").style.display = "none";
			$("#password").style.display = "none";
			$("#code").style.display = "";
		} else {
			console.log(result.status.message);
			if(result.status.message === "Invalid username") {
				$("#username").value = "";
				$("#password").value = "";
				$("#username").focus();
			} else {
				$("#password").value = "";
				$("#password").focus();
			}
		}
		return;
	}
	setCookie("uuid", result.data.uuid, 10);
	setCookie("token", result.data.token, 10);
	console.log(result);
	if(findGetParameter("next")) {
		console.log(decodeURIComponent(findGetParameter("next")));
		window.location.href = decodeURIComponent(findGetParameter("next"));
	} else {
		window.location.href = "/";
	}
})
$("#username").focus();