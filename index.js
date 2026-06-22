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

app.get("/", (req, res) => {
    res.send("LifeFlow API is running!");
});

app.get("/admin/users", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { search, role } = req.query;

        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }
        if (role) query.role = role;

        const result = await db
            .collection("users")
            .find(query)
            .project({ password: 0 })
            .toArray();

        res.send(result);
    } catch (error) {
        console.error("GET /admin/users error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/admin/users/:userId", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const result = await db
            .collection("users")
            .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("GET /admin/users/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});
