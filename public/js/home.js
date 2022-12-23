function findGetParameter(parameterName) {
	let result = null,
	tmp = [];
	location.search
		.substr(1)
		.split('&')
		.forEach((item) => {
			tmp = item.split('=');
			if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
		});
	return result;
}

document.getElementById("profile").src = "/avatars/nouser.svg";
if(hasCookie("uuid")) {
	const user = await fetch("/api/getUser/uuid/" + getCookie("uuid")).then(res => res.json());
	if(!user.status.success) {
		window.location.href = "/logout";
	} else {
		document.getElementById("profile").src = user.data.avatar;
		const tokenCheck = await fetch("/api/checkToken", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				uuid: getCookie("uuid"),
				token: getCookie("token")
			})
		}).then(res => res.json());
		if(!tokenCheck.status.success) window.location.href = "/logout";
	}
}