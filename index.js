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

app.patch("/admin/users/:userId", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;
        const { status, role } = req.body;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (role) updateData.role = role;
        updateData.updatedAt = new Date();

        const result = await db
            .collection("users")
            .updateOne({ _id: new ObjectId(userId) }, { $set: updateData });

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("PATCH /admin/users/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.delete("/admin/users/:userId", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const result = await db
            .collection("users")
            .deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("DELETE /admin/users/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/admin/requests", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { status, bloodType, urgency } = req.query;

        let query = {};
        if (status) query.status = status;
        if (bloodType) query.bloodType = bloodType;
        if (urgency) query.urgency = urgency;

        const result = await db
            .collection("bloodRequests")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        res.send(result);
    } catch (error) {
        console.error("GET /admin/requests error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/admin/requests/:requestId", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { requestId } = req.params;
        const { status } = req.body;

        if (!ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        const result = await db
            .collection("bloodRequests")
            .updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { status, updatedAt: new Date() } }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("PATCH /admin/requests/:requestId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/admin/profile/:userId", logger, verifyToken, verifyRole("admin"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db
            .collection("users")
            .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("GET /admin/profile/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/donor/requests", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const requestData = req.body;

        const newRequest = {
            ...requestData,
            donorId: req.user.sub,
            donorEmail: req.user.email,
            donorName: req.user.name,
            status: "Pending",
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("bloodRequests").insertOne(newRequest);
        res.send(result);
    } catch (error) {
        console.error("POST /donor/requests error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/donor/my-requests/:userId", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db
            .collection("bloodRequests")
            .find({ donorId: userId })
            .sort({ createdAt: -1 })
            .toArray();

        res.send(result);
    } catch (error) {
        console.error("GET /donor/my-requests/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/donor/requests/:requestId", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const { requestId } = req.params;
        const { _id, donorId, donorEmail, createdAt, status, ...updateData } = req.body;

        if (!ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        const request = await db
            .collection("bloodRequests")
            .findOne({ _id: new ObjectId(requestId) });

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.donorId !== req.user.sub) {
            return res.status(403).json({ message: "You can only update your own requests" });
        }

        const result = await db
            .collection("bloodRequests")
            .updateOne(
                { _id: new ObjectId(requestId) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

        res.send(result);
    } catch (error) {
        console.error("PATCH /donor/requests/:requestId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.delete("/donor/requests/:requestId", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const { requestId } = req.params;

        if (!ObjectId.isValid(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        const request = await db
            .collection("bloodRequests")
            .findOne({ _id: new ObjectId(requestId) });

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.donorId !== req.user.sub) {
            return res.status(403).json({ message: "You can only delete your own requests" });
        }

        const result = await db
            .collection("bloodRequests")
            .deleteOne({ _id: new ObjectId(requestId) });

        res.send(result);
    } catch (error) {
        console.error("DELETE /donor/requests/:requestId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});


app.get("/donor/profile/:userId", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db
            .collection("users")
            .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("GET /donor/profile/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/donor/profile/:userId", logger, verifyToken, verifyRole("donor"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;
        const { _id, role, email, password, createdAt, ...updateData } = req.body;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const result = await db
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("PATCH /donor/profile/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/volunteer/requests", logger, verifyToken, verifyRole("volunteer"), async (req, res) => {
    try {
        const db = await getDB();
        const { bloodType, urgency, location } = req.query;

        let query = { status: { $ne: "Cancelled" } };
        if (bloodType) query.bloodType = bloodType;
        if (urgency) query.urgency = urgency;
        if (location) query.location = { $regex: location, $options: "i" };

        const result = await db
            .collection("bloodRequests")
            .find(query)
            .sort({ urgency: -1, createdAt: -1 })
            .toArray();

        res.send(result);
    } catch (error) {
        console.error("GET /volunteer/requests error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.get("/volunteer/profile/:userId", logger, verifyToken, verifyRole("volunteer"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const result = await db
            .collection("users")
            .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

        if (!result) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("GET /volunteer/profile/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

app.patch("/volunteer/profile/:userId", logger, verifyToken, verifyRole("volunteer"), async (req, res) => {
    try {
        const db = await getDB();
        const { userId } = req.params;
        const { _id, role, email, password, createdAt, ...updateData } = req.body;

        if (userId !== req.user.sub) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const result = await db
            .collection("users")
            .updateOne(
                { _id: new ObjectId(userId) },
                { $set: { ...updateData, updatedAt: new Date() } }
            );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.send(result);
    } catch (error) {
        console.error("PATCH /volunteer/profile/:userId error:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});
