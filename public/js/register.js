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
	window.location.href = "/";
}

$("#register").addEventListener("submit", async (e) => {
	e.preventDefault();
	if($("#password").value !== $("#password2").value) {
		$("#password2").classList.add("error");
		$("#password2").focus();
		await sleep(3000);
		$("#password2").classList.remove("error");
		return;
	}
	const result = await fetch("/api/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			username: $("#username").value,
			password: $("#password").value,
			bot: false
		})
	}).then(res => res.json());
	if(!result.status.success) {
		switch(result.status.message) {
			case "Username taken":
				$("#username").classList.add("error");
				$("#username").focus();
				await sleep(3000);
				$("#username").classList.remove("error");
				break;
			case "Username invalid":
				$("#username").classList.add("error");
				$("#username").focus();
				await sleep(3000);
				$("#username").classList.remove("error");
				break;
			case "Password invalid":
				$("#password").classList.add("error");
				$("#password").focus();
				await sleep(3000);
				$("#password").classList.remove("error");
				break;
		}
		return;
	}
	const login = await fetch("/api/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			username: $("#username").value,
			password: $("#password").value,
		})
	}).then(res => res.json());
	if(!login.status.success) {
		console.log("Wait what");
		location.href = "/login";
		return;
	}
	setCookie("uuid", login.data.uuid, 10);
	setCookie("token", login.data.token, 10);
	location.href = "/";
});