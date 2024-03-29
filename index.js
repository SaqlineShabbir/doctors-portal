const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require('dotenv').config()
const port = process.env.PORT || 5000;


//doctors-portal-firebase-adminsdk.json
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors())
app.use(express.json())

const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mieka.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
      const token = req.headers.authorization.split(' ')[1];

      try{
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch{

      }
  }
  next();
}

async function run (){
    try{
       await client.connect();
       console.log('database connected')
       const database = client.db('doctors_portal');
       const appointmentCollection = database.collection('appointments')
       const userCollection = database.collection('users')
       const reviewCollection = database.collection('reviews')
  
  app.get('/appointments', async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = {email: email, date: date}
      
      const cursor = appointmentCollection.find(query);
      const appointments = await cursor.toArray();
      res.json( appointments)
  })

  // post appointments
  app.post('/appointments', async (req, res) =>{
      const appointment =req.body;
      const result = await appointmentCollection.insertOne(appointment)
      console.log(result);

      res.json(result)
  })


   // only admin will make admin 
 app.get('/users/:email', async (req, res) => {
    const email = req.params.email;
    const query = {email: email}
    const user = await userCollection.findOne(query);
    let isAdmin = false;
    if(user?.role === 'admin') {
      isAdmin = true
    }
    res.json({admin: isAdmin})
})

// user post
   app.post('/users', async (req, res) =>{
       const user = req.body;
       const result = await userCollection.insertOne(user);
       res.json(result);

   })

   app.put('/users', async (req, res) =>{
       const user = req.body;
       
       const filter = {email: user.email};;
       const options = {upsert: true};
       const updateDoc = {$set: user};
       const result = await userCollection.updateOne(filter, updateDoc, options);
       
       res.json(result);
   })

   // add admin 
   app.put('/users/admin',verifyToken, async (req, res) => {
       const user = req.body;
       const requester = req.decodedEmail;
       if(requester){
           const requesterAccount = await userCollection.findOne({email: requester})
           if(requesterAccount.role === 'admin'){
            const filter = {email: user.email}
            const updateDoc = {$set: {role: 'admin'}}
            const result = await userCollection.updateOne(filter,updateDoc);
            res.json(result);
           }
       }
      else{
          res.status(403).json({message: 'you do not have access to make admin'})
      }

       
   })


   //post review
   app.post('/reviews', async (req, res) =>{
    const user = req.body;
    const result = await reviewCollection.insertOne(user);
    res.json(result);

})

//get all reviews
app.get('/reviews', async (req, res) =>{
    const cursor = reviewCollection.find({});
    const review = await cursor.toArray()
     res.send(review)
 })

    }


    finally{
    //await client.close();
    }
}
run().catch(console.dir);












app.get('/', (req, res) =>{
res.send('hello doctors portal')
})

app.listen(port, () =>{
    console.log('listening', port)
})