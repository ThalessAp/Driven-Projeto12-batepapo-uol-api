import express from "express";
import cors from "cors";
import joi from "joi";
import { MongoClient } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

const server = express();

server.use(cors());
server.use(express.json());

const mongodb = new MongoClient(process.env.MONGO_URI);
let db;

mongodb.connect().then(() => {
	db = mongodb.db("batepapoApi");
});

const userSchema = joi.object({
	name: joi.string().required(),
});
const MsgSchema = joi.object({
	to: joi.string().required(),
	text: joi.string().required(),
	type: joi.string().required(),
});

server.post("/participants", async (req, res) => {
	const message = await db.collection("batepapoApi");
	const user = await db.collection("usersBatePapo");

	const validation = userSchema.validate(req.body.name);
	const validateName = await db.usersBatePapo.findOne({
		name: req.body.name,
	});

	if (validation.error) {
		console.log(validation.error.details);
		res.sendStatus(422);
		return;
	}

	if (validateName) {
		console.error("Usuario ja existe");
		res.sendStatus(409);
		return;
	}

	try {
		user.insertOne({
			name: req.body.name,
			lastStatus: dayjs.now().format("HH : MM : SS"),
		});
		message.insertOne({
			from: req.body.name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs.now().format("HH : MM : SS"),
		});
		res.sendStatus(201);
	} catch (error) {
		console.error(error.message);
	}
});

server.get("/participants", async (req, res) => {
	const users = await db.collection("usersBatePapo");

	try {
		const list = await users.find();

		res.send(list);
	} catch (error) {
		console.error(error.message);
		res.sendStatus(500);
	}
});

server.post("/messages", async (req, res) => {
	const user = await db.collection("usersBatePapo");
	const messages = await db.collection("batepapoApi");

	const message = {
		from: req.header.User,
		to: req.body.to,
		text: req.body.text,
		type: req.body.type,
		time: dayjs.now().format("HH : MM : SS"),
	};
	const validation = MsgSchema.validate(message);

	if (validation.error) {
		console.log(validation.error.details);
		res.sendStatus(422);
		return;
	}

	try {
		messages.insertOne(message);

		res.sendStatus(201);
	} catch (error) {
		console.error(error.message);
		res.sendStatus(500);
	}
});

server.get("/messages/:limit", async (req, res) => {
	const messages = await db.collection("batepapoApi");
	const limit = parseInt(req.params.limit);

	const user = req.header.User;

	try {
		const message = await messages.find({
			name: user,
			to: { $in: [user, "Todos"] },
		});
		if (!limit) {
			res.send(message);
		}
		res.send(message.slice(-limit));
	} catch (error) {
		console.error(error.message);
	}
});
server.post("/status", async (req, res) => {
	const Users = await db.collection("usersBatePapo");

	const user = req.header.User;

	if (!Users.find({ name: user })) {
		res.sendStatus(404);
	}
	try {
		Users.findOneAndUpdate(
			{ name: user },
			{ name: user, lastStatus: dayjs.now().format("HH : MM : SS") }
		);
		res.sendStatus(200);
	} catch (error) {
		console.error(error.message);
	}
});

setInterval(async () => {
	const Users = await db.collection("usersBatePapo");
	const Menssages = await db.collection("batepapoApi");

	Users.remove({ lastStatus: {.diff('now', 's'), $gt: 15 } });
});

server.listen(5000);
