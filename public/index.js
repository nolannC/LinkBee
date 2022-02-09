document.addEventListener("DOMContentLoaded", () => {
	// navigator.geolocation.getCurrentPosition(pos => {
	// 	document.getElementById("localisation").innerHTML = `${pos.coords.latitude},${pos.coords.longitude}`;
	// 	// document.getElementById("localisation2").innerHTML = `${pos.coords.latitude}, ${pos.coords.longitude}`;
	// });

	document.querySelector("form").addEventListener("submit", e => {
		const mail = document.getElementById("mail").value;
		if (!mail.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)) {
			alert(mail + " n'est pas une adresse valide");
		}
	});
});

function onlyNumberKey(evt) {
          
	// Only ASCII character in that range allowed
	var ASCIICode = (evt.which) ? evt.which : evt.keyCode
	if (ASCIICode > 31 && (ASCIICode < 48 || ASCIICode > 57))
		return false;
	return true;
}
