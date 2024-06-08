const express = require("express")
const app = express()
const cors = require("cors")
require("dotenv").config()
const jwt = require("jsonwebtoken")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000




app.use(cors({
    origin:["http://localhost:5173","https://rent-ease-2de9a.web.app","https://rentease34.netlify.app"],
    credentials:true
  }))
  app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const announcementCollection = client.db("rentEaseDB").collection("announcements")
    const couponCollection = client.db("rentEaseDB").collection("coupons")
    const agreementCollection = client.db("rentEaseDB").collection("agreements")
    const paymentsCollection = client.db("rentEaseDB").collection("payments")


    // jwt related api

    app.post("/jwt",async(req,res)=>{
      const user = req.body
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:"1h"
      })

      res.send({token})
    })

    // middleware

    const verifyToken =(req,res,next)=>{

      if(!req.headers.authorization){
        return res.status(401).send({message:"forbidden access"})
      }

      const token = req.headers.authorization.split(" ")[1]

      jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{

        if(err){
          return res.status(401).send({message:"forbidden access"})
        }

        req.decoded = decoded

        next()

      })

    }

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

    // get user role

    app.get("/user/:email",async(req,res)=>{
      const email = req.params.email
      const query = {email:email}
      const result = await userCollection.findOne(query)
      res.send(result)
    })

    // get all users

    app.get("/users",async(req,res)=>{

      const result = await userCollection.find().toArray()
      res.send(result)
    })

    // change user Role by the Admin

    app.patch("/changeRole/:id",async(req,res)=>{
      const id = req.params.id
      console.log(id)
      const query = {_id: new ObjectId(id)}
      const updateDoc  = {
        $set:{
          role:"user"
        }
      }

      const result = await userCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    // get all apartment data

    app.get("/apartments",verifyToken,async(req,res)=>{

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

    

    // adding announcement by admin to database

    app.post("/addAnnouncement",async(req,res)=>{

      const announcement = req.body

      const result = await announcementCollection.insertOne(announcement)
      res.send(result)
    })

    // get all announcements

    app.get("/announcements",async(req,res)=>{

      const result = await announcementCollection.find().toArray()
      
      res.send(result)

    })

    // Add coupons by the admin

    app.post("/addCoupons",async(req,res)=>{

      const coupon = req.body

      const result = await couponCollection.insertOne(coupon)
      res.send(result)
    })

    // get all coupon code 

    app.get("/coupons",async(req,res)=>{

      const result = await couponCollection.find().toArray()

      res.send(result)


    })
    // get single Coupon

    app.get("/singleCoupon/:id",async(req,res)=>{
      const id = req.params.id 
      const query = {_id:new ObjectId(id)}
      const result = await couponCollection.findOne(query)
      res.send(result)
    })

    // change validity of coupons by user

    app.patch("/coupon/:id",async(req,res)=>{

      const changeDate = req.body

      const id = req.params.id

      console.log(changeDate)

      const query = {_id:new ObjectId(id)}

      const updateDoc = {
        $set:{
          validDate:changeDate.validDate
        }
      }

      const result = await couponCollection.updateOne(query,updateDoc)

      res.send(result)
    

      
    })

    // delete a coupon by the admin 

    app.delete("/deleteCoupon/:id",async(req,res)=>{

      const id = req.params.id

      const query = {_id:new ObjectId(id)}

      const result= await couponCollection.deleteOne(query)

      res.send(result)
    })

    // insert Agreement data by the user

    app.post("/addAgreement",async(req,res)=>{

      const data = req.body

      const result = await agreementCollection.insertOne(data)

      res.send(result)


    })


    // get individual agreement Apartment

    app.get("/myApartment/:email",async(req,res)=>{

      const email = req.params.email
      const query = {email:email}

      const result = await agreementCollection.findOne(query)
      res.send(result)


    })


    // get all data for admin whose status is pending

    app.get("/pendingApartment",async(req,res)=>{

      const query = {status:"pending"}

      const result = await agreementCollection.find(query).toArray()
      res.send(result)
    })


    // accept the agreement by the admin

    app.put("/acceptAgreement/:email",async(req,res)=>{
      const accept = req.body
      const email = req.params.email

      const query = {email:email}
      const option = {upsert:true} 
      const updateDoc1 = {

        $set:{

          status:"checked",
          acceptedDate:accept.validDate

        }

      }


      const acceptedResult = await agreementCollection.updateOne(query,updateDoc1,option)

      const updateDoc2 = {
        $set:{
          role:"member"
        }
      }

      const updateUserRole = await userCollection.updateOne(query,updateDoc2)


      
      const getData = await agreementCollection.findOne(query)

      

      const query3 = {apartment_no:getData.apartment}

      const updateDoc3 = {
        $set:{
          status:"unavailable"
        }
      }

      const roomStatus= await apartmentsCollection.updateOne(query3,updateDoc3)


      res.send({acceptedResult,updateUserRole,roomStatus})


      
    })

    // reject the agreement by the admin

    app.put("/rejectAgreement/:email",async(req,res)=>{

      const email = req.params.email

      const query = {email:email}

      const updateDoc= {

        $set:{

          status:"checked"

        }


      }

      const result = await agreementCollection.updateOne(query,updateDoc)

      res.send(result)



    })


    // payment month update by the member

    app.put("/paymentMonth/:email",async(req,res)=>{

      const email = req.params.email

      const paymentMonth = req.body

    const query = {email:email}

    const option = {upsert:true}

    const updateDoc={
      $set:{
        paymentMonth:paymentMonth.paymentMonth
      }
    }

    const result = await agreementCollection.updateOne(query,updateDoc,option)

    res.send(result)
    
    })


    // payment related api

    app.post("/create-payment-intent",async(req,res)=>{

      const {price}= req.body

      const amount = parseInt(price*100)

      const paymentIntent = await stripe.paymentIntents.create({
        amount:amount,
        currency:"usd",
        payment_method_types:["card"]

      })

      res.send({clientSecret:paymentIntent.client_secret})


    })


    // insert the payment of the member in the database

    app.post("/updatePayment",async(req,res)=>{

      const payment = req.body

      const result = await paymentsCollection.insertOne(payment)

      res.send(result)
    })

    // get the payment history of the member


    app.get("/paymentHistory",async(req,res)=>{

      const email = req.query.email
      const searchText= req.query.search


      const query = {email:email}

      if (searchText) {
        query.$or = [
            { 
              paymentMonth: { $regex: searchText, $options: 'i' } }
        ];
    }

      const result = await paymentsCollection.find(query).toArray()

      res.send(result)


    })


    // get the data for admin profile


    app.get("/adminProfile",async(req,res)=>{

      const totalRoom = await apartmentsCollection.estimatedDocumentCount()

      const availableRoom = await apartmentsCollection.countDocuments({status:"available"})
    
      const unavailableRoom = await apartmentsCollection.countDocuments({status:"unavailable"})
   
      const user = await userCollection.countDocuments({role:"user"})
     
      const member = await userCollection.countDocuments({role:"member"})
     

      res.send({totalRoom,availableRoom,unavailableRoom,user,member})


    })

    // get the discount for the user

    app.get("/getDiscount",async(req,res)=>{

      const code = req.query.code
      const email = req.query.email

      

      if(code && email){

        const query = {code:code}
        const filter = {email:email}

        const agreement = await agreementCollection.findOne(filter)

      

        const result = await couponCollection.findOne(query)

        if(result && agreement){

          const discount = parseInt((agreement.rent*result.percentage)/100)

         if(discount){

          res.send({discount})


         }
        }else{
          res.send({message:"enter valid code"})


        }



      }


    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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