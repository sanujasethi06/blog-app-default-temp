import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import User from "./Schema/User.js"
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken'

const server= express();
let PORT = 3000;

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
mongoose.connect(process.env.DB_LOCATION,{
    autoIndex:true
});

const formDatatoSend = (user)=>{

    const access_token = jwt.sign({id: user._id},process.env.SECRET_ACCESS_KEY)
    return{
        access_token,
        profile_img:user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname
    }
}
const generateUsername = async(email)=>{
    let username = email.split("@")[0];
    let isUsernameNotUnique = await User.exists({"personal_info.username":username}).then(result=> result)
    isUsernameNotUnique? username += nanoid().substring(0,5): "";

    return username;
}
mongoose.connection.on("error", err => {

  console.log("err", err)

})
mongoose.connection.on("connected", (err, res) => {

  console.log("mongoose is connected")

})
server.post("/signup",(req,res)=>{
   let {fullname,email,password} = req.body;

   if(fullname.length<3){
    return res.status(403).json({"error":"fullname must be atleast 3 letteers long"})
   }
   if(!email.length){
    return res.status(403).json({"error":"Enter email"})
   }
   if(!emailRegex.test(email)){
    return res.status(403).json({"error":"Email is invalid"})
   }
   if(!passwordRegex.test(password)){
    return res.status(403).json({"error":"Password should be 6 to 20 characters long with a numeric 1 uppercase and 1 lowercase"})
   }
   //Password encryption -> return a hashed value
   bcrypt.hash(password,10,async(err,hashed_password)=>{

    let username = await generateUsername(email);
    let user = new User({
        personal_info:{fullname,email,password: hashed_password,username}
    })
    user.save().then((u)=>{
        return res.status(200).json(formDatatoSend(u))
    })
   .catch(err=>{
    if(err.code==11000){
        return res.status(500).json({"error":"Email is already exist"})
    }
    return res.status(500).json({"error":err.message})
   })
   })
  
})

server.post("/signin",(req,res)=>{

    let {email,password} = req.body;
    User.findOne({"personal_info.email":email})
    .then((user)=>{

        if(!user){
            return res.status(403).json({"error":"Email not found"});
        }
        bcrypt.compare(password,user.personal_info.password,(err,result)=>{
           if(err){
            return res.status(403).json({"error":"Error occured while lohin please try again"})
           } 
           if(!result){
            return res.status(403).json({"error":"Password is incorrect"})

           }else {
            return res.status(200).json(formDatatoSend(user))
           }
        })
        // console.log(user)
        // return res.json({"status":"got user document"})
    })
    .catch(err=>{
        console.log(err.message);
        return res.status(500).json({"error":err.message})
    })
})
server.listen(PORT,()=>{
   console.log( 'listening on port->',PORT)
});