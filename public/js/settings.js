import Dialog from "/dialog.mjs";

function $(q) {
	return document.querySelector(q)
}

function $$(q) {
	return document.querySelectorAll(q)
}

function escapeHtml(unsafe) {
	return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

const phoneDialog = new Dialog("#dialog-phone").disappear();

const profile = await fetch("/api/getUser/uuid/" + getCookie("uuid")).then(res => res.json());

$$(".avatar").forEach(e => {
	e.src = profile.data.avatar;
});
$("#account-preview-name").innerText = profile.data.username;
if(profile.data.verified) {
	$("#account-preview-name").innerHTML = $("#account-preview-name").innerText + ' <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2Zm3.22 6.97-4.47 4.47-1.97-1.97a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l5-5a.75.75 0 1 0-1.06-1.06Z" fill="#fff"/></svg>';
}
if(profile.data.bot) {
	$("#account-preview-name").innerHTML = $("#account-preview-name").innerHTML + ' <svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.753 14a2.25 2.25 0 0 1 2.25 2.25v.905a3.75 3.75 0 0 1-1.307 2.846C17.13 21.345 14.89 22 12 22c-2.89 0-5.128-.656-6.691-2a3.75 3.75 0 0 1-1.306-2.843v-.908A2.25 2.25 0 0 1 6.253 14h11.5ZM11.898 2.008 12 2a.75.75 0 0 1 .743.648l.007.102V3.5h3.5a2.25 2.25 0 0 1 2.25 2.25v4.505a2.25 2.25 0 0 1-2.25 2.25h-8.5a2.25 2.25 0 0 1-2.25-2.25V5.75A2.25 2.25 0 0 1 7.75 3.5h3.5v-.749a.75.75 0 0 1 .648-.743L12 2l-.102.007ZM9.75 6.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm4.493 0a1.25 1.25 0 1 0 0 2.499 1.25 1.25 0 0 0 0-2.499Z" fill="#fff"/></svg>';
}
$("#account-preview-bio").innerText = profile.data.bio;
$("#account-preview-bio").addEventListener("click", () => {
	$("#account-preview-bio").style.display = "none";
	$("#account-preview-bio-edit").value = $("#account-preview-bio").innerText;
	$("#account-preview-bio-edit").style.display = "";
	$("#account-preview-bio-edit").focus();
})
let submitting = false;
function bioSubmit() {
	if(submitting) return;
	submitting = true;
	$("#account-preview-bio-edit").style.display = "none";
	$("#account-preview-bio").style.display = "";
	fetch("/api/updateUser", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({uuid: getCookie("uuid"), token: getCookie("token"), key: "bio", value: $("#account-preview-bio-edit").value})
	}).then(res => res.json()).then(res => {
		console.log(res);
		$("#account-preview-bio").innerText = $("#account-preview-bio-edit").value;
		submitting = false;
	})
}
$("#account-preview-bio-edit").addEventListener("keyup", (e) => {
	console.log(e.keyCode);
	if(e.keyCode !== 13) return;
	console.log(e.keyCode);
	bioSubmit();
})
$("#account-preview-bio-edit").addEventListener("blur", (e) => {
	bioSubmit();
})
$("#account-created").valueAsDate = new Date(profile.data.created);
console.log(profile.data.birthday);

$("#account-birthday").value = profile.data.birthday;

$("#account-birthday").addEventListener("change", (e) => {
	console.log($("#account-birthday").value);
	fetch("/api/updateUser", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			uuid: getCookie("uuid"),
			token: getCookie("token"),
			key: "birthday",
			value: $("#account-birthday").value
		})
	})
})

let changingPw = false;

$("#input-password").addEventListener("keyup", function(event) {
	if (event.keyCode === 13) {
		$("#button-change-pw").click();
	}
});

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

