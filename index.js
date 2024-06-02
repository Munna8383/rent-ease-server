const express = require("express")
const app = express()
const cors = require("cors")
require("dotenv").config()
const port = process.env.PORT || 5000


app.use(cors({
    origin:["http://localhost:5173"],
    credentials:true
  }))
  app.use(express.json())




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.akl91ab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const userCollection = client.db("rentEaseDB").collection("user")
    const apartmentsCollection = client.db("rentEaseDB").collection("apartments")

    // save user in database

    app.post("/user",async(req,res)=>{
        const user = req.body

        // check existing user

        const query = {email:user.email}

        const existingUser = await userCollection.findOne(query)
        if(existingUser){
            return res.send({message:"user already exist"})
        }



        const result = await userCollection.insertOne(user)
        res.send(result)
    })

    // get all apartment data

    app.get("/apartments",async(req,res)=>{

      const page =parseInt(req.query.page)
      const size =parseInt(req.query.size)

        const result = await apartmentsCollection.find().skip(page*size).limit(size).toArray()
        res.send(result)
    })
   
    //count apartment for pagination

    app.get("/apartmentCount",async(req,res)=>{

        const count = await apartmentsCollection.estimatedDocumentCount()
        res.send({count})
    })











    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);











app.get("/",async(req,res)=>{
    res.send("Rent-Ease is running")
})

app.listen(port,()=>{
    console.log("Rent-Ease is running")
})