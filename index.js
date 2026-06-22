const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const dotenv = require("dotenv");
const { createRemoteJWKSet, jwtVerify } = require("jose");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

app.use(
    cors({
        origin: [
            "https://lifeflow-client.vercel.app",
            "http://localhost:3000",
        ],
        credentials: true,
    })
);
app.use(express.json());

let cachedClient = null;

async function getDB() {
    if (cachedClient) {
        return cachedClient.db("lifeflow");
    }

    const client = new MongoClient(uri, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    await client.connect();
    cachedClient = client;
    console.log("Connected to MongoDB!");
    return client.db("lifeflow");
}

const logger = (req, res, next) => {
    console.log(`${req.method} | ${req.url}`);
    next();
};

const verifyToken = async (req, res, next) => {
    const { authorization } = req.headers;
    const token = authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    try {
        const JWKS = createRemoteJWKSet(
            new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
        );
        const { payload } = await jwtVerify(token, JWKS);
        req.user = payload;
        next();
    } catch (error) {
        console.error("Token validation failed:", error.message);
        return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
};

const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
        }
        next();
    };
};