fetch("/api/getAuthMethods", {
	method: "POST",
	headers: {
		"Content-Type": "application/json"
	},
	body: JSON.stringify({
		uuid: getCookie("uuid"),
		token: getCookie("token")
	})
}).then(res => res.json()).then(res => {
	console.log(res);
	for(const auth of res.data) {
		if(auth.type == "2fa") {
			/*
<div class="authmethod">
			<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 2A2.25 2.25 0 0 1 18 4.25v15.5A2.25 2.25 0 0 1 15.75 22h-7.5A2.25 2.25 0 0 1 6 19.75V4.25A2.25 2.25 0 0 1 8.25 2h7.5Zm-2.5 16h-2.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5Z" fill="#fff"/></svg>
			<span>Phone</span>
			<span class="device">Smartes Gerät</span>
			<button class="butn-red">Remove</button>
		</div>
			*/
			const authDiv = document.createElement("div");
			authDiv.classList.add("authmethod");
			authDiv.innerHTML = `<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 2A2.25 2.25 0 0 1 18 4.25v15.5A2.25 2.25 0 0 1 15.75 22h-7.5A2.25 2.25 0 0 1 6 19.75V4.25A2.25 2.25 0 0 1 8.25 2h7.5Zm-2.5 16h-2.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5Z" fill="#fff"/></svg>
			<span>Phone</span>
			<span class="device">${auth.device}</span>
			<button class="butn-red">Remove</button>
			`;
			$("#authmethod-pw").parentNode.insertBefore(authDiv, $("#authmethod-pw").nextSibling);
			authDiv.querySelector("button").addEventListener("click", () => {
				fetch("/api/2fa/disable", {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						uuid: getCookie("uuid"),
						token: getCookie("token"),
						device: auth.device
					})
				}).then(res => res.json()).then(res => {
					if(!res.status.success) return;
					location.reload();
				})
			})
		}
	}
});

$("#button-change-pw").addEventListener("click", async () => {
	if(!changingPw) {
		$("#label-password").innerText = "New Password: ";
		$("#input-password").style.display = "";
		$("#input-password").focus();
		changingPw = true;
	} else {
		if($("#input-password").classList.contains("error")) {
			$("#input-password").classList.remove("error");
		}
		$("#input-password").disabled = true;
		$("#button-change-pw").disabled = true;
		$("#spinner-pw").style.display = "";

		const result = await fetch("/api/updatePassword", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				uuid: getCookie("uuid"),
				token: getCookie("token"),
				password: $("#input-password").value
			})
		}).then(res => res.json());

		$("#spinner-pw").style.display = "none";
		$("#input-password").disabled = false;
		$("#button-change-pw").disabled = false;
		if(!result.status.success) {
			console.error(result.status.message);
			$("#input-password").classList.add("error");
			return;
		}

		$("#label-password").innerText = "Password";
		$("#input-password").style.display = "none";
		$("#input-password").value = "";
		changingPw = false;
	}
})

$("#add-phone").addEventListener("click", () => {
	fetch("/api/2fa/enable", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			uuid: getCookie("uuid"),
			token: getCookie("token")
		})
	}).then(res => res.json()).then(res => {
		console.log(res);
		$("#dialog-phone-qr").src = res.data.code;
		phoneDialog.show();
		$("#dialog-phone-code").focus();
	});
})

$("#dialog-phone-ok").addEventListener("click", () => {
	fetch("/api/2fa/confirm", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			uuid: getCookie("uuid"),
			token: getCookie("token"),
			code: $("#dialog-phone-code").value,
			device: $("#dialog-phone-device").value
		})
	}).then(res => res.json()).then(res => {
		console.log(res);
		if(res.status.success) {
			phoneDialog.hide();
			location.reload();
		} else {
			$("#dialog-phone-code").classList.add("error");
		}
	});
})

$("#button-logout").addEventListener("click", () => {
	fetch("/api/logout", {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			uuid: getCookie("uuid"),
			token: getCookie("token")
		})
	}).then(res => res.json()).then(async res => {
		location.reload();
	})
});

