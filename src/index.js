import express from "express";
import cors from "cors";
import joi from "joi";
import { MongoClient, ObjectId } from "mongodb";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

const server = express();

server.use(cors());
server.use(express.json());

const mongodb = new MongoClient(process.env.MONGO_URI);
let db;

mongodb.connect().then(() => {
	db = mongodb.db(process.env.DATABASE_URI);
});

const userSchema = joi.object({
	name: joi.string().required(),
});
const MsgSchema = joi.object({
	to: joi.string().required(),
	text: joi.string().required(),
	type: joi.string().valid("message", "private_message").required(),
});

server.post("/participants", async (req, res) => {
	const message = await db.collection("menssagesBatePapo");
	const user = await db.collection("usersBatePapo");
	const { name } = req.body;

	const validation = userSchema.validate(req.body, { abortEarly: false });
	const validateName = await user.findOne({
		name: name,
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
			name: name,
			lastStatus: dayjs().format("HH:mm:ss"),
		});
		message.insertOne({
			from: req.body.name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: dayjs().format("HH:mm:ss"),
		});
		res.sendStatus(201);
	} catch (error) {
		console.error(error.message);
	}
});

server.get("/participants", async (req, res) => {
	const users = await db.collection("usersBatePapo");
	const user = req.headers.User;

	try {
		const list = await users.find().toArray();

		res.send(list);
	} catch (error) {
		console.error(error.message);
		res.sendStatus(500);
	}
});

server.post("/messages", async (req, res) => {
	//	const {to, text, type}= req.body;
	const user = await db.collection("usersBatePapo");
	const messages = await db.collection("menssagesBatePapo");

	const message = {
		from: req.headers.user,
		to: req.body.to,
		text: req.body.text,
		type: req.body.type,
		time: dayjs().format("HH:mm:ss"),
	};
	const validation = MsgSchema.validate(req.body, { abortEarly: false });
	console.log(message);
	if (validation.error) {
		console.log(validation.error.details);
		res.sendStatus(422);
		return;
	}

	try {
		messages.insertOne(message);
		//user.insertOne({name: req.headers.User, lastStatus: Date.now()});

		res.sendStatus(201);
	} catch (error) {
		console.error(error.message);
		res.sendStatus(500);
	}
});

server.get("/messages", async (req, res) => {
	const messages = await db.collection("menssagesBatePapo");
	const limit = parseInt(req.params.limit);

	const user = req.headers.User;

	try {
		// const filterList = list.filter((menssage) => {
		// 	if (
		// 		menssage.type === "message" ||
		// 		menssage.type === "status" ||
		// 		(menssage.type === "private_message" &&
		// 			(menssage.from === user || menssage.to === user))
		// 	) {
		// 		return menssage;
		// 	}
		// });
		const message = await messages
			.find({
				name: user,
				to: { $in: [user, "Todos"] },
			})
			.toArray();
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

	const user = req.headers.user;

	if (!Users.find({ name: user })) {
		res.sendStatus(404);
	}
	try {
		Users.updateOne({ _id: user }, { $set: { lastStatus: Date.now() } });
		res.sendStatus(200);
	} catch (error) {
		console.error(error.message);
	}
});

setInterval(async () => {
	const Users = await db.collection("usersBatePapo");
	const Menssages = await db.collection("menssagesBatePapo");

	const time = Date.now();
	const users = await Users.find({}).toArray();

	try {
		users.map((user) => {
			if (time - user.lastStatus > 10) {
				Users.remove({ _id: user });
			}
		});
		Menssages.insertOne({
			from: "Server",
			to: "Todos",
			text: "sai da sala...",
			type: "status",
			time: dayjs().format("HH : MM : SS"),
		});
	} catch (error) {
		console.error(error.message);
	}
}, 15000);

server.listen(5000);
