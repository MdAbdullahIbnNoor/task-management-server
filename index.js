const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId  } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors()); // Enable CORS for all routes

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hiprwon.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();

        const taskCollection = client.db('todoApp').collection('tasks');

        // jwt related api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1hr",
            });
            res.send({ token });
        });

        app.post('/logout', async (req, res) => {
            const user = req.body;
            console.log('logging out', user);
            res.clearCookie('token', { maxAge: 0 }).send({ success: true });
        });

        const verifyToken = (req, res, next) => {
            const token = req?.cookies?.token;
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' });
                }
                req.user = decoded;
                next();
            });
        };

        app.get('/tasks', async (req, res) => {
            try {
                const result = await taskCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.post('/tasks', async (req, res) => {
            try {
                const taskData = req.body;
                taskData.status = 'todo';
                const result = await taskCollection.insertOne(taskData);

                res.send(result)
            } catch (error) {
                console.error('Error adding task:', error);
                res.status(500).json({ success: false, error: 'Internal Server Error' });
            }
        });

        // status update
        app.patch("/updateStatus/:id", async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { _id: new ObjectId(id) };
            const getStatus = req.body?.status;
            const updateStatus = {
                $set: {
                    status: getStatus
                }
            };
            const result = await taskCollection.updateOne(filter, updateStatus);
            res.send(result);
        });

        // Delete post 
        app.delete('/tasks/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await taskCollection.deleteOne(query);
            res.send(result);
        })


        // await client.db('admin').command({ ping: 1 });
        // console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
        // Ensure that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Todo App is running');
});

app.listen(port, () => {
    console.log(`Server is listening at ${port}`);
});