fetch("/api/devices/getRegistered", {
	method: "POST",
	headers: {
		"Content-Type": "application/json"
	},
	body: JSON.stringify({uuid: getCookie("uuid"), token: getCookie("token")})
}).then(res => res.json()).then(res => {
	/*
	<div class="authmethod">
					<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.75 22a.75.75 0 0 1-.102-1.493l.102-.007h1.749v-2.498H4.25a2.25 2.25 0 0 1-2.245-2.096L2 15.752V5.25a2.25 2.25 0 0 1 2.096-2.245L4.25 3h15.499a2.25 2.25 0 0 1 2.245 2.096l.005.154v10.502a2.25 2.25 0 0 1-2.096 2.245l-.154.005h-4.25V20.5h1.751a.75.75 0 0 1 .102 1.494L17.25 22H6.75Zm7.248-3.998h-4l.001 2.498h4l-.001-2.498ZM19.748 4.5H4.25a.75.75 0 0 0-.743.648L3.5 5.25v10.502c0 .38.282.694.648.743l.102.007h15.499a.75.75 0 0 0 .743-.648l.007-.102V5.25a.75.75 0 0 0-.648-.743l-.102-.007Z" fill="#fff"/></svg>
					<span>Ubuntu Desktop on Chrome</span>
          <button class="butn-red" id="button-logout">Log out</button>
        </div>
				*/
	if(!res.status.success) return;
	
	for(const d of res.data) {
		const div = document.createElement("div");
		div.classList.add("authmethod");
		if(d.fingerprint.ua.includes("Mobile")) div.innerHTML = '					<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.75 2A2.25 2.25 0 0 1 18 4.25v15.5A2.25 2.25 0 0 1 15.75 22h-7.5A2.25 2.25 0 0 1 6 19.75V4.25A2.25 2.25 0 0 1 8.25 2h7.5Zm0 1.5h-7.5a.75.75 0 0 0-.75.75v15.5c0 .414.336.75.75.75h7.5a.75.75 0 0 0 .75-.75V4.25a.75.75 0 0 0-.75-.75Zm-2.501 14a.75.75 0 0 1 .002 1.5l-2.5.004a.75.75 0 0 1-.002-1.5l2.5-.004Z" fill="#fff"/></svg>';
		else div.innerHTML = '<svg width="24" height="24" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6.75 22a.75.75 0 0 1-.102-1.493l.102-.007h1.749v-2.498H4.25a2.25 2.25 0 0 1-2.245-2.096L2 15.752V5.25a2.25 2.25 0 0 1 2.096-2.245L4.25 3h15.499a2.25 2.25 0 0 1 2.245 2.096l.005.154v10.502a2.25 2.25 0 0 1-2.096 2.245l-.154.005h-4.25V20.5h1.751a.75.75 0 0 1 .102 1.494L17.25 22H6.75Zm7.248-3.998h-4l.001 2.498h4l-.001-2.498ZM19.748 4.5H4.25a.75.75 0 0 0-.743.648L3.5 5.25v10.502c0 .38.282.694.648.743l.102.007h15.499a.75.75 0 0 0 .743-.648l.007-.102V5.25a.75.75 0 0 0-.648-.743l-.102-.007Z" fill="#fff"/></svg>';
		const span = document.createElement("span");
		span.innerText =  d.fingerprint.ua.split(" ")[d.fingerprint.ua.split(" ").length - 1].replace("/", " ").split(".")[0] + " on " + (d.fingerprint.ua.includes("Mobile") ? d.fingerprint.ua.split("(")[1].split(")")[0].split(";")[0] : d.fingerprint.ua.split("(")[1].split(")")[0].split(";")[1])
		div.appendChild(span);
		const btn = document.createElement("button");
		btn.classList.add("butn-red");
		btn.innerText = "Log out";
		btn.addEventListener("click", async () => {
			await fetch("/api/devices/unregister", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({uuid: getCookie("uuid"), token: getCookie("token"), devicetoken: d.token})
			});
			location.reload();
		})
		div.appendChild(btn);
		$("#devices").appendChild(div);
	}
})