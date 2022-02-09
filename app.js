require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const axios = require("axios");
const cookieParser = require("cookie-parser");

const app = express();
const upload = multer();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

mongoose.connect(process.env.URI, { useNewUrlParser: true, useUnifiedTopology: true });

const User = mongoose.model(
	"User",
	new mongoose.Schema({
		fName: String,
		lName: String,
		description: String,
		email: String,
		password: String,
		localisation: String,
		postalCode: Number,
		data: String,
		filters: [String]
	})
);

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
	if (req.cookies.sessionID) {
		return res.render("index", { hasCookie: true });
	} else {
		return res.render("index", { hasCookie: false });
	}
});

app.get("/signup", (req, res) => {
	res.sendFile("/signup.html", { root: path.join(__dirname, "public") });
});

app.get("/signin", (req, res) => {
	res.sendFile("/signin.html", { root: path.join(__dirname, "public") });
});

app.post("/filter", upload.single("profil_image"), async (req, res) => {
	if (req.get("referer") === "http://localhost:5050/signin" || req.get("referer") === "http://localhost:5050/signin") {
		try {
			const user = await User.findOne({ email: req.body.email });
			if (user) {
				if (await bcrypt.compare(req.body.password, user.password)) {
					const cookie = req.cookies.sessionID;
					if (cookie === undefined) {
						// set a new cookie
						const id = user._id.toString();
						return res.cookie("sessionID", id, { maxAge: 1000 * 60 * 60 * 24 * 3, httpOnly: true }).redirect("http://localhost:5050/search");
					}
				} else {
					return res.status(500).send("Wrong password");
				}
			} else {
				return res.status(500).send("Unable to find user");
			}
		} catch (err) {
			return res.status(500).send(err.message);
		}
	} else {
		let password = "";
		let localisation = "";
		let data = "";
		try {
			const users = await User.find({ email: req.body.email });
			if (users.length > 0) {
				return res.status(500).send("Cet email existe déjà");
			}
			password = await bcrypt.hash(req.body.password, 10);
			console.log(password);

			if (req.body.localisation !== "") {
				const { data } = await axios(`https://vicopo.selfbuild.fr/cherche/${req.body.postalCode}`);
				console.log(data.cities[0].city);
				localisation = data.cities[0].city;
			}
			data = req.file !== undefined ? req.file.buffer.toString("base64") : "";
			const user = new User({
				fName: req.body.fName,
				lName: req.body.lName,
				description: req.body.description,
				email: req.body.email,
				password: password,
				localisation: localisation,
				postalCode: req.body.postalCode,
				data: data
			});
			user.save((err, data) => {
				if (err) console.log(err.message);
				console.log("Done");
			});
			// get cookies
			const cookie = req.cookies.sessionID;
			if (cookie === undefined) {
				// set a new cookie
				// console.log(user._id.toString());
				const id = user._id.toString();
				res.cookie("sessionID", id, { maxAge: 1000 * 60 * 60 * 24 * 3, httpOnly: true });
				console.log("cookie created successfully");
			}
			console.log(user);
		} catch (e) {
			console.log(e.message);
			return res.status(500).send(e.message);
		}
		// res.send(`<img src="${newItem.data}"></img>`);
		// res.status(200).send({ status: "sended" });
		// req.file !== undefined ? fs.unlinkSync(req.file.path) : "";
		return res.status(200).render("filter", {
			user: {
				fName: req.body.fName,
				lName: req.body.lName,
				description: req.body.description,
				email: req.body.email,
				password: password,
				localisation: localisation,
				postalCode: req.body.postalCode,
				data: data
			}
		});
	}
});

