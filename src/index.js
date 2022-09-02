import express from "express";
import cors from "cors";
import joi from 'joi';
import { MongoClient } from "mongodb";
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
	
})

server.post("/participants", async (req, res) => {
	const message = await db.collection("batepapoApi");

	

	try {
		message.insertOne({
			from: req.body.name,
			to: "Todos",
			text: "entra na sala...",
			type: "status",
			time: "HH:MM:SS",
		});
		res.status().send({ menssage: "{r.insertedId}" });
	} catch (error) {
		console.error(error.message);
	}
});
server.listen(5000);