app.post("/submitFilter", upload.single("profil_image"), async (req, res) => {
	try {
		console.log(req.cookies["sessionID"].toString());
		User.findOne({ _id: mongoose.Types.ObjectId(req.cookies["sessionID"].toString()) }, async (err, user) => {
			if (err) return res.status(500).send(err.message);
			if (req.get("referer") === "http://localhost:5050/profil" || req.get("referer") === "http://localhost:5050/profil") {
				// user.fName = "";
				// user.lName = "";
				// user.description = "";
				user.localisation = "";
				user.postalCode = "";
				user.filters = [];

				let localisation = "";
				if (req.body.localisation !== "") {
					// console.log();
					const { data } = await axios(`https://vicopo.selfbuild.fr/cherche/${req.body.postalCode}`);
					console.log(data.cities[0].city);
					localisation = data.cities[0].city;
				}
				// user.fName = req.body.fName;
				// user.lName = req.body.lName;
				// user.description = req.body.description;
				user.localisation = localisation;
				user.postalCode = req.body.postalCode;
				console.log(req.file);
				if (req.file !== undefined) user.data = req.file.buffer.toString("base64");
				const filters = Object.keys(req.body);
				filters[0] = req.body.nbColonies.toString();
				user.filters = filters;
				user.save((err, data) => {
					if (err) console.log(err.message);
					console.log("Done");
				});
				return res.redirect("http://localhost:5050/profil");
			} else {
				const filters = Object.keys(req.body);
				filters[0] = req.body.nbColonies.toString();
				user.filters = filters;
				user.save((err, data) => {
					if (err) console.log(err.message);
					console.log("Done");
				});
				return res.redirect("http://localhost:5050/go");
			}
		});
	} catch (err) {
		if (err) return res.status(500).send(err.message);
	}
});

app.get("/go", (req, res) => {
	return res.sendFile("/go.html", { root: path.join(__dirname, "public") });
});

app.get("/search", (req, res) => {
	res.render("search");
});

app.post("/result", async (req, res) => {
	const filters = Object.keys(req.body);
	const filtersMain = {};
	if (filters.find(filter => filter === "postalCode")) {
		filters.splice(filters.indexOf("postalCode"), 1);
		filtersMain["postalCode"] = req.body.postalCode;
	}

	if (filters.find(filter => filter === "nbColonies")) {
		filters.splice(filters.indexOf("nbColonies"), 1);
		filtersMain["nbColonies"] = req.body.nbColonies;
	}
	// console.log(filters);
	const results = [];
	const users = await User.find({ filters: { $all: filters } });
	// console.log(users);
	users.forEach(user => {
		if (req.body.nbColonies) {
			const values = filtersMain.nbColonies.split("-");
			if (parseInt(values[0]) < user.filters[0] && user.filters[0] < parseInt(values[1])) {
				results.push(user);
			}
		}
		if (req.body.postalCode) {
			if (parseInt(filtersMain.postalCode) === parseInt(user.postalCode)) {
				results.push(user);
			}
		}
		results.push(user);
		// if (req.body.city) {
		// 	if (filtersMain.city === user.city) {
		// 		results.push(user);
		// 	}
		// }
	});
	return res.render("result", { users: results });
});

app.get("/profil", async (req, res) => {
	if (req.cookies.sessionID) {
		//TODO: do not send all user informations
		User.findOne({ _id: mongoose.Types.ObjectId(req.cookies["sessionID"].toString()) }, (err, user) => {
			if (err) return res.status(500).send(err.message);
			return res.status(200).render("profil", { user });
		});
	} else {
		return res.redirect("http://localhost:5050/signin");
	}
});

app.get("/x", async (req, res) => {
	try {
		const user = await User.findOne({ _id: req.query.id });
		res.render("x", { user });
	} catch (err) {
		console.log(err.message);
	}
});

app.post("/x/messages", async (req, res) => {
	console.log(req.body.content);
	res.send(req.body.content);
});

app.get("/disconnect", (req, res) => {
	if (req.cookies.sessionID) {
		res.clearCookie("sessionID").redirect("http://localhost:5050/signin");
	} else {
		res.redirect("http://localhost:5050/signin");
	}
});

io.on("connection", socket => {
	console.log(`Connecté au client ${socket.id}`);

	io.on("message", data => {
		io.emit("messageSend", data);
	});
});

server.listen(5050, () => {
	console.log("Ready");
});
